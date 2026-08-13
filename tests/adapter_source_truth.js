const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const adapterApi = require('../adapter');
const { canonicalMasterName, adapterMasterNames } = require('../routes/master_scope');
const { enforceAdapterRoster } = require('../routes/dashboard_data');
const { canonicalizeSchedule } = require('../routes/schedule');
const { normalizeAdapter } = require('../routes/adapter');
const { handleScript, publicAdapter } = require('../routes/client_adapter');

const roster = adapterMasterNames();
assert.strictEqual(roster.size, Object.values(adapterApi.ADAPTER).reduce((sum, branch) => sum + branch.masters.length, 0));

assert.strictEqual(canonicalMasterName('Мухамаджон С.'), 'Мухамаджон С.');
assert.strictEqual(canonicalMasterName('Мухаммаджон'), 'Мухамаджон С.');
assert.strictEqual(canonicalMasterName('Азимжон Ш. (С 10 до 22)'), 'Азимжон Ш.');
assert.strictEqual(canonicalMasterName('Самаган'), 'Самаган С.');
assert.strictEqual(canonicalMasterName('Санжар'), null);
assert.strictEqual(canonicalMasterName('Муха'), null);

const metric = enforceAdapterRoster({
  value: 1,
  drilldown: [{
    name: 'По мастерам',
    masters: [
      { name: 'Мухаммаджон', v: '10%' },
      { name: 'Мухамаджон С.', v: '20%' },
      { name: 'Азим', v: '5' },
      { name: 'Санжар', v: '99' },
    ],
  }],
});
assert.deepStrictEqual(metric.drilldown[0].masters.map(row => row.name), ['Мухамаджон С.', 'Азимжон Ш.']);
assert.strictEqual(metric.drilldown[0].masters[0].v, '20%');

const schedule = canonicalizeSchedule([{
  date: '2026-08-03',
  location: 'Алексеевская',
  masters: [
    { name: 'Азимжон Ш. (С 10 до 22)', text: 'С 10 до 22' },
    { name: 'Санжар', text: 'С 10 до 22' },
  ],
}]);
assert.deepStrictEqual(schedule[0].masters.map(master => master.name), ['Азимжон Ш.']);
assert.throws(() => canonicalizeSchedule([{ date: '2026-08-03', masters: [{ name: 'Санжар' }] }], true), /отсутствуют в адаптере/);

const normalized = normalizeAdapter(adapterApi.ADAPTER);
assert.deepStrictEqual(normalized.Сокол.masters.find(master => master.dash === 'Мухамаджон С.').aliases, ['Мухамаджон', 'Мухаммаджон']);
assert.deepStrictEqual(publicAdapter(normalized).Сокол.masters.find(master => master.dash === 'Мухамаджон С.').aliases, ['Мухамаджон', 'Мухаммаджон']);

let clientAdapterSource = '';
handleScript({}, { writeHead() {}, end(value) { clientAdapterSource = value; } });
new vm.Script(clientAdapterSource);
assert(clientAdapterSource.includes('window.findAdapterMaster = findAdapterMaster'));

const agentSource = fs.readFileSync(require.resolve('../agent'), 'utf8');
assert(agentSource.includes('ADAPTER = loadCurrentAdapterApi()'));
assert(!agentSource.includes('getDashNameByElkassa(masterRaw, loc) || masterRaw'));
assert(!agentSource.includes('const runFinance ='));

console.log(JSON.stringify({
  ok: true,
  adapterMasters: roster.size,
  aliasesCanonicalized: true,
  unknownMastersRejected: true,
  analyticsRosterFiltered: true,
  scheduleRosterFiltered: true,
  adapterReloadedEverySync: true,
}));
