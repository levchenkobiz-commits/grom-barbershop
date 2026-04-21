const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the dev mode login card back to the original Telegram bot
const devRegex = /<div class="login-card">[\s\S]*?<\/div>/;
const origCard = `<div class="login-card">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <img src="logo_v2.png" style="height: 40px; filter: invert(1);" alt="Logo">
            </div>
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Вход в систему</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">Авторизация доступна только через Telegram-бота <b>@grometeambot</b>.</p>
            <button class="login-btn" onclick="window.open('https://t.me/grometeambot?start=login', '_blank')">📱 Войти через Telegram</button>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Получили ссылку в боте? Просто перейдите по ней.</p>
        </div>`;
html = html.replace(devRegex, origCard);
fs.writeFileSync('index.html', html);
console.log('Restored index.html');


let js = fs.readFileSync('mainscript.js', 'utf8');

// Revert mainscript.js window.onload logic
const simulateRegex = /window\.simulateLogin = [\s\S]*?window\.onload = async \(\) => {[\s\S]*?document\.getElementById\('login-screen'\)\.classList\.remove\('hidden'\);\n\s*document\.getElementById\('app-container'\)\.classList\.add\('hidden'\);/m;

const origJs = `        window.onload = async () => {
            // AUTHENTICATION LOGIC (DISABLED TEMPORARILY)
            window.USER = { role: 'owner', name: 'Admin (Auth Disabled)' };
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            initializeApp();`;

js = js.replace(simulateRegex, origJs);

// Second patch: Lates checking global scope
const oldLatesLogic = `                // 2. COUNTER (Remaining)
                const totalMasters = mastersList.length;
                const checkedMastersCount = mastersList.filter(m => checksForSelectedDay.some(r => r.barber === m.name)).length;
                const remaining = totalMasters - checkedMastersCount;
                
                const counterEl = document.getElementById('lates-remaining-count');
                if (remaining > 0) {
                    counterEl.innerText = \`Осталось проверить: \${remaining}\`;
                    counterEl.style.color = "#FF9F0A";
                } else if (totalMasters > 0) {
                    counterEl.innerText = \`Все проверены ✅\`;
                    counterEl.style.color = "#34C759";
                } else {
                    counterEl.innerText = "График не составлен";
                    counterEl.style.color = "var(--text-muted)";
                }`;

const newLatesLogic = `                // 2. COUNTER (Remaining GLOBAL across all branches)
                let totalMastersGlobal = 0;
                let checkedMastersGlobal = 0;
                const checksForSelectedDayGlobal = ovnRes.filter(r => dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date);
                
                schedRes.filter(s => s.date === date).forEach(s => {
                    const branchMasters = s.masters || [];
                    totalMastersGlobal += branchMasters.length;
                    checkedMastersGlobal += branchMasters.filter(m => checksForSelectedDayGlobal.some(r => r.barber === m.name && r.location === s.location)).length;
                });
                
                const remainingGlobal = totalMastersGlobal - checkedMastersGlobal;
                
                const counterEl = document.getElementById('lates-remaining-count');
                if (remainingGlobal > 0) {
                    counterEl.innerText = \`Осталось проверить всего: \${remainingGlobal}\`;
                    counterEl.style.color = "#FF9F0A";
                } else if (totalMastersGlobal > 0) {
                    counterEl.innerText = \`Все точки проверены ✅\`;
                    counterEl.style.color = "#34C759";
                } else {
                    counterEl.innerText = "График не составлен";
                    counterEl.style.color = "var(--text-muted)";
                }`;

js = js.replace(oldLatesLogic, newLatesLogic);
if (!js.includes('Осталось проверить всего:')) {
    console.error("Failed to replace Lates Logic because of formatting mismatch!");
}

fs.writeFileSync('mainscript.js', js);
console.log('Restored mainscript.js');
