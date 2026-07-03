/**
 * routes/router.js
 * Главный роутер — направляет запросы в нужный обработчик.
 * Добавить новый маршрут = 1 строка здесь + новый файл в routes/.
 */

const fs      = require('fs');
const path    = require('path');
const PATHS   = require('./paths');

const ovn         = require('./ovn');
const salary      = require('./salary');
const schedule    = require('./schedule');
const handbook    = require('./handbook');
const uploads     = require('./uploads');
const sync        = require('./sync');
const manager     = require('./manager');
const adapter     = require('./adapter');
const masterPhotos = require('./master_photos');
const mgrSchedule  = require('./manager_schedule');
const login        = require('./login');
const auth         = require('./auth');
const elkassa      = require('./elkassa');
const videoAudit   = require('./video_audit');


/**
 * Таблица маршрутов: { метод, путь, обработчик }
 * Обработчик получает (req, res, parsedUrl)
 */
const ROUTES = [
  { method: 'POST',   path: '/api/login',             handler: (q, r) => login.handleLogin(q, r) },

  { method: 'POST',   path: '/api/sync',              handler: (q, r) => sync.handlePost(q, r) },
  { method: 'GET',    path: '/api/sync_status',       handler: (q, r) => sync.handleGetStatus(q, r) },

  { method: 'GET',    path: '/api/ovn',               handler: (q, r) => ovn.handleGet(q, r) },
  { method: 'POST',   path: '/api/ovn',               handler: (q, r) => ovn.handlePost(q, r) },
  { method: 'PUT',    path: '/api/ovn',               handler: (q, r) => ovn.handlePut(q, r) },
  { method: 'PATCH',  path: '/api/ovn/reaction',      handler: (q, r) => ovn.handlePatchReaction(q, r) },

  { method: 'POST',   path: '/api/fetch_salary',      handler: (q, r) => salary.handlePost(q, r) },

  { method: 'GET',    path: '/api/schedule',          handler: (q, r) => schedule.handleGetSchedule(q, r) },
  { method: 'POST',   path: '/api/schedule',          handler: (q, r) => schedule.handlePostSchedule(q, r) },
  { method: 'GET',    path: '/api/me',                handler: (q, r, u) => schedule.handleGetMe(q, r, u) },
  { method: 'POST',   path: '/api/me/schedule',       handler: (q, r, u) => schedule.handlePostMySchedule(q, r, u) },

  { method: 'GET',    path: '/api/handbook',          handler: (q, r) => handbook.handleGet(q, r) },
  { method: 'POST',   path: '/api/handbook',          handler: (q, r) => handbook.handlePost(q, r) },

  { method: 'POST',   path: '/api/upload',            handler: (q, r) => uploads.handleUpload(q, r) },
  { method: 'POST',   path: '/api/vision',            handler: (q, r) => uploads.handleVision(q, r) },

  { method: 'GET',    path: '/api/manager_checks',    handler: (q, r) => manager.handleGet(q, r) },
  { method: 'POST',   path: '/api/manager_checks',    handler: (q, r) => manager.handlePost(q, r) },
  { method: 'PUT',    path: '/api/manager_checks',    handler: (q, r) => manager.handlePut(q, r) },

  { method: 'POST',   path: '/api/adapter',           handler: (q, r) => adapter.handlePost(q, r) },
  { method: 'GET',    path: '/api/video-audit/events', handler: (q, r, u) => videoAudit.handleGetEvents(q, r, u) },
  { method: 'GET',    path: '/api/video-audit/frame',  handler: (q, r, u) => videoAudit.handleGetFrame(q, r, u) },
  { method: 'PATCH',  path: '/api/video-audit/events', handler: (q, r, u) => videoAudit.handlePatchEvent(q, r, u) },
  { method: 'GET',    path: '/api/video-audit/training', handler: (q, r, u) => videoAudit.handleGetTraining(q, r, u) },
  { method: 'GET',    path: '/api/video-audit/training/export', handler: (q, r, u) => videoAudit.handleExportTraining(q, r, u) },
  { method: 'POST',   path: '/api/video-audit/training/import', handler: (q, r, u) => videoAudit.handleImportTraining(q, r, u) },

  // ===== Фото мастеров =====
  { method: 'POST',   path: '/api/master_photos',     handler: (q, r) => masterPhotos.handleUploadPhoto(q, r) },
  { method: 'GET',    path: '/api/master_photos',     handler: (q, r, u) => masterPhotos.handleGetPhotos(q, r, u) },
  { method: 'GET',    path: '/api/pending_photos',    handler: (q, r) => masterPhotos.handleGetPending(q, r) },
  { method: 'POST',   path: '/api/pending_photos',    handler: (q, r) => masterPhotos.handleAddPending(q, r) },
  { method: 'DELETE', path: '/api/pending_photos',    handler: (q, r, u) => masterPhotos.handleConfirmPhotos(q, r, u) },

  // ===== График управляющих =====
  { method: 'GET',    path: '/api/manager-schedule',  handler: (q, r) => mgrSchedule.handleGet(q, r) },
  { method: 'POST',   path: '/api/manager-schedule',  handler: (q, r) => mgrSchedule.handlePost(q, r) },
  { method: 'PATCH',  path: '/api/manager-schedule',  handler: (q, r) => mgrSchedule.handlePatch(q, r) },

  // ===== El-Kassa API (прямая интеграция) =====
  { method: 'GET',    path: '/api/elkassa/terminals',           handler: (q, r, u) => elkassa.handleTerminals(q, r, u) },
  { method: 'GET',    path: '/api/elkassa/orders',              handler: (q, r, u) => elkassa.handleOrders(q, r, u) },
  { method: 'GET',    path: '/api/elkassa/customers',           handler: (q, r, u) => elkassa.handleCustomers(q, r, u) },
  { method: 'GET',    path: '/api/elkassa/customer-orders',     handler: (q, r, u) => elkassa.handleCustomerOrders(q, r, u) },
  { method: 'GET',    path: '/api/elkassa/customer-orders-last',handler: (q, r, u) => elkassa.handleCustomerOrdersLast(q, r, u) },
  { method: 'POST',   path: '/api/elkassa/salary',              handler: (q, r, u) => elkassa.handleSalary(q, r, u) },
];

/**
 * Основная функция маршрутизации.
 * Возвращает true если маршрут найден и обработан, false — если нет.
 */
function route(req, res, parsedUrl) {
  const { pathname } = parsedUrl;

  // Статика для загруженных фото менеджера
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

  // Статика для фото мастеров (поддерживаем подпапки)
  if (pathname.startsWith('/master_photos/')) {
    const relative = pathname.replace('/master_photos/', '');
    const p = path.join(PATHS.masterPhotosDir, relative);
    if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
      const ext = path.extname(p).toLowerCase();
      const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'image/jpeg' });
      fs.createReadStream(p).pipe(res);
      return true;
    }
    res.writeHead(404); res.end('Not found');
    return true;
  }

  // Поиск в таблице маршрутов
  const match = ROUTES.find(r => r.method === req.method && r.path === pathname);
  if (match) {
    // Серверная проверка ролей (auth.js)
    if (!auth.authorize(req, res, pathname)) return true; // 401/403 уже отправлен
    match.handler(req, res, parsedUrl);
    return true;
  }

  return false; // передаём управление раздатчику статики
}

module.exports = { route };
