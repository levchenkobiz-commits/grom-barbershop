const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

// Restore lost CSS block
const brokenStart = '::-webkit-scrollbar-track { background: var(--bg); }';
const brokenEnd = 'word-wrap: break-word;';

const originalBlock = `::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 10px; }

        /* Schedule Grid Styles */
        .sched-table-wrapper { 
            width: 100%; overflow-x: auto; background: var(--card-bg); 
            backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); border-radius: 20px; border: 1px solid var(--card-border);
            margin-top: 20px;
        }
        .sched-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .sched-table th, .sched-table td { 
            border: 1px solid rgba(255,255,255,0.05); 
            padding: 8px 6px; text-align: center; min-width: 90px;
            white-space: normal;
            word-wrap: break-word;`;

if (content.includes(brokenStart) && content.includes(brokenEnd)) {
    content = content.replace(new RegExp(brokenStart + '[\\s\\S]*?' + brokenEnd), originalBlock);
    console.log("Restored CSS block.");
}

// Add Analytic Card icons CSS
const cssToInsert = `
        .analytic-card { position: relative; }
        .card-icons {
            position: absolute; top: 12px; right: 12px;
            display: flex; gap: 8px; align-items: center; z-index: 5;
        }
        .btn-refresh-cell { 
            cursor: pointer; color: var(--text-muted); background: none; 
            border: none; outline: none; padding: 4px; border-radius: 6px;
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .btn-refresh-cell:hover { background: rgba(255,255,255,0.05); color: var(--accent); }
        .err-icon { color: #FFCC00; font-size: 16px; cursor: help; }
`;

if (!content.includes('.card-icons')) {
    const insertPoint = '.tooltip-wrapper:hover .tooltip-text { display: block !important; }';
    content = content.replace(insertPoint, insertPoint + cssToInsert);
    console.log("Inserted analytic card icons CSS.");
}

// Fix Cards HTML
const cardRegex = /<div class="card analytic-card" onclick="toggleDrilldown\('([^']+)'\)">[\s\S]*?<div class="card-label">([^<]+) <button class="btn-refresh-cell" style="[^"]+" onclick="([^"]+)" title="Обновить">([\s\S]*?)<\/button><\/div>/g;

content = content.replace(cardRegex, (match, type, label, onclick, svg) => {
    return `<div class="card analytic-card" onclick="toggleDrilldown('${type}')">
                    <div class="card-icons">
                        <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                        <button class="btn-refresh-cell" onclick="${onclick}" title="Обновить">${svg}</button>
                    </div>
                    <div class="card-label">${label}</div>`;
});

// Final check for OVN card
const ovnBrokenArea = `<span class="err-icon" style="position: absolute; top: 10px; right: 40px; color: #FFCC00; font-size: 18px; display: none; cursor: help;" title="Ошибка получения актуальных данных!">⚠️</span>
                    <div class="card-label">Качество сервиса (ОВН)</div>
                    <div class="card-value" id="card-ovn-runrate">0%</div>
                    <div class="card-subtext" id="card-ovn-subtext">0 из 0 проверок без замечаний</div>
                </div>`;

const ovnFixed = `<div class="card analytic-card">
                    <div class="card-icons">
                        <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                    </div>
                    <div class="card-label">Качество сервиса (ОВН)</div>
                    <div class="card-value" id="card-ovn-runrate">0%</div>
                    <div class="card-subtext" id="card-ovn-subtext">0 из 0 проверок без замечаний</div>
                </div>`;

if (content.includes(ovnBrokenArea)) {
    content = content.replace(ovnBrokenArea, ovnFixed);
    console.log("Fixed OVN card HTML.");
}

fs.writeFileSync(file, content);
console.log("Done.");
