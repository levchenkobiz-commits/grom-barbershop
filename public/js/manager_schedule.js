/**
 * public/js/manager_schedule.js
 * =====================================================
 * График управляющего — Кирилл, Игорь, Ксения.
 *
 * Только два статуса ячейки:
 *   - "Рабочий день" (кликом)
 *   - "Выходной" (кликом)
 *
 * Данные хранятся в /api/manager-schedule (отдельный endpoint).
 * Если endpoint не существует — работает только локально до сохранения.
 *
 * Также обновляет #reaction-time-display в Кабинете менеджера
 * по данным реакций Игоря из OVN-журнала.
 */

const MGR_NAMES = ['Кирилл', 'Игорь', 'Ксения'];

// Локальное хранилище данных графика: { 'YYYY-MM-DD|name': 'work'|'off' }
window.mgrSchedData = window.mgrSchedData || {};
window.mgrSchedDirty = window.mgrSchedDirty || new Set();

function canEditManagerScheduleName(name) {
    if (!window.PERM) return false;
    if (PERM.can('editManagerScheduleAll')) return true;
    return PERM.can('editManagerScheduleOwn') && window.USER && managerNamesMatch(name, window.USER.name);
}

// ==== INIT TABLE ====
window.renderManagerScheduleTable = function() {
    const thead = document.getElementById('mgr-sched-thead');
    const tbody = document.getElementById('mgr-sched-tbody');
    if (!thead || !tbody) return;
    const section = document.getElementById('manager-schedule-section');
    const saveButton = section && section.querySelector('button[onclick="saveManagerSchedule()"]');
    if (saveButton) {
        saveButton.style.display = (PERM.can('editManagerScheduleAll') || PERM.can('editManagerScheduleOwn')) ? 'block' : 'none';
    }

    const today = dayjs();
    const rusDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const DAYS = 31;

    // Find start date from master sched input if exists, else start of current week
    const managerStartInput = document.getElementById('mgr-sched-start-date');
    const startInput = managerStartInput || document.getElementById('sched-start-date');
    const startDateStr = (startInput && startInput.value) ? startInput.value : today.startOf('isoWeek').format('YYYY-MM-DD');
    const startDate = dayjs(startDateStr);
    if (managerStartInput && !managerStartInput.value) managerStartInput.value = startDateStr;

    // ---- Header ----
    let headHtml = '<tr><th class="sched-master-name">Управляющий / Дата</th>';
    for (let i = 0; i < DAYS; i++) {
        const d = startDate.add(i, 'day');
        const isToday = d.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
        const isSun = d.day() === 0;
        const isSat = d.day() === 6;
        headHtml += `<th style="${isToday ? 'color:var(--accent);' : ''}${(isSat||isSun) ? 'opacity:0.5;' : ''}">
            ${d.format('DD.MM')}<br><small style="font-weight:400">${rusDays[d.day()]}</small>
        </th>`;
    }
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // ---- Body (section header + 3 rows) ----
    let bodyHtml = `<tr class="loc-header"><td colspan="${DAYS + 1}" style="color:var(--accent);font-size:13px;padding:10px 16px;background:rgba(232,255,56,0.05);">УПРАВЛЯЮЩИЕ</td></tr>`;

    MGR_NAMES.forEach(name => {
        bodyHtml += `<tr>
            <td class="sched-master-name" style="font-weight:700;font-size:13px;white-space:nowrap;">${name}</td>`;

        for (let i = 0; i < DAYS; i++) {
            const d = startDate.add(i, 'day');
            const dateStr = d.format('YYYY-MM-DD');
            const key = dateStr + '|' + name;
            const isWork = window.mgrSchedData[key] === 'work';
            const isToday = dateStr === today.format('YYYY-MM-DD');
            const isSun = d.day() === 0;
            const isSat = d.day() === 6;
            const editable = canEditManagerScheduleName(name);

            // Default weekends to off
            const defaultOff = isSun || isSat;
            const effectiveWork = isWork;

            const cellStyle = effectiveWork
                ? 'background:rgba(232,255,56,0.15);color:var(--accent);font-weight:700;border:1px solid rgba(232,255,56,0.3);'
                : (defaultOff && !window.mgrSchedData[key]
                    ? 'background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.2);'
                    : 'background:transparent;color:rgba(255,255,255,0.25);');

            bodyHtml += `<td>
                <div class="mgr-sched-cell"
                    onclick="toggleMgrCell(this,'${dateStr}','${name}')"
                    data-date="${dateStr}" data-name="${name}"
                    data-editable="${editable ? '1' : '0'}"
                    title="${editable ? 'Изменить день' : 'Только просмотр'}"
                    style="cursor:${editable ? 'pointer' : 'default'};opacity:${editable ? '1' : '.62'};text-align:center;padding:6px 2px;font-size:11px;border-radius:6px;transition:all 0.15s;min-height:32px;display:flex;align-items:center;justify-content:center;${cellStyle}">
                    ${effectiveWork ? 'Рабочий' : 'Выходной'}
                </div>
            </td>`;
        }
        bodyHtml += '</tr>';
    });

    tbody.innerHTML = bodyHtml;
};

// ==== TOGGLE CELL ====
window.toggleMgrCell = function(el, date, name) {
    if (!canEditManagerScheduleName(name)) {
        if (typeof showToast === 'function') showToast('Можно редактировать только свои дни', 'error');
        return;
    }
    const key = date + '|' + name;
    const isNowWork = window.mgrSchedData[key] === 'work';

    if (isNowWork) {
        // Switch to off
        delete window.mgrSchedData[key];
        el.innerText = 'Выходной';
        el.style.background = 'transparent';
        el.style.color = 'rgba(255,255,255,0.25)';
        el.style.border = 'none';
        el.style.fontWeight = '400';
    } else {
        // Switch to work
        window.mgrSchedData[key] = 'work';
        el.innerText = 'Рабочий';
        el.style.background = 'rgba(232,255,56,0.15)';
        el.style.color = 'var(--accent)';
        el.style.border = '1px solid rgba(232,255,56,0.3)';
        el.style.fontWeight = '700';
    }
    window.mgrSchedDirty.add(key);
};

// ==== SAVE ====
window.saveManagerSchedule = async function() {
    const payload = Object.entries(window.mgrSchedData).map(([key, status]) => {
        const [date, name] = key.split('|');
        return { date, name, status };
    });

    try {
        if (PERM.can('editManagerScheduleAll')) {
            const res = await fetch('/api/manager-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Не удалось сохранить график');
        } else if (PERM.can('editManagerScheduleOwn')) {
            const changes = [...window.mgrSchedDirty].map(key => {
                const [date, name] = key.split('|');
                return { date, name, status: window.mgrSchedData[key] === 'work' ? 'work' : 'off' };
            }).filter(item => canEditManagerScheduleName(item.name));
            if (!changes.length) {
                showToast('Изменений нет', 'info');
                return;
            }
            for (const change of changes) {
                const res = await fetch('/api/manager-schedule', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change)
                });
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Не удалось сохранить день');
            }
        } else {
            throw new Error('Недостаточно прав для изменения графика');
        }
        window.mgrSchedDirty.clear();
        showToast('График сохранён', 'success');
    } catch(e) {
        showToast(e.message || 'Не удалось сохранить график', 'error');
    }
};

// ==== LOAD SAVED DATA ====
async function loadManagerScheduleData() {
    try {
        const res = await fetch('/api/manager-schedule');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                window.mgrSchedData = {};
                data.forEach(item => {
                    if (item.status === 'work') {
                        window.mgrSchedData[item.date + '|' + item.name] = 'work';
                    }
                });
                window.mgrSchedDirty.clear();
            }
        }
    } catch(e) {
        // API may not exist yet — use empty data
    }
    window.renderManagerScheduleTable();
}

// ==== РАБОЧИЕ ЧАСЫ ====
const WORK_START_H = 10;  // 10:00 MSK
const WORK_END_H   = 18;  // 18:00 MSK

/**
 * Возвращает Set рабочих дат Игоря ('YYYY-MM-DD') из mgrSchedData.
 */
function getIgorWorkDays() {
    const days = new Set();
    Object.entries(window.mgrSchedData || {}).forEach(([key, status]) => {
        const [date, name] = key.split('|');
        if (name === 'Игорь' && status === 'work') days.add(date);
    });
    return days;
}

/**
 * Находит «эффективный момент начала» для отсчёта времени реакции.
 *
 * Правила:
 *  1. Если нарушение создано в рабочий день Игоря И в рабочее время (9–22) →
 *     эффективное начало = createdAt
 *  2. Если нарушение создано в рабочий день, но до 09:00 →
 *     эффективное начало = 09:00 того же дня
 *  3. Если нарушение создано в рабочий день, но после 22:00 →
 *     эффективное начало = 09:00 следующего рабочего дня
 *  4. Если нарушение создано в выходной →
 *     эффективное начало = 09:00 следующего рабочего дня
 */
function getEffectiveStart(createdAtStr, igorWorkDays) {
    // Переводим в московское время (UTC+3)
    const created = dayjs(createdAtStr).add(3, 'hour'); // MSK offset
    const dateStr  = created.format('YYYY-MM-DD');
    const hour     = created.hour();

    // Case 1: рабочий день и рабочее время → считаем с момента нарушения
    if (igorWorkDays.has(dateStr) && hour >= WORK_START_H && hour < WORK_END_H) {
        return new Date(createdAtStr).getTime();
    }

    // Case 2: рабочий день, но до 09:00 → считаем с 09:00 того же дня
    if (igorWorkDays.has(dateStr) && hour < WORK_START_H) {
        return dayjs(dateStr).add(WORK_START_H, 'hour').subtract(3, 'hour').valueOf(); // back to UTC
    }

    // Case 3 & 4: выходной или после 22:00 → ищем следующий рабочий день
    let next = created.add(1, 'day').startOf('day');
    // Если сегодня рабочий но после 22 — начинаем искать со следующего дня
    for (let i = 0; i < 60; i++) {
        const nextStr = next.format('YYYY-MM-DD');
        if (igorWorkDays.has(nextStr)) {
            // 09:00 MSK → UTC
            return dayjs(nextStr).add(WORK_START_H, 'hour').subtract(3, 'hour').valueOf();
        }
        next = next.add(1, 'day');
    }

    // Fallback (нет данных по расписанию): используем фактическое время создания
    return new Date(createdAtStr).getTime();
}

/**
 * Считает количество рабочих миллисекунд между effectiveStart и reactionAt.
 * Только интервалы 09:00–22:00 в рабочие дни Игоря суммируются.
 */
function calcWorkingMs(effectiveStartMs, reactionAtMs, igorWorkDays) {
    // Если расписание пустое — считаем просто разность
    if (igorWorkDays.size === 0) return reactionAtMs - effectiveStartMs;

    let total = 0;
    let cursor = dayjs(effectiveStartMs).add(3, 'hour'); // MSK
    const end  = dayjs(reactionAtMs).add(3, 'hour');     // MSK

    // Итерируем по рабочим отрезкам (09:00–22:00) день за днём
    while (cursor.isBefore(end)) {
        const dateStr  = cursor.format('YYYY-MM-DD');
        const dayStart = dayjs(dateStr).hour(WORK_START_H);
        const dayEnd   = dayjs(dateStr).hour(WORK_END_H);

        if (igorWorkDays.has(dateStr)) {
            // Пересечение [cursor, end] ∩ [dayStart, dayEnd]
            const segStart = cursor.isAfter(dayStart) ? cursor : dayStart;
            const segEnd   = end.isBefore(dayEnd) ? end : dayEnd;
            if (segEnd.isAfter(segStart)) {
                total += segEnd.valueOf() - segStart.valueOf();
            }
        }

        // Перейти к 09:00 следующего дня
        cursor = dayjs(dateStr).add(1, 'day').hour(WORK_START_H);
    }

    return total;
}

function normalizeManagerName(name) {
    return String(name || '')
        .replace(/\([^)]*\)/g, '')
        .trim()
        .toLowerCase();
}

function managerNamesMatch(scheduleName, managerName) {
    const a = normalizeManagerName(scheduleName);
    const b = normalizeManagerName(managerName);
    return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
}

function getManagerNameForReaction(report) {
    const direct = report && (
        report.assignedManager ||
        report.managerName ||
        report.manager ||
        report.responsibleManager ||
        report.reactionBy
    );
    if (direct && !['Менеджер', 'Manager'].includes(String(direct).trim())) return direct;
    if (window.USER && window.USER.role === 'manager' && window.USER.name) return window.USER.name;
    return 'Игорь';
}

function getManagerWorkDays(managerName) {
    const days = new Set();
    Object.entries(window.mgrSchedData || {}).forEach(([key, status]) => {
        const [date, name] = key.split('|');
        if (status === 'work' && managerNamesMatch(name, managerName)) days.add(date);
    });
    return days;
}

function toMskDate(ms) {
    return new Date(ms + 3 * 3600000).toISOString().slice(0, 10);
}

function toMskMinutes(ms) {
    const d = new Date(ms + 3 * 3600000);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function mskWallTimeToUtcMs(dateStr, hour, minute) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Date.UTC(y, m - 1, d, hour - 3, minute || 0, 0, 0);
}

function addMskDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days, 0, 0, 0, 0)).toISOString().slice(0, 10);
}

function getEffectiveManagerReactionStart(createdAtMs, workDays) {
    if (!workDays || workDays.size === 0) return null;

    const dateStr = toMskDate(createdAtMs);
    const minutes = toMskMinutes(createdAtMs);
    const startMin = WORK_START_H * 60;
    const endMin = WORK_END_H * 60;

    if (workDays.has(dateStr)) {
        if (minutes < startMin) return mskWallTimeToUtcMs(dateStr, WORK_START_H, 0);
        if (minutes < endMin) return createdAtMs;
    }

    for (let i = 1; i <= 60; i++) {
        const nextStr = addMskDays(dateStr, i);
        if (workDays.has(nextStr)) return mskWallTimeToUtcMs(nextStr, WORK_START_H, 0);
    }

    return null;
}

function calcManagerWorkingMsBetween(startMs, endMs, workDays) {
    if (!workDays || workDays.size === 0 || !Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
    if (endMs <= startMs) return 0;

    let total = 0;
    let dateStr = toMskDate(startMs);
    const endDateStr = toMskDate(endMs);

    for (let guard = 0; guard < 370; guard++) {
        if (workDays.has(dateStr)) {
            const dayStart = mskWallTimeToUtcMs(dateStr, WORK_START_H, 0);
            const dayEnd = mskWallTimeToUtcMs(dateStr, WORK_END_H, 0);
            const segStart = Math.max(startMs, dayStart);
            const segEnd = Math.min(endMs, dayEnd);
            if (segEnd > segStart) total += segEnd - segStart;
        }
        if (dateStr === endDateStr) break;
        dateStr = addMskDays(dateStr, 1);
    }

    return total;
}

window.formatReactionDuration = function(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '0мин';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}ч ${m}мин`;
    return `${m}мин`;
};

window.getOvnReactionWorkingMs = function(report, untilMs) {
    if (!report || !report.createdAt) return 0;
    const createdAt = new Date(report.createdAt).getTime();
    const endAt = Number.isFinite(untilMs)
        ? untilMs
        : (report.reactionAt ? new Date(report.reactionAt).getTime() : Date.now());
    if (!Number.isFinite(createdAt) || !Number.isFinite(endAt)) return 0;

    const managerName = getManagerNameForReaction(report);
    const workDays = getManagerWorkDays(managerName);
    const effectiveStart = getEffectiveManagerReactionStart(createdAt, workDays);
    if (effectiveStart === null || endAt <= effectiveStart) return 0;

    return calcManagerWorkingMsBetween(effectiveStart, endAt, workDays);
};

window.getOvnReactionManagerName = getManagerNameForReaction;

// ==== REACTION TIME for Igor ====
// Updates #reaction-time-display and #card-avg-reaction with Igor's working-hours data
window.updateIgorReactionTime = function(reports) {
    if (!reports || !reports.length) return;

    const reactionStatsFrom = Date.parse('2026-06-20T00:00:00+03:00');

    // Фильтруем записи с реакцией
    const igorReacted = reports.filter(r =>
        r.reactionAt && r.createdAt &&
        new Date(r.createdAt).getTime() >= reactionStatsFrom &&
        (
            (r.reactionBy && r.reactionBy.includes('Игорь')) ||
            (r.reaction && !r.reactionBy) // fallback: все с реакцией, если нет reactionBy
        )
    );
    const reacted = igorReacted.length > 0
        ? igorReacted
        : reports.filter(r =>
            r.reactionAt && r.createdAt &&
            new Date(r.createdAt).getTime() >= reactionStatsFrom
        );

    function formatTime(ms) {
        if (ms <= 0) return '0 мин';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (h > 0) return h + 'ч ' + m + 'мин';
        return m + 'мин';
    }

    function getColor(ms) {
        const mins = ms / 60000;
        if (mins <= 30) return '#34C759';
        if (mins <= 60) return '#FF9F0A';
        return '#FF3B30';
    }

    if (reacted.length > 0) {
        const igorWorkDays = getIgorWorkDays();

        // Считаем рабочее время реакции для каждой записи по графику менеджера.
        const workingTimes = reacted.map(r => window.getOvnReactionWorkingMs(r));

        const avgMs    = workingTimes.reduce((a, b) => a + b, 0) / workingTimes.length;
        const formatted = formatTime(avgMs);
        const color     = getColor(avgMs);

        // Подсказка о методе расчёта
        const hasSchedule = igorWorkDays.size > 0;
        const subtitleEl  = document.getElementById('reaction-time-subtitle');
        if (subtitleEl) {
            subtitleEl.innerText = hasSchedule
                ? 'Только рабочее время менеджера (10:00–18:00 МСК)'
                : 'Расписание не задано — полное время';
        }

        // Большой дисплей в кабинете менеджера
        const bigEl = document.getElementById('reaction-time-display');
        if (bigEl) { bigEl.innerText = formatted; bigEl.style.color = color; }

        // Карточка аналитики
        const cardEl = document.getElementById('card-avg-reaction');
        if (cardEl) { cardEl.innerText = formatted; cardEl.style.color = color; }
    } else {
        const bigEl  = document.getElementById('reaction-time-display');
        if (bigEl)  bigEl.innerText  = 'Нет данных';
        const cardEl = document.getElementById('card-avg-reaction');
        if (cardEl) cardEl.innerText = 'Нет данных';
    }
};

// ==== INIT on schedule tab switch ====
// Hook into sched-start-date changes to re-render
document.addEventListener('DOMContentLoaded', () => {
    ['sched-start-date', 'mgr-sched-start-date'].forEach(id => {
        const dateInput = document.getElementById(id);
        if (!dateInput) return;
        dateInput.addEventListener('change', () => {
            window.renderManagerScheduleTable();
        });
    });
});

// ==== LOAD on app startup ====
window.loadManagerSchedule = function() {
    return loadManagerScheduleData();
};
