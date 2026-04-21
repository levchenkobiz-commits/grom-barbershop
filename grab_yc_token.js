const { chromium } = require('playwright');
const fs = require('fs');

const ylogin = '89854291875';
const ypass = 'Googleplay99';

(async () => {
    console.log("Launching headless browser to intercept YClients API...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    let authToken = null;
    
    // Intercept network requests to catch the Bearer token!
    page.on('request', request => {
        const headers = request.headers();
        if (headers['authorization'] && headers['authorization'].toLowerCase().startsWith('bearer ')) {
            if (!authToken) {
                authToken = headers['authorization'];
                console.log("SUCCESS! Caught API Token: " + authToken.substring(0, 30) + "...");
                fs.writeFileSync('yc_auth_token.txt', authToken);
            }
        }
    });

    try {
        console.log("Navigating to YClients main page...");
        await page.goto("https://www.yclients.com/", { waitUntil: 'load', timeout: 30000 });
        
        console.log("Looking for login button...");
        await page.click('text=Войти');
        await page.waitForTimeout(3000);
        
        console.log("Entering credentials...");
        const loginFrame = page.frames().find(f => f.url().includes('login'));
        if (loginFrame) {
             await loginFrame.fill('input[type="tel"]', ylogin);
             await loginFrame.fill('input[type="password"]', ypass);
             await loginFrame.click('button[type="submit"]');
        } else {
             await page.fill('input[type="tel"], input[name="login"]', ylogin);
             await page.fill('input[type="password"], input[name="password"]', ypass);
             await page.click('button[type="submit"]');
        }
        
        console.log("Waiting for dashboard to load and API requests to fire...");
        await page.waitForTimeout(10000);
        
        if (authToken) {
            console.log("\nToken extracted and saved to yc_auth_token.txt");
        } else {
            console.log("\nFailed to extract token.");
            await page.screenshot({ path: 'yc_error2.png' });
        }
    } catch(e) {
        console.error("Error during extraction:", e.message);
        await page.screenshot({ path: 'yc_error2.png' });
    } finally {
        await browser.close();
    }
})();
