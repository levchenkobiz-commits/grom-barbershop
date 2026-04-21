const { chromium } = require('playwright');
const dayjs = require('dayjs');

const Y_LOGIN = '89854291875';
const Y_PASS = 'Googleplay99';
const Y_GROUP_ID = '1115387';

async function prototypeYclients() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Logging into Yclients...');
    await page.goto('https://www.yclients.com/signin', { waitUntil: 'networkidle' });
    
    await page.fill('input[name="email"]', Y_LOGIN);
    await page.fill('input[type="password"]', Y_PASS);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(10000); // 10s wait to allow login to settle
    
    await page.goto(`https://yclients.com/group_dashboard/records/${Y_GROUP_ID}/`, { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(6000);
    
    const recordsHtml = await page.content();
    require('fs').writeFileSync('yc_records.html', recordsHtml);
    console.log('Saved yc_records.html');
    
    await browser.close();
    
    console.log(`Setting dates: ${startMonth} - ${today}`);

    // Since YClients uses a bunch of inputs without clean names, we'll try to find them by placeholder or order.
    // However, it's often easier to execute script on the page to change values, or use the UI.
    try {
        // Let's capture the DOM to understand how the form is built
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('yc_page.html', html);
        console.log('Saved yc_page.html for inspection');
    } catch(e) {
        console.log('Error writing debug file', e);
    }
    
    await browser.close();
}

prototypeYclients();
