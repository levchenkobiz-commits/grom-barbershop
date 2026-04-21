const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// replace err-icon
html = html.replace('.err-icon { color: #FFCC00; font-size: 16px; cursor: help; }', '.err-icon { color: #FFCC00; font-size: 16px; cursor: help; display: none; }');

// add modal
const modalHtml = `
    <!-- HANDBOOK CONFIG MODAL -->
    <div id="handbook-config-modal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h2 style="font-size: 18px; margin: 0">Настройка штрафов</h2>
                <button onclick="closeHandbookConfigModal()" style="background:none; border:none; color: var(--text-muted); cursor:pointer; font-size: 20px;">&times;</button>
            </div>
            
            <div id="handbook-config-list" style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                <!-- Generated dynamically -->
            </div>
            
            <div style="margin-top: 25px; text-align: right;">
                <button class="btn-submit" onclick="saveHandbookConfig()" style="font-size: 14px;">Сохранить изменения</button>
            </div>
        </div>
    </div>
`;
html = html.replace('<!-- FINES MODAL -->', modalHtml + '\n    <!-- FINES MODAL -->');

// Replace the Settings dropdown Учет штрафов -> Настройка штрафов
html = html.replace('onclick="openFinesModal(); toggleSettingsMenu()"', 'onclick="openHandbookConfigModal(); toggleSettingsMenu()"');
html = html.replace('📘 Штраф-лист', '📘 Настройка штрафов');

// Put Учет штрафов back to Manager Cabinet
html = html.replace('<button class="btn-refresh" onclick="openSalaryModal(true)"', '<button class="btn-refresh" onclick="openFinesModal()" style="border-radius: 12px; padding: 10px 20px; background: transparent; border: 1px solid var(--accent); color: var(--accent); font-size: 14px;">\n                        📊 Учет штрафов\n                    </button>\n                    <button class="btn-refresh" onclick="openSalaryModal(true)"');

// Replace all SVGs
const oldSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg>';
const newSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>';
html = html.split(oldSvg).join(newSvg);

fs.writeFileSync('index.html', html);
console.log('index.html updated successfully');
