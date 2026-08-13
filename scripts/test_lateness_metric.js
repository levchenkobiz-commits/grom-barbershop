'use strict';
const assert = require('assert');
const { calculateLatenessMetric } = require('../routes/lateness_metric');

const reports = [
  { date: '2026-08-01', time: '10:01', schedTime: '10:00', location: 'A', barber: '1' },
  { date: '2026-08-01', time: '10:00', schedTime: '10:00', location: 'A', barber: '2' },
  { date: '2026-08-01', time: '09:59', schedTime: '10:00', location: 'B', barber: '3' },
  { date: '2026-08-01', time: '10:15', schedTime: '10:00', isForceMajeure: true, location: 'B', barber: '4' },
  { date: '2026-08-01', time: 'bad', schedTime: '10:00' },
  { date: '2026-08-01', time: '10:20', schedTime: '10:00', isManualFine: true },
  { date: '2026-07-31', time: '10:20', schedTime: '10:00' },
];
const result = calculateLatenessMetric(reports, '2026-08-01', '2026-08-31');
assert.strictEqual(result.total, 4);
assert.strictEqual(result.late, 1);
assert.strictEqual(result.value, 25);
assert.strictEqual(result.forceMajeureExcluded, true);
console.log('[lateness] tests passed');
