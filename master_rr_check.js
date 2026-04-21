const xlsx = require('xlsx');
const path = require('path');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

function normalizePhone(p) {
    if (!p) return null;
    let s = String(p).replace(/\D/g, '');
    if (s.length < 10) return null;
    if (s.startsWith('8')) s = '7' + s.substring(1);
    if (s.length === 10) s = '7' + s;
    return s.length === 11 ? s : null;
}

const salesPath = path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx');
const clientsPath = path.join(__dirname, 'downloads', 'clients_NEW_CLIENTS.xlsx');

const sWB = xlsx.readFile(salesPath);
const cWB = xlsx.readFile(clientsPath);
const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);
const cData = xlsx.utils.sheet_to_json(cWB.Sheets[cWB.SheetNames[0]]);

const today = dayjs('2026-04-07');
const startBase = today.subtract(64, 'day');
const endBase = today.subtract(32, 'day');

console.log(`Base Window: ${startBase.format('DD.MM.YYYY')} to ${endBase.format('DD.MM.YYYY')}`);

// 1. All Cohort Phones
const cohortPhones = new Set();
cData.forEach(c => {
    const createdStr = c['Создан'] || c['Created'] || c['Дата создания'];
    if (!createdStr) return;
    const created = dayjs(String(createdStr), ['DD.MM.YYYY HH:mm', 'DD.MM.YYYY', 'YYYY-MM-DD HH:mm']);
    if (created.isValid() && created.isAfter(startBase) && created.isBefore(endBase)) {
        const p = normalizePhone(c['Телефон'] || c['Phone']);
        if (p) cohortPhones.add(p);
    }
});

console.log(`Total New Clients (Created in cohort): ${cohortPhones.size}`);

// 2. Map all visits per phone (90 days)
const visitsMap = new Map();
sData.forEach(s => {
    const p = normalizePhone(s['Клиент'] || s['Phone'] || s['Телефон']);
    if (!p || !cohortPhones.has(p)) return;
    
    const dateStr = s['Дата'] || s['Date'];
    const date = dayjs(String(dateStr), ['DD.MM.YYYY', 'YYYY-MM-DD']);
    if (!date.isValid()) return;

    if (!visitsMap.has(p)) visitsMap.set(p, []);
    visitsMap.get(p).push({
        date: date.format('YYYY-MM-DD'),
        master: String(s['Сотрудник'] || s['Master']).trim()
    });
});

// 3. Process every cohort client
const masterStats = {};
let totalEligible = 0;
let totalReturned = 0;

visitsMap.forEach((visits, phone) => {
    // Sort chronologically
    visits.sort((a,b) => (a.date > b.date ? 1 : -1));
    
    // Deduplicate same-day visits
    const dayRegistry = [];
    const uniqueDays = visits.filter(v => {
        if (dayRegistry.includes(v.date)) return false;
        dayRegistry.push(v.date);
        return true;
    });

    if (uniqueDays.length === 0) return;

    const first = uniqueDays[0];
    const m = first.master;
    
    totalEligible++;
    if (!masterStats[m]) masterStats[m] = { eligible: 0, returned: 0 };
    masterStats[m].eligible++;

    // Did they return in 32 days?
    const t0 = dayjs(first.date);
    const windowEnd = t0.add(32, 'day');
    
    const hasReturn = uniqueDays.slice(1).some(v => {
        const t = dayjs(v.date);
        return t.isAfter(t0) && t.isBefore(windowEnd.add(1, 'second'));
    });

    if (hasReturn) {
        totalReturned++;
        masterStats[m].returned++;
    }
});

console.log('--- Master Breakdown ---');
const sorted = Object.entries(masterStats).sort((a,b) => b[1].eligible - a[1].eligible);
sorted.forEach(([m, stats]) => {
    const rr = ((stats.returned / stats.eligible) * 100).toFixed(1);
    console.log(`${m}: ${stats.returned}/${stats.eligible} = ${rr}%`);
});

console.log(`\nOverall: ${totalReturned}/${totalEligible} = ${((totalReturned/totalEligible)*100).toFixed(1)}%`);
