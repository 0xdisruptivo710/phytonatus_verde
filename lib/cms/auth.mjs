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
