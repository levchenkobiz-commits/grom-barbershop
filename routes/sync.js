/**
 * routes/sync.js
 * Маршруты: POST /api/sync, GET /api/sync_status
 */

const fs    = require('fs');
const path  = require('path');
const PATHS = require('./paths');

// POST /api/sync — запустить агент синхронизации
function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    let modArg = '';
    try {
      const parsed = JSON.parse(body || '{}');
      if (parsed.module) modArg = ' --module=' + parsed.module;
    } catch (e) {}

    fs.writeFileSync(PATHS.syncStatus, JSON.stringify({ isSyncing: true }));

    const { exec } = require('child_process');
    exec(`node ${path.join(path.dirname(PATHS.syncStatus), 'agent.js')} --single${modArg}`, (error) => {
      fs.writeFileSync(PATHS.syncStatus, JSON.stringify({ isSyncing: false }));
      if (error) console.error('[Sync] exec error:', error);
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'started' }));
  });
}

// GET /api/sync_status
function handleGetStatus(req, res) {
  let status = { isSyncing: false };
  try { status = JSON.parse(fs.readFileSync(PATHS.syncStatus, 'utf-8')); } catch (e) {}
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status));
}

module.exports = { handlePost, handleGetStatus };
