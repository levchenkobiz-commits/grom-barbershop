const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/isoWeek.js'));
dayjs.extend(require('dayjs/plugin/customParseFormat.js'));

const context = {
  console,
  dayjs,
  Set,
  window: null,
  document: { addEventListener() {}, getElementById() { return null; }, createElement() { return {}; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
};
context.window = context;
context.VIOLATION_RULES = require('../public/js/violation-rules');
vm.createContext(context);
vm.runInContext(fs.readFileSync('adapter.js', 'utf8') + '\nglobalThis.__ADAPTER=ADAPTER;', context);
context.ADAPTER = context.__ADAPTER;
context.GLOBAL_HANDBOOK = JSON.parse(fs.readFileSync('handbook.json', 'utf8'));
context.getAdapterMasterNames = () => new Set(Object.values(context.ADAPTER).flatMap(branch => branch.masters.map(master => master.dash)));
vm.runInContext(fs.readFileSync('public/js/fines.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('public/js/salary.js', 'utf8'), context);

const reportsPath = fs.existsSync('ovn_reports.migrated.json') ? 'ovn_reports.migrated.json' : 'ovn_reports.json';
const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
const current = context.calculateFines(reports, { start: '2026-08-03', end: '2026-08-09' });
for (const [master, result] of Object.entries(current)) {
  const detailTotal = (result.details || []).reduce((sum, detail) => sum + Number(detail.fine || 0), 0);
  assert.strictEqual(detailTotal, result.monthFines, `${master}: detail total differs`);
  assert.strictEqual((result.zoneDetails || []).length, result.weekViolations, `${master}: zone drilldown differs`);
  assert(!(result.zoneDetails || []).some(detail => /опоздал/i.test(detail.violation)), `${master}: lateness leaked into zone drilldown`);
  assert(!(result.zoneDetails || []).some(detail => /отказ клиенту/i.test(detail.violation)), `${master}: client refusal leaked into zone drilldown`);
  assert(Number.isFinite(result.monthFines), `${master}: invalid fine total`);
}
assert.strictEqual(current['Олимжон Х.'].state, 'Green');
assert.strictEqual(current['Фархад'].state, 'Green');
assert.strictEqual(current['Самаган С.'].state, 'Green');
assert.strictEqual(current['Мухамаджон С.'].state, 'Green');
assert.strictEqual(current['Мухамад'].state, 'Green');
assert.strictEqual(current['Мухамад'].monthFines, 700);
assert(!Object.prototype.hasOwnProperty.call(current, 'Мухаммад'), 'archived misspelled master leaked into the current cabinet');
assert.strictEqual(current['Олимжон Х.'].weekViolations, 5);
assert.strictEqual(current['Шавкатбек М.'].weekViolations, 0);
assert.strictEqual(current['Шавкатбек М.'].monthFines, 1200);
assert(current['Шавкатбек М.'].details.some(detail => /отказ клиенту/i.test(detail.violation) && detail.fine === 1000));
assert.deepStrictEqual(
  Array.from(current['Олимжон Х.'].zoneDetails, detail => detail.violation).sort(),
  ['Без формы', 'Не обработал инструмент', 'Не обработал инструмент', 'Не обработал инструмент', 'Не показал зеркало заднего вида'].sort()
);

const previous = context.calculateFines(reports, { start: '2026-07-27', end: '2026-08-02' });
for (const master of ['Мухамаджон С.', 'Фархад', 'Самаган С.']) {
  assert(!previous[master].details.some(detail => /замечаний нет/i.test(detail.violation)), `${master}: removed violation was charged`);
}

const canonicalHistoryChecks = [
  ['2026-05-18', '2026-05-24', 'Мухамаджон С.', 2, 0],
  ['2026-05-18', '2026-05-24', 'Эрболот С.', 4, 200],
  ['2026-06-29', '2026-07-05', 'Самаган С.', 3, 600],
  ['2026-07-20', '2026-07-26', 'Олимжон Х.', 10, 2400],
];
for (const [start, end, master, zoneCount, fine] of canonicalHistoryChecks) {
  const result = context.calculateFines(reports, { start, end })[master];
  assert.strictEqual(result.weekViolations, zoneCount, `${master} canonical history zone count`);
  assert.strictEqual(result.monthFines, fine, `${master} canonical history fine`);
}

const synthetic = [
  { barber: 'Азамат', date: '2026-08-03', violation: 'Замечаний нет', notes: 'удалено нарушение: Про акцию не сказал' },
  { barber: 'Азамат', date: '2026-08-04', violation: 'Мастер опоздал', notes: 'Опоздание на 5 мин', schedTime: '10:00', fine: 0 },
  { barber: 'Азамат', date: '2026-08-05', violation: 'Без формы', cost: 700, isManualFine: true },
  { barber: 'Азамат', date: '2026-08-06', violation: 'Без формы', isForceMajeure: true, notes: 'Форс-мажор' },
  { barber: 'Азамат', date: '2026-08-07', violation: 'Замечаний нет', notes: 'изменено нарушение: Без формы → Замечаний нет' },
];
const syntheticResult = context.calculateFines(synthetic, { start: '2026-08-03', end: '2026-08-09' })['Азамат'];
assert.strictEqual(syntheticResult.weekViolations, 1);
assert.strictEqual(syntheticResult.monthFines, 700);

const refusalResult = context.calculateFines([
  { barber: 'Шавкатбек М.', date: '2026-08-04', violation: 'Отказ клиенту' },
], { start: '2026-08-03', end: '2026-08-09' })['Шавкатбек М.'];
assert.strictEqual(refusalResult.weekViolations, 0);
assert.strictEqual(refusalResult.monthFines, 1000);
assert.strictEqual(refusalResult.zoneDetails.length, 0);
assert.strictEqual(refusalResult.details.length, 1);
assert.strictEqual(refusalResult.details[0].fine, 1000);
assert.strictEqual(context.isMandatoryFine('Отказ клиенту', '', {}), true);
assert.strictEqual(context.isZoneExcludedViolation('Отказ клиенту'), true);
assert.strictEqual(context.getViolationFine('Не обработал инструмент', '', {}), 300);
assert.strictEqual(context.getViolationFine('Не обработан инструмент', '', {}), 300);
assert.strictEqual(context.VIOLATION_RULES.canonicalizeViolation('🧼 Не обработал инструмент'), 'Не обработал инструмент');

const ovnRoute = require(`${process.cwd()}/routes/ovn`);
assert.strictEqual(ovnRoute.calculateMandatoryFine({ violation: 'Отказ клиенту' }), 1000);

const makeReports = (master, date, violation, count) => Array.from({ length: count }, (_, index) => ({
  id: `${master}-${date}-${violation}-${index}`,
  barber: master,
  date,
  violation,
  notes: '',
}));
const yellowReports = [
  ...makeReports('Мухамад', '2026-07-27', 'Телефон при клиенте', 10),
  ...makeReports('Мухамад', '2026-08-03', 'Без формы', 3),
  ...makeReports('Мухамад', '2026-08-04', 'Про акцию не сказал', 2),
];
const yellowResult = context.calculateFines(yellowReports, { start: '2026-08-03', end: '2026-08-09' })['Мухамад'];
assert.strictEqual(yellowResult.state, 'Yellow');
assert.strictEqual(yellowResult.weekViolations, 5);
assert.strictEqual(yellowResult.monthFines, 1500);
assert.strictEqual(yellowResult.details.length, 3);

const aliasYellowReports = [
  ...makeReports('Мухамад', '2026-07-27', 'Телефон при клиенте', 10),
  ...makeReports('Мухамад', '2026-08-03', 'Не обработал инструмент', 1),
  ...makeReports('Мухамад', '2026-08-04', 'Не обработан инструмент', 1),
  ...makeReports('Мухамад', '2026-08-05', 'Про акцию не сказал', 1),
];
const aliasYellowResult = context.calculateFines(aliasYellowReports, { start: '2026-08-03', end: '2026-08-09' })['Мухамад'];
assert.strictEqual(aliasYellowResult.state, 'Yellow');
assert.strictEqual(aliasYellowResult.weekViolations, 3);
assert.strictEqual(aliasYellowResult.monthFines, 600);

const redReports = [
  ...makeReports('Фархад', '2026-07-27', 'Телефон при клиенте', 14),
  ...makeReports('Фархад', '2026-08-03', 'Без формы', 2),
  ...makeReports('Фархад', '2026-08-04', 'Про акцию не сказал', 1),
];
const redResult = context.calculateFines(redReports, { start: '2026-08-03', end: '2026-08-09' })['Фархад'];
assert.strictEqual(redResult.state, 'Red');
assert.strictEqual(redResult.monthFines, 1200);

const stableYellowReports = [
  ...makeReports('Самаган С.', '2026-07-20', 'Телефон при клиенте', 10),
  ...makeReports('Самаган С.', '2026-07-27', 'Телефон при клиенте', 13),
  { barber: 'Самаган С.', date: '2026-08-03', violation: 'Замечаний нет' },
];
const stableYellow = context.calculateFines(stableYellowReports, { start: '2026-08-03', end: '2026-08-09' })['Самаган С.'];
assert.strictEqual(stableYellow.state, 'Yellow');

const emptyWeekResetReports = makeReports('Мухамад', '2026-07-20', 'Телефон при клиенте', 14);
const immediateRedWeek = context.calculateFines(emptyWeekResetReports, { start: '2026-07-27', end: '2026-08-02' })['Мухамад'];
assert.strictEqual(immediateRedWeek.state, 'Red');
assert.strictEqual(immediateRedWeek.weekViolations, 0);
assert.strictEqual(immediateRedWeek.zoneBasisViolations, 14);
const afterEmptyWeek = context.calculateFines(emptyWeekResetReports, { start: '2026-08-03', end: '2026-08-09' })['Мухамад'];
assert.strictEqual(afterEmptyWeek.state, 'Green');
assert.strictEqual(afterEmptyWeek.zoneBasisViolations, 0);

const orphanReports = makeReports('Архивный мастер', '2026-07-20', 'Телефон при клиенте', 14);
const orphanCurrent = context.calculateFines(orphanReports, { start: '2026-08-03', end: '2026-08-09' });
assert(!Object.prototype.hasOwnProperty.call(orphanCurrent, 'Архивный мастер'));

const muhamadFine = context.getFinesInPeriod('Мухамад', '2026-08-03', '2026-08-09', reports);
const muhamadFineDetails = context.getFinesDetailsInPeriod('Мухамад', '2026-08-03', '2026-08-09', reports);
assert.strictEqual(muhamadFine, muhamadFineDetails.total);
assert.strictEqual(muhamadFineDetails.zone, current['Мухамад'].state);
const cacheKey = context.getMasterWeeklySalaryCacheKey('Мухамад', dayjs('2026-08-03'), dayjs('2026-08-09'));
assert(cacheKey.includes(context.FINANCIAL_CALC_VERSION));

const names = { 'Мухамад': 72400, 'Мухамаджон С.': 40600 };
assert.strictEqual(context.findSalaryApiName(['Мухамаджон С.'], names), 'Мухамаджон С.');

const schedule = JSON.parse(fs.readFileSync('schedule.json', 'utf8'));
const shavkatShift = context.getScheduledShift('Шавкатбек М.', '2026-08-04', schedule);
assert(shavkatShift);
assert.strictEqual(context.parseSalaryShiftHours(shavkatShift.text), 14);
const shavkatSummary = context.buildApiShiftSummary('Шавкатбек М.', { '04.08.2026': 5 }, schedule, { base: 5000 });
assert.strictEqual(shavkatSummary.basePay, 5000);
assert.strictEqual(shavkatSummary.overtime, 1000);
assert.strictEqual(context.isRecognizedSalaryWorkday(1, shavkatShift), true);
assert.strictEqual(context.isRecognizedSalaryWorkday(1, null), false);
assert.strictEqual(context.isRecognizedSalaryWorkday(2, null), true);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.calculateSalaryBaseForHours(14, 5000))),
  { basePay: 5000, overtime: 1000, overtimeHours: 2 }
);

const percentSalary = context.calculateSalaryEarnings({
  basePay: 30000,
  revenue: 89600,
  percent: 40,
  overtime: 1000,
  replacementBonus: 500,
  fines: 700,
});
assert.strictEqual(percentSalary.percentagePay, 35840);
assert.strictEqual(percentSalary.usePercent, true);
assert.strictEqual(percentSalary.earnings, 36640);

const baseSalary = context.calculateSalaryEarnings({
  basePay: 30000,
  revenue: 50500,
  percent: 40,
  overtime: 0,
  replacementBonus: 0,
  fines: 900,
});
assert.strictEqual(baseSalary.usePercent, false);
assert.strictEqual(baseSalary.earnings, 29100);
assert.throws(() => context.getMasterSettings('Несуществующий мастер'), /отсутствует в адаптере/);

const azimReplacement = context.calcReplacementBonus(
  'Азимжон Ш.', 'Азимжон Ш.', { '04.08.2026': 10 },
  { 'Азимжон Ш.': { '04.08.2026': '64963' } },
  { 'Азимжон Ш.': { '04.08.2026': ['64963'] } },
  schedule, { terminal: '64963' }
);
assert.strictEqual(azimReplacement.bonus, 500);

const multiTerminalReplacement = context.calcReplacementBonus(
  'Авазбек М.', 'Авазбек М.', { '03.08.2026': 2 },
  { 'Авазбек М.': { '03.08.2026': '25307' } },
  { 'Авазбек М.': { '03.08.2026': ['25307', '56972'] } },
  schedule, { terminal: '25307' }
);
assert.strictEqual(multiTerminalReplacement.bonus, 500);

const auth = require(`${process.cwd()}/routes/auth`);
assert.deepStrictEqual(auth.ROUTE_PERMS['POST /api/elkassa/salary'], ['owner', 'maintenance', 'master']);

console.log(JSON.stringify({
  ok: true,
  currentZones: Object.fromEntries(['Мухамаджон С.', 'Олимжон Х.', 'Фархад', 'Самаган С.'].map(master => [master, current[master].state])),
  exactName: true,
  removedViolationIgnored: true,
  storedFineRespected: true,
  crossBranchSchedule: true,
  overtimeOnce: true,
  salaryFormulaSingleSource: true,
  salarySettingsFailClosed: true,
  replacementSources: true,
  salaryApiProtected: true,
  detailTotalsMatch: true,
  zoneDrilldownMatchesCounts: true,
  latenessExcludedFromZones: true,
  refusalImmediateAndExcludedFromZones: true,
  violationAliasesCanonicalized: true,
  canonicalHistoryTotalsLocked: true,
  manualFinesAffectZones: true,
  forceMajeureAndClearedChecksExcluded: true,
  yellowFinesEveryTopRepeat: true,
  thresholdsGreenYellowRed: true,
  missingWeeksResetZones: true,
  archivedGhostMastersHidden: true,
  managerAndMasterFineSourceEqual: true,
  financialCacheVersioned: true,
}));
