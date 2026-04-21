const { chromium } = require('playwright');
const CONFIG = {
    url: 'http://el-kassa.online/login',
    email: 'Levchenko.biz@gmail.com',
    pass: 'Grometeam2026'
};

async function debug() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });
    await page.fill('input[name="login"]', CONFIG.email);
    await page.fill('input[name="password"]', CONFIG.pass);
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle' })
    ]);
    
    console.log('Logged in. URL:', page.url());
    const startDate = '01.04.2026';
    const endDate = '04.04.2026';
    const url = `http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=${startDate}+00:00+-+${endDate}+23:59`;
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    const content = await page.content();
    console.log('Content length:', content.length);
    console.log('Has ИТОГИ:', content.includes('ИТОГИ'));
    
    const heads = await page.$$('.kt-portlet__head');
    console.log('Heads found:', heads.length);
    for(let i=0; i<heads.length; i++) {
        console.log(`Head ${i}:`, await heads[i].innerText());
    }
    
    await browser.close();
}
debug();
