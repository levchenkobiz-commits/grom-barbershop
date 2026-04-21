const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /<!-- LOGIN SCREEN -->[\s\S]*?<!-- WELCOME ANIMATION -->/;

const replacement = `<!-- LOGIN SCREEN -->
    <div id="login-screen" class="login-wrapper hidden">
        <div class="login-card">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <img src="logo_v2.png" style="height: 40px; filter: invert(1);" alt="Logo">
            </div>
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Вход в систему</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">Авторизация доступна только через Telegram-бота <b>@grometeambot</b>.</p>
            <button class="login-btn" onclick="window.open('https://t.me/grometeambot?start=login', '_blank')">📱 Войти через Telegram</button>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Получили ссылку в боте? Просто перейдите по ней.</p>
        </div>
    </div>

    <!-- WELCOME ANIMATION -->`;

html = html.replace(regex, replacement);
fs.writeFileSync('index.html', html);
console.log('Fixed login bug');
