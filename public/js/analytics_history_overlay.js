(function() {
    const HISTORY_URL = './analytics_history.json';
    const TYPE_TO_METRIC = {
        returns: 'returnRate',
        intervals: 'cycle',
        appointments: 'appointments',
        occupancy: 'occupancy',
        ovn: 'ovnQuality'
    };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function latest(metricKey) {
        const metric = window.ANALYTICS_HISTORY && window.ANALYTICS_HISTORY.metrics
            ? window.ANALYTICS_HISTORY.metrics[metricKey]
            : null;
        const months = metric && Array.isArray(metric.months) ? metric.months : [];
        return months.length ? months[months.length - 1] : null;
    }

    function metricMonths(metricKey) {
        const metric = window.ANALYTICS_HISTORY && window.ANALYTICS_HISTORY.metrics
            ? window.ANALYTICS_HISTORY.metrics[metricKey]
            : null;
        return metric && Array.isArray(metric.months) ? metric.months : [];
    }

    function valueText(metricKey, item) {
        if (!item) return '-';
        if (item.cardValue) return item.cardValue;
        if (metricKey === 'returnRate') return `${item.value || 0}%`;
        if (metricKey === 'cycle') return `${item.value || 0}д`;
        if (metricKey === 'appointments') return `${item.percentage || item.value || 0}%`;
        if (metricKey === 'occupancy') return `${item.value || 0}`;
        if (metricKey === 'ovnQuality') return `${item.value || 0}% (${item.passed || 0}/${item.total || 0})`;
        return String(item.value || item.percentage || '-');
    }

    function detailsText(metricKey, item) {
        if (!item) return '';
        if (item.cardDetail) return item.cardDetail;
        if (metricKey === 'returnRate') return item.cohortLabel || (item.drilldown && item.drilldown[0] ? item.drilldown[0].value : '');
        if (metricKey === 'cycle') return item.sampleSize ? `${item.sampleSize} пар визитов` : 'Медиана дней между визитами';
        if (metricKey === 'appointments') return item.onlineRecords != null && item.totalServices != null
            ? `${item.onlineRecords} онлайн / ${item.totalServices} услуг`
            : (item.drilldown && item.drilldown[0] ? item.drilldown[0].value : '');
        if (metricKey === 'occupancy') return item.activeDays ? `${item.activeDays} рабочих дней` : 'Ср. чеков в раб. день (>2)';
        if (metricKey === 'ovnQuality') return `${item.passed || 0} без замечаний из ${item.total || 0}`;
        return '';
    }

    function setCard(index, value, subtext) {
        const card = document.querySelector(`#analytics-section .metrics-grid .card:nth-child(${index})`);
        if (!card) return;
        const valueEl = card.querySelector('.card-value');
        const subEl = card.querySelector('.card-subtext');
        if (valueEl) valueEl.innerText = value;
        if (subEl) subEl.innerText = subtext;
    }

    function applyCards() {
        const rr = latest('returnRate');
        if (rr) {
            setCard(2, valueText('returnRate', rr), `${rr.period || rr.label || ''} | ${detailsText('returnRate', rr)}`);
            if (window.DASH_DATA) window.DASH_DATA.returnRate = rr;
        }

        const cycle = latest('cycle');
        if (cycle) {
            setCard(3, valueText('cycle', cycle), `${cycle.period || cycle.label || ''} | Медиана дней между визитами`);
            if (window.DASH_DATA) window.DASH_DATA.cycle = cycle;
        }

        const appointments = latest('appointments');
        if (appointments) {
            setCard(4, valueText('appointments', appointments), `${appointments.period || appointments.label || ''} | ${detailsText('appointments', appointments)}`);
            if (window.DASH_DATA) window.DASH_DATA.appointments = appointments;
        }

        const occupancy = latest('occupancy');
        if (occupancy) {
            setCard(5, valueText('occupancy', occupancy), `${occupancy.period || occupancy.label || ''} | Ср. чеков в раб. день (>2)`);
            if (window.DASH_DATA) window.DASH_DATA.occupancy = occupancy;
        }

        const ovn = latest('ovnQuality');
        if (ovn) {
            const valueEl = document.getElementById('card-ovn-runrate');
            const subEl = document.getElementById('card-ovn-subtext');
            if (valueEl) valueEl.innerText = `${ovn.value || 0}%`;
            if (subEl) subEl.innerText = `${ovn.period || ovn.label || ''} | ${ovn.passed || 0} из ${ovn.total || 0} без замечаний`;
            window.OVN_DRILLDOWN = ovn.drilldown || window.OVN_DRILLDOWN;
            window.OVN_TOPS = ovn.tops || window.OVN_TOPS;
        }
    }

    async function loadHistory() {
        try {
            const res = await fetch(`${HISTORY_URL}?v=${Date.now()}`);
            if (!res.ok) return null;
            window.ANALYTICS_HISTORY = await res.json();
            applyCards();
            return window.ANALYTICS_HISTORY;
        } catch (e) {
            console.warn('[AnalyticsHistory] load failed:', e);
            return null;
        }
    }

    function renderJournal(metricKey) {
        const months = metricMonths(metricKey);
        if (!months.length) return '';
        const rows = months.slice().reverse().map(item => `
            <tr>
                <td>${esc(item.label || item.key || '-')}</td>
                <td style="font-weight:800;color:var(--accent);">${esc(valueText(metricKey, item))}</td>
            </tr>
        `).join('');

        return `
            <tbody data-analytics-history-journal="1">
                <tr><td colspan="3" style="padding:0 0 24px;border-bottom:none;">
                    <details style="background:rgba(255,255,255,0.03);border:1px solid var(--card-border);border-radius:16px;padding:0;overflow:hidden;">
                        <summary style="display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;padding:18px;font-size:12px;color:var(--text-muted);text-transform:uppercase;font-weight:800;list-style:none;">
                            <span>Исторические данные</span>
                            <span style="color:var(--accent);font-size:11px;">12 месяцев</span>
                        </summary>
                        <div style="padding:0 18px 18px;overflow-x:auto;">
                            <table>
                                <thead><tr><th>Месяц</th><th>Показатель</th></tr></thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </details>
                </td></tr>
            </tbody>
        `;
    }

    function prependJournal(type) {
        const metricKey = TYPE_TO_METRIC[type];
        if (!metricKey) return;
        const table = document.getElementById('drilldown-table');
        if (!table) return;
        const html = renderJournal(metricKey);
        if (!html) return;
        table.querySelector('[data-analytics-history-journal="1"]')?.remove();
        table.insertAdjacentHTML('afterbegin', html);
    }

    function patchLoadData() {
        const original = window.loadData;
        if (typeof original !== 'function' || original.__historyPatched) return;
        window.loadData = async function() {
            const result = await original.apply(this, arguments);
            await loadHistory();
            return result;
        };
        window.loadData.__historyPatched = true;
    }

    function patchDrilldown() {
        const original = window.toggleDrilldown;
        if (typeof original !== 'function' || original.__historyPatched) return;
        window.toggleDrilldown = function(type) {
            const result = original.apply(this, arguments);
            prependJournal(type);
            return result;
        };
        window.toggleDrilldown.__historyPatched = true;
    }

    function patchOvnStartupLoad() {
        const original = window.loadOVNHistory;
        if (typeof original !== 'function' || original.__historyPatched) return;
        window.loadOVNHistory = function() {
            const ovnSection = document.getElementById('ovn-section');
            const isOvnActive = window.location.hash === '#ovn' || (ovnSection && ovnSection.classList.contains('active'));
            if (!isOvnActive) {
                const ovn = latest('ovnQuality');
                if (ovn) {
                    window.OVN_DRILLDOWN = ovn.drilldown || window.OVN_DRILLDOWN;
                    window.OVN_TOPS = ovn.tops || window.OVN_TOPS;
                }
                return Promise.resolve();
            }
            return original.apply(this, arguments);
        };
        window.loadOVNHistory.__historyPatched = true;
    }

    patchLoadData();
    patchDrilldown();
    patchOvnStartupLoad();
    window.loadAnalyticsHistory = loadHistory;
})();
