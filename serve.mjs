// Tiny static server for local development and screenshots.
// Serves this repository over plain local addresses only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(join(fileURLToPath(new URL('.', import.meta.url))));
const port = Number(process.env.PORT ?? 8901);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root)) throw Object.assign(new Error('bad path'), { code: 'ENOENT' });
    if (path === root) path = join(root, 'app', 'index.html');
    if (path === join(root, 'app')) path = join(root, 'app', 'index.html');
    const body = await readFile(path);
    res.writeHead(200, {
      'content-type': types[extname(path).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Sunset Vice serving on 127.0.0.1:${port} (open /app/)`);
});
