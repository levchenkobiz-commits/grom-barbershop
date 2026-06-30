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

function isLatesReport(report) {
  if (!report) return false;
  const text = [
    report.violation,
    report.notes,
    report.forceMajeureType
  ].map(v => String(v || '').toLowerCase()).join(' ');

  return Boolean(
    report.schedTime ||
    report.isForceMajeure ||
    report.fineWaived ||
    report.forceMajeureType ||
    text.includes('\u043c\u0430\u0441\u0442\u0435\u0440 \u043e\u043f\u043e\u0437\u0434\u0430\u043b') ||
    text.includes('\u043e\u043f\u043e\u0437\u0434\u0430\u043d') ||
    text.includes('\u043d\u0435 \u0432\u044b\u0448\u0435\u043b') ||
    text.includes('\u043d\u0435\u0432\u044b\u0445\u043e\u0434') ||
    text.includes('\u0444\u043e\u0440\u0441')
  );
}

function hasQueryFlag(req, name) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const value = url.searchParams.get(name);
    return value === '1' || value === 'true';
  } catch (_) {
    return false;
  }
}

function isNoViolation(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('замечаний нет') || text.includes('нет нарушений') || text.includes('✅');
}

function splitViolations(value) {
  return String(value || '')
    .split(',')
    .map(v => v.replace(/^✅\s*/, '').trim())
    .filter(Boolean);
}

function buildViolationEditNote(beforeRaw, afterRaw) {
  const before = splitViolations(beforeRaw);
  const after = splitViolations(afterRaw);
  const beforeComparable = before.map(v => v.toLowerCase()).join('|');
  const afterComparable = after.map(v => v.toLowerCase()).join('|');

  if (beforeComparable === afterComparable) return '';

  const beforeIsOk = before.length === 0 || isNoViolation(beforeRaw);
  const afterIsOk = after.length === 0 || isNoViolation(afterRaw);

  if (!beforeIsOk && afterIsOk) return `удалено нарушение: ${before.join(', ')}`;
  if (beforeIsOk && !afterIsOk) return `добавлено нарушение: ${after.join(', ')}`;

  const removed = before.filter(v => !after.some(a => a.toLowerCase() === v.toLowerCase()));
  const added = after.filter(v => !before.some(b => b.toLowerCase() === v.toLowerCase()));

  if (removed.length === 1 && added.length === 1 && before.length === 1 && after.length === 1) {
    return `изменено нарушение: ${removed[0]} → ${added[0]}`;
  }

  const parts = [];
  if (removed.length) parts.push(`удалено: ${removed.join(', ')}`);
  if (added.length) parts.push(`добавлено: ${added.join(', ')}`);
  return parts.length ? `изменены нарушения: ${parts.join('; ')}` : '';
}

// GET /api/ovn — вернуть все отчёты
function handleGet(req, res) {
  let reports = readReports();
  if (hasQueryFlag(req, 'video_only')) {
    reports = reports.filter(report => !isLatesReport(report));
  }
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

// PUT /api/ovn — редактировать отчёт
// Правила:
//   • в день проверки (МСК UTC+3) — любое количество правок для любой роли
//   • OVN после дня проверки — запрещено (403)
//   • manager/owner — могут редактировать в любой день
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

      // Moscow date helper (UTC+3)
      function toMoscowDate(isoStr) {
        const ms = new Date(isoStr).getTime() + 3 * 60 * 60 * 1000;
        return new Date(ms).toISOString().slice(0, 10);
      }
      const todayMoscow = toMoscowDate(new Date().toISOString());

      let reports = readReports();
      let updated = false;
      let blocked = null;

      for (let i = 0; i < reports.length; i++) {
        if (String(reports[i].id) === String(upd.id)) {
          const recDay = toMoscowDate(reports[i].createdAt || new Date().toISOString());
          const isSameDay = recDay === todayMoscow;

          // OVN может редактировать только в день создания записи
          if (upd.role === 'ovn' && !isSameDay) {
            blocked = 'OVN role can only edit on the day of the check';
            break;
          }

          const previousViolation = reports[i].violation || '';
          const time = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
          if (upd.location)           reports[i].location  = upd.location;
          if (upd.barber)             reports[i].barber    = upd.barber;
          if (upd.date)               reports[i].date      = upd.date;
          if (upd.time)               reports[i].time      = upd.time;
          if (upd.cost !== undefined) reports[i].cost      = upd.cost;
          if (upd.match)              reports[i].match     = upd.match;
          if (upd.violation)          reports[i].violation = upd.violation;
          if (upd.nation)             reports[i].nation    = upd.nation;
          if (upd.unpaidAmount !== undefined) reports[i].unpaidAmount = upd.unpaidAmount;

          if (isNoViolation(upd.violation)) {
            delete reports[i].reaction;
            delete reports[i].reactionAt;
            delete reports[i].reactionBy;
            delete reports[i].reactionEditedAt;
            delete reports[i].reactionEditedBy;
            delete reports[i].fine;
            reports[i].fineWaived = true;
          } else if (Object.prototype.hasOwnProperty.call(reports[i], 'fineWaived')) {
            delete reports[i].fineWaived;
          }

          // audit trail: append editor info
          const baseNotes = (upd.notes || '').replace(/ \(отредактировано[^)]*\)/g, '').trim();
          const violationEditNote = buildViolationEditNote(previousViolation, reports[i].violation);
          const noteParts = [violationEditNote, baseNotes].filter(Boolean);
          reports[i].notes = noteParts.length
            ? `отредактировано в ${time}, ${upd.editorName}: ${noteParts.join('. ')}`
            : `отредактировано в ${time}, ${upd.editorName}`;
          reports[i].editedBy = upd.editorName;
          reports[i].editedAt = new Date().toISOString();
          updated = true;
          break;
        }
      }

      if (blocked) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: blocked }));
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


// PATCH /api/ovn/reaction — добавить или обновить реакцию на нарушение
// Правила:
//   • В день создания нарушения — редактировать реакцию можно неограниченно
//   • После дня создания — можно отредактировать ровно один раз, с меткой «(отредактировано)»
function handlePatchReaction(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const { id, reaction, editorName, role } = JSON.parse(body);
      if (!id || reaction === undefined) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing id or reaction' }));
        return;
      }

      function toMoscowDate(isoStr) {
        const ms = new Date(isoStr).getTime() + 3 * 60 * 60 * 1000;
        return new Date(ms).toISOString().slice(0, 10);
      }
      const todayMoscow = toMoscowDate(new Date().toISOString());

      let reports = readReports();
      let updated = false;
      let blocked = null;

      for (let i = 0; i < reports.length; i++) {
        if (String(reports[i].id) === String(id)) {
          const recDay   = toMoscowDate(reports[i].createdAt || new Date().toISOString());
          const isSameDay = recDay === todayMoscow;

          // Если реакция уже отредактирована (editedReaction) — блокируем для всех
          if (!isSameDay && reports[i].reactionEditedAt) {
            blocked = 'Реакция уже была отредактирована один раз после дня создания';
            break;
          }

          const now = new Date();
          const timeStr = now.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
          const dateStr = toMoscowDate(now.toISOString()).split('-').reverse().join('.');

          const isFirstReaction = !reports[i].reaction;
          const isEdit          = !!reports[i].reaction;

          reports[i].reaction = reaction;

          if (isFirstReaction) {
            reports[i].reactionAt     = now.toISOString();
            reports[i].reactionBy     = editorName || 'Менеджер';
          } else if (!isSameDay && isEdit) {
            // Редактирование после дня создания — единожды, добавляем метку
            reports[i].reactionEditedAt = now.toISOString();
            reports[i].reactionEditedBy = editorName || 'Менеджер';
            reports[i].reaction = reaction + ` (отредактировано ${timeStr} ${dateStr})`;
          }
          // В тот же день — просто перезаписываем без ограничений

          updated = true;
          break;
        }
      }

      if (blocked) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: blocked }));
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
      console.error('[OVN] PATCH reaction error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  });
}

module.exports = { handleGet, handlePost, handlePut, handlePatchReaction };
