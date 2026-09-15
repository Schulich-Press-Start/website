import { readFile } from 'node:fs/promises';

export function localReviewPlugin() {
  return {
    name: 'sps-local-review',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
        if (!pathname.startsWith('/__sps-review/')) return next();
        const host = request.headers.host?.split(':')[0];
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
          response.writeHead(403).end();
          return;
        }
        const filename = pathname.slice('/__sps-review/'.length);
        if (!/^(portraits\/[a-z-]+-ai\.(webp|mp4)|fonts\/Utendo-(Regular|Bold)\.ttf|review\.css|font-license\.txt)$/.test(filename)) {
          response.writeHead(404).end();
          return;
        }
        try {
          const bytes = await readFile(new URL(`../.local/review/${filename}`, import.meta.url));
          const contentType = filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.ttf') ? 'font/ttf' : filename.endsWith('.css') ? 'text/css' : 'text/plain';
          response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
          response.end(bytes);
        } catch {
          response.writeHead(404).end();
        }
      });
    },
  };
}