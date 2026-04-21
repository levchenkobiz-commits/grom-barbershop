const xlsx = require('xlsx');
const path = require('path');
const sWB = xlsx.readFile(path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);

const results = [];
sData.filter(s => String(s['Сотрудник']).includes('Рахмон')).forEach(s => {
    const t = s['Терминал (номер)'];
    if (!results.includes(t)) results.push(t);
});

console.log('Rakhmon worked at terminals:');
console.log(results);
