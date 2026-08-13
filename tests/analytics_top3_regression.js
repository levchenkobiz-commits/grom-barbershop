const assert = require('assert');
const fs = require('fs');
const top3 = require('../public/js/ovn-top3');
const rules = require('../public/js/violation-rules');

const reports = [
  { createdAt: '2026-08-01T10:00:00Z', barber: 'А', violation: 'Нарушение 1' },
  { createdAt: '2026-08-02T10:00:00Z', barber: 'Алиас А', violation: 'Нарушение 1, Нарушение 2' },
  { createdAt: '2026-08-03T10:00:00Z', barber: 'Б', violation: 'Нарушение 2' },
  { createdAt: '2026-08-04T10:00:00Z', barber: 'Б', violation: 'Мастер опоздал', schedTime: '10:00' },
  { createdAt: '2026-08-05T10:00:00Z', barber: 'В', violation: 'Нет нарушений' },
  { createdAt: '2026-07-31T10:00:00Z', barber: 'Г', violation: 'Нарушение 3' },
  { createdAt: '2026-08-06T10:00:00Z', barber: 'Д', violation: 'Нарушение 4', isForceMajeure: true },
  { createdAt: '2026-08-07T10:00:00Z', barber: 'В', violation: 'Нет формы' },
  { createdAt: '2026-08-08T10:00:00Z', barber: 'Е', violation: 'Нарушение 5', fineWaived: true },
];

const result = top3.build(reports, '2026-08', name => name === 'Алиас А' ? 'А' : name, rules);
assert.deepEqual(result.violators, [
  { name: 'А', count: 3 },
  { name: 'Б', count: 1 },
  { name: 'В', count: 1 },
]);
assert.deepEqual(result.violations, [
  { name: 'Нарушение 1', count: 2 },
  { name: 'Нарушение 2', count: 2 },
  { name: 'Нет формы', count: 1 },
]);
assert.equal(result.totalReports, 4);
assert.equal(result.totalViolations, 5);

const overlaySource = fs.readFileSync(require.resolve('../public/js/analytics_history_overlay.js'), 'utf8');
assert(!/window\.OVN_TOPS\s*=/.test(overlaySource), 'historical layer must never write current OVN top lists');
assert(!/window\.OVN_DRILLDOWN\s*=/.test(overlaySource), 'historical layer must never write current OVN drilldown');
const ovnUiSource = fs.readFileSync(require.resolve('../public/js/ovn.js'), 'utf8');
assert(ovnUiSource.includes('Object.values(window.BARBER_ROSTER)'), 'OVN branches must come from adapter roster');
assert(!ovnUiSource.includes("'Рязанка'"), 'OVN analytics must not use a stale Ryazansky branch alias');
assert(ovnUiSource.includes('window.GromeOvnTop3.clean'), 'OVN quality and top lists must share clean-check rules');
console.log('analytics top3 regression: ok');
