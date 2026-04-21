const { chromium } = require('playwright');
const path = require('path');

(async () => {
    try {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();

        await page.goto('http://217.198.12.156:8080');

        // Bypassing login / Setting role to owner
        await page.evaluate(() => {
            localStorage.setItem('role', 'owner');
            localStorage.setItem('tg_id', '476578323'); // Nikita
        });
        
        // Reload to apply role
        await page.reload({ waitUntil: 'networkidle' });

        // Wait a second for rendering
        await page.waitForTimeout(2000);

        // Click on the analytics tab, if it exists
        // Wait, the new tabs might be `.tab-btn[data-target="analytics-section"]` or similar. But since role is owner, analytics should be the default active section if no other logic intercepts.
        // Actually, mainscript.js lines 50+: let's click the first tab.
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('.tab-btn');
            for(let t of tabs) {
                if(t.textContent.toLowerCase().includes('аналитика')) {
                    t.click();
                    break;
                }
            }
        });

        await page.waitForTimeout(1000);

        const outPath = 'C:\\Users\\Nikita\\.gemini\\antigravity\\brain\\18796762-37f6-484a-a3d2-a1307184e60d\\analytics-glass.png';
        await page.screenshot({ path: outPath, fullPage: true });

        console.log('Screenshot saved to ' + outPath);
        await browser.close();
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
