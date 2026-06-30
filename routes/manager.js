/**
 * routes/manager.js
 * Маршруты: GET /api/manager_checks, POST /api/manager_checks
 */

const fs    = require('fs');
const path  = require('path');
const PATHS = require('./paths');
const { sendOwnerMessage, sendOwnerPhoto } = require('./telegram_notify');

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyOwner(check) {
  const violations = check.items.filter(item => item.status === 'no');
  const details = violations.length
    ? violations.map(item => `• ${escapeHtml(item.label)}${item.comment ? `: ${escapeHtml(item.comment)}` : ''}`).join('\n')
    : 'Нарушений нет';
  await sendOwnerMessage(
    `📋 <b>Новая проверка менеджера</b>\n\n` +
    `Филиал: <b>${escapeHtml(check.location)}</b>\n` +
    `Менеджер: ${escapeHtml(check.submittedBy || 'Менеджер')}\n` +
    `Время: ${escapeHtml(check.time || '')}\n\n${details}`
  );

  for (const photoUrl of check.photoUrls || []) {
    const filePath = path.join(PATHS.uploadsDir, path.basename(photoUrl));
    if (fs.existsSync(filePath)) {
      await sendOwnerPhoto(filePath, `Проверка менеджера: ${check.location}`);
    }
  }
}

// GET /api/manager_checks
function handleGet(req, res) {
  if (!fs.existsSync(PATHS.managerChecks)) fs.writeFileSync(PATHS.managerChecks, '[]');
  const checks = fs.readFileSync(PATHS.managerChecks, 'utf-8');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(checks);
}

// POST /api/manager_checks
function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const check = JSON.parse(body);
      if (!check || !check.location || !Array.isArray(check.items) || check.items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Incomplete manager check' }));
        return;
      }

      if (!fs.existsSync(PATHS.managerChecks)) fs.writeFileSync(PATHS.managerChecks, '[]');
      let checks = JSON.parse(fs.readFileSync(PATHS.managerChecks, 'utf-8'));
      const existing = check.clientRequestId
        ? checks.find(item => item.clientRequestId === check.clientRequestId)
        : null;
      if (existing) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', id: existing.id, duplicate: true }));
        return;
      }

      check.id        = Date.now();
      check.createdAt = new Date().toISOString();
      if (req.authUser && req.authUser.name) check.submittedBy = req.authUser.name;

      checks.unshift(check);
      const tempFile = PATHS.managerChecks + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(checks, null, 2), 'utf-8');
      fs.renameSync(tempFile, PATHS.managerChecks);

      notifyOwner(check).catch(error => {
        console.error('[Manager] Telegram auto send failed:', error.message);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', id: check.id }));
    } catch (e) {
      console.error('[Manager] check save error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Save failed' }));
    }
  });
}

// PUT /api/manager_checks — edit during the first 24 hours only
function handlePut(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const update = JSON.parse(body);
      if (!update || !update.id || !update.location || !Array.isArray(update.items) || update.items.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Incomplete manager check update' }));
        return;
      }

      if (!fs.existsSync(PATHS.managerChecks)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Manager check not found' }));
        return;
      }

      const checks = JSON.parse(fs.readFileSync(PATHS.managerChecks, 'utf-8'));
      const index = checks.findIndex(item => String(item.id) === String(update.id));
      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Manager check not found' }));
        return;
      }

      const createdAt = new Date(checks[index].createdAt).getTime();
      if (!Number.isFinite(createdAt) || Date.now() - createdAt >= 24 * 60 * 60 * 1000) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Manager check can only be edited within 24 hours' }));
        return;
      }

      checks[index].location = update.location;
      checks[index].items = update.items;
      checks[index].status = update.status;
      checks[index].editedAt = new Date().toISOString();
      checks[index].editedBy = req.authUser && req.authUser.name
        ? req.authUser.name
        : (update.submittedBy || 'Manager');

      const tempFile = PATHS.managerChecks + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(checks, null, 2), 'utf-8');
      fs.renameSync(tempFile, PATHS.managerChecks);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', id: checks[index].id }));
    } catch (e) {
      console.error('[Manager] check update error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Update failed' }));
    }
  });
}

module.exports = { handleGet, handlePost, handlePut };
