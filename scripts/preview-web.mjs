// Local preview of the exported SPA; no wallet signing or business endpoints.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const port = Number(process.argv[2] ?? 4173);
http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Outside export directory');
    let data;
    try { data = await readFile(file); }
    catch {
      if (!req.headers.accept?.includes('text/html') || pathname.startsWith('/_expo/') || pathname.startsWith('/assets/')) throw new Error('Missing resource');
      file = resolve(root, 'index.html'); data = await readFile(file);
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`LivePass preview: http://127.0.0.1:${port}`));
