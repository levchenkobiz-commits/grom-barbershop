const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERR:', err));
    await page.goto('http://localhost:8080');
    await new Promise(r => setTimeout(r, 1000));
    
    // Explicitly click buttons by evaluating click to avoid intersection issues
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        console.log('Found ' + btns.length + ' buttons');
        for(let b of btns) {
            const attr = b.getAttribute('onclick');
            if(attr && attr.includes('Modal')) {
                console.log('Clicking button with onclick:', attr);
                try {
                    b.click();
                } catch(e) {
                    console.log('Click error:', e);
                }
            }
        }
    });

    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
