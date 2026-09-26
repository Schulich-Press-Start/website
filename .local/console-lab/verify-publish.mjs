import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { chromium, webkit, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';

const root = fileURLToPath(new URL('./', import.meta.url));
const config = JSON.parse(await readFile(new URL('publish/.vercel/output/config.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('publish-manifest.json', import.meta.url), 'utf8'));
const remote = process.env.SPS_CONSOLE_ORIGIN;
const origin = remote ?? 'http://127.0.0.1:4324';
assert(['127.0.0.1', 'schulich-press-start.vercel.app', 'schulich-press-start-concepts.vercel.app'].includes(new URL(origin).hostname));
const screenshots = new URL('publish-screenshots/', import.meta.url);
await mkdir(screenshots, { recursive: true });
const local = remote ? undefined : await preview({
  configFile: false, root, envDir: false, appType: 'mpa', publicDir: false,
  build: { outDir: 'publish/.vercel/output/static' },
  preview: { host: '127.0.0.1', port: 4324, strictPort: true, headers: config.routes[0].headers },
});
const reports = [];
const data = await fetch(`${origin}/club.json`).then(response => response.json());
const themes = ['signal', 'playroom', 'cartridge', 'pocket'];

async function verifyCartridgeHeading(page) {
  const layout = await page.locator('.cartridge-heading h1').evaluate(heading => {
    const style = getComputedStyle(heading);
    const context = document.createElement('canvas').getContext('2d');
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const words = ['Play.', 'Build.', 'Repeat.'].map(word => context.measureText(word));
    return {
      gaps: words.slice(1).map((word, index) => parseFloat(style.lineHeight) - words[index].actualBoundingBoxDescent - word.actualBoundingBoxAscent),
      maxWord: Math.max(...words.map(word => word.width)),
      width: heading.getBoundingClientRect().width,
      headingBottom: document.querySelector('.cartridge-heading').getBoundingClientRect().bottom,
      selectionTop: document.querySelector('.cartridge-selection').getBoundingClientRect().top,
    };
  });
  assert(layout.gaps.every(gap => gap >= 4), `Cartridge heading glyphs overlap: ${JSON.stringify(layout.gaps)}`);
  assert(layout.maxWord <= layout.width + 1, 'Cartridge heading word overflows');
  assert(layout.headingBottom <= layout.selectionTop, 'Cartridge heading overlaps selection');
}

async function verifyPurpleWorkbench(page) {
  const canvas = page.locator('#stage');
  await expect(canvas).toHaveAttribute('data-workbench', 'horizon-grid');
  assert.equal(await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(120, 74, 195)');
  const layout = await canvas.evaluate(element => ({ height: element.getBoundingClientRect().height, pageHeight: document.querySelector('#shell').getBoundingClientRect().height }));
  assert(Math.abs(layout.height - layout.pageHeight) < 1, 'Purple grid must cover the page');
  const image = await canvas.evaluate(element => element.toDataURL());
  const { data, info } = await sharp(Buffer.from(image.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let whitePixels = 0;
  let nearOpacity = 0;
  let farOpacity = 0;
  for (let row = 0; row < info.height; row++) {
    for (let column = 0; column < info.width; column++) {
      const offset = (row * info.width + column) * 4;
      const colour = [data[offset], data[offset + 1], data[offset + 2]];
      const alpha = data[offset + 3];
      if (alpha > 240 && Math.min(...colour) > 185 && Math.max(...colour) - Math.min(...colour) < 35) whitePixels++;
      if (column > info.width * .03 && column < info.width * .2) {
        if (row > info.height * .04 && row < info.height * .16) farOpacity = Math.max(farOpacity, alpha);
        if (row > info.height * .7 && row < info.height * .85) nearOpacity = Math.max(nearOpacity, alpha);
      }
    }
  }
  assert(whitePixels / (info.width * info.height) > .025, 'Purple scene must retain its white platform');
  assert(nearOpacity > 10 && farOpacity < nearOpacity * .6, 'Purple grid must fade with distance');
}

try {
  for (const file of manifest.files) {
    if (!/\.(?:js|css|html)$/.test(file.path)) continue;
    const text = await readFile(new URL(`publish/.vercel/output/static/${file.path}`, import.meta.url), 'utf8');
    assert(!/bounce(?:\s|<br\s*\/?>)*test|interface toy|your kind of curious|people behind the play/i.test(text), `Retired copy in ${file.path}`);
    assert(!/workbench-switch|data-finish-pick|local-finishes|finish=pink|finish=white-grid/.test(text), `Local variant controls in ${file.path}`);
  }
  for (const route of ['/', ...themes.map(theme => `/${theme}/`)]) {
    const response = await fetch(`${origin}${route}`, { redirect: 'manual' });
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert(!html.includes('127.0.0.1'), route);
    assert(html.includes(manifest.classicOrigin), `${route} original-site link`);
    for (const [key, value] of Object.entries(config.routes[0].headers)) assert.equal(response.headers.get(key), value, `${route}: ${key}`);
  }
  for (const path of ['/.env.local', '/.local/club-documents/SPS%20Info%20Night%202026-2027.pptx', '/.local/review/portraits/jonart-bajraktari-goatee-headshot-ai.webp', '/server.mjs', '/README.md', '/screenshots/cartridge-crew-chromium-phone.png', '/unknown-page/']) {
    assert.equal((await fetch(`${origin}${path}`, { redirect: 'manual' })).status, 404, path);
  }
  assert.deepEqual(Buffer.from(await (await fetch(`${origin}/models/sps-handheld.glb`)).arrayBuffer()), await readFile(new URL('../../public/models/sps-handheld.glb', import.meta.url)));
  const jonartPortrait = await fetch(`${origin}/media/jonart-bajraktari.png`);
  assert.equal(jonartPortrait.status, 200);
  assert.deepEqual(Buffer.from(await jonartPortrait.arrayBuffer()), await readFile(new URL('../../src/assets/generated/team/jonart-bajraktari-headshot.png', import.meta.url)));
  for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    try {
      const sizes = engineName === 'chromium' ? [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'phone', width: 390, height: 844 }] : [{ name: 'phone', width: 390, height: 844 }];
      for (const size of sizes) {
        for (const theme of themes) {
          const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const errors = [];
          const requests = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('request', request => requests.push(request.url()));
          try {
            await page.goto(`${origin}/${theme}/`);
            await expect(page.getByRole('button', { name: 'Press start', exact: true })).toBeVisible();
            await expect(page.locator('[data-boot-sound]')).toBeChecked();
            if (theme === 'cartridge') {
              await expect(page.locator('body')).toHaveAttribute('data-cartridge-finish', 'purple');
              await expect(page.locator('#boot .boot-stripe')).toHaveCount(0);
              await expect(page.locator('.boot-disc img')).toBeVisible();
              await expect(page.locator('.workbench-switch')).toHaveCount(0);
              assert.equal(await page.locator('#boot').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(120, 74, 195)');
            }
            await page.evaluate(() => document.fonts.ready);
            assert(!requests.some(url => /\/models\/|\/assets\/stage-/.test(url)), `${theme}: early 3D download`);
            const original = page.locator('#boot').getByRole('link', { name: 'Original website' });
            await expect(original).toHaveAttribute('href', manifest.classicOrigin);
            await page.getByRole('button', { name: 'Press start', exact: true }).click();
            await expect(page.locator('#boot')).toBeHidden({ timeout: 15000 });
            await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'running');
            const open = async program => {
              if (theme === 'signal') {
                const name = { crew: 'Crew', handheld: 'Hardware', arcade: 'Arcade', join: 'Join' }[program];
                await page.locator('.crossbar').getByRole('button', { name, exact: true }).click();
                await page.locator(`.signal-command[data-program="${program}"]`).click();
              } else if (theme === 'playroom') await page.locator(`.channel[data-program="${program}"]`).click();
              else if (theme === 'pocket') {
                const index = ['handheld', 'crew', 'work', 'arcade', 'journal', 'join'].indexOf(program);
                await page.locator(`[data-pocket-program="${index}"]`).click();
                await page.locator('.pocket-confirm').click();
              }
              else {
                await page.locator(`[data-cartridge="${program}"]`).click();
                await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
                await expect(page.locator('#stage')).toHaveAttribute('data-cartridge-state', 'inserted');
              }
              await expect(page.locator('#panel')).toBeVisible();
            };
            if (theme !== 'playroom') {
              const canvas = page.locator('#stage');
              await expect(canvas).toHaveAttribute('data-ready', 'true');
              const pixels = await canvas.evaluate(element => {
                const gl = element.getContext('webgl2');
                const pixels = new Uint8Array(element.width * element.height * 4);
                gl.readPixels(0, 0, element.width, element.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                let opaque = 0;
                for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 200) opaque++;
                return opaque / (element.width * element.height);
              });
              assert(pixels > 0.03, `${theme}: blank published model`);
            }
            if (theme === 'cartridge') {
              await verifyCartridgeHeading(page);
              await verifyPurpleWorkbench(page);
            }
            await page.mouse.move(0, 0);
            await page.screenshot({ path: fileURLToPath(new URL(`${remote ? 'live' : 'built'}-${theme}-${engineName}-${size.name}.png`, screenshots)), fullPage: true, animations: 'disabled' });
            const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
            assert.deepEqual(scan.violations.map(item => item.id), [], `${theme}: accessibility`);
            if (theme === 'pocket') {
              const canvas = page.locator('#stage');
              const initial = await canvas.evaluate(element => element.toDataURL());
              await canvas.focus();
              await page.keyboard.press('ArrowRight');
              await expect(canvas).toHaveAttribute('data-selection', '1');
              assert.notEqual(await canvas.evaluate(element => element.toDataURL()), initial, 'Pocket LCD selection must change pixels');
              await page.keyboard.press('Enter');
              await expect(canvas).toHaveAttribute('data-view', 'crew');
              await page.getByRole('button', { name: 'Next item', exact: true }).click();
              await expect(page.locator('#screen-status')).toContainText('Jonart');
              await page.screenshot({ path: fileURLToPath(new URL(`${remote ? 'live' : 'built'}-pocket-lcd-${engineName}-${size.name}.png`, screenshots)), fullPage: true });
              await page.getByRole('button', { name: /Full profile:/ }).click();
              await expect(page.locator('.crew-profile')).toContainText('Jonart');
              await page.keyboard.press('Escape');
              await page.getByRole('button', { name: 'Home menu', exact: true }).click();
              await page.getByRole('button', { name: 'Show CAD surface', exact: true }).click();
              await expect(canvas).toHaveAttribute('data-presentation', 'cad');
              await page.getByRole('button', { name: 'Show colour concept', exact: true }).click();
            }
            await open('crew');
            await expect(page.locator('.crew-person')).toHaveCount(5);
            for (const image of await page.locator('.crew-person img').all()) await image.evaluate(element => element.decode());
            const jonart = page.getByRole('button', { name: 'Jonart Bajraktari', exact: true });
            await expect(jonart.locator('img')).toHaveAttribute('src', '/media/jonart-bajraktari.png');
            assert.equal(await jonart.locator('img').evaluate(image => image.naturalWidth), 640);
            await jonart.click();
            await expect(page.locator('.crew-profile')).toContainText('Embedded Hardware Lead');
            await page.screenshot({ path: fileURLToPath(new URL(`${remote ? 'live' : 'built'}-${theme}-jonart-${engineName}-${size.name}.png`, screenshots)), animations: 'disabled' });
            await page.getByRole('button', { name: 'Saifullah Asad', exact: true }).click();
            await expect(page.locator('.crew-profile')).toContainText('Mechanical Lead');
            await page.keyboard.press('Escape');
            await open('handheld');
            const inspector = page.locator('.inspector-scene canvas');
            await expect(inspector).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
            const initial = await inspector.evaluate(element => element.toDataURL());
            await page.getByRole('button', { name: 'Rotate handheld right' }).click();
            assert.notEqual(await inspector.evaluate(element => element.toDataURL()), initial);
            await page.getByLabel('Shell colour', { exact: true }).evaluate(input => { input.value = '#22cc88'; input.dispatchEvent(new Event('input', { bubbles: true })); });
            await page.keyboard.press('Escape');
            await open('arcade');
            await expect(page.locator('#panel-title')).toHaveText('Brick Break');
            await expect(page.locator('.arcade-surface canvas')).toHaveAttribute('aria-label', 'Brick Break playfield');
            await expect(page.locator('.panel-header')).toContainText('Browser demo, not an SPS release');
            await expect(page.getByRole('button', { name: 'Start game', exact: true })).toBeEnabled();
            await page.screenshot({ path: fileURLToPath(new URL(`${remote ? 'live' : 'built'}-${theme}-brick-break-${engineName}-${size.name}.png`, screenshots)), animations: 'disabled' });
            await page.getByRole('button', { name: 'Start game', exact: true }).click();
            await expect(page.locator('.arcade-surface canvas')).toHaveAttribute('data-playing', 'true');
            await page.getByRole('button', { name: 'Pause game', exact: true }).click();
            await expect(page.locator('[data-game-state]')).toHaveText('Paused');
            await page.keyboard.press('Escape');
            await open('join');
            await expect(page.getByRole('link', { name: 'Apply to SPS' })).toHaveAttribute('href', data.site.applicationUrl);
            await page.keyboard.press('Escape');
            await page.getByRole('button', { name: 'System settings' }).click();
            const switcher = page.getByRole('navigation', { name: 'Switch prototype' });
            await expect(switcher.getByRole('link')).toHaveCount(4);
            await expect(switcher.getByRole('link', { name: 'Pocket OS' })).toHaveAttribute('href', '/pocket/');
            await page.keyboard.press('Escape');
            await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
            await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'suspended');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assert.deepEqual(errors, [], `${theme}: browser errors`);
            assert(!requests.some(url => /localhost|127\.0\.0\.1/.test(url) && !url.startsWith(origin)), `${theme}: localhost request`);
            reports.push({ engine: engineName, theme, viewport: size.name, passed: true });
            console.log(`PASS ${remote ? 'live' : 'built'}/${engineName}/${theme}/${size.name}`);
          } finally { await context.close(); }
        }
      }
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(origin);
        const launcher = page.getByRole('navigation', { name: 'Console concepts' });
        await expect(launcher.getByRole('link')).toHaveCount(4);
        for (const image of await launcher.locator('img').all()) await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
        await page.goto(`${origin}/cartridge/`);
        await expect(page.getByRole('link', { name: 'Open the original website' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Open the original website' })).toHaveAttribute('href', `${manifest.classicOrigin}/`);
        assert.equal(await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(120, 74, 195)');
        await page.goto(`${origin}/pocket/`);
        await expect(page.getByRole('heading', { name: 'Schulich Press Start', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Join the team', exact: true })).toHaveAttribute('href', `${manifest.classicOrigin}/join/`);
      } finally { await context.close(); }
    } finally { await browser.close(); }
  }
  await writeFile(new URL(remote ? 'live-verification.json' : 'build-verification.json', import.meta.url), JSON.stringify({ origin, passed: reports.length, reports }, null, 2));
  console.log(`Verified ${reports.length} compiled console scenarios, static headers, assets, privacy and no-JavaScript fallback.`);
} finally { if (local) await new Promise(resolve => local.httpServer.close(resolve)); }