(function() {
    'use strict';

    const TYPE_CONFIG = {
        revenue:      { key: 'revenue',      history: null,              title: 'Рост квартала',       card: 1 },
        returns:      { key: 'returnRate',   history: 'returnRate',      title: 'Возвращаемость',       card: 2, defaultSort: 'value-desc' },
        intervals:    { key: 'cycle',        history: 'cycle',           title: 'Цикл визита',          card: 3, defaultSort: 'value-asc' },
        appointments: { key: 'appointments', history: 'appointments',    title: 'Онлайн-записи',        card: 4, defaultSort: 'value-desc' },
        occupancy:    { key: 'occupancy',    history: 'occupancy',       title: 'Заполняемость',        card: 5 },
        ovn:          { key: null,           history: 'ovnQuality',      title: 'Качество ОВН',         card: 6, defaultSort: 'value-desc' },
        lateness:     { key: 'latenessRate', history: 'latenessRate',    title: 'Опоздания',            card: 8, defaultSort: 'value-desc' }
    };

    const DIMENSION_LABELS = {
        branches: 'Филиалы',
        masters: 'Мастера',
        months: 'Месяцы',
        overview: 'Обзор'
    };

    const state = {
        open: false,
        loading: false,
        error: '',
        type: null,
        dimension: null,
        context: { branch: null, master: null, month: null },
        header: null,
        stack: [],
        query: '',
        sort: 'source',
        scrollY: 0,
        previousFocus: null,
        bodyStyles: null,
        dragStartY: 0,
        dragging: false,
        requestId: 0,
        pageLocked: false
    };

    let root = null;
    let sheet = null;
    let scrollEl = null;

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function cleanText(value) {
        return String(value == null ? '' : value).trim();
    }

    function capitalise(value) {
        const text = cleanText(value);
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    }

    function stripBranchDecorations(name) {
        return cleanText(name).replace(/\s*[Ⓜ️]+\s*$/u, '').trim();
    }

    function canonicalMaster(name) {
        if (typeof window.getAdapterMasterCanonical === 'function') {
            return window.getAdapterMasterCanonical(name) || cleanText(name);
        }
        return cleanText(name);
    }

    function masterLocation(name) {
        if (typeof window.getAdapterMasterLocation === 'function') {
            return window.getAdapterMasterLocation(name) || '';
        }
        return '';
    }

    function isKnownMaster(name) {
        return typeof window.isAdapterMaster !== 'function' || window.isAdapterMaster(name);
    }

    function sameMaster(left, right) {
        if (typeof window.isSameAdapterMaster === 'function') {
            return window.isSameAdapterMaster(left, right);
        }
        return cleanText(left).toLowerCase() === cleanText(right).toLowerCase();
    }

    function sameBranch(left, right) {
        return stripBranchDecorations(left).toLowerCase() === stripBranchDecorations(right).toLowerCase();
    }

    function isNetworkRow(name) {
        return /общая сеть|вся сеть/i.test(cleanText(name));
    }

    function currentData(type) {
        const config = TYPE_CONFIG[type];
        if (!config) return null;
        if (type === 'ovn') return null;
        return window.DASH_DATA ? window.DASH_DATA[config.key] : null;
    }

    function historyMonths(type) {
        const historyKey = TYPE_CONFIG[type]?.history;
        const metric = historyKey && window.ANALYTICS_HISTORY?.metrics
            ? window.ANALYTICS_HISTORY.metrics[historyKey]
            : null;
        return metric && Array.isArray(metric.months) ? metric.months : [];
    }

    function cardSnapshot(type) {
        const config = TYPE_CONFIG[type];
        const card = document.querySelector(`#analytics-section .metrics-grid > .card:nth-child(${config.card})`);
        const value = cleanText(card?.querySelector('.card-value')?.textContent) || 'Нет данных';
        const subtext = cleanText(card?.querySelector('.card-subtext')?.textContent);
        const data = currentData(type);
        let period = cleanText(data?.period);
        let secondary = subtext;
        if (subtext.includes('|')) {
            const parts = subtext.split('|');
            if (!period) period = cleanText(parts.shift());
            else parts.shift();
            secondary = cleanText(parts.join('|'));
        }
        if (type === 'ovn' && subtext.includes('|')) {
            const parts = subtext.split('|');
            period = cleanText(parts.shift());
            secondary = cleanText(parts.join('|'));
        }
        return {
            title: config.title,
            primary: value,
            secondary,
            period: period || 'Текущий период',
            context: []
        };
    }

    function splitMetric(value, raw) {
        const text = cleanText(value);
        const total = raw && raw.total != null ? Number(raw.total) : null;
        const explicitNoData = Boolean(raw?.noData) || total === 0 || /\(\s*0\s*(?:\/|из)\s*0\s*\)/i.test(text);
        if (explicitNoData) {
            return { primary: 'Нет данных', secondary: 'Наблюдений нет', noData: true };
        }

        const parenthetical = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (parenthetical) {
            return {
                primary: cleanText(parenthetical[1]),
                secondary: cleanText(parenthetical[2]).replace(/\s+из\s+/i, ' / ').replace(/\s*\/\s*/g, ' / '),
                noData: false
            };
        }
        return { primary: text || 'Нет данных', secondary: '', noData: !text };
    }

    function historyValue(type, item) {
        if (!item) return { primary: 'Нет данных', secondary: 'Наблюдений нет', noData: true };
        const key = TYPE_CONFIG[type]?.history;
        if (item.cardValue) return splitMetric(item.cardValue, item);
        if (key === 'returnRate') return splitMetric(`${item.value ?? 0}%`, item);
        if (key === 'cycle') return splitMetric(`${item.value ?? 0}д`, item);
        if (key === 'appointments') return splitMetric(`${item.percentage ?? item.value ?? 0}%`, item);
        if (key === 'occupancy') return splitMetric(`${item.value ?? 0}`, item);
        if (key === 'ovnQuality') return splitMetric(`${item.value ?? 0}% (${item.passed ?? 0}/${item.total ?? 0})`, item);
        if (key === 'latenessRate') return item.noData
            ? splitMetric('', { noData: true })
            : splitMetric(`${item.value ?? 0}% (${item.late ?? 0}/${item.total ?? 0})`, item);
        return splitMetric(item.value ?? item.percentage ?? '', item);
    }

    function historyDetail(type, item) {
        if (!item) return '';
        if (item.cardDetail) return cleanText(item.cardDetail);
        const key = TYPE_CONFIG[type]?.history;
        if (key === 'returnRate') return cleanText(item.cohortLabel || item.drilldown?.[0]?.value);
        if (key === 'cycle') {
            return item.sampleSize
                ? `${item.sampleSize} пар · ${item.eligibleCustomers || 0} клиентов (3+)`
                : '120 дней · 3+ визита · медиана';
        }
        if (key === 'appointments') {
            return item.onlineRecords != null && item.totalServices != null
                ? `${item.onlineRecords} онлайн / ${item.totalServices} услуг`
                : cleanText(item.drilldown?.[0]?.value);
        }
        if (key === 'occupancy') return item.activeDays ? `${item.activeDays} рабочих дней` : 'Ср. чеков в рабочий день';
        if (key === 'ovnQuality') return item.total === 0 ? 'Наблюдений нет' : `${item.passed || 0} без замечаний из ${item.total || 0}`;
        if (key === 'latenessRate') return item.noData ? 'Проверки прихода отсутствуют' : `${item.late} с опозданием из ${item.total}`;
        return '';
    }

    function toRow(kind, item, extras) {
        const rawValue = item?.v ?? item?.value ?? '';
        const metric = splitMetric(rawValue, item);
        return Object.assign({
            kind,
            name: cleanText(item?.name),
            primary: metric.primary,
            secondary: metric.secondary,
            noData: metric.noData,
            trend: cleanText(item?.trend),
            raw: item,
            clickable: true
        }, extras || {});
    }

    function currentBranches(type) {
        if (type === 'ovn') {
            return (Array.isArray(window.OVN_DRILLDOWN) ? window.OVN_DRILLDOWN : [])
                .map(item => toRow('branch', item, { name: stripBranchDecorations(item.name) }));
        }
        const data = currentData(type);
        const groups = Array.isArray(data?.drilldown) ? data.drilldown : [];
        const group = groups.find(item => /филиал|салон/i.test(cleanText(item.name)));
        return (Array.isArray(group?.masters) ? group.masters : [])
            .filter(item => !isNetworkRow(item.name))
            .map(item => toRow('branch', item, { name: stripBranchDecorations(item.name) }));
    }

    function currentMasters(type) {
        if (type === 'ovn') {
            const rows = [];
            (Array.isArray(window.OVN_DRILLDOWN) ? window.OVN_DRILLDOWN : []).forEach(branch => {
                (Array.isArray(branch.masters) ? branch.masters : []).forEach(item => {
                    if (!isKnownMaster(item.name)) return;
                    rows.push(toRow('master', item, {
                        name: canonicalMaster(item.name),
                        branch: stripBranchDecorations(branch.name)
                    }));
                });
            });
            return rows;
        }
        const data = currentData(type);
        const groups = Array.isArray(data?.drilldown) ? data.drilldown : [];
        let group = groups.find(item => /мастер/i.test(cleanText(item.name)));
        if (!group) {
            group = groups.find(item => Array.isArray(item.masters) && item.masters.some(master => isKnownMaster(master.name)));
        }
        return (Array.isArray(group?.masters) ? group.masters : [])
            .filter(item => isKnownMaster(item.name))
            .map(item => toRow('master', item, {
                name: canonicalMaster(item.name),
                branch: masterLocation(item.name)
            }));
    }

    function currentOverview(type) {
        const data = currentData(type);
        const groups = Array.isArray(data?.drilldown) ? data.drilldown : [];
        return groups.map(item => {
            const row = toRow('overview', item, { clickable: false });
            if (!row.name) row.name = 'Общая сеть';
            return row;
        });
    }

    function historicalBranches(type, month) {
        const groups = Array.isArray(month?.drilldown) ? month.drilldown : [];
        let items = [];
        if (type === 'ovn') {
            items = groups;
        } else {
            const group = groups.find(item => /филиал|салон/i.test(cleanText(item.name)));
            items = Array.isArray(group?.masters) ? group.masters : [];
        }
        return items.filter(item => !isNetworkRow(item.name)).map(item => toRow('branch', item, {
            name: stripBranchDecorations(item.name),
            month,
            period: cleanText(month.period || month.label)
        }));
    }

    function historicalMasters(type, month) {
        const groups = Array.isArray(month?.drilldown) ? month.drilldown : [];
        let items = [];
        if (type === 'ovn') {
            groups.forEach(branch => {
                (Array.isArray(branch.masters) ? branch.masters : []).forEach(master => {
                    items.push({ item: master, branch: stripBranchDecorations(branch.name) });
                });
            });
        } else {
            let group = groups.find(item => /мастер/i.test(cleanText(item.name)));
            if (!group) group = groups.find(item => Array.isArray(item.masters) && item.masters.some(master => isKnownMaster(master.name)));
            items = (Array.isArray(group?.masters) ? group.masters : []).map(item => ({ item, branch: masterLocation(item.name) }));
        }
        return items.filter(entry => isKnownMaster(entry.item.name)).map(entry => toRow('master', entry.item, {
            name: canonicalMaster(entry.item.name),
            branch: entry.branch,
            month,
            period: cleanText(month.period || month.label)
        }));
    }

    function monthRows(type) {
        return historyMonths(type).slice().reverse().map(month => {
            const metric = historyValue(type, month);
            return {
                kind: 'month',
                name: capitalise(month.label || month.key),
                primary: metric.primary,
                secondary: metric.secondary || historyDetail(type, month),
                noData: metric.noData,
                trend: '',
                month,
                period: cleanText(month.period || month.label || month.key),
                clickable: true
            };
        });
    }

    function directMonthRowsForBranch(type, branchName) {
        return historyMonths(type).slice().reverse().map(month => {
            const match = historicalBranches(type, month).find(row => sameBranch(row.name, branchName));
            if (!match) return null;
            return Object.assign({}, match, {
                kind: 'month',
                name: capitalise(month.label || month.key),
                month,
                period: cleanText(month.period || month.label || month.key)
            });
        }).filter(Boolean);
    }

    function directMonthRowsForMaster(type, masterName) {
        return historyMonths(type).slice().reverse().map(month => {
            const match = historicalMasters(type, month).find(row => sameMaster(row.name, masterName));
            if (!match) return null;
            return Object.assign({}, match, {
                kind: 'month',
                name: capitalise(month.label || month.key),
                month,
                period: cleanText(month.period || month.label || month.key)
            });
        }).filter(Boolean);
    }

    function canDrillInto(row) {
        if (row.kind === 'branch') {
            if (state.context.month) {
                return historicalMasters(state.type, state.context.month)
                    .some(master => sameBranch(master.branch, row.name));
            }
            return currentMasters(state.type).some(master => sameBranch(master.branch, row.name)) ||
                directMonthRowsForBranch(state.type, row.name).length > 0;
        }
        if (row.kind === 'master') {
            return !state.context.month && directMonthRowsForMaster(state.type, row.name).length > 0;
        }
        if (row.kind === 'month') {
            if (state.context.master) return false;
            if (state.context.branch) {
                return historicalMasters(state.type, row.month)
                    .some(master => sameBranch(master.branch, state.context.branch));
            }
            return historicalBranches(state.type, row.month).length > 0 || historicalMasters(state.type, row.month).length > 0;
        }
        return false;
    }

    function markClickable(rows) {
        return rows.map(row => Object.assign({}, row, { clickable: row.kind === 'overview' ? false : canDrillInto(row) }));
    }

    function rowsForDimension(dimension) {
        const context = state.context;
        if (context.month) {
            if (dimension === 'branches') {
                let rows = historicalBranches(state.type, context.month);
                if (context.branch) rows = rows.filter(row => sameBranch(row.name, context.branch));
                return markClickable(rows);
            }
            if (dimension === 'masters') {
                let rows = historicalMasters(state.type, context.month);
                if (context.branch) rows = rows.filter(row => sameBranch(row.branch, context.branch));
                if (context.master) rows = rows.filter(row => sameMaster(row.name, context.master));
                return markClickable(rows);
            }
            return [];
        }

        if (dimension === 'branches') return markClickable(currentBranches(state.type));
        if (dimension === 'masters') {
            let rows = currentMasters(state.type);
            if (context.branch) rows = rows.filter(row => sameBranch(row.branch, context.branch));
            if (context.master) rows = rows.filter(row => sameMaster(row.name, context.master));
            return markClickable(rows);
        }
        if (dimension === 'months') {
            if (context.master) return markClickable(directMonthRowsForMaster(state.type, context.master));
            if (context.branch) return markClickable(directMonthRowsForBranch(state.type, context.branch));
            return markClickable(monthRows(state.type));
        }
        return currentOverview(state.type);
    }

    function availableDimensions() {
        const candidates = state.context.month
            ? (state.context.master ? [] : state.context.branch ? ['masters'] : ['branches', 'masters'])
            : state.context.master
                ? ['months']
                : state.context.branch
                    ? ['masters', 'months']
                    : ['branches', 'masters', 'months'];
        const available = candidates.filter(dimension => rowsForDimension(dimension).length > 0);
        if (!available.length && !state.context.month && currentOverview(state.type).length) available.push('overview');
        return available;
    }

    function cloneContext() {
        return {
            branch: state.context.branch,
            master: state.context.master,
            month: state.context.month
        };
    }

    function snapshotState() {
        return {
            dimension: state.dimension,
            context: cloneContext(),
            header: Object.assign({}, state.header, { context: (state.header.context || []).slice() }),
            query: state.query,
            sort: state.sort
        };
    }

    function restoreSnapshot(snapshot) {
        state.dimension = snapshot.dimension;
        state.context = snapshot.context;
        state.header = snapshot.header;
        state.query = snapshot.query;
        state.sort = snapshot.sort;
    }

    function drillInto(row) {
        if (!row.clickable) return;
        state.stack.push(snapshotState());
        state.query = '';

        if (row.kind === 'branch') {
            state.context.branch = row.name;
            state.header.context.push(row.name);
        } else if (row.kind === 'master') {
            state.context.master = row.name;
            state.header.context.push(row.name);
        } else if (row.kind === 'month') {
            state.context.month = row.month;
            state.header.context.push(row.name);
        }

        state.header.primary = row.primary;
        state.header.secondary = row.secondary;
        if (row.period) state.header.period = row.period;
        const dimensions = availableDimensions();
        state.dimension = dimensions[0] || null;
        resetSortToViewDefault();
        render();
        if (scrollEl) scrollEl.scrollTop = 0;
    }

    function back() {
        const snapshot = state.stack.pop();
        if (!snapshot) return;
        restoreSnapshot(snapshot);
        render();
        if (scrollEl) scrollEl.scrollTop = 0;
    }

    function numericValue(row) {
        const match = cleanText(row.primary).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : Number.NEGATIVE_INFINITY;
    }

    // Historical month views retain their existing source order (newest first).
    function defaultSortForView() {
        if (state.dimension === 'months' || state.context.month) return 'source';
        return TYPE_CONFIG[state.type]?.defaultSort || 'source';
    }

    function resetSortToViewDefault() {
        state.sort = defaultSortForView();
    }

    function visibleRows(rows) {
        const query = state.query.trim().toLowerCase();
        let result = query ? rows.filter(row => row.name.toLowerCase().includes(query)) : rows.slice();
        if (state.sort === 'value-desc') result.sort((a, b) => numericValue(b) - numericValue(a));
        if (state.sort === 'value-asc') result.sort((a, b) => numericValue(a) - numericValue(b));
        if (state.sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        return result;
    }

    function trendIcon(trend) {
        if (!trend) return '';
        const path = trend === 'up' ? 'M5 15L15 5M8 5h7v7' : 'M5 5l10 10M8 15h7V8';
        return `<svg class="analytics-detail-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${path}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    function chevronIcon() {
        return '<svg class="analytics-detail-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    function renderControls(rows) {
        const searchable = state.dimension === 'masters' && rows.length >= 10;
        const sortable = rows.length >= 7;
        if (!searchable && !sortable) return '';
        return `
            <div class="analytics-detail-controls">
                ${searchable ? `<input id="analytics-detail-search" class="analytics-detail-search" type="search" value="${esc(state.query)}" placeholder="Найти мастера" aria-label="Найти мастера">` : '<span></span>'}
                ${sortable ? `<select id="analytics-detail-sort" class="analytics-detail-sort" aria-label="Сортировка">
                    <option value="source"${state.sort === 'source' ? ' selected' : ''}>По данным</option>
                    <option value="value-desc"${state.sort === 'value-desc' ? ' selected' : ''}>Больше сначала</option>
                    <option value="value-asc"${state.sort === 'value-asc' ? ' selected' : ''}>Меньше сначала</option>
                    <option value="name"${state.sort === 'name' ? ' selected' : ''}>По имени</option>
                </select>` : ''}
            </div>`;
    }

    function renderRows(rows) {
        const filtered = visibleRows(rows);
        if (!filtered.length) {
            return '<div class="analytics-detail-state"><div><strong>Ничего не найдено</strong>Измените запрос или вернитесь на уровень выше.</div></div>';
        }
        return `<div class="analytics-detail-list">${filtered.map((row, index) => `
            <button class="analytics-detail-row${row.clickable ? '' : ' is-static'}" type="button"${row.clickable ? ` data-row-index="${rows.indexOf(row)}"` : ' disabled'}>
                <span class="analytics-detail-row-main">
                    <span class="analytics-detail-row-name">${esc(row.name)}</span>
                    ${row.secondary ? `<span class="analytics-detail-row-meta">${esc(row.secondary)}</span>` : ''}
                </span>
                <span class="analytics-detail-row-value${row.noData ? ' is-empty' : ''}">${esc(row.primary)}</span>
                ${row.clickable ? (trendIcon(row.trend) || chevronIcon()) : ''}
            </button>`).join('')}</div>`;
    }

    function insightRows(items) {
        return (Array.isArray(items) ? items : []).slice(0, 3).map((item, index) => `
            <div class="analytics-insight-row">
                <span class="analytics-insight-rank">${index + 1}.</span>
                <span>${esc(item.name)}</span>
                <span class="analytics-insight-count">${esc(Number(item.count) || 0)}</span>
            </div>`).join('');
    }

    function renderInsights() {
        if (state.type !== 'ovn' || state.context.branch || state.context.master) return '';
        const topData = state.context.month ? state.context.month.tops : window.OVN_TOPS;
        if (!topData) return '';
        const violators = topData.violators || [];
        const violations = topData.violations || [];
        if (!violators.length && !violations.length) return '';
        return `
            <section class="analytics-insights" aria-labelledby="analytics-insights-title">
                <h3 id="analytics-insights-title">Инсайты</h3>
                <div class="analytics-insight-group">
                    <h4>Топ нарушителей</h4>
                    ${insightRows(violators) || '<div class="analytics-detail-row-meta">Нарушений нет</div>'}
                </div>
                <div class="analytics-insight-group">
                    <h4>Частые нарушения</h4>
                    ${insightRows(violations) || '<div class="analytics-detail-row-meta">Нарушений нет</div>'}
                </div>
            </section>`;
    }

    function freshnessText() {
        if (state.context.month) return `Архивный период: ${cleanText(state.context.month.label || state.context.month.key)}`;
        if (state.type === 'ovn') {
            const stamp = window.OVN_TOPS_STATE?.sourceUpdatedAt || window.OVN_TOPS_STATE?.generatedAt;
            return stamp ? `Источник обновлён: ${cleanText(stamp)}` : 'Актуальные данные ОВН';
        }
        return window.DASH_DATA?.lastUpdate ? `Обновлено: ${cleanText(window.DASH_DATA.lastUpdate)}` : '';
    }

    function renderContent() {
        if (state.loading) {
            return '<div class="analytics-detail-state" role="status"><div><strong>Загружаем актуальные данные</strong>Это займёт несколько секунд.</div></div>';
        }
        if (state.error) {
            return `<div class="analytics-detail-state" role="alert"><div><strong>Данные недоступны</strong>${esc(state.error)}</div></div>`;
        }
        const dimensions = availableDimensions();
        if (!dimensions.length || !state.dimension) {
            return '<div class="analytics-detail-state"><div><strong>Детализация недоступна</strong>Для этого уровня источник не содержит более глубоких данных.</div></div>';
        }
        const rows = rowsForDimension(state.dimension);
        return `${renderControls(rows)}${renderRows(rows)}${renderInsights()}${freshnessText() ? `<div class="analytics-detail-freshness">${esc(freshnessText())}</div>` : ''}`;
    }

    function renderHeader() {
        const dimensions = state.loading || state.error ? [] : availableDimensions();
        if (dimensions.length && !dimensions.includes(state.dimension)) state.dimension = dimensions[0];
        const contextText = (state.header?.context || []).join(' › ');
        const backButton = root.querySelector('[data-analytics-back]');
        backButton.hidden = state.stack.length === 0;
        root.querySelector('[data-analytics-title]').textContent = state.header?.title || 'Аналитика';
        root.querySelector('[data-analytics-context]').textContent = contextText;
        root.querySelector('[data-analytics-value]').textContent = state.header?.primary || 'Нет данных';
        root.querySelector('[data-analytics-secondary]').textContent = state.header?.secondary || '';
        root.querySelector('[data-analytics-period]').textContent = state.header?.period || '';

        const nav = root.querySelector('[data-analytics-dimensions]');
        nav.hidden = dimensions.length < 2;
        nav.innerHTML = dimensions.map(dimension => `
            <button type="button" class="analytics-dimension-btn${dimension === state.dimension ? ' is-active' : ''}" data-dimension="${dimension}" aria-pressed="${dimension === state.dimension}">
                ${DIMENSION_LABELS[dimension]}
            </button>`).join('');
    }

    function render() {
        if (!root) return;
        renderHeader();
        root.querySelector('[data-analytics-content]').innerHTML = renderContent();
        bindDynamicEvents();
    }

    function bindDynamicEvents() {
        const rows = state.dimension ? rowsForDimension(state.dimension) : [];
        root.querySelectorAll('[data-dimension]').forEach(button => {
            button.addEventListener('click', () => {
                state.dimension = button.dataset.dimension;
                state.query = '';
                resetSortToViewDefault();
                render();
                if (scrollEl) scrollEl.scrollTop = 0;
            });
        });
        root.querySelectorAll('[data-row-index]').forEach(button => {
            button.addEventListener('click', () => drillInto(rows[Number(button.dataset.rowIndex)]));
        });
        const search = root.querySelector('#analytics-detail-search');
        if (search) {
            search.addEventListener('input', () => {
                state.query = search.value;
                render();
                const next = root.querySelector('#analytics-detail-search');
                if (next) {
                    next.focus();
                    next.setSelectionRange(next.value.length, next.value.length);
                }
            });
        }
        const sort = root.querySelector('#analytics-detail-sort');
        if (sort) {
            sort.addEventListener('change', () => {
                state.sort = sort.value;
                render();
            });
        }
    }

    function ensureRoot() {
        root = document.getElementById('analytics-detail-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'analytics-detail-root';
            document.body.appendChild(root);
        }
        root.className = 'analytics-detail-root';
        root.innerHTML = `
            <div class="analytics-detail-backdrop" data-analytics-close aria-hidden="true"></div>
            <section class="analytics-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="analytics-detail-title" tabindex="-1">
                <button class="analytics-detail-drag" type="button" aria-label="Потяните вниз, чтобы закрыть" data-analytics-drag></button>
                <header class="analytics-detail-header">
                    <div class="analytics-detail-toolbar">
                        <button class="analytics-detail-icon-btn" type="button" data-analytics-back aria-label="Назад" hidden>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <div class="analytics-detail-title-wrap">
                            <h2 class="analytics-detail-title" id="analytics-detail-title" data-analytics-title></h2>
                            <div class="analytics-detail-context" data-analytics-context></div>
                        </div>
                        <button class="analytics-detail-icon-btn" type="button" data-analytics-close aria-label="Закрыть">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/></svg>
                        </button>
                    </div>
                    <div class="analytics-detail-summary">
                        <div>
                            <div class="analytics-detail-value" data-analytics-value></div>
                            <div class="analytics-detail-secondary" data-analytics-secondary></div>
                        </div>
                        <div class="analytics-detail-period" data-analytics-period></div>
                    </div>
                    <nav class="analytics-dimension-nav" data-analytics-dimensions aria-label="Измерение аналитики"></nav>
                </header>
                <div class="analytics-detail-scroll" data-analytics-scroll>
                    <div class="analytics-detail-content" data-analytics-content></div>
                </div>
            </section>`;
        sheet = root.querySelector('.analytics-detail-sheet');
        scrollEl = root.querySelector('[data-analytics-scroll]');
        root.querySelectorAll('[data-analytics-close]').forEach(element => element.addEventListener('click', close));
        root.querySelector('[data-analytics-back]').addEventListener('click', back);
        bindDrag();
    }

    function lockPage() {
        if (state.pageLocked) return;
        state.scrollY = window.scrollY;
        state.bodyStyles = {
            position: document.body.style.position,
            top: document.body.style.top,
            left: document.body.style.left,
            right: document.body.style.right,
            width: document.body.style.width
        };
        document.body.style.position = 'fixed';
        document.body.style.top = `-${state.scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.classList.add('analytics-sheet-open');
        state.pageLocked = true;
    }

    function unlockPage() {
        if (!state.pageLocked) return;
        const styles = state.bodyStyles || {};
        document.body.classList.remove('analytics-sheet-open');
        document.body.style.position = styles.position || '';
        document.body.style.top = styles.top || '';
        document.body.style.left = styles.left || '';
        document.body.style.right = styles.right || '';
        document.body.style.width = styles.width || '';
        window.scrollTo(0, state.scrollY);
        state.bodyStyles = null;
        state.pageLocked = false;
    }

    function focusableElements() {
        return Array.from(root.querySelectorAll('button:not([hidden]):not([disabled]), input:not([disabled]), select:not([disabled])'))
            .filter(element => element.offsetParent !== null);
    }

    function handleKeydown(event) {
        if (!state.open) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }
        if (event.key !== 'Tab') return;
        const elements = focusableElements();
        if (!elements.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function bindDrag() {
        const drag = root.querySelector('[data-analytics-drag]');
        drag.addEventListener('pointerdown', event => {
            if (window.innerWidth >= 900) return;
            state.dragStartY = event.clientY;
            state.dragging = true;
            drag.setPointerCapture(event.pointerId);
            sheet.style.transition = 'none';
        });
        drag.addEventListener('pointermove', event => {
            if (!state.dragging) return;
            const delta = Math.max(0, event.clientY - state.dragStartY);
            sheet.style.transform = `translateY(${delta}px)`;
        });
        const finish = event => {
            if (!state.dragging) return;
            const delta = Math.max(0, event.clientY - state.dragStartY);
            state.dragging = false;
            sheet.style.transition = '';
            sheet.style.transform = '';
            if (delta > 96) close();
        };
        drag.addEventListener('pointerup', finish);
        drag.addEventListener('pointercancel', finish);
    }

    async function prepareData(type) {
        if (!window.ANALYTICS_HISTORY && typeof window.loadAnalyticsHistory === 'function') {
            await window.loadAnalyticsHistory();
        }
        if (type !== 'ovn') return;
        const currentMonth = typeof dayjs === 'function' ? dayjs().format('YYYY-MM') : '';
        const ready = window.OVN_TOPS_STATE?.status === 'ready' &&
            window.OVN_TOPS_STATE?.month === currentMonth &&
            window.OVN_TOPS?.source === 'ovn_reports' &&
            window.OVN_DRILLDOWN_STATE?.status === 'ready' &&
            window.OVN_DRILLDOWN_STATE?.month === currentMonth &&
            Array.isArray(window.OVN_DRILLDOWN);
        if (ready) return;
        if (typeof window.loadOVNHistory !== 'function') throw new Error('Не удалось запустить обновление данных ОВН.');
        await window.loadOVNHistory();
        const refreshed = window.OVN_TOPS_STATE?.status === 'ready' &&
            window.OVN_TOPS_STATE?.month === currentMonth &&
            window.OVN_TOPS?.source === 'ovn_reports' &&
            window.OVN_DRILLDOWN_STATE?.status === 'ready' &&
            window.OVN_DRILLDOWN_STATE?.month === currentMonth;
        if (!refreshed) throw new Error('Актуальные данные ОВН не получены. Попробуйте открыть детализацию позже.');
    }

    async function open(type) {
        if (!TYPE_CONFIG[type]) return;
        if (!root) ensureRoot();
        if (state.open) close(true);
        const requestId = ++state.requestId;
        state.open = true;
        state.loading = true;
        state.error = '';
        state.type = type;
        state.context = { branch: null, master: null, month: null };
        state.header = cardSnapshot(type);
        state.stack = [];
        state.query = '';
        resetSortToViewDefault();
        state.dimension = null;
        state.previousFocus = document.activeElement;
        lockPage();
        root.removeAttribute('aria-hidden');
        root.classList.add('is-open');
        document.addEventListener('keydown', handleKeydown);
        render();
        requestAnimationFrame(() => sheet?.focus());

        try {
            await prepareData(type);
        } catch (error) {
            if (requestId !== state.requestId) return;
            state.error = error?.message || 'Не удалось получить актуальные данные.';
        } finally {
            if (requestId !== state.requestId || !state.open) return;
            state.loading = false;
            if (!state.error) {
                const dimensions = availableDimensions();
                state.dimension = dimensions[0] || null;
                resetSortToViewDefault();
                state.header = cardSnapshot(type);
            }
            render();
        }
    }

    function close(immediate) {
        if (!state.open || !root) return;
        state.open = false;
        state.requestId += 1;
        document.removeEventListener('keydown', handleKeydown);
        root.classList.remove('is-open');
        const finish = () => {
            if (state.open) return;
            unlockPage();
            root.setAttribute('aria-hidden', 'true');
            if (state.previousFocus && typeof state.previousFocus.focus === 'function') state.previousFocus.focus();
        };
        if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
        else window.setTimeout(finish, 290);
    }

    window.AnalyticsExplorer = { open, close, back };
})();
