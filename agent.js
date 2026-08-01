const { chromium } = require('playwright');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
dayjs.extend(customParseFormat);
dayjs.extend(quarterOfYear);
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const ADAPTER = require('./adapter');

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
    console.log(`\n=== [${dayjs().format('HH:mm:ss')}] GROME FULL SYNC (EXCEL EXTRACTOR) ===`);
    let browser;

    let loadErrors = { yclients: false, elkassa: false };

    try {
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

        const now = dayjs().subtract(9, 'hours');
        const todayStr = now.format('DD.MM.YYYY');
        const yesterdayStr = now.subtract(1, 'day').format('DD.MM.YYYY');
        const startQ = now.startOf('quarter').format('DD.MM.YYYY');
        const startPrevQ = now.subtract(1, 'year').startOf('quarter').format('DD.MM.YYYY');
        // If yesterday is what we use for current Q, let's use corresponding day for prev Q
        const endPrevQ = now.subtract(1, 'year').subtract(1, 'day').format('DD.MM.YYYY');
        const ninetyDaysAgo = now.subtract(91, 'day').format('DD.MM.YYYY');
        
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

        
        const runClients = !process.argv.includes('--module=finance') && !process.argv.includes('--module=online') && !process.argv.includes('--module=salary');
        const runFinance = !process.argv.includes('--module=clients') && !process.argv.includes('--module=online') && !process.argv.includes('--module=salary');
        const runOnline = !process.argv.includes('--module=clients') && !process.argv.includes('--module=finance') && !process.argv.includes('--module=salary');
        const runSalary = process.argv.includes('--module=salary') || (now.day() === 1 && now.hour() === 2);


        let revCur = 0, revPrev = 0, revToday = 0, growth = 0;
        let avgCycle = 0, cycleCount = 0, totalCohortRet = 0, totalCohortBase = 0, eligiblePhones = [];
        let rrVal = 0, percentage = 0, checksCount = 0, recordsCount = 0;
        let cycleDrilldown = [], rrDrilldown = [], rrLocDrilldown = [], apptMasters = [], masterOccupancy = [], masters = [];
        let networkAvg = 0;

        const startMonth = now.startOf('month').format('DD.MM.YYYY');

        // Try load existing data.json to preserve other tabs' data if skipping them
        let oldData = {};
        if (fs.existsSync(CONFIG.dataPath)) {
            try { oldData = JSON.parse(fs.readFileSync(CONFIG.dataPath)); } catch(e){}
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
                if (m.name) {
                    turnoverMap[m.name] = m.turnover;
                    workDaysMap[m.name] = m.workDays;
                }
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
        let curExcel = []; 
        let curMonthOrders = [];
        const fetchEnd = yesterdayStr; // Strictly up to yesterday end of day

        if (runClients) {
            curExcel = await getExcelData(ninetyDaysAgo, yesterdayStr, 'CUR_90D');
        }
        if (runOnline) {
            curMonthOrders = await getExcelData(startMonth, fetchEnd, 'MTD_ORDERS');
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
        
        // Find active masters in last 14 days
        const fourteenDaysAgoMoment = now.subtract(14, 'day');
        const activeMasters = new Set();

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

        curExcel.forEach(r => {
            const masterRaw = typeof r['Сотрудник'] === 'string' ? r['Сотрудник'].trim() : '';
            if (!masterRaw || masterRaw.toLowerCase() === 'логин') return;
            const loc = getLocFromRow(r);
            const master = ADAPTER.getDashNameByElkassa(masterRaw, loc) || masterRaw;
            const dStr = typeof r['Дата'] === 'string' ? r['Дата'].trim() : null;
            if (!dStr) return;
            const d = dayjs(dStr, 'DD.MM.YYYY');
            if (d.isValid() && d.unix() >= fourteenDaysAgoMoment.unix()) {
                activeMasters.add(master);
            }
        });

        // 1 Client + 1 Day = 1 Visit
        const visitsMap = {}; 
        let totalCycleSum = 0, cycleCount = 0;
        const masterCycles = {};

        curExcel.forEach(r => {
            const phoneStr = r['Клиент'];
            const phone = normPhone(phoneStr);
            const masterRaw = typeof r['Сотрудник'] === 'string' ? r['Сотрудник'].trim() : '';
            if (!masterRaw || masterRaw.toLowerCase() === 'логин') return;
            if (!phone) return;
            
            const loc = getLocFromRow(r);
            const master = ADAPTER.getDashNameByElkassa(masterRaw, loc) || masterRaw;

            
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
        
        // ============ CYCLE ============
        Object.keys(visitsMap).forEach(phone => {
            const visits = Object.values(visitsMap[phone]).sort((a, b) => a.date.unix() - b.date.unix());
            if (visits.length >= 2) {
                let diffSum = 0, validDiffs = 0;
                for (let i = 1; i < visits.length; i++) {
                    const diff = visits[i].date.diff(visits[i - 1].date, 'day');
                    if (diff > 0) { diffSum += diff; validDiffs++; }
                }
                if (validDiffs > 0) {
                    const avg = diffSum / validDiffs;
                    totalCycleSum += avg;
                    cycleCount++;
                    const lastMaster = visits[visits.length - 1].master;
                    if (!masterCycles[lastMaster]) masterCycles[lastMaster] = { sum: 0, count: 0 };
                    masterCycles[lastMaster].sum += avg;
                    masterCycles[lastMaster].count++;
                }
            }
        });

        avgCycle = cycleCount > 0 ? (totalCycleSum / cycleCount).toFixed(1) : 0;
        console.log(`CYCLE: ${avgCycle}d (${cycleCount} returning)`);

        cycleDrilldown = Object.keys(masterCycles)
            .map(m => ({ name: m, v: (masterCycles[m].sum / masterCycles[m].count).toFixed(1) + ' д.' }))
            .sort((a, b) => parseFloat(a.v) - parseFloat(b.v));

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
        
        try {
            console.log('Fetching YClients records via API...');
            const fetch = require('node-fetch');
            const bearer = 'Bearer u8xzkdpkgfc73uektn64';
            const authRes = await fetch('https://api.yclients.com/api/v1/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': bearer, 'Accept': 'application/vnd.yclients.v2+json' },
                body: JSON.stringify({ login: CONFIG.yLogin, password: CONFIG.yPass })
            });
            let userToken = '';
            if (authRes.ok) {
                const authData = await authRes.json();
                userToken = authData.data.user_token;
            } else {
                console.warn('Failed to get YClients User Token, proceeding with only Bearer.');
            }

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
                                rawYc.push({ 'Сотрудник': dashName, 'Филиал': loc });
                            }
                        });
                        if (data.length < 300) break;
                        pageNum++;
                    } else {
                        console.error(`[YClients API] Error fetching ${loc}:`, await res.text());
                        break;
                    }
                }
            }
            recordsCount = rawYc.length;
            console.log(`[YClients API] Fetched ${recordsCount} active records MTD.`);
        } catch(err) {
            console.log('YClients API parsing failed:', err.message);
            loadErrors.yclients = true;
        }


            
            checksCount = curMonthOrders.length;
            percentage = checksCount > 0 ? ((recordsCount / checksCount) * 100).toFixed(1) : 0;
            console.log(`MTD Orders (${startMonth} to ${fetchEnd || 'none'}): ${checksCount} | Online: ${recordsCount} | Ratio: ${percentage}%`);

            // Break down online percentage by master
            const yclientsMap = {};
            rawYc.forEach(r => {
                const master = r['Сотрудник'];
                if (!master) return;
                yclientsMap[master] = (yclientsMap[master] || 0) + 1;
            });
            const elkassaMap = {};
            curMonthOrders.forEach(r => {
                const eName = r['Сотрудник'] || '';
                if (!eName || eName.toLowerCase() === 'логин') return;
                const loc = r['Филиал'] ? String(r['Филиал']).trim() : null;
                const master = typeof ADAPTER !== 'undefined' ? ADAPTER.getDashNameByElkassa(String(eName).trim(), loc) : eName;
                elkassaMap[master] = (elkassaMap[master] || 0) + 1;
            });
            Object.keys(elkassaMap).forEach(m => {
                if (!m || m === 'Неизвестный' || m === 'логин') return;
                const eCount = elkassaMap[m];
                const yCount = yclientsMap[m] || 0;
                let perc = 0;
                if (eCount > 0) perc = Math.round((yCount / eCount) * 100);
                apptMasters.push({ name: m, v: perc + '%' });
            });

            // ============ OCCUPANCY (Master Workload) ============
            // Average sales per day per master for current month. 
            // Exclude days with <= 2 sales or no work.
            const occupancyMap = {}; // { Master: { "DD.MM.YYYY": count } }
            curMonthOrders.forEach(r => {
                const masterRaw = typeof r['Сотрудник'] === 'string' ? r['Сотрудник'].trim() : '';
                const dateStr = typeof r['Дата'] === 'string' ? r['Дата'].trim() : '';
                if (!masterRaw || !dateStr || masterRaw.toLowerCase() === 'логин') return;
                const loc = r['Филиал'] ? String(r['Филиал']).trim() : null;
                const master = typeof ADAPTER !== 'undefined' ? ADAPTER.getDashNameByElkassa(masterRaw, loc) : masterRaw;

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
                runFinance = false; loadErrors.elkassa = true;
            }
            if (runClients && totalCohortBase <= 0) {
                console.error("Protecting Dashboard: cohort base is 0. ElKassa clients Excel likely failed.");
                runClients = false; loadErrors.elkassa = true;
            }
            if (runOnline && checksCount <= 0) {
                console.error("Protecting Dashboard: checksCount is 0. ElKassa orders Excel likely failed.");
                runOnline = false; loadErrors.elkassa = true;
            }

            // ============ SAVE ============
            const result = {
                errors: { elkassa: loadErrors.elkassa, yclients: loadErrors.yclients },
                lastUpdate: runFinance && runClients && runOnline ? dayjs().format('HH:mm DD.MM.YYYY') : (oldData.lastUpdate || dayjs().format('HH:mm DD.MM.YYYY')),
                nextUpdate: runFinance && runClients && runOnline ? dayjs().add(60, 'minute').format('HH:mm:ss') : (oldData.nextUpdate || ""),
                revenue: runFinance ? {
                    current: revCur, previous: revPrev, today: revToday,
                    period: `${startQMoment.format('DD.MM')}-${now.subtract(1,'day').format('DD.MM')}`,
                    growth: parseFloat(growth),
                    drilldown: [{ name: "Общая сеть (без бонусов)", value: revCur.toLocaleString() + " ₽", trend: growth >= 0 ? "up" : "down", masters }]
                } : oldData.revenue,
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
                    period: `${now.subtract(91, 'day').format('DD.MM')}-${now.subtract(1, 'day').format('DD.MM')}`,
                    drilldown: [{ name: "По мастерам", value: avgCycle + " д.", trend: "down", masters: cycleDrilldown }]
                } : oldData.cycle,
                appointments: runOnline ? {
                    percentage: parseFloat(percentage),
                    period: `${now.startOf('month').format('DD.MM')}-${now.subtract(1, 'day').format('DD.MM')}`,
                    drilldown: [{ name: `MTD (${startMonth}-${fetchEnd})`, value: `${recordsCount} / ${checksCount} онлайн`, trend: parseFloat(percentage) >= 30 ? "up" : "down", masters: apptMasters }]
                } : oldData.appointments,
                occupancy: runOnline ? {
                    value: parseFloat(networkAvg),
                    period: `${now.startOf('month').format('DD.MM')}-${now.subtract(1, 'day').format('DD.MM')}`,
                    drilldown: [{ name: `Ср. чеков в рабочий день MTD`, value: `${networkAvg} ч/д`, trend: parseFloat(networkAvg) >= 8 ? "up" : "down", masters: masterOccupancy }]
                } : oldData.occupancy
            };
        fs.writeFileSync(CONFIG.dataPath, JSON.stringify(result, null, 2));
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
        fs.writeFileSync(CONFIG.dataPath, JSON.stringify(safeData, null, 2));
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

module.exports = { acquireScrapingLock, releaseScrapingLock, run };
