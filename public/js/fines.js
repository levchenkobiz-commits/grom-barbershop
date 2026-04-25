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
 * Вычисляет состояние зоны (Green/Yellow/Red) и штрафы за месяц для каждого мастера.
 */
function calculateFines(reports) {
    const masters = {};
    reports.forEach(r => {
        if (!r.barber) return;
        const name = r.barber.trim();
        if (!masters[name]) masters[name] = { reports: [], loc: r.location };
        masters[name].reports.push(r);
    });

    const results      = {};
    const currentMonth = dayjs().format('YYYY-MM');

    for (const master in masters) {
        const mReports = masters[master].reports.sort((a, b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());
        let state              = 'Green';
        let currentMonthFines  = 0;
        const weeks            = {};

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

        const currentWeekId = dayjs().isoWeek() + '-' + dayjs().year();
        let   currentWeekViolationsCount = 0;

        for (const wId of sortedWeeks) {
            const weekReports   = weeks[wId];
            let violationsCount = 0, lateCount = 0;
            const weekViolationsList = [];
            const isCurrentMonth = weekReports.some(r => dayjs(r.date || r.createdAt).format('YYYY-MM') === currentMonth);

            weekReports.forEach(r => {
                const vList = Array.isArray(r.violation)
                    ? r.violation
                    : (r.violation ? String(r.violation).split(',').map(v => v.trim()) : []);

                vList.forEach(vName => {
                    if (!vName) return;
                    const fine        = getViolationFine(vName, r.notes, r);
                    const isMandatory = isMandatoryFine(vName, r.notes, r);

                    if (!vName.toLowerCase().includes('замечаний нет')) violationsCount++;

                    if (isMandatory) {
                        let finalFine = fine;
                        if (vName.toLowerCase().includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) {
                            lateCount++;
                            if (lateCount >= 2) finalFine *= 2;
                        }
                        if (isCurrentMonth) currentMonthFines += finalFine;
                    } else if (fine > 0) {
                        weekViolationsList.push({ type: vName.toLowerCase(), fine, r });
                    }
                });
            });

            if (wId === currentWeekId) currentWeekViolationsCount = violationsCount;

            let zoneFine = 0;
            if (state === 'Green') {
                if      (violationsCount >= 14) { state = 'Red';    weekViolationsList.forEach(v => { zoneFine += v.fine; }); }
                else if (violationsCount > 9)   { state = 'Yellow'; if (weekViolationsList.length > 0) { const freq = {}; weekViolationsList.forEach(v => { freq[v.type] = (freq[v.type]||0)+1; }); let topType='', maxF=0; for (let t in freq) { if (freq[t] > maxF) { maxF = freq[t]; topType = t; } } const topV = weekViolationsList.find(x => x.type === topType); if (topV) zoneFine += topV.fine; } }
                else                            { state = 'Green'; }
            } else if (state === 'Yellow') {
                if      (violationsCount > 9)  { state = 'Red';    weekViolationsList.forEach(v => { zoneFine += v.fine; }); }
                else if (violationsCount === 0) { state = 'Green'; }
                else                            { state = 'Yellow'; }
            } else if (state === 'Red') {
                if (violationsCount === 0) state = 'Green';
                else { weekViolationsList.forEach(v => { zoneFine += v.fine; }); }
            }

            if (isCurrentMonth) currentMonthFines += zoneFine;
        }

        results[master] = {
            loc:            masters[master].loc,
            state,
            weekViolations: currentWeekViolationsCount,
            monthFines:     currentMonthFines
        };
    }
    return results;
}

// ==== FINES MODAL ====
window.openFinesModal = function() {
    document.getElementById('fines-modal').classList.add('active');
    renderFinesTable();
};

async function renderFinesTable() {
    const tbody = document.getElementById('fines-table-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Загрузка...</td></tr>';
    try {
        const res     = await fetch('/api/ovn');
        const reports = await res.json();
        const results = calculateFines(reports);

        const manualTbody = document.getElementById('manual-fines-table-body');
        if (manualTbody) {
            let mHtml = '';
            reports.forEach(r => {
                if (!r.isManualFine) return;
                let d = r.date || r.createdAt || '';
                if (d.includes('T')) d = d.split('T')[0];
                mHtml += `<tr>
                    <td>${d}</td><td>${r.location||'-'}</td>
                    <td style="font-weight:700">${r.barber}</td>
                    <td>${r.violation||r.notes}</td>
                    <td style="color:#FF3B30;font-weight:bold;">${r.cost} ₽</td>
                </tr>`;
            });
            manualTbody.innerHTML = mHtml || '<tr><td colspan="5" style="text-align:center;color:#888;">Ручных штрафов нет</td></tr>';
        }

        if (Object.keys(results).length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Нет данных</td></tr>'; return;
        }

        const currentMonth = dayjs().format('MM / YYYY');
        const zoneBadge    = {
            'Green':  `<span style="color:#34C759;background:rgba(52,199,89,0.15);padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;">🟢 ЗЕЛЕНАЯ</span>`,
            'Yellow': `<span style="color:#FF9F0A;background:rgba(255,159,10,0.15);padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;">🟡 ЖЕЛТАЯ</span>`,
            'Red':    `<span style="color:#FF3B30;background:rgba(255,59,48,0.15);padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;">🔴 КРАСНАЯ</span>`
        };

        tbody.innerHTML = Object.entries(results).map(([m, data]) => `
            <tr>
                <td>${currentMonth}</td>
                <td style="font-weight:700">${m}</td>
                <td>${zoneBadge[data.state]}</td>
                <td><strong style="color:white;font-size:15px;">${data.weekViolations}</strong></td>
                <td style="color:#FF3B30;font-weight:700;font-size:15px;">${data.monthFines} ₽</td>
            </tr>`).join('');

    } catch(e) {
        console.error('[Fines]', e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#FF3B30">Ошибка загрузки данных.</td></tr>';
    }
}

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
