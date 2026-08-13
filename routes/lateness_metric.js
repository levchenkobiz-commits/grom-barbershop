'use strict';

function parseMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function reportDate(report) {
  return String(report.date || report.createdAt || '').slice(0, 10);
}

function calculateLatenessMetric(reports, fromDate, toDate, options = {}) {
  const branchMap = new Map();
  const masterMap = new Map();
  const registry = Array.isArray(options.masterRegistry) ? options.masterRegistry : null;
  const knownMasters = registry ? new Set(registry.map(master => master.name)) : null;
  if (registry) registry.forEach(master => masterMap.set(master.name, { total: 0, late: 0 }));
  let total = 0;
  let late = 0;

  for (const report of reports || []) {
    if (!report || report.isManualFine) continue;
    const date = reportDate(report);
    if (!date || date < fromDate || date > toDate) continue;
    const actual = parseMinutes(report.time);
    const scheduled = parseMinutes(report.schedTime);
    if (actual === null || scheduled === null) continue;

    const forceMajeureText = String(report.forceMajeureType || '').trim();
    const isForceMajeure = report.isForceMajeure === true || Boolean(forceMajeureText);
    // A documented force majeure is not an arrival result at all: it must not
    // improve punctuality by inflating the denominator.
    if (isForceMajeure) continue;
    const isLate = actual - scheduled >= 1;
    total++;
    if (isLate) late++;

    const branch = String(report.location || 'Не указан');
    const rawMaster = String(report.barber || '');
    const master = typeof options.canonicalizeMaster === 'function'
      ? options.canonicalizeMaster(rawMaster, report.location)
      : rawMaster;
    if (!branchMap.has(branch)) branchMap.set(branch, { total: 0, late: 0 });
    if (master && (!knownMasters || knownMasters.has(master)) && !masterMap.has(master)) {
      masterMap.set(master, { total: 0, late: 0 });
    }
    branchMap.get(branch).total++;
    if (master && (!knownMasters || knownMasters.has(master))) masterMap.get(master).total++;
    if (isLate) {
      branchMap.get(branch).late++;
      if (master && (!knownMasters || knownMasters.has(master))) masterMap.get(master).late++;
    }
  }

  const rate = (item) => item.total ? Number((item.late / item.total * 100).toFixed(1)) : null;
  const formatRows = map => [...map.entries()].map(([name, counts]) => {
    const value = rate(counts);
    return {
      name,
      value,
      late: counts.late,
      total: counts.total,
      noData: value === null,
      v: value === null ? 'нет данных' : `${value.toFixed(1)}% (${counts.late}/${counts.total})`,
    };
  }).sort((a, b) => {
    if (a.value === null && b.value !== null) return 1;
    if (a.value !== null && b.value === null) return -1;
    return (b.value || 0) - (a.value || 0) || b.total - a.total || a.name.localeCompare(b.name, 'ru');
  });

  const value = total ? Number((late / total * 100).toFixed(1)) : null;
  return {
    value,
    percentage: value,
    late,
    total,
    noData: total === 0,
    formula: 'late_arrival_checks / all_arrival_checks * 100',
    thresholdMinutes: 1,
    forceMajeureExcluded: true,
    drilldown: [
      { name: 'По салонам', value: total ? `${value}%` : 'нет данных', trend: 'down', masters: formatRows(branchMap) },
      { name: 'По мастерам', value: total ? `${value}%` : 'нет данных', trend: 'down', masters: formatRows(masterMap) },
    ],
  };
}

// Presentation derivative of the single lateness calculation.  It intentionally
// receives a finished lateness metric rather than raw OVN reports, so the
// inverse shown in the master cabinet cannot drift from analytics.
function derivePunctualityMetric(latenessMetric) {
  const invert = item => {
    const total = Number(item && item.total);
    const late = Number(item && item.late);
    const sourceValue = Number(item && item.value);
    const hasData = item && item.noData !== true && Number.isFinite(total) && total > 0
      && Number.isFinite(late) && late >= 0 && late <= total
      && Number.isFinite(sourceValue) && sourceValue >= 0 && sourceValue <= 100;
    const value = hasData ? Number((100 - sourceValue).toFixed(1)) : null;
    const onTime = hasData ? total - late : 0;
    return {
      ...item,
      value,
      percentage: value,
      sourceValue: hasData ? sourceValue : null,
      onTime,
      noData: !hasData,
      v: hasData ? `${value.toFixed(1)}% (${onTime}/${total})` : 'нет данных',
    };
  };

  const source = latenessMetric && typeof latenessMetric === 'object' ? latenessMetric : {};
  return {
    ...source,
    ...invert(source),
    formula: '100 - late_arrival_checks / all_arrival_checks * 100',
    sourceMetric: 'latenessRate',
    target: 85,
    drilldown: (source.drilldown || []).map(group => ({
      ...group,
      masters: (group.masters || []).map(invert),
    })),
  };
}

module.exports = { calculateLatenessMetric, derivePunctualityMetric, parseMinutes };
