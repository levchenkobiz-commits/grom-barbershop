/**
 * routes/handbook.js
 * Маршруты: GET /api/handbook, POST /api/handbook
 */

const fs    = require('fs');
const PATHS = require('./paths');

const DEFAULT_HANDBOOK = {
  'Опоздание':              300,
  'Невыход':                5000,
  'Воровство':              5000,
  'Грязное место':          500,
  'Без формы':              500,
  'Отказ клиенту':          1000,
  'Разговор на нац. языке': 500,
  'Жалоба':                 1000,
  'Поломка':                0,
  'Другое':                 0,
};

// GET /api/handbook
function handleGet(req, res) {
  if (!fs.existsSync(PATHS.handbook)) {
    fs.writeFileSync(PATHS.handbook, JSON.stringify(DEFAULT_HANDBOOK, null, 2));
  }
  const hb = fs.readFileSync(PATHS.handbook, 'utf-8');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(hb);
}

// POST /api/handbook
function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const hb = JSON.parse(body);
      fs.writeFileSync(PATHS.handbook, JSON.stringify(hb, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

module.exports = { handleGet, handlePost };
