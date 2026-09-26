import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from '@playwright/test';

const origin = process.env.SPS_LAB_URL ?? 'http://127.0.0.1:4323';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, reducedMotion: 'reduce' });
  await page.goto(`${origin}/signal/`);
  const data = await page.evaluate(async () => {
    document.body.dataset.motion = 'false';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:850px;height:1150px';
    document.body.append(canvas);
    const { createModelStage } = await import('/stage.js');
    const stage = await createModelStage(canvas, 'inspector');
    const image = canvas.toDataURL('image/png');
    stage.dispose();
    canvas.remove();
    return image;
  });
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  const rendered = await sharp(bytes).trim({ threshold: 1 }).png().toBuffer();
  const image = sharp(rendered);
  const metadata = await image.metadata();
  const statistics = await image.stats();
  assert(statistics.channels[3].mean > 20, 'Blank handheld render');
  const directory = new URL('media/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await image.webp({ quality: 94 }).toFile(fileURLToPath(new URL('handheld.webp', directory)));
  const top = Math.floor(metadata.height * 0.43);
  await sharp(rendered).extract({ left: 0, top, width: metadata.width, height: metadata.height - top })
    .webp({ quality: 94 }).toFile(fileURLToPath(new URL('controls.webp', directory)));
  console.log(`Refreshed local purple handheld (${metadata.width}x${metadata.height}) and controls with black pill buttons.`);
} finally { await browser.close(); }