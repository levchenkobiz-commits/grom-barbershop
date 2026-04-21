const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testYclients() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    console.log("Navigating to yclients...");
    try {
        await page.goto('https://www.yclients.com/signin', { waitUntil: 'load', timeout: 30000 });
        console.log("Loaded. Taking screenshot...");
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(__dirname, 'yc_debug.png') });
        const html = await page.content();
        fs.writeFileSync(path.join(__dirname, 'yc_debug.html'), html);
        console.log("Saved HTML");
    } catch(e) {
        console.error("Error:", e.message);
    }
    await browser.close();
}

testYclients();
