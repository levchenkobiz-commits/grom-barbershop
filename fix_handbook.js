const fs = require('fs');

let ms = fs.readFileSync('mainscript.js', 'utf8');

// Replace everything from window.renderHandbookEditor up to and including window.saveHandbookConfig
// using a regular expression.
const regex = /window\.renderHandbookEditor[\s\S]*?window\.saveHandbookConfig.*?\n}[\s\S]*?\};/m;

const replacement = `window.renderHandbookEditor = function() {
    const container = document.getElementById('handbook-config-list');
    if (!container) return;
    
    let html = '';
    // Ensure GLOBAL_HANDBOOK is populated
    const hb = window.GLOBAL_HANDBOOK || {};
    
    // Auto-seed missing ones for convenience based on what is commonly used
    const commonKeys = [
        "Опоздание", "Невыход", "Воровство", "Грязное место", "Без формы", 
        "Разговор на нац. языке", "Отказ клиенту", "Жалоба", "Поломка",
        "Про акцию не сказал", "Телефон при клиенте", "Неоплаченная стрижка",
        "Не показал зеркало заднего вида", "Не обработал инструмент", "Другое"
    ];
    
    commonKeys.forEach(k => {
        if (hb[k] === undefined) hb[k] = 0;
    });
    
    for (const [key, val] of Object.entries(hb)) {
        html += \`
            <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding:10px 15px; border-radius:10px; border: 1px solid rgba(255,255,255,0.05); margin-bottom:10px;">
                <span class="handbook-key" style="font-size:15px; font-weight:500;">\${key}</span>
                <div style="display:flex; align-items:center;">
                    <input type="number" class="handbook-val-input" data-key="\${key}" value="\${val}" style="width: 80px; background: rgba(255,255,255,0.1); border:none; color:white; padding:8px; border-radius:6px; font-weight:bold; outline:none; text-align:right;">
                    <span style="color:var(--text-muted); margin-left:8px; margin-right:15px; font-size:14px;">₽</span>
                    <button onclick="deleteHandbookItem('\${key}')" title="Удалить" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;">
                        🗑️
                    </button>
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

window.deleteHandbookItem = async function(key) {
    if(!confirm("Удалить нарушение '" + key + "'?")) return;
    delete window.GLOBAL_HANDBOOK[key];
    await window.saveHandbookConfig(true); // pass true to render immediately without closing
};

window.saveHandbookConfig = async function(keepOpen = false) {
    const inputs = document.querySelectorAll('.handbook-val-input');
    const newHb = {};
    
    // Keep existing items from inputs
    inputs.forEach(inp => {
        const key = inp.getAttribute('data-key'); // Use actual extracted key
        if (window.GLOBAL_HANDBOOK.hasOwnProperty(key)) { // check deleted
            const val = parseInt(inp.value) || 0;
            newHb[key] = val;
        }
    });
    
    // Check if there is a new item
    const newKeyInp = document.getElementById('new-handbook-key');
    const newValInp = document.getElementById('new-handbook-val');
    if (newKeyInp && newKeyInp.value.trim() !== '') {
        const nKey = newKeyInp.value.trim();
        const nVal = parseInt(newValInp.value) || 0;
        newHb[nKey] = nVal;
        
        // Add to global directly so we remember it
        window.GLOBAL_HANDBOOK[nKey] = nVal;
    }
    
    // To handle deletion, if it's missing from inputs but present in GLOBAL_HANDBOOK, it probably was deleted.
    // Wait, the easiest way is just to take window.GLOBAL_HANDBOOK keys and sync their values.
    const finalHb = {};
    for (const key of Object.keys(window.GLOBAL_HANDBOOK)) {
        if (newHb[key] !== undefined) finalHb[key] = newHb[key];
        else finalHb[key] = window.GLOBAL_HANDBOOK[key];
    }
    
    // Save to server
    try {
        const res = await fetch('/api/handbook', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalHb)
        });
        
        if (res.ok) {
            window.GLOBAL_HANDBOOK = finalHb;
            if(!keepOpen) {
                 if(window.showToast) window.showToast('Справочник штрафов сохранен!');
                 closeHandbookConfigModal();
            } else {
                 renderHandbookEditor();
            }
            if(window.renderSalary) window.renderSalary(window.SALARIES_CACHE, window.LAST_SCHEDULE);
        } else {
            throw new Error('Server error');
        }
    } catch(e) {
        if(window.showToast) window.showToast('Ошибка сохранения: ' + e.message, 'error');
        console.error(e);
    }
};`;

if(regex.test(ms)) {
   ms = ms.replace(regex, replacement);
   fs.writeFileSync('mainscript.js', ms);
   console.log("Replaced implementation");
} else {
   console.error("COULD NOT FIND REGEX!");
}
