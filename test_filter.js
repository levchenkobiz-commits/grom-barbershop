const XLSX = require('xlsx');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const lockPath = require('path').join(__dirname, 'clients_NEW_CLIENTS.xlsx');
if (!require('fs').existsSync(lockPath)) {
    console.log("File not found");
    process.exit(1);
}

const wb = XLSX.readFile(lockPath);
const clientsExcel = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const now = dayjs();
const ninetyDaysAgoMoment = now.subtract(90, 'day');

const normPhone = (raw) => {
    if (!raw) return null;
    const s = typeof raw === 'number' ? raw.toString() : String(raw);
    const match = s.match(/\d{10}/); 
    return match ? match[0] : null;
};

let validDates = 0;
let in90Days = 0;

clientsExcel.forEach(r => {
    const createdStr = r['Создан'];
    if (!createdStr) return;
    const dStr = createdStr.split(' ')[0];
    const d = dayjs(dStr, 'DD.MM.YYYY');
    if (d.isValid()) {
        validDates++;
        if (d.unix() >= ninetyDaysAgoMoment.unix()) {
            in90Days++;
        }
    }
});

console.log(`Total: ${clientsExcel.length}`);
console.log(`Valid dates: ${validDates}`);
console.log(`In 90 days: ${in90Days}`);
