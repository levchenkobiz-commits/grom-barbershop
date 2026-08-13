(function(root, factory) {
  // CURRENT OVN ANALYTICS CONTRACT: source records are live OVN reports; each
  // violation in a combined check is an independent occurrence. Never feed
  // this calculator historical snapshots as a current-month fallback.
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GromeOvnTop3 = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function reportDate(report) {
    return String(report?.createdAt || report?.date || '').slice(0, 7);
  }

  function fallbackSplit(value) {
    return (Array.isArray(value) ? value : String(value || '').split(','))
      .map(item => String(item || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  function isNoViolation(value, rules) {
    if (rules && typeof rules.isNoViolation === 'function') return rules.isNoViolation(value);
    const normalized = String(value || '').replace(/^✅\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return normalized === 'замечаний нет' || normalized === 'нет нарушений';
  }

  function violationParts(report, rules) {
    const split = rules && typeof rules.splitViolations === 'function'
      ? rules.splitViolations(report?.violation)
      : fallbackSplit(report?.violation);
    return split.filter(item => !isNoViolation(item, rules));
  }

  function excluded(report) {
    const text = [report?.violation, report?.notes, report?.forceMajeureType]
      .map(value => String(value || '').toLowerCase()).join(' ');
    return Boolean(
      report?.schedTime || report?.isForceMajeure || report?.fineWaived || report?.forceMajeureType ||
      text.includes('мастер опоздал') || text.includes('опоздан') || text.includes('не вышел') ||
      text.includes('невыход') || text.includes('форс')
    );
  }

  function clean(report, rules) {
    return violationParts(report, rules).length === 0;
  }

  function topCounts(records, field, canonicalize) {
    const counts = new Map();
    records.forEach(report => {
      const raw = String(report?.[field] || '').trim();
      const name = field === 'barber' && typeof canonicalize === 'function' ? (canonicalize(raw) || raw) : raw;
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }

  function build(reports, monthKey, canonicalize, rules) {
    const sourceReports = (Array.isArray(reports) ? reports : [])
      .filter(report => reportDate(report) === monthKey && !excluded(report) && !clean(report, rules));
    const violations = [];
    sourceReports.forEach(report => {
      const rawBarber = String(report?.barber || '').trim();
      const barber = typeof canonicalize === 'function' ? (canonicalize(rawBarber) || rawBarber) : rawBarber;
      violationParts(report, rules).forEach(violation => {
        if (barber && violation) violations.push({ barber, violation });
      });
    });
    return {
      violators: topCounts(violations, 'barber'),
      violations: topCounts(violations, 'violation'),
      totalReports: sourceReports.length,
      totalViolations: violations.length,
    };
  }

  return { build, excluded, clean, violationParts, topCounts };
});
