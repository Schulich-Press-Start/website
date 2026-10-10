import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// turns the blender renders into the web images the site serves, and reports where the screen sits
// usage: node design/concept-handheld/media.mjs <render dir>
const renders = process.argv[2] ?? '/tmp/sps-blender/renders';
const media = fileURLToPath(new URL('../../.local/console-lab/media/', import.meta.url));

async function web(name, output, height) {
  const trimmed = await sharp(`${renders}/${name}`).trim({ threshold: 1 }).toBuffer();
  const { data, info } = await sharp(trimmed).resize({ height, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  await sharp(data, { raw: info }).webp({ quality: 90, alphaQuality: 92, effort: 6 }).toFile(`${media}${output}`);
  return { data, info };
}

// the hero doubles as the stage poster, which shows at about 70% of the window height, so it needs ~2x that
await web('sps-handheld-hero.png', 'handheld-concept.webp', 1600);
const { info } = await web('sps-handheld-front.png', 'handheld-concept-front.webp', 1100);

// the lcd active area is 68 x 51 mm centred 35.5 mm above the middle of the 90 x 150 mm body,
// so its place in the trimmed front view comes straight from the model
console.log(`front ${info.width}x${info.height}, screen left/right ${(11 / 90 * 100).toFixed(1)}%, top ${((75 - 61) / 150 * 100).toFixed(1)}%, height ${(51 / 150 * 100).toFixed(1)}%`);
