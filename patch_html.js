const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Add button to Master
html = html.replace(
    '<div style="font-size: 14px; color: var(--text-muted);">Сумма штрафов (мес): <strong id="master-total-fines" style="color: #FF3B30; font-size: 16px;">0 ₽</strong></div>',
    `<div style="font-size: 14px; color: var(--text-muted);">Сумма штрафов (мес): <strong id="master-total-fines" style="color: #FF3B30; font-size: 16px;">0 ₽</strong></div>
                    <button class="btn-refresh" onclick="openSalaryModal(false)" style="padding: 4px 12px; font-size: 12px; border-radius: 8px; border: 1px solid #FF9F0A; color: #FF9F0A;">💰 Моя Зарплата</button>`
);

// Add button to Manager
html = html.replace(
    '<button class="btn-submit" onclick="openManagerModal()" style="width: auto; padding: 10px 20px; border-radius: 12px; font-size: 14px;">',
    `<button class="btn-refresh" onclick="openSalaryModal(true)" style="border-radius: 12px; padding: 10px 20px; background: transparent; border: 1px solid #FF9F0A; color: #FF9F0A; font-size: 14px;">💰 Расчет зарплат</button>
                    <button class="btn-submit" onclick="openManagerModal()" style="width: auto; padding: 10px 20px; border-radius: 12px; font-size: 14px;">`
);

// Insert the Modal html right after <div id="fines-modal" ... </div> ... </div>
const salaryModal = `
    <!-- SALARY MODAL -->
    <div id="salary-modal" class="modal">
        <div class="modal-content" style="max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h2 style="font-size: 24px; font-weight: 700; margin: 0;">💰 Подсчет зарплат</h2>
                <button onclick="document.getElementById('salary-modal').classList.remove('active')" style="background:none; border:none; color:var(--text-muted); font-size: 30px; cursor:pointer;">&times;</button>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: flex-end;">
                <div>
                    <label style="display:block; font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">С (период)</label>
                    <input type="date" id="salary-date-start" style="padding: 10px; border-radius: 12px; background: #111; color: #fff; border: 1px solid #333;">
                </div>
                <div>
                    <label style="display:block; font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">По (включительно)</label>
                    <input type="date" id="salary-date-end" style="padding: 10px; border-radius: 12px; background: #111; color: #fff; border: 1px solid #333;">
                </div>
                <button class="btn-submit" onclick="renderSalaryTable()" style="padding: 10px 20px; border-radius: 12px; font-size: 14px;">
                    ↻ Рассчитать
                </button>
            </div>
            
            <div class="ovn-matrix-container" style="flex: 1; overflow-y: auto; padding: 0;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="position: sticky; top: 0; background: #1A1A1A; z-index: 10;">
                        <tr>
                            <th style="padding: 15px; border-bottom: 1px solid #333; color: var(--text-muted); font-size: 13px;">МАСТЕР</th>
                            <th style="padding: 15px; border-bottom: 1px solid #333; color: var(--text-muted); font-size: 13px;">УСЛОВИЯ</th>
                            <th style="padding: 15px; border-bottom: 1px solid #333; color: var(--text-muted); font-size: 13px; width: 150px;">ВЫРУЧКА (ВВОД)</th>
                            <th style="padding: 15px; border-bottom: 1px solid #333; color: var(--text-muted); font-size: 13px;">СМЕНЫ (ЧАСЫ)</th>
                            <th style="padding: 15px; border-bottom: 1px solid #333; color: var(--text-muted); font-size: 13px;">ШТРАФЫ</th>
                            <th style="padding: 15px; border-bottom: 1px solid #333; color: var(--accent); font-size: 13px; text-align: right;">К ВЫПЛАТЕ</th>
                        </tr>
                    </thead>
                    <tbody id="salary-table-body">
                        <!-- rows -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
`;
html = html.replace('<!-- SALARY MODAL GOES HERE -->', ''); // Cleanup if exists
html = html.replace('<div id="fines-modal" class="modal">', salaryModal + '\n    <div id="fines-modal" class="modal">');

fs.writeFileSync('index.html', html);
console.log('index.html updated successfully');
