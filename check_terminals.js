const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const headers = data[0];
const terminalIdx = headers.indexOf('Терминал (номер)');

const terminals = new Set();
data.slice(1).forEach(row => {
    if (row[terminalIdx]) terminals.add(row[terminalIdx]);
});

console.log('Unique terminals:', Array.from(terminals));
