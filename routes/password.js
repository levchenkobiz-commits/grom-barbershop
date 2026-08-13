/**
 * routes/password.js
 * POST /api/me/password — смена своего пароля текущим пользователем.
 *
 * Тело: { newPassword: string }
 * Ответ: { status: 'ok' } или { error: string }
 *
 * Правила:
 *  - длина ≥ 4 символа
 *  - не равен текущему логину (key)
 *  - не пустой
 *  - после успешной смены флаг must_change_password снимается
 *
 * Авторизация: любая роль (по X-User-Key из auth.identify).
 */

const fs    = require('fs');
const PATHS = require('./paths');

const MIN_LENGTH = 4;

function handleChangePassword(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const user = req.authUser;
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            }

            const { newPassword } = JSON.parse(body || '{}');
            const pwd = String(newPassword || '').trim();

            if (!pwd) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Укажите новый пароль' }));
            }
            if (pwd.length < MIN_LENGTH) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: `Минимум ${MIN_LENGTH} символов` }));
            }
            if (pwd === user.key) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Пароль не должен совпадать с логином' }));
            }

            // Перечитать roles.json (мог измениться с момента авторизации)
            if (!fs.existsSync(PATHS.roles)) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Файл пользователей недоступен' }));
            }
            const roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));
            const key   = user.key;

            if (!roles[key]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Пользователь не найден' }));
            }
            if (roles[key].blocked === true) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Учётка заблокирована' }));
            }

            // Применить смену
            roles[key].password = pwd;
            roles[key].must_change_password = false;

            fs.writeFileSync(PATHS.roles, JSON.stringify(roles, null, 2), 'utf-8');
            console.log(`[Password] changed for user ${key}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        } catch (e) {
            console.error('[Password] error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сервера' }));
        }
    });
}

/**
 * POST /api/admin/reset-password — сброс пароля пользователя (только owner/manager).
 * Тело: { login: string }
 * Ставит password = login и must_change_password = true.
 */
function handleAdminResetPassword(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const { login } = JSON.parse(body || '{}');
            const key = String(login || '').trim().toLowerCase();
            if (!key) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Укажите login' }));
            }

            const roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));
            if (!roles[key]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Пользователь не найден' }));
            }
            if (roles[key].role !== 'master') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Сбросить пароль можно только мастеру' }));
            }

            roles[key].password = key;
            roles[key].must_change_password = true;
            if (roles[key].blocked === true) delete roles[key].blocked;

            fs.writeFileSync(PATHS.roles, JSON.stringify(roles, null, 2), 'utf-8');
            console.log(`[Password] admin reset for ${key}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', login: key, password: key }));
        } catch (e) {
            console.error('[Password] admin reset error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сервера' }));
        }
    });
}

module.exports = { handleChangePassword, handleAdminResetPassword, MIN_LENGTH };
