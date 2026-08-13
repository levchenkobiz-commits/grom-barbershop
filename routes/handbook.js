/**
 * routes/handbook.js
 * Маршруты: GET /api/handbook, POST /api/handbook
 */

const fs    = require('fs');
const PATHS = require('./paths');
const VIOLATION_RULES = require('../public/js/violation-rules');

// GET /api/handbook
function handleGet(req, res) {
  if (!fs.existsSync(PATHS.handbook)) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Штрафной лист недоступен' }));
  }
  try {
    const hb = VIOLATION_RULES.canonicalizeHandbook(JSON.parse(fs.readFileSync(PATHS.handbook, 'utf-8')));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(hb));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message || 'Штрафной лист повреждён' }));
  }
}

// POST /api/handbook
function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const hb = VIOLATION_RULES.canonicalizeHandbook(JSON.parse(body));
      if (!Object.keys(hb).length) throw new Error('Пустой штрафной лист');
      fs.writeFileSync(PATHS.handbook, JSON.stringify(hb, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'Invalid JSON' }));
    }
  });
}

module.exports = { handleGet, handlePost };
