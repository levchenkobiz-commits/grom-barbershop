const { chromium } = require('playwright');
async function run() {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://www.yclients.com/signin', { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    const html = await page.content();
    const forms = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
    forms.forEach(f => {
        const clean = f.replace(/<svg.*?>.*?<\/svg>/g, '').replace(/\s+/g, ' ');
        console.log("FORM:", clean);
    });
    await browser.close();
}
run();
