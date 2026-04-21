const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'downloads', 'orders.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Sheet Name:', sheetName);
const headers = data[0];
console.log('Headers:', headers);

const branches = new Set();
const elkassaRefs = new Set();

data.forEach((row, rowIndex) => {
    if (row && Array.isArray(row)) {
        row.forEach((cell, colIndex) => {
            if (typeof cell === 'string') {
                if (cell.includes('Варшав')) branches.add(cell);
                if (cell.includes('el.kassa')) elkassaRefs.add({cell, rowIndex, colIndex});
            }
        });
    }
});

console.log('Found "Варшав":', Array.from(branches));
console.log('Found "el.kassa":', Array.from(elkassaRefs));

// Let's also look for telephone numbers or client IDs to calculate cycle
// Looking at the sample, the last column in row 2 is 9126512374, which looks like a phone number.
