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
