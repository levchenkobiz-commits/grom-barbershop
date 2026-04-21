const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\Nikita\\Downloads\\заказы-200420261327.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet);

const clientsVisits = {};
let notDoneCount = 0;
let notServiceCount = 0;
let missingClientCount = 0;
let validServicesCount = 0;

data.forEach((row) => {
    const dateStr = row['Дата'];
    const type = row['Тип номенклатуры'];
    const status = row['Статус'];
    const clientStr = row['Клиент'];

    if (!dateStr) return; 
    
    if (status !== 'Выполнено') {
        notDoneCount++;
        return;
    }
    
    // We only care about "Услуга" (services) like haircuts, skipping "Товар" (shampoos, etc)
    if (type && type !== 'Услуга' && type !== 'услуга') {
        notServiceCount++;
        return;
    }

    if (!clientStr) {
        missingClientCount++;
        return;
    }
    
    let phone = String(clientStr).replace(/\D/g, '');
    if (!phone) {
        phone = String(clientStr).trim();
    }
    
    if (phone.toLowerCase() === 'клиент' || phone === '0') {
        missingClientCount++;
        return;
    }

    if (!clientsVisits[phone]) {
        clientsVisits[phone] = new Set();
    }
    
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        clientsVisits[phone].add(isoDate);
        validServicesCount++;
    }
});

let clientsWithMultiple = 0;
let totalIntervals = 0;
let totalDays = 0;
let totalUniqueVisits = 0;

for (const phone in clientsVisits) {
    const dates = Array.from(clientsVisits[phone]).sort();
    totalUniqueVisits += dates.length;

    if (dates.length > 1) {
        clientsWithMultiple++;
        for (let i = 1; i < dates.length; i++) {
            const d1 = new Date(dates[i - 1]);
            const d2 = new Date(dates[i]);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            totalDays += diffDays;
            totalIntervals++;
        }
    }
}

const avgCycle = totalIntervals > 0 ? (totalDays / totalIntervals) : 0;

console.log(`Всего строк прочитано (включая товары и отмены): ${data.length}`);
console.log(`Пропущено по типу (не 'Услуга', а Товар): ${notServiceCount}`);
console.log(`Пропущено без указанного клиента: ${missingClientCount}`);
console.log(`Учтено строк с УСЛУГАМИ: ${validServicesCount}`);
console.log('----------------------------------------------------');
console.log(`Уникальных клиентов: ${Object.keys(clientsVisits).length}`);
console.log(`Уникальных ВИЗИТОВ клиентов (уникальных дней): ${totalUniqueVisits}`);
console.log(`Разница между 1131 услугами и ${totalUniqueVisits} визитами означает, что в ${validServicesCount - totalUniqueVisits} случаях клиент делал несколько услуг за один день (например сет: стрижка + борода).`);
console.log('----------------------------------------------------');
console.log(`Клиентов с > 1 ВИЗИТОМ: ${clientsWithMultiple}`);
console.log(`Средний цикл (LTV rate): ${avgCycle.toFixed(1)} дней`);
