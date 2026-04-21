const { chromium } = require('playwright');
const XLSX = require('xlsx');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    try {
        await page.goto('http://el-kassa.online/login');
        await page.fill('input[name="login"]', 'Levchenko.biz@gmail.com');
        await page.fill('input[name="password"]', 'Grometeam2026');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(4000);
        
        const urlExport = `http://el-kassa.online/cabinet/customer`;
        await page.goto(urlExport);
        await page.waitForTimeout(4000);
        
        const excelBtn = page.locator('text=/Excel/i').first();
        if (await excelBtn.count() > 0) {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 60000 }),
                excelBtn.click({ noWaitAfter: true })
            ]);
            await download.saveAs('clients_test.xlsx');
            
            const wb = XLSX.readFile('clients_test.xlsx');
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            console.log("Clients Data sample:");
            console.log(data.slice(0, 3));
        } else {
            console.log("No Excel button found on customer page");
        }
        
    } catch(e) { console.error(e); }
    await browser.close();
})();
