

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const dayjs = require('dayjs');

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const CLIENTS_PATH = path.join(DOWNLOAD_DIR, 'clients_NEW_CLIENTS.xlsx');
const SALES_PATH = path.join(DOWNLOAD_DIR, 'orders_CUR_90D.xlsx');

// Terminal → Branch mapping (el-kassa exports terminal ID, not branch name)
const TERMINAL_MAP = {
    25307: 'Сокол',
    35248: 'Текстильщики',
    56972: 'Рязанский',
    62837: 'Варшавская',
    64963: 'Алексеевская',
    98439: 'Партизанская',
};


const normPhone = (raw) => {
    if (!raw) return null;
    let s = String(raw).replace(/\D/g, ''); // only digits
    if (s.startsWith('8')) s = '7' + s.substring(1);
    // If it's a 10-digit number like 985..., assume Russian prefix 7
    if (s.length === 10 && (s.startsWith('9') || s.startsWith('8'))) s = '7' + s;
    if (s.length === 11 && s.startsWith('7')) return s;
    if (s.length === 10) return '7' + s;
    return s.length >= 10 ? s : null;
};

function run() {
    console.log('🔄 Starting New Cohort Return Rate Analysis...');

    if (!fs.existsSync(CLIENTS_PATH) || !fs.existsSync(SALES_PATH)) {
        console.error('Missing Excel files for calculation.');
        return;
    }

    const now = dayjs().startOf('day');
    const startBase = now.subtract(64, 'day');
    const endBase = now.subtract(32, 'day');

    console.log(`Base Period (Clients): ${startBase.format('DD.MM.YYYY')} - ${endBase.format('DD.MM.YYYY')}`);
    console.log(`Sales Tracking: From ${startBase.format('DD.MM.YYYY')} to Today`);

    // 1. Load Clients
    const wbClients = XLSX.readFile(CLIENTS_PATH);
    const rawClients = XLSX.utils.sheet_to_json(wbClients.Sheets[wbClients.SheetNames[0]]);

    // Period filter for NEW CLIENTS creation: [ -64, -32 ]
    // Assumes 'Создан' column has registration date
    const cohorts = {}; // phone -> registrationDate
    let clientsInBase = 0;

    rawClients.forEach(r => {
        const phone = normPhone(r['Телефон']);
        if (!phone) return;

        const createdStr = r['Создан'];
        if (!createdStr) return;

        const d = dayjs(createdStr, 'DD.MM.YYYY HH:mm');
        if (!d.isValid()) return;

        // Match cohort base period
        if (d.unix() >= startBase.unix() && d.unix() <= endBase.endOf('day').unix()) {
            if (!cohorts[phone]) {
                cohorts[phone] = d;
                clientsInBase++;
            }
        }
    });

    console.log(`Total New Clients in Cohort: ${clientsInBase}`);

    // 2. Load Sales (Visits)
    const wbSales = XLSX.readFile(SALES_PATH);
    const rawSales = XLSX.utils.sheet_to_json(wbSales.Sheets[wbSales.SheetNames[0]]);

    // phone -> [ {date, master, location} ]
    const visitsMap = {};

    rawSales.forEach(r => {
        const phone  = normPhone(r['Клиент']);
        const master = String(r['Сотрудник'] || r['Мастер'] || '').trim();
        const termId = Number(r['Терминал (номер)']);
        const loc    = TERMINAL_MAP[termId] || `Терминал_${termId || 'unknown'}`;
        const dateStr = r['Дата'];

        if (!phone || !dateStr || (master.toLowerCase().includes('логин')) || !master) return;

        const d = dayjs(dateStr, 'DD.MM.YYYY');
        if (!d.isValid()) return;

        if (!visitsMap[phone]) visitsMap[phone] = {};
        const dKey = d.format('YYYY-MM-DD');
        if (!visitsMap[phone][dKey]) {
            visitsMap[phone][dKey] = { date: d, master, loc };
        }
    });

    // 3. Match and Calculate Return Rate
    let returnedCount = 0;
    const masterStats = {}; // by first master
    const branchStats = {}; // by first branch

    Object.keys(cohorts).forEach(phone => {
        const regDate = cohorts[phone];
        const allVisits = Object.values(visitsMap[phone] || {}).sort((a, b) => a.date.unix() - b.date.unix());

        if (allVisits.length === 0) return; // Not found in sales? Interesting.

        const firstVisit = allVisits[0];
        const master = firstVisit.master;
        const branch = firstVisit.loc;

        if (!masterStats[master]) masterStats[master] = { new: 0, ret: 0 };
        if (!branchStats[branch]) branchStats[branch] = { new: 0, ret: 0 };

        masterStats[master].new++;
        branchStats[branch].new++;

        // Window: (T + 1 day) to (T + 32 days)
        const windowStart = firstVisit.date.add(1, 'day').startOf('day');
        const windowEnd = firstVisit.date.add(32, 'day').endOf('day');

        const returnedInWindow = allVisits.some(v => v.date.unix() >= windowStart.unix() && v.date.unix() <= windowEnd.unix());

        if (returnedInWindow) {
            returnedCount++;
            masterStats[master].ret++;
            branchStats[branch].ret++;
            if (returnedCount <= 10) {
                console.log(`[PASS] Phone:${phone} | First:${firstVisit.date.format('DD.MM')} | Ret:${allVisits.find(v => v.date.unix() >= windowStart.unix() && v.date.unix() <= windowEnd.unix()).date.format('DD.MM')} | WinEnd:${windowEnd.format('DD.MM')}`);
            }
        } else {
            // Not returned
        }
    });

    const rr = (returnedCount / clientsInBase * 100).toFixed(2);

    const results = {
        meta: {
            clientsPeriod: `${startBase.format('DD.MM.YYYY')} - ${endBase.format('DD.MM.YYYY')}`,
            salesPeriod: `${startBase.format('DD.MM.YYYY')} - ${now.format('DD.MM.YYYY')}`
        },
        stats: {
            totalNew: clientsInBase,
            returned: returnedCount,
            notReturned: clientsInBase - returnedCount,
            returnRatePercent: rr + '%',
            returnRateFraction: (returnedCount / clientsInBase).toFixed(4)
        },
        masters: Object.keys(masterStats)
            .map(m => ({
                name: m,
                new: masterStats[m].new,
                ret: masterStats[m].ret,
                rr: (masterStats[m].ret / masterStats[m].new * 100).toFixed(1) + '%'
            }))
            .sort((a, b) => b.new - a.new),
        branches: Object.keys(branchStats)
            .map(b => ({
                name: b,
                new: branchStats[b].new,
                ret: branchStats[b].ret,
                rr: (branchStats[b].ret / branchStats[b].new * 100).toFixed(1) + '%'
            }))
    };

    console.log('\n=== RESULTS ===');
    console.log(`Total New: ${results.stats.totalNew}`);
    console.log(`Returned: ${results.stats.returned}`);
    console.log(`Return Rate: ${results.stats.returnRatePercent}`);

    fs.writeFileSync('rr_results.json', JSON.stringify(results, null, 2));
}

run();
