const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const target1 = `            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <img src="logo_v2.png" style="height: 40px; filter: invert(1);" alt="Logo">
            </div>
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Вход в систему</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">Авторизация доступна только через Telegram-бота <b>@grometeambot</b>.</p>
            <button class="login-btn" onclick="window.open('https://t.me/grometeambot?start=login', '_blank')">📱 Войти через Telegram</button>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Получили ссылку в боте? Просто перейдите по ней.</p>`;

const replace1 = `            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <img src="logo_v2.png" style="height: 40px; filter: invert(1);" alt="Logo">
            </div>
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Авторизация</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Режим имитации сотрудников. Выберите роль для входа в дашборд:</p>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="login-btn" style="margin-top: 0; background: #fff;" onclick="simulateLogin('owner', 'Владелец (admin)')">👑 Я (Владелец)</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('manager', 'Менеджер')">🕵️ Менеджер</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('master', 'Шохназар Д.')">✂️ Мастер</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('ovn', 'Видеомониторинг')">📹 Видеомониторинг</button>
            </div>`;

html = html.replace(target1.replace(/\r/g, ''), replace1);
html = html.replace(target1, replace1);

html = html.replace('<div class="container" id="app-container">', '<div class="container hidden" id="app-container">');

fs.writeFileSync('index.html', html);
console.log('index.html patched');


let js = fs.readFileSync('mainscript.js', 'utf8');

const targetJs1 = `        window.onload = async () => {
            // AUTHENTICATION LOGIC (DISABLED TEMPORARILY)
            window.USER = { role: 'owner', name: 'Admin (Auth Disabled)' };
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            initializeApp();`;

const replaceJs1 = `        window.simulateLogin = (role, name) => {
            window.USER = { role, name };
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            
            // Revert all tabs to visible first, then apply constraints
            document.getElementById('tab-analytics').style.display = 'block';
            document.getElementById('tab-ovn').style.display = 'block';
            document.getElementById('tab-lates').style.display = 'block';
            document.getElementById('tab-manager').style.display = 'block';
            document.getElementById('tab-schedule').style.display = 'block';
            document.getElementById('tab-master').style.display = 'block';
            
            document.getElementById('adapter-btn').style.display = 'none';

            applyRoleConstraints();

            // Default tab selection logic based on role
            if (role === 'owner') switchTab('analytics', document.getElementById('tab-analytics'));
            if (role === 'ovn') switchTab('ovn', document.getElementById('tab-ovn'));
            if (role === 'manager') switchTab('manager', document.getElementById('tab-manager'));
            if (role === 'master') switchTab('master-cabinet', document.getElementById('tab-master'));

            initializeApp();
        };

        window.onload = async () => {
            // AUTHENTICATION LOGIC (DISABLED TEMPORARILY)
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');`;

js = js.replace(targetJs1.replace(/\r/g, ''), replaceJs1);
js = js.replace(targetJs1, replaceJs1);

fs.writeFileSync('mainscript.js', js);
console.log('mainscript.js patched');
