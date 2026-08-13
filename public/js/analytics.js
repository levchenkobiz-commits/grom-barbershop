/**
 * FINANCIAL UI — salary/fines/zones are protected by /root/grom-dashboard/AGENTS.md.
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
        function applyWarn(labelPart, hasErr, msg) {
            const el = findAnalyticsCard(labelPart);
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
        function findAnalyticsCard(labelPart) {
            const query = String(labelPart || '').toLowerCase();
            return Array.from(document.querySelectorAll('#analytics-section .metrics-grid .card'))
                .find(card => {
                    const label = card.querySelector('.card-label');
                    return label && label.innerText.toLowerCase().includes(query);
                });
        }
        const ovnCard = document.getElementById('card-ovn-runrate')?.closest('.card');
        if (ovnCard && !ovnCard.dataset.ovnDrilldownBound) {
            ovnCard.dataset.ovnDrilldownBound = '1';
            ovnCard.style.cursor = 'pointer';
            ovnCard.addEventListener('click', () => {
                if (typeof window.toggleDrilldown === 'function') window.toggleDrilldown('ovn');
            });
        }
        applyWarn('рост квартала', errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn('return rate', errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn('цикл визита', errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');
        applyWarn('онл-запис', errs.yclients || errs.elkassa || errs.general, 'Ошибка ответа YCLIENTS или El.Kassa');
        applyWarn('заполняемость', errs.elkassa || errs.general, 'Ошибка соед. с El.Kassa/базой');

        let nowStr = data.lastUpdate;
        if (!nowStr) nowStr = dayjs().format('HH:mm DD.MM.YYYY');
        const now      = dayjs(nowStr, 'HH:mm DD.MM.YYYY');
        let startStr   = 'Начало кв.';
        let endStr     = '----';
        try { endStr = now.format('DD.MM'); startStr = now.startOf('quarter').format('DD.MM'); } catch(e) {}

        if (data.revenue) {
            try {
                const revCard  = document.querySelector('#analytics-section .metrics-grid .card:nth-child(1)');
                if (data.revenue.noData) {
                    revCard.querySelector('.card-value').innerText = '—';
                    revCard.querySelector('.card-subtext').innerText = (data.revenue.period ? data.revenue.period + ' | ' : '') + (data.revenue.reason || 'Нет сопоставимого полного периода');
                } else {
                    const growthVal = data.revenue.growth || 0;
                    revCard.querySelector('.card-value').innerText = (growthVal >= 0 ? '+' : '') + growthVal + '%';
                    const curRev  = data.revenue.current  ? data.revenue.current.toLocaleString()  : '0';
                    const prevRev = data.revenue.previous ? data.revenue.previous.toLocaleString() : '0';
                    revCard.querySelector('.card-subtext').innerText = (data.revenue.period ? data.revenue.period + ' | ' : `${startStr}-${endStr} | `) + `(${curRev} vs ${prevRev} ₽)`;
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
                    cycleCard.querySelector('.card-subtext').innerText = (data.cycle.period ? data.cycle.period + ' | ' : '') + '120 дней · ≥3 визита · медиана';
                }
            } catch(e) {}
        }

        if (data.appointments) {
            try {
                const apptCard = findAnalyticsCard('онл-запис');
                if (apptCard) {
                    apptCard.querySelector('.card-value').innerText = (data.appointments.percentage || 0) + '%';
                    const numerator = data.appointments.onlineRecords;
                    const denominator = data.appointments.totalServices;
                    apptCard.querySelector('.card-subtext').innerText = (data.appointments.period ? data.appointments.period + ' | ' : '')
                        + (Number.isFinite(numerator) && Number.isFinite(denominator)
                            ? `${numerator} / ${denominator} записей / услуг`
                            : 'Записи от общего числа услуг');
                }
            } catch(e) {}
        }

        if (data.occupancy) {
            try {
                const occCard = findAnalyticsCard('заполняемость');
                if (occCard) {
                    occCard.querySelector('.card-value').innerText = (data.occupancy.value || 0);
                    occCard.querySelector('.card-subtext').innerText = (data.occupancy.period ? data.occupancy.period + ' | ' : '') + 'Ср. чеков в раб. день (>2)';
                }
            } catch(e) {}
        }

        if (data.latenessRate) {
            try {
                const valueEl = document.getElementById('card-lateness-rate');
                const subEl = document.getElementById('card-lateness-subtext');
                if (valueEl) valueEl.innerText = data.latenessRate.noData ? '—' : data.latenessRate.value + '%';
                if (subEl) subEl.innerText = data.latenessRate.noData
                    ? 'Нет проверок прихода за период'
                    : `${data.latenessRate.period || 'MTD'} | ${data.latenessRate.late} из ${data.latenessRate.total} с опозданием`;
            } catch(e) {}
        }

        try { updateMasterCabinet(data); } catch(e) {}
        window.DASH_DATA = data;

    } catch(e) {
        console.error('[Analytics] renderData error:', e);
    }
}

// ==== MASTER CABINET UPDATE ====
function getMasterCabinetViolationPeriod() {
    const start = dayjs().startOf('isoWeek');
    const end   = dayjs();
    return { start, end };
}

function getMasterCabinetCanonicalName(name) {
    return typeof window.getAdapterMasterCanonical === 'function'
        ? window.getAdapterMasterCanonical(name)
        : null;
}

function isSameMasterForCabinet(left, right) {
    const a = getMasterCabinetCanonicalName(left);
    const b = getMasterCabinetCanonicalName(right);
    if (!a || !b) return false;
    return a === b;
}

function getMasterCabinetAdapterRecord(name) {
    if (typeof ADAPTER === 'undefined') return null;
    for (const [location, branch] of Object.entries(ADAPTER || {})) {
        for (const master of (branch.masters || [])) {
            const aliases = [master.dash, ...(master.el_kassa || [])];
            if (aliases.some(alias => isSameMasterForCabinet(name, alias))) {
                return { ...master, location };
            }
        }
    }
    return null;
}

function renderMasterTopStatus(masterName) {
    const badge = document.getElementById('master-top-badge');
    if (!badge) return;
    const master = getMasterCabinetAdapterRecord(masterName);
    badge.hidden = !(master && master.topMaster === true);
}

function getMasterCabinetReportDate(report) {
    const d = dayjs(report.date || report.createdAt);
    return d.isValid() ? d : null;
}

function isMasterCabinetOvnViolation(report) {
    const text = String((report && report.violation) || '').toLowerCase();
    if (!text) return false;
    if (text.includes('замечаний нет') || text.includes('✅')) return false;
    if (typeof window.isZoneExcludedViolation === 'function' ? window.isZoneExcludedViolation(text) : (text.includes('опоздал') || text.includes('отказ клиенту'))) return false;
    if (report && report.isManualFine) return false;
    return true;
}

function getMasterCabinetWeeklyViolations(reports) {
    const period = getMasterCabinetViolationPeriod();
    return (reports || [])
        .filter(isMasterCabinetOvnViolation)
        .filter(r => {
            const d = getMasterCabinetReportDate(r);
            return d && !d.isBefore(period.start, 'day') && !d.isAfter(period.end, 'day');
        })
        .sort((a, b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
}

async function updateMasterCabinet(data) {
    if (window.HANDBOOK_READY) await window.HANDBOOK_READY;
    ensureMasterCabinetUi();
    const myName = window.CURRENT_MASTER || 'Шохназар Д.';
    const myCanonicalName = getMasterCabinetCanonicalName(myName);
    renderMasterTopStatus(myName);

    // Occupancy
    let myOcc = '0';
    if (data.occupancy && data.occupancy.drilldown && data.occupancy.drilldown[0]) {
        const occObj = data.occupancy.drilldown[0].masters.find(m => isSameMasterForCabinet(m.name, myCanonicalName));
        if (occObj) myOcc = occObj.v;
    }
    const occEl = document.getElementById('master-occupancy');
    if (occEl) occEl.innerText = myOcc;

    // Return Rate
    let myRr = 0;
    if (data.returnRate && data.returnRate.drilldown && data.returnRate.drilldown[0]) {
        const rrObj = data.returnRate.drilldown[0].masters.find(m => isSameMasterForCabinet(m.name, myCanonicalName));
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
        rrEl.style.color = myRr > 0 ? '#34C759' : '#fff';
        rrSubEl.innerText = 'Личная возвращаемость клиентов';
    }

    // OVN Fetch
    let ovnList = [];
    try {
        const fetchRes = await fetch('/api/ovn');
        if (fetchRes.ok) {
            ovnList = await fetchRes.json();
            const myChecks = ovnList.filter(o => isSameMasterForCabinet(myCanonicalName, o.barber));
            const weeklyViolations = getMasterCabinetWeeklyViolations(myChecks);
            renderMasterViolationJournal(weeklyViolations);
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
            const myFines  = allFines[myCanonicalName] || allFines[myName];
            if (myFines) {
                const wvEl  = document.getElementById('master-week-violations');
                const tfEl  = document.getElementById('master-total-fines');
                const zbEl  = document.getElementById('master-zone-badge');
                const myChecks = ovnList.filter(o => isSameMasterForCabinet(myCanonicalName, o.barber));
                if (wvEl) wvEl.innerText = getMasterCabinetWeeklyViolations(myChecks).length;
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
        const ycObj = data.appointments.drilldown[0].masters.find(m => isSameMasterForCabinet(m.name, myCanonicalName));
        if (ycObj) myYc = ycObj.v;
    }
    const ycEl = document.getElementById('master-yc-percent');
    if (ycEl) ycEl.innerText = myYc;
    if (typeof window.updateMasterWeeklySalary === 'function') window.updateMasterWeeklySalary();
}

function ensureMasterCabinetUi() {
    const section = document.getElementById('master-cabinet-section');
    if (!section) return;
    if (!document.getElementById('master-top-style')) {
        const style = document.createElement('style');
        style.id = 'master-top-style';
        style.textContent = `
            @keyframes topMasterStarPulse {
                0%, 100% { transform: scale(1) rotate(-5deg); filter: drop-shadow(0 0 5px rgba(255,213,74,.65)); }
                50% { transform: scale(1.2) rotate(5deg); filter: drop-shadow(0 0 14px rgba(255,244,166,1)); }
            }
            @keyframes topMasterBadgeShine {
                0% { background-position: 180% 50%; box-shadow: 0 0 8px rgba(255,213,74,.25); }
                50% { box-shadow: 0 0 24px rgba(255,213,74,.65), inset 0 0 15px rgba(255,255,255,.14); }
                100% { background-position: -80% 50%; box-shadow: 0 0 8px rgba(255,213,74,.25); }
            }
            #master-top-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-left: 14px;
                padding: 7px 13px;
                border: 1px solid rgba(255,213,74,.72);
                border-radius: 999px;
                color: #FFF2A8;
                background: linear-gradient(110deg, rgba(87,57,0,.55) 20%, rgba(255,224,100,.28) 42%, rgba(87,57,0,.55) 64%);
                background-size: 260% 100%;
                font-size: 12px;
                font-weight: 900;
                letter-spacing: .8px;
                vertical-align: middle;
                animation: topMasterBadgeShine 2.4s linear infinite;
            }
            #master-top-badge[hidden] { display: none; }
            #master-top-badge .top-master-star {
                color: #FFD54A;
                font-size: 20px;
                line-height: 1;
                animation: topMasterStarPulse 1.35s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
    const title = section.querySelector('.section-title');
    if (title && !document.getElementById('master-top-badge')) {
        title.insertAdjacentHTML('beforeend',
            '<span id="master-top-badge" hidden aria-label="Топ мастер"><span class="top-master-star">★</span> ТОП МАСТЕР</span>');
    }
    const cards = section.querySelectorAll('.metrics-grid .card');
    if (cards[0]) {
        cards[0].removeAttribute('onclick');
        cards[0].style.cursor = 'default';
        const sub = cards[0].querySelector('.card-subtext');
        if (sub) sub.textContent = 'Только ваши рабочие дни';
    }
    if (cards[1]) {
        cards[1].removeAttribute('onclick');
        cards[1].style.cursor = 'default';
        const sub = cards[1].querySelector('.card-subtext');
        if (sub && sub.textContent === 'Нет проверок') sub.textContent = 'Только ваши проверки';
    }

    const grid = section.querySelector('.metrics-grid');
    if (grid && !document.getElementById('master-week-salary')) {
        const salaryCard = document.createElement('div');
        salaryCard.className = 'card';
        salaryCard.style.cursor = 'default';
        salaryCard.innerHTML = `
            <div class="card-label">ЗАРПЛАТА ЗА ЭТУ НЕДЕЛЮ</div>
            <div class="card-value" id="master-week-salary">0 ₽</div>
            <div class="card-subtext" id="master-week-salary-sub" style="text-transform:none">По завершённым дням</div>`;
        grid.appendChild(salaryCard);
    }

    if (!document.getElementById('master-violation-journal')) {
        const journal = document.createElement('div');
        journal.style.cssText = 'margin-top:30px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:24px;padding:25px;overflow-x:auto;';
        journal.innerHTML = `
            <h3 style="font-size:18px;font-weight:700;margin:0 0 18px;">Мои нарушения</h3>
            <table class="journal-table">
                <thead><tr><th>Нарушение</th><th>Время</th></tr></thead>
                <tbody id="master-violation-journal">
                    <tr><td colspan="2" style="text-align:center;padding:30px;color:var(--text-muted)">Загрузка...</td></tr>
                </tbody>
            </table>`;
        const scheduleBlock = document.getElementById('master-sched-container');
        const scheduleCard = scheduleBlock ? scheduleBlock.closest('div[style*="margin-top:30px"]') : null;
        section.insertBefore(journal, scheduleCard || null);
    }
}

function renderMasterViolationJournal(reports) {
    const tbody = document.getElementById('master-violation-journal');
    if (!tbody) return;
    const period = getMasterCabinetViolationPeriod();
    const violations = (reports || [])
        .filter(r => {
            const created = getMasterCabinetReportDate(r);
            return created
                && !created.isBefore(period.start, 'day')
                && !created.isAfter(period.end, 'day')
                && isMasterCabinetOvnViolation(r);
        })
        .sort((a, b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
    tbody.innerHTML = violations.length ? violations.map(r => `
        <tr>
            <td data-label="НАРУШЕНИЕ"><span class="badge-status badge-no">${r.violation}</span></td>
            <td data-label="ВРЕМЯ">${dayjs(r.date || r.createdAt).format('DD.MM')}</td>
        </tr>`).join('')
        : '<tr><td colspan="2" style="text-align:center;padding:30px;color:var(--text-muted)">За прошлую неделю нарушений нет</td></tr>';
}

// ==== DRILLDOWN ====
window.toggleDrilldown = function(type) {
    if (window.AnalyticsExplorer && typeof window.AnalyticsExplorer.open === 'function') {
        return window.AnalyticsExplorer.open(type);
    }
    console.error('[Analytics] detail explorer is unavailable');
};

// ==== DATA LOADING ====
async function loadData() {
    try {
        const res = await fetch(`/api/data?v=${Date.now()}`);
        if (res.ok) {
            const data = await res.json();
            if (!data) return;
            window.dashboardData = data;
            renderData(data);
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
