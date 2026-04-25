/**
 * routes/master_fines.js
 * GET /api/master_fines?name=ИМЯ
 * Возвращает штрафы конкретного мастера из OVN-отчётов
 */

const fs   = require('fs');
const PATHS = require('./paths');

function getViolationFine(violation, notes, hb) {
  hb = hb || {};
  const v = (violation || '').toLowerCase();
  const n = (notes    || '').toLowerCase();
  if (v.includes('невыход') || n.includes('невыход'))         return hb.absenceFine   || 3000;
  if (v.includes('воровство') || v.includes('неоплата'))      return hb.theftFine     || 15000;
  if (v.includes('опоздал') || n.includes('опоздани'))        return hb.lateFine      || 500;
  if (v === 'замечаний нет' || v.includes('нет нарушений'))   return 0;
  if (v.includes('нарушение') || v.includes('нарушений'))     return hb.violationFine || 500;
  return 0;
}

function handleGet(req, res, parsedUrl) {
  try {
    const masterName = parsedUrl.searchParams.get('name') || '';
    if (!masterName) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'name param required' }));
    }

    let handbook = {};
    try { handbook = JSON.parse(fs.readFileSync(PATHS.handbook, 'utf-8')); } catch(e) {}

    let ovnReports = [];
    try { ovnReports = JSON.parse(fs.readFileSync(PATHS.ovn, 'utf-8')); } catch(e) {}

    const normalize = (s) => (s || '').trim().toLowerCase();
    const targetNorm  = normalize(masterName);
    const targetFirst = targetNorm.split(' ')[0];

    const masterFines = [];
    ovnReports.forEach(r => {
      const rMaster = normalize(r.barber || r.master || r.masterName || '');
      const rFirst  = rMaster.split(' ')[0];
      // Match by full name OR by first word (имя без фамилии)
      const isMatch = rMaster === targetNorm || rFirst === targetFirst;
      if (!isMatch) return;

      const fine = getViolationFine(r.violation, r.notes, handbook);
      if (fine > 0) {
        masterFines.push({
          date:      r.date || (r.createdAt ? r.createdAt.substring(0, 10) : ''),
          time:      r.time || '',
          master:    r.barber || r.master || r.masterName || '',
          location:  r.location || '',
          violation: r.violation || '',
          notes:     (r.notes || '').replace(/\(отредактировано[^)]*\)/g, '').trim(),
          fine:      fine
        });
      }
    });

    masterFines.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(masterFines));
  } catch(e) {
    console.error('[MasterFines]', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

module.exports = { handleGet };
