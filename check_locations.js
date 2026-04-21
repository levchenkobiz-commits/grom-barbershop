const xlsx = require('xlsx');
const path = require('path');
const sWB = xlsx.readFile(path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);

const keys = Object.keys(sData[0] || {});
console.log('Columns in sales file:');
console.log(keys);

const sample = sData.filter(s => String(s['Сотрудник']).includes('Рахмон')).slice(0, 5);
console.log('Sample for Rakhmon:');
console.log(sample);
