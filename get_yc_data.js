const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("Connecting to your local Chrome profile...");
    const userDataDir = "C:\\Users\\Nikita\\AppData\\Local\\Google\\Chrome\\User Data";
    
    let browser;
    try {
        browser = await chromium.launchPersistentContext(userDataDir, {
            headless: true, 
            channel: 'chrome'
        });
        
        const page = await browser.newPage();
        
        console.log("Opening YClients...");
        await page.goto('https://yclients.com/onboarding/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000); // give it time to redirect if logged in
        
        console.log("Current URL:", page.url());
        
        const ls = await page.evaluate(() => JSON.stringify(localStorage));
        fs.writeFileSync('yc_local_storage.json', ls);
        console.log("Saved local storage of YClients.");
        
        // Find token
        const lsObj = JSON.parse(ls || "{}");
        let token = null;
        for (let key in lsObj) {
            if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || lsObj[key].includes('bearer')) {
                console.log(`Potential token key: ${key}`);
            }
        }
        
        // Print all cookies
        const cookies = await browser.cookies('https://yclients.com');
        fs.writeFileSync('yc_cookies.json', JSON.stringify(cookies, null, 2));
        console.log("Saved cookies.");

        await browser.close();
        console.log("Done.");
    } catch (e) {
        console.error("Error accessing Chrome data:", e.message);
        if (browser) await browser.close();
    }
})();
