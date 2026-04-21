const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log("Navigating to dashboard...");
        await page.goto('http://127.0.0.1:8080/#analytics');
        
        // Wait for page to load
        await page.waitForFunction(() => typeof window.startSalaryCalc === 'function', { timeout: 10000 });
        console.log("Scripts loaded.");

        // Open salary modal by calling JS
        console.log("Opening salary modal...");
        await page.evaluate(() => {
            window.openSalaryModal(true);
        });

        // Set dates
        await page.fill('#salary-date-start', '2026-04-06');
        await page.fill('#salary-date-end', '2026-04-12');
        console.log("Dates set to 06.04 - 12.04");

        // Click Calculate
        console.log("Triggering calculation...");
        await page.evaluate(async () => {
            await window.startSalaryCalc();
        });
        
        // Wait for results
        await page.waitForTimeout(2000);
        
        // Extract results
        const results = await page.evaluate(() => {
            const rows = document.querySelectorAll('#salary-table-body tr');
            const footer = document.getElementById('salary-table-footer').innerText;
            const data = [];
            rows.forEach(r => {
                const name = r.children[0].innerText.split('\n')[0];
                const shifts = r.children[3].innerText;
                const payout = r.children[5].innerText;
                data.push({ name, shifts, payout });
            });
            return { masters: data.slice(0, 5), footer };
        });

        console.log("RESULTS FOUND:");
        console.log(JSON.stringify(results, null, 2));

        if (results.masters.length > 0) {
            console.log("SUCCESS: Results populated correctly.");
        } else {
            console.log("FAILURE: Table is empty.");
        }

    } catch (err) {
        console.error("ERROR DURING TEST:", err);
    } finally {
        await browser.close();
    }
})();
