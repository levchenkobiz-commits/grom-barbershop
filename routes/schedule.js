/**
 * routes/schedule.js
 * Маршруты: GET /api/schedule, POST /api/schedule
 *           GET /api/me, POST /api/me/schedule
 */

const fs    = require('fs');
const PATHS = require('./paths');

// GET /api/schedule — расписание смен (глобальное)
function handleGetSchedule(req, res) {
  if (!fs.existsSync(PATHS.schedule)) fs.writeFileSync(PATHS.schedule, '[]');
  const data = fs.readFileSync(PATHS.schedule, 'utf-8');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(data);
}

// POST /api/schedule — сохранить/обновить смены
function handlePostSchedule(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const entry = JSON.parse(body);
      let data = [];
      if (fs.existsSync(PATHS.schedule)) {
        try { data = JSON.parse(fs.readFileSync(PATHS.schedule, 'utf-8')); } catch (e) {}
      }

      const entries = Array.isArray(entry) ? entry : [entry];
      entries.forEach(e => {
        data = data.filter(s => !(s.date === e.date && s.location === e.location));
        if (e.masters && e.masters.length > 0) data.push(e);
      });

      fs.writeFileSync(PATHS.schedule, JSON.stringify(data, null, 2));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

// GET /api/me?tg_id=XXX — получить профиль менеджера
function handleGetMe(req, res, parsedUrl) {
  const tg_id = parsedUrl.searchParams.get('tg_id');
  if (fs.existsSync(PATHS.roles)) {
    const roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));
    if (roles[tg_id]) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(roles[tg_id]));
    }
  }
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not authorized' }));
}

// POST /api/me/schedule?tg_id=XXX — сохранить рабочие дни менеджера
function handlePostMySchedule(req, res, parsedUrl) {
  const tg_id = parsedUrl.searchParams.get('tg_id');
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    if (fs.existsSync(PATHS.roles)) {
      let roles = JSON.parse(fs.readFileSync(PATHS.roles, 'utf-8'));
      if (roles[tg_id]) {
        try {
          const parsed = JSON.parse(body);
          roles[tg_id].schedule = parsed.schedule || [];
          fs.writeFileSync(PATHS.roles, JSON.stringify(roles, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: 'success' }));
        } catch (e) {}
      }
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not authorized' }));
  });
}

module.exports = { handleGetSchedule, handlePostSchedule, handleGetMe, handlePostMySchedule };
