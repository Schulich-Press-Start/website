import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const portraits = JSON.parse(await readFile(new URL('.local/portrait-concepts.json', root), 'utf8'));
const selected = process.argv[2] ? portraits.filter((portrait) => portrait.id === process.argv[2]) : portraits;
if (!selected.length) throw new Error('No matching local portrait concept.');
const output = new URL('.local/review/portraits/', root);
await mkdir(output, { recursive: true });
const files = new Map([
  ['/studio.mjs', new URL('scripts/character-studio.mjs', root)],
  ['/three.module.js', new URL('node_modules/three/build/three.module.js', root)],
  ['/three.core.js', new URL('node_modules/three/build/three.core.js', root)],
]);
const server = createServer(async (request, response) => {
  const file = files.get(request.url);
  if (file) {
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.end(await readFile(file));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end('<!doctype html><html><head><title>SPS local portrait renderer</title><style>body{margin:0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/three.module.js"}}</script></head><body><canvas></canvas><script type="module">import { createPortraitStage, createCharacter } from "/studio.mjs";const stage = createPortraitStage(document.querySelector("canvas"));window.renderPortrait = (options, pose) => { if(window.character) stage.scene.remove(window.character); window.character = createCharacter(options, pose);stage.scene.add(window.character);stage.renderer.render(stage.scene,stage.camera);return stage.renderer.domElement.toDataURL("image/png");};</script></body></html>');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 768 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => typeof window.renderPortrait === 'function');
  for (const portrait of selected) {
    for (const pose of ['idle', 'wave']) {
      const data = await page.evaluate(({ portrait, pose }) => window.renderPortrait(portrait, pose), { portrait, pose });
      const image = sharp(Buffer.from(data.split(',')[1], 'base64'));
      const statistics = await image.stats();
      if (statistics.channels[3].mean < 10) throw new Error(`Blank character render: ${portrait.id}`);
      const filename = `${portrait.id}${pose === 'idle' ? '' : '-wave'}.webp`;
      await image.webp({ quality: 92 }).toFile(fileURLToPath(new URL(filename, output)));
      console.log(`${portrait.id}: ${pose}, nonblank alpha ${statistics.channels[3].mean.toFixed(1)}`);
    }
  }
  await writeFile(new URL('manifest.json', output), JSON.stringify(portraits.map(({ id, name, approved, source }) => ({ id, name, approved, source })), null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}