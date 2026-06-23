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

test('listContentCommits filtra só commits "content:"', async () => {
  const f = fakeFetch([
    { match: (u) => u.includes('/commits?'), respond: () => ({ json: [
      { sha: 'a1', commit: { message: 'content: atualiza x', committer: { date: '2026-06-22T00:00:00Z' } } },
      { sha: 'b2', commit: { message: 'fix: outra', committer: { date: '2026-06-21T00:00:00Z' } } },
    ] }) },
  ]);
  const gh = createGithub({ token: 't', repo: 'o/r', branch: 'main', fetchImpl: f });
  const commits = await gh.listContentCommits();
  assert.equal(commits.length, 1);
  assert.equal(commits[0].sha, 'a1');
});
