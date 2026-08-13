let chromium = null;
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(customParseFormat);
dayjs.extend(quarterOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { ekGetAll } = require('./routes/elkassa');
const { calculateAppointmentShare } = require('./routes/appointments_metric');
const { getCompletedRollingPeriod, calculateVisitCycle, median } = require('./routes/visit_cycle');
let ADAPTER = null;

function loadCurrentAdapterApi() {
    const adapterPath = require.resolve('./adapter');
    delete require.cache[adapterPath];
    return require('./adapter');
}

const CONFIG = {
    url: 'http://el-kassa.online/login',
    email: 'Levchenko.biz@gmail.com',
    pass: 'Grometeam2026',
    yLogin: '89854291875',
    yPass: 'Googleplay99',
    yPartnerToken: '35f04cfc929b45d4f5f720b9d943b44b',
    telegramToken: '8264809973:AAGI-YhU8LItlRULVgTfk44y30pTR85Vft4',
    telegramChatId: '476578323', 
    dataPath: path.join(__dirname, 'data.json'),
    downloadDir: path.join(__dirname, 'downloads')
};

if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir);
}

const lockPath = path.join(__dirname, 'scraping_lock');
const ANALYTICS_TIMEZONE = 'Europe/Moscow';

function getAnalyticsNow(reference = null) {
    return (reference ? dayjs(reference) : dayjs()).tz(ANALYTICS_TIMEZONE);
}

// QTD intentionally includes only completed Moscow days.  The comparison is
// the same calendar interval one year earlier; it is never the previous Q.
function getRevenueComparisonPeriod(reference = null) {
    const now = getAnalyticsNow(reference);
    const currentStart = now.startOf('quarter');
    const currentEnd = now.startOf('day').subtract(1, 'day');
    const previousStart = currentStart.subtract(1, 'year');
    const previousEnd = currentEnd.subtract(1, 'year');
    return {
        now,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        hasCompletedDays: !currentEnd.isBefore(currentStart, 'day'),
        label: !currentEnd.isBefore(currentStart, 'day')
            ? `${currentStart.format('DD.MM')}-${currentEnd.format('DD.MM')}`
            : ''
    };
}

function noComparableRevenue(period, reason) {
    return {
        noData: true,
        current: null,
        previous: null,
        growth: null,
        period: period.label,
        reason,
        drilldown: []
    };
}

// A reader either gets the complete previous snapshot or the complete new one.
// rename(2) is atomic when both files are in the same directory.
function writeJsonAtomically(filePath, value) {
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
        fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
        fs.renameSync(tempPath, filePath);
    } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

function acquireScrapingLock() {
    if (fs.existsSync(lockPath)) {
        let ownerPid = 0;
        try {
            ownerPid = Number(JSON.parse(fs.readFileSync(lockPath, 'utf8')).pid) || 0;
        } catch (_) {
            // Legacy lock files contained just "active". They cannot prove that a
            // scraper is still running and previously blocked analytics forever.
        }

        if (ownerPid > 0) {
            try {
                process.kill(ownerPid, 0);
                console.log(`Scraper already running (pid ${ownerPid}), skipping...`);
                return false;
            } catch (_) {
                // The owner no longer exists, so the lock is stale.
            }
        }
        console.warn('Removing stale scraper lock.');
        fs.unlinkSync(lockPath);
    }

    fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return true;
}

function releaseScrapingLock() {
    if (!fs.existsSync(lockPath)) return;
    try {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (Number(lock.pid) !== process.pid) return;
    } catch (_) {
        // We own all newly-created locks; also clean up a malformed legacy lock.
    }
    fs.unlinkSync(lockPath);
}

async function run() {
    if (!acquireScrapingLock()) return;
    // ADAPTER может измениться без перезапуска долгоживущего агента.
    // Каждый цикл обязан перечитать единый реестр с диска.
    ADAPTER = loadCurrentAdapterApi();
    console.log(`\n=== [${dayjs().format('HH:mm:ss')}] GROME FULL SYNC (EXCEL EXTRACTOR) ===`);
    let browser;

    let loadErrors = { yclients: false, elkassa: false };

    try {
        if (!chromium) ({ chromium } = require('playwright'));
        browser = await chromium.launch({ headless: true, timeout: 90000 });
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        try {
            await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
            
            try {
                const loginInput = await page.waitForSelector('input[name="login"]', { timeout: 3000 });
                if (loginInput) {
                    
            try {
                const loginInput = await page.waitForSelector('input[name="login"]', { timeout: 3000 });
                if (loginInput) {
                    
            try {
                const loginInput = await page.waitForSelector('input[name="login"]', { timeout: 3000 });
                if (loginInput) {
                    await page.fill('input[name="login"]', CONFIG.email);
                    await page.fill('input[name="password"]', CONFIG.pass);
                    await page.click('button[type="submit"]');
                    await page.waitForTimeout(5000);
                }
            } catch(noLoginForm) {
                console.log('Already logged in for salary module.');
            }

                }
            } catch(noLoginForm) {
                console.log('Already logged in for salary module.');
            }

                    console.log('CRM Auth OK');
                }
            } catch(noLoginForm) {
                console.log('Already logged in or no login form found.');
            }

        } catch(e) {
            loadErrors.elkassa = true;
            throw e;
        }

        const revenuePeriod = getRevenueComparisonPeriod();
        const now = revenuePeriod.now;
        const cyclePeriod = getCompletedRollingPeriod(now);
        const todayStr = now.format('DD.MM.YYYY');
        const yesterdayStr = revenuePeriod.currentEnd.format('DD.MM.YYYY');
        const startQ = revenuePeriod.currentStart.format('DD.MM.YYYY');
        const startPrevQ = revenuePeriod.previousStart.format('DD.MM.YYYY');
        const endPrevQ = revenuePeriod.previousEnd.format('DD.MM.YYYY');
        // Return Rate keeps its existing 91-day source window. Keep this as a
        // Dayjs value too: comparing against a formatted string is locale
        // dependent and can silently widen or shorten the cohort window.
        const rrStart = now.subtract(91, 'day').startOf('day');
        
        const startQMoment = dayjs(startQ, 'DD.MM.YYYY');
        const todayMoment = dayjs(todayStr, 'DD.MM.YYYY');

        // Helper to download and parse Excel
        async function getExcelData(start, end, label) {
            console.log(`[${label}] Downloading Excel ${start} - ${end}...`);
            const urlExport = `http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=${start}+00:00+-+${end}+23:59`;
            await page.goto(urlExport, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(4000);
            
            let rawData = [];
            const excelBtn = page.locator('text=/Excel/i').first();
            if (await excelBtn.count() > 0) {
                const [download] = await Promise.all([
                    page.waitForEvent('download', { timeout: 120000 }),
                    excelBtn.click({ noWaitAfter: true })
                ]);
                const filePath = path.join(CONFIG.downloadDir, `orders_${label}.xlsx`);
                await download.saveAs(filePath);
                
                const wb = XLSX.readFile(filePath);
                rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                console.log(`[${label}] Downloaded ${rawData.length} records.`);
            } else {
                console.log(`[${label}] Excel button not found!`);
            }
            return rawData;
        }

        async function getClientsExcel(startStr, endStr, label) {
            console.log(`[${label}] Downloading Clients Excel ${startStr} - ${endStr}...`);
            await page.goto('http://el-kassa.online/cabinet/customer', { waitUntil: 'domcontentloaded', timeout: 90000 });
            await page.waitForTimeout(4000);
            
            await page.evaluate(({start, end}) => {
                 const input = document.getElementById('form_dateCreated');
                 if (input) input.value = `${start} 00:00 - ${end} 23:59`;
            }, { start: startStr, end: endStr });
            
            let rawData = [];
            const excelBtn = page.locator('button[name="to_excel"]').first();
            if (await excelBtn.count() > 0) {
                const [download] = await Promise.all([
                    page.waitForEvent('download', { timeout: 120000 }),
                    excelBtn.click({ noWaitAfter: true })
                ]);
                const filePath = path.join(CONFIG.downloadDir, `clients_${label}.xlsx`);
                await download.saveAs(filePath);
                
                const wb = XLSX.readFile(filePath);
                rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                console.log(`[${label}] Downloaded ${rawData.length} client records.`);
            } else {
                console.log(`[${label}] Excel button not found for clients!`);
            }
            return rawData;
        }

        const normPhone = (raw) => {
            if (!raw) return null;
            let s = String(raw).replace(/\D/g, ''); 
            if (s.startsWith('8')) s = '7' + s.substring(1);
            if (s.length === 10 && (s.startsWith('9') || s.startsWith('8'))) s = '7' + s;
            if (s.length === 11 && s.startsWith('7')) return s;
            if (s.length === 10) return '7' + s;
            return s.length >= 10 ? s : null;
        };

        // ============ REVENUE (DOM Extraction from ИТОГИ) ============
        async function getRevenue(start, end, label) {
            const url = `http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=${start}+00:00+-+${end}+23:59`;
            console.log(`[${label}] Loading ${start}→${end}...`);
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(4000); 
            try {
                const itogi = page.locator('text=/ИТОГИ/i').first();
                if (await itogi.count() > 0) await itogi.click();
                await page.waitForTimeout(2000);
            } catch(e) {}

            const rev = await page.evaluate(() => {
                const parse = (s) => parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
                let sumTotal = 0, bonus = 0;
                Array.from(document.querySelectorAll('tr')).forEach(r => {
                    const cells = r.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const text = cells[0].innerText.toLowerCase();
                        const val = parse(cells[1].innerText);
                        // Exactly match "Сумма:"
                        if (text === 'сумма:') sumTotal = val;
                        if (text.includes('оплачено бонусом')) bonus = val;
                    }
                });
                return { sum: sumTotal, bonus: bonus, total: sumTotal - bonus };
            });
            console.log(`[${label}] ${rev.sum} (Сумма) - ${rev.bonus} (Бонусы) = ${rev.total}`);
            return rev.total;
        }

        
        let runClients = !process.argv.includes('--module=finance') && !process.argv.includes('--module=online') && !process.argv.includes('--module=salary');
        let runFinance = !process.argv.includes('--module=clients') && !process.argv.includes('--module=online') && !process.argv.includes('--module=salary');
        let runOnline = !process.argv.includes('--module=clients') && !process.argv.includes('--module=finance') && !process.argv.includes('--module=salary');
        const runSalary = process.argv.includes('--module=salary') || (now.day() === 1 && now.hour() === 2);
        let financeSnapshotReady = runFinance;
        let revenueNoData = null;


        let revCur = 0, revPrev = 0, revToday = 0, growth = 0;
        let avgCycle = 0, cycleCount = 0, totalCohortRet = 0, totalCohortBase = 0, eligiblePhones = [];
        let rrVal = 0, percentage = 0, checksCount = 0, recordsCount = 0;
        let appointmentsReady = false;
        let cycleDrilldown = [], rrDrilldown = [], rrLocDrilldown = [], apptMasters = [], masterOccupancy = [], masters = [];
        let networkAvg = 0;
        let cycleResult = { value: 0, sampleSize: 0, eligibleCustomers: 0, byMaster: new Map() };

        const startMonth = now.startOf('month').format('DD.MM.YYYY');

        // Try load existing data.json to preserve other tabs' data if skipping them
        let oldData = {};
        if (fs.existsSync(CONFIG.dataPath)) {
            try { oldData = JSON.parse(fs.readFileSync(CONFIG.dataPath)); } catch(e){}
        }

        if (runFinance && !revenuePeriod.hasCompletedDays) {
            // On day 1 there is no completed day in the new quarter yet.  Do
            // not query an inverted range and do not retain a prior Q as QTD.
            revenueNoData = noComparableRevenue(revenuePeriod, 'В новом квартале ещё нет завершённого дня.');
            runFinance = false;
        }

        if (runFinance) {
            revCur = await getRevenue(startQ, yesterdayStr, 'QTD-2026');
            revPrev = await getRevenue(startPrevQ, endPrevQ, 'PREV-YOY-QTD');
            revToday = await getRevenue(todayStr, todayStr, 'Today');
            growth = revPrev > 0 ? ((revCur - revPrev) / revPrev * 100).toFixed(1) : 0;
            console.log(`--- REVENUE YoY ---`);
            console.log(`QTD: ${revCur} | Prev QTD: ${revPrev} | Growth: ${growth}% | Today: ${revToday}`);

            // ============ MASTERS REVENUE (From Reports) ============
            await page.goto(`http://el-kassa.online/cabinet/report/employee_job?form[date]=${startQ}+-+${yesterdayStr}`, { waitUntil: 'load' });
            await page.waitForTimeout(4000);
            masters = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('table tbody tr'))
                    .map(r => {
                        const cells = r.querySelectorAll('td');
                        if (cells.length > 3) return { name: cells[0].innerText.trim(), v: cells[cells.length - 1].innerText.trim() };
                        return null;
                    })
                    .filter(m => m && m.name && !m.name.includes('Итого') && !m.name.includes('Филиал') && !m.name.includes('Сотрудник') && parseFloat(m.v.replace(/[^0-9]/g, '')) > 0)
                    .slice(0, 12);
            });
            masters = masters
                .map(row => ({ ...row, name: ADAPTER.getDashNameByElkassa(row.name) }))
                .filter(row => row.name);
        }

        
        let salaryWeekly = oldData.salaryWeekly || {};
        if (runSalary) {
            console.log('============ STARTING SALARY REVENUE CRON ============');
            let d = dayjs();
            while (d.day() !== 1) d = d.subtract(1, 'day');
            const lastMon = d.subtract(1, 'week').format('DD.MM.YYYY');
            const lastSun = d.subtract(1, 'day').format('DD.MM.YYYY');
            
            console.log(`Calculating salary for period: ${lastMon} - ${lastSun}`);
            
            let curPage = 1;
            let masterTotals = {};
            await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            try {
                const loginInput = await page.waitForSelector('input[name="login"]', { timeout: 3000 });
                if (loginInput) {
                    await page.fill('input[name="login"]', CONFIG.email);
                    await page.fill('input[name="password"]', CONFIG.pass);
                    await page.click('button[type="submit"]');
                    await page.waitForTimeout(5000);
                }
            } catch(e) {
                console.log('Already logged in for Elkassa');
            }

            const salaryUrl = `http://el-kassa.online/cabinet/employee/salary`;
            console.log(`Navigating to Salary Summary: ${salaryUrl}`);
            await page.goto(salaryUrl, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(4000);
            
            // Set date
            await page.evaluate(({start, end}) => {
                const input = document.getElementById('form_date');
                if (input) input.value = `${start} 00:00 - ${end} 23:59`;
            }, { start: lastMon, end: lastSun });
            
            // Search with navigation handling
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
                page.click('button[type="submit"]')
            ]);
            await page.waitForTimeout(4000);

            const masterData = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.querySelectorAll('td').length > 10);
                return rows.map(r => {
                    const cells = r.querySelectorAll('td');
                    const nameRaw = cells[1].innerText || '';
                    const turnoverRaw = cells[12].innerText || '0';
                    
                    // Cleanup name: "Name | Date | Worked: X"
                    const lines = nameRaw.split('\n').map(l => l.trim()).filter(l => l);
                    const name = lines[0] || '';
                    
                    // Try get "Отработано: X"
                    let workDays = 0;
                    const wMatch = nameRaw.match(/Отработано:\s*(\d+)/i);
                    if (wMatch) workDays = parseInt(wMatch[1]);
                    
                    const turnover = parseFloat(turnoverRaw.replace(/[^0-9.]/g, '')) || 0;
                    return { name, turnover, workDays };
                });
            });

            const turnoverMap = {};
            const workDaysMap = {};
            masterData.forEach(m => {
                const canonical = ADAPTER.getDashNameByElkassa(m.name);
                if (!canonical) return;
                turnoverMap[canonical] = (turnoverMap[canonical] || 0) + m.turnover;
                workDaysMap[canonical] = Math.max(workDaysMap[canonical] || 0, m.workDays);
            });

            salaryWeekly = {
                start: lastMon,
                end: lastSun,
                calcDate: dayjs().format('DD.MM.YYYY HH:mm'),
                revenue: turnoverMap,
                workDays: workDaysMap
            };
            console.log("Weekly Salary Data Parsed via Summary Table:", turnoverMap);
        }

        // ============ EXCEL DOWNLOADS ============
        let rrExcel = [];
        let cycleOrders = [];
        let curMonthOrders = [];
        let curMonthOccupancyOrders = [];
        const fetchEnd = yesterdayStr; // Strictly up to yesterday end of day

        if (runClients) {
            // Use the paginated primary API for the cycle only. The browser
            // Excel export silently omits part of long intervals, whereas the
            // API exposes the full order count and is shared with history.
            cycleOrders = await ekGetAll('/api2/order/list', {
                date: `${cyclePeriod.start.format('DD.MM.YYYY')} 00:00 - ${yesterdayStr} 23:59`
            });
            rrExcel = await getExcelData(rrStart.format('DD.MM.YYYY'), yesterdayStr, 'CUR_90D');
        }
        if (runOnline) {
            // The appointment denominator must use the same paginated source
            // as monthly history. Excel can silently truncate a long export.
            curMonthOrders = await ekGetAll('/api2/order/list', {
                date: `${startMonth} 00:00 - ${fetchEnd} 23:59`
            });
            // Occupancy intentionally keeps its established Excel source and
            // calculation; this API migration is limited to appointments.
            curMonthOccupancyOrders = await getExcelData(startMonth, fetchEnd, 'MTD_OCCUPANCY');
        }

        if (runClients) {
        const startBase = now.subtract(91, 'day').startOf('day');
        const endBase = now.subtract(61, 'day').endOf('day');
        const clientsExcel = await getClientsExcel(startBase.format('DD.MM.YYYY'), endBase.format('DD.MM.YYYY'), 'NEW_CLIENTS');
        console.log(`RR Cohort: ${startBase.format('DD.MM.YYYY')} - ${endBase.format('DD.MM.YYYY')}`);

        const cohorts = {}; // phone -> firstMatchInCohort
        clientsExcel.forEach(r => {
            const p = normPhone(r['Телефон']);
            const createdStr = r['Создан'];
            if (!p || !createdStr) return;
            const d = dayjs(createdStr, 'DD.MM.YYYY HH:mm');
            if (d.isValid() && d.unix() >= startBase.unix() && d.unix() <= endBase.unix()) {
                if (!cohorts[p]) cohorts[p] = d; 
            }
        });
        console.log(`Total New Clients in Cohort: ${Object.keys(cohorts).length}`);
        
        const getLocFromRow = (r) => {
            if (r['Филиал']) return String(r['Филиал']).trim();
            if (r['Терминал (номер)']) {
                const term = String(r['Терминал (номер)']).trim();
                for (const [branch, cfg] of Object.entries(ADAPTER.ADAPTER || ADAPTER)) {
                    if (cfg.el_kassa_terminal === term) return branch;
                }
            }
            return null;
        };

        const cycleEvents = cycleOrders
            .filter(order => order.status_pay_show === 'Оплачено')
            .map(order => {
            const phone = normPhone(order.customerPhone);
            const d = dayjs(order.date, 'DD.MM.YYYY HH:mm');
            if (!phone || !d.isValid()) return null;
            const loc = getLocFromRow({ 'Терминал (номер)': order.terminal_number });
            const rawMaster = typeof order.employeeName === 'string' ? order.employeeName.trim() : '';
            return { phone, date: d, branch: loc, master: rawMaster && loc ? ADAPTER.getDashNameByElkassa(rawMaster, loc) : null };
        }).filter(Boolean);
        cycleResult = calculateVisitCycle(cycleEvents);
        avgCycle = cycleResult.value;
        cycleDrilldown = [...cycleResult.byMaster.entries()]
            .map(([name, values]) => ({ name, v: `${median(values).toFixed(1)} д.` }))
            .sort((a, b) => parseFloat(a.v) - parseFloat(b.v));

        // Return Rate retains its original 91-day source window.
        const visitsMap = {}; 

        rrExcel.forEach(r => {
            const phoneStr = r['Клиент'];
            const phone = normPhone(phoneStr);
            const masterRaw = typeof r['Сотрудник'] === 'string' ? r['Сотрудник'].trim() : '';
            if (!masterRaw || masterRaw.toLowerCase() === 'логин') return;
            if (!phone) return;
            
            const loc = getLocFromRow(r);
            const master = ADAPTER.getDashNameByElkassa(masterRaw, loc);
            if (!master) return;

            
            const dateStr = typeof r['Дата'] === 'string' ? r['Дата'].trim() : null;
            let d = null;
            if (dateStr) d = dayjs(dateStr, 'DD.MM.YYYY');
            if (!d || !d.isValid()) return;
            const locFinal = loc || 'Общая сеть';

            if (!visitsMap[phone]) visitsMap[phone] = {};
            const dStrFormatted = d.format('YYYY-MM-DD');
            if (!visitsMap[phone][dStrFormatted]) {
                visitsMap[phone][dStrFormatted] = { date: d, master, loc: locFinal };
            }
        });
        
        console.log(`CYCLE: ${avgCycle}d (${cycleResult.sampleSize} pairs, ${cycleResult.eligibleCustomers} customers)`);

        // ============ NEW COHORT RETURN RATE ============
        totalCohortRet = 0;
        totalCohortBase = 0;
        const rrByMaster = {};
        const rrByLoc = {};
        eligiblePhones = Object.keys(cohorts);

        eligiblePhones.forEach(phone => {
            const allVisits = Object.values(visitsMap[phone] || {}).sort((a,b) => a.date.unix() - b.date.unix());
            if (allVisits.length === 0) return;
            
            totalCohortBase++;

            const firstV = allVisits[0];
            const m = firstV.master;
            const l = firstV.loc;
            
            if (!rrByMaster[m]) rrByMaster[m] = { new: 0, ret: 0 };
            if (!rrByLoc[l]) rrByLoc[l] = { new: 0, ret: 0 };
            
            rrByMaster[m].new++;
            rrByLoc[l].new++;

            const winStart = firstV.date.add(1, 'day').startOf('day');
            const winEnd = firstV.date.add(60, 'day').endOf('day');
            
            const returned = allVisits.some(v => v.date.unix() >= winStart.unix() && v.date.unix() <= winEnd.unix());
            
            if (returned) {
                totalCohortRet++;
                rrByMaster[m].ret++;
                if (l !== 'Общая сеть') rrByLoc[l].ret++;
            }
        });

        // Add overall network to the branch list manually to keep it at the top
        rrByLoc['Общая сеть'] = { new: totalCohortBase, ret: totalCohortRet };

        rrVal = totalCohortBase > 0 ? ((totalCohortRet / totalCohortBase) * 100).toFixed(1) : 0;
        console.log(`NEW RR: ${totalCohortRet}/${totalCohortBase} = ${rrVal}%`);

        rrDrilldown = Object.keys(rrByMaster)
            .map(m => ({
                name: m,
                v: `${((rrByMaster[m].ret / rrByMaster[m].new) * 100).toFixed(1)}% (${rrByMaster[m].ret}/${rrByMaster[m].new})`
            }))
            .sort((a,b) => parseFloat(b.v) - parseFloat(a.v));
            
        rrLocDrilldown = Object.keys(rrByLoc)
            .map(l => ({
                name: l,
                v: `${((rrByLoc[l].ret / rrByLoc[l].new) * 100).toFixed(1)}% (${rrByLoc[l].ret}/${rrByLoc[l].new})`
            }));

        }

        if (runOnline) {
        // ============ YCLIENTS percentage (Month to Date) ============
        let rawYc = [];
        const toAdapterOrder = row => {
            const rawName = typeof (row.employeeName || row['Сотрудник']) === 'string'
                ? String(row.employeeName || row['Сотрудник']).trim()
                : '';
            const terminal = row.terminal_number || row['Терминал (номер)'];
            const location = row['Филиал']
                ? String(row['Филиал']).trim()
                : Object.entries(ADAPTER.ADAPTER || ADAPTER)
                    .find(([, config]) => String(config.el_kassa_terminal) === String(terminal))?.[0] || null;
            const canonical = ADAPTER.getDashNameByElkassa(rawName, location);
            const completed = row.status_pay_show === 'Оплачено'
                || (row['Статус'] === 'Выполнено' && row['Статус оплаты'] === 'Оплачено');
            return canonical ? { ...row, __adapterMaster: canonical, __completed: completed } : null;
        };
        const adapterMonthOrders = curMonthOrders.map(toAdapterOrder).filter(Boolean);
        const adapterOccupancyOrders = curMonthOccupancyOrders.map(toAdapterOrder).filter(Boolean);
        
        try {
            console.log('Fetching YClients records via API...');
            const fetch = require('node-fetch');
            const bearer = 'Bearer u8xzkdpkgfc73uektn64';
            const authRes = await fetch('https://api.yclients.com/api/v1/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': bearer, 'Accept': 'application/vnd.yclients.v2+json' },
                body: JSON.stringify({ login: CONFIG.yLogin, password: CONFIG.yPass })
            });
            if (!authRes.ok) throw new Error(`YClients auth HTTP ${authRes.status}`);
            const authData = await authRes.json();
            const userToken = authData?.data?.user_token;
            if (!userToken) throw new Error('YClients auth returned no user token');

            const ycSDate = now.startOf('month').format('YYYY-MM-DD');
            const ycEDate = now.subtract(1, 'day').format('YYYY-MM-DD'); // Strictly up to yesterday end of day

            const adapterConfig = ADAPTER.ADAPTER || ADAPTER;
            for (const [loc, config] of Object.entries(adapterConfig)) {
                const companyId = config.yclients_company_id;
                if (!companyId) continue;
                
                let pageNum = 1;
                while (true) {
                    const url = `https://api.yclients.com/api/v1/records/${companyId}?start_date=${ycSDate}&end_date=${ycEDate}&count=300&page=${pageNum}`;
                    const res = await fetch(url, {
                        headers: { 
                            'Authorization': userToken ? `${bearer}, User ${userToken}` : bearer, 
                            'Accept': 'application/vnd.yclients.v2+json'
                        }
                    });
                    if (res.ok) {
                        const json = await res.json();
                        const data = json.data || [];
                        data.forEach(r => {
                            if (r.deleted) return;
                            const dashName = typeof ADAPTER.getDashNameByYclientsId === 'function' ? ADAPTER.getDashNameByYclientsId(r.staff_id) : undefined;
                            if (dashName) {
                                rawYc.push({ id: r.id, master: dashName, branch: loc, deleted: false });
                            }
                        });
                        if (data.length < 300) break;
                        pageNum++;
                    } else {
                        throw new Error(`[YClients API] ${loc} HTTP ${res.status}`);
                    }
                }
            }
            const appointmentResult = calculateAppointmentShare({
                orders: adapterMonthOrders.map(row => ({ master: row.__adapterMaster, completed: row.__completed })),
                records: rawYc
            });
            recordsCount = appointmentResult.totalRecords;
            checksCount = appointmentResult.totalServices;
            percentage = appointmentResult.percentage;
            apptMasters = appointmentResult.masters.map(row => ({ name: row.name, v: `${row.percentage}%` }));
            appointmentsReady = true;
            console.log(`[YClients API] Fetched ${recordsCount} active adapter records MTD.`);
        } catch(err) {
            console.log('YClients API parsing failed:', err.message);
            loadErrors.yclients = true;
        }

            if (appointmentsReady) {
                console.log(`MTD Appointments (${startMonth} to ${fetchEnd || 'none'}): ${recordsCount} / ${checksCount} = ${percentage}%`);
            }

            // ============ OCCUPANCY (Master Workload) ============
            // Average sales per day per master for current month. 
            // Exclude days with <= 2 sales or no work.
            const occupancyMap = {}; // { Master: { "DD.MM.YYYY": count } }
            adapterOccupancyOrders.forEach(r => {
                const dateStr = typeof r['Дата'] === 'string' ? r['Дата'].trim() : '';
                if (!dateStr) return;
                const master = r.__adapterMaster;

                if (!occupancyMap[master]) occupancyMap[master] = {};
                occupancyMap[master][dateStr] = (occupancyMap[master][dateStr] || 0) + 1;
            });

            masterOccupancy = [];
            let networkTotalOrders = 0;
            let networkTotalDays = 0;

            Object.keys(occupancyMap).forEach(master => {
                const days = occupancyMap[master];
                let masterTotalOrders = 0;
                let masterValidDays = 0;

                Object.keys(days).forEach(date => {
                    const count = days[date];
                    if (count > 2) { 
                        masterTotalOrders += count;
                        masterValidDays++;
                    }
                });

                if (masterValidDays > 0) {
                    const avg = (masterTotalOrders / masterValidDays).toFixed(1);
                    masterOccupancy.push({ name: master, v: avg + ' ч/д' });
                    networkTotalOrders += masterTotalOrders;
                    networkTotalDays += masterValidDays;
                }
            });

            networkAvg = networkTotalDays > 0 ? (networkTotalOrders / networkTotalDays).toFixed(1) : 0;
            masterOccupancy.sort((a, b) => parseFloat(b.v) - parseFloat(a.v));
        }

            // ============ ANTI-WIPE VALIDATION ============
            if (runFinance && revCur <= 0) {
                console.error("Protecting Dashboard: revCur is 0. ElKassa DOM parsing likely failed.");
                runFinance = false; financeSnapshotReady = false; loadErrors.elkassa = true;
            }
            if (runFinance && revPrev <= 0) {
                // A percentage relative to zero is undefined, not 0%.
                revenueNoData = noComparableRevenue(revenuePeriod, 'Нет сопоставимой выручки за аналогичный период прошлого года.');
                runFinance = false;
            }
            if (runClients && totalCohortBase <= 0) {
                console.error("Protecting Dashboard: cohort base is 0. ElKassa clients Excel likely failed.");
                runClients = false; loadErrors.elkassa = true;
            }
            if (runOnline && checksCount <= 0) {
                console.error("Protecting Dashboard: checksCount is 0. ElKassa orders source likely failed.");
                runOnline = false; loadErrors.elkassa = true;
            }

            // ============ SAVE ============
            const result = {
                errors: { elkassa: loadErrors.elkassa, yclients: loadErrors.yclients },
                lastUpdate: financeSnapshotReady && runClients && runOnline ? now.format('HH:mm DD.MM.YYYY') : (oldData.lastUpdate || now.format('HH:mm DD.MM.YYYY')),
                nextUpdate: financeSnapshotReady && runClients && runOnline ? now.add(60, 'minute').format('HH:mm:ss') : (oldData.nextUpdate || ""),
                revenue: revenueNoData || (runFinance ? {
                    current: revCur, previous: revPrev, today: revToday,
                    period: revenuePeriod.label,
                    growth: parseFloat(growth),
                    drilldown: [{ name: "Общая сеть (без бонусов)", value: revCur.toLocaleString() + " ₽", trend: growth >= 0 ? "up" : "down", masters }]
                } : oldData.revenue),
                returnRate: runClients ? {
                    value: parseFloat(rrVal),
                    period: `${now.subtract(91, 'day').format('DD.MM')}-${now.subtract(61, 'day').format('DD.MM')}`, // 91 to 61 days ago cohort
                    drilldown: [
                        { name: "Общая сеть (91-61д окно)", value: `${totalCohortRet} из ${totalCohortBase} новых`, trend: parseFloat(rrVal) > 30 ? "up" : "down", masters: rrDrilldown },
                        { name: "По филиалам", value: "", trend: "up", masters: rrLocDrilldown }
                    ]
                } : oldData.returnRate,
                salaryWeekly: runSalary ? salaryWeekly : oldData.salaryWeekly,
                cycle: runClients ? {
                    value: parseFloat(avgCycle), change: -3.0,
                    period: cyclePeriod.label,
                    windowDays: 120,
                    minVisitsPerClient: 3,
                    aggregation: 'median',
                    sampleSize: cycleResult.sampleSize,
                    eligibleCustomers: cycleResult.eligibleCustomers,
                    drilldown: [{ name: "По мастерам", value: avgCycle + " д.", trend: "down", masters: cycleDrilldown }]
                } : oldData.cycle,
                appointments: runOnline && appointmentsReady ? {
                    percentage: parseFloat(percentage),
                    period: `${now.startOf('month').format('DD.MM')}-${now.subtract(1, 'day').format('DD.MM')}`,
                    onlineRecords: recordsCount,
                    totalServices: checksCount,
                    source: 'active-adapter-yclients-records / paid-adapter-elkassa-services',
                    drilldown: [{ name: `MTD (${startMonth}-${fetchEnd})`, value: `${recordsCount} / ${checksCount} записей / услуг`, trend: parseFloat(percentage) >= 30 ? "up" : "down", masters: apptMasters }]
                } : oldData.appointments,
                occupancy: runOnline ? {
                    value: parseFloat(networkAvg),
                    period: `${now.startOf('month').format('DD.MM')}-${now.subtract(1, 'day').format('DD.MM')}`,
                    drilldown: [{ name: `Ср. чеков в рабочий день MTD`, value: `${networkAvg} ч/д`, trend: parseFloat(networkAvg) >= 8 ? "up" : "down", masters: masterOccupancy }]
                } : oldData.occupancy
            };
        writeJsonAtomically(CONFIG.dataPath, result);
        console.log(`\n=== [${dayjs().format('HH:mm:ss')}] DONE | Rev:${revCur} Gro:${growth}% Ret:${rrVal}% Cyc:${avgCycle}d Appts:${percentage}% ===`);

    } catch (err) {
        console.error('ERROR:', err);
        // Write error state even on fatal crash
        let safeData = {};
        try { safeData = JSON.parse(fs.readFileSync(CONFIG.dataPath)); } catch(e){}
        if (!safeData.errors) safeData.errors = {};
        if (err.message && String(err.message).toLowerCase().includes('el-kassa')) {
            safeData.errors.elkassa = true;
        } else {
            safeData.errors.general = true;
        }
        writeJsonAtomically(CONFIG.dataPath, safeData);
    } finally {
        if (browser) await browser.close().catch(() => {});
        releaseScrapingLock();
    }
}

async function loop() {
    await run();
    console.log('Next sync in 60 minutes...');
    setTimeout(loop, 3600000); // 60 min after completion
}

if (require.main === module) {
    if (process.argv.includes('--single')) {
        run().then(() => process.exit(0));
    } else {
        loop();
    }
}

module.exports = { acquireScrapingLock, releaseScrapingLock, run, getAnalyticsNow, getRevenueComparisonPeriod, writeJsonAtomically };
