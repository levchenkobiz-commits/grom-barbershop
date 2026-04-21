const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetObj = `            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Вход в систему</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5;">Авторизация доступна только через Telegram-бота <b>@grometeambot</b>.</p>
            <button class="login-btn" onclick="window.open('https://t.me/grometeambot?start=login', '_blank')">📱 Войти через Telegram</button>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Получили ссылку в боте? Просто перейдите по ней.</p>`;

const replaceObj = `            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Вход в систему</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Режим имитации ИИ (Дев-режим):</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="login-btn" style="margin-top: 0; background: #fff; color: #000;" onclick="simulateLogin('owner', 'Владелец (admin)')">👑 Я (Владелец)</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('manager', 'Менеджер')">🕵️ Менеджер</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('master', 'Шохназар Д.')">✂️ Мастер</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('ovn', 'Видеомониторинг')">📹 Видеомониторинг</button>
            </div>`;

// Replace ignoring \r
html = html.replace(targetObj.replace(/\r/g, ''), replaceObj);
html = html.replace(targetObj, replaceObj);

fs.writeFileSync('index.html', html);
console.log('Fixed index.html!');
