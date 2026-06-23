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
