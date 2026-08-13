const fs = require('fs');
const PATHS = require('./paths');

function handleGet(req, res) {
  if (!fs.existsSync(PATHS.analyticsHistory)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'История аналитики не найдена' }));
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(fs.readFileSync(PATHS.analyticsHistory, 'utf8'));
}

module.exports = { handleGet };
