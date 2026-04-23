/**
 * public/js/salary.js
 * =====================================================
 * Модуль Зарплата (расчёт, таблица, итого).
 *
 * Экспортирует:
 *   openSalaryModal, renderSalaryTable, updateRowMath, refreshSalaryGrandTotal
 *   getMasterSettings, getShiftsAndHours, getFinesInPeriod
 *   handleCleaningUpload (фото уборки)
 *
 * Зависимости: config.js, fines.js (getViolationFine, isMandatoryFine)
 */

window.SALARY_MODE_MANAGER = false;
window.SALARIES_CACHE      = {};

// ==== OPEN SALARY MODAL ====
window.openSalaryModal = function(isManager) {
    window.SALARY_MODE_MANAGER = isManager;
    document.getElementById('salary-modal').classList.add('active');

    const today = dayjs();
    let start, end;
    if (today.day() === 1) { // Monday → show last week
        start = today.subtract(1,'week').startOf('isoWeek').format('YYYY-MM-DD');
        end   = today.subtract(1,'week').endOf('isoWeek').format('YYYY-MM-DD');
    } else {
        start = today.startOf('isoWeek').format('YYYY-MM-DD');
        end   = today.endOf('isoWeek').format('YYYY-MM-DD');
    }
    document.getElementById('salary-date-start').value = start;
    document.getElementById('salary-date-end').value   = end;
    renderSalaryTable();
};

// ==== HELPERS ====
window.getMasterSettings = function(masterName) {
    if (typeof ADAPTER !== 'undefined') {
        for (const loc in ADAPTER) {
            if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                const m = ADAPTER[loc].masters.find(x => x.dash === masterName || (x.el_kassa && x.el_kassa.includes(masterName)));
                if (m) return { base: m.payBase || 5000, percent: m.payPercent || 40, loc };
            }
        }
    }
    return { base: 5000, percent: 40, loc: 'Неизв' };
};

window.getShiftsAndHours = function(masterName, startStr, endStr, scheduleArray) {
    const result = { hours: 0, shiftsCount: 0 };
    if (!scheduleArray) return result;
    for (let d = dayjs(startStr); d.isBefore(dayjs(endStr)) || d.isSame(dayjs(endStr),'day'); d = d.add(1,'day')) {
        const rowDate = d.format('YYYY-MM-DD');
        scheduleArray.filter(s => s.date === rowDate).forEach(sd => {
            if (!sd.masters) return;
            const w = sd.masters.find(wk => wk.name === masterName);
            if (!w) return;
            let sh = 12;
            const text = w.text || w.time || '';
            if (text) {
                try {
                    const nums = text.match(/\d+/g);
                    if (nums && nums.length >= 2) { const sH = parseInt(nums[0]); const eH = parseInt(nums[1]); sh = (eH - sH + 24) % 24 || 12; }
                } catch(e) {}
            }
            result.shiftsCount++;
            result.hours += sh;
        });
    }
    return result;
};

window.getFinesInPeriod = function(masterName, startStr, endStr, ovnArray) {
    if (!ovnArray) return 0;
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
            const isMandatory = typeof isMandatoryFine === 'function' ? isMandatoryFine(r.violation, r.notes) : false;
            const fineVal     = typeof getViolationFine === 'function' ? getViolationFine(r.violation, r.notes) : 0;
            const isViol      = fineVal > 0;
            const vStr        = (r.violation || '').toLowerCase();

            if (isViol) {
                violationsCount++;
                if (!isMandatory) weekViolationsList.push({ type: vStr, fine: fineVal, r });
            }
            if (isMandatory) {
                let finalFine = fineVal;
                if (vStr.includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) { lateCount++; if (lateCount >= 2) finalFine *= 2; }
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

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px"><div class="spinner" style="margin:0 auto 10px auto"></div>Загружаем смены и штрафы...</td></tr>';

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
        const [ovnRes, schedRes] = await Promise.all([
            fetch('/api/ovn?v='+Date.now()).then(r => r.json()).catch(() => []),
            fetch('/api/schedule?v='+Date.now()).then(r => r.json()).catch(() => [])
        ]);

        tbody.innerHTML = '';
        targetMasters.forEach(mName => {
            if (!mName) return;
            const conf   = getMasterSettings(mName);
            let   shifts = getShiftsAndHours(mName, startD, endD, schedRes);
            const fines  = getFinesInPeriod(mName, startD, endD, ovnRes);
            const safeId = mName.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-А-Яа-я]/g,'');
            let   prevRev = (window.SALARIES_CACHE || {})[safeId] || '';

            // Auto-fill revenue from data.json if period matches
            if (window.dashboardData && window.dashboardData.salaryWeekly) {
                const sw  = window.dashboardData.salaryWeekly;
                const swS = sw.start.split('.').reverse().join('-');
                const swE = sw.end.split('.').reverse().join('-');
                if (swS === startD && swE === endD) {
                    let elkassaName = mName;
                    if (typeof ADAPTER !== 'undefined') {
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
                    const fetchedRev      = sw.revenue[elkassaName];
                    const fetchedWorkDays = sw.workDays ? (sw.workDays[elkassaName] || 0) : 0;
                    if (fetchedRev !== undefined && (prevRev === '' || prevRev === '0' || prevRev === 0)) {
                        prevRev = String(fetchedRev);
                        if (!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
                        window.SALARIES_CACHE[safeId] = prevRev;
                    }
                    if (fetchedWorkDays > shifts.shiftsCount) { shifts.shiftsCount = fetchedWorkDays; shifts.hours = fetchedWorkDays * 12; }
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px 10px;border-bottom:1px solid #222">
                    <strong>${mName}</strong><br><span style="font-size:11px;color:#888">${conf.loc}</span>
                </td>
                <td style="padding:12px 10px;border-bottom:1px solid #222;font-size:12px">Выход ${conf.base}₽<br>${conf.percent}%</td>
                <td style="padding:12px 10px;border-bottom:1px solid #222">
                    <div style="position:relative;display:inline-block">
                        <input type="number" id="rev-${safeId}" value="${prevRev}" placeholder="Укажите выручку"
                            style="width:110px;padding:8px 30px 8px 8px;background:#111;color:#fff;border:1px solid #444;border-radius:8px"
                            oninput="window.updateRowMath('${safeId}','${mName}',${conf.base},${conf.percent},${shifts.shiftsCount},${shifts.hours},${fines})">
                    </div>
                </td>
                <td style="padding:12px 10px;border-bottom:1px solid #222;font-size:12px">Смен: ${shifts.shiftsCount}<br>Часов: ${shifts.hours}</td>
                <td style="padding:12px 10px;border-bottom:1px solid #222;color:#FF3B30;font-weight:600">-${fines} ₽</td>
                <td id="res-${safeId}" style="padding:12px 10px;border-bottom:1px solid #222;font-size:17px;font-weight:800;text-align:right;color:#34C759">0 ₽</td>
            `;
            tbody.appendChild(tr);
            updateRowMath(safeId, mName, conf.base, conf.percent, shifts.shiftsCount, shifts.hours, fines);
        });
        console.log('[Salary] Done.');
    } catch (err) {
        console.error('[Salary] Error:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#FF3B30">Ошибка: ${err.message}</td></tr>`;
    }
};

// ==== ROW MATH ====
window.updateRowMath = function(safeId, name, base, percent, shifts, hours, fines) {
    const revInput = document.getElementById('rev-' + safeId);
    if (!revInput) return;
    const rev = parseFloat(revInput.value) || 0;
    if (!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
    window.SALARIES_CACHE[safeId] = revInput.value;

    const basePay      = base * shifts;
    const percentagePay = rev * (percent / 100);
    const earnings     = Math.max(basePay, percentagePay) - fines;

    const resEl = document.getElementById('res-' + safeId);
    if (resEl) {
        resEl.innerHTML = earnings.toLocaleString() + ' ₽'
            + (percentagePay > basePay
                ? '<br><span style="font-size:10px;color:#888">(процент)</span>'
                : '<br><span style="font-size:10px;color:#888">(выход)</span>');
    }
    refreshSalaryGrandTotal();
};

// ==== GRAND TOTAL ====
window.refreshSalaryGrandTotal = function() {
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('td[id^="res-"]').forEach(td => {
        total += parseInt(td.innerText.replace(/[^0-9]/g,'')) || 0;
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
