/**
 * WARNING: MASTER SCHEDULE — DO NOT TOUCH as a side effect of another task.
 * This UI writes schedule.json, which is evidence for attendance and salary.
 * Change it only when the user explicitly requests master-schedule behavior.
 * See /root/grom-dashboard/SCHEDULE_LOCK.md and AGENTS.md.
 *
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

function isScheduleOffDay(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'выходной' || normalized === 'вых' || normalized === 'ыходной';
}

function normalizeScheduleText(value) {
    return String(value || '').trim().toLowerCase() === 'ыходной' ? 'выходной' : value;
}

function setupScheduleFloatingHeader() {
    const wrapper = document.querySelector('#schedule-section .sched-table-wrapper');
    const table = wrapper ? wrapper.querySelector('.sched-table') : null;
    const thead = table ? table.querySelector('thead') : null;
    if (!wrapper || !table || !thead || !thead.firstElementChild) return;

    // На touch-экранах заголовок остаётся в самой таблице: отдельный fixed-клон
    // обновлялся на каждом пикселе горизонтального скролла и вызывал подёргивания.
    if (window.matchMedia && window.matchMedia('(max-width: 600px), (pointer: coarse)').matches) {
        const existing = document.getElementById('sched-floating-header');
        if (existing) existing.style.display = 'none';
        return;
    }

    let floating = document.getElementById('sched-floating-header');
    if (!floating) {
        floating = document.createElement('div');
        floating.id = 'sched-floating-header';
        floating.style.cssText = [
            'position:fixed', 'top:0', 'display:none', 'overflow:hidden',
            'z-index:900', 'background:#171717',
            'box-shadow:0 8px 24px rgba(0,0,0,0.45),0 1px 0 rgba(232,255,56,0.25)'
        ].join(';');
        document.body.appendChild(floating);
    }

    const headerTable = document.createElement('table');
    headerTable.className = 'sched-table';
    headerTable.style.cssText = `width:${table.scrollWidth}px;table-layout:fixed;margin:0;border-collapse:collapse;background:#171717;`;
    const headerHead = thead.cloneNode(true);
    headerTable.appendChild(headerHead);
    floating.replaceChildren(headerTable);

    const sourceCells = Array.from(thead.querySelectorAll('th'));
    const floatingCells = Array.from(headerHead.querySelectorAll('th'));
    sourceCells.forEach((cell, index) => {
        const width = cell.getBoundingClientRect().width;
        const clone = floatingCells[index];
        if (!clone) return;
        clone.style.width = width + 'px';
        clone.style.minWidth = width + 'px';
        clone.style.maxWidth = width + 'px';
        clone.style.background = '#171717';
    });

    const update = () => {
        const section = document.getElementById('schedule-section');
        const rect = wrapper.getBoundingClientRect();
        const headerHeight = thead.getBoundingClientRect().height;
        const isActive = section && section.classList.contains('active');
        const shouldShow = isActive && rect.top < 0 && rect.bottom > headerHeight;

        floating.style.display = shouldShow ? 'block' : 'none';
        if (!shouldShow) return;

        floating.style.left = rect.left + 'px';
        floating.style.width = rect.width + 'px';
        headerTable.style.transform = `translateX(${-wrapper.scrollLeft}px)`;
        if (floatingCells[0]) {
            floatingCells[0].style.position = 'relative';
            floatingCells[0].style.zIndex = '2';
            floatingCells[0].style.transform = `translateX(${wrapper.scrollLeft}px)`;
        }
    };

    window._scheduleFloatingHeaderUpdate = update;
    if (!window._scheduleFloatingHeaderListenersAdded) {
        window.addEventListener('scroll', () => {
            if (window._scheduleFloatingHeaderUpdate) window._scheduleFloatingHeaderUpdate();
        }, { passive: true });
        window.addEventListener('resize', () => setupScheduleFloatingHeader());
        document.addEventListener('click', () => {
            setTimeout(() => {
                if (window._scheduleFloatingHeaderUpdate) window._scheduleFloatingHeaderUpdate();
            }, 0);
        });
        window._scheduleFloatingHeaderListenersAdded = true;
    }
    if (!wrapper.dataset.floatingHeaderSynced) {
        wrapper.addEventListener('scroll', () => {
            if (window._scheduleFloatingHeaderUpdate) window._scheduleFloatingHeaderUpdate();
        }, { passive: true });
        wrapper.dataset.floatingHeaderSynced = 'true';
    }
    update();
}

// ==== CONTEXT MENU ====
window.showContextMenu = function(e, date, location, masterName) {
    e.preventDefault(); e.stopPropagation();
    closeTimePicker();
    const menu = document.getElementById('sched-context-menu');
    menu.style.position = 'fixed';
    menu.style.display = 'block';
    menu.style.left = Math.min(e.clientX, window.innerWidth  - 220) + 'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight - 200) + 'px';

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
    const menuLeft = parseInt(document.getElementById('sched-context-menu').style.left) || 0;
    const menuTop  = parseInt(document.getElementById('sched-context-menu').style.top)  || 0;
    picker.style.position = 'fixed';
    picker.style.display = 'block';
    picker.style.left = Math.min(menuLeft + 180, window.innerWidth  - 160) + 'px';
    picker.style.top  = menuTop + 'px';
};

window.showRowTimePicker = function(e, loc, master) {
    e.stopPropagation();
    closeContextMenu();
    const picker = document.getElementById('time-picker');
    picker.style.position = 'fixed';
    picker.style.display = 'block';
    picker.style.left = Math.min(e.clientX, window.innerWidth  - 160) + 'px';
    picker.style.top  = Math.min(e.clientY, window.innerHeight - 180) + 'px';
    currentContextCell       = { isRow: true, loc, master };
    pendingReplacementMaster = null;
};

window.showTimePicker = function(e, cell) {
    e.stopPropagation();
    closeContextMenu();
    const picker = document.getElementById('time-picker');
    picker.style.position = 'fixed';
    picker.style.display = 'block';
    picker.style.left = Math.min(e.clientX, window.innerWidth  - 160) + 'px';
    picker.style.top  = Math.min(e.clientY, window.innerHeight - 180) + 'px';
    currentContextCell       = { el: cell };
    pendingReplacementMaster = null;
};

window.applyTime = function(timeText) {
    if (!currentContextCell) { closeTimePicker(); closeContextMenu(); return; }
    timeText = normalizeScheduleText(timeText);

    if (currentContextCell.isRow) {
        const selector = `.sched-cell[data-loc="${currentContextCell.loc}"][data-master="${currentContextCell.master}"]`;
        document.querySelectorAll(selector).forEach(cell => {
            cell.innerText = timeText;
            if (isScheduleOffDay(timeText)) cell.classList.remove('work', 'replacement');
            else { cell.classList.add('work'); cell.classList.remove('replacement'); }
        });
    } else {
        let finalVal = timeText;
        if (pendingReplacementMaster) {
            finalVal = pendingReplacementMaster + ' (' + timeText + ') (ЗАМЕНА)';
            currentContextCell.el.classList.add('replacement');
        }
        currentContextCell.el.innerText = finalVal;
        if (isScheduleOffDay(timeText)) currentContextCell.el.classList.remove('work', 'replacement');
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
                    val = normalizeScheduleText(masterData.text || (masterData.startTime === '10:00' ? 'С 10 до 22' : (masterData.startTime === '09:00' ? 'С 09 до 22' : 'раб')));
                    if (!isScheduleOffDay(val)) {
                        cls = 'work';
                        if (masterData.isReplacement) cls += ' replacement';
                    }
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
    tbody.querySelectorAll('.sched-cell').forEach(cell => {
        cell.dataset.originalText = cell.innerText.trim();
    });

    // Sync top scrollbar
    setTimeout(() => {
        const tScroll  = document.querySelector('.sched-top-scroll');
        const tDummy   = document.querySelector('.sched-top-dummy');
        const wrapper  = document.querySelector('.sched-table-wrapper');
        const table    = document.querySelector('.sched-table');
        const isTouchSchedule = window.matchMedia && window.matchMedia('(max-width: 600px), (pointer: coarse)').matches;
        if (tDummy && table) tDummy.style.width = table.scrollWidth + 'px';
        if (tScroll) tScroll.style.display = isTouchSchedule ? 'none' : '';
        if (tScroll && wrapper && !tScroll.dataset.synced) {
            const isTouchSchedule = () => window.matchMedia && window.matchMedia('(max-width: 600px), (pointer: coarse)').matches;
            tScroll.addEventListener('scroll', () => { if (!isTouchSchedule()) wrapper.scrollLeft = tScroll.scrollLeft; });
            wrapper.addEventListener('scroll', () => { if (!isTouchSchedule()) tScroll.scrollLeft = wrapper.scrollLeft; });
            tScroll.dataset.synced = 'true';
        }
        setupScheduleFloatingHeader();
    }, 50);
}

// ==== SAVE SCHEDULE ====
async function saveScheduleAll() {
    const btn          = document.querySelector('#schedule-section .btn-submit');
    const originalText = btn.innerText;
    btn.innerText = '⌛ Сохранение...'; btn.disabled = true;

    const cells = Array.from(document.querySelectorAll('#schedule-section .sched-cell'));
    const changedKeys = new Set(cells
        .filter(cell => cell.innerText.trim() !== String(cell.dataset.originalText || ''))
        .map(cell => `${cell.dataset.date}|${cell.dataset.loc}`));
    if (!changedKeys.size) {
        btn.innerText = originalText;
        btn.disabled = false;
        if (typeof showToast === 'function') showToast('В графике нет изменений', 'info');
        return;
    }

    const gridData = {};
    cells.forEach(cell => {
        const date   = cell.dataset.date;
        const loc    = cell.dataset.loc;
        const master = cell.dataset.master;
        const text   = cell.innerText.trim();
        const key    = `${date}|${loc}`;
        if (!changedKeys.has(key)) return;
        if (!gridData[key]) gridData[key] = [];
        if (!text || isScheduleOffDay(text)) return;

        if (master === 'NEW') {
            text.split(',').forEach(m => {
                gridData[key].push({ name: m.replace('(ЗАМЕНА)', '').trim(), isReplacement: true, startTime: '10:00', text: m.trim() });
            });
        } else {
            // Извлекаем реальное время начала из текста ячейки
            let parsedStart = '10:00';
            const timeMatch = text.match(/(\d{1,2})\s*(?:до|-)\s*\d{1,2}/);
            if (timeMatch) {
                parsedStart = timeMatch[1].padStart(2, '0') + ':00';
            } else if (/^\d{1,2}:\d{2}/.test(text)) {
                parsedStart = text.match(/^(\d{1,2}:\d{2})/)[1];
            }
            gridData[key].push({
                name: master,
                isReplacement: text.includes('(ЗАМЕНА)'),
                startTime: parsedStart,
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
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(result.error || 'Ошибка сохранения графика');
        cells.filter(cell => changedKeys.has(`${cell.dataset.date}|${cell.dataset.loc}`)).forEach(cell => {
            cell.dataset.originalText = cell.innerText.trim();
        });
        btn.innerText = '✅ Сохранено';
        setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
        // Обновляем вкладку опозданий чтобы подтянулся новый график
        if (typeof loadLatesHistory === 'function') setTimeout(loadLatesHistory, 500);
    } catch (e) {
        showToast(e.message || 'Ошибка сохранения', 'error');
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
