const xlsx = require('xlsx');
const path = require('path');
const sWB = xlsx.readFile(path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);

const overlapping = [];
const dayMap = {};

sData.filter(s => String(s['Сотрудник']).includes('Рахмон')).forEach(s => {
    const d = s['Дата'];
    const t = s['Время'];
    const key = `${d} ${t}`;
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(s['Клиент']);
});

Object.entries(dayMap).forEach(([k, clis]) => {
   if (clis.length > 1) overlapping.push({ time: k, count: clis.length });
});

console.log(`Rakhmon shows ${overlapping.length} overlapping appointments.`);
if (overlapping.length > 0) {
    console.log('Sample overlapping:');
    console.log(overlapping.slice(0, 10));
}
