import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prepareModel } from './model-assets.mjs';

const sourceDirectory = new URL('../design/reference/', import.meta.url);
const outputDirectory = new URL('../src/assets/generated/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await prepareModel();

const licenceDirectory = new URL('../public/licenses/', import.meta.url);
await mkdir(licenceDirectory, { recursive: true });
for (const [packageName, destination] of [
  ['@fontsource-variable/kufam', 'kufam.txt'],
  ['@fontsource-variable/commissioner', 'commissioner.txt'],
  ['@lucide/astro', 'lucide.txt'],
  ['three', 'three.txt'],
]) {
  await copyFile(new URL(`../node_modules/${packageName}/LICENSE`, import.meta.url), new URL(destination, licenceDirectory));
}

for (const [source, destination] of [
  ['sps_b.png', 'logo-dark-surface.png'],
  ['sps_w.png', 'logo-light-surface.png'],
  ['sps_signature_transparent.png', 'signature.png'],
]) {
  await sharp(fileURLToPath(new URL(source, sourceDirectory)))
    .trim({ threshold: 5 })
    .resize({ width: source.includes('signature') ? 320 : 1000, withoutEnlargement: true })
    .png()
    .toFile(fileURLToPath(new URL(destination, outputDirectory)));
}

for (const [source, destination] of [
  ['prototype1.png', 'prototype-front.png'],
  ['prototype1-2.png', 'prototype-angle.png'],
]) {
  const { data, info } = await sharp(fileURLToPath(new URL(source, sourceDirectory)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = [...data.subarray(0, 3)];
  const visited = new Uint8Array(info.width * info.height);
  const pending = [0];

  while (pending.length > 0) {
    const pixel = pending.pop();
    if (visited[pixel]) continue;
    visited[pixel] = 1;
    const offset = pixel * 4;
    if (!background.every((channel, index) => data[offset + index] === channel)) continue;
    data[offset + 3] = 0;
    const column = pixel % info.width;
    if (column > 0) pending.push(pixel - 1);
    if (column < info.width - 1) pending.push(pixel + 1);
    if (pixel >= info.width) pending.push(pixel - info.width);
    if (pixel < info.width * (info.height - 1)) pending.push(pixel + info.width);
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(fileURLToPath(new URL(destination, outputDirectory)));
}

await sharp(fileURLToPath(new URL('prototype-angle.png', outputDirectory)))
  .extract({ left: 115, top: 24, width: 260, height: 472 })
  .png()
  .toFile(fileURLToPath(new URL('prototype-hero.png', outputDirectory)));

const favicon = await sharp(fileURLToPath(new URL('signature.png', outputDirectory)))
  .resize({ width: 44, height: 44, fit: 'inside' })
  .toBuffer();
await sharp({ create: { width: 64, height: 64, channels: 4, background: '#241533' } })
  .composite([{ input: favicon, gravity: 'centre' }])
  .png()
  .toFile(fileURLToPath(new URL('../public/favicon.png', import.meta.url)));

console.log('Prepared faithful SPS logo variants, background-only CAD derivatives, and favicon.');