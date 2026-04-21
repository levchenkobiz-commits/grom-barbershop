const { chromium } = require('playwright');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const CONFIG = {
    url: 'http://el-kassa.online/login',
    email: 'Levchenko.biz@gmail.com',
    pass: 'Grometeam2026'
};

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Login
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });
    await page.fill('input[name="login"]', CONFIG.email);
    await page.fill('input[name="password"]', CONFIG.pass);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
    console.log('Logged in:', page.url());

    // 1. Check orders page structure
    const ordersUrl = 'http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=01.04.2026+00:00+-+04.04.2026+23:59';
    await page.goto(ordersUrl, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    // Get first 3 rows raw data
    const orderRows = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        return rows.slice(0, 10).map((r, i) => {
            const cells = Array.from(r.querySelectorAll('td'));
            return {
                index: i,
                cellCount: cells.length,
                cellTexts: cells.map((c, ci) => `[${ci}]: ${c.innerText.substring(0, 50)}`),
                rawText: r.innerText.substring(0, 200)
            };
        });
    });
    console.log('\n=== ORDER ROWS (first 10) ===');
    orderRows.forEach(r => {
        console.log(`Row ${r.index} (${r.cellCount} cells):`);
        r.cellTexts.forEach(t => console.log('  ', t));
    });

    // 2. Check ИТОГИ section
    const itogi = page.locator('text=/ИТОГИ/i').first();
    const itogiCount = await itogi.count();
    console.log(`\n=== ИТОГИ found: ${itogiCount} ===`);
    if (itogiCount > 0) {
        await itogi.click();
        await page.waitForTimeout(2000);
        const itogiData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr'));
            return rows.filter(r => r.innerText.includes('Наличные') || r.innerText.includes('Карта') || r.innerText.includes('Итого'))
                .map(r => ({
                    text: r.innerText.substring(0, 150),
                    lastCell: r.querySelector('td:last-child')?.innerText || 'N/A'
                }));
        });
        console.log('ИТОГИ rows:');
        itogiData.forEach(d => console.log('  ', JSON.stringify(d)));
    }

    // 3. Check customer page
    const custUrl = 'http://el-kassa.online/cabinet/customer?form[created_at]=04.01.2026+-+04.04.2026';
    await page.goto(custUrl, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    const custRows = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        return rows.slice(0, 5).map((r, i) => {
            const cells = Array.from(r.querySelectorAll('td'));
            return {
                index: i,
                cellCount: cells.length,
                texts: cells.map((c, ci) => `[${ci}]: ${c.innerText.substring(0, 40)}`),
                raw: r.innerText.substring(0, 150)
            };
        });
    });
    console.log('\n=== CUSTOMER ROWS (first 5) ===');
    custRows.forEach(r => {
        console.log(`Row ${r.index} (${r.cellCount} cells):`);
        r.texts.forEach(t => console.log('  ', t));
    });

    // Check pagination
    const pagerLinks = await page.$$('.kt-datatable__pager-link');
    console.log(`\nPagination links found: ${pagerLinks.length}`);
    
    // Count all phones on page
    const allPhones = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('tr'))
            .map(r => r.innerText.match(/\d{10}/)?.[0])
            .filter(p => p);
    });
    console.log(`Phones found on customer page 1: ${allPhones.length}`);
    console.log(`Sample phones: ${allPhones.slice(0, 5).join(', ')}`);

    await browser.close();
})();
