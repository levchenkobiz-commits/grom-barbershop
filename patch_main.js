const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

// 1. Remove duplicated switchTab (Line 8-15 approx)
// Let's find the first switchTab and remove it.
const firstSwitchTabRegex = /function\s+switchTab\(tabName,\s*btn\)\s*\{[\s\S]*?location\.hash\s*=\s*tabName;[\s\S]*?\}/;
js = js.replace(firstSwitchTabRegex, '');

// 2. Make getMasterSettings robust
const getMasterSettingsRegex = /window\.getMasterSettings\s*=\s*function\(masterName\)\s*\{[\s\S]*?return\s+\{\s*base:\s*3000,\s*percent:\s*40,\s*loc:\s*'[^']*'\s*\};\s*\};/;
const newGetMasterSettings = `window.getMasterSettings = function(masterName) {
    if (typeof ADAPTER !== "undefined") {
        for (const loc in ADAPTER) {
            if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                const m = ADAPTER[loc].masters.find(x => x.dash === masterName || (x.el_kassa && x.el_kassa.includes(masterName)));
                if (m) return { base: m.payBase || 5000, percent: m.payPercent || 40, loc: loc };
            }
        }
    }
    return { base: 5000, percent: 40, loc: 'Неизв' };
};`;
js = js.replace(getMasterSettingsRegex, newGetMasterSettings);

// 3. Make renderSalaryTable robust
const renderSalaryTableRegex = /window\.renderSalaryTable\s*=\s*async\s*function\(\)\s*\{[\s\S]*?window\.updateRowMath\(safeId,\s*mName,\s*conf\.base,\s*conf\.percent,\s*shifts\.shiftsCount,\s*shifts\.hours,\s*fines\);\s*\}\s*\)\s*;\s*\};/;
const newRenderSalaryTable = `window.renderSalaryTable = async function() {
    const startD = document.getElementById('salary-date-start').value;
    const endD = document.getElementById('salary-date-end').value;
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    
    let targetMasters = [];
    if (window.SALARY_MODE_MANAGER) {
        if (typeof ADAPTER !== "undefined") {
            Object.keys(ADAPTER).forEach(loc => {
                if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                    ADAPTER[loc].masters.forEach(m => {
                        targetMasters.push(m.dash);
                    });
                }
            });
        }
        targetMasters = [...new Set(targetMasters)];
    } else {
        targetMasters = [window.CURRENT_MASTER || ''];
    }
    
    if (targetMasters.length === 0 || !targetMasters[0]) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Нет данных или мастер не выбран</td></tr>';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Загрузка данных...</td></tr>';
    
    let ovnRes = [], schedRes = [];
    try {
        const [o, s] = await Promise.all([
            fetch('/api/ovn').then(r => r.json()).catch(() => []),
            fetch('/api/schedule').then(r => r.json()).catch(() => [])
        ]);
        ovnRes = o || [];
        schedRes = s || [];
    } catch(e) {
        console.error("Failed to load generic data", e);
    }

    tbody.innerHTML = '';
    targetMasters.forEach(mName => {
        if (!mName) return;
        const conf = window.getMasterSettings(mName);
        const shifts = window.getShiftsAndHours(mName, startD, endD, schedRes);
        const fines = window.getFinesInPeriod(mName, startD, endD, ovnRes);
        
        const tr = document.createElement('tr');
        const safeId = mName.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9-А-Яа-я]/g, '');
        
        let prevRev = window.SALARIES_CACHE ? (window.SALARIES_CACHE[safeId] || "") : "";
        
        if (window.dashboardData && window.dashboardData.salaryWeekly) {
            const sw = window.dashboardData.salaryWeekly;
            const swStart = dayjs(sw.start, "DD.MM.YYYY").format('YYYY-MM-DD');
            const swEnd = dayjs(sw.end, "DD.MM.YYYY").format('YYYY-MM-DD');
            if (swStart === startD && swEnd === endD) {
                let elkassaName = mName;
                if (typeof ADAPTER !== "undefined") {
                     for (const loc in ADAPTER) {
                         if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
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
        
        tr.innerHTML = \`
            <td style="padding: 10px; border-bottom: 1px solid #222;"><strong>\${mName}</strong><br><span style="font-size:11px;color:#888">\${conf.loc}</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #222; font-size:12px;">Выход \${conf.base}₽<br>\${conf.percent}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #222;">
                <input type="number" id="rev-\${safeId}" value="\${prevRev}" placeholder="Укажите выручку" style="width:130px; padding:6px; background:#111; color:#fff; border:1px solid #444; border-radius:6px;" onchange="window.updateRowMath('\${safeId}', '\${mName}', \${conf.base}, \${conf.percent}, \${shifts.shiftsCount}, \${shifts.hours}, \${fines})" onkeyup="window.updateRowMath('\${safeId}', '\${mName}', \${conf.base}, \${conf.percent}, \${shifts.shiftsCount}, \${shifts.hours}, \${fines})">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #222; font-size:12px;">Смен: \${shifts.shiftsCount}<br>Часов: \${shifts.hours}</td>
            <td style="padding: 10px; border-bottom: 1px solid #222; color:#FF3B30;">-\${fines} ₽</td>
            <td id="res-\${safeId}" style="padding: 10px; border-bottom: 1px solid #222; font-size: 16px; font-weight: bold; text-align: right; color:#34C759;">0 ₽</td>
        \`;
        tbody.appendChild(tr);
        window.updateRowMath(safeId, mName, conf.base, conf.percent, shifts.shiftsCount, shifts.hours, fines);
    });
};`;
js = js.replace(renderSalaryTableRegex, newRenderSalaryTable);


fs.writeFileSync('mainscript.js', js);
console.log("Cleaned and robustified mainscript.js!");
