/**
 * public/js/fines.js
 * =====================================================
 * Модуль штрафов: расчёт, таблица, ручное начисление, справочник.
 *
 * Экспортирует глобально:
 *   calculateFines, getViolationFine, isMandatoryFine
 *   openFinesModal, renderFinesTable
 *   openManualFineModal, closeManualFineModal, submitManualFine
 *   openHandbookConfigModal, closeHandbookConfigModal,
 *   renderHandbookEditor, saveHandbookConfig, deleteHandbookItem
 *
 * Зависимости: config.js (window.GLOBAL_HANDBOOK, window.ADAPTER)
 */

// ==== FINE CALCULATION HELPERS ====

/**
 * Возвращает сумму штрафа для одного нарушения.
 */
function getViolationFine(violationRaw, notesRaw, r) {
    if (r && r.isManualFine) return Number(r.cost) || 0;

    let violations = [];
    if      (Array.isArray(violationRaw)) violations = violationRaw;
    else if (typeof violationRaw === 'string' && violationRaw.includes(','))
        violations = violationRaw.split(',').map(v => v.trim());
    else
        violations = [violationRaw];

    let maxFine = 0;

    for (const raw of violations) {
        const v = (raw || '').toLowerCase();
        const n = (notesRaw || '').toLowerCase();
        let currentFine = 0;

        for (const [key, value] of Object.entries(window.GLOBAL_HANDBOOK || {})) {
            if (v.includes(key.toLowerCase()) || n.includes(key.toLowerCase())) {
                currentFine = value; break;
            }
        }

        // Unpaid services — extract exact amount
        if (v.includes('пробиты не все услуги')) {
            const m = (n + ' ' + v).match(/Сумма непробитых услуг: (\d+)/);
            if (m) currentFine = parseInt(m[1], 10);
        }

        // Fallbacks
        if (currentFine === 0) {
            if (v.includes('опоздал') || n.includes('опоздани')) currentFine = (window.GLOBAL_HANDBOOK || {})['Опоздание'] || 300;
            else if (v.includes('не выход') || v.includes('невыход')) currentFine = (window.GLOBAL_HANDBOOK || {})['Невыход'] || 5000;
            else if (v.includes('воровство') || v.includes('неоплаченная') || v.includes('терминал')) currentFine = (window.GLOBAL_HANDBOOK || {})['Услуга не проведена через терминал'] || 5000;
        }

        // Lateness duration escalation
        if (v.includes('опоздал') || n.includes('опоздани')) {
            const match = n.match(/на\s+(\d+)\s+мин/);
            const minutes = match ? parseInt(match[1]) : 0;
            if      (minutes >= 30) currentFine = Math.max(currentFine, 1000);
            else if (minutes >= 20) currentFine = Math.max(currentFine, 500);
        }

        if (currentFine > maxFine) maxFine = currentFine;
    }
    return maxFine;
}

function isMandatoryFine(vRaw, nRaw, r) {
    if (r && r.isManualFine) return true;
    let violations = [];
    if      (Array.isArray(vRaw)) violations = vRaw;
    else if (typeof vRaw === 'string' && vRaw.includes(',')) violations = vRaw.split(',').map(v => v.trim());
    else violations = [vRaw];

    for (const raw of violations) {
        const v = (raw || '').toLowerCase();
        const n = (nRaw || '').toLowerCase();
        if (v.includes('пробит'))    return true;
        if (v.includes('опоздал') || n.includes('опоздани')) return true;
        if (v.includes('воровство') || v.includes('неоплаченная') || v.includes('терминал')) return true;
        if (v.includes('не выход') || v.includes('невыход')) return true;
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
    if (!name || typeof ADAPTER === 'undefined') return null;
    const n = String(name).toLowerCase().trim();
    for (const loc in ADAPTER) {
        if (!ADAPTER[loc] || !Array.isArray(ADAPTER[loc].masters)) continue;
        for (const m of ADAPTER[loc].masters) {
            const dash = (m.dash || '').toLowerCase().trim();
            const aliases = (m.el_kassa || []).map(x => String(x).toLowerCase().trim());
            if (dash === n || aliases.some(a => n.includes(a) || a.includes(n))) return m.dash;
        }
    }
    return null;
}

function getAdapterMasterLocation(name) {
    if (!name || typeof ADAPTER === 'undefined') return '';
    for (const loc in ADAPTER) {
        if (!ADAPTER[loc] || !Array.isArray(ADAPTER[loc].masters)) continue;
        if (ADAPTER[loc].masters.some(m => m.dash === name)) return loc;
    }
    return '';
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
    if (typeof getAdapterMasterNames === 'function') {
        getAdapterMasterNames().forEach(name => {
            masters[name] = { reports: [], loc: getAdapterMasterLocation(name) };
        });
    }

    reports.forEach(r => {
        if (!r.barber) return;
        const name = getAdapterMasterCanonical(r.barber);
        if (!name) return;
        if (!masters[name]) masters[name] = { reports: [], loc: r.location };
        masters[name].reports.push(r);
    });

    const results = {};

    for (const master in masters) {
        const mReports = masters[master].reports.sort((a, b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());
        let state              = 'Green';
        let currentMonthFines  = 0;
        const weeks            = {};
        const details          = []; // детализация штрафов

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

        let periodViolationsCount = 0;

        for (const wId of sortedWeeks) {
            const weekReports   = weeks[wId];
            let violationsCount = 0, lateCount = 0;
            const weekViolationsList = [];

            weekReports.forEach(r => {
                const inPeriod = isFineReportInPeriod(r, period);
                const vList = Array.isArray(r.violation)
                    ? r.violation
                    : (r.violation ? String(r.violation).split(',').map(v => v.trim()) : []);

                vList.forEach(vName => {
                    if (!vName) return;
                    const fine        = getViolationFine(vName, r.notes, r);
                    const isMandatory = isMandatoryFine(vName, r.notes, r);

                    if (!vName.toLowerCase().includes('замечаний нет')) {
                        violationsCount++;
                        if (inPeriod) periodViolationsCount++;
                    }

                    if (isMandatory) {
                        let finalFine = fine;
                        if (vName.toLowerCase().includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) {
                            lateCount++;
                            if (lateCount >= 2) finalFine *= 2;
                        }
                        if (inPeriod && finalFine > 0) {
                            currentMonthFines += finalFine;
                            details.push({
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

            let zoneFine = 0;
            const finesApplied = [];
            if (state === 'Green') {
                if (violationsCount >= 14) {
                    state = 'Red';
                    weekViolationsList.forEach(v => { zoneFine += v.fine; finesApplied.push(v); });
                } else if (violationsCount > 9) {
                    state = 'Yellow';
                    if (weekViolationsList.length > 0) {
                        const freq = {};
                        weekViolationsList.forEach(v => { freq[v.type] = (freq[v.type]||0)+1; });
                        let topType='', maxF=0;
                        for (let t in freq) { if (freq[t] > maxF) { maxF = freq[t]; topType = t; } }
                        const topV = weekViolationsList.find(x => x.type === topType);
                        if (topV) { zoneFine += topV.fine; finesApplied.push(topV); }
                    }
                }
            } else if (state === 'Yellow') {
                if (violationsCount > 9) {
                    state = 'Red';
                    weekViolationsList.forEach(v => { zoneFine += v.fine; finesApplied.push(v); });
                } else if (violationsCount === 0) { state = 'Green'; }
            } else if (state === 'Red') {
                if (violationsCount === 0) state = 'Green';
                else weekViolationsList.forEach(v => { zoneFine += v.fine; finesApplied.push(v); });
            }

            if (zoneFine > 0) {
                finesApplied.forEach(v => {
                    if (!isFineReportInPeriod(v.r || { date: v.date }, period)) return;
                    currentMonthFines += v.fine;
                    details.push({
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
            state,
            weekViolations: periodViolationsCount,
            monthFines:     currentMonthFines,
            details:        details.sort((a, b) => {
                const da = a.date.split('.').reverse().join('');
                const db = b.date.split('.').reverse().join('');
                return da.localeCompare(db);
            })
        };
    }
    return results;
}

// ==== FINES MODAL ====
// Хранение отчётов для детализации
let _finesAllReports = [];
let _finesResults    = {};

window.openFinesModal = function() {
    document.getElementById('fines-modal').classList.add('active');
    // Устанавливаем текущий месяц по умолчанию
    const sel = document.getElementById('fines-month-select');
    if (sel) sel.value = dayjs().format('YYYY-MM');
    const startEl = document.getElementById('fines-date-start');
    const endEl   = document.getElementById('fines-date-end');
    if (startEl && !startEl.value) startEl.value = dayjs().startOf('month').format('YYYY-MM-DD');
    if (endEl && !endEl.value) endEl.value = dayjs().endOf('month').format('YYYY-MM-DD');
    renderFinesTable();
};

window.applyFinesMonthPreset = function() {
    const sel = document.getElementById('fines-month-select');
    if (!sel || !sel.value) return renderFinesTable();
    const startEl = document.getElementById('fines-date-start');
    const endEl   = document.getElementById('fines-date-end');
    const base = dayjs(sel.value + '-01');
    if (startEl) startEl.value = base.startOf('month').format('YYYY-MM-DD');
    if (endEl) endEl.value = base.endOf('month').format('YYYY-MM-DD');
    renderFinesTable();
};

function getSelectedFinesPeriod() {
    const startEl = document.getElementById('fines-date-start');
    const endEl   = document.getElementById('fines-date-end');
    return normalizeFinesPeriod({
        start: startEl ? startEl.value : '',
        end: endEl ? endEl.value : ''
    });
}

async function renderFinesTable() {
    const tbody = document.getElementById('fines-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Загрузка...</td></tr>';

    // Скрываем детализацию при обновлении
    const detailBlock = document.getElementById('fines-detail-block');
    if (detailBlock) detailBlock.style.display = 'none';

    try {
        const res     = await fetch('/api/ovn');
        const reports = await res.json();
        _finesAllReports = reports;

        // Заполняем доступные месяцы
        populateMonthSelect(reports);

        const targetPeriod = getSelectedFinesPeriod();
        const results = calculateFines(reports, targetPeriod);
        _finesResults = results;

        // Ручные штрафы за выбранный период
        const manualTbody = document.getElementById('manual-fines-table-body');
        if (manualTbody) {
            let mHtml = '';
            reports.forEach(r => {
                if (!r.isManualFine) return;
                const canonicalMaster = getAdapterMasterCanonical(r.barber);
                if (!canonicalMaster) return;
                const d = dayjs(r.date || r.createdAt);
                if (!isFineReportInPeriod(r, targetPeriod)) return;
                let dateStr = d.format('DD.MM.YYYY');
                mHtml += `<tr>
                    <td>${dateStr}</td><td>${r.location||'-'}</td>
                    <td style="font-weight:700">${canonicalMaster}</td>
                    <td>${r.violation||r.notes}</td>
                    <td style="color:#FF3B30;font-weight:bold;">${r.cost} ₽</td>
                </tr>`;
            });
            manualTbody.innerHTML = mHtml || '<tr><td colspan="5" style="text-align:center;color:#888;">Ручных штрафов нет</td></tr>';
        }

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

        // Сортируем по сумме штрафа (от большего)
        const sorted = Object.entries(results).sort((a, b) => b[1].monthFines - a[1].monthFines);

        tbody.innerHTML = sorted.map(([m, data]) => `
            <tr onclick="showFineDetail('${m.replace(/'/g, "\\'")}')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background=''">
                <td>${displayPeriod}</td>
                <td style="font-weight:700;color:#E8FF38;text-decoration:underline;text-underline-offset:3px">${m}</td>
                <td>${zoneBadge[data.state]}</td>
                <td><strong style="color:white;font-size:15px;">${data.weekViolations}</strong></td>
                <td style="color:#FF3B30;font-weight:700;font-size:15px;">${data.monthFines.toLocaleString()} ₽</td>
            </tr>`).join('');

    } catch(e) {
        console.error('[Fines]', e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#FF3B30">Ошибка загрузки данных.</td></tr>';
    }
}

/**
 * Заполняет select доступными месяцами из данных OVN
 */
function populateMonthSelect(reports) {
    const sel = document.getElementById('fines-month-select');
    if (!sel) return;

    const months = new Set();
    reports.forEach(r => {
        const d = dayjs(r.date || r.createdAt);
        if (d.isValid()) months.add(d.format('YYYY-MM'));
    });

    const currentVal = sel.value;
    const sortedMonths = Array.from(months).sort().reverse();

    // Добавим текущий месяц если нет
    const curMonth = dayjs().format('YYYY-MM');
    if (!sortedMonths.includes(curMonth)) sortedMonths.unshift(curMonth);

    sel.innerHTML = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        const label = dayjs(m + '-01').format('MMMM YYYY');
        const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
        return `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${capLabel}</option>`;
    }).join('');
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

    title.textContent = `Штрафы: ${masterName}`;

    if (data.details.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px;">Штрафов за этот период нет</td></tr>';
    } else {
        let total = 0;
        tbody.innerHTML = data.details.map(d => {
            total += d.fine;
            const typeIcon = d.type === 'mandatory' ? '⚠️' : '🔶';
            const typeLabel = d.type === 'mandatory' ? 'Авто' : 'Зона';
            return `<tr>
                <td style="white-space:nowrap">${d.date}</td>
                <td>${d.location}</td>
                <td style="max-width:250px">${d.violation}</td>
                <td><span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${d.type === 'mandatory' ? 'rgba(255,59,48,0.15);color:#FF3B30' : 'rgba(255,159,10,0.15);color:#FF9F0A'}">${typeIcon} ${typeLabel}</span></td>
                <td style="color:#FF3B30;font-weight:700;text-align:right;white-space:nowrap">${d.fine.toLocaleString()} ₽</td>
            </tr>`;
        }).join('');

        // Итого
        tbody.innerHTML += `<tr style="border-top:2px solid #444">
            <td colspan="4" style="text-align:right;font-weight:700;color:#fff;padding:10px">ИТОГО:</td>
            <td style="color:#FF3B30;font-weight:800;font-size:16px;text-align:right;padding:10px">${total.toLocaleString()} ₽</td>
        </tr>`;
    }

    block.style.display = 'block';
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.hideFineDetail = function() {
    const block = document.getElementById('fines-detail-block');
    if (block) block.style.display = 'none';
};

// ==== MANUAL FINE MODAL ====
window.openManualFineModal = function() {
    document.getElementById('manual-fine-modal').classList.add('active');
    document.getElementById('mf-date').value = dayjs().format('YYYY-MM-DD');
};
window.closeManualFineModal = function() {
    document.getElementById('manual-fine-modal').classList.remove('active');
};

window.updateManualFineAmount = function() {
    const v        = document.getElementById('mf-violation').value;
    const costInput = document.getElementById('mf-cost');
    if ((window.GLOBAL_HANDBOOK || {})[v] !== undefined) costInput.value = window.GLOBAL_HANDBOOK[v];
    else costInput.value = '';
};

window.updateMFMastersDropdown = function() {
    const loc = document.getElementById('mf-location').value;
    const sel = document.getElementById('mf-barber');
    sel.innerHTML = '<option value="">Выберите мастера</option>';
    if (loc && typeof ADAPTER !== 'undefined' && ADAPTER[loc]) {
        ADAPTER[loc].masters.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.dash; opt.textContent = m.dash;
            sel.appendChild(opt);
        });
    }
};

window.submitManualFine = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Сохранение...';
    const payload = {
        location:     document.getElementById('mf-location').value,
        barber:       document.getElementById('mf-barber').value,
        date:         document.getElementById('mf-date').value,
        violation:    document.getElementById('mf-violation').value,
        cost:         document.getElementById('mf-cost').value,
        notes:        document.getElementById('mf-notes').value,
        isManualFine: true
    };
    try {
        const res = await fetch('/api/ovn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            showToast('Ручной штраф успешно добавлен!', 'success');
            document.getElementById('manual-fine-form').reset();
            closeManualFineModal();
            if (document.getElementById('fines-modal').classList.contains('active')) renderFinesTable();
            if (window.SALARY_MODE_MANAGER || (document.getElementById('salary-modal') && document.getElementById('salary-modal').classList.contains('active'))) {
                if (typeof window.renderSalaryTable === 'function') window.renderSalaryTable();
            }
        } else { showToast('Ошибка при сохранении ручного штрафа', 'error'); }
    } catch (err) { console.error(err); showToast('Ошибка сети', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Начислить штраф'; }
};

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
    ['Опоздание 11-20 мин','Опоздание 21-30 мин','Опоздание 31-60 мин','Опоздание 61+ мин (Невыход)',
     'Невыход','Услуга не проведена через терминал','Грязное рабочее место','Без формы',
     'Еда / напитки на рабочем месте','Разговор на нац. языке','Отказ клиенту','Поломка',
     'Про акцию не сказал','Телефон при клиенте',
     'Не показал зеркало заднего вида','Не обработан инструмент','Другое'
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
