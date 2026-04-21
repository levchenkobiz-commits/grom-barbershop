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
        
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
        });
        console.log(links.filter(l => l.text.toLowerCase().includes('клиент') || l.href.includes('client') || l.href.includes('customer')));
    } catch(e) { console.error(e); }
    await browser.close();
})();
