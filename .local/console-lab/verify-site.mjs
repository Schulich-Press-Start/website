import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const directory = fileURLToPath(new URL('../../dist-site/', import.meta.url));
const screenshots = process.env.SPS_SCREENSHOTS ?? fileURLToPath(new URL('site-screenshots/', import.meta.url));
await mkdir(screenshots, { recursive: true });
const data = JSON.parse(await readFile(join(directory, 'club.json'), 'utf8'));

// mirrors the parts of cloudflare static assets the site relies on: _headers, _redirects, 404-page
function parseHeaders(text) {
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ')) rules.push({ pattern: line.trim(), headers: {} });
    else { const [key, ...value] = line.trim().split(': '); rules.at(-1).headers[key] = value.join(': '); }
  }
  return rules;
}
const headerRules = parseHeaders(await readFile(join(directory, '_headers'), 'utf8'));
const redirects = (await readFile(join(directory, '_redirects'), 'utf8')).split('\n').filter(Boolean).map(line => line.split(/\s+/));
const expectedHeaders = headerRules.find(rule => rule.pattern === '/*').headers;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.txt': 'text/plain' };
const matches = (pattern, path) => pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path;
async function file(path) { try { return (await stat(path)).isFile() ? path : undefined; } catch { return undefined; } }

const server = process.env.SPS_SITE_ORIGIN ? undefined : createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  for (const rule of headerRules) if (matches(rule.pattern, path)) for (const [key, value] of Object.entries(rule.headers)) response.setHeader(key, value);
  const redirect = redirects.find(([from]) => from === path);
  if (redirect) { response.writeHead(Number(redirect[2]), { Location: redirect[1] }); response.end(); return; }
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  if (/(^|\/)_(headers|redirects)$/.test(safe)) { response.writeHead(404); response.end(); return; }
  const found = await file(join(directory, safe.endsWith('/') ? `${safe}index.html` : safe));
  const target = found ?? join(directory, '404.html');
  response.writeHead(found ? 200 : 404, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream' });
  response.end(await readFile(target));
});
if (server) await new Promise(resolve => server.listen(4325, '127.0.0.1', resolve));
const origin = process.env.SPS_SITE_ORIGIN ?? 'http://127.0.0.1:4325';
const reports = [];

try {
  const home = await fetch(`${origin}/`, { redirect: 'manual' });
  assert.equal(home.status, 200);
  for (const [key, value] of Object.entries(expectedHeaders)) assert.equal(home.headers.get(key), value, `/: ${key}`);
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
          await expect(panel.locator('.team-cart')).toHaveCount(data.divisions.length);
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
            if (membership) {
              const lead = data.members.find(member => member.id === membership.memberId);
              await expect(detail.locator('.team-lead strong')).toHaveText(lead.name);
              await expect(detail.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', lead.linkedin);
            } else {
              await expect(detail.locator('.team-lead')).toContainText('Lead to be announced');
              await expect(detail.getByRole('link', { name: 'Apply to SPS' })).toHaveAttribute('href', data.site.applicationUrl);
            }
            for (const image of await detail.locator('img').all()) await image.evaluate(element => element.decode());
            if (['embedded-software', 'business'].includes(division.id)) {
              if (size.name === 'phone') await detail.scrollIntoViewIfNeeded();
              await shot(`team-${division.id}`);
            }
          }
          const panelScan = await new AxeBuilder({ page }).include('#panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          assert.deepEqual(panelScan.violations.map(item => `${item.id}: ${item.nodes.map(node => node.html.slice(0, 160)).join(" | ")}`), [], `${size.name}: teams accessibility`);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'horizontal overflow');
          await page.keyboard.press('Escape');
          await expect(panel).toBeHidden();
          await expect(page.locator('#stage')).toHaveAttribute('data-cartridge-state', 'idle', { timeout: 15000 });
          await page.getByRole('button', { name: 'System settings' }).click();
          await expect(page.getByRole('navigation', { name: 'Switch prototype' })).toHaveCount(0);
          await expect(page.getByRole('navigation', { name: 'Find SPS' }).getByRole('link')).toHaveCount(3);
          await page.keyboard.press('Escape');
          assert.deepEqual(errors, [], `${size.name}: browser errors`);
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
        await expect(page.getByRole('link', { name: 'Apply to join' })).toHaveAttribute('href', data.site.applicationUrl);
      } finally { await context.close(); }
    } finally { await browser.close(); }
  }
  console.log(`Verified ${reports.length} public website scenarios, headers, redirects, 404 handling and the no-JavaScript fallback. Screenshots: ${screenshots}`);
} finally { server?.close(); }
