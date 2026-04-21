const fs = require('fs');

let ms = fs.readFileSync('mainscript.js', 'utf8');

const logic = `
// ==== HANDBOOK SETTINGS MODAL ====
window.openHandbookConfigModal = function() {
    document.getElementById('handbook-config-modal').classList.add('active');
    renderHandbookEditor();
};

window.closeHandbookConfigModal = function() {
    document.getElementById('handbook-config-modal').classList.remove('active');
};

window.renderHandbookEditor = function() {
    const container = document.getElementById('handbook-editor-container');
    if (!container) return;
    
    let html = '';
    // GLOBAL_HANDBOOK is defined globally
    for (const [key, val] of Object.entries(window.GLOBAL_HANDBOOK || {})) {
        html += \`
            <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding:10px 15px; border-radius:10px; border: 1px solid rgba(255,255,255,0.05);">
                <span class="handbook-key" style="font-size:15px; font-weight:500;">\${key}</span>
                <div style="display:flex; align-items:center;">
                    <input type="number" class="handbook-val-input" data-key="\${key}" value="\${val}" style="width: 80px; background: rgba(255,255,255,0.1); border:none; color:white; padding:8px; border-radius:6px; font-weight:bold; outline:none; text-align:right;">
                    <span style="color:var(--text-muted); margin-left:8px; font-size:14px;">₽</span>
                </div>
            </div>
        \`;
    }
    
    // Add "Add new penalty" row
    html += \`
        <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding:10px 15px; border-radius:10px; border: 1px dashed rgba(255,255,255,0.2); margin-top:10px;">
            <input type="text" id="new-handbook-key" placeholder="Новое нарушение" style="flex:1; background:transparent; border:none; color:white; outline:none; font-size:14px;">
            <div style="display:flex; align-items:center; margin-left: 10px;">
                <input type="number" id="new-handbook-val" placeholder="0" style="width: 70px; background: rgba(255,255,255,0.1); border:none; color:white; padding:8px; border-radius:6px; font-weight:bold; outline:none; text-align:right;">
                <span style="color:var(--text-muted); margin-left:8px; font-size:14px;">₽</span>
            </div>
        </div>
    \`;
    container.innerHTML = html;
};

window.saveHandbook = async function() {
    const inputs = document.querySelectorAll('.handbook-val-input');
    const newHb = {};
    
    // Keep existing items
    inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        const val = parseInt(inp.value) || 0;
        newHb[key] = val;
    });
    
    // Check if there is a new item
    const newKeyInp = document.getElementById('new-handbook-key');
    const newValInp = document.getElementById('new-handbook-val');
    if (newKeyInp && newKeyInp.value.trim() !== '') {
        const nKey = newKeyInp.value.trim();
        const nVal = parseInt(newValInp.value) || 0;
        newHb[nKey] = nVal;
    }
    
    // Save to server
    try {
        const res = await fetch('/api/handbook', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newHb)
        });
        
        if (res.ok) {
            window.GLOBAL_HANDBOOK = newHb;
            if(window.showToast) window.showToast('Справочник штрафов сохранен!');
            else alert('Успешно');
            closeHandbookConfigModal();
            // trigger re-rendering of fines
            if(window.renderSalary) window.renderSalary(window.SALARIES_CACHE, window.LAST_SCHEDULE);
        } else {
            throw new Error('Server error');
        }
    } catch(e) {
        if(window.showToast) window.showToast('Ошибка сохранения: ' + e.message, 'error');
        console.error(e);
    }
};
`;

ms = ms + "\n" + logic;

fs.writeFileSync('mainscript.js', ms);
console.log("Appended handbook modal functions");
