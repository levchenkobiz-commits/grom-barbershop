const fs = require('fs');
const PATHS = require('./paths');
const { normalizeName, canonicalMasterName, adapterMasterNames, getMasterAliases, matchesMaster, resolveAuthorizedMasterPreview } = require('./master_scope');
const { calculateLatenessMetric, derivePunctualityMetric } = require('./lateness_metric');

function filterPersonalMetric(metric, aliases, masterGroupIndex = 0) {
  if (!metric || typeof metric !== 'object') return metric;
  const copy = JSON.parse(JSON.stringify(metric));
  const sourceGroup = Array.isArray(copy.drilldown) ? copy.drilldown[masterGroupIndex] : null;
  copy.drilldown = sourceGroup ? [{
    ...sourceGroup,
    masters: (sourceGroup.masters || []).filter(master => matchesMaster(master.name, aliases)),
  }] : [];
  const personalRow = copy.drilldown?.[0]?.masters?.[0];
  copy.personalValue = personalRow ? personalRow.v : null;
  copy.personal = personalRow ? {
    value: personalRow.value,
    sourceValue: personalRow.sourceValue,
    late: personalRow.late,
    onTime: personalRow.onTime,
    total: personalRow.total,
    noData: personalRow.noData === true,
  } : { value: null, sourceValue: null, late: 0, onTime: 0, total: 0, noData: true };
  delete copy.value;
  delete copy.percentage;
  return copy;
}

function enforceAdapterRoster(metric) {
  if (!metric || typeof metric !== 'object' || !Array.isArray(metric.drilldown)) return metric;
  const copy = JSON.parse(JSON.stringify(metric));
  const masterGroup = copy.drilldown[0];
  if (!masterGroup || !Array.isArray(masterGroup.masters)) return copy;
  const canonicalRows = new Map();
  for (const row of masterGroup.masters) {
    const canonical = canonicalMasterName(row && row.name);
    if (!canonical) continue;
    const candidate = { ...row, name: canonical };
    const current = canonicalRows.get(canonical);
    const candidateIsExact = normalizeName(row.name) === normalizeName(canonical);
    const currentIsExact = current && normalizeName(current._sourceName) === normalizeName(canonical);
    if (!current || (candidateIsExact && !currentIsExact)) {
      canonicalRows.set(canonical, { ...candidate, _sourceName: row.name });
    }
  }
  masterGroup.masters = Array.from(canonicalRows.values()).map(({ _sourceName, ...row }) => row);
  return copy;
}

function handleGet(req, res) {
  if (!fs.existsSync(PATHS.data)) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Данные ещё не сформированы' }));
  }

  const data = JSON.parse(fs.readFileSync(PATHS.data, 'utf8'));
  for (const key of ['revenue', 'returnRate', 'cycle', 'appointments', 'occupancy']) {
    if (data[key]) data[key] = enforceAdapterRoster(data[key]);
  }
  const nowParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const monthStart = `${nowParts.slice(0, 7)}-01`;
  let ovnReports = [];
  try { ovnReports = JSON.parse(fs.readFileSync(PATHS.ovn, 'utf8')); } catch (_) {}
  const latenessMetric = {
    ...calculateLatenessMetric(ovnReports, monthStart, nowParts, {
      masterRegistry: Array.from(adapterMasterNames(), name => ({ name })),
      canonicalizeMaster: (name, location) => canonicalMasterName(name, location) || canonicalMasterName(name),
    }),
    period: `${monthStart.slice(8, 10)}.${monthStart.slice(5, 7)}–${nowParts.slice(8, 10)}.${nowParts.slice(5, 7)}`,
    source: 'ovn_reports.json: time vs schedTime',
    sourceUpdatedAt: fs.existsSync(PATHS.ovn) ? fs.statSync(PATHS.ovn).mtime.toISOString() : null,
  };
  data.latenessRate = latenessMetric;
  const punctualityMetric = derivePunctualityMetric(latenessMetric);
  const user = req.authUser;
  const preview = resolveAuthorizedMasterPreview(req);
  if (preview.requested && !preview.master) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: preview.error }));
  }

  const personalMaster = preview.master || (user && user.role === 'master' ? user.name : null);
  if (!personalMaster) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(data));
  }

  const aliases = getMasterAliases(personalMaster);
  const personal = {
    lastUpdate: data.lastUpdate,
    errors: data.errors || {},
    occupancy: filterPersonalMetric(data.occupancy, aliases),
    returnRate: filterPersonalMetric(data.returnRate, aliases),
    appointments: filterPersonalMetric(data.appointments, aliases),
    punctualityRate: filterPersonalMetric(punctualityMetric, aliases, 1),
  };
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
  });
  res.end(JSON.stringify(personal));
}

module.exports = { handleGet, enforceAdapterRoster };
