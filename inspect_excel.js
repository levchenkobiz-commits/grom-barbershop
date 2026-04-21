const xlsx = require('xlsx');
const path = require('path');
const salesPath = path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx');
const clientsPath = path.join(__dirname, 'downloads', 'clients_NEW_CLIENTS.xlsx');

const sWB = xlsx.readFile(salesPath);
const cWB = xlsx.readFile(clientsPath);

const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);
const cData = xlsx.utils.sheet_to_json(cWB.Sheets[cWB.SheetNames[0]]);

console.log('--- Sales sample ---');
console.log(sData.slice(0, 2));
console.log('--- Client sample ---');
console.log(cData.slice(0, 2));

console.log('Columns in clients:', Object.keys(cData[0] || {}));
console.log('Columns in sales:', Object.keys(sData[0] || {}));
