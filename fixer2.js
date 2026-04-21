const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /<div class="login-card">[\s\S]*?<\/div>/;

const newCard = `<div class="login-card">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <img src="logo_v2.png" style="height: 40px; filter: invert(1);" alt="Logo">
            </div>
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">Авторизация</h1>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Режим имитации ИИ (Дев-режим):</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="login-btn" style="margin-top: 0; background: #fff; color: #000;" onclick="simulateLogin('owner', 'Владелец (admin)')">👑 Я (Владелец)</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('manager', 'Менеджер')">🕵️ Менеджер</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('master', 'Шохназар Д.')">✂️ Мастер</button>
                <button class="login-btn" style="margin-top: 0; background: #333; color: #fff;" onclick="simulateLogin('ovn', 'Видеомониторинг')">📹 Видеомониторинг</button>
            </div>
        </div>`;

html = html.replace(regex, newCard);
fs.writeFileSync('index.html', html);
console.log('Fixed index.html properly!');
