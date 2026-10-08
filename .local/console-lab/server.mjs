import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { club, site } from '../../src/data/club.ts';

const root = fileURLToPath(new URL('./', import.meta.url));
const workspace = fileURLToPath(new URL('../../', import.meta.url));
const assets = new Map([
  ['/media/handheld.webp', ['.local/console-lab/media/handheld.webp', 'image/webp']],
  ['/media/controls.webp', ['.local/console-lab/media/controls.webp', 'image/webp']],
  ['/media/logo-white.png', ['src/assets/generated/logo-dark-surface.png', 'image/png']],
  ['/media/logo-dark.png', ['src/assets/generated/logo-light-surface.png', 'image/png']],
  ['/media/signature.png', ['src/assets/generated/signature.png', 'image/png']],
  ['/models/sps-handheld.glb', ['public/models/sps-handheld.glb', 'model/gltf-binary']],
  ['/models/sps-handheld-concept.glb', ['public/models/sps-handheld-concept.glb', 'model/gltf-binary']],
  ['/media/handheld-concept.webp', ['.local/console-lab/media/handheld-concept.webp', 'image/webp']],
  ['/media/handheld-concept-front.webp', ['.local/console-lab/media/handheld-concept-front.webp', 'image/webp']],
  ['/media/display.woff2', ['node_modules/@fontsource-variable/kufam/files/kufam-latin-wght-normal.woff2', 'font/woff2']],
  ['/media/body.woff2', ['node_modules/@fontsource-variable/commissioner/files/commissioner-latin-wght-normal.woff2', 'font/woff2']],
  ...club.members.map(member => [`/media/${member.id}.png`, [`src/assets/generated/team/${member.id}-headshot.png`, 'image/png']]),
]);

export const server = await createServer({
  configFile: false,
  root,
  appType: 'mpa',
  publicDir: false,
  cacheDir: new URL('cache/', import.meta.url).pathname,
  optimizeDeps: { include: ['lucide', 'matter-js', 'three'] },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.SPS_LAB_PORT ?? 4323),
    strictPort: true,
    fs: { allow: [root, `${workspace}/node_modules`], deny: ['**/.env*', '**/.git/**', '**/.vercel/**', '**/club-documents/**', '**/reference-photos/**'] },
  },
  plugins: [{
    name: 'sps-console-lab',
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        const host = request.headers.host?.split(':')[0];
        if (!['127.0.0.1', 'localhost'].includes(host)) { response.writeHead(403).end(); return; }
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
        response.setHeader('Cache-Control', 'no-store');
        const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
        if (pathname === '/club.json') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ site, members: club.members, memberships: club.memberships, divisions: club.divisions }));
          return;
        }
        const asset = assets.get(pathname);
        if (asset) {
          try {
            const bytes = await readFile(new URL(`../../${asset[0]}`, import.meta.url));
            response.writeHead(200, { 'Content-Type': asset[1] }).end(bytes);
          } catch { response.writeHead(404).end(); }
          return;
        }
        next();
      });
    },
  }],
});

await server.listen();
server.printUrls();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });