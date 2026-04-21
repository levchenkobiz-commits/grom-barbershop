const fs = require('fs');
let content = fs.readFileSync('mainscript.js', 'utf8');

// Ensure salary table re-renders clearly
const renderStart = content.indexOf('window.renderSalaryTable = async function()');
const renderEnd = content.indexOf('};', renderStart + 50) + 2; // Approximate

// I will replace the whole function with a more debuggable and robust version
const newRenderFunction = `window.renderSalaryTable = async function() {
    console.log("[SALARY] Starting calculation...");
    const startD = document.getElementById('salary-date-start').value;
    const endD = document.getElementById('salary-date-end').value;
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;"><div class="spinner" style="margin: 0 auto 10px auto;"></div>Загружаем смены и штрафы...</td></tr>';
    
    let targetMasters = [];
    if (window.SALARY_MODE_MANAGER) {
        if (typeof ADAPTER !== "undefined") {
            Object.keys(ADAPTER).forEach(loc => {
                if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                    ADAPTER[loc].masters.forEach(m => targetMasters.push(m.dash));
                }
            });
        }
        targetMasters = [...new Set(targetMasters)].sort();
    } else {
        targetMasters = [window.CURRENT_MASTER || ''];
    }
    
    if (targetMasters.length === 0 || !targetMasters[0]) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">Нет данных или мастер не выбран</td></tr>';
        return;
    }
    
    try {
        const [ovnRes, schedRes] = await Promise.all([
            fetch('/api/ovn?v='+Date.now()).then(r => r.json()).catch(() => []),
            fetch('/api/schedule?v='+Date.now()).then(r => r.json()).catch(() => [])
        ]);

        tbody.innerHTML = '';
        targetMasters.forEach(mName => {
            if (!mName) return;
            const conf = window.getMasterSettings(mName);
            const shifts = window.getShiftsAndHours(mName, startD, endD, schedRes);
            const fines = window.getFinesInPeriod(mName, startD, endD, ovnRes);
            
            const safeId = mName.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9-А-Яа-я]/g, '');
            let prevRev = window.SALARIES_CACHE ? (window.SALARIES_CACHE[safeId] || "") : "";
            
            // Auto-fill revenue if dates match the agent's cached week
            if (window.dashboardData && window.dashboardData.salaryWeekly) {
                const sw = window.dashboardData.salaryWeekly;
                // Convert sw.start/end (DD.MM.YYYY) to YYYY-MM-DD
                const swS = sw.start.split('.').reverse().join('-');
                const swE = sw.end.split('.').reverse().join('-');
                
                if (swS === startD && swE === endD) {
                    let elkassaName = mName;
                    if (typeof ADAPTER !== "undefined") {
                         for (const loc in ADAPTER) {
                             if (ADAPTER[loc] && ADAPTER[loc].masters) {
                                 const matchM = ADAPTER[loc].masters.find(x => x.dash === mName);
                                 if (matchM && matchM.el_kassa) {
                                     Object.keys(sw.revenue).forEach(ek => {
                                         if (matchM.el_kassa.includes(ek) || matchM.el_kassa.some(ak => ek.includes(ak))) elkassaName = ek;
                                     });
                                 }
                             }
                         }
                    }
                    const fetchedRev = sw.revenue[elkassaName];
                    if (fetchedRev !== undefined && (prevRev === "" || prevRev === "0" || prevRev === 0)) {
                        prevRev = String(fetchedRev);
                        if(!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
                        window.SALARIES_CACHE[safeId] = prevRev;
                    }
                }
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td style="padding: 12px 10px; border-bottom: 1px solid #222;">
                    <strong>\${mName}</strong><br><span style="font-size:11px;color:#888">\${conf.loc}</span>
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; font-size:12px;">
                    Выход \${conf.base}₽<br>\${conf.percent}%
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222;">
                    <div style="position:relative; display:inline-block;">
                        <input type="number" id="rev-\${safeId}" value="\${prevRev}" placeholder="Укажите выручку" 
                               style="width:110px; padding:8px 30px 8px 8px; background:#111; color:#fff; border:1px solid #444; border-radius:8px;" 
                               oninput="window.updateRowMath('\${safeId}', '\${mName}', \${conf.base}, \${conf.percent}, \${shifts.shiftsCount}, \${shifts.hours}, \${fines})">
                    </div>
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; font-size:12px;">
                    Смен: \${shifts.shiftsCount}<br>Часов: \${shifts.hours}
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; color:#FF3B30; font-weight:600;">
                    -\${fines} ₽
                </td>
                <td id="res-\${safeId}" style="padding: 12px 10px; border-bottom: 1px solid #222; font-size: 17px; font-weight: 800; text-align: right; color:#34C759;">
                    0 ₽
                </td>
            \`;
            tbody.appendChild(tr);
            window.updateRowMath(safeId, mName, conf.base, conf.percent, shifts.shiftsCount, shifts.hours, fines);
        });
        console.log("[SALARY] Calculation complete.");
    } catch(err) {
        console.error("[SALARY] Error:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#FF3B30;">Ошибка при загрузке: ' + err.message + '</td></tr>';
    }
};`;

// Regex to replace the function body
const funcRegex = /window\.renderSalaryTable\s*=\s*async\s*function\(\)\s*\{[\s\S]*?window\.updateRowMath\(safeId,\s*mName,\s*conf\.base,\s*conf\.percent,\s*shifts\.shiftsCount,\s*shifts\.hours,\s*fines\);\s*\}\s*\)\s*;\s*\}\s*catch\(err\)\s*\{[\s\S]*?\}\s*\};/;

const result = content.replace(funcRegex, newRenderFunction);
fs.writeFileSync('mainscript.js', result);
console.log("Re-implemented renderSalaryTable with extra robustness.");
