/**
 * routes/auth.js
 * =====================================================
 * Серверная проверка ролей — зеркало клиентского permissions.js.
 *
 * ⚠️  ПРАВИЛА:
 * ─────────────────────────────────────────────────────
 * 1. Если добавляешь новый маршрут в router.js и он
 *    требует авторизации — добавь его в ROUTE_PERMS.
 *
 * 2. Маршруты без записи в ROUTE_PERMS — открыты для всех
 *    (login, public, GET-запросы к расписанию и т.д.)
 * ─────────────────────────────────────────────────────
 *
 * Зависимости: paths.js (для чтения roles.json)
 */

const fs    = require('fs');
const PATHS = require('./paths');

/**
 * Таблица: маршрут → какие роли разрешены.
 * Формат: 'METHOD /path' → ['role1', 'role2', ...]
 *
 * Если маршрута нет в таблице — доступ без ограничений.
 */
const ROUTE_PERMS = {
    'GET /api/ovn':                 ['owner', 'manager', 'ovn', 'master'],
    // ── Расписание ──
    'POST /api/schedule':           ['owner', 'manager', 'ovn'],

    // ── ОВН проверки ──
    'POST /api/ovn':                ['owner', 'manager', 'ovn'],
    'PUT /api/ovn':                 ['owner', 'manager', 'ovn'],
    'PATCH /api/ovn/reaction':      ['owner', 'manager'],

    // ── Менеджерские проверки ──
    'POST /api/manager_checks':     ['owner', 'manager'],
    'PUT /api/manager_checks':      ['owner', 'manager'],

    // ── Настройки адаптер ──
    'POST /api/adapter':            ['owner', 'manager'],
    'GET /api/video-audit':          ['owner', 'manager', 'ovn'],
    'POST /api/video-audit':         ['owner', 'manager', 'ovn'],
    'PATCH /api/video-audit':        ['owner', 'manager', 'ovn'],
    'GET /api/video-audit/events':   ['owner'],
    'GET /api/video-audit/frame':    ['owner'],
    'PATCH /api/video-audit/events': ['owner'],
    'GET /api/video-audit/training': ['owner'],
    'GET /api/video-audit/training/export': ['owner'],
    'POST /api/video-audit/training/import': ['owner'],

    // ── График управляющих ──
    'POST /api/manager-schedule':   ['owner', 'manager'],
    'PATCH /api/manager-schedule':  ['owner', 'manager'],

    // ── Справочник ──
    'POST /api/handbook':           ['owner', 'manager'],

    // ── Зарплата ──
    'POST /api/fetch_salary':       ['owner', 'manager'],
};

/**
 * Определяет роль пользователя из заголовка X-User-Key.
 * Клиент отправляет ключ из localStorage (login key).
 *
 * @returns {{ key: string, role: string, name: string } | null}
 */
function identify(req) {
    const userKey = req.headers['x-user-key'];
    if (!userKey) return null;

    try {
        const rolesRaw = fs.existsSync(PATHS.roles)
            ? fs.readFileSync(PATHS.roles, 'utf-8')
            : '{}';
        const roles = JSON.parse(rolesRaw);
        const user  = roles[userKey];
        if (user) return { key: userKey, role: user.role, name: user.name };
    } catch (e) {
        console.error('[Auth] Error reading roles:', e.message);
    }
    return null;
}

/**
 * Middleware-функция.
 * Вызывается перед обработчиком маршрута.
 *
 * @returns {boolean} true = доступ разрешён, false = отклонён (ответ уже отправлен)
 */
function authorize(req, res, pathname) {
    const routeKey = `${req.method} ${pathname}`;
    const allowedRoles = ROUTE_PERMS[routeKey];

    // Маршрут не защищён — пропускаем
    if (!allowedRoles) {
        req.authUser = identify(req);
        return true;
    }

    const user = identify(req);
    if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Требуется авторизация' }));
        return false;
    }

    const isKseniaManagerSchedule = user.key === 'ksenia' && (
        routeKey === 'POST /api/manager-schedule' ||
        routeKey === 'PATCH /api/manager-schedule'
    );

    if (!allowedRoles.includes(user.role) && !isKseniaManagerSchedule) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Недостаточно прав' }));
        return false;
    }

    // Прикрепляем пользователя к запросу для использования в обработчике
    req.authUser = user;
    return true;
}

module.exports = { authorize, identify, ROUTE_PERMS };
