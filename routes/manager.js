/**
 * routes/manager.js
 * Маршруты: GET /api/manager_checks, POST /api/manager_checks
 */

const fs    = require('fs');
const PATHS = require('./paths');

// GET /api/manager_checks
function handleGet(req, res) {
  if (!fs.existsSync(PATHS.managerChecks)) fs.writeFileSync(PATHS.managerChecks, '[]');
  const checks = fs.readFileSync(PATHS.managerChecks, 'utf-8');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(checks);
}

// POST /api/manager_checks
function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const check = JSON.parse(body);
      check.id        = Date.now();
      check.createdAt = new Date().toISOString();

      if (!fs.existsSync(PATHS.managerChecks)) fs.writeFileSync(PATHS.managerChecks, '[]');
      let checks = JSON.parse(fs.readFileSync(PATHS.managerChecks, 'utf-8'));
      checks.unshift(check);
      fs.writeFileSync(PATHS.managerChecks, JSON.stringify(checks, null, 2));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', id: check.id }));
    } catch (e) {
      console.error('[Manager] check save error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Save failed' }));
    }
  });
}

module.exports = { handleGet, handlePost };
