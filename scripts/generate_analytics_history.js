const fs = require('fs');
const path = require('path');
const http = require('http');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');

dayjs.extend(customParseFormat);
dayjs.extend(quarterOfYear);

const ROOT = path.join(__dirname, '..');
const ADAPTER_PATH = process.env.GROME_ADAPTER_PATH || path.join(ROOT, 'adapter');
const DATA_PATH = process.env.GROME_DATA_PATH || path.join(ROOT, 'data.json');
const OVN_REPORTS_PATH = process.env.GROME_OVN_REPORTS_PATH || path.join(ROOT, 'ovn_reports.json');
const HISTORY_PATH = process.env.GROME_HISTORY_PATH || path.join(ROOT, 'analytics_history.json');
const ADAPTER = require(path.resolve(ADAPTER_PATH));
const { calculateLatenessMetric } = require('../routes/lateness_metric');
const { CYCLE_WINDOW_DAYS, getCompletedRollingPeriod, calculateVisitCycle } = require('./visit_cycle');
// The live card and the monthly history use one metric contract.
const { calculateAppointmentShare } = require('../routes/appointments_metric');

const CONFIG = {
    elkassaToken: process.env.ELKASSA_TOKEN || 'U4TSoYefFjtp3BwLxm5ZkntjPUKo4uDGyNFdb8qfzC98piFkUJs8FwoADPX36Goc',
    yLogin: process.env.YCLIENTS_LOGIN || '89854291875',
    yPass: process.env.YCLIENTS_PASS || 'Googleplay99',
};

function writeJsonAtomic(filePath, value) {
    const tempPath = `${filePath}.tmp-${process.pid}`;
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
}

const RR_COHORT_START_DAYS = 90;
const RR_COHORT_END_DAYS = 60;
const RR_RETURN_WINDOW_DAYS = 60;
const MIN_RR_MASTER_SAMPLE = 30;

function getMoscowNow() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date()).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});
    return dayjs(`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`, 'YYYY-MM-DD HH:mm:ss');
}

function normalizeName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9]+/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function findAdapterMaster(name, branchName = null) {
    const query = normalizeName(name);
    if (!query || query === 'мастер') return null;
    const adapterObj = getAdapterObject();
    const entries = Object.entries(adapterObj)
        .filter(([loc]) => !branchName || loc === branchName);

    for (const [, config] of entries) {
        if (!config || !Array.isArray(config.masters)) continue;
        for (const master of config.masters) {
            const names = [master.dash, ...(master.el_kassa || [])];
            for (const candidate of names) {
                const canon = normalizeName(candidate);
                if (!canon) continue;
                if (query === canon || query === normalizeName(master.dash)) return master.dash;
                if (query.length >= 4 && canon.startsWith(query + ' ')) return master.dash;
                if (canon.length >= 4 && query.startsWith(canon + ' ')) return master.dash;
            }
        }
    }
    return null;
}

function getCanonicalDashName(ekName, termNumber) {
    // Analytics must never attribute a historical transaction by a partial
    // name match. An unknown El.Kassa name still contributes to the network
    // metric, but cannot be silently assigned to a different current master.
    return getExactCanonicalDashName(ekName, termNumber);
}

function getExactCanonicalDashName(ekName, termNumber) {
    const branch = getBranchByTerminal(termNumber);
    const query = normalizeName(ekName);
    if (!query || query === 'мастер') return null;
    const adapterObj = getAdapterObject();
    const entries = Object.entries(adapterObj)
        .filter(([loc]) => !branch || loc === branch);

    for (const [, config] of entries) {
        if (!config || !Array.isArray(config.masters)) continue;
        for (const master of config.masters) {
            const names = [master.dash, ...(master.el_kassa || [])];
            if (names.some(candidate => normalizeName(candidate) === query)) return master.dash;
        }
    }
    return null;
}

function getAdapterMasterNames() {
    const names = [];
    Object.values(getAdapterObject()).forEach(config => {
        if (!config || !Array.isArray(config.masters)) return;
        config.masters.forEach(master => {
            if (master && master.dash && !names.includes(master.dash)) names.push(master.dash);
        });
    });
    return names;
}

function medianValue(values) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateReturnRate(createdClientPhones, rrVisitsMap, cohortStart, cohortEnd, observationEnd, returnWindowDays = RR_RETURN_WINDOW_DAYS) {
    const rrByMaster = {}, rrByLoc = {};
    let totalRet = 0, totalBase = 0;

    createdClientPhones.forEach((_, phone) => {
        const visits = (rrVisitsMap[phone] || []).slice().sort((a, b) => a.date.unix() - b.date.unix());
        const firstV = visits.find(v => v.date.unix() >= cohortStart.unix() && v.date.unix() <= cohortEnd.endOf('day').unix());
        if (!firstV) return;
        const m = firstV.master, l = firstV.branch;
        totalBase++;
        if (m) {
            if (!rrByMaster[m]) rrByMaster[m] = { new: 0, ret: 0 };
            rrByMaster[m].new++;
        }
        if (l && l !== 'Общая сеть') {
            if (!rrByLoc[l]) rrByLoc[l] = { new: 0, ret: 0 };
            rrByLoc[l].new++;
        }

        const personalReturnEnd = firstV.date.add(returnWindowDays, 'day');
        const returnEnd = personalReturnEnd.isBefore(observationEnd) ? personalReturnEnd : observationEnd;
        const returned = visits.some(v => v.date.unix() > firstV.date.unix() && v.date.unix() <= returnEnd.endOf('day').unix());
        if (returned) {
            totalRet++;
            if (m) rrByMaster[m].ret++;
            if (l && l !== 'Общая сеть') rrByLoc[l].ret++;
        }
    });

    return { totalRet, totalBase, rrByMaster, rrByLoc };
}

function formatReturnRateDrilldown(entries, { minSample = 0 } = {}) {
    return entries
        .map(([name, { new: n, ret: r }]) => {
            const noData = n <= 0;
            const value = n > 0 ? (r / n) * 100 : 0;
            const lowSample = !noData && minSample > 0 && n < minSample;
            return {
                name,
                v: noData ? 'нет данных' : `${value.toFixed(1)}% (${r}/${n})${lowSample ? ' · малая база' : ''}`,
                sampleSize: n,
                noData,
                lowSample,
                value
            };
        })
        .sort((a, b) => {
            if (a.noData !== b.noData) return a.noData ? 1 : -1;
            if (a.lowSample !== b.lowSample) return a.lowSample ? 1 : -1;
            if (b.value !== a.value) return b.value - a.value;
            return b.sampleSize - a.sampleSize;
        })
        .map(({ name, v }) => ({ name, v }));
}

function formatOccupancyDrilldown(masterDayCounts, adapterMasterNames = getAdapterMasterNames()) {
    return adapterMasterNames
        .map(name => {
            const days = masterDayCounts[name] || {};
            let total = 0, validDays = 0;
            Object.values(days).forEach(count => {
                if (count > 2) {
                    total += count;
                    validDays++;
                }
            });
            const value = validDays > 0 ? total / validDays : 0;
            return { name, value, validDays, v: validDays > 0 ? `${value.toFixed(1)} ч/д` : 'нет данных' };
        })
        .sort((a, b) => {
            const aNoData = a.validDays <= 0;
            const bNoData = b.validDays <= 0;
            if (aNoData !== bNoData) return aNoData ? 1 : -1;
            if (b.value !== a.value) return b.value - a.value;
            return a.name.localeCompare(b.name, 'ru');
        })
        .map(({ name, v }) => ({ name, v }));
}

function ekGet(apiPath, params = {}) {
    return new Promise((resolve, reject) => {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
        ).toString();
        const options = {
            hostname: 'el-kassa.online',
            port: 80,
            path: apiPath + (qs ? '?' + qs : ''),
            method: 'GET',
            headers: {
                Authorization: `Bearer ${CONFIG.elkassaToken}`,
                Accept: 'application/json',
            },
        };
        const req = http.request(options, res => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function ekGetAll(apiPath, params = {}, pageSizeArg = 100) {
    const pageSize = pageSizeArg;
    let page = 1;
    let all = [];
    while (true) {
        const { status, body } = await ekGet(apiPath, { ...params, page, page_items: pageSize });
        if (status !== 200) throw new Error(`EK API ${status}: ${JSON.stringify(body).slice(0, 200)}`);
        if (Array.isArray(body)) return body;
        const items = body.items || [];
        all = all.concat(items);
        const total = (body.pagination || {}).total_items || 0;
        if (all.length >= total || items.length === 0) break;
        page++;
    }
    return all;
}

const normPhone = raw => {
    if (!raw) return null;
    let s = String(raw).replace(/\D/g, '');
    if (s.length === 11 && s.startsWith('8')) s = '7' + s.substring(1);
    if (s.length === 10) s = '7' + s;
    if (s.length === 11 && s.startsWith('7')) return s;
    return null;
};

function getAdapterObject() {
    return ADAPTER.ADAPTER || ADAPTER;
}

function getBranchByTerminal(termNumber) {
    for (const [branch, cfg] of Object.entries(getAdapterObject())) {
        if (cfg.el_kassa_terminal === String(termNumber)) return branch;
    }
    return null;
}

function getDashName(ekName, termNumber) {
    const branch = getBranchByTerminal(termNumber);
    return ADAPTER.getDashNameByElkassa(String(ekName || '').trim(), branch);
}

function isAdapterMaster(name) {
    return getAdapterMasterNames().includes(name);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, label, attempts = 4) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok || response.status < 500) return response;
            lastError = new Error(`${label}: HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        if (attempt < attempts) await delay(attempt * 750);
    }
    throw new Error(`${label}: ${lastError ? lastError.message : 'request failed'}`);
}

async function fetchYclientsRecords(startDate, endDate) {
    const bearer = 'Bearer u8xzkdpkgfc73uektn64';
    let userToken = '';
    try {
        const authRes = await fetchWithRetry('https://api.yclients.com/api/v1/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: bearer, Accept: 'application/vnd.yclients.v2+json' },
            body: JSON.stringify({ login: CONFIG.yLogin, password: CONFIG.yPass })
        }, 'YClients auth');
        if (!authRes.ok) throw new Error(`HTTP ${authRes.status}`);
        userToken = (await authRes.json()).data.user_token;
        if (!userToken) throw new Error('user token is empty');
    } catch (e) {
        throw new Error(`[YClients] auth error: ${e.message}`);
    }

    const records = [];
    for (const [loc, config] of Object.entries(getAdapterObject())) {
        const companyId = config.yclients_company_id;
        if (!companyId) continue;
        let page = 1;
        while (true) {
            const url = `https://api.yclients.com/api/v1/records/${companyId}?start_date=${startDate}&end_date=${endDate}&count=300&page=${page}`;
            const res = await fetchWithRetry(url, {
                headers: { Authorization: userToken ? `${bearer}, User ${userToken}` : bearer, Accept: 'application/vnd.yclients.v2+json' }
            }, `YClients records ${loc} ${startDate} page ${page}`);
            if (!res.ok) throw new Error(`YClients records ${loc}: HTTP ${res.status}`);
            const data = ((await res.json()).data || []);
            data.forEach(r => {
                if (r.deleted) return;
                const dashName = typeof ADAPTER.getDashNameByYclientsId === 'function'
                    ? ADAPTER.getDashNameByYclientsId(r.staff_id)
                    : undefined;
                if (dashName) records.push({ id: r.id, master: dashName, branch: loc, staff_id: r.staff_id, deleted: false });
            });
            if (data.length < 300) break;
            page++;
        }
    }
    return { records };
}

function formatRuMonth(monthStart) {
    const months = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
    return `${months[monthStart.month()]} ${monthStart.format('YYYY')}`;
}

function buildMonthList(now) {
    const months = [];
    const current = now.startOf('month');
    for (let i = 11; i >= 0; i--) months.push(current.subtract(i, 'month'));
    return months;
}

function getOrderDate(order) {
    const d = dayjs(order.date, 'DD.MM.YYYY HH:mm');
    return d.isValid() ? d : null;
}

function filterOrdersByDate(orders, start, end) {
    return (orders || []).filter(o => {
        const d = getOrderDate(o);
        return d && !d.isBefore(start, 'day') && !d.isAfter(end, 'day');
    });
}

function getCustomerCreatedDate(customer, fallback) {
    const candidates = [customer.created_at, customer.date_created, customer.dateCreated];
    for (const value of candidates) {
        if (!value) continue;
        const parsed = dayjs(value, ['DD.MM.YYYY HH:mm', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ssZ'], true);
        if (parsed.isValid()) return parsed;
        const loose = dayjs(value);
        if (loose.isValid()) return loose;
    }
    return fallback;
}

async function buildEkContext(months, now) {
    const firstObservation = months[0].endOf('month');
    const lastObservation = now.subtract(1, 'day');
    const ordersStart = firstObservation.subtract(CYCLE_WINDOW_DAYS - 1, 'day').startOf('day');
    // The current month is only truthful through its last completed day.
    // Requesting the end of a future month makes the historical snapshot
    // depend on an API-specific interpretation of a future date range.
    const ordersEnd = lastObservation.endOf('day');
    const customersStart = firstObservation.subtract(RR_COHORT_START_DAYS, 'day').startOf('day');
    const customersEnd = lastObservation.subtract(RR_COHORT_END_DAYS, 'day').endOf('day');

    console.log(`[history] preload EK orders ${ordersStart.format('YYYY-MM-DD')}..${ordersEnd.format('YYYY-MM-DD')}`);
    const orders = await ekGetAll('/api2/order/list', {
        date: `${ordersStart.format('DD.MM.YYYY')} 00:00 - ${ordersEnd.format('DD.MM.YYYY')} 23:59`
    }, 10000);

    console.log(`[history] preload EK customers ${customersStart.format('YYYY-MM-DD')}..${customersEnd.format('YYYY-MM-DD')}`);
    const customers = await ekGetAll('/api2/customer/list', {
        dateCreated: `${customersStart.format('DD.MM.YYYY')} 00:00 - ${customersEnd.format('DD.MM.YYYY')} 23:59`
    }, 1000);

    return { orders, customers };
}

async function calcClientsMetrics(observationDay, ekContext) {
    const cyclePeriod = getCompletedRollingPeriod(observationDay.add(1, 'day'));
    const cycleEvents = filterOrdersByDate(ekContext.orders, cyclePeriod.start, cyclePeriod.end)
        .filter(o => o.status_pay_show === 'Оплачено')
        .map(o => {
        const phone = normPhone(o.customerPhone);
        if (!phone) return null;
        const master = getCanonicalDashName(o.employeeName, o.terminal_number);
        const branch = getBranchByTerminal(o.terminal_number) || null;
        const d = dayjs(o.date, 'DD.MM.YYYY HH:mm');
        return d.isValid() ? { phone, date: d, master, branch } : null;
    }).filter(Boolean);
    const cycleResult = calculateVisitCycle(cycleEvents);
    const cycleDrilldown = [...cycleResult.byBranch.entries()]
        .map(([name, values]) => ({ name, v: medianValue(values).toFixed(1) + ' д.' }))
        .sort((a, b) => parseFloat(a.v) - parseFloat(b.v));

    const rrCohortStart = observationDay.subtract(RR_COHORT_START_DAYS, 'day').startOf('day');
    const rrCohortEnd = observationDay.subtract(RR_COHORT_END_DAYS, 'day').endOf('day');
    const createdClientPhones = new Map();
    ekContext.customers.forEach(c => {
        const p = normPhone(c.phone);
        if (!p) return;
        const createdAt = getCustomerCreatedDate(c, rrCohortStart);
        if (createdAt.isBefore(rrCohortStart, 'day') || createdAt.isAfter(rrCohortEnd, 'day')) return;
        createdClientPhones.set(p, createdAt);
    });

    const rrOrders = filterOrdersByDate(ekContext.orders, rrCohortStart, observationDay);
    const rrVisitsMap = {};
    rrOrders.forEach(o => {
        const phone = normPhone(o.customerPhone);
        if (!phone) return;
        const master = getCanonicalDashName(o.employeeName, o.terminal_number);
        const branch = getBranchByTerminal(o.terminal_number) || 'Общая сеть';
        const d = dayjs(o.date, 'DD.MM.YYYY HH:mm');
        if (!d.isValid()) return;
        if (!rrVisitsMap[phone]) rrVisitsMap[phone] = [];
        rrVisitsMap[phone].push({ date: d, master, branch });
    });
    Object.values(rrVisitsMap).forEach(arr => arr.sort((a, b) => a.date.unix() - b.date.unix()));

    const rrResult = calculateReturnRate(createdClientPhones, rrVisitsMap, rrCohortStart, rrCohortEnd, observationDay.endOf('day'), RR_RETURN_WINDOW_DAYS);
    const rrByLoc = rrResult.rrByLoc;
    rrByLoc['Общая сеть'] = { new: rrResult.totalBase, ret: rrResult.totalRet };
    const rrVal = rrResult.totalBase > 0 ? Number(((rrResult.totalRet / rrResult.totalBase) * 100).toFixed(1)) : 0;

    return {
        returnRate: {
            value: rrVal,
            period: `${rrCohortStart.format('DD.MM')}-${rrCohortEnd.format('DD.MM')}`,
            cohortLabel: `${rrResult.totalRet} из ${rrResult.totalBase} новых`,
            drilldown: [
                { name: 'Общая сеть (Mature RR60, 90-60д когорта)', value: `${rrResult.totalRet} из ${rrResult.totalBase} новых`, trend: rrVal > 30 ? 'up' : 'down', masters: formatReturnRateDrilldown(getAdapterMasterNames().map(name => [name, rrResult.rrByMaster[name] || { new: 0, ret: 0 }]), { minSample: MIN_RR_MASTER_SAMPLE }) },
                { name: 'По филиалам', value: '', trend: 'up', masters: formatReturnRateDrilldown(Object.entries(rrByLoc)) }
            ]
        },
        cycle: {
            value: cycleResult.value,
            period: cyclePeriod.label,
            windowDays: CYCLE_WINDOW_DAYS,
            minVisitsPerClient: 3,
            aggregation: 'median',
            sampleSize: cycleResult.sampleSize,
            eligibleCustomers: cycleResult.eligibleCustomers,
            drilldown: [{ name: 'По филиалам', value: `${cycleResult.value} д.`, trend: 'down', masters: cycleDrilldown }]
        }
    };
}

async function calcOnlineMetrics(monthStart, observationDay, ekContext) {
    const occupancyOrders = filterOrdersByDate(ekContext.orders, monthStart, observationDay);

    const ycMeta = await fetchYclientsRecords(monthStart.format('YYYY-MM-DD'), observationDay.format('YYYY-MM-DD'));
    const appointmentResult = calculateAppointmentShare({
        orders: occupancyOrders.map(o => ({
            master: getCanonicalDashName(o.employeeName, o.terminal_number),
            completed: o.status_pay_show === 'Оплачено'
        })),
        records: ycMeta.records
    });
    const { totalServices: checksCount, totalRecords: recordsCount, percentage } = appointmentResult;
    const apptMasters = appointmentResult.masters.map(row => ({ name: row.name, v: `${row.percentage}%` }));

    const occupancyMap = {};
    occupancyOrders.forEach(o => {
        const m = getCanonicalDashName(o.employeeName, o.terminal_number);
        const day = (o.date || '').split(' ')[0];
        if (!day || !m) return;
        if (!occupancyMap[m]) occupancyMap[m] = {};
        occupancyMap[m][day] = (occupancyMap[m][day] || 0) + 1;
    });

    let netOrders = 0, netDays = 0;
    Object.values(occupancyMap).forEach(days => {
        Object.values(days).forEach(cnt => {
            if (cnt > 2) {
                netOrders += cnt;
                netDays++;
            }
        });
    });
    const networkAvg = netDays > 0 ? Number((netOrders / netDays).toFixed(1)) : 0;

    return {
        appointments: {
            percentage,
            period: `${monthStart.format('DD.MM')}-${observationDay.format('DD.MM')}`,
            onlineRecords: recordsCount,
            totalServices: checksCount,
            source: 'active-adapter-yclients-records / paid-adapter-elkassa-services',
            drilldown: [{ name: `Период (${monthStart.format('DD.MM.YYYY')}-${observationDay.format('DD.MM.YYYY')})`, value: `${recordsCount} / ${checksCount} записей / услуг`, trend: percentage >= 30 ? 'up' : 'down', masters: apptMasters }]
        },
        occupancy: {
            value: networkAvg,
            period: `${monthStart.format('DD.MM')}-${observationDay.format('DD.MM')}`,
            activeDays: netDays,
            drilldown: [{ name: 'Ср. чеков в рабочий день', value: `${networkAvg} ч/д`, trend: networkAvg >= 8 ? 'up' : 'down', masters: formatOccupancyDrilldown(occupancyMap) }]
        }
    };
}

function calcOvnMetric(monthStart, observationDay) {
    const reportsPath = OVN_REPORTS_PATH;
    const reports = fs.existsSync(reportsPath) ? JSON.parse(fs.readFileSync(reportsPath, 'utf8')) : [];
    const branchData = {};
    Object.keys(getAdapterObject()).forEach(loc => { branchData[loc] = { total: 0, ok: 0, masters: {} }; });
    const topViolators = {};
    const topViolations = {};
    let total = 0, ok = 0;

    reports.filter(r => {
        const text = [r && r.violation, r && r.notes, r && r.forceMajeureType]
            .map(value => String(value || '').toLowerCase())
            .join(' ');
        const isLatesReport = Boolean(
            r && (
                r.schedTime ||
                r.isForceMajeure ||
                r.fineWaived ||
                r.forceMajeureType ||
                text.includes('мастер опоздал') ||
                text.includes('опоздан') ||
                text.includes('не вышел') ||
                text.includes('невыход') ||
                text.includes('форс')
            )
        );
        return !isLatesReport;
    }).forEach(r => {
        const d = dayjs(r.date || r.createdAt);
        if (!d.isValid() || d.isBefore(monthStart, 'day') || d.isAfter(observationDay, 'day')) return;
        total++;
        const lowV = String(r.violation || '').toLowerCase();
        const isOk = lowV.includes('нет') || lowV.includes('✅');
        const isLate = lowV.includes('мастер опоздал');
        if (isOk) ok++;

        if (!isOk && !isLate) {
            const masterName = r.barber || 'Неизвестно';
            topViolators[masterName] = (topViolators[masterName] || 0) + 1;
            String(r.violation || '').split(',').map(v => v.trim()).filter(Boolean).forEach(v => {
                const key = v.toLowerCase();
                if (key.includes('нет') || key.includes('✅') || key.includes('мастер опоздал')) return;
                topViolations[v] = (topViolations[v] || 0) + 1;
            });
        }

        const loc = r.location || 'Неизвестно';
        if (!branchData[loc]) branchData[loc] = { total: 0, ok: 0, masters: {} };
        branchData[loc].total++;
        if (isOk) branchData[loc].ok++;
        const b = r.barber || 'Неизвестно';
        if (!branchData[loc].masters[b]) branchData[loc].masters[b] = { total: 0, ok: 0 };
        branchData[loc].masters[b].total++;
        if (isOk) branchData[loc].masters[b].ok++;
    });

    const value = total > 0 ? Math.round((ok / total) * 100) : 0;
    return {
        value,
        period: `${monthStart.format('DD.MM')}-${observationDay.format('DD.MM')}`,
        passed: ok,
        total,
        tops: {
            violators: Object.entries(topViolators).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
            violations: Object.entries(topViolations).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
        },
        drilldown: Object.keys(branchData).map(loc => {
            const bD = branchData[loc];
            const rate = bD.total > 0 ? Math.round((bD.ok / bD.total) * 100) : 0;
            return {
                name: loc,
                value: `${rate}% (${bD.ok}/${bD.total})`,
                trend: rate >= 80 ? 'up' : 'down',
                masters: Object.keys(bD.masters).sort().map(m => {
                    const mD = bD.masters[m];
                    const mRate = mD.total > 0 ? Math.round((mD.ok / mD.total) * 100) : 0;
                    return { name: m, v: `${mRate}% (${mD.ok} из ${mD.total})` };
                })
            };
        })
    };
}

function calcLatenessMetric(monthStart, observationDay) {
    const reports = fs.existsSync(OVN_REPORTS_PATH) ? JSON.parse(fs.readFileSync(OVN_REPORTS_PATH, 'utf8')) : [];
    const metric = calculateLatenessMetric(reports, monthStart.format('YYYY-MM-DD'), observationDay.format('YYYY-MM-DD'));
    return {
        ...metric,
        period: `${monthStart.format('DD.MM')}–${observationDay.format('DD.MM')}`,
        cardValue: metric.noData ? 'нет данных' : `${metric.value}%`,
        cardDetail: metric.noData ? 'Проверки прихода отсутствуют' : `${metric.late} из ${metric.total} проверок с опозданием`,
        source: 'ovn_reports.json: time vs schedTime'
    };
}

function addMonth(metrics, key, monthStart, metric) {
    metrics[key].months.push({
        key: monthStart.format('YYYY-MM'),
        label: formatRuMonth(monthStart),
        ...metric
    });
}

function emptyResult(now) {
    return {
        generatedAt: now.format('YYYY-MM-DD HH:mm:ss'),
        generatedBy: 'scripts/generate_analytics_history.js',
        months: [],
        metrics: {
            returnRate: { title: 'Return Rate', months: [] },
            cycle: { title: 'Цикл визита', months: [] },
            appointments: { title: 'Онлайн-записи', months: [] },
            occupancy: { title: 'Заполняемость', months: [] },
            ovnQuality: { title: 'Качество сервиса (ОВН)', months: [] },
            latenessRate: { title: 'Процент опозданий', months: [] },
        }
    };
}

function getLatestMonth(metrics, key) {
    const months = metrics[key] && Array.isArray(metrics[key].months) ? metrics[key].months : [];
    return months[months.length - 1] || null;
}

function applyCurrentDataJsonSnapshot(metrics, now) {
    const dataPath = DATA_PATH;
    if (!fs.existsSync(dataPath)) return;

    let data = null;
    try { data = JSON.parse(fs.readFileSync(dataPath, 'utf8')); }
    catch (e) {
        console.warn('[history] data.json read failed:', e.message);
        return;
    }

    const currentKey = now.format('YYYY-MM');
    const patches = {
        returnRate: data.returnRate,
        cycle: data.cycle,
        appointments: data.appointments,
        occupancy: data.occupancy,
    };

    Object.entries(patches).forEach(([key, metric]) => {
        if (!metric || !metrics[key]) return;
        const latest = getLatestMonth(metrics, key);
        if (!latest || latest.key !== currentKey) return;
        const cardDetails = {
            returnRate: metric.drilldown && metric.drilldown[0] ? metric.drilldown[0].value : '',
            cycle: 'Медиана дней между визитами',
            appointments: metric.drilldown && metric.drilldown[0] ? metric.drilldown[0].value : 'Записи от общего числа услуг',
            occupancy: 'Ср. чеков в раб. день (>2)',
        };
        const cardValues = {
            returnRate: `${metric.value || 0}%`,
            cycle: `${metric.value || 0}д`,
            appointments: `${metric.percentage || 0}%`,
            occupancy: `${metric.value || 0}`,
        };
        Object.assign(latest, JSON.parse(JSON.stringify(metric)), {
            key: currentKey,
            label: formatRuMonth(now.startOf('month')),
            cardValue: cardValues[key],
            cardDetail: cardDetails[key],
            source: 'data.json-current-snapshot'
        });
    });
}

function sortAndTrimHistory(result) {
    const monthSet = new Set();
    Object.values(result.metrics).forEach(metric => {
        (metric.months || []).forEach(item => { if (item && item.key) monthSet.add(item.key); });
    });
    result.months = Array.from(monthSet).sort().slice(-12);
    Object.values(result.metrics).forEach(metric => {
        metric.months = (metric.months || [])
            .filter(item => result.months.includes(item.key))
            .sort((a, b) => a.key.localeCompare(b.key));
    });
}

function loadExistingHistory(now) {
    const historyPath = HISTORY_PATH;
    if (!fs.existsSync(historyPath)) return emptyResult(now);
    try {
        const existing = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        if (existing && existing.metrics) return existing;
    } catch (e) {
        console.warn('[history] existing history read failed:', e.message);
    }
    return emptyResult(now);
}

async function calculateMonth(monthStart, now, ekContext = null) {
    const isCurrent = monthStart.isSame(now, 'month');
    const observationDay = isCurrent ? now.subtract(1, 'day') : monthStart.endOf('month');
    const context = ekContext || await buildEkContext([monthStart], now);
    console.log(`[history] ${monthStart.format('YYYY-MM')} observation=${observationDay.format('YYYY-MM-DD')}`);
    const clients = await calcClientsMetrics(observationDay, context);
    const online = await calcOnlineMetrics(monthStart, observationDay, context);
    return {
        returnRate: clients.returnRate,
        cycle: clients.cycle,
        appointments: online.appointments,
        occupancy: online.occupancy,
        ovnQuality: calcOvnMetric(monthStart, observationDay)
        ,latenessRate: calcLatenessMetric(monthStart, observationDay)
    };
}

async function auditMonth(monthKey) {
    const monthStart = dayjs(`${monthKey}-01`, 'YYYY-MM-DD', true);
    if (!monthStart.isValid() || monthStart.format('YYYY-MM') !== monthKey) {
        throw new Error(`Invalid --audit-month value: ${monthKey}`);
    }
    const now = getMoscowNow();
    const calculated = await calculateMonth(monthStart, now);
    const result = {
        auditedAt: now.format('YYYY-MM-DD HH:mm:ss'),
        month: monthKey,
        metrics: calculated,
    };
    writeJsonAtomic(HISTORY_PATH, result);
    console.log(`[history] audit saved ${monthKey}`);
}

async function finalizePreviousMonth() {
    const now = getMoscowNow();
    const monthStart = now.subtract(1, 'month').startOf('month');
    const monthKey = monthStart.format('YYYY-MM');
    const result = loadExistingHistory(now);
    if (!result.metrics.latenessRate) result.metrics.latenessRate = { title: 'Процент опозданий', months: [] };
    const force = process.argv.includes('--force');

    const monthIsComplete = Object.values(result.metrics).every(metric =>
        Array.isArray(metric.months) && metric.months.some(item => item.key === monthKey)
    );
    if (!force && monthIsComplete) {
        console.log(`[history] ${monthKey} already exists, keeping fixed snapshot`);
        return;
    }

    const calculated = await calculateMonth(monthStart, now);
    Object.entries(calculated).forEach(([key, metric]) => {
        result.metrics[key].months = (result.metrics[key].months || []).filter(item => item.key !== monthKey);
        addMonth(result.metrics, key, monthStart, { ...metric, source: 'month-end-fixed' });
    });
    const latenessMonthKeys = [...new Set([...(result.months || []), monthKey])].sort();
    result.metrics.latenessRate.months = latenessMonthKeys.map(key => {
        const start = dayjs(`${key}-01`);
        return { key, label: formatRuMonth(start), ...calcLatenessMetric(start, start.endOf('month')), source: 'month-end-fixed' };
    });
    result.generatedAt = now.format('YYYY-MM-DD HH:mm:ss');
    sortAndTrimHistory(result);
    writeJsonAtomic(HISTORY_PATH, result);
    console.log(`[history] finalized ${monthKey}`);
}

async function main() {
    const now = getMoscowNow();
    const months = buildMonthList(now);
    const metrics = {
        returnRate: { title: 'Return Rate', months: [] },
        cycle: { title: 'Цикл визита', months: [] },
        appointments: { title: 'Онлайн-записи', months: [] },
        occupancy: { title: 'Заполняемость', months: [] },
        ovnQuality: { title: 'Качество сервиса (ОВН)', months: [] },
        latenessRate: { title: 'Процент опозданий', months: [] },
    };

    const ekContext = await buildEkContext(months, now);

    for (const monthStart of months) {
        const isCurrent = monthStart.isSame(now, 'month');
        const observationDay = isCurrent ? now.subtract(1, 'day') : monthStart.endOf('month');
        console.log(`[history] ${monthStart.format('YYYY-MM')} observation=${observationDay.format('YYYY-MM-DD')}`);
        const clients = await calcClientsMetrics(observationDay, ekContext);
        const online = await calcOnlineMetrics(monthStart, observationDay, ekContext);
        addMonth(metrics, 'returnRate', monthStart, clients.returnRate);
        addMonth(metrics, 'cycle', monthStart, clients.cycle);
        addMonth(metrics, 'appointments', monthStart, online.appointments);
        addMonth(metrics, 'occupancy', monthStart, online.occupancy);
        addMonth(metrics, 'ovnQuality', monthStart, calcOvnMetric(monthStart, observationDay));
        addMonth(metrics, 'latenessRate', monthStart, calcLatenessMetric(monthStart, observationDay));
    }

    applyCurrentDataJsonSnapshot(metrics, now);
    const result = {
        generatedAt: now.format('YYYY-MM-DD HH:mm:ss'),
        generatedBy: 'scripts/generate_analytics_history.js',
        months: months.map(m => m.format('YYYY-MM')),
        metrics
    };
    writeJsonAtomic(HISTORY_PATH, result);
    console.log('[history] saved analytics_history.json');
}

const auditMonthArg = process.argv.find(arg => arg.startsWith('--audit-month='));
const run = auditMonthArg
    ? () => auditMonth(auditMonthArg.split('=')[1])
    : (process.argv.includes('--finalize-prev-month') ? finalizePreviousMonth : main);

run().catch(err => {
    console.error('[history] failed:', err);
    process.exit(1);
});
