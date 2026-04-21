const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

(async () => {
    const downloadDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    // Login
    await page.goto('http://el-kassa.online/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="login"]', 'Levchenko.biz@gmail.com');
    await page.fill('input[name="password"]', 'Grometeam2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
    console.log('Logged in');

    // Go to orders page with 90 day filter
    const url = 'http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=04.01.2026+00:00+-+04.04.2026+23:59';
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    // Find Excel button and click it
    console.log('Looking for Excel export button...');
    const excelBtn = page.locator('text=/Excel/i').first();
    const count = await excelBtn.count();
    console.log('Excel button found:', count);

    if (count > 0) {
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 120000 }),
            excelBtn.click()
        ]);
        
        const filePath = path.join(downloadDir, 'orders.xlsx');
        await download.saveAs(filePath);
        console.log('Downloaded to:', filePath);

        // Parse Excel
        const wb = XLSX.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        console.log(`\nTotal rows: ${data.length}`);
        console.log('Columns:', Object.keys(data[0] || {}));
        console.log('\nFirst 3 rows:');
        data.slice(0, 3).forEach((r, i) => console.log(`Row ${i}:`, JSON.stringify(r).substring(0, 300)));
        
        // Check for phone/client column
        const cols = Object.keys(data[0] || {});
        const phoneCol = cols.find(c => c.toLowerCase().includes('телефон') || c.toLowerCase().includes('клиент') || c.toLowerCase().includes('phone'));
        const dateCol = cols.find(c => c.toLowerCase().includes('дата') || c.toLowerCase().includes('date'));
        const masterCol = cols.find(c => c.toLowerCase().includes('сотрудник') || c.toLowerCase().includes('мастер'));
        console.log(`\nPhone column: "${phoneCol}"`);
        console.log(`Date column: "${dateCol}"`);
        console.log(`Master column: "${masterCol}"`);
    }

    await browser.close();
})();
