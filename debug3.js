const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://el-kassa.online/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="login"]', 'Levchenko.biz@gmail.com');
    await page.fill('input[name="password"]', 'Grometeam2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});

    // Check orders page pagination
    await page.goto('http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=04.01.2026+00:00+-+04.04.2026+23:59', { waitUntil: 'load' });
    await page.waitForTimeout(4000);

    // Look for pagination elements
    const paginationHTML = await page.evaluate(() => {
        // Find all elements that look like pagination
        const els = document.querySelectorAll('[class*="pager"], [class*="pagination"], [class*="page"], nav, .pagination, ul.pagination');
        const results = [];
        els.forEach(e => results.push({ tag: e.tagName, class: e.className, text: e.innerText.substring(0, 100) }));
        
        // Also look for links with page numbers
        const links = document.querySelectorAll('a[href*="page"]');
        const linkResults = [];
        links.forEach(l => linkResults.push({ href: l.href, text: l.innerText }));
        
        // Check total rows
        const allRows = document.querySelectorAll('tr');
        const dataRows = Array.from(document.querySelectorAll('tr')).filter(r => r.querySelectorAll('td').length >= 10);
        
        // Check for any "next" or ">" buttons
        const nextBtns = document.querySelectorAll('a.next, .next, [rel="next"], a[aria-label="Next"]');
        
        return {
            paginationElements: results,
            pageLinks: linkResults,
            totalRows: allRows.length,
            dataRows: dataRows.length,
            nextButtons: nextBtns.length,
            pageURL: window.location.href
        };
    });
    
    console.log('=== PAGINATION DEBUG ===');
    console.log(JSON.stringify(paginationHTML, null, 2));

    // Check what the URL looks like - does it support &page=2?
    console.log('\n=== Trying page 2 ===');
    await page.goto('http://el-kassa.online/cabinet/order?form[status]=completed&form[date]=04.01.2026+00:00+-+04.04.2026+23:59&page=2', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    const page2Data = await page.evaluate(() => {
        const dataRows = Array.from(document.querySelectorAll('tr')).filter(r => r.querySelectorAll('td').length >= 10);
        return { rows: dataRows.length, firstRowText: dataRows[0]?.innerText?.substring(0, 80) || 'N/A' };
    });
    console.log('Page 2:', JSON.stringify(page2Data));

    await browser.close();
})();
