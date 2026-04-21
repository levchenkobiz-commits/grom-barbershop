const xlsx = require('xlsx');

const workbook = xlsx.readFile('./sheet.xlsx');

console.log('Sheet Names:');
workbook.SheetNames.forEach(name => console.log('- ' + name));

workbook.SheetNames.forEach(name => {
    if (name.toLowerCase().includes('овн')) {
        console.log('\n--- Sheet:', name, '---');
        const sheet = workbook.Sheets[name];
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        json.slice(0, 10).forEach(row => console.log(row));
    }
});
