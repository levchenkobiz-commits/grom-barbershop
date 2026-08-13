/**
 * server.js — точка входа Grome Dashboard
 *
 * Этот файл намеренно короткий:
 * - запускает HTTP-сервер
 * - направляет API-запросы в routes/router.js
 * - раздаёт статические файлы
 *
 * Бизнес-логика живёт в routes/*.js — ищи там.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const router = require('./routes/router');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${parsedUrl.pathname}`);

  // 1. Попытка API-маршрута
  if (router.route(req, res, parsedUrl)) return;

  // 2. Раздача статических файлов
  const pathname = parsedUrl.pathname;
  // Both public master-cabinet URLs are permanent aliases of one canonical UI.
  // This prevents the legacy and redesigned versions from drifting apart again.
  const masterCabinetAliases = new Set(['/master-mobile.html', '/master-mobile-current.html']);
  const staticName = masterCabinetAliases.has(pathname)
    ? 'master-mobile-current.html'
    : (pathname === '/' ? 'index.html' : pathname.substring(1));
  const filePath = path.join(__dirname, staticName);
  const ext      = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const TEXT_EXTS = new Set(['.html', '.js', '.css', '.json', '.txt', '.md']);
  const readOpts  = TEXT_EXTS.has(ext) ? 'utf-8' : null; // null = binary Buffer

  fs.readFile(filePath, readOpts, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') { res.writeHead(404); return res.end('File not found'); }
      if (err.code === 'EISDIR') { res.writeHead(403); return res.end('Directory listing not allowed'); }
      res.writeHead(500); return res.end('Internal server error: ' + err.code);
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    // For text files: content is already a string (utf-8). For binary: it's a Buffer.
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`✅ GROME Dashboard запущен: http://localhost:${PORT}/`);
});
