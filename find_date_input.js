const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto('http://el-kassa.online/login');
        await page.fill('input[name="login"]', 'Levchenko.biz@gmail.com');
        await page.fill('input[name="password"]', 'Grometeam2026');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(4000);
        
        await page.goto('http://el-kassa.online/cabinet/customer');
        await page.waitForTimeout(2000);
        const name = await page.evaluate(() => {
            const el = document.querySelector('input[placeholder="01.01.2021 00:00 - 31.12.2025 23:59"]') || document.querySelector('input.form-control.daterange');
            return el ? el.name : 'Not found';
        });
        require('fs').writeFileSync('input_name.txt', name);
    } catch(e) { console.error(e); }
    await browser.close();
})();
