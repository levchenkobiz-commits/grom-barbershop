const XLSX = require('xlsx');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const wb = XLSX.readFile('c:\\Users\\Nikita\\.gemini\\antigravity\\scratch\\grom-dashboard\\downloads\\orders_CUR_90D.xlsx');
const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

let checksCount = 0;
const startMom = dayjs('01.04.2026', 'DD.MM.YYYY');
const endMom = dayjs('05.04.2026', 'DD.MM.YYYY');

rawData.forEach(r => {
    const dateStr = typeof r['Дата'] === 'string' ? r['Дата'].trim() : null;
    if (dateStr) {
        const mom = dayjs(dateStr, 'DD.MM.YYYY');
        if (mom.unix() >= startMom.unix() && mom.unix() <= endMom.unix()) {
            checksCount++;
        }
    }
});

const appointments = 1591;
const percentage = ((appointments / checksCount) * 100).toFixed(1);

console.log(`Записи (YClients): ${appointments}`);
console.log(`Чеки (El-kassa): ${checksCount}`);
console.log(`Процент записей: ${percentage}%`);
