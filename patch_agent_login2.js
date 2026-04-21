const fs = require('fs');
let content = fs.readFileSync('agent.js', 'utf8');

const regex = /await page\.fill\('input\[name="login"\]',\s*CONFIG\.email\);\s*await page\.fill\('input\[name="password"\]',\s*CONFIG\.pass\);\s*await page\.click\('button\[type="submit"\]'\);\s*await page\.waitForTimeout\(5000\);/;

const newLogic = `
            try {
                const loginInput = await page.waitForSelector('input[name="login"]', { timeout: 3000 });
                if (loginInput) {
                    await page.fill('input[name="login"]', CONFIG.email);
                    await page.fill('input[name="password"]', CONFIG.pass);
                    await page.click('button[type="submit"]');
                    await page.waitForTimeout(5000);
                }
            } catch(noLoginForm) {
                console.log('Already logged in for salary module.');
            }
`;

content = content.replace(regex, newLogic);
fs.writeFileSync('agent.js', content);
console.log("Patched 2nd login block!");
