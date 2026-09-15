import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const origin = process.env.SPS_RENDER_URL ?? 'http://127.0.0.1:4321';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Render from a local preview only.');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(`${origin}/handheld/`);
  await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await page.locator('[data-handheld-viewer][data-ready="true"]').waitFor();
  await page.locator('.viewer-scene').evaluate((element) => {
    element.style.width = '640px';
    element.style.height = '768px';
  });
  await page.waitForFunction(() => document.querySelector('canvas').width === 1120);
  await page.getByRole('button', { name: 'Reset model view' }).click();
  const data = await page.locator('canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  const image = sharp(bytes).trim({ threshold: 1 });
  const statistics = await image.stats();
  if (statistics.channels[3].mean < 20) throw new Error('The handheld render is blank.');
  const destination = new URL('../src/assets/handheld-concept.webp', import.meta.url);
  await mkdir(new URL('../src/assets/', import.meta.url), { recursive: true });
  await image.resize({ height: 1200, withoutEnlargement: true }).webp({ quality: 94 }).toFile(fileURLToPath(destination));
  console.log('Rendered a geometry-faithful colour-concept poster from the supplied handheld model.');
} finally {
  await browser.close();
}