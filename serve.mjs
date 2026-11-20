// Sunset Vice - Cover Studio: a tiny static server for local testing.
//
// Serves app/ at http://localhost:8080 (or the port given as the first
// argument). No dependencies, no network use beyond localhost: it only
// reads files from app/ and refuses any path that escapes it.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(join(fileURLToPath(new URL('.', import.meta.url)), 'app'));
const port = Number(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const raw = new URL(req.url || '/', 'http://localhost').pathname;
    const rel = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
    const file = resolve(join(appDir, rel));
    if (file !== appDir && !file.startsWith(appDir + sep)) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden\n');
      return;
    }
    const body = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'content-length': body.length });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
  }
});

server.listen(port, () => {
  console.log(`Sunset Vice — Cover Studio at http://localhost:${port}/`);
});
