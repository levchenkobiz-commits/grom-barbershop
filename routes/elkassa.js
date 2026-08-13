/**
 * routes/elkassa.js
 * FINANCIAL INPUT — DO NOT TOUCH salary aggregation without explicit user authorization.
 * Mandatory instructions: /root/grom-dashboard/AGENTS.md
 * Прокси к El-Kassa API v2 — все запросы идут через сервер,
 * чтобы не светить Bearer-токен во фронте.
 *
 * Маршруты:
 *   GET /api/elkassa/terminals          → /api2/terminal/list
 *   GET /api/elkassa/orders             → /api2/order/list
 *   GET /api/elkassa/customers          → /api2/customer/list
 *   GET /api/elkassa/customer-orders    → /api2/customer/order
 *   GET /api/elkassa/customer-orders-last → /api2/customer/order-last
 *   POST /api/elkassa/salary            → агрегация выручки по мастерам (замена скрейпера)
 */

const https = require('https');
const http  = require('http');
const fs = require('fs');
const path = require('path');
const { canonicalMasterName, getMasterAliases, filterNamedObject } = require('./master_scope');

const EK_BASE  = 'http://el-kassa.online';
const EK_TOKEN = process.env.ELKASSA_TOKEN || 'U4TSoYefFjtp3BwLxm5ZkntjPUKo4uDGyNFdb8qfzC98piFkUJs8FwoADPX36Goc';
const EK_PAGE_SIZE = 2000;

function parseRuDate(value) {
  const m = String(value || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

function formatRuDate(date) {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function addUtcDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getMoscowTodayDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

/**
 * Выполнить GET-запрос к El-Kassa API.
 * @param {string} path  — путь вида /api2/order/list
 * @param {object} params — query-параметры (будут добавлены к URL)
 * @returns {Promise<any>} — распарсенный JSON
 */
function ekGet(path, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const fullUrl = `${EK_BASE}${path}${qs ? '?' + qs : ''}`;
    const parsed  = new URL(fullUrl);
    const lib     = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers: {
        'Authorization': `Bearer ${EK_TOKEN}`,
        'Accept':        'application/json',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Получить ВСЕ страницы эндпоинта с пагинацией.
 * Возвращает массив всех items.
 */
async function ekGetAll(path, params = {}, itemsKey = 'items') {
  const pageSize = Number(params.page_items) || EK_PAGE_SIZE;
  let page = 1;
  let all  = [];

  while (true) {
    const { page_items: _ignoredPageItems, ...requestParams } = params;
    const { status, body } = await ekGet(path, { ...requestParams, page, page_items: pageSize });
    if (status !== 200) throw new Error(`El-Kassa API error ${status}: ${JSON.stringify(body)}`);

    // Если ответ — массив (без пагинации, как terminal/list)
    if (Array.isArray(body)) return body;

    const items = body[itemsKey] || [];
    all = all.concat(items);

    const pagination = body.pagination || {};
    const total      = pagination.total_items || 0;

    if (all.length >= total || items.length === 0) break;
    page++;
  }

  return all;
}

// ─────────────────────────────────────────────
//  Хэндлеры маршрутов
// ─────────────────────────────────────────────

/** GET /api/elkassa/terminals */
async function handleTerminals(req, res) {
  try {
    const data = await ekGetAll('/api2/terminal/list');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (e) {
    console.error('[ElKassa] terminals error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/** GET /api/elkassa/orders?date=...&terminal=...&typePay=...&elType=...&name=...&page=...&page_items=... */
async function handleOrders(req, res, parsedUrl) {
  try {
    const sp = parsedUrl.searchParams;
    const params = {};
    for (const key of ['date', 'terminal', 'elType', 'typePay', 'name', 'page', 'page_items']) {
      if (sp.get(key)) params[key] = sp.get(key);
    }

    // Если нет явной страницы — вернуть всё разом
    const usePagination = sp.has('page');
    if (usePagination) {
      const { status, body } = await ekGet('/api2/order/list', params);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    } else {
      const items = await ekGetAll('/api2/order/list', params);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items }));
    }
  } catch (e) {
    console.error('[ElKassa] orders error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/** GET /api/elkassa/customers?dateCreated=...&name=...&phone=...&access=...&terminal=... */
async function handleCustomers(req, res, parsedUrl) {
  try {
    const sp = parsedUrl.searchParams;
    const params = {};
    for (const key of ['dateCreated', 'name', 'phone', 'access', 'terminal', 'page', 'page_items']) {
      if (sp.get(key)) params[key] = sp.get(key);
    }
    const items = await ekGetAll('/api2/customer/list', params);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items }));
  } catch (e) {
    console.error('[ElKassa] customers error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/** GET /api/elkassa/customer-orders?date=...&userName=...&phone=...&terminal=... */
async function handleCustomerOrders(req, res, parsedUrl) {
  try {
    const sp = parsedUrl.searchParams;
    const params = {};
    for (const key of ['date', 'userName', 'phone', 'terminal', 'page', 'page_items']) {
      if (sp.get(key)) params[key] = sp.get(key);
    }
    const items = await ekGetAll('/api2/customer/order', params);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items }));
  } catch (e) {
    console.error('[ElKassa] customer-orders error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/** GET /api/elkassa/customer-orders-last?date=...&lastDays=...&userName=...&phone=...&terminal=... */
async function handleCustomerOrdersLast(req, res, parsedUrl) {
  try {
    const sp = parsedUrl.searchParams;
    const params = {};
    for (const key of ['date', 'lastDays', 'userName', 'phone', 'terminal', 'page', 'page_items']) {
      if (sp.get(key)) params[key] = sp.get(key);
    }
    const items = await ekGetAll('/api2/customer/order-last', params);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items }));
  } catch (e) {
    console.error('[ElKassa] customer-orders-last error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/**
 * POST /api/elkassa/salary
 * Body: { start: "dd.mm.yyyy", end: "dd.mm.yyyy" }
 *
 * Заменяет elkassa_scraper.js — получает выручку по мастерам напрямую через API.
 * Возвращает { revenue: { "Имя": сумма }, workDays: { "Имя": кол-во } }
 */
async function handleSalary(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { start, end, excludeOpenDay = true } = JSON.parse(body);
      if (!start || !end) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Укажите start и end (dd.mm.yyyy)' }));
      }

      const requestedStartDate = parseRuDate(start);
      const requestedEndDate = parseRuDate(end);
      if (!requestedStartDate || !requestedEndDate) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Неверный формат дат. Используйте dd.mm.yyyy' }));
      }

      let effectiveStartDate = requestedStartDate;
      let effectiveEndDate = requestedEndDate;

      if (excludeOpenDay !== false) {
        const todayMoscow = getMoscowTodayDate();
        if (effectiveEndDate >= todayMoscow) {
          effectiveEndDate = addUtcDays(todayMoscow, -1);
        }
      }

      const meta = {
        requestedStart: start,
        requestedEnd: end,
        effectiveStart: formatRuDate(effectiveStartDate),
        effectiveEnd: formatRuDate(effectiveEndDate),
        excludeOpenDay: excludeOpenDay !== false,
        dateClamped: effectiveEndDate.getTime() !== requestedEndDate.getTime(),
      };

      if (effectiveEndDate < effectiveStartDate) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          revenue: {},
          workDays: {},
          daily: {},
          dailyCounts: {},
          terminalsByDay: {},
          terminalSetsByDay: {},
          ordersCount: 0,
          ...meta,
        }));
      }

      // Форматируем в нужный формат API: "dd.mm.yyyy HH:MM - dd.mm.yyyy HH:MM"
      const effectiveStart = formatRuDate(effectiveStartDate);
      const effectiveEnd = formatRuDate(effectiveEndDate);
      const dateParam = `${effectiveStart} 00:00 - ${effectiveEnd} 23:59`;

      console.log(`[ElKassa] Salary fetch: ${dateParam}`);
      const orders = await ekGetAll('/api2/order/list', { date: dateParam });

      // Агрегируем по сотрудникам
      const revenue  = {};
      const workDays = {};
      const daysSeen = {}; // { "Имя": Set<"dd.mm.yyyy"> }
      const daily    = {}; // { "Имя": { "dd.mm.yyyy": сумма } }
      const dailyCounts = {}; // { "Имя": { "dd.mm.yyyy": количество заказов } }
      const terminalsByDay = {}; // { "Имя": { "dd.mm.yyyy": "terminalNumber" } } — для доплаты за замену
      const terminalSetsByDay = {}; // { "Имя": { "dd.mm.yyyy": ["terminalNumber"] } }
      let acceptedOrdersCount = 0;

      for (const order of orders) {
        const name = canonicalMasterName((order.employeeName || '').trim());
        if (!name) continue;
        acceptedOrdersCount++;

        // Employee salary summary uses service turnover: paid money + redeemed
        // bonuses minus change. This matches El-Kassa "Прибыль".
        const turnover = (parseFloat(order.paid) || 0)
          + (parseFloat(order.paid_bonus) || 0)
          - (parseFloat(order.payout) || 0);
        revenue[name] = (revenue[name] || 0) + turnover;

        // Считаем уникальные рабочие дни + разбивка по дням
        const day = (order.date || '').split(' ')[0]; // "dd.mm.yyyy"
        if (day) {
          if (!daysSeen[name]) daysSeen[name] = new Set();
          daysSeen[name].add(day);
          if (!daily[name]) daily[name] = {};
          daily[name][day] = (daily[name][day] || 0) + turnover;
          if (!dailyCounts[name]) dailyCounts[name] = {};
          dailyCounts[name][day] = (dailyCounts[name][day] || 0) + 1;
          // Терминал, на котором пробит заказ (для определения замены)
          const term = String(order.terminal_number || '').trim();
          if (term) {
            if (!terminalsByDay[name]) terminalsByDay[name] = {};
            if (!terminalsByDay[name][day]) terminalsByDay[name][day] = term;
            if (!terminalSetsByDay[name]) terminalSetsByDay[name] = {};
            if (!terminalSetsByDay[name][day]) terminalSetsByDay[name][day] = [];
            if (!terminalSetsByDay[name][day].includes(term)) terminalSetsByDay[name][day].push(term);
          }
        }
      }

      for (const name in daysSeen) {
        workDays[name] = daysSeen[name].size;
      }

      const isMasterRequest = req.authUser && req.authUser.role === 'master';
      const aliases = isMasterRequest ? getMasterAliases(req.authUser.name) : null;
      const scopedRevenue = isMasterRequest ? filterNamedObject(revenue, aliases) : revenue;
      const scopedWorkDays = isMasterRequest ? filterNamedObject(workDays, aliases) : workDays;
      const scopedDaily = isMasterRequest ? filterNamedObject(daily, aliases) : daily;
      const scopedDailyCounts = isMasterRequest ? filterNamedObject(dailyCounts, aliases) : dailyCounts;
      const scopedTerminalsByDay = isMasterRequest ? filterNamedObject(terminalsByDay, aliases) : terminalsByDay;
      const scopedTerminalSetsByDay = isMasterRequest ? filterNamedObject(terminalSetsByDay, aliases) : terminalSetsByDay;
      const scopedOrdersCount = isMasterRequest
        ? Object.values(scopedDailyCounts).reduce((total, days) =>
            total + Object.values(days || {}).reduce((sum, count) => sum + (Number(count) || 0), 0), 0)
        : acceptedOrdersCount;

      console.log(`[ElKassa] Salary: ${Object.keys(scopedRevenue).length} мастеров, ${scopedOrdersCount} заказов`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        revenue: scopedRevenue,
        workDays: scopedWorkDays,
        daily: scopedDaily,
        dailyCounts: scopedDailyCounts,
        terminalsByDay: scopedTerminalsByDay,
        terminalSetsByDay: scopedTerminalSetsByDay,
        ordersCount: scopedOrdersCount,
        ...meta,
      }));

    } catch (e) {
      console.error('[ElKassa] salary error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'El-Kassa API error: ' + e.message }));
    }
  });
}

/**
 * GET /api/elkassa/staff?days=30&terminal=<term>
 * Возвращает уникальные имена мастеров (employeeName) из заказов El-Kassa.
 * Источник: /api2/order/list за последние N дней (отдельного API сотрудников нет).
 * @query days     — сколько дней назад смотреть (по умолчанию 30)
 * @query terminal — фильтр по терминалу (опционально)
 * @returns { ok, days, terminal, masters: ["Имя1", ...], byTerminal: { "25307": ["Имя1", ...] } }
 */
let _staffCache = null; // { ts, days, payload }
const STAFF_CACHE_TTL_MS = 60 * 60 * 1000;
const STAFF_CACHE_FILE = path.join(__dirname, '..', 'elkassa_staff_cache.json');
const STAFF_DISK_MAX_AGE_MS = 48 * 60 * 60 * 1000;

async function getStaffDirectory(daysArg = 90, forceRefresh = false) {
  const days = Math.min(Math.max(parseInt(daysArg, 10) || 90, 1), 90);
  const now = Date.now();
  if (!forceRefresh && _staffCache && _staffCache.days === days && (now - _staffCache.ts) < STAFF_CACHE_TTL_MS) {
    return _staffCache.payload;
  }
  if (!forceRefresh && fs.existsSync(STAFF_CACHE_FILE)) {
    try {
      const disk = JSON.parse(fs.readFileSync(STAFF_CACHE_FILE, 'utf8'));
      if (disk.days === days && now - new Date(disk.updatedAt).getTime() < STAFF_DISK_MAX_AGE_MS && disk.payload?.byTerminal) {
        _staffCache = { ts: new Date(disk.updatedAt).getTime(), days, payload: disk.payload };
        return disk.payload;
      }
    } catch (_) {}
  }
  const end = getMoscowTodayDate();
  const start = addUtcDays(end, -days);
  const dateParam = `${formatRuDate(start)} 00:00 - ${formatRuDate(end)} 23:59`;
  console.log(`[ElKassa] Staff fetch: ${dateParam}`);
  const orders = await ekGetAll('/api2/order/list', { date: dateParam });
  const byTerminal = {};
  for (const order of orders) {
    const name = (order.employeeName || '').trim();
    const term = String(order.terminal_number || '').trim();
    if (!name || !term) continue;
    if (!byTerminal[term]) byTerminal[term] = new Set();
    byTerminal[term].add(name);
  }
  const payload = {
    byTerminal: Object.fromEntries(Object.entries(byTerminal).map(([terminal, names]) => [terminal, Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'))])),
    masters: Array.from(new Set(Object.values(byTerminal).flatMap(names => Array.from(names)))).sort((a, b) => a.localeCompare(b, 'ru')),
  };
  _staffCache = { ts: now, days, payload };
  const temp = `${STAFF_CACHE_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify({ updatedAt: new Date(now).toISOString(), days, payload }, null, 2));
  fs.renameSync(temp, STAFF_CACHE_FILE);
  return payload;
}

async function handleStaff(req, res, parsedUrl) {
  try {
    const sp = parsedUrl.searchParams;
    const days = Math.min(Math.max(parseInt(sp.get('days'), 10) || 30, 1), 90);
    const terminalFilter = sp.get('terminal');
    const forceRefresh = sp.get('refresh') === '1';

    const payload = await getStaffDirectory(days, forceRefresh);
    _respondStaff(res, days, terminalFilter, payload);
  } catch (e) {
    console.error('[ElKassa] staff error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'El-Kassa API error: ' + e.message }));
  }
}

function _respondStaff(res, days, terminalFilter, payload) {
  const body = {
    ok: true,
    days,
    terminal: terminalFilter || null,
    masters: terminalFilter ? (payload.byTerminal[terminalFilter] || []) : payload.masters,
    byTerminal: payload.byTerminal,
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

module.exports = {
  ekGet,
  ekGetAll,
  handleTerminals,
  handleOrders,
  handleCustomers,
  handleCustomerOrders,
  handleCustomerOrdersLast,
  handleSalary,
  handleStaff,
  getStaffDirectory,
};
