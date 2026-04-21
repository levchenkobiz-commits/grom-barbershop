const fs = require('fs');

const block = `
// ===================================
// SALARY CALCULATION MODULE
// ===================================
window.SALARY_MODE_MANAGER = false;
window.SALARIES_CACHE = {}; 
window.OVN_REPORTS_DATA = window.OVN_REPORTS_DATA || []; // Fallback

window.openSalaryModal = function(isManager) {
    window.SALARY_MODE_MANAGER = isManager;
    document.getElementById('salary-modal').classList.add('active');
    
    const today = dayjs();
    const start = today.startOf('isoWeek').format('YYYY-MM-DD');
    const end = today.endOf('isoWeek').format('YYYY-MM-DD');
    
    document.getElementById('salary-date-start').value = start;
    document.getElementById('salary-date-end').value = end;
    
    renderSalaryTable();
};

window.getMasterSettings = function(masterName) {
    if (typeof ADAPTER !== "undefined") {
        for (const loc in ADAPTER) {
            const m = ADAPTER[loc].masters.find(x => x.dash === masterName || (x.el_kassa && x.el_kassa.includes(masterName)));
            if (m) return { base: m.payBase || 3000, percent: m.payPercent || 40, loc: loc };
        }
    }
    return { base: 3000, percent: 40, loc: 'Неизвестно' };
};

window.getShiftsAndHours = function(masterName, startStr, endStr) {
    const sched = window.LATEST_SCHEDULE || {};
    let count = 0;
    let totalParams = { hours: 0, shiftsCount: 0 };
    
    const startD = dayjs(startStr);
    const endD = dayjs(endStr);
    
    for(const loc in sched) {
        if(!sched[loc]) continue;
        for (let d = startD; d.isBefore(endD) || d.isSame(endD, 'day'); d = d.add(1, 'day')) {
            const rowDate = d.format('YYYY-MM-DD');
            const dayData = sched[loc].find(x => x.date === rowDate);
            if(dayData && dayData.workers) {
                const w = dayData.workers.find(wk => wk.name === masterName);
                if(w) {
                    let sh = 12; // default 12
                    if(w.time) {
                        try {
                            const [startT, endT] = w.time.split('-');
                            const sH = parseInt(startT.trim().split(':')[0]);
                            const eH = parseInt(endT.trim().split(':')[0]);
                            if (!isNaN(sH) && !isNaN(eH)) {
                                sh = eH - sH;
                                if(sh < 0) sh += 24;
                            }
                        } catch(e){}
                    }
                    totalParams.shiftsCount++;
                    totalParams.hours += sh;
                }
            }
        }
    }
    return totalParams;
};

window.getFinesInPeriod = function(masterName, startStr, endStr) {
    if (!window.OVN_REPORTS_DATA) return 0;
    
    const mReports = window.OVN_REPORTS_DATA
        .filter(r => r.barber === masterName)
        .sort((a,b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());
        
    let state = 'Green';
    const weeks = {};
    mReports.forEach(r => {
        const d = dayjs(r.date || r.createdAt);
        const wId = d.isoWeek() + '-' + d.year();
        if (!weeks[wId]) weeks[wId] = [];
        weeks[wId].push(r);
    });
    
    const sortedWeeks = Object.keys(weeks).sort((a,b) => {
        const [wA, yA] = a.split('-');
        const [wB, yB] = b.split('-');
        if (yA !== yB) return yA - yB;
        return wA - wB;
    });

    let periodFines = 0;
    
    function addFineIfInPeriod(amount, rDate) {
        const d = dayjs(rDate);
        if ((d.isAfter(dayjs(startStr)) || d.isSame(dayjs(startStr), 'day')) &&
            (d.isBefore(dayjs(endStr)) || d.isSame(dayjs(endStr), 'day'))) {
            periodFines += amount;
        }
    }

    for (const wId of sortedWeeks) {
        const weekReports = weeks[wId];
        let violationsCount = 0;
        let lateCount = 0;
        const weekViolationsList = [];
        
        weekReports.forEach(r => {
            const isMandatory = (typeof isMandatoryFine === 'function' ? isMandatoryFine(r.violation, r.notes) : false);
            const fineVal = (typeof getViolationFine === 'function' ? getViolationFine(r.violation, r.notes) : 0);
            const isViol = fineVal > 0;
            const vString = (r.violation||'').toLowerCase();
            
            if (isViol) {
                violationsCount++;
                if (!isMandatory) weekViolationsList.push({ type: vString, fine: fineVal, r });
            }
            
            if (isMandatory) {
                let finalFine = fineVal;
                if (vString.includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) {
                    lateCount++;
                    if (lateCount >= 2) finalFine *= 2;
                }
                addFineIfInPeriod(finalFine, r.date || r.createdAt);
            } else if (isViol && state === 'Red') {
                addFineIfInPeriod(fineVal, r.date || r.createdAt);
            }
        });
        
        if (state === 'Yellow' && violationsCount > 0) {
            let finesMap = {};
            weekViolationsList.forEach(v => {
                finesMap[v.type] = (finesMap[v.type]||0) + 1;
            });
            let maxType = null, maxC = 0;
            Object.keys(finesMap).forEach(k => {
                if(finesMap[k] > maxC) { maxC = finesMap[k]; maxType = k; }
            });
            if(maxType) {
                const violItem = weekViolationsList.find(x => x.type === maxType);
                if (violItem) {
                    addFineIfInPeriod(violItem.fine, violItem.r.date || violItem.r.createdAt);
                }
            }
        }
        
        if (state === 'Green') {
            if (violationsCount >= 14) state = 'Red';
            else if (violationsCount > 9) state = 'Yellow';
        } else if (state === 'Yellow') {
            if (violationsCount > 9) state = 'Red';
            else state = 'Green';
        } else if (state === 'Red') {
            if (violationsCount <= 9) state = 'Green';
        }
    }
    
    return periodFines;
};

window.renderSalaryTable = function() {
    const startD = document.getElementById('salary-date-start').value;
    const endD = document.getElementById('salary-date-end').value;
    const tbody = document.getElementById('salary-table-body');
    
    let targetMasters = [];
    if (window.SALARY_MODE_MANAGER) {
        if (typeof ADAPTER !== "undefined") {
            Object.keys(ADAPTER).forEach(loc => {
                ADAPTER[loc].masters.forEach(m => {
                    targetMasters.push(m.dash);
                });
            });
        }
        targetMasters = [...new Set(targetMasters)];
    } else {
        targetMasters = [window.CURRENT_MASTER || ''];
    }
    
    if (targetMasters.length === 0 || !targetMasters[0]) {
        tbody.innerHTML = '<tr><td colspan="6">Нет данных или мастер не выбран</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    targetMasters.forEach(mName => {
        if (!mName) return;
        const conf = getMasterSettings(mName);
        const shifts = getShiftsAndHours(mName, startD, endD);
        const fines = getFinesInPeriod(mName, startD, endD);
        
        const tr = document.createElement('tr');
        const safeId = mName.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9-А-Яа-я]/g, '');
        const prevRev = window.SALARIES_CACHE ? (window.SALARIES_CACHE[safeId] || 0) : 0;
        
        tr.innerHTML = \`
            <td style="padding: 10px; border-bottom: 1px solid #222;"><strong>\${mName}</strong><br><span style="font-size:11px;color:#888">\${conf.loc}</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #222; font-size:12px;">Выход \${conf.base}₽<br>\${conf.percent}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #222;">
                <input type="number" id="rev-\${safeId}" value="\${prevRev}" style="width:100px; padding:6px; background:#111; color:#fff; border:1px solid #444; border-radius:6px;" onchange="updateRowMath('\${safeId}', '\${mName}', \${conf.base}, \${conf.percent}, \${shifts.shiftsCount}, \${shifts.hours}, \${fines})" onkeyup="updateRowMath('\${safeId}', '\${mName}', \${conf.base}, \${conf.percent}, \${shifts.shiftsCount}, \${shifts.hours}, \${fines})">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #222; font-size:12px;">Смен: \${shifts.shiftsCount}<br>Часов: \${shifts.hours}</td>
            <td style="padding: 10px; border-bottom: 1px solid #222; color:#FF3B30;">-\${fines} ₽</td>
            <td id="res-\${safeId}" style="padding: 10px; border-bottom: 1px solid #222; font-size: 16px; font-weight: bold; text-align: right; color:#34C759;">0 ₽</td>
        \`;
        tbody.appendChild(tr);
        
        window.updateRowMath(safeId, mName, conf.base, conf.percent, shifts.shiftsCount, shifts.hours, fines);
    });
};

window.updateRowMath = function(safeId, mName, base, percent, shiftsCount, hours, fines) {
    const revInput = document.getElementById('rev-' + safeId);
    let rev = 0;
    if (revInput) rev = parseFloat(revInput.value) || 0;
    
    if(!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
    window.SALARIES_CACHE[safeId] = rev;
    
    const standardHours = shiftsCount * 12;
    const hoursDiff = hours - standardHours;
    const hourlyRate = base / 12;
    const adjustment = hoursDiff * hourlyRate;
    
    const percentagePay = (rev * percent / 100) + adjustment;
    const basePay = (shiftsCount * base) + adjustment;
    
    let salaryBeforeFines = Math.max(shiftsCount > 0 ? basePay : 0, percentagePay);
    let finalSalary = Math.max(0, salaryBeforeFines - fines);
    
    const resEl = document.getElementById('res-' + safeId);
    if (resEl) {
        resEl.innerText = Math.round(finalSalary).toLocaleString('ru-RU') + ' ₽';
        let tip = percentagePay > basePay && shiftsCount > 0 ? '(процент)' : (shiftsCount > 0 ? '(выход)' : '');
        resEl.innerHTML += \`<br><span style="font-size:10px;color:#888;font-weight:normal">\${tip}</span>\`;
    }
};

// Expose OVN reports to global var inside processOVN for the calculator to access
const origProcessOVN = window.processOVN;
if (typeof origProcessOVN !== 'undefined') {
    // we don't need to wrap processOVN because processOVN already receives exactly `reports`. 
    // Wait, where is processOVN defined? 
}
`;

fs.appendFileSync('mainscript.js', '\n' + block);
console.log('Appended to mainscript.js');
