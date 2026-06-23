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
