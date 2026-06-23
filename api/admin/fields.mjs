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
