import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { PerspectiveCamera, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { groupPlasticSurfaces } from './stage.js';

const origin = process.env.SPS_LAB_URL ?? 'http://127.0.0.1:4323';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const screenshots = new URL('screenshots/', import.meta.url);
await mkdir(screenshots, { recursive: true });
const report = [];
const portraitPalettes = new Map();
const finish = process.env.SPS_LAB_FINISH;
assert(!finish || ['purple', 'white-grid'].includes(finish));
const themes = process.env.SPS_LAB_THEME ? [process.env.SPS_LAB_THEME] : finish ? ['cartridge'] : ['signal', 'playroom', 'cartridge', 'pocket'];
assert(themes.every(theme => ['signal', 'playroom', 'cartridge', 'pocket'].includes(theme)));
assert(!finish || themes.length === 1 && themes[0] === 'cartridge');
const screenshotPrefix = finish ? `${finish}-` : '';

function conceptUrl(theme) {
  const url = new URL(`/${theme}/`, origin);
  if (finish && theme === 'cartridge') url.searchParams.set('finish', finish);
  return url.href;
}

const geometryBytes = await readFile(new URL('../../public/models/sps-handheld.glb', import.meta.url));
const source = await new GLTFLoader().parseAsync(geometryBytes.buffer.slice(geometryBytes.byteOffset, geometryBytes.byteOffset + geometryBytes.byteLength), '');
source.scene.traverse(mesh => {
  if (!mesh.isMesh || mesh.material.name !== 'defaultplastic') return;
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position.array.slice();
  const normals = geometry.attributes.normal.array.slice();
  const indices = geometry.index.array.slice();
  assert.equal(groupPlasticSurfaces(geometry), 776);
  assert.deepEqual(geometry.attributes.position.array, positions);
  assert.deepEqual(geometry.attributes.normal.array, normals);
  assert.deepEqual(geometry.index.array, indices);
  assert.deepEqual(geometry.groups, [{ start: 0, count: 138, materialIndex: 0 }, { start: 138, count: 2328, materialIndex: 1 }]);
});

async function audioState(page) {
  return page.evaluate(async () => {
    const moduleUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/common.js').name;
    return (await import(moduleUrl)).audioStatus();
  });
}

async function verifyBlackPills(canvas, label) {
  const image = await canvas.evaluate(element => element.toDataURL('image/png'));
  const { data, info } = await sharp(Buffer.from(image.split(',')[1], 'base64')).trim({ threshold: 1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const dark = [0, 0];
  for (let row = Math.floor(info.height * 0.84); row < info.height * 0.97; row++) {
    for (let column = Math.floor(info.width * 0.2); column < info.width * 0.8; column++) {
      const offset = (row * info.width + column) * 4;
      if (data[offset + 3] > 200 && Math.max(data[offset], data[offset + 1], data[offset + 2]) < 75) dark[column < info.width / 2 ? 0 : 1]++;
    }
  }
  assert(dark.every(count => count > 5), `${label}: both pill buttons must remain black (${dark})`);
}

async function openProgram(page, theme, program) {
  if (theme === 'signal') {
    const category = { crew: 'Crew', arcade: 'Arcade', join: 'Join', handheld: 'Hardware', work: 'Divisions', journal: 'Journal' }[program];
    await page.locator('.crossbar').getByRole('button', { name: category, exact: true }).click();
    await page.locator(`.signal-command[data-program="${program}"]`).click();
  } else if (theme === 'playroom') {
    await page.locator(`.channel[data-program="${program}"]`).click();
  } else if (theme === 'pocket') {
    const index = ['handheld', 'crew', 'work', 'arcade', 'journal', 'join'].indexOf(program);
    await page.locator(`[data-pocket-program="${index}"]`).click();
    await page.locator('.pocket-confirm').click();
  } else {
    await page.locator(`[data-cartridge="${program}"]`).click();
    await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
  }
  await expect(page.locator('#panel')).toBeVisible();
  if (program === 'arcade') {
    await expect(page.locator('#panel-title')).toHaveText('Brick Break');
    await expect(page.locator('.arcade-surface canvas')).toHaveAttribute('aria-label', 'Brick Break playfield');
    await expect(page.locator('.panel-header')).toContainText('Browser demo, not an SPS release');
  }
}

async function capture(page, filename, fullPage = true) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL(`${screenshotPrefix}${filename}`, screenshots)), fullPage, animations: 'disabled' });
}

async function verifyFinish(page, label) {
  const expected = finish === 'purple' ? 'rgb(120, 74, 195)' : 'rgb(255, 255, 255)';
  const canvas = page.locator('#stage');
  await expect(page.locator('body')).toHaveAttribute('data-cartridge-finish', finish);
  await expect(canvas).toHaveAttribute('data-workbench', 'horizon-grid');
  for (const selector of ['body', '#boot']) {
    const background = await page.locator(selector).evaluate(element => ({ colour: getComputedStyle(element).backgroundColor, image: getComputedStyle(element).backgroundImage }));
    assert.equal(background.colour, expected, `${label} ${selector} base colour`);
    assert.equal(background.image.includes('linear-gradient'), selector === '#boot' && finish === 'white-grid', `${label} only the static startup uses a CSS grid`);
  }
  const swatches = page.getByRole('navigation', { name: 'Workbench background' });
  await expect(swatches.getByRole('link')).toHaveCount(3);
  await expect(swatches.locator('[aria-current="page"]')).toHaveAttribute('href', `/cartridge/?finish=${finish}`);
  await expect(swatches.getByRole('link', { name: 'Original pink background' })).toHaveAttribute('href', '/cartridge/?finish=pink');
  const layout = await page.evaluate(() => ({
    canvas: document.querySelector('#stage').getBoundingClientRect().toJSON(),
    shell: document.querySelector('#shell').getBoundingClientRect().toJSON(),
    frame: document.querySelector('.workbench-frame').getBoundingClientRect().toJSON(),
  }));
  assert(Math.abs(layout.canvas.height - layout.shell.height) < 1, `${label} canvas must cover the page`);
  const image = await canvas.evaluate(element => element.toDataURL());
  const { data, info } = await sharp(Buffer.from(image.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const band = (start, end) => {
    let peak = 0;
    let pixels = 0;
    for (let row = Math.floor(info.height * start); row < info.height * end; row++) {
      for (let column = Math.floor(info.width * .03); column < info.width * .2; column++) {
        const alpha = data[(row * info.width + column) * 4 + 3];
        peak = Math.max(peak, alpha);
        if (alpha > 1) pixels++;
      }
    }
    return { peak, pixels };
  };
  const distant = band(.04, .16);
  const foreground = band(.7, .85);
  assert(foreground.pixels > 100 && foreground.peak > 10, `${label} grid must render in WebGL`);
  assert(distant.peak < foreground.peak * .6, `${label} grid must fade with distance (${distant.peak}/${foreground.peak})`);
  let objectTop = info.height;
  let objectBottom = 0;
  let lowerGridPixels = 0;
  let whiteBasePixels = 0;
  for (let row = 0; row < info.height; row++) {
    for (let column = 0; column < info.width; column++) {
      const offset = (row * info.width + column) * 4;
      const alpha = data[offset + 3];
      if (alpha > 230) { objectTop = Math.min(objectTop, row); objectBottom = Math.max(objectBottom, row); }
      if (row > info.height * .8 && column < info.width * .3 && alpha > 2 && alpha < 90) lowerGridPixels++;
      if (alpha > 240) {
        const colour = [data[offset], data[offset + 1], data[offset + 2]];
        if (Math.min(...colour) > 185 && Math.max(...colour) - Math.min(...colour) < 35) whiteBasePixels++;
      }
    }
  }
  assert(lowerGridPixels > 100, `${label} perspective grid must continue behind the lower page`);
  assert(objectBottom > objectTop, `${label} device must remain visible`);
  if (layout.frame.height > 0) {
    const top = objectTop / info.height * layout.canvas.height + layout.canvas.top;
    const bottom = objectBottom / info.height * layout.canvas.height + layout.canvas.top;
    assert(top >= layout.frame.top - 35 && bottom <= layout.frame.bottom + 35, `${label} objects must retain mobile framing`);
  }
  if (finish === 'purple') {
    assert(whiteBasePixels / (info.width * info.height) > .025, `${label} white platform must remain beneath the device`);
    const base = [120, 74, 195];
    const linear = base.map(channel => {
      const value = (channel + (255 - channel) * foreground.peak / 255) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    assert(1.05 / (luminance + .05) >= 4.5, `${label} grid must preserve white-text contrast`);
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await canvas.evaluate(element => element.toDataURL()), image, `${label} idle grid must not keep animating`);
  const frame = layout.frame.height > 0 ? layout.frame : layout.canvas;
  const camera = new PerspectiveCamera(36, frame.width / frame.height, .01, 100);
  if (layout.frame.height > 0) camera.setViewOffset(frame.width, frame.height, layout.canvas.left - frame.left, layout.canvas.top - frame.top, layout.canvas.width, layout.canvas.height);
  camera.position.set(6.6, 8.5, 10.2);
  if (camera.aspect < 1) camera.position.multiplyScalar(1.15);
  camera.lookAt(.5, 0, -.15);
  camera.updateMatrixWorld();
  const crew = new Vector3(-.6, .219, -2.6).project(camera);
  await page.mouse.click(layout.canvas.left + (crew.x + 1) / 2 * layout.canvas.width, layout.canvas.top + (1 - crew.y) / 2 * layout.canvas.height);
  await expect(page.locator('[data-cartridge="crew"]')).toHaveAttribute('aria-pressed', 'true');
}

async function scan(page, label) {
  assert(!/bounce(?:\s|<br\s*\/?>)*test|interface toy|your kind of curious|people behind the play/i.test(await page.locator('body').innerText()), `${label} retired copy`);
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    scroll: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('h1,h2,h3,p,button,a')].filter(element => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 2 && getComputedStyle(element).overflowX === 'visible').map(element => element.textContent.trim()),
  }));
  assert(layout.scroll <= layout.viewport, `${label} horizontal overflow`);
  assert.deepEqual(layout.clipped, [], `${label} clipped text`);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), [], `${label} accessibility`);
}

async function clickPocketSurface(page, position) {
  const canvas = page.locator('#stage');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const camera = new PerspectiveCamera(32, box.width / box.height, 0.01, 100);
  camera.position.z = 7.1 * Math.max(1, 0.65 / camera.aspect);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const point = new Vector3(position[1], position[2], position[0] - 0.0135).multiplyScalar(3.4 / 0.15).applyAxisAngle(new Vector3(0, 1, 0), -0.19).project(camera);
  await page.mouse.click(box.x + (point.x + 1) / 2 * box.width, box.y + (1 - point.y) / 2 * box.height);
}

async function verifyPocket(page, label, viewport) {
  const canvas = page.locator('#stage');
  await expect(canvas).toHaveAttribute('data-view', 'home');
  const homePixels = await canvas.evaluate(element => element.toDataURL());
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(canvas).toHaveAttribute('data-selection', '1');
  assert.notEqual(await canvas.evaluate(element => element.toDataURL()), homePixels, `${label} LCD selection must change pixels`);
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-view', 'crew');
  await expect(page.locator('#screen-status')).toContainText('Abdul');
  await page.getByRole('button', { name: 'Next item', exact: true }).click();
  await expect(page.locator('#screen-status')).toContainText('Jonart');
  await page.getByRole('button', { name: /Full profile:/ }).click();
  await expect(page.locator('.crew-profile')).toContainText('Jonart');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Home menu', exact: true }).click();
  await page.locator('[data-pocket-program="0"]').click();
  await page.getByRole('button', { name: 'Home menu', exact: true }).click();
  await clickPocketSurface(page, [0.027, -0.017, -0.0145]);
  await expect(canvas).toHaveAttribute('data-last-input', 'right');
  await expect(canvas).toHaveAttribute('data-selection', '1');
  await clickPocketSurface(page, [0.027, 0.032873097, -0.016851156]);
  await expect(canvas).toHaveAttribute('data-view', 'crew');
  await page.getByRole('button', { name: 'Show the full handheld', exact: true }).click();
  await clickPocketSurface(page, [0.027, -0.01, -0.0665]);
  await expect(canvas).toHaveAttribute('data-last-input', 'home');
  await expect(canvas).toHaveAttribute('data-view', 'home');
  await clickPocketSurface(page, [0.0251, 0.0174, 0.054]);
  await expect(canvas).toHaveAttribute('data-last-input', 'screen');
  await expect(canvas).toHaveAttribute('data-view', 'crew');
  for (let index = 0; index < 3; index++) await page.getByRole('button', { name: 'Next item', exact: true }).click();
  await expect(page.locator('#screen-status')).toContainText('Saifullah');
  await capture(page, `pocket-lcd-${label.split('/')[0]}-${viewport.name}.png`);
  await scan(page, `${label} focused LCD`);
  await page.getByRole('button', { name: 'Home menu', exact: true }).click();
  const conceptPixels = await canvas.evaluate(element => element.toDataURL());
  await page.getByRole('button', { name: 'Show CAD surface', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-presentation', 'cad');
  assert.notEqual(await canvas.evaluate(element => element.toDataURL()), conceptPixels, `${label} surface view must change pixels`);
  await capture(page, `pocket-cad-${label.split('/')[0]}-${viewport.name}.png`);
  await page.getByRole('button', { name: 'Show colour concept', exact: true }).click();
  await page.getByRole('button', { name: 'Coral shell', exact: true }).click();
  assert.notEqual(await canvas.evaluate(element => element.toDataURL()), conceptPixels, `${label} shell colour must change pixels`);
  await page.getByRole('button', { name: 'Purple shell', exact: true }).click();
  const layout = await page.evaluate(() => ({ modelBottom: document.querySelector('#stage').getBoundingClientRect().bottom, toolsTop: document.querySelector('.pocket-model-tools').getBoundingClientRect().top }));
  assert(layout.toolsTop >= layout.modelBottom, `${label} tools must not overlap the model`);
}

for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    const viewports = engineName === 'chromium' ? [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'phone', width: 390, height: 844 }, { name: 'small-phone', width: 320, height: 568 }] : [{ name: 'phone', width: 390, height: 844 }];
    for (const viewport of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        const requests = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => requests.push(request.url()));
        const label = `${engineName}/${theme}/${viewport.name}`;
        try {
          await page.goto(conceptUrl(theme));
          await expect(page.getByRole('button', { name: 'Press start', exact: true })).toBeVisible();
          if (theme === 'cartridge') await expect(page.locator('#boot .boot-stripe')).toHaveCount(0);
          await expect(page.locator('[data-boot-sound]')).toBeChecked();
          await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'waiting');
          await page.evaluate(() => document.fonts.ready);
          assert(!requests.some(url => url.endsWith('sps-handheld.glb')), `${label} model downloaded before boot`);
          await scan(page, `${label} boot`);
          await capture(page, `${theme}-boot-${engineName}-${viewport.name}.png`, false);
          await page.getByRole('button', { name: 'Press start', exact: true }).click();
          await expect(page.locator('#boot')).toBeHidden();
          await expect(page.locator('body')).toHaveAttribute('data-booted', 'true');
          await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'running');
          await expect.poll(async () => (await audioState(page)).rms).toBeGreaterThan(0.00001);
          const audio = await audioState(page);
          assert.equal(audio.theme, theme);
          assert(audio.voices > 0 && audio.voices < 30, `${label} bounded audio voices`);
          await page.evaluate(() => document.fonts.ready);
          if (theme !== 'playroom') {
            await expect(page.locator('#stage')).toHaveAttribute('data-ready', 'true');
            const pixels = await page.locator('#stage').evaluate(canvas => {
              const gl = canvas.getContext('webgl2');
              const rgba = new Uint8Array(canvas.width * canvas.height * 4);
              gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
              let opaque = 0;
              const colours = new Set();
              for (let index = 0; index < rgba.length; index += 4) {
                if (rgba[index + 3] > 200) opaque++;
                if (index % 100 === 0) colours.add(`${rgba[index]},${rgba[index + 1]},${rgba[index + 2]}`);
              }
              return { opaque: opaque / (canvas.width * canvas.height), colours: colours.size };
            });
            assert(pixels.opaque > .03 && pixels.colours > 30, `${label} blank 3D scene`);
          }
          await scan(page, `${label} menu`);
          await capture(page, `${theme}-${engineName}-${viewport.name}.png`);
          if (theme === 'playroom') {
            await expect(page.locator('.channel-heading h1')).toHaveText('A place to build and play.');
            await page.getByRole('button', { name: 'Channel page 2', exact: true }).click();
            await expect(page.getByRole('button', { name: 'Open Brick Break', exact: true })).toBeVisible();
            await scan(page, `${label} second channel page`);
            await page.getByRole('button', { name: 'Channel page 1', exact: true }).click();
          }
          if (finish) await verifyFinish(page, `${label}/${finish}`);
          if (theme === 'pocket') await verifyPocket(page, label, viewport);
          if (viewport.name !== 'small-phone' && (viewport.name !== 'tablet' || theme === 'cartridge')) {
            await openProgram(page, theme, 'crew');
            await expect(page.locator('.crew-person')).toHaveCount(5);
            const jonart = page.getByRole('button', { name: 'Jonart Bajraktari', exact: true });
            await expect.poll(() => jonart.locator('img').evaluate(image => image.complete && image.naturalWidth === 640)).toBe(true);
            await jonart.click();
            await expect(page.locator('.crew-profile')).toContainText('Embedded Hardware Lead');
            const palette = await page.locator('.crew-person img').evaluateAll(images => images.map(image => getComputedStyle(image).backgroundColor));
            assert.equal(new Set(palette).size, 5);
            portraitPalettes.set(theme, palette.join('|'));
            await page.getByRole('button', { name: 'Saifullah Asad', exact: true }).click();
            await expect(page.locator('.crew-profile')).toContainText('Mechanical Lead');
            await scan(page, `${label} crew`);
            await capture(page, `${theme}-crew-${engineName}-${viewport.name}.png`, false);
            await page.getByRole('button', { name: 'Close program' }).click();
            await expect(page.locator('#panel')).not.toBeVisible();
            await openProgram(page, theme, 'join');
            await expect(page.getByRole('link', { name: 'Apply to SPS' })).toHaveAttribute('href', /docs.google.com\/forms\/d\/.*\/viewform/);
            await page.keyboard.press('Escape');
            await openProgram(page, theme, 'handheld');
            await expect(page.locator('.inspector-scene canvas')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
            await verifyBlackPills(page.locator('.inspector-scene canvas'), `${label} purple shell`);
            const initial = await page.locator('.inspector-scene canvas').evaluate(canvas => canvas.toDataURL());
            await page.getByRole('button', { name: 'Rotate handheld right' }).click();
            expect(await page.locator('.inspector-scene canvas').evaluate(canvas => canvas.toDataURL())).not.toBe(initial);
            await page.getByLabel('Shell colour', { exact: true }).evaluate(input => { input.value = '#22cc88'; input.dispatchEvent(new Event('input', { bubbles: true })); });
            await page.getByRole('button', { name: 'Reset handheld', exact: true }).click();
            await verifyBlackPills(page.locator('.inspector-scene canvas'), `${label} custom shell`);
            await page.keyboard.press('Escape');
            await openProgram(page, theme, 'arcade');
            await page.getByRole('button', { name: 'Start game', exact: true }).click();
            await expect(page.locator('.arcade-surface canvas')).toHaveAttribute('data-playing', 'true');
            await page.getByRole('button', { name: 'Pause game', exact: true }).click();
            const paused = await page.locator('.arcade-surface canvas').evaluate(canvas => canvas.toDataURL());
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            expect(await page.locator('.arcade-surface canvas').evaluate(canvas => canvas.toDataURL())).toBe(paused);
            await capture(page, `${theme}-arcade-${engineName}-${viewport.name}.png`, false);
            await page.keyboard.press('Escape');
            await page.getByRole('button', { name: 'System settings' }).click();
            await expect(page.getByRole('navigation', { name: 'Switch prototype' }).getByRole('link')).toHaveCount(4);
            await page.getByLabel('Interface sound', { exact: true }).check();
            await expect(page.locator('[data-action="sound"]')).toHaveAttribute('aria-pressed', 'true');
            await page.getByLabel('Interface sound', { exact: true }).uncheck();
            await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'suspended');
            assert.equal((await audioState(page)).voices, 0);
            await page.getByLabel('Sound level', { exact: true }).fill('10');
            assert.equal((await audioState(page)).volume, 0.1);
            await scan(page, `${label} settings`);
            await page.keyboard.press('Escape');
            await expect(page.getByRole('button', { name: 'System settings' })).toBeFocused();
            await page.getByRole('button', { name: 'Return to boot screen' }).click();
            await expect(page.locator('#boot')).toBeVisible();
            await page.getByRole('button', { name: 'Press start', exact: true }).click();
            await expect(page.locator('#boot')).toBeHidden();
            await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'suspended');
          }
          assert.deepEqual(errors, [], `${label} browser errors`);
          assert(!requests.some(url => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')), `${label} unexpected external request`);
          report.push({ label, passed: true });
          console.log(`PASS ${label}`);
        } finally { await context.close(); }
      }
    }
    if (themes.includes('cartridge')) {
    const context = await browser.newContext({ viewport: engineName === 'chromium' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    try {
      await page.goto(conceptUrl('cartridge'));
      await page.getByRole('button', { name: 'Press start', exact: true }).click();
      await expect(page.locator('#boot')).toBeHidden();
      await page.getByRole('button', { name: 'Crew', exact: true }).click();
      const canvas = page.locator('#stage');
      await page.evaluate(() => {
        window.cartridgeFrames = {};
        const canvas = document.querySelector('#stage');
        new MutationObserver(() => {
          const phase = canvas.dataset.cartridgeState;
          if (phase && !window.cartridgeFrames[phase]) window.cartridgeFrames[phase] = canvas.toDataURL('image/png');
        }).observe(canvas, { attributes: true, attributeFilter: ['data-cartridge-state'] });
      });
      await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
      await expect(page.locator('#panel')).not.toBeVisible();
      await page.locator('.load-cartridge').dispatchEvent('click');
      await expect(canvas).toHaveAttribute('data-cartridge-state', 'inserted');
      await expect(page.locator('.crew-grid')).toBeVisible();
      const frames = await page.evaluate(() => window.cartridgeFrames);
      for (const phase of ['lifting', 'aligning', 'inserting', 'inserted']) {
        assert(frames[phase], `${engineName}: ${phase} observed`);
        await writeFile(new URL(`${screenshotPrefix}cartridge-${phase}-${engineName}.png`, screenshots), Buffer.from(frames[phase].split(',')[1], 'base64'));
      }
      assert.equal(new Set(Object.values(frames)).size, Object.keys(frames).length);
      await page.getByRole('button', { name: 'Close program' }).click();
      await expect(canvas).toHaveAttribute('data-cartridge-state', 'ejecting');
      await expect(canvas).toHaveAttribute('data-cartridge-state', 'idle');
      await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(canvas).toHaveAttribute('data-cartridge-state', 'idle');
      await expect(page.locator('#panel')).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Load cartridge', exact: true })).toBeEnabled();
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'suspended');
      assert.equal((await audioState(page)).voices, 0);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'running');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
      await expect(page.locator('.crew-grid')).toBeVisible();
      report.push({ label: `${engineName}/cartridge/animated-sequence-and-audio`, passed: true });
      console.log(`PASS ${engineName}/cartridge/animated-sequence-and-audio`);
    } finally { await context.close(); }
    }
    if (themes.includes('pocket')) {
      const context = await browser.newContext({ viewport: engineName === 'chromium' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/pocket/`);
        await page.getByRole('button', { name: 'Press start', exact: true }).click();
        await expect(page.locator('#boot')).toBeHidden();
        const canvas = page.locator('#stage');
        const frames = async milliseconds => canvas.evaluate((element, milliseconds) => new Promise(resolve => {
          const frames = new Set();
          const start = performance.now();
          const captureFrame = now => {
            frames.add(element.toDataURL());
            if (now - start < milliseconds) requestAnimationFrame(captureFrame); else resolve(frames.size);
          };
          requestAnimationFrame(captureFrame);
        }), milliseconds);
        await page.locator('[data-pocket-program="1"]').click();
        assert(await frames(750) > 2, `${engineName} pocket camera framing must animate`);
        await page.getByRole('button', { name: 'Turn the handheld around' }).click();
        assert(await frames(1800) > 8, `${engineName} pocket turntable must animate`);
        await page.getByRole('button', { name: 'Turn the handheld around' }).click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.getByRole('button', { name: 'Home menu', exact: true }).click();
        assert.equal(await frames(150), 1, `${engineName} reduced motion must stop rendering`);
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
        await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'suspended');
        assert.equal((await audioState(page)).voices, 0);
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        await expect(page.locator('body')).toHaveAttribute('data-audio-state', 'running');
        report.push({ label: `${engineName}/pocket/animated-camera-and-audio`, passed: true });
        console.log(`PASS ${engineName}/pocket/animated-camera-and-audio`);
      } finally { await context.close(); }
      const nativeContext = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await nativeContext.newPage();
        await page.goto(`${origin}/pocket/`);
        await expect(page.getByRole('heading', { name: 'Schulich Press Start', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Join the team', exact: true })).toHaveAttribute('href', 'https://schulich-press-start-classic.vercel.app/join/');
      } finally { await nativeContext.close(); }
    }
  } finally { await browser.close(); }
}

assert.equal(new Set(portraitPalettes.values()).size, themes.length);
for (const path of ['/.env.local', '/.local/portrait-approvals.md', '/@fs/Users/ysoli/website/.env.local']) {
  const response = await fetch(new URL(path, origin));
  assert([403, 404].includes(response.status), `Private source route exposed: ${path}`);
}
await writeFile(new URL(finish ? `cartridge-${finish}-verification.json` : themes.length === 1 ? `${themes[0]}-verification.json` : 'verification.json', import.meta.url), JSON.stringify({ ...(finish ? { finish } : {}), passed: report.length, checks: report }, null, 2));
console.log(`${report.length} responsive console scenarios passed.`);