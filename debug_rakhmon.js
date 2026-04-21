const xlsx = require('xlsx');
const path = require('path');

function normalizePhone(p) {
    if (!p) return '';
    let s = String(p).replace(/\D/g, '');
    if (s.startsWith('8')) s = '7' + s.substring(1);
    return s;
}

const salesPath = path.join(__dirname, 'downloads', 'orders_CUR_90D.xlsx');
const clientsPath = path.join(__dirname, 'downloads', 'clients_NEW_CLIENTS.xlsx');

const sWB = xlsx.readFile(salesPath);
const cWB = xlsx.readFile(clientsPath);

const sData = xlsx.utils.sheet_to_json(sWB.Sheets[sWB.SheetNames[0]]);
const cData = xlsx.utils.sheet_to_json(cWB.Sheets[cWB.SheetNames[0]]);

console.log(`Total Sales: ${sData.length}, Total Clients: ${cData.length}`);

const today = new Date('2026-04-07');
const startBase = new Date(today); startBase.setDate(today.getDate() - 64);
const endBase = new Date(today); endBase.setDate(today.getDate() - 32);

console.log(`Cohort Base: ${startBase.toISOString().split('T')[0]} to ${endBase.toISOString().split('T')[0]}`);

// 1. Identify phones created in base
const eligiblePhones = new Set();
cData.forEach(c => {
    const created = new Date(c['Дата создания'] || c['Created']);
    if (created >= startBase && created <= endBase) {
        const p = normalizePhone(c['Телефон'] || c['Phone']);
        if (p.length >= 10) eligiblePhones.add(p);
    }
});

console.log(`Eligible Phones in cohort: ${eligiblePhones.size}`);

// 2. Analyz Rakhmon's visits
const rakVisits = sData.filter(s => String(s['Мастер'] || s['Master']).includes('Рахмон'));
console.log(`Total records for Rakhmon in 90d: ${rakVisits.length}`);

// 3. Drill down on Rakhmon's ELIGIBLE NEW CLIENTS (assigned to him as FIRST visit)
const rakEligibleByUs = [];
eligiblePhones.forEach(phone => {
    const vists = sData.filter(s => normalizePhone(s['Телефон'] || s['Phone']) === phone)
                       .sort((a,b) => new Date(a['Дата'] || a['Date']) - new Date(b['Дата'] || b['Date']));
    
    if (vists.length > 0) {
        const first = vists[0];
        if (String(first['Мастер'] || first['Master']).includes('Рахмон')) {
            rakEligibleByUs.push({ phone, date: first['Дата'] || first['Date'] });
        }
    }
});

console.log(`Rakhmon identified as first master for: ${rakEligibleByUs.length} clients`);
if (rakEligibleByUs.length > 0) {
    console.log('Sample data for Rakhmon eligible (first 5):');
    console.log(rakEligibleByUs.slice(0, 5));
}
