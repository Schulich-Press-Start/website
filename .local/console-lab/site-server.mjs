import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// serves dist-site the way cloudflare static assets does for this site: _headers, _redirects and the 404 page
// run on its own to preview the public build locally: node .local/console-lab/site-server.mjs
export const siteDirectory = fileURLToPath(new URL('../../dist-site/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.txt': 'text/plain' };

export function parseHeaders(text) {
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ')) rules.push({ pattern: line.trim(), headers: {} });
    else { const [key, ...value] = line.trim().split(': '); rules.at(-1).headers[key] = value.join(': '); }
  }
  return rules;
}

const matches = (pattern, path) => pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path;
async function file(path) { try { return (await stat(path)).isFile() ? path : undefined; } catch { return undefined; } }

export async function startSiteServer({ port = 4326, host = '127.0.0.1', directory = siteDirectory } = {}) {
  const headerRules = parseHeaders(await readFile(join(directory, '_headers'), 'utf8'));
  const redirects = (await readFile(join(directory, '_redirects'), 'utf8')).split('\n').filter(Boolean).map(line => line.split(/\s+/));
  const server = createServer(async (request, response) => {
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
  await new Promise(resolve => server.listen(port, host, resolve));
  return { server, headerRules, redirects, origin: `http://${host}:${port}` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { origin } = await startSiteServer({ port: Number(process.env.SPS_SITE_PORT ?? 4326) });
  console.log(`Public website preview: ${origin}/`);
}
