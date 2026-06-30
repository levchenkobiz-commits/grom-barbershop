/**
 * routes/login.js
 * POST /api/login — авторизация по логину и паролю
 *
 * Тело запроса: { login: string, password: string }
 * Ответ: { status: 'ok', user: { name, role, ... } }
 *    или: { error: 'Неверный логин или пароль' }
 */

const fs    = require('fs');
const PATHS = require('./paths');

function handleLogin(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const { login, password } = JSON.parse(body);
            if (!login || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Укажите логин и пароль' }));
            }

            const rolesRaw = fs.existsSync(PATHS.roles)
                ? fs.readFileSync(PATHS.roles, 'utf-8')
                : '{}';
            const roles = JSON.parse(rolesRaw);

            // Ищем пользователя по ключу (login) и сверяем password
            const key  = String(login).trim().toLowerCase();
            const user = roles[key];

            if (!user || user.password !== String(password).trim()) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Неверный логин или пароль' }));
            }

            // Возвращаем профиль без поля password
            const { password: _omit, ...profile } = user;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', key, user: profile }));

        } catch (e) {
            console.error('[Login] error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сервера' }));
        }
    });
}

module.exports = { handleLogin };
