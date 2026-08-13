/**
 * public/js/fines.js
 * ФИНАНСОВОЕ ЯДРО — НЕ ТРОГАТЬ / DO NOT TOUCH.
 * Менять только по прямой просьбе пользователя изменить финансовую механику.
 * UI, аналитика, рефакторинг и соседние задачи не дают разрешения менять этот файл.
 * Mandatory instructions: /root/grom-dashboard/AGENTS.md
 * =====================================================
 * Модуль штрафов: расчёт, таблица, ручное начисление, справочник.
 *
 * Экспортирует глобально:
 *   calculateFines, getViolationFine, isMandatoryFine
 *   openFinesModal, renderFinesTable
 *   openHandbookConfigModal, closeHandbookConfigModal,
 *   renderHandbookEditor, saveHandbookConfig, deleteHandbookItem
 *
 * Зависимости: config.js (window.GLOBAL_HANDBOOK, window.ADAPTER)
 */

// ==== FINE CALCULATION HELPERS ====

// Версия входит в ключ локального кэша зарплаты. При любом изменении
// финансовой формулы её обязательно нужно повысить, чтобы старый расчёт
// никогда не отображался после обновления кода.
window.FINANCIAL_CALC_VERSION = '20260813-punctuality-v12';

function canonicalizeViolation(violationRaw) {
    return window.VIOLATION_RULES
        ? window.VIOLATION_RULES.canonicalizeViolation(violationRaw)
        : String(violationRaw || '').trim();
}

function splitCanonicalViolations(violationRaw) {
    return window.VIOLATION_RULES
        ? window.VIOLATION_RULES.splitViolations(violationRaw)
        : (Array.isArray(violationRaw) ? violationRaw : String(violationRaw || '').split(',')).map(canonicalizeViolation).filter(Boolean);
}

function isZoneExcludedViolation(violationRaw) {
    if (window.VIOLATION_RULES) return window.VIOLATION_RULES.isZoneExcludedViolation(violationRaw);
    const text = canonicalizeViolation(violationRaw).toLowerCase();
    return text.includes('опоздал') || text === 'отказ клиенту';
}

function isFineWaivedByForceMajeure(r, violationRaw, notesRaw) {
    const text = `${violationRaw || ''} ${notesRaw || ''} ${(r && r.forceMajeureType) || ''}`.toLowerCase();
    return !!(r && (r.isForceMajeure || r.fineWaived)) || text.includes('форс-мажор');
}

/**
 * Возвращает сумму штрафа для одного нарушения.
 */
function getViolationFine(violationRaw, notesRaw, r) {
    if (isFineWaivedByForceMajeure(r, violationRaw, notesRaw)) return 0;
    if (r && r.isManualFine) return Number(r.cost) || 0;

    const recordedText = splitCanonicalViolations((r && r.violation) || violationRaw).join(' ').toLowerCase();
    const recordedMandatory = !!(r && r.schedTime) ||
        recordedText.includes('опоздал') ||
        recordedText.includes('отказ клиенту') ||
        recordedText.includes('не вышел') || recordedText.includes('невыход') ||
        recordedText.includes('воровство') || recordedText.includes('неоплаченная') ||
        recordedText.includes('терминал') || recordedText.includes('пробит');
    if (recordedMandatory && hasActualFine(r)) return Math.max(0, getActualFine(r));

    const violations = splitCanonicalViolations(violationRaw);

    let maxFine = 0;

    for (const raw of violations) {
        const v = canonicalizeViolation(raw).toLowerCase();
        const n = (notesRaw || '').toLowerCase();
        let currentFine = 0;

        const handbook = window.GLOBAL_HANDBOOK || {};
        const isSecondMaster = r && String(r.slot || '') === '2';
        for (const [key, value] of Object.entries(handbook)) {
            if (v.includes(canonicalizeViolation(key).toLowerCase())) {
                currentFine = value; break;
            }
        }

        // Unpaid services — extract exact amount
        if (v.includes('пробиты не все услуги')) {
            const explicitAmount = Number(r && r.unpaidAmount);
            const m = (n + ' ' + v).match(/сумма непробитых услуг:\s*(\d+)/i);
            if (explicitAmount > 0) currentFine = explicitAmount;
            else if (m) currentFine = parseInt(m[1], 10);
        }

        // Опоздания всегда берут сумму из справочника по диапазону.
        if (v.includes('опоздал')) {
            const match = n.match(/на\s+(\d+)\s+мин/);
            const minutes = match ? parseInt(match[1]) : 0;
            let key = '';
            if      (minutes >= 61) key = 'Опоздание 61+ мин (Невыход)';
            else if (minutes >= 31) key = 'Опоздание 31-60 мин';
            else if (minutes >= 21) key = 'Опоздание 21-30 мин';
            else if (minutes >= 11) key = 'Опоздание 11-20 мин';
            else if (minutes >= 4)  key = 'Опоздание 4-10 мин';
            else if (minutes >= 1)  key = 'Опоздание 1-3 мин';
            if (key) {
                const secondKey = `Опоздание второй мастер ${key.replace('Опоздание ', '')}`;
                currentFine = Number(handbook[isSecondMaster ? secondKey : key]) || 0;
            }
        } else if (v.includes('не вышел') || v.includes('не выход') || v.includes('невыход')) {
            currentFine = Number(handbook['Невыход']) || 0;
        } else if (v.includes('воровство') || v.includes('неоплаченная') || v.includes('терминал')) {
            currentFine = Number(handbook['Услуга не проведена через терминал']) || 0;
        }

        if (currentFine > maxFine) maxFine = currentFine;
    }
    return maxFine;
}

function hasActualFine(r) {
    return r && r.fine !== undefined && r.fine !== null && r.fine !== '' && Number.isFinite(Number(r.fine));
}

function getActualFine(r) {
    return hasActualFine(r) ? Number(r.fine) : 0;
}

function isMandatoryFine(vRaw, nRaw, r) {
    if (isFineWaivedByForceMajeure(r, vRaw, nRaw)) return false;
    if (r && r.isManualFine) return true;
    const violations = splitCanonicalViolations(vRaw);

    for (const raw of violations) {
        const v = canonicalizeViolation(raw).toLowerCase();
        if (v.includes('пробит'))    return true;
        if (v.includes('опоздал')) return true;
        if (v.includes('отказ клиенту')) return true;
        if (v.includes('воровство') || v.includes('неоплаченная') || v.includes('терминал')) return true;
        if (v.includes('не вышел') || v.includes('не выход') || v.includes('невыход')) return true;
    }
    return false;
}

/**
 * Вычисляет штрафы за выбранный период.
 * @param {Array} reports - все OVN отчёты
 * @param {Object} targetPeriod - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @returns {Object} { masterName: { loc, state, weekViolations, monthFines, details: [...] } }
 */
function getAdapterMasterCanonical(name) {
    if (!name || typeof window.findAdapterMaster !== 'function') return null;
    return window.findAdapterMaster(name)?.dash || null;
}

function getAdapterMasterLocation(name) {
    if (!name || typeof window.findAdapterMaster !== 'function') return '';
    return window.findAdapterMaster(name)?.location || '';
}

function normalizeFinesPeriod(targetPeriod) {
    let start = targetPeriod && targetPeriod.start ? dayjs(targetPeriod.start) : null;
    let end = targetPeriod && targetPeriod.end ? dayjs(targetPeriod.end) : null;

    if (!start || !start.isValid()) start = dayjs().startOf('month');
    if (!end || !end.isValid()) end = dayjs().endOf('month');
    if (end.isBefore(start, 'day')) {
        const tmp = start;
        start = end;
        end = tmp;
    }

    return {
        start: start.startOf('day'),
        end: end.endOf('day'),
        label: `${start.format('DD.MM.YYYY')} - ${end.format('DD.MM.YYYY')}`
    };
}

function isFineReportInPeriod(report, period) {
    const d = dayjs(report.date || report.createdAt);
    return d.isValid() && !d.isBefore(period.start) && !d.isAfter(period.end);
}

function calculateFines(reports, targetPeriod) {
    const period = normalizeFinesPeriod(targetPeriod);

    const masters = {};
    const adapterMasterNames = new Set();
    if (typeof getAdapterMasterNames === 'function') {
        getAdapterMasterNames().forEach(name => {
            adapterMasterNames.add(name);
            masters[name] = { reports: [], loc: getAdapterMasterLocation(name) };
        });
    }

    reports.forEach(r => {
        if (!r.barber) return;
        const name = getAdapterMasterCanonical(r.barber);
        if (!name || !adapterMasterNames.has(name)) return;
        masters[name].reports.push(r);
    });

    const results = {};

    for (const master in masters) {
        const mReports = masters[master].reports.sort((a, b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());
        let state              = 'Green';
        let displayState       = 'Green';
        let displayBasisCount  = 0;
        let displayBasisWeek   = '';
        let currentMonthFines  = 0;
        const weeks            = {};
        const details          = []; // детализация штрафов
        const zoneDetails      = []; // нарушения периода, влияющие на зону

        mReports.forEach(r => {
            const d   = dayjs(r.date || r.createdAt);
            if (!d.isValid() || d.isAfter(period.end)) return;
            const wId = d.startOf('isoWeek').format('YYYY-MM-DD');
            if (!weeks[wId]) weeks[wId] = [];
            weeks[wId].push(r);
        });

        const reportWeekIds = Object.keys(weeks).sort();
        const targetWeek = period.end.startOf('isoWeek');
        const targetWeekId = targetWeek.format('YYYY-MM-DD');
        let cursor = reportWeekIds.length ? dayjs(reportWeekIds[0]) : targetWeek;
        if (cursor.isAfter(targetWeek, 'day')) cursor = targetWeek;
        const sortedWeeks = [];
        while (!cursor.isAfter(targetWeek, 'day')) {
            sortedWeeks.push(cursor.format('YYYY-MM-DD'));
            cursor = cursor.add(1, 'week');
        }

        let periodViolationsCount = 0;
        let previousWeekViolations = 0;

        for (const wId of sortedWeeks) {
            const weekReports   = weeks[wId] || [];
            let violationsCount = 0;
            const weekViolationsList = [];

            weekReports.forEach(r => {
                const inPeriod = isFineReportInPeriod(r, period);
                const vList = splitCanonicalViolations(r.violation);

                vList.forEach(vName => {
                    if (!vName) return;
                    if (isFineWaivedByForceMajeure(r, vName, r.notes)) return;
                    if (window.VIOLATION_RULES ? window.VIOLATION_RULES.isNoViolation(vName) : (vName.toLowerCase().includes('замечаний нет') || vName.toLowerCase().includes('нет нарушений') || vName.includes('✅'))) return;
                    const fine        = getViolationFine(vName, r.notes, r);
                    const isMandatory = isMandatoryFine(vName, r.notes, r);

                    const affectsZone = !isZoneExcludedViolation(vName);
                    if (affectsZone) {
                        violationsCount++;
                        if (inPeriod) {
                            periodViolationsCount++;
                            zoneDetails.push({
                                id: r.id,
                                date: dayjs(r.date || r.createdAt).format('DD.MM.YYYY'),
                                violation: vName,
                                notes: r.notes || '',
                                location: r.location || ''
                            });
                        }
                    }

                    if (isMandatory) {
                        let finalFine = fine;
                        if (inPeriod && finalFine > 0) {
                            currentMonthFines += finalFine;
                            details.push({
                                id: r.id,
                                date: dayjs(r.date || r.createdAt).format('DD.MM.YYYY'),
                                violation: vName,
                                notes: r.notes || '',
                                location: r.location || '',
                                fine: finalFine,
                                type: 'mandatory'
                            });
                        }
                    } else if (fine > 0) {
                        weekViolationsList.push({ type: vName.toLowerCase(), fine, r, vName, date: r.date || r.createdAt, location: r.location });
                    }
                });
            });

            const activeState = state;
            if (wId === targetWeekId) {
                displayState = activeState;
                displayBasisCount = previousWeekViolations;
                displayBasisWeek = dayjs(wId).subtract(1, 'week').format('DD.MM.YYYY');
            }
            let zoneFine = 0;
            const finesApplied = [];
            if (activeState === 'Yellow' && weekViolationsList.length > 0) {
                const freq = {};
                weekViolationsList.forEach(v => { freq[v.type] = (freq[v.type]||0)+1; });
                const maxFrequency = Math.max(...Object.values(freq));
                const topTypes = new Set(Object.keys(freq).filter(type => freq[type] === maxFrequency));
                weekViolationsList.forEach(v => {
                    if (!topTypes.has(v.type)) return;
                    zoneFine += v.fine;
                    finesApplied.push(v);
                });
            } else if (activeState === 'Red') {
                weekViolationsList.forEach(v => { zoneFine += v.fine; finesApplied.push(v); });
            }

            // Нарушения этой недели определяют зону только следующей недели.
            if (violationsCount >= 14) state = 'Red';
            else if (violationsCount >= 10) state = 'Yellow';
            else state = 'Green';
            previousWeekViolations = violationsCount;

            if (zoneFine > 0) {
                finesApplied.forEach(v => {
                    if (!isFineReportInPeriod(v.r || { date: v.date }, period)) return;
                    currentMonthFines += v.fine;
                    details.push({
                        id: v.r ? v.r.id : undefined,
                        date: dayjs(v.date).format('DD.MM.YYYY'),
                        violation: v.vName || v.type,
                        notes: v.r ? (v.r.notes || '') : '',
                        location: v.location || '',
                        fine: v.fine,
                        type: 'zone'
                    });
                });
            }
        }

        results[master] = {
            loc:            masters[master].loc,
            state:          displayState,
            zoneBasisViolations: displayBasisCount,
            zoneBasisWeek:  displayBasisWeek,
            weekViolations: periodViolationsCount,
            monthFines:     currentMonthFines,
            zoneDetails:    zoneDetails.sort((a, b) => {
                const da = a.date.split('.').reverse().join('');
                const db = b.date.split('.').reverse().join('');
                return da.localeCompare(db);
            }),
            details:        details.sort((a, b) => {
                const da = a.date.split('.').reverse().join('');
                const db = b.date.split('.').reverse().join('');
                return da.localeCompare(db);
            })
        };
    }
    return results;
}

window.calculateFines = calculateFines;
window.getViolationFine = getViolationFine;
window.isMandatoryFine = isMandatoryFine;
window.isFineWaivedByForceMajeure = isFineWaivedByForceMajeure;
window.isZoneExcludedViolation = isZoneExcludedViolation;

// ==== FINES MODAL ====
// Хранение отчётов для детализации
let _finesAllReports = [];
let _finesResults    = {};
let _finesSortKey    = 'fine';

function updateFinesSortHeaders() {
    document.querySelectorAll('[data-fines-sort-header]').forEach(header => {
        const isActive = header.dataset.finesSortHeader === _finesSortKey;
        header.setAttribute('aria-sort', isActive ? 'descending' : 'none');
        const button = header.querySelector('.fines-sort-button');
        if (button) button.classList.toggle('is-active', isActive);
    });
}

window.setFinesSort = function(sortKey) {
    if (sortKey !== 'fine' && sortKey !== 'violations') return;
    _finesSortKey = sortKey;
    updateFinesSortHeaders();
    renderFinesTable();
};

window.openFinesModal = function() {
    document.getElementById('fines-modal').classList.add('active');
    ['fines-date-start', 'fines-date-end'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    });
    const selector = document.getElementById('fines-month-select');
    if (selector) {
        selector.style.minWidth = '280px';
        const hint = selector.parentElement && selector.parentElement.querySelector('div');
        if (hint) hint.textContent = 'Расчёт строго за календарную неделю: понедельник-воскресенье. Зона определяется предыдущей неделей.';
    }
    const sel = document.getElementById('fines-month-select');
    if (sel && !sel.value) {
        const monday = dayjs().startOf('isoWeek');
        sel.value = `${monday.format('YYYY-MM-DD')}|${monday.add(6, 'day').format('YYYY-MM-DD')}`;
    }
    syncFinesDateInputsFromSelect();
    renderFinesTable();
};

window.applyFinesMonthPreset = function() {
    syncFinesDateInputsFromSelect();
    renderFinesTable();
};

function getSelectedFinesPeriod() {
    const sel = document.getElementById('fines-month-select');
    const startEl = document.getElementById('fines-date-start');
    const endEl = document.getElementById('fines-date-end');
    if (startEl && endEl && startEl.value && endEl.value) {
        return normalizeFinesPeriod({
            start: startEl.value,
            end: endEl.value
        });
    }
    const [start, end] = String((sel && sel.value) || '').split('|');
    return normalizeFinesPeriod({
        start,
        end
    });
}

function syncFinesDateInputsFromSelect() {
    const sel = document.getElementById('fines-month-select');
    const startEl = document.getElementById('fines-date-start');
    const endEl = document.getElementById('fines-date-end');
    if (!sel || !startEl || !endEl || !sel.value) return;
    const [start, end] = String(sel.value).split('|');
    if (start && end) {
        startEl.value = start;
        endEl.value = end;
    }
}

async function renderFinesTable() {
    const tbody = document.getElementById('fines-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Загрузка...</td></tr>';

    // Скрываем детализацию при обновлении
    const detailBlock = document.getElementById('fines-detail-block');
    if (detailBlock) detailBlock.style.display = 'none';

    try {
        if (window.HANDBOOK_READY) await window.HANDBOOK_READY;
        const res     = await fetch('/api/ovn');
        const reports = await res.json();
        _finesAllReports = reports;

        // Заполняем доступные календарные недели.
        populateMonthSelect(reports);

        const targetPeriod = getSelectedFinesPeriod();
        const results = calculateFines(reports, targetPeriod);
        _finesResults = results;

        if (Object.keys(results).length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Нет данных за этот период</td></tr>';
            return;
        }

        const displayPeriod = targetPeriod.label;
        const zoneBadge    = {
            'Green':  `<span style="color:#34C759;background:rgba(52,199,89,0.15);padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;">🟢 ЗЕЛЕНАЯ</span>`,
            'Yellow': `<span style="color:#FF9F0A;background:rgba(255,159,10,0.15);padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;">🟡 ЖЕЛТАЯ</span>`,
            'Red':    `<span style="color:#FF3B30;background:rgba(255,59,48,0.15);padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;">🔴 КРАСНАЯ</span>`
        };

        // Оба режима сортируются только по убыванию.
        const sorted = Object.entries(results).sort((a, b) => {
            const primary = _finesSortKey === 'violations'
                ? b[1].weekViolations - a[1].weekViolations
                : b[1].monthFines - a[1].monthFines;
            if (primary !== 0) return primary;
            const secondary = _finesSortKey === 'violations'
                ? b[1].monthFines - a[1].monthFines
                : b[1].weekViolations - a[1].weekViolations;
            return secondary || a[0].localeCompare(b[0], 'ru');
        });
        updateFinesSortHeaders();

        tbody.innerHTML = sorted.map(([m, data]) => `
            <tr onclick="showFineDetail('${m.replace(/'/g, "\\'")}')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background=''">
                <td>${displayPeriod}</td>
                <td style="font-weight:700;color:#E8FF38;text-decoration:underline;text-underline-offset:3px">${m}</td>
                <td>${zoneBadge[data.state]}</td>
                <td title="Количество нарушений, влияющих на зону"><strong style="color:white;font-size:15px;">${data.weekViolations}</strong></td>
                <td style="color:#FF3B30;font-weight:700;font-size:15px;">${data.monthFines.toLocaleString()} ₽</td>
            </tr>`).join('');

    } catch(e) {
        console.error('[Fines]', e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#FF3B30">Ошибка загрузки данных.</td></tr>';
    }
}

/**
 * Заполняет select календарными неделями (понедельник-воскресенье).
 */
function populateMonthSelect(reports) {
    const sel = document.getElementById('fines-month-select');
    if (!sel) return;

    const weeks = new Set();
    reports.forEach(r => {
        const d = dayjs(r.date || r.createdAt);
        if (d.isValid()) weeks.add(d.startOf('isoWeek').format('YYYY-MM-DD'));
    });

    const currentVal = sel.value;
    const currentMonday = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    weeks.add(currentMonday);
    const sortedWeeks = Array.from(weeks).sort().reverse();
    const ruMonths = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

    sel.innerHTML = sortedWeeks.map(start => {
        const from = dayjs(start);
        const to = from.add(6, 'day');
        const value = `${start}|${to.format('YYYY-MM-DD')}`;
        const label = `${from.format('D')} ${ruMonths[from.month()]} - ${to.format('D')} ${ruMonths[to.month()]} ${to.format('YYYY')}`;
        return `<option value="${value}" ${value === currentVal ? 'selected' : ''}>${label}</option>`;
    }).join('');
    if (!sel.value && sel.options.length) sel.selectedIndex = 0;
}

/**
 * Показать детализацию штрафов для мастера
 */
window.showFineDetail = function(masterName) {
    const data = _finesResults[masterName];
    if (!data) return;

    const block = document.getElementById('fines-detail-block');
    const title = document.getElementById('fines-detail-title');
    const tbody = document.getElementById('fines-detail-tbody');
    if (!block || !tbody) return;

    title.textContent = `Нарушения: ${masterName}`;

    const rowsBySource = new Map();
    const detailKey = d => `${d.id || ''}|${d.date || ''}|${d.location || ''}|${d.violation || ''}`;
    (data.zoneDetails || []).forEach(d => {
        rowsBySource.set(detailKey(d), { ...d, affectsZone: true, fine: 0 });
    });
    (data.details || []).forEach(d => {
        const key = detailKey(d);
        const existing = rowsBySource.get(key);
        if (existing) {
            existing.fine = Number(d.fine) || 0;
            existing.fineType = d.type;
        } else {
            rowsBySource.set(key, { ...d, affectsZone: false, fine: Number(d.fine) || 0 });
        }
    });
    const displayDetails = Array.from(rowsBySource.values()).sort((a, b) => {
        const da = String(a.date || '').split('.').reverse().join('');
        const db = String(b.date || '').split('.').reverse().join('');
        return da.localeCompare(db);
    });

    if (displayDetails.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;padding:20px;">Нарушений и штрафов за этот период нет</td></tr>';
    } else {
        let total = 0;
        const renderDetailRows = rows => rows.map(d => {
            total += Number(d.fine) || 0;
            const editId = d.id || findFineSourceReportId(masterName, d);
            const editButton = editId
                ? `<button onclick="editOvnFromFines('${editId}', event)" title="Открыть исходную ОВН-проверку" style="margin-top:7px;background:rgba(232,255,56,0.14);border:1px solid rgba(232,255,56,0.55);color:#E8FF38;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:800;white-space:nowrap">Редактировать ОВН</button>`
                : '';
            return `<tr>
                <td style="white-space:nowrap">${d.date}</td>
                <td>
                    <div>${d.violation}</div>
                    ${editButton}
                </td>
                <td style="color:#FF3B30;font-weight:700;text-align:right;white-space:nowrap">${d.fine > 0 ? d.fine.toLocaleString() + ' ₽' : '—'}</td>
            </tr>`;
        }).join('');

        const zoneRows = displayDetails.filter(d => d.affectsZone);
        const lateRows = displayDetails.filter(d => !d.affectsZone && /опоздал/i.test(String(d.violation || '')));
        const refusalRows = displayDetails.filter(d => !d.affectsZone && /отказ клиенту/i.test(String(d.violation || '')));
        const detailGroups = [];
        if (zoneRows.length) {
            detailGroups.push(`
                <tr class="fines-detail-group fines-detail-group-zone">
                    <td colspan="3">Влияют на зону</td>
                </tr>
                ${renderDetailRows(zoneRows)}`);
        }
        if (refusalRows.length) {
            detailGroups.push(`
                <tr class="fines-detail-group fines-detail-group-nonzone">
                    <td colspan="3">Отказ клиенту <span>(не влияет на зону)</span></td>
                </tr>
                ${renderDetailRows(refusalRows)}`);
        }
        if (lateRows.length) {
            detailGroups.push(`
                <tr class="fines-detail-group fines-detail-group-lates">
                    <td colspan="3">Опоздания <span>(не влияют на зону)</span></td>
                </tr>
                ${renderDetailRows(lateRows)}`);
        }
        tbody.innerHTML = detailGroups.join('');

        // Итого
        tbody.innerHTML += `<tr style="border-top:2px solid #444">
            <td colspan="2" style="text-align:right;font-weight:700;color:#fff;padding:10px">ИТОГО:</td>
            <td style="color:#FF3B30;font-weight:800;font-size:16px;text-align:right;padding:10px">${total.toLocaleString()} ₽</td>
        </tr>`;
    }

    block.style.display = 'block';
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

function findFineSourceReportId(masterName, detail) {
    if (!detail || !Array.isArray(_finesAllReports)) return null;
    const targetDate = dayjs(detail.date, 'DD.MM.YYYY');
    const targetDay = targetDate.isValid() ? targetDate.format('YYYY-MM-DD') : '';
    const violation = String(detail.violation || '').toLowerCase().trim();
    const location = String(detail.location || '').toLowerCase().trim();

    const match = _finesAllReports.find(r => {
        const canonical = getAdapterMasterCanonical(r.barber);
        if (canonical !== masterName) return false;
        const rDay = dayjs(r.date || r.createdAt).format('YYYY-MM-DD');
        if (targetDay && rDay !== targetDay) return false;
        if (location && String(r.location || '').toLowerCase().trim() !== location) return false;
        const rViolation = String(r.violation || '').toLowerCase();
        return !violation || rViolation.includes(violation) || violation.includes(rViolation);
    });
    return match ? match.id : null;
}

window.editOvnFromFines = async function(id, event) {
    if (event) event.stopPropagation();
    try {
        if (!window.lastOvnVideoRes || !window.lastOvnVideoRes.some(r => String(r.id) === String(id))) {
            const res = await fetch('/api/ovn?v=' + Date.now());
            const reports = res.ok ? await res.json() : [];
            window.lastOvnVideoRes = reports.filter(r => typeof isOvnLateRecord !== 'function' || !isOvnLateRecord(r));
            const missed = reports.find(r => String(r.id) === String(id));
            if (missed && !window.lastOvnVideoRes.some(r => String(r.id) === String(id))) {
                window.lastOvnVideoRes.push(missed);
            }
        }
        const finesModal = document.getElementById('fines-modal');
        if (finesModal) finesModal.classList.remove('active');
        if (typeof triggerEditOVN === 'function') {
            triggerEditOVN(id);
        } else {
            showToast('Редактор ОВН ещё не загружен', 'error');
        }
    } catch (e) {
        console.error('[Fines] edit OVN', e);
        showToast('Не удалось открыть редактирование ОВН', 'error');
    }
};

window.hideFineDetail = function() {
    const block = document.getElementById('fines-detail-block');
    if (block) block.style.display = 'none';
};

// Remove legacy manual-fine markup so the retired UI cannot be opened.
function removeManualFineUi() {
    document.getElementById('manual-fine-modal')?.remove();
    const table = document.getElementById('manual-fines-table');
    const container = table?.closest('.ovn-matrix-container');
    const title = container?.previousElementSibling;
    if (title && /ручн/i.test(title.textContent || '')) title.remove();
    container?.remove();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeManualFineUi, { once: true });
} else {
    removeManualFineUi();
}

// ==== HANDBOOK SETTINGS MODAL ====
window.openHandbookConfigModal = function() {
    document.getElementById('handbook-config-modal').classList.add('active');
    renderHandbookEditor();
};
window.closeHandbookConfigModal = function() {
    document.getElementById('handbook-config-modal').classList.remove('active');
};

window.renderHandbookEditor = function() {
    const container = document.getElementById('handbook-config-list');
    if (!container) return;
    const hb = window.GLOBAL_HANDBOOK || {};

    // Auto-seed commonly used keys
    ['Опоздание 1-3 мин','Опоздание 4-10 мин','Опоздание 11-20 мин','Опоздание 21-30 мин','Опоздание 31-60 мин','Опоздание 61+ мин (Невыход)',
     'Опоздание второй мастер 1-3 мин','Опоздание второй мастер 4-10 мин',
     'Опоздание второй мастер 11-20 мин','Опоздание второй мастер 21-30 мин',
     'Опоздание второй мастер 31-60 мин','Опоздание второй мастер 61+ мин (Невыход)',
     'Невыход','Услуга не проведена через терминал','Грязное рабочее место','Без формы',
     'Еда / напитки на рабочем месте','Разговор на нац. языке','Отказ клиенту','Поломка',
     'Про акцию не сказал','Телефон при клиенте',
     'Не показал зеркало заднего вида','Не обработал инструмент','Другое'
    ].forEach(k => { if (hb[k] === undefined) hb[k] = 0; });

    let html = Object.entries(hb).map(([key, val]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:10px 15px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);margin-bottom:10px;">
            <span class="handbook-key" style="font-size:15px;font-weight:500;">${key}</span>
            <div style="display:flex;align-items:center;">
                <input type="number" class="handbook-val-input" data-key="${key}" value="${val}"
                    style="width:80px;background:rgba(255,255,255,0.1);border:none;color:white;padding:8px;border-radius:6px;font-weight:bold;outline:none;text-align:right;">
                <span style="color:var(--text-muted);margin-left:8px;margin-right:15px;font-size:14px;">₽</span>
                <button onclick="deleteHandbookItem('${key}')" title="Удалить"
                    style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;">🗑️</button>
            </div>
        </div>
    `).join('');

    html += `
        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:10px 15px;border-radius:10px;border:1px dashed rgba(255,255,255,0.2);margin-top:10px;">
            <input type="text" id="new-handbook-key" placeholder="Новое нарушение"
                style="flex:1;background:transparent;border:none;color:white;outline:none;font-size:14px;">
            <div style="display:flex;align-items:center;margin-left:10px;">
                <input type="number" id="new-handbook-val" placeholder="0"
                    style="width:70px;background:rgba(255,255,255,0.1);border:none;color:white;padding:8px;border-radius:6px;font-weight:bold;outline:none;text-align:right;">
                <span style="color:var(--text-muted);margin-left:8px;font-size:14px;">₽</span>
            </div>
        </div>
    `;
    container.innerHTML = html;
};

window.deleteHandbookItem = async function(key) {
    if (!confirm(`Удалить нарушение '${key}'?`)) return;
    delete window.GLOBAL_HANDBOOK[key];
    await saveHandbookConfig(true);
};

window.saveHandbookConfig = async function(keepOpen = false) {
    const inputs = document.querySelectorAll('.handbook-val-input');
    const newHb  = {};

    inputs.forEach(inp => {
        const key = inp.getAttribute('data-key');
        if (Object.prototype.hasOwnProperty.call(window.GLOBAL_HANDBOOK, key)) {
            newHb[key] = parseInt(inp.value) || 0;
        }
    });

    const newKeyInp = document.getElementById('new-handbook-key');
    const newValInp = document.getElementById('new-handbook-val');
    if (newKeyInp && newKeyInp.value.trim()) {
        const nKey = newKeyInp.value.trim();
        const nVal = parseInt(newValInp.value) || 0;
        newHb[nKey] = nVal;
        window.GLOBAL_HANDBOOK[nKey] = nVal;
    }

    const finalHb = {};
    for (const key of Object.keys(window.GLOBAL_HANDBOOK)) {
        finalHb[key] = newHb[key] !== undefined ? newHb[key] : window.GLOBAL_HANDBOOK[key];
    }

    try {
        const res = await fetch('/api/handbook', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(finalHb)
        });
        if (res.ok) {
            window.GLOBAL_HANDBOOK = finalHb;
            if (!keepOpen) { showToast('Справочник штрафов сохранен!'); closeHandbookConfigModal(); }
            else           { renderHandbookEditor(); }
        } else { throw new Error('Server error'); }
    } catch(e) {
        showToast('Ошибка сохранения: ' + e.message, 'error');
    }
};
