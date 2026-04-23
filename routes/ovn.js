/**
 * routes/ovn.js
 * Маршруты: GET /api/ovn, POST /api/ovn, PUT /api/ovn
 */

const fs    = require('fs');
const PATHS = require('./paths');

function readReports() {
  if (!fs.existsSync(PATHS.ovn)) fs.writeFileSync(PATHS.ovn, '[]');
  return JSON.parse(fs.readFileSync(PATHS.ovn, 'utf-8'));
}

function writeReports(reports) {
  fs.writeFileSync(PATHS.ovn, JSON.stringify(reports, null, 2));
}

// GET /api/ovn — вернуть все отчёты
function handleGet(req, res) {
  const reports = readReports();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(reports));
}

// POST /api/ovn — добавить новый отчёт
function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const report = JSON.parse(body);
      report.id = Date.now();
      report.createdAt = new Date().toISOString();

      let reports = readReports();

      // Предотвратить дубли по дню/мастеру/локации для посещаемости
      if (report.schedTime) {
        reports = reports.filter(r =>
          !(r.date === report.date &&
            r.barber === report.barber &&
            r.location === report.location &&
            r.schedTime)
        );
      }

      reports.unshift(report);
      writeReports(reports);

      console.log(`[OVN] Saved: ${report.location} - ${report.barber} (${report.violation})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', id: report.id }));
    } catch (e) {
      console.error('[OVN] POST error:', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

// PUT /api/ovn — редактировать отчёт (один раз)
function handlePut(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const upd = JSON.parse(body);
      if (!upd.id || !upd.editorName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing id or editorName' }));
        return;
      }

      let reports = readReports();
      let updated = false;
      let alreadyEdited = false;

      for (let i = 0; i < reports.length; i++) {
        if (String(reports[i].id) === String(upd.id)) {
          if (reports[i].editedBy) { alreadyEdited = true; break; }

          const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          if (upd.location)          reports[i].location  = upd.location;
          if (upd.barber)            reports[i].barber    = upd.barber;
          if (upd.date)              reports[i].date      = upd.date;
          if (upd.time)              reports[i].time      = upd.time;
          if (upd.cost !== undefined) reports[i].cost     = upd.cost;
          if (upd.match)             reports[i].match     = upd.match;
          if (upd.violation)         reports[i].violation = upd.violation;
          if (upd.nation)            reports[i].nation    = upd.nation;

          reports[i].notes    = (upd.notes || '').trim() + ` (отредактировано ${time} ${upd.editorName})`;
          reports[i].editedBy = upd.editorName;
          reports[i].editedAt = new Date().toISOString();
          updated = true;
          break;
        }
      }

      if (alreadyEdited) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Entry can only be edited once' }));
        return;
      }
      if (updated) {
        writeReports(reports);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (e) {
      console.error('[OVN] PUT error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  });
}

module.exports = { handleGet, handlePost, handlePut };
