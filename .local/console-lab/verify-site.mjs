import assert from 'node:assert/strict';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startSiteServer, parseHeaders } from './site-server.mjs';

const directory = fileURLToPath(new URL('../../dist-site/', import.meta.url));
const screenshots = process.env.SPS_SCREENSHOTS ?? fileURLToPath(new URL('site-screenshots/', import.meta.url));
await mkdir(screenshots, { recursive: true });
const data = JSON.parse(await readFile(join(directory, 'club.json'), 'utf8'));

const local = process.env.SPS_SITE_ORIGIN ? undefined : await startSiteServer({ port: 4325, directory });
const server = local?.server;
const headerRules = parseHeaders(await readFile(join(directory, '_headers'), 'utf8'));
const expectedHeaders = headerRules.find(rule => rule.pattern === '/*').headers;
const origin = process.env.SPS_SITE_ORIGIN ?? 'http://127.0.0.1:4325';
const reports = [];
// nothing the public website serves may still recruit, and the old tagline is gone everywhere
const retired = /recruit|apply to|apply now|join sps|join the team|your turn|lead to be announced|looking for .* members|made to play/i;

try {
  for (const file of (await readdir(directory, { recursive: true })).filter(file => /\.(html|js|css|json|txt)$/.test(file) && !file.startsWith('licenses/'))) {
    assert.doesNotMatch(await readFile(join(directory, file), 'utf8'), retired, `${file} still has retired copy`);
  }
  const home = await fetch(`${origin}/`, { redirect: 'manual' });
  assert.equal(home.status, 200);
  // cloudflare forces its own x-robots-tag: noindex on preview urls
  const preview = /^https:\/\/[^.]+-sps-website\.[^.]+\.workers\.dev$/.test(origin);
  for (const [key, value] of Object.entries(expectedHeaders)) {
    if (preview && key === 'X-Robots-Tag') assert.equal(home.headers.get(key), 'noindex', `/: ${key}`);
    else assert.equal(home.headers.get(key), value, `/: ${key}`);
  }
  const html = await home.text();
  assert(html.includes('<link rel="canonical" href="https://schulichpressstart.ca/" />'), 'canonical link');
  assert.equal(html.includes('noindex'), expectedHeaders['X-Robots-Tag'] !== undefined, 'robots meta follows site.indexable');
  for (const path of ['/cartridge/', '/cartridge']) {
    const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
    assert([301, 307, 308].includes(response.status), `${path} redirects`);
    assert.equal(new URL(response.headers.get('location'), origin).pathname, '/');
  }
  for (const path of ['/signal/', '/pocket/', '/server.mjs', '/.env', '/unknown-page/']) {
    const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
    assert.equal(response.status, 404, path);
    if (path === '/unknown-page/') assert((await response.text()).includes('Page not found.'));
  }

  for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    try {
      const sizes = engineName === 'chromium' ? [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'phone', width: 390, height: 844 }] : [{ name: 'phone', width: 390, height: 844 }];
      for (const size of sizes) {
        const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: 'reduce' });
        await context.addInitScript(() => {
          window.__cspViolations = [];
          document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`));
        });
        const page = await context.newPage();
        const errors = [];
        const requests = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('request', request => requests.push(request.url()));
        const shot = name => page.screenshot({ path: join(screenshots, `${name}-${engineName}-${size.name}.png`), animations: 'disabled' });
        try {
          await page.goto(`${origin}/`);
          await expect(page.getByRole('button', { name: 'Press start', exact: true })).toBeVisible();
          await expect(page.locator('#boot').getByRole('link', { name: 'All prototypes' })).toHaveCount(0);
          await expect(page.locator('#boot').getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', data.site.instagramUrl);
          await page.evaluate(() => document.fonts.ready);
          await shot('boot');
          await page.getByRole('button', { name: 'Press start', exact: true }).click();
          await expect(page.locator('#boot')).toBeHidden({ timeout: 15000 });
          await expect(page.locator('#stage')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
          await expect(page.getByRole('link', { name: 'All prototypes' })).toHaveCount(0);
          await expect(page.locator('.footer-links').getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', data.site.linkedinUrl);
          await page.locator('[data-cartridge="crew"]').click();
          await expect(page.locator('#cartridge-title')).toHaveText('The teams.');
          await page.mouse.move(0, 0);
          await shot('home');
          const homeScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          assert.deepEqual(homeScan.violations.map(item => item.id), [], `${size.name}: home accessibility`);

          await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
          await expect(page.locator('#stage')).toHaveAttribute('data-cartridge-state', 'inserted');
          const panel = page.locator('#panel');
          await expect(panel).toBeVisible();
          await expect(page.locator('#panel-title')).toHaveText('Meet the teams.');
          // only the four teams with people on them, business and communications are not on the public site
          assert.deepEqual(data.divisions.map(division => division.id), ['embedded-hardware', 'embedded-software', 'game-design', 'mechanical']);
          await expect(panel.locator('.team-cart')).toHaveCount(4);
          await expect(panel.locator('.teams-intro')).toHaveText(/^Four teams, one handheld\./);
          await expect(panel.locator('.team-president')).toContainText('Abdul Waase Qureshi');
          await expect(panel.locator('.team-plan li')).toHaveCount(data.yearPlan.length);
          for (const image of await panel.locator('img').all()) await image.evaluate(element => element.decode());
          const clipped = await panel.locator('.team-cart-label strong').evaluateAll(labels => labels.filter(label => label.scrollWidth > label.clientWidth + 1).map(label => label.textContent));
          assert.deepEqual(clipped, [], `${size.name}: team names overflow their cartridge`);
          await shot('teams');
          for (const [index, division] of data.divisions.entries()) {
            await panel.locator(`[data-team="${index}"]`).click();
            await expect(panel.locator(`[data-team="${index}"]`)).toHaveAttribute('aria-pressed', 'true');
            const detail = panel.locator('.team-detail');
            await expect(detail.locator('h3')).toHaveText(division.name);
            await expect(detail.locator('li')).toHaveCount(division.work.length);
            const membership = data.memberships.find(item => item.divisionId === division.id && item.role === 'lead');
            assert(membership, `${division.name} has a lead`);
            const lead = data.members.find(member => member.id === membership.memberId);
            await expect(detail.locator('.team-lead strong')).toHaveText(lead.name);
            await expect(detail.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', lead.linkedin);
            for (const image of await detail.locator('img').all()) await image.evaluate(element => element.decode());
            if (['embedded-software', 'mechanical'].includes(division.id)) {
              if (size.name === 'phone') await detail.scrollIntoViewIfNeeded();
              await shot(`team-${division.id}`);
            }
          }
          const panelScan = await new AxeBuilder({ page }).include('#panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          assert.deepEqual(panelScan.violations.map(item => `${item.id}: ${item.nodes.map(node => node.html.slice(0, 160)).join(" | ")}`), [], `${size.name}: teams accessibility`);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'horizontal overflow');
          assert.doesNotMatch(await page.locator('body').innerText(), retired, `${size.name}: retired copy on the teams screen`);
          await page.keyboard.press('Escape');
          await expect(panel).toBeHidden();
          await expect(page.locator('#stage')).toHaveAttribute('data-cartridge-state', 'idle', { timeout: 15000 });

          // inside the handheld, in the slot where join used to be
          await expect(page.locator('[data-cartridge="join"]')).toHaveCount(0);
          await page.locator('[data-cartridge="inside"]').click();
          await expect(page.locator('#cartridge-title')).toHaveText('Inside the handheld.');
          await page.getByRole('button', { name: 'Load cartridge', exact: true }).click();
          await expect(page.locator('#stage')).toHaveAttribute('data-cartridge-state', 'inserted');
          await expect(page.locator('#panel-title')).toHaveText('Inside the handheld.');
          const inside = panel.locator('.inside-scene canvas');
          await expect(inside).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
          // reduced motion: it is already sitting in the still exploded view, no animation to wait for
          await expect(inside).toHaveAttribute('data-exploded', 'true');
          const toggle = panel.getByRole('button', { name: 'Exploded view', exact: true });
          await expect(toggle).toHaveAttribute('aria-pressed', 'true');
          const explodedPixels = await inside.evaluate(canvas => canvas.toDataURL());
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-pressed', 'false');
          await expect(inside).toHaveAttribute('data-exploded', 'false');
          assert.notEqual(await inside.evaluate(canvas => canvas.toDataURL()), explodedPixels, `${size.name}: collapsing redraws the model`);
          await toggle.click();
          await expect(inside).toHaveAttribute('data-exploded', 'true');
          const insideLayers = [
            ['front', 'Front shell', ['Mechanical']], ['buttons', 'Buttons', ['Mechanical']],
            ['screen', 'Screen', ['Hardware', 'Software', 'Game Design']], ['board', 'Circuit board', ['Hardware', 'Software', 'Game Design']],
            ['battery', 'Battery', ['Hardware']], ['back', 'Back shell', ['Mechanical']],
          ];
          await expect(panel.locator('.inside-layers [data-layer]')).toHaveCount(insideLayers.length);
          for (const [id, name, teams] of insideLayers) {
            const layer = panel.locator(`[data-layer="${id}"]`);
            assert.deepEqual(await layer.locator('.team-chip').allTextContents(), teams, `${name} team chips`);
            await layer.click();
            await expect(layer).toHaveAttribute('aria-pressed', 'true');
            await expect(inside).toHaveAttribute('data-highlight', id);
            await expect(panel.locator('.inside-detail')).toContainText(`${name}.`);
          }
          // the chips carry the official team colours on their border and dot
          const chipColours = await panel.locator('[data-layer="screen"] .team-chip').evaluateAll(chips => chips.map(chip => getComputedStyle(chip).borderTopColor));
          assert.deepEqual(chipColours, ['rgb(48, 199, 88)', 'rgb(34, 137, 227)', 'rgb(227, 65, 11)'], `${size.name}: team chip colours`);
          // keyboard: arrows move between layers and enter picks one, picking it again clears it
          await panel.locator('[data-layer="front"]').focus();
          await page.keyboard.press('ArrowDown');
          await expect(panel.locator('[data-layer="buttons"]')).toBeFocused();
          await page.keyboard.press('Enter');
          await expect(inside).toHaveAttribute('data-highlight', 'buttons');
          await page.keyboard.press('Enter');
          await expect(panel.locator('[data-layer="buttons"]')).toHaveAttribute('aria-pressed', 'false');
          await panel.locator('[data-layer="battery"]').click();
          await shot('inside');
          const insideScan = await new AxeBuilder({ page }).include('#panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          assert.deepEqual(insideScan.violations.map(item => `${item.id}: ${item.nodes.map(node => node.html.slice(0, 160)).join(' | ')}`), [], `${size.name}: inside accessibility`);
          assert.doesNotMatch(await page.locator('body').innerText(), retired, `${size.name}: retired copy in inside the handheld`);
          await page.keyboard.press('Escape');
          await expect(panel).toBeHidden();
          await expect(page.locator('#stage')).toHaveAttribute('data-cartridge-state', 'idle', { timeout: 15000 });
          assert.doesNotMatch(await page.locator('body').innerText(), retired, `${size.name}: retired copy on the home screen`);
          await page.getByRole('button', { name: 'System settings' }).click();
          await expect(page.getByRole('navigation', { name: 'Switch prototype' })).toHaveCount(0);
          await expect(page.getByRole('navigation', { name: 'Find SPS' }).getByRole('link')).toHaveCount(3);
          await page.keyboard.press('Escape');
          assert.deepEqual(errors, [], `${size.name}: browser errors`);
          assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], `${size.name}: content security policy violations`);
          assert(requests.every(url => url.startsWith(origin) || url.startsWith('data:')), `${size.name}: third-party request`);
          reports.push({ engine: engineName, viewport: size.name, passed: true });
          console.log(`PASS site/${engineName}/${size.name}`);
        } finally { await context.close(); }
      }
      const context = await browser.newContext({ javaScriptEnabled: false });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/`);
        await expect(page.locator('noscript, .noscript').first()).toBeAttached();
        await expect(page.locator('.noscript').getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', data.site.instagramUrl);
        await expect(page.getByRole('link', { name: /apply|join/i })).toHaveCount(0);
        assert.doesNotMatch(await page.locator('body').innerText(), retired, 'retired copy in the no-javascript fallback');
      } finally { await context.close(); }
    } finally { await browser.close(); }
  }
  console.log(`Verified ${reports.length} public website scenarios, headers, redirects, 404 handling and the no-JavaScript fallback. Screenshots: ${screenshots}`);
} finally { server?.close(); }
