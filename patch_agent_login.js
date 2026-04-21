const fs = require('fs');
let content = fs.readFileSync('agent.js', 'utf8');

const newLoginLogic = `
            try {
                const loginInput = await page.waitForSelector('input[name="login"]', { timeout: 3000 });
                if (loginInput) {
                    await page.fill('input[name="login"]', CONFIG.email);
                    await page.fill('input[name="password"]', CONFIG.pass);
                    await page.click('button[type="submit"]');
                    await page.waitForTimeout(5000);
                    console.log('CRM Auth OK');
                }
            } catch(noLoginForm) {
                console.log('Already logged in or no login form found.');
            }
`;

// Replace first instance
content = content.replace(/await page\.fill\('input\[name="login"\]', CONFIG\.email\);\s+await page\.fill\('input\[name="password"\]', CONFIG\.pass\);\s+await page\.click\('button\[type="submit"\]'\);\s+await page\.waitForTimeout\(5000\);\s+console\.log\('CRM Auth OK'\);/, newLoginLogic);

// Replace second instance
const newLoginLogic2 = `
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

content = content.replace(/await page\.fill\('input\[name="login"\]', CONFIG\.email\);\s+await page\.fill\('input\[name="password"\]', CONFIG\.pass\);\s+await page\.click\('button\[type="submit"\]'\);\s+await page\.waitForTimeout\(5000\);/, newLoginLogic2);

fs.writeFileSync('agent.js', content);
console.log("Agent login logic patched!");
