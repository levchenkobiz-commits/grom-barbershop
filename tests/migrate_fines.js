const fs = require('fs');
const reports = JSON.parse(fs.readFileSync('ovn_reports.json', 'utf8'));
const handbook = JSON.parse(fs.readFileSync('handbook.json', 'utf8'));

function expectedFine(report) {
  const text = String(report.violation || '').toLowerCase();
  const notes = String(report.notes || '').toLowerCase();
  if (report.isForceMajeure || report.fineWaived || text.includes('замечаний нет') || text.includes('нет нарушений')) return null;
  if (report.isManualFine) return Math.max(0, Number(report.cost) || 0);
  if (text.includes('опоздал')) {
    const minutes = Number((notes.match(/на\s+(\d+)\s+мин/) || [])[1] || 0);
    let range = '';
    if (minutes >= 61) range = '61+ мин (Невыход)';
    else if (minutes >= 31) range = '31-60 мин';
    else if (minutes >= 21) range = '21-30 мин';
    else if (minutes >= 11) range = '11-20 мин';
    else if (minutes >= 4) range = '4-10 мин';
    else if (minutes >= 1) range = '1-3 мин';
    if (!range) return 0;
    const key = String(report.slot || '') === '2' ? `Опоздание второй мастер ${range}` : `Опоздание ${range}`;
    return Math.max(0, Number(handbook[key]) || 0);
  }
  if (text.includes('не вышел') || text.includes('не выход') || text.includes('невыход')) return Math.max(0, Number(handbook['Невыход']) || 0);
  if (text.includes('пробиты не все услуги')) {
    const match = `${notes} ${text}`.match(/сумма непробитых услуг:\s*(\d+)/i);
    return Math.max(0, Number(report.unpaidAmount) || (match ? Number(match[1]) : 0));
  }
  if (text.includes('воровство') || text.includes('неоплаченная') || text.includes('терминал')) return Math.max(0, Number(handbook['Услуга не проведена через терминал']) || 0);
  return null;
}

let changed = 0;
const examples = [];
for (const report of reports) {
  const expected = expectedFine(report);
  const current = report.fine === undefined ? null : Number(report.fine);
  if (expected === null) {
    if (report.fine !== undefined) {
      delete report.fine;
      changed += 1;
    }
  } else if (current !== expected) {
    if (examples.length < 20) examples.push({ id: report.id, date: report.date, barber: report.barber, violation: report.violation, from: current, to: expected });
    report.fine = expected;
    changed += 1;
  }
}
fs.writeFileSync('ovn_reports.migrated.json', JSON.stringify(reports, null, 2));
console.log(JSON.stringify({ changed, examples }, null, 2));
