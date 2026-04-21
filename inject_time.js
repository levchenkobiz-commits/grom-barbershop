const fs = require('fs');

const MODAL_HTML = `
    <!-- CUSTOM TIME MODAL -->
    <div id="custom-time-modal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h2 style="font-size: 20px; font-weight: 800;">Редактирование времени</h2>
                <button type="button" onclick="closeCustomTimeModal()" style="background:none; border:none; color:var(--text-muted); font-size: 30px; cursor:pointer;">&times;</button>
            </div>
            
            <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="form-field">
                    <label>От (Часов)</label>
                    <select id="custom-time-from" style="width: 100%;">
                        <option value="09">09:00</option>
                        <option value="10">10:00</option>
                        <option value="11">11:00</option>
                        <option value="12">12:00</option>
                        <option value="13">13:00</option>
                        <option value="14">14:00</option>
                        <option value="15">15:00</option>
                    </select>
                </div>
                <div class="form-field">
                    <label>До (Часов)</label>
                    <select id="custom-time-to" style="width: 100%;">
                        <option value="18">18:00</option>
                        <option value="19">19:00</option>
                        <option value="20">20:00</option>
                        <option value="21">21:00</option>
                        <option value="22" selected>22:00</option>
                        <option value="23">23:00</option>
                    </select>
                </div>
            </div>
            
            <button type="button" class="btn-submit" onclick="submitCustomTime()">Применить время</button>
        </div>
    </div>`;

let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('id="custom-time-modal"')) {
    html = html.replace('<!-- MANAGER MODAL -->', MODAL_HTML + '\n\n    <!-- MANAGER MODAL -->');
    fs.writeFileSync('index.html', html, 'utf8');
}

let js = fs.readFileSync('mainscript.js', 'utf8');

const jsCode = `function applyCustomTime() {
            closeTimePicker();
            document.getElementById('custom-time-modal').classList.add('active');
        }

        function closeCustomTimeModal() {
            document.getElementById('custom-time-modal').classList.remove('active');
        }

        function submitCustomTime() {
            const from = document.getElementById('custom-time-from').value;
            const to = document.getElementById('custom-time-to').value;
            applyTime(\`С \${from} до \${to}\`);
            closeCustomTimeModal();
        }`;

// Replace the original applyCustomTime
js = js.replace(/function applyCustomTime\(\) \{[\s\S]*?if \(val\) applyTime\(val\);\s*\}/, jsCode);

fs.writeFileSync('mainscript.js', js, 'utf8');
