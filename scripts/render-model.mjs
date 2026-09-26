import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const origin = process.env.SPS_RENDER_URL ?? 'http://127.0.0.1:4321';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Render from a local preview only.');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${origin}/handheld/`);
  await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await page.locator('[data-handheld-viewer][data-ready="true"]').waitFor();
  const captures = [];
  for (const shot of [
    { filename: 'handheld-concept.webp', view: 'Overview', width: 640, height: 768 },
    { filename: 'handheld-controls.webp', view: 'Controls', width: 900, height: 660 },
  ]) {
    await page.locator('.viewer-scene').evaluate((element, size) => {
      element.style.width = `${size.width}px`;
      element.style.height = `${size.height}px`;
    }, shot);
    await page.waitForFunction((width) => document.querySelector('canvas').width === width * 1.75, shot.width);
    await page.getByRole('button', { name: shot.view, exact: true }).click();
    const data = await page.locator('canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
    captures.push({ filename: shot.filename, bytes: Buffer.from(data.split(',')[1], 'base64') });
  }
  await mkdir(new URL('../src/assets/', import.meta.url), { recursive: true });
  for (const capture of captures) {
    const image = sharp(capture.bytes).trim({ threshold: 1 });
    const statistics = await image.stats();
    if (statistics.channels[3].mean < 20) throw new Error(`Blank handheld render: ${capture.filename}`);
    await image.resize({ height: 1200, withoutEnlargement: true }).webp({ quality: 94 })
      .toFile(fileURLToPath(new URL(`../src/assets/${capture.filename}`, import.meta.url)));
  }
  console.log('Rendered overview and controls images from the actual handheld geometry.');
} finally {
  await browser.close();
}