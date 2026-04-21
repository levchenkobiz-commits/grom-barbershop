const { chromium } = require('playwright');

const CONFIG = {
    url: 'http://el-kassa.online/login',
    email: 'Levchenko.biz@gmail.com',
    pass: 'Grometeam2026'
};

async function fetchSalaryData(startDate, endDate) {
    console.log(`[SCRAPER] Dedicated fetch for ${startDate} - ${endDate}`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
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
            console.log('Already logged in or no login form.');
        }

        const salaryUrl = `http://el-kassa.online/cabinet/employee/salary`;
        await page.goto(salaryUrl, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(2000);

        // Set date
        await page.evaluate(({start, end}) => {
            const input = document.getElementById('form_date');
            if (input) input.value = `${start} 00:00 - ${end} 23:59`;
        }, { start: startDate, end: endDate });

        // Search
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'load', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
        await page.waitForTimeout(3000);

        const masterData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.querySelectorAll('td').length > 10);
            return rows.map(r => {
                const cells = r.querySelectorAll('td');
                const nameRaw = cells[1].innerText || '';
                const turnoverRaw = cells[12].innerText || '0';
                const lines = nameRaw.split('\n').map(l => l.trim()).filter(l => l);
                const name = lines[0] || '';
                
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

        await browser.close();
        return { revenue: turnoverMap, workDays: workDaysMap };

    } catch (err) {
        console.error('[SCRAPER ERROR]', err);
        await browser.close();
        throw err;
    }
}

module.exports = { fetchSalaryData };
