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
const cWB = xlsx.readFile(path.join(__dirname, 'downloads', 'clients_NEW_CLIENTS.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);
const cData = xlsx.utils.sheet_to_json(cWB.Sheets[cWB.SheetNames[0]]);

const today = dayjs('2026-04-07');
const startBase = today.subtract(64, 'day');
const endBase = today.subtract(32, 'day');

const cohortPhones = new Set();
cData.forEach(c => {
    const createdStr = c['Создан'] || c['Created'];
    const created = dayjs(String(createdStr), ['DD.MM.YYYY HH:mm', 'DD.MM.YYYY']);
    if (created.isValid() && created.isAfter(startBase) && created.isBefore(endBase)) {
        const p = normalizePhone(c['Телефон'] || c['Phone']);
        if (p) cohortPhones.add(p);
    }
});

const visitsPerRakhmon = [];
const processedPhones = new Set();

cohortPhones.forEach(phone => {
    const visits = sData.filter(s => normalizePhone(s['Клиент']) === phone)
                       .sort((a,b) => dayjs(String(a['Дата']), 'DD.MM.YYYY') - dayjs(String(b['Дата']), 'DD.MM.YYYY'));
    
    if (visits.length > 0) {
        const first = visits[0];
        const master = String(first['Сотрудник']).trim();
        if (master.includes('Рахмон')) {
            visitsPerRakhmon.push({
               phone,
               date: first['Дата'],
               service: first['Элемент(ы)'],
               sum: first['Сумма(руб.)']
            });
        }
    }
});

console.log(`Detailed new clients for Rakhmon (Total ${visitsPerRakhmon.length}):`);
console.log(JSON.stringify(visitsPerRakhmon.slice(0, 20), null, 2));
