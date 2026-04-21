const xlsx = require('xlsx');
const path = require('path');
const sWB = xlsx.readFile(path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx'));
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);

const counts = {};
sData.filter(s => String(s['Сотрудник']).includes('Рахмон')).forEach(s => {
    const st = s['Статус'] || 'Empty';
    counts[st] = (counts[st] || 0) + 1;
});

console.log('Rakhmon Appointment Statuses (Last 90d):');
console.log(counts);

const allStatuses = {};
sData.forEach(s => {
    const st = s['Статус'] || 'Empty';
    allStatuses[st] = (allStatuses[st] || 0) + 1;
});
console.log('All Appointments Statuses (Network):');
console.log(allStatuses);
