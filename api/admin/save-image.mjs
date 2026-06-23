import crypto from 'node:crypto';
import { requireAuth, createGithubFromEnv } from '../../lib/cms/auth.mjs';
import { optimizeImage } from '../../lib/cms/image.mjs';
import { patchImageSrc, patchBackgroundImage, CmsError } from '../../lib/cms/html-patch.mjs';
import { PAGES } from './fields.mjs';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_INPUT_BYTES = 4 * 1024 * 1024; // ~4MB (limite do corpo da função)

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { page, id, fileBase64, mimeType, type = 'image' } = body;
  if (!PAGES.includes(page)) return res.status(400).json({ error: 'página inválida' });
  if (!id || !fileBase64) return res.status(400).json({ error: 'dados inválidos' });
  if (type !== 'image' && type !== 'background') return res.status(400).json({ error: 'tipo inválido' });
  if (!ALLOWED.includes(mimeType)) return res.status(400).json({ error: 'formato não suportado (use PNG, JPG ou WEBP)' });

  const input = Buffer.from(fileBase64, 'base64');
  if (input.length > MAX_INPUT_BYTES) return res.status(413).json({ error: 'imagem grande demais — reduza antes de enviar' });

  const gh = createGithubFromEnv();
  try {
    const optimized = await optimizeImage(input, { format: 'webp', maxWidth: type === 'background' ? 1920 : 1600 });
    const imgPath = `assets/images/cms/${id}.webp`;
    const existing = await gh.getFile(imgPath);
    await gh.putFile(imgPath, optimized, existing && existing.sha, `content: troca imagem ${id} via painel`);

    const version = crypto.createHash('sha1').update(optimized).digest('hex').slice(0, 8);
    const newSrc = `${imgPath}?v=${version}`;
    const file = await gh.getFile(page);
    if (!file) return res.status(404).json({ error: 'página não encontrada' });
    let patched;
    try {
      const html = file.content.toString('utf8');
      patched = type === 'background' ? patchBackgroundImage(html, id, newSrc) : patchImageSrc(html, id, newSrc);
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
