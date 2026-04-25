/**
 * public/js/lates.js
 * =====================================================
 * Модуль Опоздания (Lates).
 *
 * Содержит:
 *  - Workout-audit grid (таблица мастеров с фактическим временем)
 *  - Счётчик непроверенных мастеров
 *  - Журнал с фильтрацией, пресетами, стрелками дат
 *  - quickSaveLate — быстрое сохранение опоздания
 *
 * Зависимости: config.js, ui.js
 */

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

        // 1. WORKFORCE AUDIT GRID
        const sched      = schedRes.find(s => s.date === date && s.location === loc) || { masters: [] };
        const mastersList = sched.masters || [];
        const checksForSelectedDay = ovnRes.filter(r => dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date && r.location === loc);

        const auditEl = document.getElementById('lates-workforce-audit');
        if (auditEl) {
            auditEl.innerHTML = mastersList.map(m => {
                const check       = checksForSelectedDay.find(r => r.barber === m.name);
                const isChecked   = !!check;
                const statusColor = isChecked
                    ? (check.violation === 'Замечаний нет' ? '#34C759' : '#FF3B30')
                    : 'rgba(255,255,255,0.1)';
                const latenessMsg = isChecked
                    ? (check.violation === 'Замечаний нет' ? '✅ Вовремя' : '⚠️ Опоздание')
                    : 'Ожидание...';
                const safeId = (m.name || '').replace(/\s+/g, '');

                return `
                    <div class="card" style="padding:20px;border-top:4px solid ${statusColor};">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
                            <span style="font-weight:700;font-size:16px">${m.name || 'Мастер'}</span>
                            <span style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.05);border-radius:6px;color:var(--text-muted)">
                                ${m.isReplacement ? 'Замена' : 'Основной'}
                            </span>
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
                    </div>
                `;
            }).join('') || `<div style="grid-column:span 3;color:var(--text-muted);text-align:center;padding:40px">График пуст.</div>`;
        }

        // 2. GLOBAL COUNTER with breakdown
        let totalMastersGlobal = 0, checkedMastersGlobal = 0;
        const todayChecks = ovnRes.filter(r => dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date);
        const missingList = []; // { location, name }

        schedRes.filter(s => s.date === date).forEach(s => {
            const branchMasters = s.masters || [];
            const sLoc = (s.location || '').trim().toLowerCase();
            totalMastersGlobal += branchMasters.length;
            branchMasters.forEach(m => {
                const found = todayChecks.some(r =>
                    r.barber === m.name &&
                    (r.location || '').trim().toLowerCase() === sLoc
                );
                if (found) {
                    checkedMastersGlobal++;
                } else {
                    missingList.push({ location: s.location, name: m.name });
                }
            });
        });

        console.log(`[Lates Counter] total=${totalMastersGlobal}, checked=${checkedMastersGlobal}, remaining=${missingList.length}`);
        console.log(`[Lates Counter] todayChecks:`, todayChecks.map(r => `${r.barber}@${r.location}`));
        console.log(`[Lates Counter] MISSING:`, missingList);

        const remaining  = missingList.length;
        const counterEl  = document.getElementById('lates-remaining-count');
        if (counterEl) {
                counterEl.innerText = 'Осталось: ' + remaining;
                counterEl.style.color = '#FF9F0A';
                counterEl.title = '';
                counterEl.style.cursor = 'default';
            } else if (totalMastersGlobal > 0) {
                counterEl.innerText = 'Все точки проверены ✅';
                counterEl.style.color = '#34C759';
                counterEl.title = '';
                counterEl.style.cursor = 'default';
            } else {
                counterEl.innerText = 'График не составлен';
                counterEl.style.color = 'var(--text-muted)';
                counterEl.title = '';
                counterEl.style.cursor = 'default';
            }
        }

        // 3. POPULATE MASTER DROPDOWN
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
        const el = document.getElementById('lates-history');
        if (el) el.innerHTML = '<tr><td colspan="7" style="color:red">Ошибка загрузки данных</td></tr>';
    }
}

// ==== LATENESS CALC (live) ====
window.updateLateness = function(el, barberId) {
    const card  = el.closest('.card');
    const plan  = card.querySelector('.sched-plan').value;
    const fact  = card.querySelector('.sched-fact').value;
    const resEl = document.getElementById(`late-calc-${barberId}`);
    if (plan && fact) {
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

window.renderLatesJournal = function() {
    if (!window.lastOvnRes) return;
    const res      = window.lastOvnRes;

    // Auto-apply 'today' preset on first render
    const presetEl = document.getElementById('lates-history-preset');
    if (presetEl && presetEl.value === 'today' && !document.getElementById('lates-history-start').value) {
        applyLatesPreset(); return;
    }

    const startD       = document.getElementById('lates-history-start').value;
    const endD         = document.getElementById('lates-history-end').value;
    const locFilter    = document.getElementById('lates-history-loc-filter').value;
    const masterFilter = document.getElementById('lates-history-master-filter').value;
    const tbody        = document.getElementById('lates-history');

    const list = res.filter(r => {
        const rDateStr = r.date || r.createdAt;
        if (!rDateStr) return false;
        const recDay = dayjs(rDateStr);
        if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
        if (endD   && recDay.isAfter(dayjs(endD), 'day'))   return false;
        if (locFilter    && r.location && r.location !== locFilter && locFilter !== '') return false;
        if (masterFilter && masterFilter !== '' && r.barber !== masterFilter)            return false;
        if (r.schedTime) return true;
        const v = (r.violation || '').toLowerCase();
        return v.includes('опоздал');
    }).sort((a, b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());

    tbody.innerHTML = list.map(r => {
        const lowV = (r.violation || '').toLowerCase();
        const isOk = lowV === 'замечаний нет' || !lowV;
        let badgeStyles = 'background:rgba(255,255,255,0.05);color:#888;';
        if      (lowV.includes('согласованное') || lowV.includes('подтг')) badgeStyles = 'background:rgba(52,199,89,0.1);color:#34C759;';
        else if (lowV.includes('опоздал') || (r.schedTime && r.time > r.schedTime))
                 badgeStyles = 'background:rgba(255,59,48,0.1);color:#FF3B30;font-weight:700;';

        let delayText = '-';
        if (r.schedTime && r.time) {
            const diff = dayjs(`2000-01-01 ${r.time}`).diff(dayjs(`2000-01-01 ${r.schedTime}`), 'minute');
            if      (diff > 0) delayText = `+${diff} мин`;
            else if (diff < 0) delayText = `${Math.abs(diff)} мин раньше`;
            else               delayText = 'вовремя';
        }

        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.01);height:50px;">
            <td style="font-size:14px;padding-left:25px"><b>${r.barber || 'Мастер'}</b></td>
            <td><span style="display:inline-block;padding:4px 10px;border-radius:8px;font-size:12px;${badgeStyles};text-align:center;">${r.violation || (delayText.includes('+') ? 'Опоздал' : (isOk ? 'Ок' : '-'))}</span></td>
            <td style="font-size:11px;white-space:nowrap;opacity:0.6;">${dayjs(r.date || r.createdAt || new Date()).format('DD.MM HH:mm')}</td>
            <td style="font-size:14px;font-weight:700;color:var(--accent)">${r.location || '...'}</td>
            <td style="font-size:13px;opacity:0.7">${r.schedTime || '--:--'}</td>
            <td style="font-size:13px;color:white"><b>${r.time || '--:--'}</b></td>
            <td style="font-size:13px;color:${delayText.includes('+') ? '#FF3B30' : (isOk ? '#34C759' : 'inherit')}"><b>${delayText}</b></td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:40px;opacity:0.5">Журнал пуст</td></tr>';
};
