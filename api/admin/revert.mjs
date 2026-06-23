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
