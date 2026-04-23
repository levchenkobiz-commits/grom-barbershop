/**
 * routes/router.js
 * Главный роутер — направляет запросы в нужный обработчик.
 * Добавить новый маршрут = 1 строка здесь + новый файл в routes/.
 */

const fs      = require('fs');
const path    = require('path');
const PATHS   = require('./paths');

const ovn      = require('./ovn');
const salary   = require('./salary');
const schedule = require('./schedule');
const handbook = require('./handbook');
const uploads  = require('./uploads');
const sync     = require('./sync');
const manager  = require('./manager');
const adapter  = require('./adapter');

/**
 * Таблица маршрутов: { метод, путь, обработчик }
 * Обработчик получает (req, res, parsedUrl)
 */
const ROUTES = [
  { method: 'POST', path: '/api/sync',           handler: (q, r) => sync.handlePost(q, r) },
  { method: 'GET',  path: '/api/sync_status',    handler: (q, r) => sync.handleGetStatus(q, r) },

  { method: 'GET',  path: '/api/ovn',            handler: (q, r) => ovn.handleGet(q, r) },
  { method: 'POST', path: '/api/ovn',            handler: (q, r) => ovn.handlePost(q, r) },
  { method: 'PUT',  path: '/api/ovn',            handler: (q, r) => ovn.handlePut(q, r) },

  { method: 'POST', path: '/api/fetch_salary',   handler: (q, r) => salary.handlePost(q, r) },

  { method: 'GET',  path: '/api/schedule',       handler: (q, r) => schedule.handleGetSchedule(q, r) },
  { method: 'POST', path: '/api/schedule',       handler: (q, r) => schedule.handlePostSchedule(q, r) },
  { method: 'GET',  path: '/api/me',             handler: (q, r, u) => schedule.handleGetMe(q, r, u) },
  { method: 'POST', path: '/api/me/schedule',    handler: (q, r, u) => schedule.handlePostMySchedule(q, r, u) },

  { method: 'GET',  path: '/api/handbook',       handler: (q, r) => handbook.handleGet(q, r) },
  { method: 'POST', path: '/api/handbook',       handler: (q, r) => handbook.handlePost(q, r) },

  { method: 'POST', path: '/api/upload',         handler: (q, r) => uploads.handleUpload(q, r) },
  { method: 'POST', path: '/api/vision',         handler: (q, r) => uploads.handleVision(q, r) },

  { method: 'GET',  path: '/api/manager_checks', handler: (q, r) => manager.handleGet(q, r) },
  { method: 'POST', path: '/api/manager_checks', handler: (q, r) => manager.handlePost(q, r) },

  { method: 'POST', path: '/api/adapter',        handler: (q, r) => adapter.handlePost(q, r) },
];

/**
 * Основная функция маршрутизации.
 * Возвращает true если маршрут найден и обработан, false — если нет.
 */
function route(req, res, parsedUrl) {
  const { pathname } = parsedUrl;

  // Статика для загруженных фото
  if (pathname.startsWith('/manager_uploads/')) {
    const fn = path.basename(pathname);
    const p  = path.join(PATHS.uploadsDir, fn);
    if (fs.existsSync(p)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(p).pipe(res);
      return true;
    }
    res.writeHead(404); res.end('Not found');
    return true;
  }

  // Поиск в таблице маршрутов
  const match = ROUTES.find(r => r.method === req.method && r.path === pathname);
  if (match) {
    match.handler(req, res, parsedUrl);
    return true;
  }

  return false; // передаём управление раздатчику статики
}

module.exports = { route };
