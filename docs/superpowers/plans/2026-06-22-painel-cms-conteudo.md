# Painel de Conteúdo (CMS leve) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à equipe não-técnica da Phytonatus um painel `/admin` para editar textos e trocar imagens das páginas existentes, salvando direto no GitHub (deploy automático Vercel).

**Architecture:** Site continua 100% estático. Adicionamos um painel estático em `/admin` e funções serverless `.mjs` em `/api/admin/*` que leem e escrevem os HTMLs **direto na API do GitHub** (`phytonatusv2:main`). Edição de texto/imagem é **cirúrgica** (parse5 + offsets de código-fonte → troca só o trecho marcado). Imagens são otimizadas com `sharp`. Login por senha única (hash), sessão por cookie HMAC. Desfazer via reversão de commit.

**Tech Stack:** Node.js 24 (Vercel), `@vercel/node` legacy `(req,res)` handlers em `.mjs`, `parse5`, `sharp`, `node:crypto`, `node:test`. Sem framework no front (vanilla JS), igual ao resto do site.

## Global Constraints

- **NÃO** definir `"type": "module"` no `package.json` — quebraria `api/contact.js` (CommonJS). Todo código novo usa extensão `.mjs`.
- `api/contact.js` permanece **intocado**.
- Repo de produção: `0xdisruptivo710/phytonatusv2`, branch `main`. Constantes em `lib/cms/config.mjs`.
- Segredos (`GITHUB_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) só existem como env vars no servidor; **nunca** no cliente nem commitados.
- Fonte da verdade para ler/escrever conteúdo = **API do GitHub**, não o site publicado.
- Edição **curada**: só elementos com atributo `data-cms` (texto) ou `data-cms-img` (imagem) são editáveis. Texto só em elementos cujo conteúdo é texto puro (sem markup filho).
- Salvar = publicar (sem rascunho). Toda escrita é 1 commit reversível.
- UI 100% em português (pt-BR).
- Patch de texto/imagem **nunca** reserializa o documento inteiro — só faz splice por offset.
- Handlers no estilo `export default async function handler(req, res)`; resposta via `res.status(n).json(...)`.

---

## File Structure

```
package.json                  CRIAR  deps: parse5, sharp (sem "type":"module")
.gitignore                    MODIFICAR  ignorar node_modules
vercel.json                   MODIFICAR  builds p/ api/**/*.mjs + admin/** ; rotas /api/admin e /admin
lib/cms/config.mjs            CRIAR  constantes (REPO, BRANCH) + requireEnv
lib/cms/html-patch.mjs        CRIAR  scanFields / patchText / patchImageSrc (parse5)
lib/cms/image.mjs             CRIAR  optimizeImage (sharp)
lib/cms/session.mjs           CRIAR  hash/verify senha, sign/verify sessão, cookies
lib/cms/github.mjs            CRIAR  createGithub (fetch injetável): getFile/putFile/listCommits/revert
lib/cms/auth.mjs              CRIAR  requireAuth(req,res), createGithubFromEnv()
api/admin/login.mjs           CRIAR  POST senha -> cookie
api/admin/fields.mjs          CRIAR  GET manifesto de campos
api/admin/save-text.mjs       CRIAR  POST salva texto
api/admin/save-image.mjs      CRIAR  POST salva imagem
api/admin/revert.mjs          CRIAR  POST desfaz commit
admin/index.html              CRIAR  painel (login + editor + histórico)
admin/app.js                  CRIAR  lógica do painel
admin/style.css               CRIAR  estilo do painel
test/html-patch.test.mjs      CRIAR
test/image.test.mjs           CRIAR
test/session.test.mjs         CRIAR
test/github.test.mjs          CRIAR
test/handlers.test.mjs        CRIAR
test/helpers.mjs              CRIAR  mockReq/mockRes/fakeFetch
```

---

## Task 1: Scaffolding (package.json, gitignore, smoke test)

**Files:**
- Create: `package.json`
- Modify: `.gitignore`
- Create: `test/smoke.test.mjs`

**Interfaces:**
- Produces: `npm install` funcional; comando de teste `node --test`.

- [ ] **Step 1: Create `package.json`** (NOTE: no `"type": "module"`)

```json
{
  "name": "phytonatus-site",
  "private": true,
  "scripts": {
    "test": "node --test test/"
  },
  "dependencies": {
    "parse5": "^7.2.1",
    "sharp": "^0.33.5"
  }
}
```

- [ ] **Step 2: Append to `.gitignore`**

Add these lines (check they aren't already present first):

```
node_modules/
.vercel
```

- [ ] **Step 3: Write a smoke test** `test/smoke.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node:test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 4: Install and run**

Run: `npm install`
Then: `npm test`
Expected: install completes (parse5 + sharp), smoke test PASSES.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore test/smoke.test.mjs
git commit -m "chore(cms): scaffold package.json + node:test (sem type:module)"
```

---

## Task 2: HTML patch library (parse5, surgical)

**Files:**
- Create: `lib/cms/html-patch.mjs`
- Create: `test/html-patch.test.mjs`

**Interfaces:**
- Produces:
  - `scanFields(html: string): Array<{id, type:'text'|'image', label, value}>`
  - `patchText(html: string, id: string, value: string): string`
  - `patchImageSrc(html: string, id: string, src: string): string`
  - `escapeHtml(s: string): string`
  - `class CmsError extends Error`

- [ ] **Step 1: Write failing tests** `test/html-patch.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanFields, patchText, patchImageSrc, CmsError } from '../lib/cms/html-patch.mjs';

const HTML = `<!doctype html><html><head></head><body>
<h1 data-cms="home.titulo" data-cms-label="Título">Olá <Mundo></h1>
<p data-cms="home.lead">Texto antigo</p>
<img data-cms-img="home.banner" data-cms-label="Banner" src="assets/images/a.png" alt="x">
<h2><span class="reveal">Animado</span></h2>
</body></html>`;

test('scanFields lista textos e imagens com label e valor', () => {
  const f = scanFields(HTML);
  const byId = Object.fromEntries(f.map((x) => [x.id, x]));
  assert.equal(byId['home.titulo'].type, 'text');
  assert.equal(byId['home.titulo'].label, 'Título');
  assert.equal(byId['home.titulo'].value, 'Olá <Mundo>');
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
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `node --test test/html-patch.test.mjs`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implement** `lib/cms/html-patch.mjs`

```js
import { parse } from 'parse5';

const TEXT_ATTR = 'data-cms';
const IMG_ATTR = 'data-cms-img';
const LABEL_ATTR = 'data-cms-label';

export class CmsError extends Error {}

function attr(node, name) {
  if (!node.attrs) return undefined;
  const a = node.attrs.find((x) => x.name === name);
  return a ? a.value : undefined;
}

function walk(node, visit) {
  if (node.attrs) visit(node);
  for (const k of node.childNodes || []) walk(k, visit);
}

function innerText(node) {
  let out = '';
  for (const k of node.childNodes || []) if (k.nodeName === '#text') out += k.value;
  return out;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function scanFields(html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const fields = [];
  walk(doc, (node) => {
    const textId = attr(node, TEXT_ATTR);
    const imgId = attr(node, IMG_ATTR);
    if (textId) {
      fields.push({ id: textId, type: 'text', label: attr(node, LABEL_ATTR) || textId, value: innerText(node).trim() });
    } else if (imgId) {
      fields.push({ id: imgId, type: 'image', label: attr(node, LABEL_ATTR) || imgId, value: attr(node, 'src') || '' });
    }
  });
  return fields;
}

function findOne(html, attrName, id) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const matches = [];
  walk(doc, (node) => { if (attr(node, attrName) === id) matches.push(node); });
  if (matches.length === 0) throw new CmsError(`campo '${id}' não encontrado`);
  if (matches.length > 1) throw new CmsError(`campo '${id}' aparece ${matches.length}x — id deve ser único`);
  return matches[0];
}

export function patchText(html, id, value) {
  const node = findOne(html, TEXT_ATTR, id);
  for (const k of node.childNodes || []) {
    if (k.nodeName !== '#text') throw new CmsError(`campo '${id}' tem markup interno; só texto puro é editável`);
  }
  const loc = node.sourceCodeLocation;
  if (!loc || !loc.startTag || !loc.endTag) throw new CmsError(`campo '${id}' não suporta edição de texto`);
  return html.slice(0, loc.startTag.endOffset) + escapeHtml(value) + html.slice(loc.endTag.startOffset);
}

export function patchImageSrc(html, id, src) {
  const node = findOne(html, IMG_ATTR, id);
  const srcLoc = node.sourceCodeLocation && node.sourceCodeLocation.attrs && node.sourceCodeLocation.attrs.src;
  if (!srcLoc) throw new CmsError(`imagem '${id}' não tem atributo src`);
  return html.slice(0, srcLoc.startOffset) + `src="${src}"` + html.slice(srcLoc.endOffset);
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `node --test test/html-patch.test.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cms/html-patch.mjs test/html-patch.test.mjs
git commit -m "feat(cms): patch cirúrgico de HTML com parse5 (scan/text/img)"
```

---

## Task 3: Image optimization library (sharp)

**Files:**
- Create: `lib/cms/image.mjs`
- Create: `test/image.test.mjs`

**Interfaces:**
- Produces: `optimizeImage(buffer: Buffer, opts?): Promise<Buffer>` (default → webp, maxWidth 1600, quality 80)

- [ ] **Step 1: Write failing test** `test/image.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { optimizeImage } from '../lib/cms/image.mjs';

test('optimizeImage limita largura e converte para webp', async () => {
  const input = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 200, g: 50, b: 50 } } }).png().toBuffer();
  const out = await optimizeImage(input, { maxWidth: 1600, format: 'webp' });
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(meta.width <= 1600, `largura ${meta.width} deveria ser <= 1600`);
  assert.ok(out.length < input.length, 'saída deveria ser menor que a entrada');
});

test('optimizeImage não amplia imagem pequena', async () => {
  const input = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 80, b: 40 } } }).png().toBuffer();
  const out = await optimizeImage(input, { maxWidth: 1600, format: 'webp' });
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 400);
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/image.test.mjs`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implement** `lib/cms/image.mjs`

```js
import sharp from 'sharp';

export async function optimizeImage(buffer, opts = {}) {
  const { maxWidth = 1600, format = 'webp', quality = 80 } = opts;
  const img = sharp(buffer, { failOn: 'error' }).rotate();
  const meta = await img.metadata();
  let pipeline = img;
  if (meta.width && meta.width > maxWidth) pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  if (format === 'webp') pipeline = pipeline.webp({ quality });
  else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  else if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9 });
  else throw new Error(`formato não suportado: ${format}`);
  return pipeline.toBuffer();
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `node --test test/image.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cms/image.mjs test/image.test.mjs
git commit -m "feat(cms): otimização de imagem com sharp (webp + cap de largura)"
```

---

## Task 4: Session & password library (crypto)

**Files:**
- Create: `lib/cms/session.mjs`
- Create: `test/session.test.mjs`

**Interfaces:**
- Produces:
  - `hashPassword(pw): string` (sha256 hex)
  - `verifyPassword(pw, hashHex): boolean`
  - `signSession(secret, now?, ttl?): string`
  - `verifySession(token, secret, now?): boolean`
  - `buildSessionCookie(token): string`, `clearSessionCookie(): string`
  - `readCookie(cookieHeader, name?): string|null`
  - `COOKIE_NAME` constant

- [ ] **Step 1: Write failing tests** `test/session.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signSession, verifySession, readCookie, COOKIE_NAME } from '../lib/cms/session.mjs';

test('verifyPassword bate com o hash correto e rejeita errado', () => {
  const h = hashPassword('segredo123');
  assert.equal(verifyPassword('segredo123', h), true);
  assert.equal(verifyPassword('errado', h), false);
});

test('verifySession aceita token válido e rejeita adulterado/expirado', () => {
  const secret = 'k';
  const now = 1000;
  const tok = signSession(secret, now, 5000); // expira em 6000
  assert.equal(verifySession(tok, secret, 2000), true);
  assert.equal(verifySession(tok, secret, 9000), false); // expirado
  assert.equal(verifySession(tok + 'x', secret, 2000), false); // adulterado
  assert.equal(verifySession(tok, 'outro', 2000), false); // segredo errado
});

test('readCookie extrai o cookie da sessão', () => {
  const header = `outro=1; ${COOKIE_NAME}=abc.def; mais=2`;
  assert.equal(readCookie(header), 'abc.def');
  assert.equal(readCookie(''), null);
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `node --test test/session.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement** `lib/cms/session.mjs`

```js
import crypto from 'node:crypto';

export const COOKIE_NAME = 'phyto_cms';
const TTL_MS = 8 * 60 * 60 * 1000;

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

export function verifyPassword(password, hashHex) {
  if (!hashHex) return false;
  const a = Buffer.from(hashPassword(password), 'hex');
  const b = Buffer.from(String(hashHex), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signSession(secret, now = Date.now(), ttl = TTL_MS) {
  const exp = String(now + ttl);
  const sig = crypto.createHmac('sha256', secret).update(exp).digest('hex');
  return `${exp}.${sig}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(exp).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > now;
}

export function buildSessionCookie(token, maxAgeSec = 8 * 60 * 60) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function readCookie(cookieHeader, name = COOKIE_NAME) {
  if (!cookieHeader) return null;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return part.slice(idx + 1).trim();
  }
  return null;
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `node --test test/session.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cms/session.mjs test/session.test.mjs
git commit -m "feat(cms): sessão por cookie HMAC + verificação de senha (crypto)"
```

---

## Task 5: GitHub client (fetch injetável)

**Files:**
- Create: `lib/cms/config.mjs`
- Create: `lib/cms/github.mjs`
- Create: `test/github.test.mjs`
- Create: `test/helpers.mjs`

**Interfaces:**
- Produces:
  - `config.mjs`: `REPO`, `BRANCH`, `requireEnv(name)`
  - `createGithub({ token, repo, branch, fetchImpl? })` → `{ getFile, putFile, listContentCommits, revertCommit }`
    - `getFile(path): Promise<{sha, content: Buffer} | null>`
    - `putFile(path, contentBuffer, sha, message): Promise<object>`
    - `listContentCommits(limit?): Promise<Array<{sha, message, date}>>`
    - `revertCommit(sha): Promise<object>`
  - `helpers.mjs`: `fakeFetch(routes)`, `mockReq(opts)`, `mockRes()`

- [ ] **Step 1: Write test helpers** `test/helpers.mjs`

```js
// Fake fetch: routes is an array of { match(url, init) => bool, respond(url, init) => {status, json?, text?} }
export function fakeFetch(routes) {
  const calls = [];
  async function f(url, init = {}) {
    calls.push({ url, init });
    for (const r of routes) {
      if (r.match(url, init)) {
        const out = r.respond(url, init);
        return {
          ok: (out.status || 200) >= 200 && (out.status || 200) < 300,
          status: out.status || 200,
          async json() { return out.json; },
          async text() { return out.text || JSON.stringify(out.json || {}); },
        };
      }
    }
    throw new Error(`fakeFetch: rota não encontrada para ${url}`);
  }
  f.calls = calls;
  return f;
}

export function mockReq({ method = 'GET', body = {}, cookie = '' } = {}) {
  return { method, body, headers: { cookie } };
}

export function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    setHeader(k, v) { this.headers[k] = v; return this; },
  };
}
```

- [ ] **Step 2: Write failing tests** `test/github.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGithub } from '../lib/cms/github.mjs';
import { fakeFetch } from './helpers.mjs';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

test('getFile decodifica conteúdo e sha; 404 vira null', async () => {
  const f = fakeFetch([
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 'SHA1', content: b64('<html>oi</html>') } }) },
    { match: (u) => u.includes('/contents/falta.html'), respond: () => ({ status: 404, json: {} }) },
  ]);
  const gh = createGithub({ token: 't', repo: 'o/r', branch: 'main', fetchImpl: f });
  const file = await gh.getFile('index.html');
  assert.equal(file.sha, 'SHA1');
  assert.equal(file.content.toString('utf8'), '<html>oi</html>');
  assert.equal(await gh.getFile('falta.html'), null);
});

test('putFile envia base64 + sha + branch', async () => {
  let sent = null;
  const f = fakeFetch([
    { match: (u, i) => i.method === 'PUT', respond: (u, i) => { sent = JSON.parse(i.body); return { json: { commit: { sha: 'NEW' } } }; } },
  ]);
  const gh = createGithub({ token: 't', repo: 'o/r', branch: 'main', fetchImpl: f });
  await gh.putFile('index.html', Buffer.from('novo'), 'OLDSHA', 'msg');
  assert.equal(sent.message, 'msg');
  assert.equal(sent.branch, 'main');
  assert.equal(sent.sha, 'OLDSHA');
  assert.equal(Buffer.from(sent.content, 'base64').toString('utf8'), 'novo');
});
```

- [ ] **Step 3: Implement** `lib/cms/config.mjs`

```js
export const REPO = process.env.GITHUB_REPO || '0xdisruptivo710/phytonatusv2';
export const BRANCH = process.env.GITHUB_BRANCH || 'main';

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`variável de ambiente ausente: ${name}`);
  return v;
}
```

- [ ] **Step 4: Implement** `lib/cms/github.mjs`

```js
function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}

export function createGithub({ token, repo, branch, fetchImpl = fetch }) {
  const base = `https://api.github.com/repos/${repo}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'phytonatus-cms',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  async function getFile(path) {
    const res = await fetchImpl(`${base}/contents/${encodePath(path)}?ref=${branch}`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub getFile ${path} -> ${res.status}`);
    const j = await res.json();
    return { sha: j.sha, content: Buffer.from(j.content, 'base64') };
  }

  async function putFile(path, contentBuffer, sha, message) {
    const body = { message, content: Buffer.from(contentBuffer).toString('base64'), branch };
    if (sha) body.sha = sha;
    const res = await fetchImpl(`${base}/contents/${encodePath(path)}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GitHub putFile ${path} -> ${res.status} ${await res.text()}`);
    return res.json();
  }

  async function listContentCommits(limit = 20) {
    const res = await fetchImpl(`${base}/commits?sha=${branch}&per_page=${limit}`, { headers });
    if (!res.ok) throw new Error(`GitHub commits -> ${res.status}`);
    const arr = await res.json();
    return arr
      .filter((c) => c.commit.message.startsWith('content:'))
      .map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.committer.date }));
  }

  // Desfaz: restaura cada arquivo MODIFICADO no commit para a versão do pai.
  // Arquivos ADICIONADOS no commit são deixados como estão (limitação v1).
  async function revertCommit(sha) {
    const res = await fetchImpl(`${base}/commits/${sha}`, { headers });
    if (!res.ok) throw new Error(`GitHub getCommit -> ${res.status}`);
    const commit = await res.json();
    const parent = commit.parents && commit.parents[0] && commit.parents[0].sha;
    if (!parent) throw new Error('commit sem pai — não revertível');
    const results = [];
    for (const file of commit.files || []) {
      if (file.status !== 'modified') continue;
      const prev = await fetchImpl(`${base}/contents/${encodePath(file.filename)}?ref=${parent}`, { headers });
      if (!prev.ok) continue;
      const pj = await prev.json();
      const prevBuf = Buffer.from(pj.content, 'base64');
      const current = await getFile(file.filename);
      results.push(await putFile(file.filename, prevBuf, current && current.sha, `content: desfaz ${file.filename} (revert ${sha.slice(0, 7)})`));
    }
    if (results.length === 0) throw new Error('nada para desfazer neste commit');
    return { reverted: results.length };
  }

  return { getFile, putFile, listContentCommits, revertCommit };
}
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `node --test test/github.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/cms/config.mjs lib/cms/github.mjs test/github.test.mjs test/helpers.mjs
git commit -m "feat(cms): cliente GitHub (get/put/commits/revert) com fetch injetável"
```

---

## Task 6: Auth glue (requireAuth + createGithubFromEnv)

**Files:**
- Create: `lib/cms/auth.mjs`
- Modify: `test/handlers.test.mjs` (criar neste task; reusado nos próximos)

**Interfaces:**
- Consumes: `session.verifySession/readCookie`, `github.createGithub`, `config.REPO/BRANCH/requireEnv`
- Produces:
  - `requireAuth(req, res): boolean` (manda 401 e retorna false se inválido)
  - `createGithubFromEnv(): github`

- [ ] **Step 1: Write failing test** `test/handlers.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth } from '../lib/cms/auth.mjs';
import { signSession, COOKIE_NAME } from '../lib/cms/session.mjs';
import { mockReq, mockRes } from './helpers.mjs';

test('requireAuth rejeita sem cookie e aceita com sessão válida', () => {
  process.env.SESSION_SECRET = 'k';
  const res1 = mockRes();
  assert.equal(requireAuth(mockReq({ cookie: '' }), res1), false);
  assert.equal(res1.statusCode, 401);

  const tok = signSession('k');
  const res2 = mockRes();
  assert.equal(requireAuth(mockReq({ cookie: `${COOKIE_NAME}=${tok}` }), res2), true);
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/handlers.test.mjs`
Expected: FAIL (auth.mjs não existe).

- [ ] **Step 3: Implement** `lib/cms/auth.mjs`

```js
import { readCookie, verifySession } from './session.mjs';
import { createGithub } from './github.mjs';
import { REPO, BRANCH, requireEnv } from './config.mjs';

export function requireAuth(req, res) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: 'servidor não configurado' }); return false; }
  const token = readCookie(req.headers && req.headers.cookie);
  if (!verifySession(token, secret)) { res.status(401).json({ error: 'não autenticado' }); return false; }
  return true;
}

export function createGithubFromEnv() {
  return createGithub({ token: requireEnv('GITHUB_TOKEN'), repo: REPO, branch: BRANCH });
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `node --test test/handlers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cms/auth.mjs test/handlers.test.mjs
git commit -m "feat(cms): glue de auth (requireAuth + createGithubFromEnv)"
```

---

## Task 7: `POST /api/admin/login`

**Files:**
- Create: `api/admin/login.mjs`
- Modify: `test/handlers.test.mjs`

**Interfaces:**
- Consumes: `session.verifyPassword/signSession/buildSessionCookie`
- Produces: handler que valida senha e seta cookie

- [ ] **Step 1: Add failing test to `test/handlers.test.mjs`**

```js
import login from '../api/admin/login.mjs';
import { hashPassword } from '../lib/cms/session.mjs';

test('login: senha certa seta cookie; senha errada -> 401', async () => {
  process.env.ADMIN_PASSWORD_HASH = hashPassword('abre-te');
  process.env.SESSION_SECRET = 'k';

  const ok = mockRes();
  await login(mockReq({ method: 'POST', body: { password: 'abre-te' } }), ok);
  assert.equal(ok.statusCode, 200);
  assert.match(ok.headers['Set-Cookie'], /phyto_cms=/);

  const bad = mockRes();
  await login(mockReq({ method: 'POST', body: { password: 'nope' } }), bad);
  assert.equal(bad.statusCode, 401);
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/handlers.test.mjs`
Expected: FAIL (login.mjs não existe).

- [ ] **Step 3: Implement** `api/admin/login.mjs`

```js
import { verifyPassword, signSession, buildSessionCookie } from '../../lib/cms/session.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'método não permitido' }); }
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;
  if (!hash || !secret) return res.status(500).json({ error: 'servidor não configurado' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (!body.password || !verifyPassword(body.password, hash)) return res.status(401).json({ error: 'senha incorreta' });
  res.setHeader('Set-Cookie', buildSessionCookie(signSession(secret)));
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `node --test test/handlers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/admin/login.mjs test/handlers.test.mjs
git commit -m "feat(cms): endpoint de login (senha -> cookie de sessão)"
```

---

## Task 8: `GET /api/admin/fields`

**Files:**
- Create: `api/admin/fields.mjs`
- Modify: `test/handlers.test.mjs`

**Interfaces:**
- Consumes: `requireAuth`, `createGithubFromEnv`, `scanFields`
- Produces: `{ pages: [{ page, fields: [...] }] }`. Const interna `PAGES` (lista das 7 páginas).

- [ ] **Step 1: Add failing test** (mocka `globalThis.fetch` + sessão válida)

```js
import fields from '../api/admin/fields.mjs';
import { fakeFetch } from './helpers.mjs';
import { signSession, COOKIE_NAME } from '../lib/cms/session.mjs';

test('fields: retorna manifesto agrupado por página', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  const page = '<body><h1 data-cms="x.t" data-cms-label="T">Oi</h1></body>';
  globalThis.fetch = fakeFetch([
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
    { match: (u) => u.includes('/contents/'), respond: () => ({ status: 404, json: {} }) },
  ]);

  const res = mockRes();
  const tok = signSession('k');
  await fields(mockReq({ cookie: `${COOKIE_NAME}=${tok}` }), res);
  assert.equal(res.statusCode, 200);
  const idx = res.body.pages.find((p) => p.page === 'index.html');
  assert.equal(idx.fields[0].id, 'x.t');
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/handlers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement** `api/admin/fields.mjs`

```js
import { requireAuth, createGithubFromEnv } from '../../lib/cms/auth.mjs';
import { scanFields } from '../../lib/cms/html-patch.mjs';

export const PAGES = ['index.html', 'institucional.html', 'marcas.html', 'onde-encontrar.html', 'private-label.html', 'contato.html'];

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    const gh = createGithubFromEnv();
    const pages = [];
    for (const page of PAGES) {
      const file = await gh.getFile(page);
      if (!file) continue;
      pages.push({ page, fields: scanFields(file.content.toString('utf8')) });
    }
    return res.status(200).json({ pages });
  } catch (err) {
    console.error('fields error', err);
    return res.status(502).json({ error: 'não foi possível ler o conteúdo agora' });
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `node --test test/handlers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/admin/fields.mjs test/handlers.test.mjs
git commit -m "feat(cms): endpoint de listagem de campos editáveis"
```

---

## Task 9: `POST /api/admin/save-text`

**Files:**
- Create: `api/admin/save-text.mjs`
- Modify: `test/handlers.test.mjs`

**Interfaces:**
- Consumes: `requireAuth`, `createGithubFromEnv`, `patchText`
- Produces: salva texto. Body: `{ page, id, value }`. Retry 1x em conflito de sha (409).

- [ ] **Step 1: Add failing test**

```js
import saveText from '../api/admin/save-text.mjs';

test('save-text: lê, faz patch e commita', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  const page = '<body><p data-cms="x.lead">velho</p></body>';
  let committed = null;
  globalThis.fetch = fakeFetch([
    { match: (u, i) => i.method === 'PUT', respond: (u, i) => { committed = JSON.parse(i.body); return { json: { commit: { sha: 'NEW' } } }; } },
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
  ]);

  const res = mockRes();
  const tok = signSession('k');
  await saveText(mockReq({ method: 'POST', cookie: `${COOKIE_NAME}=${tok}`, body: { page: 'index.html', id: 'x.lead', value: 'novo' } }), res);
  assert.equal(res.statusCode, 200);
  assert.match(Buffer.from(committed.content, 'base64').toString('utf8'), /<p data-cms="x\.lead">novo<\/p>/);
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/handlers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement** `api/admin/save-text.mjs`

```js
import { requireAuth, createGithubFromEnv } from '../../lib/cms/auth.mjs';
import { patchText, CmsError } from '../../lib/cms/html-patch.mjs';
import { PAGES } from './fields.mjs';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { page, id, value } = body;
  if (!PAGES.includes(page)) return res.status(400).json({ error: 'página inválida' });
  if (!id || typeof value !== 'string') return res.status(400).json({ error: 'dados inválidos' });
  if (value.length > 5000) return res.status(400).json({ error: 'texto muito longo' });

  const gh = createGithubFromEnv();
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const file = await gh.getFile(page);
      if (!file) return res.status(404).json({ error: 'página não encontrada' });
      let patched;
      try {
        patched = patchText(file.content.toString('utf8'), id, value);
      } catch (e) {
        if (e instanceof CmsError) return res.status(400).json({ error: e.message });
        throw e;
      }
      try {
        await gh.putFile(page, Buffer.from(patched, 'utf8'), file.sha, `content: atualiza ${id} via painel`);
        return res.status(200).json({ ok: true });
      } catch (e) {
        if (String(e.message).includes('409') && attempt === 0) continue; // conflito de sha -> retry
        throw e;
      }
    }
    return res.status(409).json({ error: 'conflito de edição, recarregue e tente de novo' });
  } catch (err) {
    console.error('save-text error', err);
    return res.status(502).json({ error: 'não foi possível salvar agora' });
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `node --test test/handlers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/admin/save-text.mjs test/handlers.test.mjs
git commit -m "feat(cms): endpoint de salvar texto (patch + commit + retry de conflito)"
```

---

## Task 10: `POST /api/admin/save-image`

**Files:**
- Create: `api/admin/save-image.mjs`
- Modify: `test/handlers.test.mjs`

**Interfaces:**
- Consumes: `requireAuth`, `createGithubFromEnv`, `optimizeImage`, `patchImageSrc`
- Produces: otimiza imagem, grava em `assets/images/cms/<id>.webp`, aponta o `src`. Body: `{ page, id, fileBase64, mimeType }`. Retorna `{ ok, src }`.

- [ ] **Step 1: Add failing test**

```js
import saveImage from '../api/admin/save-image.mjs';
import sharp from 'sharp';

test('save-image: otimiza, grava webp e aponta o src', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  const page = '<body><img data-cms-img="x.banner" src="assets/images/old.png" alt="a"></body>';
  const png = (await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer()).toString('base64');
  const puts = [];
  globalThis.fetch = fakeFetch([
    { match: (u, i) => i.method === 'PUT', respond: (u, i) => { puts.push({ url: u, body: JSON.parse(i.body) }); return { json: { commit: { sha: 'N' } } }; } },
    { match: (u) => u.includes('/contents/assets/images/cms/'), respond: () => ({ status: 404, json: {} }) },
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
  ]);

  const res = mockRes();
  const tok = signSession('k');
  await saveImage(mockReq({ method: 'POST', cookie: `${COOKIE_NAME}=${tok}`, body: { page: 'index.html', id: 'x.banner', fileBase64: png, mimeType: 'image/png' } }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.src, /assets\/images\/cms\/x\.banner\.webp\?v=/);
  // gravou o binário e atualizou o html
  assert.ok(puts.some((p) => p.url.includes('/cms/x.banner.webp')));
  assert.ok(puts.some((p) => Buffer.from(p.body.content, 'base64').toString('utf8').includes('assets/images/cms/x.banner.webp')));
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/handlers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement** `api/admin/save-image.mjs`

```js
import crypto from 'node:crypto';
import { requireAuth, createGithubFromEnv } from '../../lib/cms/auth.mjs';
import { optimizeImage } from '../../lib/cms/image.mjs';
import { patchImageSrc, CmsError } from '../../lib/cms/html-patch.mjs';
import { PAGES } from './fields.mjs';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_INPUT_BYTES = 4 * 1024 * 1024; // ~4MB (limite do corpo da função)

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { page, id, fileBase64, mimeType } = body;
  if (!PAGES.includes(page)) return res.status(400).json({ error: 'página inválida' });
  if (!id || !fileBase64) return res.status(400).json({ error: 'dados inválidos' });
  if (!ALLOWED.includes(mimeType)) return res.status(400).json({ error: 'formato não suportado (use PNG, JPG ou WEBP)' });

  const input = Buffer.from(fileBase64, 'base64');
  if (input.length > MAX_INPUT_BYTES) return res.status(413).json({ error: 'imagem grande demais — reduza antes de enviar' });

  const gh = createGithubFromEnv();
  try {
    const optimized = await optimizeImage(input, { format: 'webp' });
    const imgPath = `assets/images/cms/${id}.webp`;
    const existing = await gh.getFile(imgPath);
    await gh.putFile(imgPath, optimized, existing && existing.sha, `content: troca imagem ${id} via painel`);

    const version = crypto.createHash('sha1').update(optimized).digest('hex').slice(0, 8);
    const newSrc = `${imgPath}?v=${version}`;
    const file = await gh.getFile(page);
    if (!file) return res.status(404).json({ error: 'página não encontrada' });
    let patched;
    try {
      patched = patchImageSrc(file.content.toString('utf8'), id, newSrc);
    } catch (e) {
      if (e instanceof CmsError) return res.status(400).json({ error: e.message });
      throw e;
    }
    await gh.putFile(page, Buffer.from(patched, 'utf8'), file.sha, `content: aponta ${id} para nova imagem`);
    return res.status(200).json({ ok: true, src: newSrc });
  } catch (err) {
    console.error('save-image error', err);
    return res.status(502).json({ error: 'não foi possível salvar a imagem agora' });
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `node --test test/handlers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/admin/save-image.mjs test/handlers.test.mjs
git commit -m "feat(cms): endpoint de salvar imagem (sharp + commit + aponta src)"
```

---

## Task 11: `POST /api/admin/revert` + listagem de histórico

**Files:**
- Create: `api/admin/revert.mjs`
- Modify: `test/handlers.test.mjs`

**Interfaces:**
- Consumes: `requireAuth`, `createGithubFromEnv` (`listContentCommits`, `revertCommit`)
- Produces: `GET` → `{ commits: [...] }`; `POST { sha }` → desfaz.

- [ ] **Step 1: Add failing test**

```js
import revert from '../api/admin/revert.mjs';

test('revert GET lista commits de conteúdo', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  globalThis.fetch = fakeFetch([
    { match: (u) => u.includes('/commits?'), respond: () => ({ json: [
      { sha: 'a1', commit: { message: 'content: atualiza x', committer: { date: '2026-06-22T00:00:00Z' } } },
      { sha: 'b2', commit: { message: 'fix: outra coisa', committer: { date: '2026-06-21T00:00:00Z' } } },
    ] }) },
  ]);
  const res = mockRes();
  const tok = signSession('k');
  await revert(mockReq({ method: 'GET', cookie: `${COOKIE_NAME}=${tok}` }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.commits.length, 1);
  assert.equal(res.body.commits[0].sha, 'a1');
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `node --test test/handlers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement** `api/admin/revert.mjs`

```js
import { requireAuth, createGithubFromEnv } from '../../lib/cms/auth.mjs';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const gh = createGithubFromEnv();
  try {
    if (req.method === 'GET') {
      const commits = await gh.listContentCommits(20);
      return res.status(200).json({ commits });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!body.sha) return res.status(400).json({ error: 'sha obrigatório' });
      const out = await gh.revertCommit(body.sha);
      return res.status(200).json({ ok: true, ...out });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'método não permitido' });
  } catch (err) {
    console.error('revert error', err);
    return res.status(502).json({ error: 'não foi possível desfazer agora' });
  }
}
```

- [ ] **Step 4: Run all tests — verify pass**

Run: `npm test`
Expected: TODOS os testes PASS.

- [ ] **Step 5: Commit**

```bash
git add api/admin/revert.mjs test/handlers.test.mjs
git commit -m "feat(cms): endpoint de histórico + desfazer (revert de commit)"
```

---

## Task 12: Vercel config (rotas + builds)

**Files:**
- Modify: `vercel.json`

**Interfaces:**
- Produces: builds para `api/**/*.mjs` e `admin/**`; rota `/api/admin/<x>` → `.mjs`; rota `/admin` → `admin/index.html`. **Ordem importa**: rota de `api/admin` antes da genérica `api`.

- [ ] **Step 1: Replace `vercel.json` with**

```json
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.mjs", "use": "@vercel/node" },
    { "src": "api/**/*.js", "use": "@vercel/node" },
    { "src": "*.html", "use": "@vercel/static" },
    { "src": "admin/**", "use": "@vercel/static" },
    { "src": "assets/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/admin/([^./]+)", "dest": "/api/admin/$1.mjs" },
    { "src": "/api/([^./]+)", "dest": "/api/$1.js" },
    { "handle": "filesystem" },
    { "src": "/admin/?", "dest": "/admin/index.html" },
    { "src": "/", "dest": "/index.html" }
  ]
}
```

- [ ] **Step 2: Sanity check JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json OK')"`
Expected: `vercel.json OK`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore(cms): rotas/builds da Vercel para /admin e /api/admin (.mjs)"
```

---

## Task 13: Painel UI (login + editor + histórico)

**Files:**
- Create: `admin/index.html`
- Create: `admin/style.css`
- Create: `admin/app.js`

**Interfaces:**
- Consumes (via fetch): `/api/admin/login`, `/api/admin/fields`, `/api/admin/save-text`, `/api/admin/save-image`, `/api/admin/revert`
- Produces: painel funcional. Imagem é **pré-redimensionada no navegador** (canvas, máx 1600px) antes do upload base64.

- [ ] **Step 1: Create `admin/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Painel de Conteúdo — Phytonatus</title>
  <link rel="stylesheet" href="/admin/style.css">
</head>
<body>
  <header class="bar"><strong>Phytonatus</strong> · Painel de Conteúdo
    <button id="logout" class="ghost" hidden>Sair</button>
  </header>

  <main id="login" class="card">
    <h1>Entrar</h1>
    <p class="muted">Digite a senha da equipe para editar o site.</p>
    <input id="password" type="password" placeholder="Senha" autocomplete="current-password">
    <button id="enter">Entrar</button>
    <p id="login-error" class="error" role="alert"></p>
  </main>

  <main id="app" hidden>
    <nav class="tabs">
      <button data-tab="editor" class="active">Editar</button>
      <button data-tab="history">Histórico</button>
    </nav>
    <section id="tab-editor">
      <p id="editor-status" class="muted">Carregando…</p>
      <div id="pages"></div>
    </section>
    <section id="tab-history" hidden>
      <p class="muted">Últimas alterações. Clique em “Desfazer” para reverter.</p>
      <ul id="commits"></ul>
    </section>
  </main>

  <div id="toast" class="toast" hidden></div>
  <script src="/admin/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `admin/style.css`**

```css
:root { --green:#264E36; --bg:#F0EFE9; --ink:#2C1B0A; }
* { box-sizing:border-box; }
body { margin:0; font-family:Arial,Helvetica,sans-serif; color:var(--ink); background:#fafaf7; }
.bar { background:var(--green); color:#fff; padding:12px 18px; display:flex; align-items:center; gap:10px; }
.bar button { margin-left:auto; }
.card { max-width:380px; margin:8vh auto; background:#fff; padding:28px; border-radius:12px; box-shadow:0 6px 30px rgba(0,0,0,.08); }
h1 { margin:0 0 6px; color:var(--green); }
.muted { color:#777; font-size:14px; }
.error { color:#b3261e; min-height:18px; }
input, textarea { width:100%; padding:10px 12px; border:1px solid #ccc; border-radius:8px; font:inherit; margin:8px 0; }
textarea { min-height:84px; resize:vertical; }
button { background:var(--green); color:#fff; border:0; border-radius:8px; padding:10px 16px; cursor:pointer; font:inherit; }
button.ghost { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.6); }
button.small { padding:6px 10px; font-size:13px; }
#app { max-width:760px; margin:18px auto; padding:0 16px; }
.tabs { display:flex; gap:8px; margin-bottom:14px; }
.tabs button { background:#e7e7e0; color:#333; }
.tabs button.active { background:var(--green); color:#fff; }
.page { background:#fff; border-radius:10px; padding:14px 16px; margin-bottom:14px; box-shadow:0 2px 10px rgba(0,0,0,.05); }
.page h2 { margin:0 0 10px; font-size:16px; color:var(--green); text-transform:capitalize; }
.field { padding:10px 0; border-top:1px solid #eee; }
.field label { font-weight:bold; font-size:14px; display:block; }
.field .row { display:flex; gap:10px; align-items:center; }
.thumb { width:64px; height:64px; object-fit:cover; border-radius:6px; border:1px solid #ddd; }
.toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#264E36; color:#fff; padding:10px 16px; border-radius:8px; }
#commits { list-style:none; padding:0; }
#commits li { background:#fff; border-radius:8px; padding:10px 12px; margin-bottom:8px; display:flex; align-items:center; gap:10px; }
#commits .msg { flex:1; font-size:14px; }
```

- [ ] **Step 3: Create `admin/app.js`**

```js
const $ = (s, r = document) => r.querySelector(s);
const api = (path, opts = {}) => fetch('/api/admin/' + path, { headers: { 'Content-Type': 'application/json' }, ...opts }).then(async (r) => {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('erro ' + r.status));
  return data;
});

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2500);
}

// ---- login ----
$('#enter').onclick = async () => {
  $('#login-error').textContent = '';
  try {
    await api('login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
    showApp();
  } catch (e) { $('#login-error').textContent = e.message; }
};
$('#password').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#enter').click(); });

$('#logout').onclick = () => { document.cookie = 'phyto_cms=; Max-Age=0; path=/'; location.reload(); };

document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  $('#tab-editor').hidden = b.dataset.tab !== 'editor';
  $('#tab-history').hidden = b.dataset.tab !== 'history';
  if (b.dataset.tab === 'history') loadHistory();
});

async function showApp() {
  $('#login').hidden = true; $('#app').hidden = false; $('#logout').hidden = false;
  await loadFields();
}

// ---- editor ----
async function loadFields() {
  try {
    const { pages } = await api('fields');
    $('#editor-status').textContent = '';
    const root = $('#pages'); root.innerHTML = '';
    for (const p of pages) {
      const box = document.createElement('div'); box.className = 'page';
      box.innerHTML = `<h2>${p.page.replace('.html', '')}</h2>`;
      for (const f of p.fields) box.appendChild(renderField(p.page, f));
      root.appendChild(box);
    }
  } catch (e) {
    if (/autenticado/.test(e.message)) return location.reload();
    $('#editor-status').textContent = e.message;
  }
}

function renderField(page, f) {
  const wrap = document.createElement('div'); wrap.className = 'field';
  const label = document.createElement('label'); label.textContent = f.label; wrap.appendChild(label);
  if (f.type === 'text') {
    const ta = document.createElement('textarea'); ta.value = f.value;
    const btn = document.createElement('button'); btn.className = 'small'; btn.textContent = 'Salvar';
    btn.onclick = async () => {
      btn.disabled = true;
      try { await api('save-text', { method: 'POST', body: JSON.stringify({ page, id: f.id, value: ta.value }) }); toast('Salvo! Vai ao ar em ~1 min.'); }
      catch (e) { toast('Erro: ' + e.message); } finally { btn.disabled = false; }
    };
    wrap.appendChild(ta); wrap.appendChild(btn);
  } else {
    const row = document.createElement('div'); row.className = 'row';
    const img = document.createElement('img'); img.className = 'thumb'; img.src = '/' + f.value;
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp';
    const btn = document.createElement('button'); btn.className = 'small'; btn.textContent = 'Enviar';
    btn.onclick = async () => {
      if (!file.files[0]) return toast('Escolha uma imagem.');
      btn.disabled = true;
      try {
        const { base64, mimeType } = await downscale(file.files[0], 1600);
        const out = await api('save-image', { method: 'POST', body: JSON.stringify({ page, id: f.id, fileBase64: base64, mimeType }) });
        img.src = '/' + out.src; toast('Imagem trocada! Vai ao ar em ~1 min.');
      } catch (e) { toast('Erro: ' + e.message); } finally { btn.disabled = false; }
    };
    row.appendChild(img); row.appendChild(file); row.appendChild(btn);
    wrap.appendChild(row);
  }
  return wrap;
}

// Reduz a imagem no navegador para caber no limite de upload e acelerar.
function downscale(fileObj, maxW) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileObj);
    const im = new Image();
    im.onload = () => {
      const scale = Math.min(1, maxW / im.width);
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL('image/jpeg', 0.9);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    im.onerror = () => reject(new Error('imagem inválida'));
    im.src = url;
  });
}

// ---- history ----
async function loadHistory() {
  const ul = $('#commits'); ul.innerHTML = '<li class="muted">Carregando…</li>';
  try {
    const { commits } = await api('revert');
    ul.innerHTML = '';
    if (!commits.length) { ul.innerHTML = '<li class="muted">Sem alterações ainda.</li>'; return; }
    for (const c of commits) {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.className = 'msg';
      span.textContent = c.message.replace(/^content:\s*/, '') + ' — ' + new Date(c.date).toLocaleString('pt-BR');
      const btn = document.createElement('button'); btn.className = 'small'; btn.textContent = 'Desfazer';
      btn.onclick = async () => {
        if (!confirm('Desfazer esta alteração?')) return;
        btn.disabled = true;
        try { await api('revert', { method: 'POST', body: JSON.stringify({ sha: c.sha }) }); toast('Desfeito! Vai ao ar em ~1 min.'); loadHistory(); }
        catch (e) { toast('Erro: ' + e.message); btn.disabled = false; }
      };
      li.appendChild(span); li.appendChild(btn); ul.appendChild(li);
    }
  } catch (e) { ul.innerHTML = '<li class="error">' + e.message + '</li>'; }
}

// Se já houver sessão (cookie), tenta abrir direto.
api('fields').then(showApp).catch(() => {});
```

- [ ] **Step 4: Manual smoke (local file check)**

Run: `node -e "['admin/index.html','admin/style.css','admin/app.js'].forEach(f=>require('fs').accessSync(f)); console.log('arquivos do painel OK')"`
Expected: `arquivos do painel OK`. (Teste funcional completo é no Task 15, em deploy.)

- [ ] **Step 5: Commit**

```bash
git add admin/index.html admin/style.css admin/app.js
git commit -m "feat(cms): painel /admin (login, editor de texto/imagem, histórico)"
```

---

## Task 14: Annotation pass — marcar campos editáveis nas 7 páginas

**Files:**
- Modify: `index.html`, `institucional.html`, `marcas.html`, `onde-encontrar.html`, `private-label.html`, `contato.html`
- (NÃO mexer em `politica-privacidade.html` — texto jurídico, fora do v1.)

**Regras de anotação (curado):**
1. **Texto** (`data-cms="<pagina>.<campo>"`): só em elementos cujo conteúdo é **texto puro** (sem `<span>`/markup filho). Para títulos hero animados (`<span class="reveal">`), anote **cada `.reveal-inner`** individualmente (ex.: `marcas.hero_l1`, `marcas.hero_l2`) ou deixe de fora. **Nunca** anote um elemento que tenha filhos-elemento (o `patchText` rejeita).
2. **Imagem** (`data-cms-img="<pagina>.<campo>"`): no `<img>` que já tem `src`. Inclui logos de grids existentes (cada slot vira trocável). **Não** criar slots novos.
3. Sempre incluir `data-cms-label="rótulo amigável em pt-BR"`.
4. `<pagina>` = nome do arquivo sem `.html` e sem hífen ambíguo (ex.: `onde-encontrar` → use `onde.`). Mantenha ids **únicos por arquivo**.
5. Não anotar menu/header/footer/preloader/CTAs estruturais.

**Interfaces:**
- Produces: cada página com um punhado de campos marcados; `GET /api/admin/fields` passa a retorná-los.

- [ ] **Step 1: Ler cada página e anotar o conjunto curado**

Para cada arquivo, abra-o, identifique 3–8 campos de conteúdo (hero eyebrow/título/subtítulo, parágrafos `body-lead`/`body`, e `<img>` de banners/fotos/logos) e adicione os atributos. Exemplos concretos já vistos no código:

`marcas.html` / `onde-encontrar.html` — hero (anote o texto puro, não o `<h1>` com spans):
```html
<!-- ANTES -->
<p class="hero-eyebrow">Distribuição</p>
<!-- DEPOIS -->
<p class="hero-eyebrow" data-cms="onde.hero_eyebrow" data-cms-label="Onde encontrar — selo do hero">Distribuição</p>
```

Parágrafo de conteúdo:
```html
<!-- ANTES -->
<p class="body-lead fade-in" style="max-width:620px;margin:1rem auto 0;">Atuação nacional...</p>
<!-- DEPOIS -->
<p class="body-lead fade-in" style="max-width:620px;margin:1rem auto 0;"
   data-cms="onde.intro" data-cms-label="Onde encontrar — texto de introdução">Atuação nacional...</p>
```

Imagem de grid (cada logo existente vira um slot):
```html
<!-- ANTES -->
<div class="parceiro-card"><img src="assets/images/logos_padronizados_final/logo_1.png" alt="Parceiro comercial" /></div>
<!-- DEPOIS -->
<div class="parceiro-card"><img data-cms-img="onde.parceiro_1" data-cms-label="Onde encontrar — logo parceiro 1"
   src="assets/images/logos_padronizados_final/logo_1.png" alt="Parceiro comercial" /></div>
```

Imagem de hero com `background-image` inline (ex.: `marcas`/`onde-encontrar` usam `style="...background-image:url('...')"`): **não** é `<img>`, então **fica fora do v1** (editar background inline exigiria outro mecanismo). Anote apenas `<img>` reais.

- [ ] **Step 2: Validar a anotação localmente** (sem rede)

Crie um script temporário `scripts/check-fields.mjs`:
```js
import fs from 'node:fs';
import { scanFields } from '../lib/cms/html-patch.mjs';
for (const p of ['index.html','institucional.html','marcas.html','onde-encontrar.html','private-label.html','contato.html']) {
  const f = scanFields(fs.readFileSync(p, 'utf8'));
  console.log(p, '->', f.length, 'campos:', f.map((x) => x.id).join(', '));
  const ids = f.map((x) => x.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) throw new Error(`IDs duplicados em ${p}: ${dup.join(', ')}`);
}
console.log('anotação OK');
```
Run: `node scripts/check-fields.mjs`
Expected: lista de campos por página + `anotação OK` (sem duplicados). Depois apague o script: `git clean -f scripts/check-fields.mjs` ou `rm scripts/check-fields.mjs`.

- [ ] **Step 3: Conferir que o visual não mudou**

Abra cada página alterada no navegador (ou via skill `/browse`) e confirme que nada visual mudou (atributos `data-*` não afetam render).

- [ ] **Step 4: Commit**

```bash
git add index.html institucional.html marcas.html onde-encontrar.html private-label.html contato.html
git commit -m "feat(cms): marca campos editáveis (data-cms/data-cms-img) nas páginas"
```

---

## Task 15: Setup de ambiente + deploy + runbook de teste end-to-end

**Files:**
- Create: `docs/PAINEL-CMS.md` (instruções para você e para a equipe)

**Interfaces:**
- Produces: painel no ar num **deploy de preview** e checklist de teste.

- [ ] **Step 1: Gerar o hash da senha** (escolha uma senha forte da equipe)

Run (troque `SUA_SENHA`):
```bash
node -e "console.log(require('crypto').createHash('sha256').update('SUA_SENHA').digest('hex'))"
```
Guarde o hash de saída.

- [ ] **Step 2: Gerar o `SESSION_SECRET`**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 3: Criar o GitHub token (fine-grained PAT)**

No GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate:
- Resource owner: `0xdisruptivo710`
- Repository access: **Only select repositories** → `phytonatusv2`
- Permissions → Repository → **Contents: Read and write**
- Copie o token (`github_pat_...`).

- [ ] **Step 4: Configurar as env vars na Vercel**

No projeto da Vercel → Settings → Environment Variables (Production + Preview):
- `ADMIN_PASSWORD_HASH` = (hash do Step 1)
- `SESSION_SECRET` = (Step 2)
- `GITHUB_TOKEN` = (Step 3)
- (`RESEND_API_KEY` já existe.)

- [ ] **Step 5: Subir a branch e abrir o preview**

```bash
git push -u origin feat/painel-cms-conteudo
```
A Vercel cria um **deploy de preview** dessa branch. Pegue a URL de preview no painel da Vercel (ou no comentário do GitHub).

> Importante: o painel commita em `main` (produção). Para testar **sem publicar em produção**, configure temporariamente, **só no ambiente Preview**, `GITHUB_BRANCH = feat/painel-cms-conteudo`. Assim o painel edita a própria branch de teste e o preview se atualiza. Ao validar, remova essa override (volta a `main`).

- [ ] **Step 6: Testar o fluxo (via skill `/browse` ou manual)**

Checklist no `<preview-url>/admin`:
1. **Login** — senha errada → "senha incorreta"; senha certa → entra.
2. **Editar texto** — mude um texto, Salvar → toast de sucesso. Em ~1 min, recarregue a página pública correspondente e confira a mudança. Veja o commit `content: atualiza ... via painel` no GitHub.
3. **Trocar imagem** — envie um PNG/JPG, Enviar → a miniatura troca. Confira no GitHub o arquivo em `assets/images/cms/<id>.webp` e o `src` atualizado.
4. **Histórico/Desfazer** — aba Histórico lista as alterações; Desfazer reverte e some do site em ~1 min.
5. **Segurança** — abrir `/api/admin/fields` sem login (anônimo) → 401.

- [ ] **Step 7: Escrever `docs/PAINEL-CMS.md`** (resumo do runbook acima + como adicionar novos campos: "basta adicionar `data-cms`/`data-cms-img` + `data-cms-label` no HTML").

- [ ] **Step 8: Commit**

```bash
git add docs/PAINEL-CMS.md
git commit -m "docs(cms): runbook de setup e teste do painel"
```

- [ ] **Step 9: Promover para produção**

Depois de validado no preview: garantir `GITHUB_BRANCH` de volta a `main` (remover override do preview) e fazer merge da branch em `main`:
```bash
git checkout main
git merge --no-ff feat/painel-cms-conteudo
git push origin main
```
A Vercel publica `/admin` em produção. Comunicar a senha à equipe por canal seguro.

---

## Self-Review (preenchido)

**Cobertura do spec:** §5 arquitetura → Tasks 12/13; §6 mecanismo (scan/patch/imagem/revert) → Tasks 2/3/5/9/10/11; §7 login/segurança → Tasks 4/6/7; §8 env vars → Task 15; §9 deps/vercel → Tasks 1/12; anotação → Task 14; testes → cada task + Task 15; desfazer → Task 11. Sem lacunas.

**Placeholders:** nenhum passo "TODO/TBD"; Task 14 dá regras + exemplos concretos e um validador executável (não é placeholder — é procedimento por-arquivo com checagem objetiva).

**Consistência de tipos:** `getFile`→`{sha,content:Buffer}`, `putFile(path,buf,sha,msg)`, `scanFields→{id,type,label,value}`, `patchText/patchImageSrc(html,id,x)→string`, `requireAuth(req,res)→bool`, `PAGES` exportado de `fields.mjs` e reusado em save-text/save-image. Coerente entre tasks.

**Limitações conhecidas (documentar no PAINEL-CMS.md):** desfazer não reverte criação de arquivo novo (1ª imagem de um slot); backgrounds inline (`style="background-image:url()"`) não são editáveis no v1 (só `<img>`).
