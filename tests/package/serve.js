// Minimal static server for the browser tests, so pages load the package files
// over HTTP the way a static website would.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
};

createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  const file = join(ROOT, path.endsWith('/') ? `${path}index.html` : path);

  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  }
  catch {
    response.writeHead(404).end();
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} on http://localhost:${PORT}`));
