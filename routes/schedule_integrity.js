/** Pure schedule patch helpers. Protected by SCHEDULE_LOCK.md and AGENTS.md. */
function scheduleKey(entry) {
  return `${String(entry?.date || '')}|${String(entry?.location || '')}`;
}

function shiftCount(entries) {
  return (Array.isArray(entries) ? entries : []).reduce((sum, entry) =>
    sum + (Array.isArray(entry?.masters) ? entry.masters.length : 0), 0);
}

function applySchedulePatch(current, entries) {
  const byKey = new Map((Array.isArray(current) ? current : []).map(entry => [scheduleKey(entry), entry]));
  for (const entry of entries) {
    const key = scheduleKey(entry);
    if (!entry.date || !entry.location) continue;
    if (Array.isArray(entry.masters) && entry.masters.length) byKey.set(key, entry);
    else byKey.delete(key);
  }
  return [...byKey.values()];
}

function destructiveDelta(current, next, entries) {
  const affected = new Set(entries.map(scheduleKey));
  const before = shiftCount(current.filter(entry => affected.has(scheduleKey(entry))));
  const after = shiftCount(next.filter(entry => affected.has(scheduleKey(entry))));
  return { before, after, removed: Math.max(0, before - after), affectedKeys: affected.size };
}

function normalizeMaster(value) {
  return String(value || '')
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase();
}

function parseShiftRange(shift) {
  const text = String(shift?.text || shift?.time || '').replace(/[–—]/g, '-');
  const pair = text.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|-)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!pair) {
    const start = String(shift?.startTime || '').match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!start) return null;
    const startMinutes = Number(start[1]) * 60 + Number(start[2] || 0);
    return { start: startMinutes, end: 22 * 60 };
  }
  const start = Number(pair[1]) * 60 + Number(pair[2] || 0);
  const end = Number(pair[3]) * 60 + Number(pair[4] || 0);
  return end > start ? { start, end } : null;
}

function isOffShift(shift) {
  return /^\s*(выходной|вых|ыходной)\s*$/i.test(String(shift?.text || ''));
}

function isPlaceholderMaster(value) {
  return /^\s*(подмена|новый|мастер)(?:\s|\(|$)/i.test(String(value || ''));
}

function formatMinutes(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// The same master cannot physically be in overlapping shifts, including shifts
// created in different salon cells. Boundary-touching shifts (10:00–14:00 and
// 14:00–22:00) are valid because they do not overlap.
function findShiftOverlaps(entries) {
  const byMasterAndDate = new Map();
  for (const day of Array.isArray(entries) ? entries : []) {
    for (const shift of Array.isArray(day?.masters) ? day.masters : []) {
      if (!shift || isOffShift(shift)) continue;
      const master = normalizeMaster(shift.name);
      const range = parseShiftRange(shift);
      if (!master || !range || isPlaceholderMaster(shift.name)) continue;
      const item = { date: String(day.date || ''), location: String(day.location || ''), name: String(shift.name || ''), ...range };
      const key = `${item.date}|${master}`;
      if (!byMasterAndDate.has(key)) byMasterAndDate.set(key, []);
      byMasterAndDate.get(key).push(item);
    }
  }
  const overlaps = [];
  for (const shifts of byMasterAndDate.values()) {
    shifts.sort((left, right) => left.start - right.start || left.end - right.end || left.location.localeCompare(right.location));
    for (let index = 1; index < shifts.length; index++) {
      const previous = shifts[index - 1];
      const current = shifts[index];
      if (current.start < previous.end) overlaps.push({ previous, current });
    }
  }
  return overlaps;
}

function overlapError(overlaps) {
  const first = overlaps[0];
  if (!first) return null;
  const error = new Error(`Конфликт смен: ${first.current.name} ${first.current.date} одновременно в «${first.previous.location}» (${formatMinutes(first.previous.start)}–${formatMinutes(first.previous.end)}) и «${first.current.location}» (${formatMinutes(first.current.start)}–${formatMinutes(first.current.end)}).`);
  error.code = 'SHIFT_OVERLAP';
  error.overlaps = overlaps;
  return error;
}

function conflictsForPatch(overlaps, entries) {
  const affected = new Set((Array.isArray(entries) ? entries : []).map(scheduleKey));
  return (Array.isArray(overlaps) ? overlaps : []).filter(conflict =>
    affected.has(scheduleKey(conflict.previous)) || affected.has(scheduleKey(conflict.current))
  );
}

module.exports = { scheduleKey, shiftCount, applySchedulePatch, destructiveDelta, parseShiftRange, findShiftOverlaps, conflictsForPatch, overlapError };
