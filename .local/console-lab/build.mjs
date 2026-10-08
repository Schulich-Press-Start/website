import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import sharp from 'sharp';
import { club, site, yearPlan } from '../../src/data/club.ts';

const root = fileURLToPath(new URL('./', import.meta.url));
const workspace = fileURLToPath(new URL('../../', import.meta.url));
// --site builds the public website: cartridge club at the root, plain static files for any host
const siteMode = process.argv.includes('--site');
const themes = siteMode ? ['cartridge'] : ['signal', 'playroom', 'cartridge', 'pocket'];
const themePattern = themes.join('|');
export const publishDirectory = join(root, 'publish');
export const outputDirectory = join(publishDirectory, '.vercel', 'output');
export const staticDirectory = siteMode ? join(workspace, 'dist-site') : join(outputDirectory, 'static');
const productionOrigin = site.productionOrigin;
if (siteMode) assert(productionOrigin, 'The public website needs site.productionOrigin.');
export const classicOrigin = new URL(process.env.SPS_CLASSIC_URL ?? 'https://schulich-press-start-classic.vercel.app').origin;
assert(classicOrigin.startsWith('https://'), 'The original website must have a public HTTPS address.');

const publicDirectory = await mkdtemp(join(tmpdir(), 'sps-console-public-'));
const media = new Map([
  ['media/handheld.webp', '.local/console-lab/media/handheld.webp'],
  ['media/controls.webp', '.local/console-lab/media/controls.webp'],
  ['media/logo-white.png', 'src/assets/generated/logo-dark-surface.png'],
  ['media/logo-dark.png', 'src/assets/generated/logo-light-surface.png'],
  ['media/signature.png', 'src/assets/generated/signature.png'],
  ['models/sps-handheld.glb', 'public/models/sps-handheld.glb'],
  ['media/display.woff2', 'node_modules/@fontsource-variable/kufam/files/kufam-latin-wght-normal.woff2'],
  ['media/body.woff2', 'node_modules/@fontsource-variable/commissioner/files/commissioner-latin-wght-normal.woff2'],
  ['favicon.png', 'public/favicon.png'],
  ['licenses/kufam.txt', 'public/licenses/kufam.txt'],
  ['licenses/commissioner.txt', 'public/licenses/commissioner.txt'],
  ['licenses/three.txt', 'public/licenses/three.txt'],
  ['licenses/lucide.txt', '.local/console-lab/node_modules/lucide/LICENSE'],
  ['licenses/matter-js.txt', '.local/console-lab/node_modules/matter-js/LICENSE'],
]);
for (const member of club.members) {
  assert(member.avatar?.approved, `Unapproved portrait: ${member.id}`);
  media.set(`media/${member.id}.png`, `src/assets/generated/team/${member.id}-headshot.png`);
}

try {
  for (const [destination, source] of media) {
    const output = join(publicDirectory, destination);
    await mkdir(dirname(output), { recursive: true });
    await copyFile(join(workspace, source), output);
  }
  if (!siteMode) {
    await mkdir(join(publicDirectory, 'previews'), { recursive: true });
    for (const theme of themes) {
      await sharp(join(root, `screenshots/${theme}-chromium-desktop.png`))
        .resize({ width: 900, withoutEnlargement: true }).webp({ quality: 85 })
        .toFile(join(publicDirectory, `previews/${theme}.webp`));
    }
  }
  await writeFile(join(publicDirectory, 'club.json'), JSON.stringify({
    site: { name: site.name, applicationUrl: site.applicationUrl, publicContact: site.publicContact, instagramUrl: site.instagramUrl, linkedinUrl: site.linkedinUrl, recruitmentStatus: site.recruitmentStatus },
    members: club.members.map(({ id, name, coFounder, linkedin }) => ({ id, name, coFounder, linkedin })),
    memberships: club.memberships,
    divisions: club.divisions,
    yearPlan,
  }));
  const indexable = siteMode && site.indexable;
  await writeFile(join(publicDirectory, 'robots.txt'), indexable ? `User-agent: *\nAllow: /\n` : 'User-agent: *\nDisallow: /\n');
  await build({
    configFile: false,
    root,
    envDir: false,
    appType: 'mpa',
    publicDir: publicDirectory,
    define: { 'import.meta.env.VITE_SPS_CLASSIC_URL': JSON.stringify(siteMode ? productionOrigin : classicOrigin), 'import.meta.env.VITE_SPS_SITE': JSON.stringify(String(siteMode)) },
    plugins: [{
      name: 'sps-public-console-links',
      transformIndexHtml: {
        order: 'pre',
        handler(html, context) {
          if (siteMode) return siteHtml(html, context.path);
          return html
            .replaceAll('http://127.0.0.1:4322/', `${classicOrigin}/`)
            .replaceAll('https://schulich-press-start.vercel.app', classicOrigin)
            .replaceAll('Current website', 'Original website')
            .replaceAll('Open the current website', 'Open the original website')
            .replaceAll('Published website, unchanged', 'Original website')
            .replaceAll('Console lab / Local prototypes', 'Console lab / Design previews')
            .replace(new RegExp(`/screenshots/(${themePattern})-chromium-desktop\\.png`, 'g'), '/previews/$1.webp')
            .replace('</head>', '<link rel="icon" href="/favicon.png" /></head>');
        },
      },
    }],
    build: {
      outDir: staticDirectory,
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: false,
      assetsInlineLimit: 0,
      rollupOptions: { input: [...(siteMode ? [] : ['index.html']), ...themes.map(theme => `${theme}/index.html`), '404.html'].map(path => join(root, path)) },
    },
  });

  const websiteConfiguration = JSON.parse(await readFile(join(workspace, 'vercel.json'), 'utf8'));
  const securityHeaders = Object.fromEntries(websiteConfiguration.headers.find(rule => rule.source === '/(.*)').headers.map(({ key, value }) => [key, value]));
  if (siteMode) {
    await rename(join(staticDirectory, 'cartridge/index.html'), join(staticDirectory, 'index.html'));
    await rm(join(staticDirectory, 'cartridge'), { recursive: true });
    const headers = Object.entries(securityHeaders).filter(([key]) => indexable ? key !== 'X-Robots-Tag' : true);
    if (!indexable) assert(headers.some(([key, value]) => key === 'X-Robots-Tag' && value === 'noindex, nofollow'), 'Unindexed builds must send X-Robots-Tag.');
    await writeFile(join(staticDirectory, '_headers'), [
      '/*', ...headers.map(([key, value]) => `  ${key}: ${value}`),
      '/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '',
    ].join('\n'));
    await writeFile(join(staticDirectory, '_redirects'), ['/cartridge / 301', '/cartridge/ / 301', ''].join('\n'));
    await verifyOutput(['_headers', '_redirects']);
    console.log(`Prepared the public website in dist-site for ${productionOrigin} (${indexable ? 'indexable' : 'noindex'}).`);
  } else {
    const configuration = {
      version: 3,
      routes: [
        { src: '/.*', headers: securityHeaders, continue: true },
        { src: '/assets/.*', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
        { src: `/(${themePattern})`, status: 308, headers: { Location: '/$1/' } },
        { src: '/original/?', status: 307, headers: { Location: `${classicOrigin}/` } },
        { src: '/(handheld|team|journal|join|support)(/.*)?', status: 307, headers: { Location: `${classicOrigin}/$1$2` } },
        { src: '/', dest: '/index.html' },
        { src: `/(${themePattern})/`, dest: '/$1/index.html' },
        { handle: 'filesystem' },
        { src: '/.*', dest: '/404.html', status: 404 },
      ],
    };
    await writeFile(join(outputDirectory, 'config.json'), `${JSON.stringify(configuration, null, 2)}\n`);
    await writeFile(join(publishDirectory, 'vercel.json'), `${JSON.stringify({ public: false }, null, 2)}\n`);
    const manifest = await verifyOutput([...themes.map(theme => `${theme}/index.html`), ...themes.map(theme => `previews/${theme}.webp`)]);
    await writeFile(join(root, 'publish-manifest.json'), `${JSON.stringify({ classicOrigin, files: manifest, totalBytes: manifest.reduce((sum, file) => sum + file.bytes, 0) }, null, 2)}\n`);
    console.log(`Prepared ${manifest.length} approved static files; no private paths, localhost links or source maps. Original site: ${classicOrigin}`);
  }
} finally { await rm(publicDirectory, { recursive: true, force: true }); }

async function verifyOutput(extra) {
  const allowed = new Set([...media.keys(), 'club.json', 'robots.txt', 'index.html', '404.html', ...extra]);
  const manifest = [];
  async function inspect(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}${entry.name}`;
      assert(!entry.isSymbolicLink(), `Symlink in published output: ${path}`);
      if (entry.isDirectory()) { await inspect(join(directory, entry.name), `${path}/`); continue; }
      assert(allowed.has(path) || /^assets\/[a-z0-9_-]+\.(?:js|css)$/i.test(path), `Unexpected published file: ${path}`);
      const bytes = await readFile(join(directory, entry.name));
      if (/\.(?:html|js|css|json|txt)$/.test(path)) {
        const text = bytes.toString('utf8');
        assert(!/127\.0\.0\.1|localhost|\/Users\/|\/__sps-review\/|VERCEL_OIDC_TOKEN/.test(text), `Private or local reference in ${path}`);
        if (siteMode) assert(!/vercel\.app|Console lab|console-lab/i.test(text), `Prototype or Vercel reference in ${path}`);
      }
      manifest.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  await inspect(staticDirectory);
  assert.deepEqual(await readFile(join(staticDirectory, 'models/sps-handheld.glb')), await readFile(join(workspace, 'public/models/sps-handheld.glb')));
  return manifest;
}

function siteHtml(html, path) {
  const escape = value => value.replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
  const robots = site.indexable ? '' : '<meta name="robots" content="noindex, nofollow" />';
  if (path.endsWith('404.html')) {
    return html
      .replace(/<meta name="robots"[^>]*>/, robots)
      .replace('Page not found / SPS Console Lab', `Page not found / ${site.name}`)
      .replace('aria-label="Console lab home"', `aria-label="${site.name} home"`)
      .replace("This program isn't here.", "This cartridge isn't here.")
      .replace('Back to the console lab', `Back to ${site.name}`)
      .replace('</head>', '<link rel="icon" href="/favicon.png" /></head>');
  }
  const canonical = `${productionOrigin}/`;
  const description = escape(site.description);
  const contact = [
    site.applicationUrl && `<a href="${site.applicationUrl}">Apply to join</a>`,
    site.instagramUrl && `<a href="${site.instagramUrl}">Instagram</a>`,
    site.linkedinUrl && `<a href="${site.linkedinUrl}">LinkedIn</a>`,
    site.publicContact?.email && `<a href="mailto:${site.publicContact.email}">${site.publicContact.email}</a>`,
  ].filter(Boolean).join(' / ');
  const footer = [
    site.instagramUrl && `<a href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">Instagram</a>`,
    site.linkedinUrl && `<a href="${site.linkedinUrl}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`,
    site.publicContact?.email && `<a href="mailto:${site.publicContact.email}">Email</a>`,
  ].filter(Boolean).join('');
  const replaced = html
    .replace(/<meta name="robots"[^>]*>/, `${robots}<meta name="description" content="${description}" /><link rel="canonical" href="${canonical}" /><meta property="og:type" content="website" /><meta property="og:site_name" content="${site.name}" /><meta property="og:title" content="${site.name}" /><meta property="og:description" content="${description}" /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="${productionOrigin}/media/handheld.webp" /><meta name="theme-color" content="#784ac3" />`)
    .replace('<title>Cartridge Club / SPS Console Lab</title>', `<title>${site.name} / Cartridge Club</title>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><div class="noscript"><strong>${site.name}</strong>. ${description} ${contact}</div></noscript>`)
    .replace('<a href="/signal/">Signal</a><a href="/playroom/">Playroom</a>', footer)
    .replace('</head>', '<link rel="icon" href="/favicon.png" /></head>');
  assert(!/\/signal\/|\/playroom\/|127\.0\.0\.1/.test(replaced), 'Prototype links left in the public website');
  return replaced;
}