const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'retention_engine', 'artifacts');
const FILES = { summary: 'summary.json', scores: 'scores.json', audit: 'data_audit.json', quality: 'model_quality.json' };

function handleGet(req, res, parsedUrl) {
  try {
    const view = parsedUrl.searchParams.get('view') || 'summary';
    const filename = FILES[view];
    if (!filename) { res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Unknown view'})); }
    const file = path.join(ROOT, filename);
    if (!fs.existsSync(file)) { res.writeHead(503, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Модель ещё не обучена'})); }
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(fs.readFileSync(file));
  } catch (error) {
    res.writeHead(500, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:error.message}));
  }
}
module.exports={handleGet};
