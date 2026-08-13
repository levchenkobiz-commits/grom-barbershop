/**
 * WARNING: MASTER SCHEDULE — DO NOT TOUCH as a side effect of another task.
 * schedule.json affects attendance, replacements, overtime and salary evidence.
 * Changes require an explicit user request about the master schedule and a backup.
 * See /root/grom-dashboard/SCHEDULE_LOCK.md and AGENTS.md.
 *
 * routes/schedule.js
 * Маршруты: GET /api/schedule, POST /api/schedule
 *           GET /api/me, POST /api/me/schedule
 */

const fs    = require('fs');
const path  = require('path');
const PATHS = require('./paths');
const { canonicalMasterName, getMasterAliases, matchesMaster, resolveAuthorizedMasterPreview } = require('./master_scope');
const { scheduleKey, shiftCount, applySchedulePatch, destructiveDelta, findShiftOverlaps, conflictsForPatch, overlapError } = require('./schedule_integrity');

const BACKUP_DIR = path.join(path.dirname(PATHS.schedule), 'backups', 'schedule-autosave');
const AUDIT_PATH = path.join(path.dirname(PATHS.schedule), 'schedule_audit.jsonl');
const BULK_CONFIRM_HEADER = 'I_EXPLICITLY_CONFIRM_MASTER_SCHEDULE_BULK_REMOVAL';

function backupSchedule(current) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `schedule-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(current, null, 2), 'utf8');
  const backups = fs.readdirSync(BACKUP_DIR).filter(name => /^schedule-.*\.json$/.test(name)).sort().reverse();
  backups.slice(200).forEach(name => fs.unlinkSync(path.join(BACKUP_DIR, name)));
  return backupPath;
}

function writeScheduleAtomic(data) {
  const temp = `${PATHS.schedule}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, PATHS.schedule);
}

function appendScheduleAudit(req, details) {
  fs.appendFileSync(AUDIT_PATH, JSON.stringify({
    at: new Date().toISOString(),
    user: req.authUser?.name || '',
    role: req.authUser?.role || '',
    ...details,
  }) + '\n', 'utf8');
}

function canonicalizeSchedule(entries, rejectUnknown = false) {
  const unknown = [];
  const result = (Array.isArray(entries) ? entries : []).map(day => {
    const masters = (Array.isArray(day.masters) ? day.masters : []).map(master => {
      const canonical = canonicalMasterName(master && master.name, day.location) || canonicalMasterName(master && master.name);
      if (!canonical) {
        if (master && master.name) unknown.push(String(master.name));
        return null;
      }
      return { ...master, name: canonical };
    }).filter(Boolean);
    return { ...day, masters };
  });
  if (rejectUnknown && unknown.length) {
    const error = new Error(`Мастера отсутствуют в адаптере: ${Array.from(new Set(unknown)).join(', ')}`);
    error.code = 'UNKNOWN_MASTER';
    throw error;
  }
  return result;
}

function filterScheduleForMaster(entries, masterName) {
  const aliases = getMasterAliases(masterName);
  if (aliases.size === 0) return [];
  return (Array.isArray(entries) ? entries : []).map(day => {
    const masters = (day.masters || []).filter(master => matchesMaster(master && master.name, aliases));
    return masters.length ? { ...day, masters } : null;
  }).filter(Boolean);
}

// GET /api/schedule — менеджеры получают общий график; мастер — только свои смены.
function handleGetSchedule(req, res) {
  if (!fs.existsSync(PATHS.schedule)) fs.writeFileSync(PATHS.schedule, '[]');
  const stored = JSON.parse(fs.readFileSync(PATHS.schedule, 'utf-8'));
  const data = canonicalizeSchedule(stored);
  const preview = resolveAuthorizedMasterPreview(req);
  if (preview.requested && !preview.master) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: preview.error }));
  }
  const personalMaster = preview.master || (req.authUser && req.authUser.role === 'master' ? req.authUser.name : null);
  const scoped = personalMaster ? filterScheduleForMaster(data, personalMaster) : data;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(scoped));
}

// POST /api/schedule — сохранить/обновить смены
function handlePostSchedule(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString('utf-8'); });
  req.on('end', () => {
    try {
      const entry = JSON.parse(body);
      let data = [];
      if (fs.existsSync(PATHS.schedule)) {
        try { data = JSON.parse(fs.readFileSync(PATHS.schedule, 'utf-8')); } catch (e) {}
      }

      const entries = canonicalizeSchedule(Array.isArray(entry) ? entry : [entry], true).filter(e => {
        const loc = e.location || '';
        const isMojibake = loc.length > 0 && !/^[\u0400-\u04FF\u0020\-\.0-9A-Za-z]+$/.test(loc);
        if (isMojibake) console.warn('[Schedule] Rejected mojibake location:', JSON.stringify(loc));
        return !isMojibake;
      });
      if (!entries.length) throw new Error('EMPTY_PATCH');
      const before = data;
      data = applySchedulePatch(data, entries);
      // Existing historical rows cannot make an unrelated edit impossible;
      // only conflicts introduced or touched by this patch are rejected.
      const conflicts = conflictsForPatch(findShiftOverlaps(data), entries);
      if (conflicts.length) throw overlapError(conflicts);
      const delta = destructiveDelta(before, data, entries);
      const bulkDestructive = delta.removed > 5 && delta.removed / Math.max(1, delta.before) >= 0.35;
      const confirmed = req.headers['x-schedule-bulk-confirm'] === BULK_CONFIRM_HEADER;
      if (bulkDestructive && !confirmed) {
        appendScheduleAudit(req, { action: 'blocked_bulk_removal', ...delta });
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          error: 'Массовое удаление графика заблокировано защитой',
          details: delta,
        }));
      }
      if (JSON.stringify(before) === JSON.stringify(data)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'unchanged' }));
      }
      const backupPath = backupSchedule(before);
      writeScheduleAtomic(data);
      appendScheduleAudit(req, { action: 'saved', backupPath, ...delta, totalShifts: shiftCount(data) });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', backupCreated: true }));
    } catch (e) {
      const clientError = ['UNKNOWN_MASTER', 'SHIFT_OVERLAP'].includes(e.code);
      res.writeHead(clientError ? 422 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: clientError ? e.message : (e.message === 'EMPTY_PATCH' ? 'Нет изменений для сохранения' : 'Invalid JSON') }));
    }
  });
}

// GET /api/me?tg_id=XXX — получить профиль менеджера
function handleGetMe(req, res, parsedUrl) {
  const tg_id = parsedUrl.searchParams.get('tg_id');
  if (fs.existsSync(PATHS.roles)) {
    const roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));
    if (roles[tg_id]) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(roles[tg_id]));
    }
  }
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not authorized' }));
}

// POST /api/me/schedule?tg_id=XXX — сохранить рабочие дни менеджера
function handlePostMySchedule(req, res, parsedUrl) {
  const tg_id = parsedUrl.searchParams.get('tg_id');
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    if (fs.existsSync(PATHS.roles)) {
      let roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));
      if (roles[tg_id]) {
        try {
          const parsed = JSON.parse(body);
          roles[tg_id].schedule = parsed.schedule || [];
          fs.writeFileSync(PATHS.roles, JSON.stringify(roles, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: 'success' }));
        } catch (e) {}
      }
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not authorized' }));
  });
}

module.exports = {
  canonicalizeSchedule, handleGetSchedule, handlePostSchedule, handleGetMe, handlePostMySchedule,
  applySchedulePatch, destructiveDelta, shiftCount, scheduleKey, findShiftOverlaps, filterScheduleForMaster,
};
