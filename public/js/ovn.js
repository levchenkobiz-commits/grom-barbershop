/**
 * public/js/ovn.js
 * =====================================================
 * Модуль ОВН (Видеонаблюдение / проверки).
 *
 * Содержит:
 *  - форму создания/редактирования записи ОВН
 *  - загрузку истории и журнала
 *  - фильтрацию, пресеты дат, стрелки навигации
 *
 * Зависимости: config.js, ui.js (window.BARBER_ROSTER, window.showToast, window.USER)
 */

function isOvnLateRecord(report) {
    if (!report) return false;
    const text = [
        report.violation,
        report.notes,
        report.forceMajeureType
    ].map(v => String(v || '').toLowerCase()).join(' ');

    return !!(
        report.schedTime ||
        report.isForceMajeure ||
        report.fineWaived ||
        report.forceMajeureType ||
        text.includes('\u043c\u0430\u0441\u0442\u0435\u0440 \u043e\u043f\u043e\u0437\u0434\u0430\u043b') ||
        text.includes('\u043e\u043f\u043e\u0437\u0434\u0430\u043d') ||
        text.includes('\u043d\u0435 \u0432\u044b\u0448\u0435\u043b') ||
        text.includes('\u043d\u0435\u0432\u044b\u0445\u043e\u0434') ||
        text.includes('\u0444\u043e\u0440\u0441')
    );
}

// ==== FORM: open / close ====
window.openOVNModal = function(loc = '') {
    document.getElementById('ovn-modal').classList.add('active');
    if (loc) {
        document.getElementById('ovn-location').value = loc;
        updateMastersDropdown();
    }
    document.getElementById('ovn-date').value = dayjs().format('YYYY-MM-DD');
    // Reset edit state
    window.CURRENT_EDIT_OVN_ID = null;
    const titleEl = document.getElementById('ovn-modal-title');
    if (titleEl) titleEl.innerText = 'Новая проверка ОВН';
};

window.closeOVNModal = function() {
    document.getElementById('ovn-modal').classList.remove('active');
    window.CURRENT_EDIT_OVN_ID = null;
    // Remove extra violation rows
    const container = document.getElementById('ovn-violations-container');
    if (container) {
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }
    }
};

// ==== MASTERS DROPDOWN ====
window.updateMastersDropdown = function() {
    const loc    = document.getElementById('ovn-location').value;
    const select = document.getElementById('ovn-barber');
    select.innerHTML = '<option value="">Выберите мастера</option>';

    if (!loc || !window.BARBER_ROSTER[loc]) return;

    const uniqueMasters = [...window.BARBER_ROSTER[loc]].sort((a, b) => a.localeCompare(b));
    uniqueMasters.forEach(name => {
        const o = document.createElement('option');
        o.value = name; o.textContent = name;
        select.appendChild(o);
    });
};

// ==== ADD VIOLATION ROW ====
window.addViolationRow = function() {
    const container  = document.getElementById('ovn-violations-container');
    const firstSelect = container.querySelector('select');
    const newDiv      = document.createElement('div');
    newDiv.style.cssText = 'display:flex; gap:10px; align-items:center;';

    const newSelect   = firstSelect.cloneNode(true);
    newSelect.required = false;

    const removeBtn   = document.createElement('button');
    removeBtn.type    = 'button';
    removeBtn.innerHTML = '&times;';
    removeBtn.style.cssText = 'background:none;border:none;color:#ff4d4d;font-size:20px;cursor:pointer;padding:0 5px;';
    removeBtn.onclick = () => newDiv.remove();

    newDiv.appendChild(newSelect);
    newDiv.appendChild(removeBtn);
    container.appendChild(newDiv);
};

// ==== UNPAID-SUM TOGGLE ====
window.handleOvnViolationChange = function() {
    const selectEl     = document.getElementById('ovn-violation');
    const sumContainer = document.getElementById('unpaid-sum-container');
    const sumInput     = document.getElementById('ovn-unpaid-sum');
    if (!selectEl || !sumContainer) return;

    const tgt = 'Пробиты не все услуги';
    let hasUnpaid = false;
    if (selectEl.multiple) {
        hasUnpaid = Array.from(selectEl.selectedOptions).some(o => o.value === tgt);
    } else {
        hasUnpaid = selectEl.value === tgt;
    }

    sumContainer.style.display = hasUnpaid ? 'block' : 'none';
    sumInput.required  = hasUnpaid;
    if (!hasUnpaid) sumInput.value = '';
};

// ==== SUBMIT (create / edit) ====
window.submitOVN = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-submit');
    btn.disabled = true;
    btn.innerText = 'Сохранение...';

    try {
        const report = {
            location:  document.getElementById('ovn-location').value,
            barber:    document.getElementById('ovn-barber').value,
            date:      document.getElementById('ovn-date').value,
            time:      document.getElementById('ovn-time').value,
            cost:      parseFloat(document.getElementById('ovn-cost').value) || 0,
            match:     '',
            nation:    document.getElementById('ovn-nation').value,
            violation: Array.from(document.querySelectorAll('.ovn-violation-select'))
                           .map(s => s.value)
                           .filter(v => v !== '')
                           .join(', '),
            notes: (function() {
                let text = (document.getElementById('ovn-notes') || {}).value || '';
                const unpaidInput = document.getElementById('ovn-unpaid-sum');
                const selects = Array.from(document.querySelectorAll('.ovn-violation-select')).map(s => s.value);
                if (unpaidInput && unpaidInput.value && selects.some(v => v && v.includes('Пробиты не все услуги'))) {
                    text += ' (Сумма непробитых услуг: ' + unpaidInput.value + ')';
                }
                return text;
            })()
        };

        let method = 'POST';
        if (window.CURRENT_EDIT_OVN_ID) {
            method = 'PUT';
            report.id         = window.CURRENT_EDIT_OVN_ID;
            report.editorName = window.USER ? window.USER.name : 'Аноним';
        }

        const res = await fetch('/api/ovn', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });

        if (!res.ok) throw new Error('Ошибка сервера ' + res.status);

        showToast('Успешно сохранено!', 'success');
        closeOVNModal();
        loadOVNHistory();

    } catch (err) {
        console.error(err);
        showToast('Ошибка: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Сохранить';
    }
};

// ==== TRIGGER EDIT ====
window.triggerEditOVN = async function(id) {
    const report = (window.lastOvnVideoRes || []).find(r => r.id == id);
    if (!report) return showToast('Не удалось найти запись', 'error');

    window.CURRENT_EDIT_OVN_ID = id;

    document.getElementById('ovn-location').value = report.location;
    updateMastersDropdown();

    setTimeout(() => {
        document.getElementById('ovn-barber').value = report.barber || report.master || '';
        if (!document.getElementById('ovn-barber').value) {
            const opt = document.createElement('option');
            opt.value = report.barber || report.master;
            opt.innerText = opt.value;
            document.getElementById('ovn-barber').appendChild(opt);
            document.getElementById('ovn-barber').value = opt.value;
        }

        let dateVal = report.date || '';
        if (dateVal.includes('.')) {
            const parts = dateVal.split('.');
            if (parts.length === 3) dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        document.getElementById('ovn-date').value = dateVal;
        document.getElementById('ovn-time').value = report.time || '';
        document.getElementById('ovn-cost').value = report.price !== undefined ? report.price : '';

        const receiptMatch = (report.receipt || '').toLowerCase().includes('да') ? 'да' : 'нет';
        const ovnMatch = document.getElementById('ovn-match');
        if (ovnMatch) ovnMatch.value = receiptMatch;

        document.getElementById('ovn-nation').value = report.race || report.ethnicity || 'Русский';

        const container   = document.getElementById('ovn-violations-container');
        const firstSelect = container.querySelector('select');
        container.innerHTML = '';
        container.appendChild(firstSelect);

        const violationsList = (report.violation || '').split(',').map(s => s.trim()).filter(Boolean);
        firstSelect.value = violationsList[0] && Array.from(firstSelect.options).some(o => o.value === violationsList[0])
            ? violationsList[0]
            : 'Замечаний нет';

        for (let i = 1; i < violationsList.length; i++) {
            const nextV = violationsList[i];
            if (nextV && Array.from(firstSelect.options).some(o => o.value === nextV)) {
                const newDiv    = document.createElement('div');
                newDiv.style.cssText = 'display:flex;gap:10px;align-items:center;';
                const newSelect = firstSelect.cloneNode(true);
                newSelect.required = false;
                newSelect.value    = nextV;
                const removeBtn    = document.createElement('button');
                removeBtn.type     = 'button';
                removeBtn.innerHTML = '×';
                removeBtn.style.cssText = 'background:rgba(255,59,48,0.2);color:#FF3B30;border:none;width:30px;height:30px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;';
                removeBtn.onclick  = () => newDiv.remove();
                newDiv.appendChild(newSelect);
                newDiv.appendChild(removeBtn);
                container.appendChild(newDiv);
            }
        }

        let cleanNotes = report.notes ? report.notes.replace(/ \(отредактировано.*\)/, '') : '';
        document.getElementById('ovn-notes').value = cleanNotes;

        const titleEl = document.getElementById('ovn-modal-title');
        if (titleEl) titleEl.innerText = 'Редактирование проверки ОВН';

        const modal = document.getElementById('ovn-modal');
        modal.style.display = 'flex';
        modal.offsetHeight;
        modal.classList.add('active');
    }, 50);
};

// ==== LOAD HISTORY ====
async function loadOVNHistory() {
    try {
        const res = await fetch('/api/ovn?video_only=1');
        if (!res.ok) throw new Error('fetch error');
        const loadedReports = await res.json();
        const reports = (loadedReports || []).filter(r => !isOvnLateRecord(r));

        window.lastOvnVideoRes = reports;

        // --- Daily Metrics ---
        let totalMtd = 0, passed = 0;
        const branchData = {};
        ['Алексеевская','Варшавская','Партизанская','Рязанка','Сокол','Текстильщики'].forEach(loc => {
            branchData[loc] = { total: 0, ok: 0, masters: {} };
        });

        const curMonth = dayjs().format('YYYY-MM');
        reports.forEach(r => {
            if (dayjs(r.createdAt).format('YYYY-MM') !== curMonth) return;
            totalMtd++;
            const lowV = (r.violation || '').toLowerCase();
            const isOk = lowV.includes('нет') || lowV.includes('✅');
            if (isOk) passed++;

            const loc = r.location || 'Неизвестно';
            if (branchData[loc]) {
                branchData[loc].total++;
                if (isOk) branchData[loc].ok++;
                const b = r.barber || 'Неизвестно';
                if (!branchData[loc].masters[b]) branchData[loc].masters[b] = { total: 0, ok: 0 };
                branchData[loc].masters[b].total++;
                if (isOk) branchData[loc].masters[b].ok++;
            }
        });

        window.ovnRunrate  = totalMtd > 0 ? (passed / totalMtd) * 100 : 0;
        const ovnPerc      = window.ovnRunrate.toFixed(0);

        window.OVN_DRILLDOWN = Object.keys(branchData).map(loc => {
            const bD   = branchData[loc];
            const rate = bD.total > 0 ? ((bD.ok / bD.total) * 100).toFixed(0) : 0;
            let eLoc   = loc;
            if (eLoc === 'Алексеевская') eLoc = 'Алексеевская Ⓜ️';
            if (eLoc === 'Варшавская')   eLoc = 'Варшавская Ⓜ️';
            if (eLoc === 'Партизанская') eLoc = 'Партизанская Ⓜ️';
            return {
                name: eLoc,
                value: `${rate}% (${bD.ok}/${bD.total})`,
                trend: rate >= 80 ? 'up' : 'down',
                masters: Object.keys(bD.masters).sort().map(m => {
                    const mD   = bD.masters[m];
                    const mRate = mD.total > 0 ? ((mD.ok / mD.total) * 100).toFixed(0) : 0;
                    return { name: m, v: `${mRate}% (${mD.ok} из ${mD.total})` };
                })
            };
        });

        const cardVal = document.getElementById('card-ovn-runrate');
        const cardSub = document.getElementById('card-ovn-subtext');
        if (cardVal) cardVal.innerText = ovnPerc + '%';
        if (cardSub) {
            const startStr = dayjs().startOf('month').format('DD.MM');
            const endStr   = dayjs().subtract(1, 'day').format('DD.MM');
            cardSub.innerText = `${startStr}-${endStr} | ${passed} из ${totalMtd} без замечаний`;
        }

        // Master role: update own OVN score
        if (window.USER && window.USER.role === 'master') {
            const myName  = window.USER.name;
            const myOvn   = reports.filter(r => r.barber === myName);
            const scoreEl = document.getElementById('master-ovn-score');
            if (myOvn.length > 0) {
                const successCount = myOvn.filter(r => {
                    const lowV = (r.violation || '').toLowerCase();
                    return lowV.includes('нет') || lowV.includes('✅');
                }).length;
                const score = (successCount / myOvn.length) * 100;
                if (scoreEl) { scoreEl.innerText = score.toFixed(0) + '%'; scoreEl.style.color = score >= 80 ? '#34C759' : '#ff4444'; }
            } else {
                if (scoreEl) { scoreEl.innerText = 'Нет данных'; scoreEl.style.color = '#fff'; }
            }
        }

        // --- TODAY's checks counter ---
        const todayStr     = dayjs().format('YYYY-MM-DD');
        const todayReports = reports.filter(r =>
            !isOvnLateRecord(r) &&
            dayjs(r.createdAt).format('YYYY-MM-DD') === todayStr &&
            !(r.violation || '').toLowerCase().includes('мастер опоздал')
        );
        const remaining    = Math.max(0, 35 - todayReports.length);
        const counterEl    = document.getElementById('ovn-remaining-count');
        if (counterEl) {
            if (remaining > 0) { counterEl.innerText = `Осталось проверок: ${remaining}`; counterEl.style.color = '#FF9F0A'; }
            else               { counterEl.innerText = 'Проверки завершены ✅'; counterEl.style.color = '#34C759'; }
        }

        // --- Render today's table ---
        const renderRow = (r) => {
            const lowV      = (r.violation || '').toLowerCase();
            const badgeClass = (lowV.includes('нет') || lowV.includes('✅')) ? 'badge-yes' : 'badge-no';
            const matchVal   = (r.match || '').trim() === 'да';
            const matchTag   = matchVal
                ? `<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>`
                : `<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>`;
            const role       = window.USER ? window.USER.role : '';
            const canEdit    = (role === 'ovn' || role === 'manager' || role === 'owner') && !r.editedBy;
            const editHtml   = canEdit
                ? `<span onclick="triggerEditOVN('${r.id}', '${(r.notes || '').replace(/'/g, "\\'")}')"\
                      style="cursor:pointer;margin-left:8px;opacity:0.6" title="Редактировать">✏️</span>`
                : '';
            return `<tr>
                <td data-label="МАСТЕР" style="font-size:14px;padding-left:25px"><b>${r.barber}</b></td>
                <td data-label="НАРУШЕНИЕ"><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
                <td data-label="ДАТА ПРОСМ." style="font-size:11px;white-space:nowrap;opacity:0.8">${dayjs(r.createdAt).format('HH:mm DD.MM')}</td>
                <td data-label="САЛОН" style="font-size:13px;font-weight:700;color:var(--accent)">${r.location}</td>
                <td style="font-size:13px;opacity:0.7">${dayjs(r.date || '').format('DD.MM')} ${r.time || ''} ${matchTag}</td>
                <td data-label="РАБОТА" style="font-size:12px;opacity:0.7">${r.notes || '-'} ${editHtml}</td>
            </tr>`;
        };

        const tblToday = document.getElementById('ovn-today-history');
        if (tblToday) {
            const nonLateToday = todayReports.filter(r => !(r.violation || '').toLowerCase().includes('мастер опоздал'));
            tblToday.innerHTML = nonLateToday.length
                ? nonLateToday.map(renderRow).join('')
                : '<tr><td colspan="6" style="text-align:center;padding:40px;opacity:0.5">Сегодня проверок еще не было</td></tr>';
        }

        // --- Populate master dropdown for journal ---
        const masterSelect = document.getElementById('ovn-history-master-filter');
        if (masterSelect && masterSelect.options.length <= 1) {
            let allMasters = [];
            if (window.BARBER_ROSTER) Object.values(window.BARBER_ROSTER).forEach(l => { allMasters = allMasters.concat(l); });
            Array.from(new Set(allMasters)).sort((a, b) => a.localeCompare(b)).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                masterSelect.appendChild(opt);
            });
        }

        if (typeof renderOvnJournal === 'function') renderOvnJournal();

    } catch (e) {
        console.error('[OVN] History load error:', e);
    }
}

// ==== JOURNAL FILTER ====
window.applyOvnPreset = function() {
    const preset  = document.getElementById('ovn-history-preset').value;
    const startEl = document.getElementById('ovn-history-start');
    const endEl   = document.getElementById('ovn-history-end');

    if (preset === 'none' || preset === 'all') { startEl.value = ''; endEl.value = ''; }
    else if (preset === 'today')     { startEl.value = endEl.value = dayjs().format('YYYY-MM-DD'); }
    else if (preset === 'yesterday') { startEl.value = endEl.value = dayjs().subtract(1,'day').format('YYYY-MM-DD'); }
    else if (preset === 'week')      { startEl.value = dayjs().startOf('week').add(1,'day').format('YYYY-MM-DD'); endEl.value = dayjs().format('YYYY-MM-DD'); }
    else if (preset === 'month')     { startEl.value = dayjs().startOf('month').format('YYYY-MM-DD'); endEl.value = dayjs().format('YYYY-MM-DD'); }
    renderOvnJournal();
};

window.shiftOvnDate = function(days) {
    const startEl  = document.getElementById('ovn-history-start');
    const endEl    = document.getElementById('ovn-history-end');
    const presetEl = document.getElementById('ovn-history-preset');
    const baseDate = startEl.value ? dayjs(startEl.value) : dayjs();
    const newDate  = baseDate.add(days, 'day').format('YYYY-MM-DD');
    startEl.value  = endEl.value = newDate;
    presetEl.value = 'custom';
    renderOvnJournal();
};

window.renderOvnJournal = function() {
    if (!window.lastOvnVideoRes) return;
    const res      = window.lastOvnVideoRes;
    const startD   = document.getElementById('ovn-history-start').value;
    const endD     = document.getElementById('ovn-history-end').value;
    const locFilter    = document.getElementById('ovn-history-loc-filter').value;
    const masterFilter = document.getElementById('ovn-history-master-filter').value;
    const tbody    = document.getElementById('ovn-history-list');
    const tableContainer = document.getElementById('ovn-history-table-container');

    if (!startD && !endD && !locFilter && !masterFilter && document.getElementById('ovn-history-preset').value === 'none') {
        tableContainer.style.display = 'none'; return;
    }
    tableContainer.style.display = 'block';

    const list = res.filter(r => {
        if (isOvnLateRecord(r)) return false;
        if (!r.createdAt) return false;
        // Exclude lateness records — they belong to the Опоздания tab
        if ((r.violation || '').toLowerCase().includes('мастер опоздал')) return false;
        const recDay = dayjs(r.createdAt);
        if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
        if (endD   && recDay.isAfter(dayjs(endD), 'day'))   return false;
        if (locFilter    && r.location !== locFilter && locFilter !== '')    return false;
        if (masterFilter && masterFilter !== '' && r.barber !== masterFilter) return false;
        return true;
    }).sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;opacity:0.5">В этом периоде нет записей</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(r => {
        const lowV      = (r.violation || '').toLowerCase();
        const badgeClass = (lowV.includes('нет') || lowV.includes('✅')) ? 'badge-yes' : 'badge-no';
        const matchVal   = (r.match || '').trim() === 'да';
        const matchTag   = matchVal
            ? `<span style="color:#34C759;margin-left:4px" title="Чек совпадает">●</span>`
            : `<span style="color:#FF3B30;margin-left:4px" title="Расхождение">●</span>`;
        const role       = window.USER ? window.USER.role : '';
        const canEdit    = (role === 'ovn' || role === 'manager' || role === 'owner') && !r.editedBy;
        const editHtml   = canEdit
            ? `<span onclick="triggerEditOVN('${r.id}')" style="cursor:pointer;margin-left:8px;opacity:0.6" title="Редактировать">✏️</span>`
            : '';
        const isToday    = dayjs(r.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
        return `<tr>
            <td data-label="МАСТЕР" style="font-size:14px;padding-left:25px"><b>${r.barber}</b></td>
            <td data-label="НАРУШЕНИЕ"><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
            <td data-label="ДАТА ПРОСМ." style="font-size:11px;white-space:nowrap;opacity:0.8">
                ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                ${isToday ? '<span style="color:var(--accent);margin-left:3px">●</span>' : ''}
            </td>
            <td data-label="САЛОН" style="font-size:13px;font-weight:700;color:var(--accent)">${r.location}</td>
            <td style="font-size:13px;opacity:0.7">${dayjs(r.date || '').format('DD.MM')} ${r.time || ''} ${matchTag}</td>
            <td data-label="РАБОТА" style="font-size:12px;opacity:0.7">${r.notes || '-'} ${editHtml}</td>
        </tr>`;
    }).join('');
};
