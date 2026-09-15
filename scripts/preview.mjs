import { preview } from 'astro';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PLAYWRIGHT_PORT must be an unprivileged TCP port.');

const server = await preview({
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: { host: '127.0.0.1', port },
});

if (server.port !== port) {
  await server.stop();
  throw new Error(`Port ${port} is occupied. Set PLAYWRIGHT_PORT to a free port.`);
}

const stop = async () => {
  await server.stop();
  await server.closed();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
console.log(`Production test preview: http://127.0.0.1:${port}`);