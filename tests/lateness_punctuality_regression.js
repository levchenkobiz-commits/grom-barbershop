const assert = require('assert');
const { calculateLatenessMetric, derivePunctualityMetric } = require('../routes/lateness_metric');

const registry = [{ name: 'Азамат' }, { name: 'Фархад' }];
const lateness = calculateLatenessMetric([
  { date: '2026-08-01', barber: 'Азамат старое имя', location: 'Партизанская', schedTime: '10:00', time: '10:00' },
  { date: '2026-08-02', barber: 'Азамат', location: 'Партизанская', schedTime: '10:00', time: '10:03' },
  { date: '2026-08-03', barber: 'Архивный мастер', location: 'Партизанская', schedTime: '10:00', time: '10:10' },
  { date: '2026-08-04', barber: 'Азамат', location: 'Партизанская', schedTime: '10:00', time: '10:10', isForceMajeure: true },
], '2026-08-01', '2026-08-31', {
  masterRegistry: registry,
  canonicalizeMaster: name => name === 'Азамат старое имя' || name === 'Азамат' ? 'Азамат' : null,
});

const lateAzamat = lateness.drilldown[1].masters.find(row => row.name === 'Азамат');
const lateFarhad = lateness.drilldown[1].masters.find(row => row.name === 'Фархад');
assert.deepStrictEqual(lateAzamat, {
  name: 'Азамат', value: 50, late: 1, total: 2, noData: false, v: '50.0% (1/2)',
});
assert.strictEqual(lateFarhad.noData, true);
assert.strictEqual(lateness.late, 2, 'network rate keeps every valid arrival check');
assert.strictEqual(lateness.total, 3, 'force majeure is excluded from the denominator');

const punctuality = derivePunctualityMetric(lateness);
const punctualAzamat = punctuality.drilldown[1].masters.find(row => row.name === 'Азамат');
const punctualFarhad = punctuality.drilldown[1].masters.find(row => row.name === 'Фархад');
assert.strictEqual(punctuality.formula, '100 - late_arrival_checks / all_arrival_checks * 100');
assert.deepStrictEqual(
  { value: punctualAzamat.value, sourceValue: punctualAzamat.sourceValue, onTime: punctualAzamat.onTime, late: punctualAzamat.late, total: punctualAzamat.total, noData: punctualAzamat.noData, v: punctualAzamat.v },
  { value: 50, sourceValue: 50, onTime: 1, late: 1, total: 2, noData: false, v: '50.0% (1/2)' },
);
assert.strictEqual(punctualFarhad.noData, true);
assert.strictEqual(punctualFarhad.value, null);

console.log('lateness punctuality regression: passed');
