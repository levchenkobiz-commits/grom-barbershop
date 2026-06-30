const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = process.platform === 'win32'
  ? path.join(__dirname, '..', 'tech', 'video-auditor')
  : '/root/grome-video-auditor';

const AUDIT_ROOT = process.env.VIDEO_AUDITOR_REVIEW_ROOT || DEFAULT_ROOT;
const FEEDBACK_FILE = path.join(AUDIT_ROOT, 'review_feedback.jsonl');
const TRAINING_FILE = path.join(AUDIT_ROOT, 'training_memory.jsonl');

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function parseJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function getEventFiles() {
  const files = [];
  if (fs.existsSync(path.join(AUDIT_ROOT, 'review', 'events.jsonl'))) {
    files.push(path.join(AUDIT_ROOT, 'review', 'events.jsonl'));
  }
  if (!fs.existsSync(AUDIT_ROOT)) return files;

  for (const entry of fs.readdirSync(AUDIT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(AUDIT_ROOT, entry.name, 'review', 'events.jsonl');
    if (fs.existsSync(filePath)) files.push(filePath);
  }
  return files;
}

function getFeedbackMap() {
  const feedback = new Map();
  for (const item of parseJsonLines(FEEDBACK_FILE)) {
    if (item.id) feedback.set(item.id, item);
  }
  return feedback;
}

function appendJsonLine(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function readEvents() {
  const feedback = getFeedbackMap();
  const events = [];
  for (const filePath of getEventFiles()) {
    for (const event of parseJsonLines(filePath)) {
      if (!event.id) continue;
      if (!event.analysis || event.analysis.violation !== true) continue;
      const review = feedback.get(event.id) || null;
      events.push({ ...event, review, status: review ? review.verdict : 'pending' });
    }
  }
  return events.sort((a, b) => String(b.createdAt || b.checkedAt || '').localeCompare(String(a.createdAt || a.checkedAt || '')));
}

function isPathInside(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
}

function findEventById(id) {
  return readEvents().find(event => event.id === id) || null;
}

function toTrainingRecord(event, feedback) {
  const analysis = event.analysis || {};
  return {
    schema: 'grome-video-audit-training-v1',
    id: feedback.trainingId || `review:${event.id}:${feedback.editedAt || new Date().toISOString()}`,
    sourceEventId: event.id,
    cameraName: event.cameraName || '',
    checkedAt: event.checkedAt || '',
    checkedAtMoscow: event.checkedAtMoscow || '',
    playerClock: event.playerClock || '',
    framePath: event.framePath || '',
    model: analysis.model || '',
    ai: {
      violation: analysis.violation === true,
      confidence: Number(analysis.confidence || 0),
      type: Array.isArray(analysis.type) ? analysis.type : [],
      summary: String(analysis.summary || ''),
      evidence: String(analysis.evidence || ''),
      masterName: String(analysis.masterName || ''),
      uniform: analysis.uniform || {},
    },
    human: {
      verdict: feedback.verdict,
      violation: feedback.verdict === 'confirmed',
      masterName: String(feedback.masterName || ''),
      note: String(feedback.note || ''),
      editor: String(feedback.editor || ''),
      editedAt: feedback.editedAt || new Date().toISOString(),
    },
  };
}

function readTrainingRecords() {
  const records = [];
  const seen = new Set();

  for (const item of parseJsonLines(TRAINING_FILE)) {
    if (!item || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    records.push(item);
  }

  for (const event of readEvents()) {
    if (!event.review) continue;
    const record = toTrainingRecord(event, event.review);
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    records.push(record);
  }

  return records.sort((a, b) => String(b.human?.editedAt || '').localeCompare(String(a.human?.editedAt || '')));
}

function trainingStats(records) {
  const stats = {
    total: records.length,
    confirmed: 0,
    false_positive: 0,
    uncertain: 0,
    byType: {},
  };
  for (const record of records) {
    const verdict = record.human && record.human.verdict;
    if (Object.prototype.hasOwnProperty.call(stats, verdict)) stats[verdict] += 1;
    for (const type of record.ai?.type || []) {
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
  }
  return stats;
}

function handleGetEvents(req, res, parsedUrl) {
  const limit = Math.max(1, Math.min(500, Number(parsedUrl.searchParams.get('limit') || 100)));
  const status = parsedUrl.searchParams.get('status') || 'all';
  let events = readEvents();
  if (status !== 'all') events = events.filter(event => event.status === status);
  sendJson(res, 200, {
    root: AUDIT_ROOT,
    count: events.length,
    events: events.slice(0, limit),
  });
}

function handleGetFrame(req, res, parsedUrl) {
  const id = parsedUrl.searchParams.get('id');
  const event = id ? findEventById(id) : null;
  if (!event || !event.framePath) return sendJson(res, 404, { error: 'frame_not_found' });

  if (!isPathInside(AUDIT_ROOT, event.framePath) || !fs.existsSync(event.framePath)) {
    return sendJson(res, 404, { error: 'frame_not_available' });
  }

  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(event.framePath).pipe(res);
}

async function handlePatchEvent(req, res) {
  try {
    const body = await readBody(req);
    const id = String(body.id || '').trim();
    const verdict = String(body.verdict || '').trim();
    if (!id || !['confirmed', 'false_positive', 'uncertain'].includes(verdict)) {
      return sendJson(res, 400, { error: 'bad_feedback' });
    }

    const event = findEventById(id);
    if (!event) return sendJson(res, 404, { error: 'event_not_found' });

    const feedback = {
      id,
      verdict,
      masterName: String(body.masterName || '').trim(),
      note: String(body.note || '').trim(),
      editor: req.authUser ? req.authUser.name : '',
      editedAt: new Date().toISOString(),
    };

    fs.mkdirSync(path.dirname(FEEDBACK_FILE), { recursive: true });
    appendJsonLine(FEEDBACK_FILE, feedback);
    appendJsonLine(TRAINING_FILE, toTrainingRecord(event, feedback));
    sendJson(res, 200, { ok: true, feedback });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

function handleGetTraining(req, res) {
  const records = readTrainingRecords();
  sendJson(res, 200, {
    schema: 'grome-video-audit-training-v1',
    root: AUDIT_ROOT,
    stats: trainingStats(records),
    records,
  });
}

function handleExportTraining(req, res) {
  const records = readTrainingRecords();
  const lines = records.map(record => JSON.stringify(record)).join('\n');
  sendText(res, 200, lines ? `${lines}\n` : '', {
    'Content-Disposition': 'attachment; filename="grome-video-audit-training.jsonl"',
    'Cache-Control': 'no-store',
  });
}

async function handleImportTraining(req, res) {
  try {
    const body = await readBody(req);
    const raw = String(body.jsonl || body.data || '').trim();
    const records = Array.isArray(body.records)
      ? body.records
      : raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));

    let imported = 0;
    for (const record of records) {
      if (!record || record.schema !== 'grome-video-audit-training-v1') continue;
      appendJsonLine(TRAINING_FILE, {
        ...record,
        importedAt: new Date().toISOString(),
        importedBy: req.authUser ? req.authUser.name : '',
      });
      imported += 1;
    }
    sendJson(res, 200, { ok: true, imported, stats: trainingStats(readTrainingRecords()) });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

module.exports = {
  handleGetEvents,
  handleGetFrame,
  handlePatchEvent,
  handleGetTraining,
  handleExportTraining,
  handleImportTraining,
};
