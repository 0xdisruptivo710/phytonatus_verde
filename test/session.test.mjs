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
