const xlsx = require('xlsx');
const path = require('path');
const sWB = xlsx.readFile(path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);

const masters = new Set();
sData.forEach(s => {
    const m = s['Сотрудник'] || s['Сотрудники'] || s['Master'] || s['Мастер'];
    if (m) masters.add(String(m).trim());
});

console.log('Unique masters found in sales data:');
console.log(Array.from(masters));
