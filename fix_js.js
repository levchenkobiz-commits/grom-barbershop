const fs = require('fs');
let code = fs.readFileSync('mainscript.js', 'utf8');

const newCode = `
        window.openHandbookConfigModal = function() {
            const listDiv = document.getElementById('handbook-config-list');
            listDiv.innerHTML = '';
            for (const [key, val] of Object.entries(GLOBAL_HANDBOOK)) {
                listDiv.innerHTML += \`
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 5px;">
                        <span style="font-size: 14px;">\${key}</span>
                        <div style="display: flex; align-items: center; gap: 5px;">
                                <span style="color: var(--text-muted); font-size: 14px;">=</span>
                                <input type="number" class="config-val-input" data-key="\${key}" value="\${val}" style="width: 80px; background: transparent; border: 1px solid var(--card-border); color: #fff; padding: 5px; border-radius: 6px; text-align: center;">
                        </div>
                    </div>
                \`;
            }
            document.getElementById('handbook-config-modal').style.display = 'flex';
        };

        window.closeHandbookConfigModal = function() {
            document.getElementById('handbook-config-modal').style.display = 'none';
        };

        window.saveHandbookConfig = async function() {
            const inputs = document.querySelectorAll('.config-val-input');
            let newHandbook = {};
            inputs.forEach(input => {
                newHandbook[input.dataset.key] = parseInt(input.value) || 0;
            });
            try {
                const res = await fetch('/api/handbook', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(newHandbook)
                });
                if (res.ok) {
                    GLOBAL_HANDBOOK = newHandbook;
                    closeHandbookConfigModal();
                } else {
                    alert('Ошибка при сохранении');
                }
            } catch(e) {
                console.error(e);
                alert('Ошибка сети при сохранении');
            }
        };
`;

code = code.replace('document.addEventListener("DOMContentLoaded", () => {', 'document.addEventListener("DOMContentLoaded", () => {\n' + newCode);
fs.writeFileSync('mainscript.js', code);
console.log("mainscript updated");
