/**
 * public/js/salary.js
 * =====================================================
 * Модуль Зарплата (расчёт, таблица, итого).
 *
 * Выручка загружается автоматически из El-Kassa API.
 * Ручная выгрузка убрана — всё через API.
 *
 * Экспортирует:
 *   openSalaryModal, renderSalaryTable, updateRowMath, refreshSalaryGrandTotal
 *   getMasterSettings, getShiftsAndHours, getFinesInPeriod
 *   handleCleaningUpload (фото уборки)
 *
 * Зависимости: config.js, fines.js (getViolationFine, isMandatoryFine), adapter.js
 */

window.SALARY_MODE_MANAGER = false;

// ==== OPEN SALARY MODAL ====
window.openSalaryModal = function(isManager) {
    window.SALARY_MODE_MANAGER = isManager;
    document.getElementById('salary-modal').classList.add('active');

    // По умолчанию — прошлая календарная неделя (пн-вс)
    // Используем isoWeek: startOf('isoWeek') = понедельник текущей недели
    const thisMonday = dayjs().startOf('isoWeek');  // пн текущей недели
    const lastMonday = thisMonday.subtract(7, 'day');  // пн прошлой
    const lastSunday = thisMonday.subtract(1, 'day');  // вс прошлой

    document.getElementById('salary-date-start').value = lastMonday.format('YYYY-MM-DD');
    document.getElementById('salary-date-end').value   = lastSunday.format('YYYY-MM-DD');
    renderSalaryTable();
};

// ==== HELPERS ====
window.getMasterSettings = function(masterName) {
    if (typeof ADAPTER !== 'undefined') {
        for (const loc in ADAPTER) {
            if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                const m = ADAPTER[loc].masters.find(x => x.dash === masterName || (x.el_kassa && x.el_kassa.includes(masterName)));
                if (m) return { base: m.payBase || 5000, percent: m.payPercent || 40, loc, el_kassa: m.el_kassa || [] };
            }
        }
    }
    return { base: 5000, percent: 40, loc: 'Неизв', el_kassa: [] };
};

function normalizeSalaryName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-zа-я0-9]+/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

async function fetchSalaryJson(url, options, label) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
        throw new Error(payload.error || `${label || 'API'}: ошибка сервера ${response.status}`);
    }
    return payload;
}

function getSalaryNameCandidates(masterName) {
    const conf = window.getMasterSettings(masterName);
    return [masterName, ...(conf.el_kassa || [])]
        .map(normalizeSalaryName)
        .filter(Boolean);
}

function isSameSalaryMaster(scheduleName, masterName) {
    const scheduleNorm = normalizeSalaryName(scheduleName);
    if (!scheduleNorm || scheduleNorm === 'мастер') return false;

    return getSalaryNameCandidates(masterName).some(candidate => {
        if (!candidate || candidate === 'мастер') return false;
        if (scheduleNorm === candidate) return true;
        if (scheduleNorm.length >= 4 && candidate.startsWith(scheduleNorm)) return true;
        return candidate.length >= 4 && scheduleNorm.startsWith(candidate);
    });
}

function parseSalaryShiftHours(text) {
    const raw = String(text || '').trim();
    const range = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(?:[-–—]|до)\s*(\d{1,2})(?::(\d{2}))?/i);
    if (!range) return 12;
    const start = parseInt(range[1], 10) + parseInt(range[2] || '0', 10) / 60;
    const end = parseInt(range[3], 10) + parseInt(range[4] || '0', 10) / 60;
    const hours = end > start ? end - start : end + 24 - start;
    return Number.isFinite(hours) && hours > 0 ? hours : 12;
}

function getScheduledShift(masterName, isoDate, scheduleArray) {
    const day = (scheduleArray || []).find(s => s.date === isoDate);
    if (!day || !Array.isArray(day.masters)) return null;
    return day.masters.find(wk => isSameSalaryMaster(wk.name, masterName)) || null;
}

window.getShiftsAndHours = function(masterName, startStr, endStr, scheduleArray) {
    const result = { hours: 0, shiftsCount: 0 };
    if (!scheduleArray) return result;

    for (let d = dayjs(startStr); d.isBefore(dayjs(endStr)) || d.isSame(dayjs(endStr),'day'); d = d.add(1,'day')) {
        const rowDate = d.format('YYYY-MM-DD');
        const w = getScheduledShift(masterName, rowDate, scheduleArray);
        if (w) {
            result.shiftsCount++;
            result.hours += parseSalaryShiftHours(w.text || w.time || '');
        }
    }
    return result;
};

function buildApiShiftSummary(masterName, dailyCounts, scheduleArray, conf) {
    const result = { shiftsCount: 0, hours: 0, basePay: 0, strayDays: [] };
    Object.entries(dailyCounts || {}).forEach(([day, countRaw]) => {
        const count = Number(countRaw) || 0;
        if (count < 2) {
            if (count > 0) result.strayDays.push(day);
            return;
        }
        const isoDate = dayjs(day, 'DD.MM.YYYY').format('YYYY-MM-DD');
        const scheduled = getScheduledShift(masterName, isoDate, scheduleArray);
        const hours = scheduled ? parseSalaryShiftHours(scheduled.text || scheduled.time || '') : 12;
        result.shiftsCount++;
        result.hours += hours;
        result.basePay += Math.abs(hours - 12) > 0.01 ? conf.base * (hours / 12) : conf.base;
    });
    return result;
}

window.getFinesInPeriod = function(masterName, startStr, endStr, ovnArray) {
    if (!ovnArray) return 0;
    if (typeof calculateFines === 'function') {
        const results = calculateFines(ovnArray, { start: startStr, end: endStr });
        return results && results[masterName] ? Number(results[masterName].monthFines) || 0 : 0;
    }

    const mReports = ovnArray.filter(r => r.barber === masterName)
        .sort((a, b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());

    const weeks = {};
    mReports.forEach(r => {
        const d   = dayjs(r.date || r.createdAt);
        const wId = d.isoWeek() + '-' + d.year();
        if (!weeks[wId]) weeks[wId] = [];
        weeks[wId].push(r);
    });

    const sortedWeeks = Object.keys(weeks).sort((a, b) => {
        const [wA, yA] = a.split('-'), [wB, yB] = b.split('-');
        if (yA !== yB) return yA - yB;
        return wA - wB;
    });

    let state = 'Green', periodFines = 0;
    const monthlyLateCounts = {};
    const currentLateGraceMonth = dayjs().format('YYYY-MM');

    function addFineIfInPeriod(amount, rDate) {
        const d = dayjs(rDate);
        if ((d.isAfter(dayjs(startStr)) || d.isSame(dayjs(startStr),'day')) &&
            (d.isBefore(dayjs(endStr))  || d.isSame(dayjs(endStr),'day')))
            periodFines += amount;
    }

    for (const wId of sortedWeeks) {
        const weekReports = weeks[wId];
        let violationsCount = 0, lateCount = 0;
        const weekViolationsList = [];

        weekReports.forEach(r => {
            const isMandatory = typeof isMandatoryFine === 'function' ? isMandatoryFine(r.violation, r.notes, r) : false;
            const fineVal     = typeof getViolationFine === 'function' ? getViolationFine(r.violation, r.notes, r) : 0;
            const isViol      = fineVal > 0;
            const vStr        = (r.violation || '').toLowerCase();

            if (isViol) {
                violationsCount++;
                if (!isMandatory) weekViolationsList.push({ type: vStr, fine: fineVal, r });
            }
            if (isMandatory) {
                let finalFine = fineVal;
                if (vStr.includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) {
                    lateCount++;
                    const lateMonth = dayjs(r.date || r.createdAt).format('YYYY-MM');
                    monthlyLateCounts[lateMonth] = (monthlyLateCounts[lateMonth] || 0) + 1;
                    if (lateCount >= 2) finalFine *= 2;
                    if (lateMonth === currentLateGraceMonth && monthlyLateCounts[lateMonth] === 1) finalFine = 0;
                }
                addFineIfInPeriod(finalFine, r.date || r.createdAt);
            } else if (isViol && state === 'Red') {
                addFineIfInPeriod(fineVal, r.date || r.createdAt);
            }
        });

        if (state === 'Yellow' && violationsCount > 0) {
            const freq = {};
            weekViolationsList.forEach(v => { freq[v.type] = (freq[v.type]||0)+1; });
            let maxType = null, maxC = 0;
            Object.keys(freq).forEach(k => { if (freq[k] > maxC) { maxC = freq[k]; maxType = k; } });
            if (maxType) {
                const vi = weekViolationsList.find(x => x.type === maxType);
                if (vi) addFineIfInPeriod(vi.fine, vi.r.date || vi.r.createdAt);
            }
        }

        if      (state === 'Green')  { if (violationsCount >= 14) state = 'Red'; else if (violationsCount > 9) state = 'Yellow'; }
        else if (state === 'Yellow') { if (violationsCount > 9) state = 'Red'; else state = 'Green'; }
        else if (state === 'Red')    { if (violationsCount <= 9) state = 'Green'; }
    }
    return periodFines;
};

// ==== RENDER SALARY TABLE ====
window.renderSalaryTable = async function() {
    console.log('[Salary] Starting...');
    const startD = document.getElementById('salary-date-start').value;
    const endD   = document.getElementById('salary-date-end').value;
    const tbody  = document.getElementById('salary-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:60px 30px">
        <div class="salary-loader">
            <div class="loader-orbit">
                ${Array.from({length: 12}, (_, i) => `<div class="loader-dot" style="--i:${i};--delay:${i * 0.12}s"></div>`).join('')}
            </div>
            <div class="loader-text">Получаю данные<span class="loader-dots-anim"></span></div>
        </div>
        <style>
        .salary-loader { display:flex; flex-direction:column; align-items:center; gap:24px; }
        .loader-orbit { position:relative; width:64px; height:64px; animation:loaderSpin 3s linear infinite; }
        .loader-dot {
            position:absolute; width:6px; height:6px; border-radius:50%;
            background:var(--accent); top:50%; left:50%;
            transform: rotate(calc(var(--i) * 30deg)) translateY(-28px);
            opacity: calc(0.25 + var(--i) * 0.065);
            animation: loaderPulse 1.4s ease-in-out calc(var(--delay)) infinite;
            box-shadow: 0 0 6px rgba(232,255,56,0.4);
        }
        @keyframes loaderSpin { to { transform: rotate(360deg); } }
        @keyframes loaderPulse {
            0%,100% { transform: rotate(calc(var(--i)*30deg)) translateY(-28px) scale(1); opacity: calc(0.25 + var(--i)*0.065); }
            50% { transform: rotate(calc(var(--i)*30deg)) translateY(-28px) scale(1.8); opacity:1; box-shadow: 0 0 12px rgba(232,255,56,0.8); }
        }
        .loader-text { font-size:14px; color:rgba(255,255,255,0.5); font-weight:600; letter-spacing:0.5px; }
        .loader-dots-anim::after { content:''; animation: dotsCycle 1.5s steps(4,end) infinite; }
        @keyframes dotsCycle { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} }
        </style>
    </td></tr>`;

    let targetMasters = [];
    if (window.SALARY_MODE_MANAGER) {
        if (typeof ADAPTER !== 'undefined') {
            Object.keys(ADAPTER).forEach(loc => {
                if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters))
                    ADAPTER[loc].masters.forEach(m => targetMasters.push(m.dash));
            });
        }
        targetMasters = [...new Set(targetMasters)].sort();
    } else {
        targetMasters = [window.CURRENT_MASTER || ''];
    }

    if (!targetMasters.length || !targetMasters[0]) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">Нет данных или мастер не выбран</td></tr>';
        return;
    }

    try {
        // Параллельно: OVN, расписание, выручка из El-Kassa API
        const startDD = dayjs(startD).format('DD.MM.YYYY');
        const endDD   = dayjs(endD).format('DD.MM.YYYY');

        const [ovnRes, schedRes, salaryRes] = await Promise.all([
            fetch('/api/ovn?v='+Date.now()).then(r => r.json()).catch(() => []),
            fetch('/api/schedule?v='+Date.now()).then(r => r.json()).catch(() => []),
            fetchSalaryJson('/api/elkassa/salary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start: startDD, end: endDD })
            }, 'El-Kassa')
        ]);

        const apiRevenue  = salaryRes.revenue  || {};
        const apiWorkDays = salaryRes.workDays  || {};
        const apiDaily    = salaryRes.daily     || {};
        const apiDailyCounts = salaryRes.dailyCounts || {};

        console.log('[Salary] API revenue:', Object.keys(apiRevenue).length, 'masters');

        tbody.innerHTML = '';
        targetMasters.forEach(mName => {
            if (!mName) return;
            const conf   = getMasterSettings(mName);
            const fines  = getFinesInPeriod(mName, startD, endD, ovnRes);
            const safeId = mName.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-А-Яа-я]/g,'');

            // Находим EK-имя через el_kassa маппинг
            let matchedEkName = '';
            if (conf.el_kassa && conf.el_kassa.length > 0) {
                for (const ekName of conf.el_kassa) {
                    if (apiRevenue[ekName] !== undefined) { matchedEkName = ekName; break; }
                    for (const apiName in apiRevenue) {
                        if (apiName.toLowerCase().includes(ekName.toLowerCase()) ||
                            ekName.toLowerCase().includes(apiName.toLowerCase())) {
                            matchedEkName = apiName; break;
                        }
                    }
                    if (matchedEkName) break;
                }
            }
            if (!matchedEkName && apiRevenue[mName] !== undefined) matchedEkName = mName;

            const dailyData = matchedEkName ? (apiDaily[matchedEkName] || {}) : {};
            const dailyCounts = matchedEkName ? (apiDailyCounts[matchedEkName] || {}) : {};
            const revenue = Object.values(dailyData).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
            const shifts = buildApiShiftSummary(mName, dailyCounts, schedRes, conf);

            const revFormatted = revenue > 0 ? Math.round(revenue).toLocaleString() + ' ₽' : '0 ₽';
            const filteredNote = shifts.strayDays.length > 0
                ? `<br><span style="font-size:10px;color:#FF9500" title="${shifts.strayDays.join(', ')}">⚠ были пробиты стрижки вне смены</span>`
                : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px 10px;border-bottom:1px solid #222">
                    <strong>${mName}</strong><br><span style="font-size:11px;color:#888">${conf.loc}</span>
                </td>
                <td style="padding:12px 10px;border-bottom:1px solid #222;font-size:12px">Выход ${conf.base}₽<br>${conf.percent}%</td>
                <td id="rev-cell-${safeId}" style="padding:12px 10px;border-bottom:1px solid #222;font-weight:600;color:#E8FF38">${revFormatted}${filteredNote}</td>
                <td style="padding:12px 10px;border-bottom:1px solid #222;font-size:12px">Смен: ${shifts.shiftsCount}<br>Часов: ${shifts.hours}</td>
                <td style="padding:12px 10px;border-bottom:1px solid #222;color:#FF3B30;font-weight:600">-${fines} ₽</td>
                <td id="res-${safeId}" style="padding:12px 10px;border-bottom:1px solid #222;font-size:17px;font-weight:800;text-align:right;color:#34C759">0 ₽</td>
            `;
            tbody.appendChild(tr);

            // Рассчитываем ЗП
            const basePay       = shifts.basePay;
            const percentagePay = revenue * (conf.percent / 100);
            const earnings      = Math.max(0, Math.max(basePay, percentagePay) - fines);

            const resEl = document.getElementById('res-' + safeId);
            if (resEl) {
                resEl.innerHTML = Math.round(earnings).toLocaleString() + ' ₽'
                    + (percentagePay > basePay
                        ? '<br><span style="font-size:10px;color:#888">(процент)</span>'
                        : '<br><span style="font-size:10px;color:#888">(выход)</span>');
            }
        });

        refreshSalaryGrandTotal();
        console.log('[Salary] Done.');
    } catch (err) {
        console.error('[Salary] Error:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#FF3B30">Ошибка: ${err.message}</td></tr>`;
    }
};

window.updateMasterWeeklySalary = async function() {
    const valueEl = document.getElementById('master-week-salary');
    const subEl = document.getElementById('master-week-salary-sub');
    const masterName = window.CURRENT_MASTER || '';
    if (!valueEl || !masterName) return;

    const start = dayjs().startOf('isoWeek');
    const end = dayjs().subtract(1, 'day');
    if (end.isBefore(start, 'day')) {
        valueEl.innerText = '0 ₽';
        if (subEl) subEl.innerText = 'Неделя только началась';
        return;
    }

    try {
        const salaryRes = await fetchSalaryJson('/api/elkassa/salary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: start.format('DD.MM.YYYY'), end: end.format('DD.MM.YYYY') })
        }, 'El-Kassa');
        const [scheduleRes, ovnRes] = await Promise.all([
            fetch('/api/schedule?v=' + Date.now())
                .then(r => r.ok ? r.json() : [])
                .catch(() => []),
            fetch('/api/ovn?v=' + Date.now())
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
        ]);
        const conf = getMasterSettings(masterName);
        const candidates = [masterName, ...(conf.el_kassa || [])];
        const apiNames = Object.keys(salaryRes.revenue || {});
        const matched = apiNames.find(name => candidates.some(c => {
            const a = normalizeSalaryName(name);
            const b = normalizeSalaryName(c);
            return a === b || a.includes(b) || b.includes(a);
        }));
        const revenue = matched ? Number(salaryRes.revenue[matched] || 0) : 0;
        const shiftCounts = matched && salaryRes.dailyCounts ? salaryRes.dailyCounts[matched] : {};
        const shifts = buildApiShiftSummary(masterName, shiftCounts, scheduleRes, conf);
        const fines = getFinesInPeriod(masterName, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), ovnRes);
        const percentagePay = revenue * conf.percent / 100;
        const usePercent = percentagePay > shifts.basePay;
        const earnings = Math.max(0, Math.max(percentagePay, shifts.basePay) - fines);
        valueEl.innerText = `${Math.round(earnings).toLocaleString()} ₽`;
        if (subEl) {
            subEl.innerText = usePercent
                ? `${conf.percent}% от ${Math.round(revenue).toLocaleString()} ₽, по ${end.format('DD.MM')}`
                : `Выход за ${shifts.shiftsCount} смен, по ${end.format('DD.MM')}`;
            if (shifts.strayDays.length) subEl.innerText += ' · были пробиты стрижки вне смены';
        }
    } catch (e) {
        console.error('[Salary] master weekly salary error:', e);
        valueEl.innerText = 'Нет данных';
        if (subEl) subEl.innerText = 'Не удалось обновить расчёт';
    }
};

// ==== GRAND TOTAL ====
window.refreshSalaryGrandTotal = function() {
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('td[id^="res-"]').forEach(td => {
        total += parseInt(td.innerText.replace(/[^0-9-]/g,'')) || 0;
    });
    const footer = document.getElementById('salary-table-footer');
    if (footer) {
        footer.innerHTML = `<tr style="background:rgba(52,199,89,0.1);font-weight:800">
            <td colspan="5" style="padding:15px;text-align:right;color:#fff">ИТОГО К ВЫПЛАТЕ:</td>
            <td style="padding:15px;text-align:right;color:#34C759;font-size:18px">${total.toLocaleString()} ₽</td>
        </tr>`;
    }
};

// ==== CLEANING UPLOAD ====
window.handleCleaningUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const btn         = document.getElementById('cleaning-upload-btn');
    const statusText  = document.getElementById('cleaning-status-text');
    const preview     = document.getElementById('cleaning-preview');
    const placeholder = document.getElementById('cleaning-placeholder');

    btn.innerText = 'Загрузка...'; btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result;
        try {
            const res = await fetch('/api/upload', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64 })
            });
            if (!res.ok) throw new Error('Upload failed ' + res.status);
            const data = await res.json();
            if (data.url) {
                if (preview)     { preview.src = data.url; preview.style.display = 'block'; }
                if (placeholder) placeholder.style.display = 'none';
                if (statusText)  statusText.innerText = '✅ Загружено!';
                btn.innerText = 'Изменить фото'; btn.disabled = false;
                setTimeout(async () => {
                    const resVision = await fetch('/api/vision', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: data.url })
                    });
                    if (resVision.ok) {
                        const vd = await resVision.json();
                        const descEl = document.getElementById('cleaning-description');
                        if (descEl) descEl.innerText = vd.description || 'Анализ завершён';
                    }
                }, 500);
            } else {
                if (statusText) statusText.innerText = '❌ Ошибка загрузки';
                btn.innerText = 'Загрузить фото'; btn.disabled = false;
            }
        } catch(err) {
            console.error('[Salary] Upload error:', err);
            if (statusText) statusText.innerText = '❌ Ошибка: ' + err.message;
            btn.innerText = 'Загрузить фото'; btn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
};
