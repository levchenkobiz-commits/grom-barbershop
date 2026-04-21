const fs = require('fs');

const NEW_HEADER = `            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; flex-wrap: wrap; gap: 20px;">
                <div>
                    <h1 class="section-title" style="margin: 0; margin-bottom: 15px;">Кабинет менеджера</h1>
                    <div style="display: flex; align-items: stretch; gap: 15px; flex-wrap: wrap;">
                        <div style="background: rgba(232, 255, 56, 0.1); border: 1px solid var(--accent); padding: 10px 20px; border-radius: 14px; display: flex; align-items: center; gap: 10px;">
                            <span style="color: #fff; font-size: 14px; opacity: 0.8;">Проверок за сегодня:</span>
                            <span id="manager-checks-count" style="color: var(--accent); font-weight: 800; font-size: 18px;">0 / 3</span>
                        </div>
                        <button class="btn-submit" onclick="openManagerModal()" style="width: auto; padding: 10px 28px; border-radius: 14px; font-size: 15px; box-shadow: 0 4px 15px rgba(232, 255, 56, 0.2);">+ Новая проверка</button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-refresh" onclick="openHandbookManagerModal()" style="border-radius: 10px; padding: 10px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 13px;">🗂 Учет штрафов</button>
                    <button class="btn-refresh" onclick="calculateSalaries()" style="border-radius: 10px; padding: 10px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 13px;">💰 Расчет зарплат</button>
                    <button class="btn-refresh" onclick="openManualFineModal()" style="border-radius: 10px; padding: 10px 16px; background: rgba(255, 59, 48, 0.05); border: 1px solid rgba(255, 59, 48, 0.3); color: #FF3B30; font-size: 13px;">🚨 Ручной штраф</button>
                </div>
            </div>`;

let html = fs.readFileSync('index.html', 'utf8');

const regex = /<div id="manager-section" class="tab-content">[\s\S]*?<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">[\s\S]*?<\/div>\s*<\/div>/;

// Wait, the regex above will fail if we are catching too much.
// Better match `<div id="manager-section" class="tab-content">` and the first `div` block after it up to `class="ovn-matrix-container"`

const regex2 = /<div id="manager-section" class="tab-content">[\s\S]*?<div class="ovn-matrix-container"/;
html = html.replace(regex2, `<div id="manager-section" class="tab-content">\n${NEW_HEADER}\n            <div class="ovn-matrix-container"`);

fs.writeFileSync('index.html', html, 'utf8');
