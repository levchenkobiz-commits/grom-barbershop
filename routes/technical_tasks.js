/** Technical tasks created from item 6 of manager checks. */
const fs = require('fs');
const PATHS = require('./paths');

const STATUSES = ['Новая задача', 'В работе', 'Выполнено'];
const DISABLED_SALONS = new Set(['Варшавская']);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return fallback; }
}

function writeTasks(tasks) {
  const temp = `${PATHS.technicalTasks}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(tasks, null, 2), 'utf8');
  fs.renameSync(temp, PATHS.technicalTasks);
}

function queueAutosendNotification(event) {
  const notifications = readJson(PATHS.autosendNotifications, []);
  const eventType = event.type || 'technical_task_deferred';
  notifications.push({
    id: `${eventType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: eventType,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    ...event,
  });
  const temp = `${PATHS.autosendNotifications}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(notifications, null, 2), 'utf8');
  fs.renameSync(temp, PATHS.autosendNotifications);
}

function taskEvent(task, action, actor, extra = {}) {
  return {
    type: 'technical_task_event',
    taskId: String(task.id),
    action,
    actor: actor || 'Кирилл',
    title: task.title,
    salon: task.salon,
    status: task.status,
    ...extra,
  };
}

function appendHistory(task, action, actor, extra = {}) {
  task.history = Array.isArray(task.history) ? task.history : [];
  task.history.push({ at: new Date().toISOString(), action, actor: actor || 'Сотрудник', ...extra });
  // The visible task state is canonical; history is audit information only.
  if (task.history.length > 60) task.history = task.history.slice(-60);
}

function syncFromManagerChecks() {
  const checks = readJson(PATHS.managerChecks, []);
  const tasks = readJson(PATHS.technicalTasks, []);
  const byId = new Map(tasks.map(task => [String(task.id), task]));

  for (const check of checks) {
    if (DISABLED_SALONS.has(String(check.location || '').trim())) continue;
    const item = Array.isArray(check.items)
      ? (check.items.find(candidate => Number(candidate?.id) === 6) || check.items[5])
      : null;
    if (!item || item.status !== 'no' || !String(item.comment || '').trim()) continue;
    const id = `manager-${check.id}-6`;
    const existing = byId.get(id);
    if (existing) {
      existing.title = String(item.comment).trim();
      existing.salon = String(check.location || 'Не указан');
      existing.reportedAt = check.createdAt || check.date || existing.reportedAt;
      continue;
    }
    const task = {
      id,
      title: String(item.comment).trim(),
      salon: String(check.location || 'Не указан'),
      reportedAt: check.createdAt || check.date || new Date().toISOString(),
      sourceCheckId: String(check.id),
      status: 'Новая задача',
      archived: false,
      createdAt: new Date().toISOString(),
      notificationVersion: 0,
      history: [],
    };
    tasks.push(task);
    byId.set(id, task);
  }

  tasks.sort((a, b) => String(b.reportedAt).localeCompare(String(a.reportedAt)));
  writeTasks(tasks);
  return tasks;
}

function applyTaskAction(task, action, options = {}) {
  if (!task || task.archived) throw new Error('Активная задача не найдена');
  const now = options.now || new Date();
  const nowIso = now.toISOString();
  const today = options.today || moscowDate(now);
  const actor = String(options.actor || 'Сотрудник').trim() || 'Сотрудник';
  const previousStatus = task.status;

  if (action === 'status') {
    const status = options.status;
    if (!STATUSES.includes(status)) throw new Error('Некорректный статус');
    task.status = status;
    task.archived = status === 'Выполнено';
    task.updatedAt = nowIso;
    task.updatedBy = actor;
    if (status === 'В работе') {
      delete task.deferredUntil;
      delete task.deferDays;
      delete task.deferComment;
      delete task.deferredAt;
      delete task.deferredBy;
      if (previousStatus !== 'В работе' || !task.workStartedAt) {
        task.workStartedAt = nowIso;
        task.nextOverdueReminderAt = addDays(today, 3);
      }
    }
    if (status === 'Новая задача') {
      delete task.workStartedAt;
      delete task.nextOverdueReminderAt;
    }
    if (status === 'Выполнено') {
      task.completedAt = nowIso;
      delete task.nextOverdueReminderAt;
    } else {
      delete task.completedAt;
    }
    appendHistory(task, `status:${status}`, actor, { previousStatus });
    return { changed: previousStatus !== status, event: taskEvent(task, status === 'В работе' ? 'started' : status === 'Выполнено' ? 'completed' : 'status_changed', actor, { previousStatus }) };
  }

  if (action === 'defer') {
    const date = String(options.date || '').trim();
    const comment = String(options.comment || '').trim();
    if (!validDate(date) || date <= today) throw new Error('Выберите будущую дату переноса');
    if (!comment) throw new Error('Для переноса нужен комментарий');
    const days = calendarDaysBetween(today, date);
    task.status = 'Новая задача';
    task.archived = false;
    delete task.workStartedAt;
    delete task.nextOverdueReminderAt;
    task.deferredUntil = date;
    task.deferDays = days;
    task.deferComment = comment;
    task.deferredAt = nowIso;
    task.deferredBy = actor;
    task.notificationVersion = Number(task.notificationVersion || 0) + 1;
    task.updatedAt = nowIso;
    task.updatedBy = actor;
    appendHistory(task, 'deferred', actor, { previousStatus, deferredUntil: date, comment });
    return { changed: true, event: taskEvent(task, 'deferred', actor, { previousStatus, deferredUntil: date, deferDays: days, comment }) };
  }

  if (action === 'still_working') {
    if (task.status !== 'В работе') throw new Error('Отметить «ещё в работе» можно только для задачи в работе');
    task.nextOverdueReminderAt = addDays(today, 3);
    task.updatedAt = nowIso;
    task.updatedBy = actor;
    appendHistory(task, 'still_working', actor, { nextOverdueReminderAt: task.nextOverdueReminderAt });
    return { changed: true, event: null };
  }

  throw new Error('Неизвестное действие с задачей');
}

function performTaskAction(id, action, options = {}) {
  const tasks = syncFromManagerChecks();
  const task = tasks.find(item => String(item.id) === String(id));
  const result = applyTaskAction(task, action, options);
  writeTasks(tasks);
  if (result.event && result.changed) queueAutosendNotification(result.event);
  return { task, ...result };
}

function normalizeSalon(value) {
  return String(value || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function handleGet(req, res, parsedUrl) {
  const requestedSalon = String(parsedUrl?.searchParams?.get('salon') || '').trim();
  const requestedSalonKey = normalizeSalon(requestedSalon);
  const tasks = syncFromManagerChecks().filter(task =>
    !DISABLED_SALONS.has(String(task.salon || '').trim())
    && (!requestedSalonKey || normalizeSalon(task.salon) === requestedSalonKey)
  );
  const active = tasks.filter(task =>
    !task.archived && task.status !== 'Выполнено'
    && ['Новая задача', 'В работе'].includes(task.status)
  );
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    salon: requestedSalon || null,
    active,
    archived: tasks.filter(task => task.archived),
    statuses: STATUSES,
  }));
}

function handlePatch(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { id, status } = JSON.parse(body);
      if (!id || !STATUSES.includes(status)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Некорректная задача или статус' }));
      }
      const actor = req.authUser ? req.authUser.name : 'Сотрудник';
      const { task } = performTaskAction(id, 'status', { status, actor });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', task }));
    } catch (error) {
      const notFound = /не найдена/i.test(error.message);
      res.writeHead(notFound ? 404 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Не удалось изменить статус' }));
    }
  });
}

function moscowDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function calendarDaysBetween(from, to) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

function addDays(date, days) {
  const [year, month, day] = String(date).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function handleDefer(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { id, date, comment } = JSON.parse(body);
      if (!id || !String(comment || '').trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Для переноса нужен комментарий' }));
      }
      const requester = req.authUser ? req.authUser.name : 'Сотрудник';
      const { task } = performTaskAction(id, 'defer', { date, comment, actor: requester });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'deferred', task, notificationQueued: true }));
    } catch (error) {
      console.error('[TechnicalTasks] defer:', error.message);
      const notFound = /не найдена/i.test(error.message);
      res.writeHead(notFound ? 404 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Не удалось оформить перенос' }));
    }
  });
}

module.exports = { handleGet, handlePatch, handleDefer, syncFromManagerChecks, performTaskAction, applyTaskAction, normalizeSalon, moscowDate, validDate, calendarDaysBetween, STATUSES };
