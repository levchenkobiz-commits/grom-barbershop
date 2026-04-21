const playwright = require('playwright');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'http://el-kassa.online/login',
    email: 'Levchenko.biz@gmail.com',
    pass: 'Grometeam2026'
};

async function fetchWeeklySalary() {
    // Determine previous week's Monday and Sunday
    // dayjs day() is 0 (Sunday) to 6 (Saturday)
    let d = dayjs();
    while (d.day() !== 1) {
        d = d.subtract(1, 'day'); // Go back to Monday
    }
    const lastMon = d.subtract(1, 'week').format('DD.MM.YYYY');
    const lastSun = d.subtract(1, 'day').format('DD.MM.YYYY');
    
    console.log(`Calculating salary for period: ${lastMon} - ${lastSun}`);

    let browser;
    try {
        browser = await playwright.chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.fill('input[name="login"]', CONFIG.email);
        await page.fill('input[name="password"]', CONFIG.pass);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);

        let curPage = 1;
        let masterTotals = {};
        
        while (true) {
            const listUrl = `http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=${lastMon}+00%3A00+-+${lastSun}+23%3A59&page=${curPage}`;
            console.log("Loading page " + curPage);
            await page.goto(listUrl, { waitUntil: 'load', timeout: 60000 });
            await page.waitForTimeout(2000);
            
            const rowsData = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr.row-item'));
                if(rows.length === 0) {
                    // try generic tr if class not present
                    const genericRows = Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.querySelectorAll('td').length > 5);
                    return genericRows.map(r => {
                        const cells = r.querySelectorAll('td');
                        return {
                            master: cells[2] ? cells[2].innerText.trim() : null, // Column 3
                            realized: cells[4] ? parseFloat(cells[4].innerText.replace(/[^0-9.]/g, '')) || 0 : 0 // Column 5
                        };
                    });
                }
                return rows.map(r => {
                    const cells = r.querySelectorAll('td');
                    return {
                        master: cells[2] ? cells[2].innerText.trim() : null,
                        realized: cells[4] ? parseFloat(cells[4].innerText.replace(/[^0-9.]/g, '')) || 0 : 0
                    };
                });
            });
            
            if (rowsData.length === 0) {
                console.log("No more rows found.");
                break;
            }
            
            for (let r of rowsData) {
                if (r.master) {
                    masterTotals[r.master] = (masterTotals[r.master] || 0) + r.realized;
                }
            }
            
            // Check next page
            const hasNext = await page.evaluate(() => {
                const nextBtn = document.querySelector('li.next:not(.disabled) a') || document.querySelector('a[rel="next"]');
                return !!nextBtn;
            });
            
            if (!hasNext) break;
            curPage++;
        }
        
        console.log("Calculated Totals:", masterTotals);
        fs.writeFileSync(path.join(__dirname, 'weekly_salary_rev.json'), JSON.stringify({
            start: lastMon,
            end: lastSun,
            revenue: masterTotals
        }, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        if (browser) await browser.close();
    }
}

fetchWeeklySalary();
