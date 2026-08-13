const CYCLE_WINDOW_DAYS = 120;
const MIN_VISITS_PER_CLIENT = 3;

function getCompletedRollingPeriod(now) {
  const end = now.startOf('day').subtract(1, 'day');
  const start = end.subtract(CYCLE_WINDOW_DAYS - 1, 'day');
  return { start, end, label: `${start.format('DD.MM')}-${end.format('DD.MM')}` };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function singleValue(values, hasUnknown) {
  return !hasUnknown && values.size === 1 ? [...values][0] : null;
}

// events are already limited to the rolling period and contain one completed
// order each. Same-day services are one visit; ambiguous staff attribution is
// deliberately excluded from drilldowns but never from the network metric.
function calculateVisitCycle(events, { minVisits = MIN_VISITS_PER_CLIENT } = {}) {
  const customers = new Map();
  for (const event of events || []) {
    if (!event?.phone || !event?.date?.isValid?.()) continue;
    const day = event.date.format('YYYY-MM-DD');
    if (!customers.has(event.phone)) customers.set(event.phone, new Map());
    const days = customers.get(event.phone);
    if (!days.has(day)) days.set(day, { date: event.date, masters: new Set(), branches: new Set(), unknownMaster: false, unknownBranch: false });
    const visit = days.get(day);
    if (event.master) visit.masters.add(event.master); else visit.unknownMaster = true;
    if (event.branch) visit.branches.add(event.branch); else visit.unknownBranch = true;
  }

  const intervals = [];
  const byMaster = new Map();
  const byBranch = new Map();
  let eligibleCustomers = 0;
  for (const days of customers.values()) {
    const visits = [...days.values()].sort((a, b) => a.date.valueOf() - b.date.valueOf());
    if (visits.length < minVisits) continue;
    eligibleCustomers++;
    for (let i = 1; i < visits.length; i++) {
      const gap = visits[i].date.diff(visits[i - 1].date, 'day');
      if (gap <= 0) continue;
      intervals.push(gap);
      const master = singleValue(visits[i].masters, visits[i].unknownMaster);
      const branch = singleValue(visits[i].branches, visits[i].unknownBranch);
      if (master) {
        if (!byMaster.has(master)) byMaster.set(master, []);
        byMaster.get(master).push(gap);
      }
      if (branch) {
        if (!byBranch.has(branch)) byBranch.set(branch, []);
        byBranch.get(branch).push(gap);
      }
    }
  }
  return { value: Number(median(intervals).toFixed(1)), sampleSize: intervals.length, eligibleCustomers, byMaster, byBranch };
}

module.exports = { CYCLE_WINDOW_DAYS, MIN_VISITS_PER_CLIENT, getCompletedRollingPeriod, calculateVisitCycle, median };
