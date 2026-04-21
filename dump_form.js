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
        
        // Let's scrape the form element to see the EXACT input names.
        await page.goto('http://el-kassa.online/cabinet/customer');
        await page.waitForTimeout(2000);
        const html = await page.evaluate(() => document.querySelector('form').innerHTML);
        require('fs').writeFileSync('form.html', html);
        console.log("Form saved");
        
    } catch(e) { console.error(e); }
    await browser.close();
})();
