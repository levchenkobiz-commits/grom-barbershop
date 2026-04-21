const fs = require('fs');

// Patch HTML
let html = fs.readFileSync('index.html', 'utf8');

const errIconHTML = `<span class="err-icon" style="position: absolute; top: 10px; right: 40px; color: #FFCC00; font-size: 18px; display: none; cursor: help;" title="Ошибка получения актуальных данных!">⚠️</span>`;

// Find all <div class="card" onclick="toggleDrilldown('X')">
html = html.replace(/(<div class="card" onclick="toggleDrilldown\('.*?'\)">)/g, `$1\n                    ${errIconHTML}`);

fs.writeFileSync('index.html', html);

// Patch JS
let js = fs.readFileSync('mainscript.js', 'utf8');

const errorLogic = `
        if (window.dashboardData.errors) {
            const errs = window.dashboardData.errors;
            const cards = document.querySelectorAll('.metrics-grid .card');
            
            // Map indexes: 0:Rev(ek), 1:Occ(yc), 2:RR(yc), 3:MasterRev(ek), 4:Cycle(yc), 5:Online(yc)
            const mapKeys = ['elkassa', 'general', 'general', 'elkassa', 'general', 'general'];
            
            cards.forEach((c, idx) => {
                const icon = c.querySelector('.err-icon');
                if (icon) {
                    if (errs[mapKeys[idx]]) {
                        icon.style.display = 'block';
                    } else {
                        icon.style.display = 'none';
                    }
                }
            });
        }
`;

js = js.replace(/(document\.getElementById\('network-occupancy'\)\.innerText = data\.networkAvg \+ '%';)/, `$1\n${errorLogic}`);

fs.writeFileSync('mainscript.js', js);
console.log("Error badges logic patched!");
