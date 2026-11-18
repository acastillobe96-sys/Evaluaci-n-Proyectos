// Servidor estático mínimo para dist/ con URLs limpias (/proyectos/vitro/ → index.html).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL(`../${process.env.DIR ?? 'dist'}/`, import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 4173);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let f = normalize(join(ROOT, path));
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(f)).isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' }).end(); return; }
      f = join(f, 'index.html');
    }
    const body = await readFile(f);
    const largo = /\.(webp|avif|woff2|js|css)$/.test(f);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(f)] ?? 'application/octet-stream', 'Cache-Control': largo ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/proyectos/`));
