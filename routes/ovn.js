/**
 * routes/ovn.js
 * FINANCIAL INPUT — DO NOT TOUCH fine normalization or master scoping without explicit user authorization.
 * Mandatory instructions: /root/grom-dashboard/AGENTS.md
 * Маршруты: GET /api/ovn, POST /api/ovn, PUT /api/ovn
 */

const fs    = require('fs');
const PATHS = require('./paths');
const { canonicalMasterName, getMasterAliases, matchesMaster, resolveAuthorizedMasterPreview } = require('./master_scope');
const VIOLATION_RULES = require('../public/js/violation-rules');
const OVN_TOP3 = require('../public/js/ovn-top3');

function normalizeReportViolations(report) {
  if (report && report.violation !== undefined) {
    report.violation = VIOLATION_RULES.canonicalizeViolationList(report.violation);
  }
  return report;
}

function requireDynamicViolationAmounts(report) {
  const violations = VIOLATION_RULES.splitViolations(report && report.violation);
  if (violations.includes('Пробиты не все услуги') && !(Number(report && report.unpaidAmount) > 0)) {
    throw new Error('Укажите сумму непробитых услуг');
  }
}

function canonicalReportMaster(report) {
  if (!report) return null;
  return canonicalMasterName(report.barber, report.location) || canonicalMasterName(report.barber);
}

function readReports() {
  if (!fs.existsSync(PATHS.ovn)) fs.writeFileSync(PATHS.ovn, '[]');
  return JSON.parse(fs.readFileSync(PATHS.ovn, 'utf-8'));
}

function buildAnalyticsTop3(monthKey) {
  const reports = readReports()
    .map(report => {
      const canonical = canonicalReportMaster(report);
      return canonical ? normalizeReportViolations({ ...report, barber: canonical }) : null;
    })
    .filter(Boolean);
  return OVN_TOP3.build(reports, monthKey, null, VIOLATION_RULES);
}

function handleGetAnalytics(req, res, parsedUrl) {
  const requestedMonth = String(parsedUrl?.searchParams?.get('month') || '').trim();
  const month = /^\d{4}-\d{2}$/.test(requestedMonth)
    ? requestedMonth
    : new Date().toISOString().slice(0, 7);
  try {
    const result = buildAnalyticsTop3(month);
    const sourceUpdatedAt = fs.existsSync(PATHS.ovn) ? fs.statSync(PATHS.ovn).mtime.toISOString() : null;
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(JSON.stringify({
      ...result,
      month,
      source: 'ovn_reports',
      sourceUpdatedAt,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[OVN analytics] source read failed:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'Не удалось прочитать актуальные проверки ОВН' }));
  }
}

function writeReports(reports) {
  fs.writeFileSync(PATHS.ovn, JSON.stringify(reports, null, 2));
}

function readHandbook() {
  try { return VIOLATION_RULES.canonicalizeHandbook(JSON.parse(fs.readFileSync(PATHS.handbook, 'utf-8'))); }
  catch (_) { return {}; }
}

function calculateMandatoryFine(report) {
  const text = VIOLATION_RULES.canonicalizeViolationList(report && report.violation).toLowerCase();
  const notes = String(report && report.notes || '').toLowerCase();
  if (!report || report.isForceMajeure || report.fineWaived || text.includes('замечаний нет') || text.includes('нет нарушений')) return null;
  if (report.isManualFine) return Math.max(0, Number(report.cost) || 0);
  const handbook = readHandbook();
  if (text.includes('опоздал')) {
    const match = notes.match(/на\s+(\d+)\s+мин/);
    const minutes = match ? Number(match[1]) : 0;
    let range = '';
    if (minutes >= 61) range = '61+ мин (Невыход)';
    else if (minutes >= 31) range = '31-60 мин';
    else if (minutes >= 21) range = '21-30 мин';
    else if (minutes >= 11) range = '11-20 мин';
    else if (minutes >= 4) range = '4-10 мин';
    else if (minutes >= 1) range = '1-3 мин';
    if (!range) return 0;
    const key = String(report.slot || '') === '2' ? `Опоздание второй мастер ${range}` : `Опоздание ${range}`;
    return Math.max(0, Number(handbook[key]) || 0);
  }
  if (text.includes('не вышел') || text.includes('не выход') || text.includes('невыход')) return Math.max(0, Number(handbook['Невыход']) || 0);
  if (text.includes('пробиты не все услуги')) {
    const amountMatch = `${notes} ${text}`.match(/сумма непробитых услуг:\s*(\d+)/i);
    return Math.max(0, Number(report.unpaidAmount) || (amountMatch ? Number(amountMatch[1]) : 0));
  }
  if (text.includes('воровство') || text.includes('неоплаченная') || text.includes('терминал')) return Math.max(0, Number(handbook['Услуга не проведена через терминал']) || 0);
  if (text.includes('отказ клиенту')) return Math.max(0, Number(handbook['Отказ клиенту']) || 0);
  return null;
}

function synchronizeStoredFine(report) {
  const fine = calculateMandatoryFine(report);
  if (fine === null) delete report.fine;
  else report.fine = fine;
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
  const violations = VIOLATION_RULES.splitViolations(value);
  return violations.length > 0 && violations.every(VIOLATION_RULES.isNoViolation);
}

function splitViolations(value) {
  return VIOLATION_RULES.splitViolations(value);
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
  let reports = readReports()
    .map(report => {
      const canonical = canonicalReportMaster(report);
      return canonical ? normalizeReportViolations({ ...report, barber: canonical }) : null;
    })
    .filter(Boolean);
  const preview = resolveAuthorizedMasterPreview(req);
  if (preview.requested && !preview.master) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: preview.error }));
  }
  const personalMaster = preview.master || (req.authUser && req.authUser.role === 'master' ? req.authUser.name : null);
  if (personalMaster) {
    const aliases = getMasterAliases(personalMaster);
    reports = reports.filter(report => matchesMaster(report.barber, aliases));
  }
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
      if (report.isManualFine) {
        res.writeHead(410, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Ручные штрафы отключены' }));
      }
      normalizeReportViolations(report);
      requireDynamicViolationAmounts(report);
      const canonical = canonicalReportMaster(report);
      if (!canonical) {
        res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Мастер отсутствует в адаптере' }));
      }
      report.barber = canonical;
      report.id = Date.now();
      report.createdAt = new Date().toISOString();
      synchronizeStoredFine(report);

      let reports = readReports();

      // Предотвратить дубли по дню/мастеру/локации для посещаемости
      if (report.schedTime) {
        reports = reports.filter(r =>
          !(r.date === report.date &&
            canonicalReportMaster(r) === report.barber &&
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
      res.end(JSON.stringify({ error: e.message || 'Invalid JSON' }));
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
      if (upd.isManualFine) {
        res.writeHead(410, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Ручные штрафы отключены' }));
      }
      normalizeReportViolations(upd);
      requireDynamicViolationAmounts(upd);
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
          if (upd.barber) {
            const canonical = canonicalMasterName(upd.barber, upd.location || reports[i].location) || canonicalMasterName(upd.barber);
            if (!canonical) {
              blocked = 'Мастер отсутствует в адаптере';
              break;
            }
            reports[i].barber = canonical;
          }
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
          synchronizeStoredFine(reports[i]);

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
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message || 'Server error' }));
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

module.exports = {
  handleGet,
  handleGetAnalytics,
  handlePost,
  handlePut,
  handlePatchReaction,
  calculateMandatoryFine,
  normalizeReportViolations,
  requireDynamicViolationAmounts,
  buildAnalyticsTop3,
};
