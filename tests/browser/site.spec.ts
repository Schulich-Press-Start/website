import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { club, site } from '../../src/data/club.ts';

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

// webgl frames and resize observer callbacks land on the next frames, so wait before reading pixels
async function settledFrame(page: Page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
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

async function expectApplicationButtons(page: Page) {
  let applicationRequests = 0;
  await page.route(site.applicationUrl!, (route) => {
    applicationRequests++;
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><title>Application destination</title><h1>Application destination</h1></html>',
    });
  });
  for (const index of [0, 1]) {
    await visit(page, '/join/');
    await loadImages(page);
    await expect(page).toHaveURL('/join/');
    await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
    await expect(page.locator('.division-description')).toHaveCount(club.divisions.length);
    await expect(page.locator('[data-application-status]')).toHaveText('Recruiting now');
    const applications = page.getByRole('link', { name: 'Apply to SPS', exact: true });
    await expect(applications).toHaveCount(2);
    const application = applications.nth(index);
    await expect(application).toHaveAttribute('href', site.applicationUrl!);
    await expect(application).not.toHaveAttribute('href', /\/edit/);
    expect(applicationRequests).toBe(index);
    if (index === 0) {
      await application.focus();
      await page.keyboard.press('Enter');
    } else {
      await application.click();
    }
    await expect(page).toHaveURL(site.applicationUrl!);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Application destination');
    expect(applicationRequests).toBe(index + 1);
  }
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
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'Instagram', exact: true })).toHaveAttribute('href', site.instagramUrl!);
    await expect(footer.getByRole('link', { name: 'Linktree', exact: true })).toHaveAttribute('href', site.linktreeUrl!);

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

test('Join stays on site until an application button is activated', async ({ page, request }) => {
  const response = await request.get('/join/', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers().location).toBeUndefined();
  expect(response.headers().refresh).toBeUndefined();
  await expectApplicationButtons(page);
});

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

test('approved headshots render publicly with consistent square framing', async ({ page, request }) => {
  for (const path of ['/', '/team/']) {
    await visit(page, path);
    const portraits = page.locator('.portrait-character > img');
    await expect(portraits).toHaveCount(5);
    await expect(page.locator('.portrait-caption, .portrait-initials')).toHaveCount(0);
    await expect(page.locator('.portrait-film')).toHaveCount(0);
    await loadImages(page);
    for (const member of club.members) {
      const avatar = member.avatar!;
      const dimensions = avatar.crop ?? avatar;
      const image = page.getByAltText(avatar.alt, { exact: true });
      await expect(image).toHaveAttribute('src', /^\/_astro\//);
      await expect(image).toHaveAttribute('srcset', /120w.*160w.*240w.*320w/);
      await expect(image).toHaveAttribute('width', String(dimensions.width));
      await expect(image).toHaveAttribute('height', String(dimensions.height));
      const layout = await image.evaluate((element) => {
        const image = element as HTMLImageElement;
        const frame = image.parentElement!.getBoundingClientRect();
        const bounds = image.getBoundingClientRect();
        return {
          loaded: image.complete && image.naturalWidth > 0,
          fit: getComputedStyle(image).objectFit,
          inside: bounds.top >= frame.top - 1 && bounds.bottom <= frame.bottom + 1 && bounds.left >= frame.left - 1 && bounds.right <= frame.right + 1,
        };
      });
      expect(layout).toEqual({ loaded: true, fit: 'contain', inside: true });
    }
  }
  const software = page.locator('#member-yassin-soliman-embedded-software');
  await software.locator('summary').click();
  await expect(software.getByAltText('Mii-style portrait of Yassin Soliman.')).toBeVisible();
  await expect(page.getByText('Portrait: AI-generated, member-approved.')).toHaveCount(0);
  const publicImage = await request.get('/images/team/saifullah-asad-front-headshot-ai.webp');
  expect(publicImage.status()).toBe(200);
  expect(publicImage.headers()['content-type']).toContain('image/webp');
});

test('headshot divisions wrap a larger roster without oversized tiles', async ({ page }) => {
  await visit(page, '/team/');
  await page.locator('#embedded-software .member-grid').evaluate((grid) => {
    const source = grid.firstElementChild!;
    for (let index = 0; index < 19; index++) {
      const item = source.cloneNode(true) as HTMLElement;
      item.removeAttribute('id');
      item.removeAttribute('name');
      item.querySelector('.member-name')!.textContent = `Layout fixture ${index + 1}`;
      grid.append(item);
    }
  });
  const portraits = page.locator('#embedded-software .portrait');
  await expect(portraits).toHaveCount(20);
  const bounds = await portraits.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, top: rect.top };
  }));
  expect(bounds.every((rect) => rect.width <= 200 && Math.abs(rect.width - rect.height) < 1)).toBe(true);
  expect(new Set(bounds.map((rect) => rect.top)).size).toBeGreaterThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('club copy separates prototypes, future plans and pending approvals', async ({ page }) => {
  await visit(page, '/handheld/');
  const development = page.locator('section[aria-labelledby="development-title"]');
  await expect(development).toContainText('two working prototypes');
  for (const game of ['Pong', 'Tomb of the Mask', 'Brick Breaker']) await expect(development).toContainText(game);
  await expect(development).toContainText('separate from the original games');
  await expect(development).toContainText('Game Boy-inspired');
  await expect(development).toContainText('goal is to complete that handheld by June');
  const collaboration = page.locator('section[aria-labelledby="collaboration-title"]');
  await expect(collaboration).toContainText('Schulich on a Chip');
  await expect(collaboration).toContainText('2027-2028 academic year');
  await expect(collaboration).toContainText('future integration plan');
  await expect(page.locator('main')).not.toContainText('Applications close September 25');
  await visit(page, '/');
  await expect(page.locator('.home-introduction')).toContainText('Two working prototypes');
  await expect(page.locator('.home-introduction')).toContainText('goal');
  await expect(page.locator('.home-introduction')).toContainText('by June');
  await expect(page.locator('.home-games')).toContainText('demos of Pong, Tomb of the Mask and Brick Breaker');
  await visit(page, '/support/');
  const approval = page.locator('section[aria-labelledby="approval-title"]');
  await expect(approval).toContainText('School approval pending');
  await expect(approval).toContainText('completing the club constitution and confirming a faculty advisor');
  await expect(approval).toContainText('Schulich Student Activities Fund (SSAF)');
  await expect(approval).toContainText('planned funding application, not an award');
  await expect(page.locator('[data-contact-link]')).toHaveAttribute('href', 'mailto:schulichpressstart@gmail.com');
  await expect(page.locator('[data-contact-link]')).toHaveText('Email SPS');
  await expect(page.locator('[data-contact-link]')).toHaveAccessibleName('Email SPS at schulichpressstart@gmail.com');
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('missing content produces honest, usable destinations', async ({ page }) => {
  await visit(page, '/journal/');
  await expect(page.locator('.journal-list li')).toHaveCount(0);
  await expect(page.getByText('No build logs have been published yet.', { exact: false })).toBeVisible();
  await visit(page, '/support/');
  await expect(page.locator('[data-contact-link]')).toHaveAttribute('href', 'mailto:schulichpressstart@gmail.com');
  await expect(page.locator('form')).toHaveCount(0);
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

test('homepage engineering topics support keyboard and native disclosure', async ({ page, browserName }) => {
  await visit(page, '/');
  const topics = page.locator('.workbench-topics details');
  await expect(topics).toHaveCount(4);
  for (const topic of await topics.all()) {
    const summary = topic.locator('summary');
    await summary.focus();
    if (await topic.getAttribute('open') === null) await page.keyboard.press('Enter');
    await expect(topic).toHaveAttribute('open', '');
    await expect(page.locator('.workbench-topics details[open]')).toHaveCount(1);
    await page.keyboard.press(tabKeyFor(browserName));
    await expect(topic.getByRole('link')).toBeFocused();
    await expect(topic.getByRole('link')).toHaveAttribute('href', /^\/team\/#/);
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(topic).not.toHaveAttribute('open', '');
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
      if (route.path === '/') {
        await expect(page.locator('[data-viewer-load]')).toBeHidden();
        const topic = page.locator('.workbench-topics details').filter({ hasText: 'Embedded software' });
        await topic.locator('summary').focus();
        await page.keyboard.press('Enter');
        await expect(topic).toHaveAttribute('open', '');
        await expect(topic).toContainText('Zephyr is the proposed platform, subject to hardware selection.');
        await page.keyboard.press(tabKeyFor(browserName));
        await expect(topic.getByRole('link')).toBeFocused();
      }
    }
    await expectApplicationButtons(page);
    await visit(page, '/team/');
    await expect(page.locator('[data-member]')).toHaveCount(5);
    await expect(page.locator('.portrait-character > img')).toHaveCount(5);
    await expect(page.locator('.portrait-caption, .portrait-initials')).toHaveCount(0);
    await loadImages(page);
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
  await expect(load).toHaveText('Press start');
  await expect(load).toHaveAccessibleName('Press start: Explore in 3D');
  const posterSceneBox = await viewer.locator('.viewer-scene').boundingBox();
  const loadBox = await load.boundingBox();
  expect(loadBox!.y).toBeGreaterThanOrEqual(posterSceneBox!.y + posterSceneBox!.height - 1);
  await load.click();
  await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
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
  await viewer.getByRole('button', { name: 'Inspect CAD edges' }).click();
  await expect(viewer).toHaveAttribute('data-inspection', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await testInfo.attach('interactive-handheld', { body: await page.screenshot(), contentType: 'image/png' });
  await canvas.focus();
  await page.keyboard.press('Escape');
  await expect(canvas).toBeHidden();
  await expect(load).toBeFocused();
  await expect(load).toHaveAccessibleName('Press start: Explore in 3D');
  await expect(viewer.locator('.viewer-poster')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('3D load failure keeps a useful static presentation', async ({ page }) => {
  await page.route('**/models/sps-handheld.glb', (route) => route.abort());
  await visit(page, '/handheld/');
  await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(page.locator('[data-viewer-status]')).toContainText('3D is unavailable here', { timeout: 15_000 });
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
  for (const path of [
    '/__sps-review/portraits/abdul-waase-qureshi-ai.webp',
    '/.local/portrait-approvals.md',
    '/.local/review/portraits/generation/generation-log.json',
    '/.local/club-documents/Schulich%20Press%20Start%20Constitution%2026-27.docx',
    '/.local/club-documents/SPS%20Info%20Night%202026-2027.pptx',
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test('shell colour picker updates the front and solid back while preserving source materials', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/handheld/']) {
    await visit(page, route);
    const viewer = page.locator('[data-handheld-viewer]');
    const load = viewer.getByRole('button', { name: 'Explore in 3D' });
    await load.click();
    await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
    const canvas = viewer.locator('canvas');
    const picker = viewer.getByLabel('Shell colour', { exact: true });
    const capture = async () => { await settledFrame(page); return canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()); };
    const chooseColour = async (value: string) => {
      await picker.evaluate((element, colour) => {
        const input = element as HTMLInputElement;
        input.value = colour;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
      await expect(picker).toHaveValue(value);
      await expect(viewer).toHaveAttribute('data-inspection', 'false');
      await expect(viewer.getByRole('button', { name: 'Inspect CAD edges' })).toHaveAttribute('aria-pressed', 'false');
    };
    const rearPixels = () => canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('webgl2')!;
      const samples: number[][] = [];
      for (const horizontal of [0.48, 0.52]) for (const vertical of [0.40, 0.52, 0.62]) {
        const rgba = new Uint8Array(4);
        context.readPixels(Math.floor(canvas.width * horizontal), Math.floor(canvas.height * vertical), 1, 1, context.RGBA, context.UNSIGNED_BYTE, rgba);
        samples.push(Array.from(rgba));
      }
      return samples;
    });
    await expect(picker).toHaveAttribute('type', 'color');
    await expect(picker).toHaveValue('#7543b9');
    await picker.focus();
    await expect(picker).toBeFocused();
    const pickerBox = await picker.boundingBox();
    expect(pickerBox!.width).toBeGreaterThanOrEqual(44);
    expect(pickerBox!.height).toBeGreaterThanOrEqual(44);
    const purpleFront = await capture();
    await chooseColour('#ef2439');
    expect(await capture()).not.toBe(purpleFront);
    await expect(picker).toHaveAttribute('data-selected', 'true');
    for (let turn = 0; turn < 9; turn++) await viewer.getByRole('button', { name: 'Rotate model right', exact: true }).click();
    for (const [red, green, blue, alpha] of await rearPixels()) {
      expect(alpha).toBe(255);
      expect(red).toBeGreaterThan(green + 40);
      expect(red).toBeGreaterThan(blue + 40);
    }
    const source = viewer.getByRole('button', { name: 'Source CAD materials' });
    await source.click();
    const originalBack = await capture();
    await chooseColour('#22cc88');
    await expect(source).toHaveAttribute('aria-pressed', 'false');
    for (const [red, green, blue, alpha] of await rearPixels()) {
      expect(alpha).toBe(255);
      expect(green).toBeGreaterThan(red + 30);
      expect(green).toBeGreaterThan(blue + 15);
    }
    await source.click();
    expect(await capture()).toBe(originalBack);
    await viewer.getByRole('button', { name: 'Purple and orange colour concept' }).click();
    await expect(picker).toHaveValue('#7543b9');
    for (const [red, green, blue, alpha] of await rearPixels()) {
      expect(alpha).toBe(255);
      expect(red).toBeGreaterThan(green + 10);
      expect(blue).toBeGreaterThan(red + 10);
    }
    await viewer.getByRole('button', { name: 'Inspect CAD edges' }).click();
    await chooseColour('#ffffff');
    const whiteBack = await capture();
    await chooseColour('#000000');
    expect(await capture()).not.toBe(whiteBack);
    await chooseColour('#22cc88');
    await viewer.getByRole('button', { name: 'Close 3D view' }).click();
    await load.click();
    await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
    await expect(picker).toHaveValue('#22cc88');
    await expect(picker).toHaveAttribute('data-selected', 'true');
    for (let turn = 0; turn < 9; turn++) await viewer.getByRole('button', { name: 'Rotate model right', exact: true }).click();
    for (const [red, green, blue, alpha] of await rearPixels()) {
      expect(alpha).toBe(255);
      expect(green).toBeGreaterThan(red + 30);
      expect(green).toBeGreaterThan(blue + 15);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach(route === '/' ? 'home-custom-shell' : 'handheld-custom-shell', { body: await viewer.screenshot(), contentType: 'image/png' });
  }
});

test('product tour, camera presets, screen and CAD inspection respond to input', async ({ page }) => {
  await visit(page, '/handheld/');
  const viewer = page.locator('[data-handheld-viewer]');
  await viewer.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  const canvas = viewer.locator('canvas');
  const capture = async () => { await settledFrame(page); return canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()); };
  const stop = viewer.getByRole('button', { name: 'Stop model animation' });
  await viewer.getByRole('button', { name: 'Replay model animation' }).click();
  await expect(stop).toBeEnabled();
  const playingFrame = await capture();
  await expect.poll(capture).not.toBe(playingFrame);
  await viewer.getByRole('button', { name: 'Replay model animation' }).click();
  await expect(stop).toBeEnabled();
  await stop.click();
  await expect(viewer).toHaveAttribute('data-playing', 'false');
  const stoppedFrame = await capture();
  await canvas.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await capture()).toBe(stoppedFrame);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await settledFrame(page);
  await viewer.getByRole('button', { name: 'Overview', exact: true }).click();
  const overview = await capture();
  await viewer.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(viewer.getByRole('button', { name: 'Controls', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await capture()).not.toBe(overview);
  await viewer.getByRole('button', { name: 'Profile', exact: true }).click();
  expect(await capture()).not.toBe(overview);
  await viewer.getByRole('button', { name: 'Overview', exact: true }).click();
  const powered = await capture();
  await viewer.getByRole('button', { name: 'Screen concept power' }).click();
  await expect(viewer.getByRole('button', { name: 'Screen concept power' })).toHaveAttribute('aria-pressed', 'false');
  expect(await capture()).not.toBe(powered);
  const smooth = await capture();
  await viewer.getByRole('button', { name: 'Inspect CAD edges' }).click();
  expect(await capture()).not.toBe(smooth);
  await expect(viewer.getByText('Screen animation is illustrative, not working firmware.')).toBeVisible();
  await viewer.getByRole('button', { name: 'Replay model animation' }).click();
  await expect(stop).toBeDisabled();
  await expect(viewer).toHaveAttribute('data-playing', 'false');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});