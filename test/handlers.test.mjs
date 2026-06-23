import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth } from '../lib/cms/auth.mjs';
import { signSession, hashPassword, COOKIE_NAME } from '../lib/cms/session.mjs';
import { mockReq, mockRes, fakeFetch } from './helpers.mjs';
import login from '../api/admin/login.mjs';
import fields from '../api/admin/fields.mjs';
import saveText from '../api/admin/save-text.mjs';
import saveImage from '../api/admin/save-image.mjs';
import revert from '../api/admin/revert.mjs';
import sharp from 'sharp';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const auth = () => `${COOKIE_NAME}=${signSession('k')}`;

test('requireAuth rejeita sem cookie e aceita com sessão válida', () => {
  process.env.SESSION_SECRET = 'k';
  const res1 = mockRes();
  assert.equal(requireAuth(mockReq({ cookie: '' }), res1), false);
  assert.equal(res1.statusCode, 401);

  const res2 = mockRes();
  assert.equal(requireAuth(mockReq({ cookie: auth() }), res2), true);
});

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

test('fields: retorna manifesto agrupado por página', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const page = '<body><h1 data-cms="x.t" data-cms-label="T">Oi</h1></body>';
  globalThis.fetch = fakeFetch([
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
    { match: (u) => u.includes('/contents/'), respond: () => ({ status: 404, json: {} }) },
  ]);
  const res = mockRes();
  await fields(mockReq({ cookie: auth() }), res);
  assert.equal(res.statusCode, 200);
  const idx = res.body.pages.find((p) => p.page === 'index.html');
  assert.equal(idx.fields[0].id, 'x.t');
});

test('save-text: lê, faz patch e commita', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const page = '<body><p data-cms="x.lead">velho</p></body>';
  let committed = null;
  globalThis.fetch = fakeFetch([
    { match: (u, i) => i.method === 'PUT', respond: (u, i) => { committed = JSON.parse(i.body); return { json: { commit: { sha: 'NEW' } } }; } },
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
  ]);
  const res = mockRes();
  await saveText(mockReq({ method: 'POST', cookie: auth(), body: { page: 'index.html', id: 'x.lead', value: 'novo' } }), res);
  assert.equal(res.statusCode, 200);
  assert.match(Buffer.from(committed.content, 'base64').toString('utf8'), /<p data-cms="x\.lead">novo<\/p>/);
});

test('save-text: página inválida -> 400', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const res = mockRes();
  await saveText(mockReq({ method: 'POST', cookie: auth(), body: { page: 'hack.html', id: 'x', value: 'y' } }), res);
  assert.equal(res.statusCode, 400);
});

test('save-image: otimiza, grava webp e aponta o src', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const page = '<body><img data-cms-img="x.banner" src="assets/images/old.png" alt="a"></body>';
  const png = (await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer()).toString('base64');
  const puts = [];
  globalThis.fetch = fakeFetch([
    { match: (u, i) => i.method === 'PUT', respond: (u, i) => { puts.push({ url: u, body: JSON.parse(i.body) }); return { json: { commit: { sha: 'N' } } }; } },
    { match: (u) => u.includes('/contents/assets/images/cms/'), respond: () => ({ status: 404, json: {} }) },
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
  ]);
  const res = mockRes();
  await saveImage(mockReq({ method: 'POST', cookie: auth(), body: { page: 'index.html', id: 'x.banner', fileBase64: png, mimeType: 'image/png' } }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.src, /assets\/images\/cms\/x\.banner\.webp\?v=/);
  assert.ok(puts.some((p) => p.url.includes('/cms/x.banner.webp')));
  assert.ok(puts.some((p) => Buffer.from(p.body.content, 'base64').toString('utf8').includes('assets/images/cms/x.banner.webp')));
});

test('save-image: tipo background troca a url do style', async () => {
  process.env.SESSION_SECRET = 'k';
  process.env.GITHUB_TOKEN = 't';
  const page = `<body><section data-cms-bg="x.hero" style="background-image:url('assets/images/old.png');background-size:cover;">x</section></body>`;
  const png = (await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer()).toString('base64');
  const puts = [];
  globalThis.fetch = fakeFetch([
    { match: (u, i) => i.method === 'PUT', respond: (u, i) => { puts.push({ url: u, body: JSON.parse(i.body) }); return { json: { commit: { sha: 'N' } } }; } },
    { match: (u) => u.includes('/contents/assets/images/cms/'), respond: () => ({ status: 404, json: {} }) },
    { match: (u) => u.includes('/contents/index.html'), respond: () => ({ json: { sha: 's', content: b64(page) } }) },
  ]);
  const res = mockRes();
  await saveImage(mockReq({ method: 'POST', cookie: auth(), body: { page: 'index.html', id: 'x.hero', type: 'background', fileBase64: png, mimeType: 'image/png' } }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.src, /assets\/images\/cms\/x\.hero\.webp\?v=/);
  assert.ok(puts.some((p) => /background-image:url\('assets\/images\/cms\/x\.hero\.webp\?v=/.test(Buffer.from(p.body.content, 'base64').toString('utf8'))));
});

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
  await revert(mockReq({ method: 'GET', cookie: auth() }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.commits.length, 1);
  assert.equal(res.body.commits[0].sha, 'a1');
});
