import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseHeaders, siteDirectory } from './site-server.mjs';

// wraps dist-site in vercel's prebuilt output so the temp vercel site behaves like cloudflare
// cloudflare ignores this, it only reads _headers and _redirects from dist-site
const target = process.argv[2] ?? '/tmp/sps-vercel-temp';
const output = join(target, '.vercel', 'output');
const headerRules = parseHeaders(await readFile(join(siteDirectory, '_headers'), 'utf8'));
const redirects = (await readFile(join(siteDirectory, '_redirects'), 'utf8')).split('\n').filter(Boolean).map(line => line.split(/\s+/));
assert(headerRules.some(rule => rule.headers['X-Robots-Tag'] === 'noindex, nofollow'), 'the temp site has to stay noindex');

const escape = text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const routes = [
  ...headerRules.map(rule => ({ src: `^${escape(rule.pattern).replace(/\*/g, '.*')}$`, headers: rule.headers, continue: true })),
  ...redirects.map(([from, to, status]) => ({ src: `^${escape(from)}$`, status: Number(status), headers: { Location: to } })),
  { handle: 'filesystem' },
  { src: '^/.*$', dest: '/404.html', status: 404 },
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(siteDirectory, join(output, 'static'), { recursive: true, filter: path => !/\/_(headers|redirects)$/.test(path) });
await writeFile(join(output, 'config.json'), `${JSON.stringify({ version: 3, routes }, null, 2)}\n`);
console.log(`vercel prebuilt output ready in ${output} (${routes.length} routes)`);
