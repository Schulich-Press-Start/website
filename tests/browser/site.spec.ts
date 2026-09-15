import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const routes = [
  { path: '/', title: 'Schulich Press Start' },
  { path: '/handheld/', title: 'Handheld' },
  { path: '/team/', title: 'Team' },
  { path: '/journal/', title: 'Journal' },
  { path: '/join/', title: 'Join' },
  { path: '/support/', title: 'Support' },
];
const securityPolicy = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8').match(/Content-Security-Policy: (.+)/)![1];

function tabKeyFor(browserName: string) {
  return browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
}

async function visit(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `HTTP status for ${path}`).toBe(200);
  await expect(page.locator('main h1')).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
}

async function loadImages(page: Page) {
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => {
      const rendered = element as HTMLImageElement;
      return rendered.complete && rendered.naturalWidth > 0;
    })).toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document' || new URL(route.request().url()).origin !== new URL(baseURL!).origin) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': securityPolicy } });
  });
});

for (const route of routes) {
  test(`routes and accessibility: ${route.path}`, async ({ page, baseURL }, testInfo) => {
    const runtimeErrors: string[] = [];
    const thirdPartyRequests: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== new URL(baseURL!).origin) thirdPartyRequests.push(request.url());
    });
    await visit(page, route.path);
    await expect(page).toHaveTitle(new RegExp(route.title));
    await loadImages(page);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clippedText: Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3, p, button, summary, .member-name, .member-role'))
        .filter((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent?.trim()),
      imageProblems: Array.from(document.images).filter((image) => !image.complete || !image.naturalWidth || !image.hasAttribute('width') || !image.hasAttribute('height')).map((image) => image.src),
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.clippedText).toEqual([]);
    expect(layout.imageProblems).toEqual([]);
    expect(runtimeErrors).toEqual([]);
    expect(thirdPartyRequests).toEqual([]);

    if (route.path === '/') {
      await expect(page.locator('.hero-product img')).toHaveAttribute('loading', 'eager');
      await expect(page.locator('.hero-product img')).toHaveAttribute('fetchpriority', 'high');
      const nextHeading = await page.locator('#intro-title').boundingBox();
      expect(nextHeading!.y).toBeLessThan(page.viewportSize()!.height - 10);
    } else {
      await expect(page.locator('#site-navigation [aria-current="page"]')).toHaveAttribute('href', route.path);
    }

    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(accessibility), contentType: 'application/json' });
    expect(accessibility.violations).toEqual([]);
    await testInfo.attach('rendered-page', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  });
}

test('native navigation and mobile menu support keyboard and touch', async ({ page, isMobile, hasTouch, browserName }) => {
  await visit(page, '/');
  await page.keyboard.press(tabKeyFor(browserName));
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  if (isMobile || page.viewportSize()!.width <= 864) {
    const toggle = page.locator('[data-menu-toggle]');
    if (hasTouch) await toggle.tap(); else await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#site-navigation')).toBeVisible();
    await toggle.focus();
    await page.keyboard.press(tabKeyFor(browserName));
    await expect(page.locator('#site-navigation a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  }
  await page.locator('#site-navigation').getByRole('link', { name: 'Team', exact: true }).click();
  await expect(page).toHaveURL('/team/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The SPS team.');
});

test('member selection has native disclosure, deep links and focus restoration', async ({ page, hasTouch, browserName }) => {
  await visit(page, '/team/');
  await expect(page.locator('[data-member]')).toHaveCount(5);
  const president = page.locator('#member-abdul-waase-qureshi-presidency');
  const software = page.locator('#member-yassin-soliman-embedded-software');
  await president.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(president).toHaveAttribute('open', '');
  if (hasTouch) await software.locator('summary').tap(); else await software.locator('summary').click();
  await expect(software).toHaveAttribute('open', '');
  await expect(president).not.toHaveAttribute('open', '');
  await expect(page).toHaveURL(/#member-yassin-soliman-embedded-software$/);
  await software.locator('summary').focus();
  await expect(software.locator('summary')).toBeFocused();
  await page.keyboard.press(tabKeyFor(browserName));
  const activeAfterTab = await page.evaluate(() => document.activeElement?.outerHTML);
  await expect(page.getByRole('link', { name: 'Yassin Soliman on LinkedIn' }), activeAfterTab).toBeFocused();
  await page.keyboard.press(`Shift+${tabKeyFor(browserName)}`);
  await expect(software.locator('summary')).toBeFocused();
  await page.keyboard.press(tabKeyFor(browserName));
  await page.keyboard.press(tabKeyFor(browserName));
  await expect(page.locator('#member-mujtaba-zia-game-design summary')).toBeFocused();
  await page.keyboard.press(`Shift+${tabKeyFor(browserName)}`);
  await expect(page.getByRole('link', { name: 'Yassin Soliman on LinkedIn' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(software).not.toHaveAttribute('open', '');
  await expect(software.locator('summary')).toBeFocused();
  await visit(page, '/');
  await visit(page, '/team/#member-yassin-soliman-embedded-software');
  await expect(software).toHaveAttribute('open', '');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('reduced motion disables interaction animation without hiding content', async ({ page }) => {
  await visit(page, '/team/');
  const summary = page.locator('#member-yassin-soliman-embedded-software summary');
  await summary.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await summary.click();
  await summary.click();
  expect(await summary.locator('.member-toggle-icon').evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.getByRole('link', { name: 'Yassin Soliman on LinkedIn' })).toBeVisible();
});

test('missing content produces honest, usable destinations', async ({ page }) => {
  await visit(page, '/journal/');
  await expect(page.locator('.journal-list li')).toHaveCount(0);
  await expect(page.getByText('No build logs have been published yet.', { exact: false })).toBeVisible();
  await visit(page, '/join/');
  await expect(page.locator('[data-application-status]')).toHaveText('Recruiting now');
  await expect(page.locator('[data-application-link]')).toHaveCount(0);
  await expect(page.locator('[data-contact-link]')).toHaveAttribute('href', 'https://www.linkedin.com/in/abdulwq/');
  await visit(page, '/support/');
  await expect(page.locator('[data-contact-link]')).toHaveAttribute('href', 'https://www.linkedin.com/in/abdulwq/');
  await expect(page.locator('form, a[href^="mailto:"]')).toHaveCount(0);
  const missing = await page.goto('/this-page-does-not-exist/');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.');
  await page.getByRole('link', { name: 'Back to SPS' }).click();
  await expect(page).toHaveURL('/');
});

test('all internal links and fragments resolve', async ({ page, request, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Static link graph is identical across browser projects.');
  const links = new Set<string>();
  for (const route of routes) {
    await visit(page, route.path);
    for (const href of await page.locator('a').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')))) {
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
      const url = new URL(href!, new URL(route.path, baseURL));
      expect(['http:', 'https:', 'mailto:']).toContain(url.protocol);
      if (url.origin === new URL(baseURL!).origin) links.add(url.href);
    }
  }
  for (const href of links) {
    const response = await request.get(href);
    expect(response.ok(), href).toBe(true);
    const fragment = new URL(href).hash.slice(1);
    if (fragment) {
      const exists = await page.evaluate(({ html, identifier }) => Boolean(new DOMParser().parseFromString(html, 'text/html').getElementById(identifier)), { html: await response.text(), identifier: decodeURIComponent(fragment) });
      expect(exists, href).toBe(true);
    }
  }
});

test('compact and wide layouts preserve the first-viewport product story', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Extra viewport boundary checks run once.');
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await visit(page, '/');
    await loadImages(page);
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, nextSectionTop: document.querySelector('#intro-title')!.getBoundingClientRect().top }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(layout.nextSectionTop, `${viewport.width}x${viewport.height}`).toBeLessThan(viewport.height - 10);
    await testInfo.attach(`viewport-${viewport.width}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test.describe('without client JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all essential pages, navigation and member details remain usable', async ({ page, browserName }) => {
    for (const route of routes) {
      await visit(page, route.path);
      await expect(page.locator('#site-navigation')).toBeVisible();
      await expect(page.locator('[data-menu-toggle]')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await visit(page, '/team/');
    await expect(page.locator('[data-member]')).toHaveCount(5);
    const software = page.locator('#member-yassin-soliman-embedded-software');
    await software.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(software).toHaveAttribute('open', '');
    await page.keyboard.press(tabKeyFor(browserName));
    await expect(page.getByRole('link', { name: 'Yassin Soliman on LinkedIn' })).toBeFocused();
    await page.locator('#site-navigation').getByRole('link', { name: 'Handheld', exact: true }).click();
    await expect(page).toHaveURL('/handheld/');
    await expect(page.getByText('Zephyr is our current proposed embedded platform, subject to hardware selection.')).toBeVisible();
  });
});

test('3D is on demand, framed, interactive and keyboard accessible', async ({ page }, testInfo) => {
  const modelRequests: string[] = [];
  const runtimeErrors: string[] = [];
  page.on('request', (request) => { if (request.url().includes('sps-handheld.glb') || request.url().includes('handheld-viewer')) modelRequests.push(request.url()); });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await visit(page, '/');
  expect(modelRequests).toEqual([]);
  const viewer = page.locator('[data-handheld-viewer]');
  const load = viewer.getByRole('button', { name: 'Explore in 3D' });
  const posterSceneBox = await viewer.locator('.viewer-scene').boundingBox();
  const loadBox = await load.boundingBox();
  expect(loadBox!.y).toBeGreaterThanOrEqual(posterSceneBox!.y + posterSceneBox!.height - 1);
  await load.click();
  await expect(viewer).toHaveAttribute('data-ready', 'true');
  const canvas = viewer.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toBeFocused();
  const canvasBox = await canvas.boundingBox();
  const controlsBox = await viewer.locator('[data-viewer-controls]').boundingBox();
  expect(controlsBox!.y).toBeGreaterThanOrEqual(canvasBox!.y + canvasBox!.height - 1);
  expect(modelRequests.some((url) => url.includes('sps-handheld.glb'))).toBe(true);
  await viewer.getByRole('button', { name: 'Reset model view' }).click();
  const pixels = await canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('webgl2')!;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    context.readPixels(0, 0, canvas.width, canvas.height, context.RGBA, context.UNSIGNED_BYTE, pixels);
    let opaque = 0;
    let minColumn = canvas.width;
    let maxColumn = 0;
    let minRow = canvas.height;
    let maxRow = 0;
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset] < 200) continue;
      opaque++;
      const pixel = (offset - 3) / 4;
      const column = pixel % canvas.width;
      const row = Math.floor(pixel / canvas.width);
      minColumn = Math.min(minColumn, column);
      maxColumn = Math.max(maxColumn, column);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
    }
    return { fraction: opaque / (canvas.width * canvas.height), minColumn, maxColumn, minRow, maxRow, width: canvas.width, height: canvas.height };
  });
  expect(pixels.fraction).toBeGreaterThan(0.05);
  expect(pixels.minColumn).toBeGreaterThan(1);
  expect(pixels.minRow).toBeGreaterThan(1);
  expect(pixels.maxColumn).toBeLessThan(pixels.width - 1);
  expect(pixels.maxRow).toBeLessThan(pixels.height - 1);
  const initial = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  const rotated = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  expect(rotated).not.toBe(initial);
  await viewer.getByRole('button', { name: 'Source CAD materials' }).click();
  await expect(viewer.getByRole('button', { name: 'Source CAD materials' })).toHaveAttribute('aria-pressed', 'true');
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).not.toBe(rotated);
  await viewer.getByRole('button', { name: 'Purple and orange colour concept' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await viewer.getByRole('button', { name: 'Replay model animation' }).click();
  const reducedFrame = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await canvas.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(reducedFrame);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await testInfo.attach('interactive-handheld', { body: await page.screenshot(), contentType: 'image/png' });
  await canvas.focus();
  await page.keyboard.press('Escape');
  await expect(canvas).toBeHidden();
  await expect(load).toBeFocused();
  await expect(viewer.locator('.viewer-poster')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('3D load failure keeps a useful static presentation', async ({ page }) => {
  await page.route('**/models/sps-handheld.glb', (route) => route.abort());
  await visit(page, '/handheld/');
  await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(page.locator('[data-viewer-status]')).toContainText('3D is unavailable here');
  await expect(page.locator('.viewer-poster')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry 3D' })).toBeEnabled();
});

test('production never exposes private review assets', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'The static publication boundary is browser independent.');
  for (const route of ['/', '/team/']) {
    await visit(page, route);
    await expect(page.locator('[data-local-review], .character-idle, .character-wave')).toHaveCount(0);
    expect(await page.content()).not.toContain('/__sps-review/');
  }
  const response = await request.get('/__sps-review/portraits/abdul-waase-qureshi.webp');
  expect(response.status()).toBe(404);
});