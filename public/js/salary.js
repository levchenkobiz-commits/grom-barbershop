/**
 * public/js/salary.js
 * FINANCIAL CORE — DO NOT TOUCH unless the user explicitly requests a financial change.
 * Mandatory instructions: /root/grom-dashboard/AGENTS.md
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
    const record = typeof window.getAdapterMasterRecord === 'function'
        ? window.getAdapterMasterRecord(masterName)
        : (typeof window.findAdapterMaster === 'function' ? window.findAdapterMaster(masterName) : null);
    if (!record) {
        throw new Error(`Мастер «${masterName}» отсутствует в адаптере`);
    }
    const base = Number(record.payBase);
    const percent = Number(record.payPercent);
    if (!Number.isFinite(base) || base < 0 || !Number.isFinite(percent) || percent < 0) {
        throw new Error(`Для мастера «${masterName}» не заполнены условия оплаты в адаптере`);
    }
    const branch = ADAPTER[record.location] || {};
    return {
        base,
        percent,
        loc: record.location,
        terminal: branch.el_kassa_terminal || '',
        el_kassa: record.el_kassa || [],
        aliases: record.aliases || []
    };
};

function formatSalaryMoney(value) {
    return `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;
}

function isRecognizedSalaryWorkday(countRaw, scheduled) {
    const count = Number(countRaw) || 0;
    return count >= 1 && (!!scheduled || count >= 2);
}

function calculateSalaryBaseForHours(hoursRaw, baseRaw) {
    const hours = Number(hoursRaw) || 0;
    const base = Number(baseRaw) || 0;
    if (hours > 12) {
        return { basePay: base, overtime: (hours - 12) * 500, overtimeHours: hours - 12 };
    }
    return { basePay: base * (hours / 12), overtime: 0, overtimeHours: 0 };
}

function calculateSalaryEarnings({ basePay, revenue, percent, overtime, replacementBonus, fines }) {
    const values = [basePay, revenue, percent, overtime, replacementBonus, fines].map(Number);
    if (values.some(value => !Number.isFinite(value))) {
        throw new Error('Расчёт зарплаты получил некорректное числовое значение');
    }
    const [safeBase, safeRevenue, safePercent, safeOvertime, safeReplacement, safeFines] = values;
    const percentagePay = safeRevenue * safePercent / 100;
    const usePercent = percentagePay > safeBase;
    return {
        percentagePay,
        usePercent,
        earnings: Math.max(0, Math.max(safeBase, percentagePay) + safeOvertime + safeReplacement - safeFines)
    };
}

function normalizeSalaryName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-zа-я0-9]+/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function findSalaryApiName(candidates, source) {
    const apiNames = Object.keys(source || {});
    const normalizedCandidates = (candidates || []).map(normalizeSalaryName).filter(Boolean);
    const exact = apiNames.find(name => normalizedCandidates.includes(normalizeSalaryName(name)));
    if (exact) return exact;
    const requestedCanonical = (candidates || [])
        .map(name => window.getAdapterMasterCanonical ? window.getAdapterMasterCanonical(name) : null)
        .find(Boolean);
    if (!requestedCanonical) return '';
    const resolved = apiNames.filter(name =>
        window.getAdapterMasterCanonical && window.getAdapterMasterCanonical(name) === requestedCanonical
    );
    return resolved.length === 1 ? resolved[0] : '';
}

async function fetchSalaryJson(url, options, label) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
        throw new Error(payload.error || `${label || 'API'}: ошибка сервера ${response.status}`);
    }
    return payload;
}

function salaryRuDateToIso(value) {
    const match = String(value || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return '';
    return `${match[3]}-${match[2]}-${match[1]}`;
}

function getMasterWeeklySalaryCacheKey(masterName, start, end) {
    return [
        'grome_master_week_salary',
        window.FINANCIAL_CALC_VERSION || 'unversioned',
        normalizeSalaryName(masterName),
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD')
    ].join(':');
}

function readMasterWeeklySalaryCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (!cached || !cached.valueText || !cached.subText) return null;
        return cached;
    } catch(e) {
        return null;
    }
}

function writeMasterWeeklySalaryCache(key, payload) {
    try {
        localStorage.setItem(key, JSON.stringify({
            ...payload,
            cachedAt: Date.now()
        }));
    } catch(e) {}
}

function applyMasterWeeklySalaryCard(payload) {
    const valueEl = document.getElementById('master-week-salary');
    const subEl = document.getElementById('master-week-salary-sub');
    if (valueEl && payload.valueText) valueEl.innerText = payload.valueText;
    if (subEl && payload.subText) subEl.innerText = payload.subText;
}

function getSalaryNameCandidates(masterName) {
    const conf = window.getMasterSettings(masterName);
    return [masterName, ...(conf.el_kassa || [])]
        .map(normalizeSalaryName)
        .filter(Boolean);
}

function isSameSalaryMaster(scheduleName, masterName) {
    if (!scheduleName || !masterName || normalizeSalaryName(scheduleName) === 'мастер') return false;
    return typeof window.isSameAdapterMaster === 'function'
        ? window.isSameAdapterMaster(scheduleName, masterName)
        : (typeof window.findAdapterMaster === 'function'
            && window.findAdapterMaster(scheduleName)?.dash === window.findAdapterMaster(masterName)?.dash);
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
    const matches = (scheduleArray || [])
        .filter(day => day && day.date === isoDate && Array.isArray(day.masters))
        .flatMap(day => day.masters.map(shift => ({ ...shift, location: day.location || shift.location || '' })))
        .filter(shift => isSameSalaryMaster(shift.name, masterName))
        .filter(shift => !/^\s*(выходной|вых|ыходной)\s*$/i.test(String(shift.text || '')));
    if (!matches.length) return null;
    return matches.sort((a, b) => {
        const aReplacement = a.isReplacement || /замена/i.test(a.text || '') ? 1 : 0;
        const bReplacement = b.isReplacement || /замена/i.test(b.text || '') ? 1 : 0;
        return bReplacement - aReplacement || parseSalaryShiftHours(b.text || b.time || '') - parseSalaryShiftHours(a.text || a.time || '');
    })[0];
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
    const result = { shiftsCount: 0, hours: 0, basePay: 0, overtime: 0, overtimeHours: 0, strayDays: [] };
    Object.entries(dailyCounts || {}).forEach(([day, countRaw]) => {
        const count = Number(countRaw) || 0;
        const isoDate = dayjs(day, 'DD.MM.YYYY').format('YYYY-MM-DD');
        const scheduled = getScheduledShift(masterName, isoDate, scheduleArray);
        if (!isRecognizedSalaryWorkday(count, scheduled)) {
            if (count > 0) result.strayDays.push(day);
            return;
        }
        const hours = scheduled ? parseSalaryShiftHours(scheduled.text || scheduled.time || '') : 12;
        const dayPay = calculateSalaryBaseForHours(hours, conf.base);
        result.shiftsCount++;
        result.hours += hours;
        result.basePay += dayPay.basePay;
        result.overtime += dayPay.overtime;
        result.overtimeHours += dayPay.overtimeHours;
    });
    return result;
}

/**
 * Доплата за замену: +500₽ за каждый рабочий день, в котором мастер пробивал
 * выручку на ЧУЖОМ терминале (не на своём «домашнем»).
 * @param {string} matchedEkName   — имя мастера в el.kassa (как в заказах)
 * @param {Object} dailyCounts     — { "dd.mm.yyyy": count } из /api/elkassa/salary
 * @param {Object} terminalsByDay  — { "Имя": { "dd.mm.yyyy": "terminalNumber" } }
 * @param {Object} conf            — getMasterSettings(...) с полем .terminal
 * @returns {{ bonus: number, replacedDays: string[] }}
 */
function calcReplacementBonus(masterName, matchedEkName, dailyCounts, terminalsByDay, terminalSetsByDay, scheduleArray, conf) {
    const out = { bonus: 0, replacedDays: [] };
    if (!conf || !conf.terminal) return out;
    const myTerminal = String(conf.terminal);
    const termMap = (terminalsByDay && matchedEkName) ? (terminalsByDay[matchedEkName] || {}) : {};
    Object.entries(dailyCounts || {}).forEach(([day, countRaw]) => {
        const count = Number(countRaw) || 0;
        const isoDate = dayjs(day, 'DD.MM.YYYY').format('YYYY-MM-DD');
        const scheduled = getScheduledShift(masterName, isoDate, scheduleArray);
        if (!isRecognizedSalaryWorkday(count, scheduled)) return;
        const dayTerminal = termMap[day];
        const terminalSet = terminalSetsByDay && matchedEkName && terminalSetsByDay[matchedEkName]
            ? (terminalSetsByDay[matchedEkName][day] || []) : [];
        const scheduledReplacement = !!(scheduled && (scheduled.isReplacement || /замена/i.test(scheduled.text || '')));
        const terminalReplacement = terminalSet.length
            ? terminalSet.some(terminal => String(terminal) !== myTerminal)
            : !!(dayTerminal && String(dayTerminal) !== myTerminal);
        if (scheduledReplacement || terminalReplacement) {
            out.bonus += 500;
            out.replacedDays.push(day);
        }
    });
    return out;
}

window.getFinesInPeriod = function(masterName, startStr, endStr, ovnArray) {
    if (!ovnArray || typeof calculateFines !== 'function') return 0;
    const results = calculateFines(ovnArray, { start: startStr, end: endStr });
    return results && results[masterName] ? Number(results[masterName].monthFines) || 0 : 0;
};

/**
 * Возвращает детали штрафов мастера за период — для отображения в детализации ЗП по дням.
 * @returns {{total:number, zone:string, byDate:Object}}
 *   total  — суммарный штраф за период
 *   zone   — 'Green' | 'Yellow' | 'Red' (зона текущей недели)
 *   byDate — { "DD.MM.YYYY": [{violation, fine, type}] }
 *
 * Обязательные штрафы показываются в любой зоне; зональные — только когда начислены.
 */
window.getFinesDetailsInPeriod = function(masterName, startStr, endStr, ovnArray) {
    const empty = { total: 0, zone: 'Green', zoneBasisViolations: 0, zoneBasisWeek: '', byDate: {} };
    if (!ovnArray || typeof calculateFines !== 'function') return empty;
    const results = calculateFines(ovnArray, { start: startStr, end: endStr });
    const r = results && results[masterName];
    if (!r) return empty;
    const zone = r.state || 'Green';
    const total = Number(r.monthFines) || 0;
    const details = Array.isArray(r.details) ? r.details : [];
    const byDate = {};
    details.forEach(d => {
        // d.date в формате "DD.MM.YYYY"
        const day = d.date || '';
        if (!byDate[day]) byDate[day] = [];
        byDate[day].push({ violation: d.violation || '', fine: Number(d.fine) || 0, type: d.type || '' });
    });
    return {
        total,
        zone,
        zoneBasisViolations: Number(r.zoneBasisViolations) || 0,
        zoneBasisWeek: r.zoneBasisWeek || '',
        byDate
    };
};
window.renderSalaryTable = async function() {
    console.log('[Salary] Starting...');
    const startD = document.getElementById('salary-date-start').value;
    const endD   = document.getElementById('salary-date-end').value;
    const tbody  = document.getElementById('salary-table-body');
    const status = document.getElementById('salary-period-status');
    const calcButton = document.getElementById('salary-calc-btn');
    if (!tbody) return;

    if (status) {
        status.hidden = true;
        status.textContent = '';
    }
    if (calcButton) calcButton.disabled = true;
    tbody.innerHTML = '<tr class="salary-state-row"><td colspan="6"><span class="salary-loading">Получаю актуальные данные</span></td></tr>';

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
        tbody.innerHTML = '<tr class="salary-state-row"><td colspan="6">Нет данных или мастер не выбран</td></tr>';
        if (calcButton) calcButton.disabled = false;
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
        const calcStartD = salaryRuDateToIso(salaryRes.effectiveStart) || startD;
        const calcEndD   = salaryRuDateToIso(salaryRes.effectiveEnd)   || endD;

        console.log('[Salary] API revenue:', Object.keys(apiRevenue).length, 'masters');

        tbody.innerHTML = '';
        if (salaryRes.dateClamped && salaryRes.effectiveEnd) {
            if (status) {
                status.textContent = `Открытый текущий день исключён. Фактический период El-Kassa: ${salaryRes.effectiveStart} - ${salaryRes.effectiveEnd}.`;
                status.hidden = false;
            }
        }
        targetMasters.forEach(mName => {
            if (!mName) return;
            const conf   = getMasterSettings(mName);
            const fineInfo = getFinesDetailsInPeriod(mName, calcStartD, calcEndD, ovnRes);
            const fines  = fineInfo.total;
            const safeId = mName.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9\-А-Яа-я]/g,'');
            const fineZoneLabel = fineInfo.zone === 'Red' ? 'красная' : (fineInfo.zone === 'Yellow' ? 'жёлтая' : 'зелёная');

            // Находим EK-имя через el_kassa маппинг
            const matchedEkName = findSalaryApiName([mName, ...(conf.el_kassa || [])], apiRevenue);

            const dailyData = matchedEkName ? (apiDaily[matchedEkName] || {}) : {};
            const dailyCounts = matchedEkName ? (apiDailyCounts[matchedEkName] || {}) : {};
            const revenue = Object.values(dailyData).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
            const shifts = buildApiShiftSummary(mName, dailyCounts, schedRes, conf);

            const revFormatted = formatSalaryMoney(revenue);
            const filteredNote = shifts.strayDays.length > 0
                ? `<span class="salary-secondary-value salary-zone-yellow" title="${shifts.strayDays.join(', ')}">Есть услуги вне графика</span>`
                : '';

            const tr = document.createElement('tr');
            tr.className = 'salary-master-row';
            tr.innerHTML = `
                <td class="salary-master-cell">
                    <span class="salary-master-name">${mName}</span>
                    <span class="salary-secondary-value">${conf.loc}</span>
                </td>
                <td class="salary-terms-cell" data-label="Условия">
                    <span class="salary-primary-value">${formatSalaryMoney(conf.base)}</span>
                    <span class="salary-secondary-value">${conf.percent}% от выручки</span>
                </td>
                <td class="salary-revenue-cell" id="rev-cell-${safeId}" data-label="Выручка">
                    <span class="salary-primary-value">${revFormatted}</span>${filteredNote}
                </td>
                <td class="salary-work-cell" data-label="Работа">
                    <span class="salary-primary-value">${shifts.shiftsCount} смен</span>
                    <span class="salary-secondary-value">${shifts.hours} ч</span>
                </td>
                <td class="salary-fines-cell" data-label="Штрафы и зона">
                    <span class="salary-primary-value salary-fine-value">-${formatSalaryMoney(fines)}</span>
                    <span class="salary-secondary-value salary-zone-${fineInfo.zone.toLowerCase()}">${fineZoneLabel}, основание: ${fineInfo.zoneBasisViolations}</span>
                </td>
                <td class="salary-payout-cell" id="res-${safeId}" data-label="К выплате"><span class="salary-primary-value">0 ₽</span></td>
            `;
            tbody.appendChild(tr);

            // Рассчитываем ЗП
            const basePay       = shifts.basePay;
            const overtime      = shifts.overtime || 0;
            const rep           = calcReplacementBonus(mName, matchedEkName, dailyCounts, salaryRes.terminalsByDay, salaryRes.terminalSetsByDay, schedRes, conf);
            const salaryMath    = calculateSalaryEarnings({
                basePay,
                revenue,
                percent: conf.percent,
                overtime,
                replacementBonus: rep.bonus,
                fines
            });
            const earnings      = salaryMath.earnings;

            const resEl = document.getElementById('res-' + safeId);
            if (resEl) {
                resEl.dataset.amount = String(Math.round(earnings));
                const extraParts = [];
                if (overtime > 0)  extraParts.push(`Переработка: +${formatSalaryMoney(overtime)}`);
                if (rep.bonus > 0) extraParts.push(`Замены: +${formatSalaryMoney(rep.bonus)}`);
                const extraHtml = extraParts.length
                    ? '<span class="salary-secondary-value">' + extraParts.join('<br>') + '</span>'
                    : '';
                resEl.innerHTML = `<span class="salary-primary-value">${formatSalaryMoney(earnings)}</span>`
                    + (salaryMath.usePercent
                        ? '<span class="salary-secondary-value">Основа: процент</span>'
                        : '<span class="salary-secondary-value">Основа: выход</span>')
                    + extraHtml;
            }
        });

        refreshSalaryGrandTotal();
        if (calcButton) calcButton.disabled = false;
        console.log('[Salary] Done.');
    } catch (err) {
        console.error('[Salary] Error:', err);
        tbody.innerHTML = `<tr class="salary-state-row"><td colspan="6"><span class="salary-error">Ошибка: ${err.message}</span></td></tr>`;
        const footer = document.getElementById('salary-grand-total');
        if (footer) footer.innerHTML = '';
        if (calcButton) calcButton.disabled = false;
    }
};

window.updateMasterWeeklySalary = async function(options = {}) {
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

    const cacheKey = getMasterWeeklySalaryCacheKey(masterName, start, end);
    // Финансовые данные нельзя показывать из постоянного браузерного кэша:
    // после правки ОВН или смены старая сумма выглядела бы как актуальная.
    // При недоступности источника честно показываем ошибку, а не старый расчёт.
    valueEl.innerText = 'Считаем...';
    if (subEl) subEl.innerText = 'По завершённым дням';

    window._masterWeeklySalaryRequests = window._masterWeeklySalaryRequests || {};
    if (window._masterWeeklySalaryRequests[cacheKey]) {
        return window._masterWeeklySalaryRequests[cacheKey];
    }

    window._masterWeeklySalaryRequests[cacheKey] = (async () => {
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
        const matched = findSalaryApiName(candidates, salaryRes.revenue || {});
        const revenue = matched ? Number(salaryRes.revenue[matched] || 0) : 0;
        const shiftCounts = matched && salaryRes.dailyCounts ? salaryRes.dailyCounts[matched] : {};
        const dailyData = matched && salaryRes.daily ? (salaryRes.daily[matched] || {}) : {};
        const shifts = buildApiShiftSummary(masterName, shiftCounts, scheduleRes, conf);
        const fines = getFinesInPeriod(masterName, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), ovnRes);
        const overtime = shifts.overtime || 0;
        const rep = calcReplacementBonus(masterName, matched, shiftCounts, salaryRes.terminalsByDay, salaryRes.terminalSetsByDay, scheduleRes, conf);
        const salaryMath = calculateSalaryEarnings({
            basePay: shifts.basePay,
            revenue,
            percent: conf.percent,
            overtime,
            replacementBonus: rep.bonus,
            fines
        });
        const percentagePay = salaryMath.percentagePay;
        const usePercent = salaryMath.usePercent;
        const earnings = salaryMath.earnings;

        // ── Детализация по дням (только полные смены: count >= 2 заказов) ──
        const terminalsByDay = (salaryRes.terminalsByDay && matched) ? (salaryRes.terminalsByDay[matched] || {}) : {};
        const dayEntries = [];
        for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
            const ruDate = d.format('DD.MM.YYYY');
            const isoDate = d.format('YYYY-MM-DD');
            const count = Number(shiftCounts[ruDate] || shiftCounts[isoDate] || 0);
            const scheduled = getScheduledShift(masterName, isoDate, scheduleRes);
            if (!isRecognizedSalaryWorkday(count, scheduled)) continue;

            // Часы и база выхода для этого дня
            const dayHours = scheduled ? parseSalaryShiftHours(scheduled.text || scheduled.time || '') : 12;
            const dayPay = calculateSalaryBaseForHours(dayHours, conf.base);
            const dayBasePay = dayPay.basePay;
            // Выручка и процент
            const dayRevenue = Number(dailyData[ruDate] || dailyData[isoDate] || 0);
            const dayPercent = dayRevenue * conf.percent / 100;
            // Тип: что больше для этого дня
            const dayType = dayPercent > dayBasePay ? 'percent' : 'base';
            const dayAmount = Math.max(dayBasePay, dayPercent);
            // Замена для этого дня
            const dayTerm = terminalsByDay[ruDate] || terminalsByDay[isoDate];
            const terminalSetMap = salaryRes.terminalSetsByDay && matched ? (salaryRes.terminalSetsByDay[matched] || {}) : {};
            const dayTerminals = terminalSetMap[ruDate] || terminalSetMap[isoDate] || [];
            const isReplacement = !!(scheduled && (scheduled.isReplacement || /замена/i.test(scheduled.text || ''))) ||
                !!(conf.terminal && (dayTerminals.length
                    ? dayTerminals.some(terminal => String(terminal) !== String(conf.terminal))
                    : dayTerm && String(dayTerm) !== String(conf.terminal)));
            const dayReplacement = isReplacement ? 500 : 0;

            dayEntries.push({
                date: isoDate,
                dateLabel: d.format('DD.MM'),
                weekday: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.day()],
                hours: dayHours,
                revenue: Math.round(dayRevenue),
                basePay: Math.round(dayBasePay),
                percentPay: Math.round(dayPercent),
                amount: Math.round(dayAmount + dayPay.overtime + dayReplacement),
                type: dayType,
                isReplacement,
                replacement: dayReplacement,
            });
        }

        // Детали штрафов (с зоной) — для отображения по дням
        const finesDetails = window.getFinesDetailsInPeriod
            ? window.getFinesDetailsInPeriod(masterName, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), ovnRes)
            : { total: fines, zone: 'Green', byDate: {} };
        // Добавить штрафы каждого дня в dayEntries
        if (finesDetails.byDate) {
            dayEntries.forEach(day => {
                const fineKey = dayjs(day.date).format('DD.MM.YYYY');
                const dayFines = finesDetails.byDate[fineKey] || [];
                if (dayFines.length) {
                    day.fines = dayFines.reduce((s, f) => s + f.fine, 0);
                    day.fineDetails = dayFines;
                    day.amount = Math.max(0, day.amount - day.fines);
                }
            });
        }

        const extraBits = [];
        if (overtime > 0)  extraBits.push(`переработка +${Math.round(overtime).toLocaleString('ru-RU')}₽`);
        if (rep.bonus > 0) extraBits.push(`замена +${rep.bonus}₽`);
        const subText = usePercent
            ? `${conf.percent}% от ${Math.round(revenue).toLocaleString()} ₽, по ${end.format('DD.MM')}`
            : `Выход за ${shifts.shiftsCount} смен, по ${end.format('DD.MM')}`;
        const subTextFull = extraBits.length ? `${subText} · ${extraBits.join(' · ')}` : subText;
        const payload = {
            valueText: `${Math.round(earnings).toLocaleString()} ₽`,
            subText: shifts.strayDays.length ? `${subTextFull} · были пробиты стрижки вне смены` : subTextFull,
            revenue,
            earnings,
            fines,
            shiftsCount: shifts.shiftsCount,
            hours: shifts.hours,
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD'),
            days: dayEntries,
            basePay: Math.round(shifts.basePay),
            percentPay: Math.round(percentagePay),
            overtime: Math.round(overtime),
            replacementBonus: rep.bonus,
            usePercent,
            fineZone: finesDetails.zone,
            fineZoneBasisViolations: finesDetails.zoneBasisViolations,
            fineZoneBasisWeek: finesDetails.zoneBasisWeek,
            finesByDate: finesDetails.byDate,
        };
        applyMasterWeeklySalaryCard(payload);
        return payload;
    })();

    try {
        return await window._masterWeeklySalaryRequests[cacheKey];
    } catch (e) {
        console.error('[Salary] master weekly salary error:', e);
        valueEl.innerText = 'Нет данных';
        if (subEl) subEl.innerText = 'Не удалось получить актуальный расчёт';
        return null;
    } finally {
        delete window._masterWeeklySalaryRequests[cacheKey];
    }
};

// ==== GRAND TOTAL ====
window.refreshSalaryGrandTotal = function() {
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('td[id^="res-"]').forEach(td => {
        total += Number(td.dataset.amount) || 0;
    });
    const footer = document.getElementById('salary-grand-total');
    if (footer) {
        footer.innerHTML = `<span class="salary-total-label">Итого к выплате</span>
            <strong class="salary-total-value">${formatSalaryMoney(total)}</strong>`;
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
