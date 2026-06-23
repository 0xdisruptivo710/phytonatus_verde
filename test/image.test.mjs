import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { optimizeImage } from '../lib/cms/image.mjs';

test('optimizeImage limita largura e converte para webp', async () => {
  const input = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 200, g: 50, b: 50 } } }).png().toBuffer();
  const out = await optimizeImage(input, { maxWidth: 1600, format: 'webp' });
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(meta.width <= 1600, `largura ${meta.width} deveria ser <= 1600`);
  assert.ok(out.length < input.length, 'saída deveria ser menor que a entrada');
});

test('optimizeImage não amplia imagem pequena', async () => {
  const input = await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 80, b: 40 } } }).png().toBuffer();
  const out = await optimizeImage(input, { maxWidth: 1600, format: 'webp' });
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 400);
});
