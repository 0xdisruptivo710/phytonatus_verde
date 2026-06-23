import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanFields, patchText, patchImageSrc, patchBackgroundImage, CmsError } from '../lib/cms/html-patch.mjs';

const HTML = `<!doctype html><html><head></head><body>
<h1 data-cms="home.titulo" data-cms-label="Título">Olá Mundo</h1>
<p data-cms="home.lead">Texto antigo</p>
<img data-cms-img="home.banner" data-cms-label="Banner" src="assets/images/a.png" alt="x">
<h2><span class="reveal">Animado</span></h2>
</body></html>`;

test('scanFields lista textos e imagens com label e valor', () => {
  const f = scanFields(HTML);
  const byId = Object.fromEntries(f.map((x) => [x.id, x]));
  assert.equal(byId['home.titulo'].type, 'text');
  assert.equal(byId['home.titulo'].label, 'Título');
  assert.equal(byId['home.titulo'].value, 'Olá Mundo');
  assert.equal(byId['home.lead'].value, 'Texto antigo');
  assert.equal(byId['home.banner'].type, 'image');
  assert.equal(byId['home.banner'].value, 'assets/images/a.png');
});

test('patchText troca só o conteúdo interno e escapa HTML', () => {
  const out = patchText(HTML, 'home.lead', 'Novo & <ousado>');
  assert.match(out, /<p data-cms="home\.lead">Novo &amp; &lt;ousado&gt;<\/p>/);
  // resto do documento intacto
  assert.ok(out.includes('<img data-cms-img="home.banner"'));
});

test('patchText recusa elemento com markup filho', () => {
  const html = `<body><h2 data-cms="x"><span>a</span></h2></body>`;
  assert.throws(() => patchText(html, 'x', 'novo'), CmsError);
});

test('patchText erra em id inexistente', () => {
  assert.throws(() => patchText(HTML, 'nao.existe', 'x'), CmsError);
});

test('patchImageSrc troca só o src', () => {
  const out = patchImageSrc(HTML, 'home.banner', 'assets/images/cms/home.banner.webp?v=abcd1234');
  assert.match(out, /src="assets\/images\/cms\/home\.banner\.webp\?v=abcd1234"/);
  assert.ok(out.includes('alt="x"'));
  assert.ok(!out.includes('src="assets/images/a.png"'));
});

const BG_HTML = `<body><section data-cms-bg="home.hero_bg" data-cms-label="Hero fundo" style="min-height:70vh;background-image:url('assets/images/old-hero.png');background-size:cover;">conteudo</section></body>`;

test('scanFields detecta fundo (background-image) com url atual', () => {
  const f = scanFields(BG_HTML);
  assert.equal(f[0].type, 'background');
  assert.equal(f[0].id, 'home.hero_bg');
  assert.equal(f[0].value, 'assets/images/old-hero.png');
});

test('patchBackgroundImage troca só a url do background, preserva o resto do style', () => {
  const out = patchBackgroundImage(BG_HTML, 'home.hero_bg', 'assets/images/cms/home.hero_bg.webp?v=ff00');
  assert.match(out, /background-image:url\('assets\/images\/cms\/home\.hero_bg\.webp\?v=ff00'\)/);
  assert.ok(out.includes('min-height:70vh'));
  assert.ok(out.includes('background-size:cover'));
  assert.ok(!out.includes('old-hero.png'));
});

test('patchBackgroundImage erra se o elemento não tem background-image', () => {
  const html = `<body><section data-cms-bg="x" style="color:red;">a</section></body>`;
  assert.throws(() => patchBackgroundImage(html, 'x', 'y'), CmsError);
});
