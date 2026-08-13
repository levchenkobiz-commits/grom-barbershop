const fs = require('fs');
const assert = require('assert');
const rules = require('../public/js/violation-rules');
const ovnRoute = require('../routes/ovn');

const handbook = JSON.parse(fs.readFileSync('handbook.json', 'utf8'));
assert.deepStrictEqual(rules.canonicalizeHandbook(handbook), handbook);
assert.strictEqual(handbook['Не обработал инструмент'], 300);
assert(!Object.prototype.hasOwnProperty.call(handbook, 'Не обработан инструмент'));

const html = fs.readFileSync('index.html', 'utf8');
const salaryCss = fs.readFileSync('public/css/salary-ui.css', 'utf8');
function optionValues(selectPattern) {
  const block = html.match(selectPattern);
  assert(block, `select not found: ${selectPattern}`);
  return [...block[0].matchAll(/<option\s+value="([^"]*)"/g)].map(match => match[1]).filter(Boolean);
}

const ovnOptions = optionValues(/<select[^>]*class="ovn-violation-select"[\s\S]*?<\/select>/);
for (const value of ovnOptions) {
  const canonical = rules.canonicalizeViolation(value);
  assert.strictEqual(value, canonical, `OVN option must use canonical name: ${value} → ${canonical}`);
  if (rules.isNoViolation(canonical) || canonical === 'Пробиты не все услуги') continue;
  assert(Object.prototype.hasOwnProperty.call(handbook, canonical), `OVN option has no handbook source: ${value} → ${canonical}`);
}

// Ручная форма была удалена из актуального интерфейса. Справочник проверяется
// через доступную ОВН-форму выше; не даём старой разметке вернуться незаметно.
const manualOptions = [];
assert.doesNotMatch(html, /id="mf-violation"/);

assert(html.includes('id="unpaid-sum-container"'));
assert(html.includes('id="ovn-unpaid-sum"'));
assert(html.includes('id="salary-grand-total"'));
assert(html.includes('class="modal-content salary-ledger-shell"'));
assert(salaryCss.includes('#salary-modal .salary-master-row'));
assert(salaryCss.includes('overflow-x: hidden'));
assert.throws(
  () => ovnRoute.requireDynamicViolationAmounts({ violation: 'Пробиты не все услуги', unpaidAmount: 0 }),
  /Укажите сумму непробитых услуг/
);
assert.doesNotThrow(
  () => ovnRoute.requireDynamicViolationAmounts({ violation: 'Пробиты не все услуги', unpaidAmount: 700 })
);

const aliasReport = { violation: '🧼 Не обработал инструмент, Неоплаченная стрижка' };
ovnRoute.normalizeReportViolations(aliasReport);
assert.strictEqual(aliasReport.violation, 'Не обработал инструмент, Услуга не проведена через терминал');

const reports = JSON.parse(fs.readFileSync('ovn_reports.json', 'utf8'));
const remainingAliases = reports.filter(report => {
  const raw = String(report.violation || '').trim();
  return raw && rules.canonicalizeViolationList(raw) !== raw;
});
assert.strictEqual(remainingAliases.length, 0, `OVN data still has ${remainingAliases.length} aliases`);

let historicalDynamicMissing = 0;
const unmapped = [];
for (const report of reports) {
  if (report.isManualFine || report.isForceMajeure || report.fineWaived) continue;
  for (const violation of rules.splitViolations(report.violation)) {
    if (rules.isNoViolation(violation) || violation === 'Мастер опоздал') continue;
    if (violation === 'Пробиты не все услуги') {
      const notesAmount = /сумма непробитых услуг:\s*(\d+)/i.test(String(report.notes || ''));
      if (!(Number(report.unpaidAmount) > 0) && !notesAmount) {
        historicalDynamicMissing += 1;
      }
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(handbook, violation)) unmapped.push({ id: report.id, violation });
  }
}
assert.deepStrictEqual(unmapped, []);

console.log(JSON.stringify({
  ok: true,
  handbookCanonical: true,
  ovnOptionsLinked: ovnOptions.length,
  manualOptionsLinked: manualOptions.length,
  dynamicAmountRequired: true,
  historicalDynamicMissing,
  unmappedViolations: 0,
  reportAliasesRemaining: 0,
}));
