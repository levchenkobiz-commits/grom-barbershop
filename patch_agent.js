const fs = require('fs');
let js = fs.readFileSync('agent.js', 'utf8');

// Inside run(), insert runSalary check
const runFlags = `
        const runClients = !process.argv.includes('--module=finance') && !process.argv.includes('--module=online') && !process.argv.includes('--module=salary');
        const runFinance = !process.argv.includes('--module=clients') && !process.argv.includes('--module=online') && !process.argv.includes('--module=salary');
        const runOnline = !process.argv.includes('--module=clients') && !process.argv.includes('--module=finance') && !process.argv.includes('--module=salary');
        const runSalary = process.argv.includes('--module=salary') || (now.day() === 1 && now.hour() === 2);
`;

js = js.replace(/const runClients = [^;]+;\s*const runFinance = [^;]+;\s*const runOnline = [^;]+;/, runFlags);

// Append the runSalary block right before "// ============ DATA MERGE & SAVE ============" or at the end of runOnline block.
const salaryBlock = `
        let salaryWeekly = oldData.salaryWeekly || {};
        if (runSalary) {
            console.log('============ STARTING SALARY REVENUE CRON ============');
            let d = dayjs();
            while (d.day() !== 1) d = d.subtract(1, 'day');
            const lastMon = d.subtract(1, 'week').format('DD.MM.YYYY');
            const lastSun = d.subtract(1, 'day').format('DD.MM.YYYY');
            
            console.log(\`Calculating salary for period: \${lastMon} - \${lastSun}\`);
            
            let curPage = 1;
            let masterTotals = {};
            await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.fill('input[name="login"]', CONFIG.email);
            await page.fill('input[name="password"]', CONFIG.pass);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);

            while (true) {
                const listUrl = \`http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=\${lastMon}+00%3A00+-+\${lastSun}+23%3A59&page=\${curPage}\`;
                console.log("Loading Elkassa page " + curPage);
                await page.goto(listUrl, { waitUntil: 'load', timeout: 60000 });
                await page.waitForTimeout(2000);
                
                const rowsData = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('table tbody tr.row-item'));
                    if(rows.length === 0) {
                        const genericRows = Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.querySelectorAll('td').length > 5);
                        return genericRows.map(r => {
                            const cells = r.querySelectorAll('td');
                            return {
                                master: cells[2] ? cells[2].innerText.trim() : null,
                                realized: cells[4] ? parseFloat(cells[4].innerText.replace(/[^0-9.]/g, '')) || 0 : 0
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
                
                if (rowsData.length === 0) break;
                
                for (let r of rowsData) {
                    if (r.master) {
                        masterTotals[r.master] = (masterTotals[r.master] || 0) + r.realized;
                    }
                }
                
                const hasNext = await page.evaluate(() => {
                    const nextBtn = document.querySelector('li.next:not(.disabled) a') || document.querySelector('a[rel="next"]');
                    return !!nextBtn;
                });
                
                if (!hasNext) break;
                curPage++;
            }
            
            salaryWeekly = {
                start: lastMon,
                end: lastSun,
                calcDate: dayjs().format('DD.MM.YYYY HH:mm'),
                revenue: masterTotals
            };
            console.log("Weekly Salary Revenue Parsed: ", salaryWeekly);
        }
`;

js = js.replace(/(\/\/ ============ EXCEL DOWNLOADS ============)/, salaryBlock + '\n        $1');
js = js.replace(/returnRate:\s*runClients \? ([\s\S]*?) : oldData\.returnRate,/, `returnRate: runClients ? $1 : oldData.returnRate,
                salaryWeekly: runSalary ? salaryWeekly : oldData.salaryWeekly,`);

fs.writeFileSync('agent.js', js);
console.log("agent.js patched");
