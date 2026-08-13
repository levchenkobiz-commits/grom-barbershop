/**
 * routes/users.js
 * GET /api/admin/users — список пользователей для менеджера.
 *
 * Возвращает массив объектов:
 *   { login, name, role, location, status, mustChangePassword, temporaryPassword }
 *
 * status:
 *   - 'active'           — обычный активный пользователь
 *   - 'must_change'      — мастер с must_change_password=true (временный пароль)
 *   - 'blocked'          — мастер удалён из адаптера, вход заблокирован
 *
 * temporaryPassword показывается только если мастер ещё не сменил пароль
 * (must_change_password === true) — чтобы менеджер мог выдать доступ мастеру.
 */

const fs    = require('fs');
const PATHS = require('./paths');

function handleListUsers(req, res) {
    try {
        if (!fs.existsSync(PATHS.roles)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ users: [] }));
        }
        const roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));

        const users = Object.entries(roles).map(([login, u]) => {
            const blocked = u.blocked === true;
            const mustChange = u.must_change_password === true;
            let status = 'active';
            if (blocked) status = 'blocked';
            else if (mustChange) status = 'must_change';

            return {
                login,
                name: u.name || '',
                role: u.role || '',
                location: u.location || '',
                status,
                mustChangePassword: mustChange,
                // Временный пароль показываем только пока мастер его не сменил
                temporaryPassword: (u.role === 'master' && mustChange && !blocked) ? (u.password || '') : '',
            };
        });

        // Сортировка: сначала активные мастера, потом must_change, потом заблокированные
        const order = { master: 0, manager: 1, owner: 2, ovn: 3 };
        users.sort((a, b) => {
            const ra = order[a.role] !== undefined ? order[a.role] : 9;
            const rb = order[b.role] !== undefined ? order[b.role] : 9;
            if (ra !== rb) return ra - rb;
            return String(a.name).localeCompare(String(b.name), 'ru');
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ users }));
    } catch (e) {
        console.error('[Users] list error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

module.exports = { handleListUsers };
