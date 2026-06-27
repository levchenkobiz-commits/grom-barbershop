/**
 * public/js/lates.js
 * =====================================================
 * Модуль Опоздания (Lates).
 */

function isLatesModuleRecord(r) {
    if (!r) return false;
    const text = [
        r.violation,
        r.notes,
        r.forceMajeureType
    ].map(v => String(v || '').toLowerCase()).join(' ');

    return !!(
        r.schedTime ||
        r.isForceMajeure ||
        r.fineWaived ||
        r.forceMajeureType ||
        text.includes('\u043c\u0430\u0441\u0442\u0435\u0440 \u043e\u043f\u043e\u0437\u0434\u0430\u043b') ||
        text.includes('\u043e\u043f\u043e\u0437\u0434\u0430\u043d') ||
        text.includes('\u043d\u0435 \u0432\u044b\u0448\u0435\u043b') ||
        text.includes('\u043d\u0435\u0432\u044b\u0445\u043e\u0434') ||
        text.includes('\u0444\u043e\u0440\u0441')
    );
}

async function loadLatesHistory() {
    try {
        console.log('[Lates] Loading...');
        const [ovnRes, schedRes] = await Promise.all([
            fetch('/api/ovn').then(r => r.json()).catch(() => []),
            fetch('/api/schedule').then(r => r.json()).catch(() => [])
        ]);

        const date = dayjs().format('YYYY-MM-DD');
        const loc  = (document.getElementById('lates-audit-loc') || {}).value || 'Алексеевская';
        window.lastOvnRes = ovnRes;

        // 1. WORKFORCE AUDIT GRID (из расписания — включая замены)
        const sched      = schedRes.find(s => s.date === date && s.location === loc) || { masters: [] };
        const mastersList = (sched.masters || []).filter(m => {
            const t = (m.text || m.startTime || '').toLowerCase();
            return t !== 'выходной' && t !== 'вых' && t !== 'ыходной';
        });
        const checksForSelectedDay = ovnRes.filter(r =>
            isLatesModuleRecord(r) &&
            dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date && r.location === loc
        );

        const auditEl = document.getElementById('lates-workforce-audit');
        if (auditEl) {
            if (!mastersList.length) {
                auditEl.innerHTML = `<div style="grid-column:span 3;color:var(--text-muted);text-align:center;padding:40px">
                    График на сегодня не составлен для этой локации
                </div>`;
            } else {
                auditEl.innerHTML = mastersList.map(m => {
                    const check       = checksForSelectedDay.find(r => r.barber === m.name);
                    const isChecked   = !!check;
                    const statusColor = isChecked
                        ? ((check.violation || '').toLowerCase().includes('опоздал') ? '#FF3B30' : '#34C759')
                        : 'rgba(255,255,255,0.1)';
                    const latenessMsg = isChecked
                        ? ((check.violation || '').toLowerCase().includes('опоздал') ? '⚠️ Опоздание' : '✅ Вовремя')
                        : 'Ожидание...';
                    const safeId = 'm' + Array.from(m.name || 'x').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36).replace('-','n');
                    const replaceBadge = m.isReplacement
                        ? `<span style="font-size:10px;padding:2px 7px;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);border-radius:6px;color:var(--accent)">ЗАМЕНА</span>`
                        : `<span style="font-size:10px;padding:2px 7px;background:rgba(255,255,255,0.05);border-radius:6px;color:var(--text-muted)">Основной</span>`;

                    return `
                    <div class="card" style="padding:20px;border-top:4px solid ${statusColor};transition:border-color 0.3s">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
                            <span style="font-weight:700;font-size:16px">${m.name || 'Мастер'}</span>
                            ${replaceBadge}
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">
                            <div class="form-field">
                                <label style="font-size:9px;opacity:0.5;margin-bottom:4px">План</label>
                                <input type="text" class="sched-plan" value="${m.startTime || '--:--'}" readonly disabled
                                    style="width:100%;padding:6px;background:rgba(255,255,255,0.08);color:var(--text-muted);border:1px solid transparent;text-align:center;border-radius:10px;font-size:14px;">
                            </div>
                            <div class="form-field">
                                <label style="font-size:9px;opacity:0.5;margin-bottom:4px">Факт</label>
                                <input type="time" class="sched-fact" value="${check ? check.time : ''}"
                                    style="width:100%;padding:6px;background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.1);text-align:center;border-radius:10px;font-size:14px;outline:none;"
                                    onchange="updateLateness(this, '${safeId}')">
                            </div>
                        </div>
                        <div style="margin-top:15px;display:flex;justify-content:space-between;align-items:center">
                            <div id="late-calc-${safeId}" style="font-size:13px;font-weight:700">${latenessMsg}</div>
                            <button class="btn-refresh" style="padding:6px 16px;font-size:12px;border:1px solid ${isChecked ? '#555' : 'var(--accent)'};"
                                    onclick="quickSaveLate('${m.name || ''}', this)">
                                ${isChecked ? 'Обновить' : 'Сохранить'}
                            </button>
                        </div>
                        ${!isChecked ? `
                        <div style="margin-top:8px;text-align:right">
                            <button onclick="quickNoShow('${m.name || ''}', '${m.startTime || ''}', this)"
                                style="padding:3px 10px;font-size:10px;background:rgba(255,59,48,0.12);color:#FF3B30;border:1px solid rgba(255,59,48,0.35);border-radius:8px;cursor:pointer;transition:all 0.2s;"
                                onmouseenter="this.style.background='rgba(255,59,48,0.25)'"
                                onmouseleave="this.style.background='rgba(255,59,48,0.12)'">
                                ✕ Не вышел (прошло более 2 часов)
                            </button>
                        </div>` : ''}
                    </div>`;
                }).join('');
            }
        }

        // 2. GLOBAL COUNTER
        let totalMastersGlobal = 0, checkedMastersGlobal = 0;
        const todayChecks = ovnRes.filter(r => isLatesModuleRecord(r) && dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date);

        schedRes.filter(s => s.date === date).forEach(s => {
            const branchMasters = (s.masters || []).filter(m => {
                const t = (m.text || m.startTime || '').toLowerCase();
                return t !== 'выходной' && t !== 'вых' && t !== 'ыходной';
            });
            const sLoc = (s.location || '').trim().toLowerCase();
            totalMastersGlobal += branchMasters.length;
            branchMasters.forEach(m => {
                const found = todayChecks.some(r =>
                    r.barber === m.name &&
                    (r.location || '').trim().toLowerCase() === sLoc
                );
                if (found) checkedMastersGlobal++;
            });
        });

        const remaining = totalMastersGlobal - checkedMastersGlobal;
        const counterEl = document.getElementById('lates-remaining-count');
        if (counterEl) {
            if (remaining > 0)               { counterEl.innerText = `Осталось проверить: ${remaining}`; counterEl.style.color = '#FF9F0A'; }
            else if (totalMastersGlobal > 0) { counterEl.innerText = 'Все точки проверены ✅'; counterEl.style.color = '#34C759'; }
            else                             { counterEl.innerText = 'График не составлен'; counterEl.style.color = 'var(--text-muted)'; }
            counterEl.title = '';
            counterEl.style.cursor = 'default';
        }

        // 3. MASTER DROPDOWN
        const masterSelect = document.getElementById('lates-history-master-filter');
        if (masterSelect && masterSelect.options.length <= 1) {
            let allMasters = [];
            if (window.BARBER_ROSTER) Object.values(window.BARBER_ROSTER).forEach(l => { allMasters = allMasters.concat(l); });
            Array.from(new Set(allMasters)).sort((a, b) => a.localeCompare(b)).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                masterSelect.appendChild(opt);
            });
        }

        if (typeof renderLatesJournal === 'function') renderLatesJournal();

    } catch (e) {
        console.error('[Lates] Critical error:', e);
    }
}

// ==== NO-SHOW ====
function focusLatesJournalDate(date) {
    const startEl  = document.getElementById('lates-history-start');
    const endEl    = document.getElementById('lates-history-end');
    const presetEl = document.getElementById('lates-history-preset');
    if (!startEl || !endEl || !date) return;

    startEl.value = date;
    endEl.value   = date;
    if (presetEl) presetEl.value = 'custom';
}

window.quickNoShow = async function(barber, planTime, btn) {
    if (!confirm(`Зафиксировать невыход на смену для ${barber}?\nШтраф: 2000 ₽`)) return;

    const report = {
        location:  (document.getElementById('lates-audit-loc') || {}).value,
        barber,
        date:      dayjs().format('YYYY-MM-DD'),
        time:      '',
        schedTime: planTime,
        fine:      2000,
        slot:      '1',
        match:     'нет',
        violation: 'Не вышел на смену',
        notes:     'Не вышел на смену (прошло более 2 часов)'
    };

    try {
        btn.disabled = true;
        btn.textContent = '⌛...';
        const res = await fetch('/api/ovn', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(report)
        });
        if (!res.ok) throw new Error('Server error');
        focusLatesJournalDate(report.date);
        showToast('Невыход зафиксирован, штраф 2000 ₽', 'error');
        setTimeout(() => loadLatesHistory(), 500);
    } catch (e) {
        showToast('Ошибка: ' + e.message, 'error');
        btn.disabled = false;
        btn.textContent = '✕ Не вышел (прошло более 2 часов)';
    }
};

// ==== LATENESS CALC (live) ====
window.updateLateness = function(el, barberId) {
    const card  = el.closest('.card');
    const plan  = card.querySelector('.sched-plan').value;
    const fact  = card.querySelector('.sched-fact').value;
    const resEl = document.getElementById(`late-calc-${barberId}`);
    if (plan && fact && resEl) {
        const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
        resEl.innerHTML = diff > 0
            ? `<span style="color:#FF3B30">⚠️ Опоздание: ${diff} мин</span>`
            : `<span style="color:#34C759">✅ Вовремя</span>`;
    }
};

// ==== QUICK SAVE ====
window.quickSaveLate = async function(barber, btn) {
    const card = btn.closest('.card');
    const plan = card.querySelector('.sched-plan').value;
    const fact = card.querySelector('.sched-fact').value;
    if (!fact) { showToast('Укажите фактическое время прихода', 'success'); return; }

    const diff      = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
    const violation = diff > 0 ? 'Мастер опоздал' : 'Замечаний нет';
    const fine      = diff > 0 ? 500 : 0;

    const report = {
        location:  (document.getElementById('lates-audit-loc') || {}).value,
        barber,
        date:      dayjs().format('YYYY-MM-DD'),
        time:      fact,
        schedTime: plan,
        fine,
        slot:      '1',
        match:     'да',
        violation,
        notes: diff > 0 ? `Опоздание на ${diff} мин` : 'Открытие вовремя'
    };

    try {
        btn.innerText = '⌛...';
        const res = await fetch('/api/ovn', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(report)
        });
        if (!res.ok) throw new Error('Server error');
        focusLatesJournalDate(report.date);
        btn.innerText = '✅ Готово';
        setTimeout(() => loadLatesHistory(), 500);
    } catch (e) {
        showToast('Ошибка сохранения: ' + e.message, 'error');
        btn.innerText = 'Ошибка';
    }
};

// ==== JOURNAL PRESETS / DATES ====
window.applyLatesPreset = function() {
    const preset  = document.getElementById('lates-history-preset').value;
    const startEl = document.getElementById('lates-history-start');
    const endEl   = document.getElementById('lates-history-end');

    if (preset === 'all')           { startEl.value = ''; endEl.value = ''; }
    else if (preset === 'today')    { startEl.value = endEl.value = dayjs().format('YYYY-MM-DD'); }
    else if (preset === 'yesterday'){ startEl.value = endEl.value = dayjs().subtract(1,'day').format('YYYY-MM-DD'); }
    else if (preset === 'week')     { startEl.value = dayjs().startOf('week').add(1,'day').format('YYYY-MM-DD'); endEl.value = dayjs().format('YYYY-MM-DD'); }
    else if (preset === 'month')    { startEl.value = dayjs().startOf('month').format('YYYY-MM-DD'); endEl.value = dayjs().format('YYYY-MM-DD'); }
    renderLatesJournal();
};

window.shiftLatesDate = function(days) {
    const startEl  = document.getElementById('lates-history-start');
    const endEl    = document.getElementById('lates-history-end');
    const presetEl = document.getElementById('lates-history-preset');
    const baseDate = startEl.value ? dayjs(startEl.value) : dayjs();
    const newDate  = baseDate.add(days, 'day').format('YYYY-MM-DD');
    startEl.value  = endEl.value = newDate;
    presetEl.value = 'custom';
    renderLatesJournal();
};

// ==== ACCORDION TOGGLE ====
window.toggleLocAccordion = function(locIdx) {
    const rows  = document.querySelectorAll(`.lates-mrow-${locIdx}`);
    const arrow = document.getElementById(`lates-arrow-${locIdx}`);
    const open  = rows.length && rows[0].style.display !== 'none';
    rows.forEach(r => { r.style.display = open ? 'none' : ''; });
    if (arrow) arrow.textContent = open ? '▶' : '▼';
};

// ==== JOURNAL (Hybrid A+B: KPI cards + accordion table) ====
window.renderLatesJournal = function() {
    if (!window.lastOvnRes) return;
    const res = window.lastOvnRes;

    const presetEl = document.getElementById('lates-history-preset');
    if (presetEl && presetEl.value === 'today' && !document.getElementById('lates-history-start').value) {
        applyLatesPreset(); return;
    }

    const startD       = document.getElementById('lates-history-start').value;
    const endD         = document.getElementById('lates-history-end').value;
    const locFilter    = document.getElementById('lates-history-loc-filter').value;
    const masterFilter = document.getElementById('lates-history-master-filter').value;

    // Filter: only lates-module records (have schedTime OR violation = опоздал/замечаний нет)
    const list = res.filter(r => {
        if (!isLatesModuleRecord(r)) return false;
        const rDateStr = r.date || r.createdAt;
        if (!rDateStr) return false;
        const recDay = dayjs(rDateStr);
        if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
        if (endD   && recDay.isAfter(dayjs(endD), 'day'))   return false;
        if (locFilter    && r.location && r.location !== locFilter) return false;
        if (masterFilter && masterFilter !== '' && r.barber !== masterFilter) return false;
        if (r.schedTime) return true;
        const v = (r.violation || '').toLowerCase();
        return v.includes('опоздал') || v === 'замечаний нет';
    }).sort((a, b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());

    function isLate(r) {
        if (r.schedTime && r.time) return r.time > r.schedTime;
        return (r.violation || '').toLowerCase().includes('опоздал');
    }

    // ── KPI CARDS ──
    const total  = list.length;
    const late   = list.filter(isLate).length;
    const onTime = total - late;
    const pct    = total > 0 ? Math.round((onTime / total) * 100) : 0;
    const pctColor = pct >= 95 ? '#34C759' : pct >= 80 ? '#FF9F0A' : '#FF3B30';

    const kpiEl = document.getElementById('lates-kpi-row');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="card" style="padding:20px 24px;display:flex;align-items:center;gap:16px">
                <div style="font-size:28px">📋</div>
                <div>
                    <div style="font-size:28px;font-weight:800;line-height:1">${total}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Всего проверок</div>
                </div>
            </div>
            <div class="card" style="padding:20px 24px;display:flex;align-items:center;gap:16px">
                <div style="font-size:28px">✅</div>
                <div>
                    <div style="font-size:28px;font-weight:800;line-height:1;color:#34C759">${onTime}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Вовремя</div>
                </div>
            </div>
            <div class="card" style="padding:20px 24px;display:flex;align-items:center;gap:16px">
                <div style="font-size:28px">${late > 0 ? '⚠️' : '🎯'}</div>
                <div>
                    <div style="font-size:28px;font-weight:800;line-height:1;color:${late > 0 ? '#FF3B30' : '#34C759'}">${late}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Опозданий</div>
                </div>
            </div>
            <div class="card" style="padding:20px 24px;display:flex;align-items:center;gap:16px">
                <div style="font-size:28px">${pct >= 95 ? '🏆' : pct >= 80 ? '📈' : '📉'}</div>
                <div>
                    <div style="font-size:28px;font-weight:800;line-height:1;color:${pctColor}">${pct}%</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Без опозданий</div>
                </div>
            </div>`;
    }

    // ── ACCORDION TABLE ──
    const accEl = document.getElementById('lates-journal-accordion');
    if (!accEl) return;

    if (total === 0) {
        accEl.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);font-size:14px;background:var(--card-bg);border-radius:20px;border:1px solid var(--card-border)">Нет данных за выбранный период</div>`;
        return;
    }

    // Group by location → master
    const byLoc = {};
    list.forEach(r => {
        const loc  = r.location || 'Неизвестно';
        const barb = r.barber   || 'Мастер';
        if (!byLoc[loc]) byLoc[loc] = {};
        if (!byLoc[loc][barb]) byLoc[loc][barb] = [];
        byLoc[loc][barb].push(r);
    });

    function pctBar(p) {
        const color = p >= 95 ? '#34C759' : p >= 80 ? '#FF9F0A' : '#FF3B30';
        return `<div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:6px;overflow:hidden;min-width:60px">
                <div style="width:${p}%;height:100%;background:${color};border-radius:4px"></div>
            </div>
            <span style="font-size:12px;color:${color};font-weight:700;min-width:36px;text-align:right">${p}%</span>
        </div>`;
    }

    const LOC_ORDER = ['Алексеевская','Партизанская','Варшавская','Рязанка','Сокол','Текстильщики'];
    const sortedLocs = Object.keys(byLoc).sort((a, b) => {
        const ai = LOC_ORDER.indexOf(a), bi = LOC_ORDER.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

    let rows = `<table style="width:100%;border-collapse:collapse">
        <thead>
            <tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.07)">
                <th style="text-align:left;padding:13px 20px;font-size:11px;font-weight:600;opacity:0.45;text-transform:uppercase;letter-spacing:0.06em">Локация / Мастер</th>
                <th style="text-align:center;padding:13px 10px;font-size:11px;font-weight:600;opacity:0.45;text-transform:uppercase;letter-spacing:0.06em">Проверок</th>
                <th style="text-align:center;padding:13px 10px;font-size:11px;font-weight:600;opacity:0.45;text-transform:uppercase;letter-spacing:0.06em">Вовремя</th>
                <th style="text-align:center;padding:13px 10px;font-size:11px;font-weight:600;opacity:0.45;text-transform:uppercase;letter-spacing:0.06em">Опозд.</th>
                <th style="text-align:left;padding:13px 20px;font-size:11px;font-weight:600;opacity:0.45;text-transform:uppercase;letter-spacing:0.06em;min-width:160px">% Вовремя</th>
            </tr>
        </thead>
        <tbody>`;

    sortedLocs.forEach((loc, li) => {
        const masters = byLoc[loc];
        const allRecs = Object.values(masters).flat();
        const lT = allRecs.length;
        const lL = allRecs.filter(isLate).length;
        const lO = lT - lL;
        const lP = lT > 0 ? Math.round((lO / lT) * 100) : 0;
        const lC = lP >= 95 ? '#34C759' : lP >= 80 ? '#FF9F0A' : '#FF3B30';

        // Location header row
        rows += `<tr onclick="toggleLocAccordion(${li})"
            style="cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05)"
            onmouseenter="this.style.background='rgba(255,255,255,0.025)'"
            onmouseleave="this.style.background=''">
            <td style="padding:15px 20px;font-weight:700;font-size:14px;color:var(--accent)">
                <span id="lates-arrow-${li}" style="margin-right:8px;font-size:10px;opacity:0.5;display:inline-block;transition:transform 0.2s">▼</span>${loc}
            </td>
            <td style="text-align:center;padding:15px 10px;font-size:14px;font-weight:600">${lT}</td>
            <td style="text-align:center;padding:15px 10px;font-size:14px;font-weight:600;color:#34C759">${lO}</td>
            <td style="text-align:center;padding:15px 10px;font-size:14px;font-weight:600;color:${lL > 0 ? '#FF3B30' : '#34C759'}">${lL}</td>
            <td style="padding:15px 20px">${pctBar(lP)}</td>
        </tr>`;

        // Master sub-rows (sorted: most lates first)
        const sortedMasters = Object.entries(masters).sort(([,a],[,b]) =>
            b.filter(isLate).length - a.filter(isLate).length
        );

        sortedMasters.forEach(([name, recs]) => {
            const mT = recs.length;
            const mL = recs.filter(isLate).length;
            const mO = mT - mL;
            const mP = mT > 0 ? Math.round((mO / mT) * 100) : 0;

            // Last late detail
            const lastLate = recs.filter(isLate)
                .sort((a,b) => dayjs(b.date||b.createdAt).valueOf() - dayjs(a.date||a.createdAt).valueOf())[0];
            let lateHint = '';
            if (lastLate && lastLate.schedTime && lastLate.time) {
                const diff = dayjs(`2000-01-01 ${lastLate.time}`).diff(dayjs(`2000-01-01 ${lastLate.schedTime}`),'minute');
                lateHint = `<span style="color:#FF3B30;font-size:10px;margin-left:8px;font-weight:400">+${diff}мин · ${dayjs(lastLate.date||lastLate.createdAt).format('DD.MM')}</span>`;
            }

            rows += `<tr class="lates-mrow-${li}"
                style="border-bottom:1px solid rgba(255,255,255,0.02);background:rgba(0,0,0,0.18)"
                onmouseenter="this.style.background='rgba(255,255,255,0.02)'"
                onmouseleave="this.style.background='rgba(0,0,0,0.18)'">
                <td style="padding:10px 20px 10px 48px;font-size:13px">
                    <span style="opacity:0.3;margin-right:6px">·</span>${name}${lateHint}
                </td>
                <td style="text-align:center;padding:10px;font-size:13px;opacity:0.65">${mT}</td>
                <td style="text-align:center;padding:10px;font-size:13px;color:#34C759">${mO}</td>
                <td style="text-align:center;padding:10px;font-size:13px;color:${mL > 0 ? '#FF3B30' : '#34C759'}">${mL}</td>
                <td style="padding:10px 20px">${pctBar(mP)}</td>
            </tr>`;
        });
    });

    rows += `</tbody></table>`;
    accEl.innerHTML = `<div class="card" style="padding:0;overflow:hidden">${rows}</div>`;
};
