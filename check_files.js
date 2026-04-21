const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
    'downloads/orders.xlsx',
    'downloads/orders_CUR_90D.xlsx',
    'downloads/orders_PREV_90D.xlsx'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`File ${file} does not exist.`);
        return;
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`\n--- File: ${file} ---`);
    console.log('Headers:', data[0]);
    
    let foundVarshav = false;
    data.forEach(row => {
        if (row && Array.isArray(row)) {
            row.forEach(cell => {
                if (typeof cell === 'string' && cell.includes('Варшав')) {
                    foundVarshav = true;
                }
            });
        }
    });
    console.log('Contains "Варшав":', foundVarshav);
});
