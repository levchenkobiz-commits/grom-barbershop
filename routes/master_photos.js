/**
 * routes/master_photos.js
 * Маршруты для фото мастеров:
 *   POST /api/master_photos         — загрузить фото (base64 или multipart)
 *   GET  /api/master_photos/:master — список фото мастера
 *   GET  /api/pending_photos        — список мастеров, ждущих фото
 *   POST /api/pending_photos        — добавить мастера в список ожидания
 *   DELETE /api/pending_photos/:master — убрать из ожидания (фото загружены)
 */

const fs    = require('fs');
const path  = require('path');
const PATHS = require('./paths');
const { sendOwnerPhoto, sendOwnerMessage } = require('./telegram_notify');

// ===== УТИЛИТЫ =====
function readPending() {
  if (!fs.existsSync(PATHS.pendingPhotos)) return [];
  try { return JSON.parse(fs.readFileSync(PATHS.pendingPhotos, 'utf-8')); }
  catch { return []; }
}
function writePending(list) {
  fs.writeFileSync(PATHS.pendingPhotos, JSON.stringify(list, null, 2));
}

function safeName(name) {
  return (name || '').replace(/[^a-zа-яёА-ЯЁA-Z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_');
}

// ===== POST /api/master_photos — загрузить фото =====
function handleUploadPhoto(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const { masterName, base64 } = JSON.parse(body);
      if (!masterName || !base64) throw new Error('masterName и base64 обязательны');

      const folderName = safeName(masterName);
      const masterDir  = path.join(PATHS.masterPhotosDir, folderName);
      if (!fs.existsSync(masterDir)) fs.mkdirSync(masterDir, { recursive: true });

      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const filename   = `photo_${Date.now()}.jpg`;
      const filePath = path.join(masterDir, filename);
      fs.writeFileSync(filePath, base64Data, 'base64');

      sendOwnerPhoto(filePath, `Фото фейда загружено менеджером\nМастер: ${masterName}`)
        .catch(error => console.error('[MasterPhoto] Telegram forward failed:', error.message));

      const pending = readPending().filter(item => item.masterName !== masterName);
      writePending(pending);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: `/master_photos/${folderName}/${filename}` }));
    } catch (e) {
      console.error('[MasterPhoto] upload error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ===== GET /api/master_photos?master=... — список фото мастера =====
function handleGetPhotos(req, res, parsedUrl) {
  try {
    const masterName = parsedUrl.searchParams.get('master') || '';
    const folderName = safeName(masterName);
    const masterDir  = path.join(PATHS.masterPhotosDir, folderName);

    let photos = [];
    if (fs.existsSync(masterDir)) {
      photos = fs.readdirSync(masterDir)
        .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
        .map(f => `/master_photos/${folderName}/${f}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ master: masterName, photos }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

// ===== GET /api/pending_photos — список мастеров ожидающих фото =====
function handleGetPending(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(readPending()));
}

// ===== POST /api/pending_photos — добавить мастера в очередь напоминаний =====
function handleAddPending(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const { masterName, addedBy, location } = JSON.parse(body);
      if (!masterName) throw new Error('masterName обязателен');

      const list = readPending();
      // Избегаем дублей
      const exists = list.find(p => p.masterName === masterName);
      if (!exists) {
        list.push({
          masterName,
          addedBy:   addedBy || 'Менеджер',
          location:  location || '',
          addedAt:   new Date().toISOString(),
          notified:  0,        // Сколько раз уже напоминали
          lastNotify: null     // Когда последний раз напоминали
        });
      } else {
        exists.addedBy = addedBy || exists.addedBy || 'Менеджер';
        exists.location = location || exists.location || '';
        exists.lastDeferredAt = new Date().toISOString();
        exists.deferCount = (exists.deferCount || 0) + 1;
      }
      writePending(list);

      const item = exists || list.find(p => p.masterName === masterName);
      sendOwnerMessage(
        `⏰ <b>Менеджер выбрал «отправить позже»</b>\n\n` +
        `Мастер: <b>${masterName}</b>${location ? `\nФилиал: ${location}` : ''}\n` +
        `Менеджер: ${addedBy || 'Менеджер'}\n` +
        `Отсрочка: ${(item && item.deferCount) || 1}`
      ).catch(error => console.error('[MasterPhoto] defer notification failed:', error.message));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ===== DELETE /api/pending_photos?master=... — убрать из очереди (фото загружены) =====
function handleConfirmPhotos(req, res, parsedUrl) {
  try {
    const masterName = parsedUrl.searchParams.get('master') || '';
    const list = readPending().filter(p => p.masterName !== masterName);
    writePending(list);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

module.exports = {
  handleUploadPhoto,
  handleGetPhotos,
  handleGetPending,
  handleAddPending,
  handleConfirmPhotos,
};
