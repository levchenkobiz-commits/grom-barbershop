const xlsx = require('xlsx');
const path = require('path');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

function normalizePhone(p) {
    if (!p) return null;
    let s = String(p).replace(/\D/g, '');
    if (s.startsWith('8')) s = '7' + s.substring(1);
    return s.length >= 10 ? s : null;
}

const sWB = xlsx.readFile(path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);

// These were some of Rakhmon's 'new' clients from the previous run
const phonesToAudit = ["9096531515", "9257460305", "7533883803"];

phonesToAudit.forEach(phone => {
    console.log(`\n--- History for ${phone} ---`);
    const history = sData.filter(s => normalizePhone(s['Клиент']) === phone)
                         .map(s => ({
                             date: s['Дата'],
                             time: s['Время'],
                             master: s['Сотрудник'],
                             service: s['Элемент(ы)'],
                             sum: s['Сумма(руб.)']
                         }))
                         .sort((a,b) => {
                             const da = dayjs(a.date + ' ' + a.time, 'DD.MM.YYYY HH:mm');
                             const db = dayjs(b.date + ' ' + b.time, 'DD.MM.YYYY HH:mm');
                             return da - db;
                         });
    console.table(history);
});
