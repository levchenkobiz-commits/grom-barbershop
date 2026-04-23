/**
 * public/js/analytics.js
 * =====================================================
 * Модуль Аналитики.
 *
 * Содержит:
 *  - renderData (заполняет карточки на вкладке Analytics)
 *  - updateMasterCabinet (метрики мастера)
 *  - toggleDrilldown (детализация по типу)
 *  - loadData / triggerSync / triggerSyncModule
 *
 * Зависимости: config.js, fines.js (calculateFines)
 */

// ==== RENDER ANALYTICS CARDS ====
function renderData(data) {
    try {
        const errs = data.errors || {};
        function applyWarn(cellIndex, hasErr, msg) {
            const el = document.querySelector(`#analytics-section .metrics-grid .card:nth-child(${cellIndex})`);
            if (!el) return;
            let w = el.querySelector('.err-warn');
            if (hasErr) {
                if (!w) {
                    el.style.position = 'relative';
                    el.insertAdjacentHTML('beforeend',
                        `<div class="err-warn" style="position:absolute;top:10px;right:12px;font-size:16px;cursor:help;z-index:10;" title="${msg}">⚠️</div>`);
                }
            } else if (w) { w.remove(); }
        }
        applyWarn(1, errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn(2, errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn(3, errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn(4, errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn(5, errs.yclients || errs.elkassa || errs.general, 'Ошибка ответа YCLIENTS или El.Kassa');
        applyWarn(6, errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');

        let nowStr = data.lastUpdate;
        if (!nowStr) nowStr = dayjs().format('HH:mm DD.MM.YYYY');
        const now      = dayjs(nowStr, 'HH:mm DD.MM.YYYY');
        let startStr   = 'Начало кв.';
        let endStr     = '----';
        try { endStr = now.format('DD.MM'); startStr = now.startOf('quarter').format('DD.MM'); } catch(e) {}

        if (data.revenue) {
            try {
                const revCard  = document.querySelector('#analytics-section .metrics-grid .card:nth-child(1)');
                const growthVal = data.revenue.growth || 0;
                revCard.querySelector('.card-value').innerText = (growthVal >= 0 ? '+' : '') + growthVal + '%';
                const curRev  = data.revenue.current  ? data.revenue.current.toLocaleString()  : '0';
                const prevRev = data.revenue.previous ? data.revenue.previous.toLocaleString() : '0';
                revCard.querySelector('.card-subtext').innerText = (data.revenue.period ? data.revenue.period + ' | ' : `${startStr}-${endStr} | `) + `(${curRev} vs ${prevRev} ₽)`;
            } catch(e) {}
            try {
                const todayCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(4)');
                if (todayCard) {
                    todayCard.querySelector('.card-value').innerText = (data.revenue.today || 0).toLocaleString() + ' ₽';
                    todayCard.querySelector('.card-subtext').innerText = 'Сегодня | Чистая (без бонусов)';
                }
            } catch(e) {}
        }

        if (data.returnRate) {
            try {
                const rrCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(2)');
                rrCard.querySelector('.card-value').innerText = (data.returnRate.value || 0) + '%';
                if (data.returnRate.drilldown && data.returnRate.drilldown[0]) {
                    rrCard.querySelector('.card-subtext').innerText = (data.returnRate.period ? data.returnRate.period + ' | ' : '') + data.returnRate.drilldown[0].value;
                } else {
                    rrCard.querySelector('.card-subtext').innerText = (data.returnRate.period ? data.returnRate.period + ' | ' : '') + 'Когорта 64-32 дня';
                }
            } catch(e) {}
        }

        if (data.cycle) {
            try {
                const cycleCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(3)');
                if (cycleCard) {
                    cycleCard.querySelector('.card-value').innerText = (data.cycle.value || 0) + 'д';
                    cycleCard.querySelector('.card-subtext').innerText = (data.cycle.period ? data.cycle.period + ' | ' : '') + 'Дней между стрижками';
                }
            } catch(e) {}
        }

        if (data.appointments) {
            try {
                const apptCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(5)');
                if (apptCard) {
                    apptCard.querySelector('.card-value').innerText = (data.appointments.percentage || 0) + '%';
                    apptCard.querySelector('.card-subtext').innerText = (data.appointments.period ? data.appointments.period + ' | ' : '') + 'Записи от общего числа услуг';
                }
            } catch(e) {}
        }

        if (data.occupancy) {
            try {
                const occCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(6)');
                if (occCard) {
                    occCard.querySelector('.card-value').innerText = (data.occupancy.value || 0);
                    occCard.querySelector('.card-subtext').innerText = (data.occupancy.period ? data.occupancy.period + ' | ' : '') + 'Ср. чеков в раб. день (>2)';
                }
            } catch(e) {}
        }

        try { updateMasterCabinet(data); } catch(e) {}
        window.DASH_DATA = data;

    } catch(e) {
        console.error('[Analytics] renderData error:', e);
    }
}

// ==== MASTER CABINET UPDATE ====
async function updateMasterCabinet(data) {
    const myName = window.CURRENT_MASTER || 'Шохназар Д.';

    // Occupancy
    let myOcc = '0';
    if (data.occupancy && data.occupancy.drilldown && data.occupancy.drilldown[0]) {
        const occObj = data.occupancy.drilldown[0].masters.find(m => m.name === myName);
        if (occObj) myOcc = occObj.v;
    }
    const occEl = document.getElementById('master-occupancy');
    if (occEl) occEl.innerText = myOcc;

    // Return Rate
    let myRr = 0;
    if (data.returnRate && data.returnRate.drilldown && data.returnRate.drilldown[0]) {
        const rrObj = data.returnRate.drilldown[0].masters.find(m => m.name === myName);
        if (rrObj) {
            myRr = parseFloat(rrObj.v);
            const rrEl = document.getElementById('master-rr');
            if (rrEl) rrEl.innerText = myRr.toFixed(1) + '%';
            const parts = rrObj.v.split('(');
            if (parts.length > 1) {
                const sub = parts[1].replace(')', '');
                const subEl = document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(3) .card-subtext');
                if (subEl) subEl.innerText = sub + ' вернувшихся';
            }
        }
    }

    const avgRr  = data.returnRate ? (data.returnRate.value || 0) : 0;
    const rrEl   = document.getElementById('master-rr');
    const rrSubEl = document.getElementById('master-rr-sub');
    if (rrEl && rrSubEl) {
        if (myRr >= avgRr) { rrEl.style.color = '#34C759'; rrSubEl.innerText = `Выше среднего по сети (${avgRr.toFixed(1)}%)`; }
        else               { rrEl.style.color = '#ff4444'; rrSubEl.innerText = `Ниже среднего по сети (${avgRr.toFixed(1)}%)`; }
    }

    // OVN Fetch
    let ovnList = [];
    try {
        const fetchRes = await fetch('/api/ovn');
        if (fetchRes.ok) {
            ovnList = await fetchRes.json();
            const myChecks = ovnList.filter(o => myName.startsWith(o.barber) || (o.barber && o.barber.startsWith(myName)));
            const ovnScoreEl = document.getElementById('master-ovn-score');
            const ovnSubEl   = document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(2) .card-subtext');
            if (myChecks.length > 0) {
                const passed   = myChecks.filter(r => { const v = (r.violation||'').toLowerCase(); return v.includes('замечаний нет') || v.includes('✅') || !v; }).length;
                const ovnScore = Math.round((passed / myChecks.length) * 100);
                if (ovnScoreEl) ovnScoreEl.innerText = ovnScore + '%';
                if (ovnSubEl)   ovnSubEl.innerText   = `${passed} из ${myChecks.length} проверок`;
            } else {
                if (ovnScoreEl) ovnScoreEl.innerText = '0%';
                if (ovnSubEl)   ovnSubEl.innerText   = 'Нет проверок';
            }
        }
    } catch(e) {}

    // Fines + Zone
    try {
        if (typeof calculateFines === 'function') {
            const allFines = calculateFines(ovnList);
            const myFines  = allFines[myName];
            if (myFines) {
                const wvEl  = document.getElementById('master-week-violations');
                const tfEl  = document.getElementById('master-total-fines');
                const zbEl  = document.getElementById('master-zone-badge');
                if (wvEl) wvEl.innerText = myFines.weekViolations;
                if (tfEl) tfEl.innerText = myFines.monthFines + ' ₽';
                if (zbEl) {
                    const zoneMap = {
                        Green:  { text: '🟢 ЗЕЛЕНАЯ',  color: '#34C759', bg: 'rgba(52,199,89,0.15)' },
                        Yellow: { text: '🟡 ЖЕЛТАЯ',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
                        Red:    { text: '🔴 КРАСНАЯ',  color: '#FF3B30', bg: 'rgba(255,59,48,0.15)' }
                    };
                    const z = zoneMap[myFines.state] || zoneMap.Green;
                    zbEl.innerHTML         = z.text;
                    zbEl.style.color       = z.color;
                    zbEl.style.background  = z.bg;
                }
            }
        }
    } catch(e) { console.error('[Analytics] Fines update error:', e); }

    // YClients
    let myYc = '0%';
    if (data.appointments && data.appointments.drilldown && data.appointments.drilldown[0] && Array.isArray(data.appointments.drilldown[0].masters)) {
        const ycObj = data.appointments.drilldown[0].masters.find(m => m.name === myName);
        if (ycObj) myYc = ycObj.v;
    }
    const ycEl = document.getElementById('master-yc-percent');
    if (ycEl) ycEl.innerText = myYc;
}

// ==== DRILLDOWN ====
window.toggleDrilldown = function(type) {
    const container = document.getElementById('drilldown');

    if (type === 'ovn') {
        if (!window.OVN_DRILLDOWN) return;
        container.style.display = 'block';
        document.getElementById('drilldown-title').innerText = 'Детализация: Качество ОВН (За месяц)';
        document.getElementById('drilldown-table').innerHTML = `
            <thead><tr>
                <th>Филиал / Мастер</th><th>Показатель</th><th>Тренд</th>
            </tr></thead>
            <tbody id="drilldown-body">` +
            window.OVN_DRILLDOWN.map((item, idx) => `
                <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                    <td><span class="chevron">›</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '↗' : '↘'}</td>
                </tr>
                ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
            `).join('') + `</tbody>`;
        window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        return;
    }

    if (!window.DASH_DATA) return;
    const keyMap = { revenue: 'revenue', returns: 'returnRate', intervals: 'cycle', appointments: 'appointments', occupancy: 'occupancy' };
    const data   = window.DASH_DATA[keyMap[type]];
    if (!data) return;

    const labels = { revenue: 'Выручка / Рост', returns: 'Возвращаемость (RR)', intervals: 'Цикл визита', appointments: 'Онлайн-записи', occupancy: 'Заполняемость' };
    container.style.display = 'block';
    document.getElementById('drilldown-title').innerText = 'Детализация: ' + (labels[type] || type);

    // Special RR two-tab layout
    if (type === 'returns' && data.drilldown && data.drilldown.length >= 2) {
        if (!window.switchDrillTab) {
            window.switchDrillTab = function(tabName, btn) {
                document.querySelectorAll('.drill-tab').forEach(b => { b.style.color = '#888'; b.style.borderBottom = 'none'; });
                btn.style.color = '#E8FF38'; btn.style.borderBottom = '2px solid #E8FF38';
                document.getElementById('drill-masters-body').style.display  = tabName === 'masters'  ? 'table-row-group' : 'none';
                document.getElementById('drill-branches-body').style.display = tabName === 'branches' ? 'table-row-group' : 'none';
            };
        }
        document.getElementById('drilldown-table').innerHTML = `
            <thead>
                <tr><td colspan="3" style="padding:0;border:none;">
                    <div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:15px;font-size:14px;font-weight:600;">
                        <div class="drill-tab" onclick="switchDrillTab('masters',this)" style="padding:15px 25px;cursor:pointer;color:#E8FF38;border-bottom:2px solid #E8FF38;">По мастерам</div>
                        <div class="drill-tab" onclick="switchDrillTab('branches',this)" style="padding:15px 25px;cursor:pointer;color:#888;">По филиалам</div>
                    </div>
                </td></tr>
                <tr><th>Объект детализации</th><th>Возвращаемость (RR)</th><th></th></tr>
            </thead>
            <tbody id="drill-masters-body">
                ${data.drilldown[0].masters.map((m, i) => `<tr><td>${i+1}. ${m.name}</td><td colspan="2" style="font-weight:bold;color:var(--accent);">${m.v}</td></tr>`).join('')}
            </tbody>
            <tbody id="drill-branches-body" style="display:none;">
                ${data.drilldown[1].masters.map((m, i) => `<tr><td>${i+1}. ${m.name}</td><td colspan="2" style="font-weight:bold;color:var(--accent);">${m.v}</td></tr>`).join('')}
            </tbody>
        `;
        window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        return;
    }

    // Generic drilldown
    document.getElementById('drilldown-table').innerHTML = `
        <thead><tr><th>Филиал / Мастер</th><th>Показатель</th><th>Тренд</th></tr></thead>
        <tbody id="drilldown-body">` +
        data.drilldown.map((item, idx) => `
            <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                <td><span class="chevron">›</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '↗' : '↘'}</td>
            </tr>
            ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
        `).join('') + `</tbody>`;
    window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
};

// ==== DATA LOADING ====
async function loadData() {
    try {
        const res = await fetch(`./data.json?v=${Date.now()}`);
        if (res.ok) {
            const data = await res.json();
            if (!data) return;
            window.dashboardData = data;
            renderData(data);
            try {
                const dateEl = document.getElementById('current-date');
                if (dateEl) dateEl.innerHTML = `<span style="color:#34C759">● LIVE</span> Обновлено: ${data.lastUpdate || 'только что'}`;
            } catch(e) {}
        }
    } catch (err) {
        console.error('[Analytics] loadData fetch error:', err);
    }
}

// ==== SYNC HELPERS ====
window.triggerSyncModule = async function(module, btn) {
    const spinSvg = `<svg style="animation:spin 1s linear infinite;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    if (btn) btn.innerHTML = spinSvg;
    try {
        await fetch('/api/sync', { method: 'POST', body: JSON.stringify({ module }) });
        const check = setInterval(async () => {
            try {
                const res  = await fetch('/api/sync_status');
                const data = await res.json();
                if (!data.isSyncing) {
                    clearInterval(check);
                    if (btn) {
                        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                        btn.style.color = '#34C759';
                        setTimeout(() => {
                            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg>`;
                            btn.style.color = 'var(--text-muted)';
                        }, 2000);
                    }
                    loadData();
                }
            } catch(e) {}
        }, 2000);
    } catch(e) {}
};

window.triggerSync = async function() {
    const btn = document.getElementById('refresh-btn');
    if (btn) { btn.innerHTML = '🔄 Загрузка...'; btn.disabled = true; }
    await fetch('/api/sync', { method: 'POST', body: JSON.stringify({}) });
    const check = setInterval(async () => {
        try {
            const res  = await fetch('/api/sync_status');
            const data = await res.json();
            if (!data.isSyncing) {
                clearInterval(check);
                if (btn) { btn.innerHTML = '🔄 Обновить сейчас'; btn.disabled = false; }
                loadData();
            }
        } catch(e) {}
    }, 2000);
};
