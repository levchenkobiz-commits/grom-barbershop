/**
 * public/js/schedule.js
 * =====================================================
 * Модуль Расписание (Schedule).
 *
 * Содержит:
 *  - loadSchedule (генерация таблицы на 31 день)
 *  - saveScheduleAll
 *  - Context-menu, time picker (showContextMenu, applyTime, etc.)
 *  - loadMasterSchedule (кабинет мастера, 7 дней)
 *
 * Зависимости: config.js (window.BARBER_ROSTER)
 */

// ---- internal state ----
let currentContextCell    = null;
let pendingReplacementMaster = null;

// ==== CONTEXT MENU ====
window.showContextMenu = function(e, date, location, masterName) {
    if (window.USER && window.USER.role === 'ovn') return;
    e.preventDefault(); e.stopPropagation();
    closeTimePicker();
    const menu = document.getElementById('sched-context-menu');
    menu.style.display = 'block';
    menu.style.left = e.pageX + 'px';
    menu.style.top  = e.pageY + 'px';

    currentContextCell       = { date, location, masterName, el: e.target };
    pendingReplacementMaster = null;

    const mastersList = document.getElementById('ctx-masters-list');
    let all = [];
    if (window.BARBER_ROSTER) Object.values(window.BARBER_ROSTER).forEach(list => { all = all.concat(list); });
    const unique = Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
    mastersList.innerHTML = unique.map(m =>
        `<div class="ctx-item" onclick="prepareReplacement('${m}', event)">${m}</div>`
    ).join('');
};

window.prepareReplacement = function(masterName, e) {
    e.stopPropagation();
    pendingReplacementMaster = masterName;
    const picker = document.getElementById('time-picker');
    picker.style.display = 'block';
    picker.style.left = (parseInt(document.getElementById('sched-context-menu').style.left) + 180) + 'px';
    picker.style.top  = document.getElementById('sched-context-menu').style.top;
};

window.showRowTimePicker = function(e, loc, master) {
    if (window.USER && window.USER.role === 'ovn') return;
    e.stopPropagation();
    closeContextMenu();
    const picker = document.getElementById('time-picker');
    picker.style.display = 'block';
    picker.style.left = e.pageX + 'px';
    picker.style.top  = e.pageY + 'px';
    currentContextCell       = { isRow: true, loc, master };
    pendingReplacementMaster = null;
};

window.showTimePicker = function(e, cell) {
    if (window.USER && window.USER.role === 'ovn') return;
    e.stopPropagation();
    closeContextMenu();
    const picker = document.getElementById('time-picker');
    picker.style.display = 'block';
    picker.style.left = e.pageX + 'px';
    picker.style.top  = e.pageY + 'px';
    currentContextCell       = { el: cell };
    pendingReplacementMaster = null;
};

window.applyTime = function(timeText) {
    if (!currentContextCell) { closeTimePicker(); closeContextMenu(); return; }

    if (currentContextCell.isRow) {
        const selector = `.sched-cell[data-loc="${currentContextCell.loc}"][data-master="${currentContextCell.master}"]`;
        document.querySelectorAll(selector).forEach(cell => {
            cell.innerText = timeText;
            if (timeText === 'выходной' || timeText === 'вых') cell.classList.remove('work', 'replacement');
            else { cell.classList.add('work'); cell.classList.remove('replacement'); }
        });
    } else {
        let finalVal = timeText;
        if (pendingReplacementMaster) {
            finalVal = pendingReplacementMaster + ' (' + timeText + ') (ЗАМЕНА)';
            currentContextCell.el.classList.add('replacement');
        }
        currentContextCell.el.innerText = finalVal;
        if (timeText === 'выходной' || timeText === 'вых') currentContextCell.el.classList.remove('work', 'replacement');
        else currentContextCell.el.classList.add('work');
    }
    closeTimePicker();
    closeContextMenu();
};

window.applyCustomTime = function() {
    closeTimePicker();
    document.getElementById('custom-time-modal').classList.add('active');
};
window.closeCustomTimeModal = function() {
    document.getElementById('custom-time-modal').classList.remove('active');
};
window.submitCustomTime = function() {
    const from = document.getElementById('custom-time-from').value;
    const to   = document.getElementById('custom-time-to').value;
    applyTime('С ' + from + ' до ' + to);
    closeCustomTimeModal();
};

window.clearCell = function() {
    if (currentContextCell && currentContextCell.el) {
        currentContextCell.el.innerText = 'выходной';
        currentContextCell.el.classList.remove('replacement', 'work');
    }
    closeContextMenu();
};

window.closeContextMenu = function() {
    const m = document.getElementById('sched-context-menu');
    if (m) m.style.display = 'none';
};
window.closeTimePicker = function() {
    const p = document.getElementById('time-picker');
    if (p) p.style.display = 'none';
};

document.addEventListener('click', () => { closeContextMenu(); closeTimePicker(); });

// ==== LOAD SCHEDULE (31-day grid) ====
async function loadSchedule() {
    const startInput   = document.getElementById('sched-start-date');
    const startDateStr = startInput.value || dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
    startInput.value   = startDateStr;
    const startDate    = dayjs(startDateStr);

    const thead = document.getElementById('sched-thead');
    const tbody = document.getElementById('sched-tbody');
    const rusDays = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

    let headHtml = '<tr><th class="sched-master-name">Мастер / Дата</th>';
    for (let i = 0; i < 31; i++) {
        const d = startDate.add(i, 'day');
        headHtml += `<th>${d.format('DD.MM')}<br><small style="font-weight:400">${rusDays[d.day()]}</small></th>`;
    }
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    let schedData = [];
    try {
        const res = await fetch('/api/schedule');
        if (res.ok) {
            const parsed = await res.json();
            if (Array.isArray(parsed)) schedData = parsed;
        }
    } catch (e) { console.error('[Schedule] Load error:', e); }

    const PRIMARY = window.BARBER_ROSTER;
    let bodyHtml = '';

    for (const [loc, masters] of Object.entries(PRIMARY)) {
        bodyHtml += `<tr class="loc-header"><td colspan="32">${loc}</td></tr>`;

        masters.forEach(m => {
            bodyHtml += `<tr><td class="sched-master-name sched-master-row-btn" onclick="showRowTimePicker(event,'${loc}','${m}')" title="Выбрать график на весь месяц">${m}</td>`;
            for (let i = 0; i < 31; i++) {
                const date       = startDate.add(i, 'day').format('YYYY-MM-DD');
                const entry      = schedData.find(s => s.date === date && s.location === loc);
                const entryM     = (entry && Array.isArray(entry.masters)) ? entry.masters : [];
                const masterData = entryM.find(x => x.name === m);
                let val = 'выходной', cls = '';
                if (masterData) {
                    val = masterData.text || (masterData.startTime === '10:00' ? 'С 10 до 22' : (masterData.startTime === '09:00' ? 'С 09 до 22' : 'раб'));
                    cls = 'work';
                    if (masterData.isReplacement) cls += ' replacement';
                }
                bodyHtml += `<td><div class="sched-cell ${cls}"
                    onclick="showTimePicker(event,this)"
                    oncontextmenu="showContextMenu(event,'${date}','${loc}','${m}')"
                    data-date="${date}" data-loc="${loc}" data-master="${m}">${val}</div></td>`;
            }
            bodyHtml += '</tr>';
        });

        // Replacement row
        bodyHtml += `<tr style="opacity:0.6;"><td class="sched-master-name" style="font-size:11px;">Новый / Замена</td>`;
        for (let i = 0; i < 31; i++) {
            const date    = startDate.add(i, 'day').format('YYYY-MM-DD');
            const entry   = schedData.find(s => s.date === date && s.location === loc);
            const entryM  = (entry && Array.isArray(entry.masters)) ? entry.masters : [];
            const repls   = entryM.filter(x => x.isReplacement && !PRIMARY[loc].includes(x.name));
            let val = '', cls = 'replacement';
            if (repls.length > 0) val = repls.map(r => r.text || (r.name + ' (' + r.startTime + ')')).join(', ');
            bodyHtml += `<td><div class="sched-cell ${cls}"
                onclick="showContextMenu(event,'${date}','${loc}','NEW')"
                oncontextmenu="showContextMenu(event,'${date}','${loc}','NEW')"
                data-date="${date}" data-loc="${loc}" data-master="NEW">${val}</div></td>`;
        }
        bodyHtml += '</tr>';
    }

    tbody.innerHTML = bodyHtml;

    // Sync top scrollbar
    setTimeout(() => {
        const tScroll  = document.querySelector('.sched-top-scroll');
        const tDummy   = document.querySelector('.sched-top-dummy');
        const wrapper  = document.querySelector('.sched-table-wrapper');
        const table    = document.querySelector('.sched-table');
        if (tDummy && table) tDummy.style.width = table.scrollWidth + 'px';
        if (tScroll && wrapper && !tScroll.dataset.synced) {
            tScroll.addEventListener('scroll', () => { wrapper.scrollLeft = tScroll.scrollLeft; });
            wrapper.addEventListener('scroll', () => { tScroll.scrollLeft = wrapper.scrollLeft; });
            tScroll.dataset.synced = 'true';
        }
    }, 50);
}

// ==== SAVE SCHEDULE ====
async function saveScheduleAll() {
    const btn          = document.querySelector('#schedule-section .btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '⌛ Сохранение...'; btn.disabled = true;

    const gridData = {};
    document.querySelectorAll('.sched-cell').forEach(cell => {
        const date   = cell.dataset.date;
        const loc    = cell.dataset.loc;
        const master = cell.dataset.master;
        const text   = cell.innerText.trim();
        const key    = `${date}|${loc}`;
        if (!gridData[key]) gridData[key] = [];
        if (!text || text.toLowerCase() === 'выходной' || text.toLowerCase() === 'вых') return;

        if (master === 'NEW') {
            text.split(',').forEach(m => {
                gridData[key].push({ name: m.replace('(ЗАМЕНА)', '').trim(), isReplacement: true, startTime: '10:00', text: m.trim() });
            });
        } else {
            gridData[key].push({
                name: master,
                isReplacement: text.includes('(ЗАМЕНА)'),
                startTime: text.includes('09') ? '09:00' : '10:00',
                text
            });
        }
    });

    try {
        const payload = Object.entries(gridData).map(([key, masters]) => {
            const [date, location] = key.split('|');
            return { date, location, masters };
        });
        const resp = await fetch('/api/schedule', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Bad server response');
        btn.innerText = '✅ Сохранено';
        setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
    } catch (e) {
        showToast('Ошибка сохранения', 'error');
        btn.innerText = originalText; btn.disabled = false;
    }
}

// ==== MASTER CABINET: 7-day schedule ====
window.loadMasterSchedule = async function() {
    const masterNameEl = document.getElementById('dynamic-master-name');
    if (!masterNameEl) return;
    const masterName  = masterNameEl.innerText.trim();
    const startInput  = document.getElementById('master-sched-start');
    let   startDateStr = startInput ? startInput.value : '';
    if (!startDateStr) {
        startDateStr = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
        if (startInput) startInput.value = startDateStr;
    }
    const startDate = dayjs(startDateStr);

    let schedData = [];
    try {
        const res = await fetch('/api/schedule');
        if (res.ok) {
            const parsed = await res.json();
            if (Array.isArray(parsed)) schedData = parsed;
        }
    } catch (e) { console.error('[Schedule] Master schedule load error:', e); }

    const rusDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    let html = '';

    for (let i = 0; i < 7; i++) {
        const d        = startDate.add(i, 'day');
        const dateStr  = d.format('YYYY-MM-DD');
        let   masterData   = null;
        let   workLocation = '';

        for (const entry of schedData) {
            if (entry.date === dateStr && Array.isArray(entry.masters)) {
                const found = entry.masters.find(m => m.name === masterName);
                if (found) { masterData = found; workLocation = entry.location; break; }
            }
        }

        let val    = 'выходной';
        let bg     = 'rgba(255,255,255,0.05)';
        let border = '1px solid rgba(255,255,255,0.1)';
        if (masterData) {
            val    = masterData.text || (masterData.startTime ? `С ${masterData.startTime.split(':')[0]} до 22` : 'С 10 до 22');
            bg     = 'rgba(212,175,55,0.15)';
            border = '1px solid var(--accent)';
        }

        html += `
            <div style="flex:1;min-width:80px;padding:12px 8px;border-radius:12px;background:${bg};border:${border};text-align:center;display:flex;flex-direction:column;gap:8px;">
                <div style="font-size:11px;opacity:0.6;">${rusDays[d.day()]}</div>
                <div style="font-size:14px;font-weight:600;">${d.format('DD.MM')}</div>
                <div style="font-size:12px;color:${masterData ? 'var(--accent)' : 'var(--text-muted)'};font-weight:500;">${val}</div>
                ${workLocation ? `<div style="font-size:10px;opacity:0.5;">${workLocation}</div>` : ''}
            </div>
        `;
    }

    const container = document.getElementById('master-sched-container');
    const emptyMsg  = document.getElementById('master-sched-empty');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'flex';
        if (emptyMsg) emptyMsg.style.display = 'none';
    }
};
