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
        await page.waitForTimeout(5000);
        
        console.log("Filling...");
        await page.locator('.sign-in__field-login').locator('input').fill('test');
        await page.locator('.sign-in__field-password').locator('input').fill('test');
        await page.locator('.sign-in__button-sign-in').click();
        
        console.log("Success! Clicked login.");
    } catch(e) {
        console.error("Error:", e.message);
    }
    await browser.close();
}

testYclients();
