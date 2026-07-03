const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (error) {
  DatabaseSync = null;
}

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.VIDEO_AUDIT_DATA_DIR || path.join(ROOT, 'video_audit_data');
const DB_PATH = process.env.VIDEO_AUDIT_DB_PATH || path.join(DATA_DIR, 'video-audit.sqlite3');
const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const MODELS_DIR = path.join(DATA_DIR, 'models');
const CHECKER_MODEL_PATH = path.join(MODELS_DIR, 'checker-status.json');

const VIOLATION_CLASSES = [
  'master_lying',
  'master_sleeping',
  'no_uniform',
  'open_shoes',
  'waiting_zone_client',
];

const ENTITY_CLASSES = [
  'person',
  'master',
  'client',
  'uniform_ok',
  'uniform_bad',
  'shoe_open',
  'shoe_closed',
  'waiting_zone',
  'work_zone',
];

let db = null;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;
}

function safeFilename(value, fallback = 'file') {
  const cleaned = String(value || fallback)
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .slice(0, 120);
  return cleaned || fallback;
}

function json(value) {
  return JSON.stringify(value ?? {}, null, 0);
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, text, headers = {}) {
  const body = Buffer.from(text, 'utf8');
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function readRaw(req, limitBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function openDb() {
  if (db) return db;
  if (!DatabaseSync) {
    const error = new Error('Node SQLite is unavailable. Upgrade Node.js on the VPS to 22.5+ or 24 LTS.');
    error.statusCode = 503;
    throw error;
  }

  ensureDir(DATA_DIR);
  ensureDir(EVIDENCE_DIR);
  ensureDir(EXPORTS_DIR);
  ensureDir(MODELS_DIR);
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  seed(db);
  return db;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'ivideon',
      provider_camera_id TEXT,
      stream_ref TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      zones_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS master_identities (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      branch_id TEXT,
      external_ref TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      positive_samples INTEGER NOT NULL DEFAULT 0,
      negative_samples INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      branch_id TEXT,
      camera_id TEXT,
      source_kind TEXT NOT NULL DEFAULT 'manual',
      source_ref TEXT,
      source_time TEXT,
      status TEXT NOT NULL DEFAULT 'pending_review',
      predicted_type TEXT,
      predicted_confidence REAL,
      model_name TEXT,
      assigned_identity_id TEXT,
      reviewer_id TEXT,
      human_verdict TEXT,
      human_label TEXT,
      comment TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      reviewed_at TEXT,
      meta_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      mime_type TEXT,
      original_name TEXT,
      sha256 TEXT,
      width INTEGER,
      height INTEGER,
      captured_at TEXT,
      created_at TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      evidence_id TEXT,
      label TEXT NOT NULL,
      shape TEXT NOT NULL,
      x REAL,
      y REAL,
      w REAL,
      h REAL,
      points_json TEXT,
      crop_storage_path TEXT,
      crop_sha256 TEXT,
      identity_id TEXT,
      role TEXT,
      source TEXT NOT NULL DEFAULT 'human',
      confidence REAL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      reviewer_id TEXT,
      verdict TEXT NOT NULL,
      label TEXT,
      identity_id TEXT,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dataset_exports (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      format TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      cases_count INTEGER NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS integration_jobs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      result_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cases_status_created ON cases(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_case ON annotations(case_id);
  `);
}

function seed(database) {
  const org = database.prepare('SELECT id FROM organizations LIMIT 1').get();
  if (org) return;

  const created = now();
  const orgId = id('org');
  database.prepare('INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)').run(orgId, 'GROME', created);

  const branches = ['Алексеевская 1', 'Партизанская 3', 'Варшавка зал', 'Сокол'];
  const insertBranch = database.prepare('INSERT INTO branches (id, organization_id, name, created_at) VALUES (?, ?, ?, ?)');
  const insertCamera = database.prepare('INSERT INTO cameras (id, branch_id, name, provider, created_at) VALUES (?, ?, ?, ?, ?)');
  for (const name of branches) {
    const branchId = id('branch');
    insertBranch.run(branchId, orgId, name, created);
    insertCamera.run(id('cam'), branchId, `${name} / Ivideon`, 'ivideon', created);
  }
}

function one(sql, params = []) {
  return openDb().prepare(sql).get(...params);
}

function all(sql, params = []) {
  return openDb().prepare(sql).all(...params);
}

function run(sql, params = []) {
  return openDb().prepare(sql).run(...params);
}

function actorFromDashboard(req) {
  const user = req.authUser || { key: 'system', name: 'System', role: 'owner' };
  const actorId = `dash_${safeFilename(user.key || user.name || 'system')}`;
  const existing = one('SELECT * FROM users WHERE id = ?', [actorId]);
  if (!existing) {
    run(
      'INSERT INTO users (id, username, name, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      [actorId, user.key || null, user.name || 'Dashboard User', user.role || 'owner', now(), now()],
    );
  } else {
    run('UPDATE users SET name = ?, role = ?, updated_at = ? WHERE id = ?', [user.name || existing.name, user.role || existing.role, now(), actorId]);
  }
  return one('SELECT * FROM users WHERE id = ?', [actorId]);
}

function audit(actorId, action, entityType, entityId, payload = {}) {
  run(
    'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id('audit'), actorId || null, action, entityType, entityId || null, json(payload), now()],
  );
}

function relToData(filePath) {
  return path.relative(DATA_DIR, filePath).replaceAll(path.sep, '/');
}

function dataPath(storagePath) {
  return path.isAbsolute(storagePath) ? storagePath : path.join(DATA_DIR, storagePath);
}

function hydrateCase(row) {
  if (!row) return null;
  const database = openDb();
  const out = { ...row, meta: parseJson(row.meta_json) };
  delete out.meta_json;
  out.branch = row.branch_id ? database.prepare('SELECT * FROM branches WHERE id = ?').get(row.branch_id) : null;
  out.camera = row.camera_id ? database.prepare('SELECT * FROM cameras WHERE id = ?').get(row.camera_id) : null;
  out.identity = row.assigned_identity_id ? database.prepare('SELECT * FROM master_identities WHERE id = ?').get(row.assigned_identity_id) : null;
  out.evidence = database.prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at ASC').all(row.id)
    .map(item => ({ ...item, meta: parseJson(item.meta_json) }));
  out.annotations = database.prepare('SELECT * FROM annotations WHERE case_id = ? ORDER BY created_at ASC').all(row.id)
    .map(item => ({ ...item, points: parseJson(item.points_json, null), meta: parseJson(item.meta_json) }));
  out.reviews = database.prepare('SELECT * FROM reviews WHERE case_id = ? ORDER BY created_at ASC').all(row.id);
  return out;
}

function resolveBranch(body) {
  if (body.branch_id) return one('SELECT * FROM branches WHERE id = ?', [body.branch_id]);
  if (body.location) {
    const existing = one('SELECT * FROM branches WHERE name = ?', [body.location]);
    if (existing) return existing;
    const org = one('SELECT * FROM organizations LIMIT 1');
    const branchId = id('branch');
    run(
      'INSERT INTO branches (id, organization_id, name, timezone, active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [branchId, org.id, String(body.location).trim(), body.timezone || 'Europe/Moscow', now()],
    );
    return one('SELECT * FROM branches WHERE id = ?', [branchId]);
  }
  const first = one('SELECT * FROM branches ORDER BY name LIMIT 1');
  return first || null;
}

function resolveCamera(body, branchId) {
  if (body.camera_id) return one('SELECT * FROM cameras WHERE id = ?', [body.camera_id]);
  if (body.camera_name) {
    const existing = one('SELECT * FROM cameras WHERE branch_id = ? AND name = ?', [branchId, body.camera_name]);
    if (existing) return existing;
    const camId = id('cam');
    run(
      'INSERT INTO cameras (id, branch_id, name, provider, provider_camera_id, stream_ref, active, zones_json, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
      [camId, branchId, body.camera_name, body.provider || 'ivideon', body.provider_camera_id || null, body.stream_ref || null, json(body.zones || {}), now()],
    );
    return one('SELECT * FROM cameras WHERE id = ?', [camId]);
  }
  return one('SELECT * FROM cameras WHERE branch_id = ? ORDER BY name LIMIT 1', [branchId]);
}

function fileSha256(bufferOrPath) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.isBuffer(bufferOrPath) ? bufferOrPath : fs.readFileSync(bufferOrPath));
  return hash.digest('hex');
}

async function handle(req, res, parsedUrl) {
  try {
    openDb();
    const apiPath = parsedUrl.pathname.replace(/^\/api\/video-audit/, '') || '/';

    if (req.method === 'GET' && (apiPath === '/' || apiPath === '/health')) return health(res);
    if (req.method === 'GET' && apiPath === '/bootstrap') return bootstrap(req, res);
    if (req.method === 'GET' && apiPath === '/branches') return sendJson(res, 200, all('SELECT * FROM branches WHERE active = 1 ORDER BY name'));
    if (req.method === 'GET' && apiPath === '/cameras') return listCameras(res, parsedUrl);
    if (req.method === 'GET' && apiPath === '/identities') return sendJson(res, 200, all('SELECT * FROM master_identities WHERE active = 1 ORDER BY display_name'));
    if (req.method === 'POST' && apiPath === '/identities') return createIdentity(req, res);
    if (req.method === 'GET' && apiPath === '/cases') return listCases(res, parsedUrl);
    if (req.method === 'POST' && apiPath === '/cases') return createCase(req, res);
    if (req.method === 'GET' && apiPath === '/training/status') return trainingStatus(res);
    if (req.method === 'GET' && apiPath === '/model/status') return modelStatus(res);
    if (req.method === 'POST' && apiPath === '/model/retrain') return retrainModel(req, res);
    if (req.method === 'POST' && apiPath === '/dataset/export') return exportDataset(req, res);
    if (req.method === 'POST' && apiPath === '/integrations/ivideon/candidate') return createIvideonCandidate(req, res);
    if (req.method === 'GET' && apiPath === '/integrations/jobs') {
      return sendJson(res, 200, all('SELECT * FROM integration_jobs ORDER BY created_at DESC LIMIT 200').map(row => ({
        ...row,
        payload: parseJson(row.payload_json),
        result: parseJson(row.result_json),
      })));
    }

    const caseEvidence = apiPath.match(/^\/cases\/([^/]+)\/evidence$/);
    if (caseEvidence && req.method === 'POST') return uploadEvidence(req, res, caseEvidence[1]);
    const caseReview = apiPath.match(/^\/cases\/([^/]+)\/review$/);
    if (caseReview && req.method === 'POST') return reviewCase(req, res, caseReview[1]);
    const caseAnnotations = apiPath.match(/^\/cases\/([^/]+)\/annotations$/);
    if (caseAnnotations && req.method === 'POST') return createAnnotation(req, res, caseAnnotations[1]);
    const annotationCrop = apiPath.match(/^\/annotations\/([^/]+)\/crop$/);
    if (annotationCrop && req.method === 'POST') return uploadAnnotationCrop(req, res, annotationCrop[1]);
    if (annotationCrop && req.method === 'GET') return getAnnotationCrop(res, annotationCrop[1]);
    const caseSingle = apiPath.match(/^\/cases\/([^/]+)$/);
    if (caseSingle && req.method === 'GET') {
      const current = hydrateCase(one('SELECT * FROM cases WHERE id = ?', [caseSingle[1]]));
      return current ? sendJson(res, 200, current) : sendJson(res, 404, { error: 'case_not_found' });
    }
    const evidence = apiPath.match(/^\/evidence\/([^/]+)$/);
    if (evidence && req.method === 'GET') return getEvidence(res, evidence[1]);
    const exportFile = apiPath.match(/^\/exports\/([^/]+)\/(.+)$/);
    if (exportFile && req.method === 'GET') return getExportFile(res, exportFile[1], exportFile[2]);

    return sendJson(res, 404, { error: 'not_found' });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message || 'Internal Server Error' });
  }
}

function health(res) {
  sendJson(res, 200, {
    ok: true,
    service: 'grome-video-audit',
    mode: 'sqlite-production',
    dbPath: DB_PATH,
    dataDir: DATA_DIR,
    violationClasses: VIOLATION_CLASSES,
    entityClasses: ENTITY_CLASSES,
    training: computeTrainingStats(),
    checkerModel: readCheckerModel(),
  });
}

function bootstrap(req, res) {
  const actor = actorFromDashboard(req);
  sendJson(res, 200, {
    actor,
    violationClasses: VIOLATION_CLASSES,
    entityClasses: ENTITY_CLASSES,
    branches: all('SELECT * FROM branches WHERE active = 1 ORDER BY name'),
    cameras: all('SELECT * FROM cameras WHERE active = 1 ORDER BY name').map(c => ({ ...c, zones: parseJson(c.zones_json) })),
    identities: all('SELECT * FROM master_identities WHERE active = 1 ORDER BY display_name'),
  });
}

function listCameras(res, parsedUrl) {
  const branchId = parsedUrl.searchParams.get('branch_id');
  const rows = branchId
    ? all('SELECT * FROM cameras WHERE branch_id = ? ORDER BY name', [branchId])
    : all('SELECT * FROM cameras ORDER BY name');
  sendJson(res, 200, rows.map(row => ({ ...row, zones: parseJson(row.zones_json) })));
}

async function createIdentity(req, res) {
  const actor = actorFromDashboard(req);
  const body = await readJson(req);
  const displayName = String(body.display_name || '').trim();
  if (!displayName) return sendJson(res, 400, { error: 'display_name_required' });
  const identityId = id('identity');
  run(
    'INSERT INTO master_identities (id, display_name, branch_id, external_ref, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [identityId, displayName, body.branch_id || null, body.external_ref || null, now(), now()],
  );
  audit(actor.id, 'identity.create', 'master_identity', identityId, body);
  sendJson(res, 201, one('SELECT * FROM master_identities WHERE id = ?', [identityId]));
}

function listCases(res, parsedUrl) {
  const params = [];
  const where = [];
  for (const key of ['status', 'branch_id', 'camera_id', 'human_label', 'human_verdict']) {
    const value = parsedUrl.searchParams.get(key);
    if (value) {
      where.push(`${key} = ?`);
      params.push(value);
    }
  }
  const rows = all(`SELECT * FROM cases ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 300`, params);
  sendJson(res, 200, rows.map(hydrateCase));
}

function computeTrainingStats() {
  const reviewedCases = all("SELECT * FROM cases WHERE status IN ('reviewed', 'needs_more_data', 'exported') ORDER BY created_at ASC").map(hydrateCase);
  const labelCounts = {};
  const verdictCounts = {};
  const identitySamples = {};
  let annotationCount = 0;
  let evidenceCount = 0;

  for (const item of reviewedCases) {
    const label = item.human_label || item.predicted_type || 'unlabeled';
    labelCounts[label] = (labelCounts[label] || 0) + 1;
    const verdict = item.human_verdict || 'unknown';
    verdictCounts[verdict] = (verdictCounts[verdict] || 0) + 1;
    evidenceCount += item.evidence.length;
    annotationCount += item.annotations.length;
    for (const ann of item.annotations) {
      if (!ann.identity_id) continue;
      identitySamples[ann.identity_id] = (identitySamples[ann.identity_id] || 0) + 1;
    }
  }

  return {
    reviewedCases: reviewedCases.length,
    evidenceCount,
    annotationCount,
    labelCounts,
    verdictCounts,
    identitySamples,
  };
}

function readCheckerModel() {
  if (!fs.existsSync(CHECKER_MODEL_PATH)) {
    return {
      exists: false,
      version: null,
      trainedAt: null,
      reviewedCases: 0,
      annotationCount: 0,
      memoryAccuracyOnReviewedSet: null,
    };
  }
  return { exists: true, ...JSON.parse(fs.readFileSync(CHECKER_MODEL_PATH, 'utf8')) };
}

function createCheckerModelSnapshot(actorId, trigger = 'manual') {
  const previous = readCheckerModel();
  const training = computeTrainingStats();
  const payloadForHash = JSON.stringify({
    labelCounts: training.labelCounts,
    verdictCounts: training.verdictCounts,
    identitySamples: training.identitySamples,
    reviewedCases: training.reviewedCases,
    annotationCount: training.annotationCount,
  });
  const version = crypto.createHash('sha256').update(payloadForHash).digest('hex').slice(0, 16);
  const snapshot = {
    version,
    trainedAt: now(),
    trainedBy: actorId || null,
    trigger,
    reviewedCases: training.reviewedCases,
    evidenceCount: training.evidenceCount,
    annotationCount: training.annotationCount,
    labelCounts: training.labelCounts,
    verdictCounts: training.verdictCounts,
    identitySamples: training.identitySamples,
    memoryAccuracyOnReviewedSet: training.reviewedCases > 0 ? 1 : null,
    note: 'This adaptive checker records reviewed visual evidence and feedback. memoryAccuracyOnReviewedSet is not YOLO generalization accuracy.',
  };
  ensureDir(MODELS_DIR);
  fs.writeFileSync(CHECKER_MODEL_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  audit(actorId, 'model.retrain', 'checker_model', version, { trigger, previousVersion: previous.version || null, training });
  return {
    previous,
    current: { exists: true, ...snapshot },
    impact: {
      modelVersionChanged: previous.version !== version,
      reviewedCasesDelta: training.reviewedCases - Number(previous.reviewedCases || 0),
      annotationDelta: training.annotationCount - Number(previous.annotationCount || 0),
      memoryAccuracyDelta: snapshot.memoryAccuracyOnReviewedSet == null
        ? null
        : snapshot.memoryAccuracyOnReviewedSet - Number(previous.memoryAccuracyOnReviewedSet || 0),
    },
  };
}

function trainingStatus(res) {
  sendJson(res, 200, {
    training: computeTrainingStats(),
    checkerModel: readCheckerModel(),
  });
}

function modelStatus(res) {
  sendJson(res, 200, readCheckerModel());
}

async function retrainModel(req, res) {
  const actor = actorFromDashboard(req);
  const body = await readJson(req);
  sendJson(res, 201, createCheckerModelSnapshot(actor.id, body.trigger || 'manual'));
}

async function createCase(req, res) {
  const actor = actorFromDashboard(req);
  const body = await readJson(req);
  const org = one('SELECT * FROM organizations LIMIT 1');
  const branch = resolveBranch(body);
  if (!branch) return sendJson(res, 400, { error: 'branch_not_found' });
  const camera = resolveCamera(body, branch.id);
  const caseId = id('case');
  run(
    `INSERT INTO cases (
      id, organization_id, branch_id, camera_id, source_kind, source_ref, source_time, status,
      predicted_type, predicted_confidence, model_name, assigned_identity_id, comment, created_at, updated_at, meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      caseId,
      org.id,
      branch.id,
      camera?.id || null,
      body.source_kind || 'manual',
      body.source_ref || null,
      body.source_time || now(),
      body.status || 'pending_review',
      body.predicted_type || null,
      body.predicted_confidence ?? null,
      body.model_name || null,
      body.assigned_identity_id || null,
      body.comment || null,
      now(),
      now(),
      json(body.meta || {}),
    ],
  );
  audit(actor.id, 'case.create', 'case', caseId, body);
  sendJson(res, 201, hydrateCase(one('SELECT * FROM cases WHERE id = ?', [caseId])));
}

async function createIvideonCandidate(req, res) {
  const actor = actorFromDashboard(req);
  const body = await readJson(req);
  const jobId = id('job');
  run(
    "INSERT INTO integration_jobs (id, provider, job_type, status, payload_json, created_at, updated_at) VALUES (?, 'ivideon', 'candidate', 'received', ?, ?, ?)",
    [jobId, json(body), now(), now()],
  );
  const org = one('SELECT * FROM organizations LIMIT 1');
  const branch = resolveBranch(body);
  if (!branch) return sendJson(res, 400, { error: 'branch_not_found', jobId });
  const camera = resolveCamera(body, branch.id);
  const caseId = id('case');
  run(
    `INSERT INTO cases (
      id, organization_id, branch_id, camera_id, source_kind, source_ref, source_time, status,
      predicted_type, predicted_confidence, model_name, comment, created_at, updated_at, meta_json
    ) VALUES (?, ?, ?, ?, 'ivideon', ?, ?, 'candidate', ?, ?, ?, ?, ?, ?, ?)`,
    [
      caseId,
      org.id,
      branch.id,
      camera?.id || null,
      body.source_ref || body.ivideon_camera_url || body.ivideon_clip_id || null,
      body.source_time || now(),
      body.predicted_type || null,
      body.predicted_confidence ?? null,
      body.model_name || 'ivideon_screenshot_worker',
      body.comment || null,
      now(),
      now(),
      json({ jobId, providerPayload: body }),
    ],
  );
  run('UPDATE integration_jobs SET status = ?, result_json = ?, updated_at = ? WHERE id = ?', ['case_created', json({ caseId }), now(), jobId]);
  audit(actor.id, 'integration.ivideon.candidate', 'case', caseId, body);
  sendJson(res, 201, hydrateCase(one('SELECT * FROM cases WHERE id = ?', [caseId])));
}

async function uploadEvidence(req, res, caseId) {
  const actor = actorFromDashboard(req);
  const current = one('SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!current) return sendJson(res, 404, { error: 'case_not_found' });
  const bytes = await readRaw(req);
  if (!bytes.length) return sendJson(res, 400, { error: 'empty_evidence' });
  const original = decodeURIComponent(req.headers['x-filename'] || 'frame.jpg');
  const ext = path.extname(original) || '.jpg';
  const evidenceId = id('ev');
  const caseDir = path.join(EVIDENCE_DIR, caseId);
  ensureDir(caseDir);
  const target = path.join(caseDir, `${evidenceId}${safeFilename(ext, '.jpg')}`);
  fs.writeFileSync(target, bytes);
  const sha256 = fileSha256(bytes);
  run(
    'INSERT INTO evidence (id, case_id, kind, storage_path, mime_type, original_name, sha256, captured_at, created_at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      evidenceId,
      caseId,
      req.headers['x-evidence-kind'] || 'frame',
      relToData(target),
      req.headers['content-type'] || 'application/octet-stream',
      original,
      sha256,
      req.headers['x-captured-at'] || null,
      now(),
      json({ uploadedBy: actor.id }),
    ],
  );
  run("UPDATE cases SET status = CASE WHEN status = 'new' THEN 'pending_review' ELSE status END, updated_at = ? WHERE id = ?", [now(), caseId]);
  audit(actor.id, 'evidence.upload', 'evidence', evidenceId, { caseId, original, sha256 });
  sendJson(res, 201, one('SELECT * FROM evidence WHERE id = ?', [evidenceId]));
}

async function createAnnotation(req, res, caseId) {
  const actor = actorFromDashboard(req);
  if (!one('SELECT id FROM cases WHERE id = ?', [caseId])) return sendJson(res, 404, { error: 'case_not_found' });
  const body = await readJson(req);
  if (!body.label) return sendJson(res, 400, { error: 'label_required' });
  const annId = id('ann');
  run(
    `INSERT INTO annotations (
      id, case_id, evidence_id, label, shape, x, y, w, h, points_json, identity_id, role,
      source, confidence, created_by, created_at, meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      annId,
      caseId,
      body.evidence_id || null,
      body.label,
      body.shape || 'bbox',
      body.x ?? null,
      body.y ?? null,
      body.w ?? null,
      body.h ?? null,
      body.points ? json(body.points) : null,
      body.identity_id || null,
      body.role || null,
      body.source || 'human',
      body.confidence ?? null,
      actor.id,
      now(),
      json(body.meta || {}),
    ],
  );
  if (body.identity_id && body.source !== 'model') {
    run('UPDATE master_identities SET positive_samples = positive_samples + 1, updated_at = ? WHERE id = ?', [now(), body.identity_id]);
  }
  audit(actor.id, 'annotation.create', 'annotation', annId, { caseId, label: body.label, identity_id: body.identity_id || null });
  sendJson(res, 201, one('SELECT * FROM annotations WHERE id = ?', [annId]));
}

async function uploadAnnotationCrop(req, res, annotationId) {
  const actor = actorFromDashboard(req);
  const annotation = one('SELECT * FROM annotations WHERE id = ?', [annotationId]);
  if (!annotation) return sendJson(res, 404, { error: 'annotation_not_found' });
  const bytes = await readRaw(req, 15 * 1024 * 1024);
  if (!bytes.length) return sendJson(res, 400, { error: 'empty_crop' });
  const identity = annotation.identity_id ? one('SELECT * FROM master_identities WHERE id = ?', [annotation.identity_id]) : null;
  const cropDir = path.join(DATA_DIR, 'crops', identity ? safeFilename(identity.display_name) : '_unassigned');
  ensureDir(cropDir);
  const cropPath = path.join(cropDir, `${annotation.id}.jpg`);
  fs.writeFileSync(cropPath, bytes);
  const sha256 = fileSha256(bytes);
  run(
    'UPDATE annotations SET crop_storage_path = ?, crop_sha256 = ?, meta_json = ? WHERE id = ?',
    [relToData(cropPath), sha256, json({ ...parseJson(annotation.meta_json), cropUploadedBy: actor.id, cropUploadedAt: now() }), annotationId],
  );
  audit(actor.id, 'annotation.crop.upload', 'annotation', annotationId, { sha256, identity_id: annotation.identity_id });
  sendJson(res, 201, { id: annotationId, crop_storage_path: relToData(cropPath), crop_sha256: sha256 });
}

function getAnnotationCrop(res, annotationId) {
  const annotation = one('SELECT * FROM annotations WHERE id = ?', [annotationId]);
  if (!annotation || !annotation.crop_storage_path) return sendJson(res, 404, { error: 'crop_not_found' });
  return sendFile(res, dataPath(annotation.crop_storage_path));
}

async function reviewCase(req, res, caseId) {
  const actor = actorFromDashboard(req);
  if (!one('SELECT id FROM cases WHERE id = ?', [caseId])) return sendJson(res, 404, { error: 'case_not_found' });
  const body = await readJson(req);
  if (!['violation', 'error', 'uncertain'].includes(body.verdict)) return sendJson(res, 400, { error: 'invalid_verdict' });
  const reviewId = id('review');
  run(
    'INSERT INTO reviews (id, case_id, reviewer_id, verdict, label, identity_id, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [reviewId, caseId, actor.id, body.verdict, body.label || null, body.identity_id || null, body.comment || null, now()],
  );
  run(
    `UPDATE cases
     SET status = ?, reviewer_id = ?, human_verdict = ?, human_label = ?, assigned_identity_id = COALESCE(?, assigned_identity_id),
         comment = COALESCE(?, comment), reviewed_at = ?, updated_at = ?
     WHERE id = ?`,
    [
      body.verdict === 'uncertain' ? 'needs_more_data' : 'reviewed',
      actor.id,
      body.verdict,
      body.label || null,
      body.identity_id || null,
      body.comment || null,
      now(),
      now(),
      caseId,
    ],
  );
  audit(actor.id, 'case.review', 'case', caseId, body);
  sendJson(res, 200, hydrateCase(one('SELECT * FROM cases WHERE id = ?', [caseId])));
}

function getEvidence(res, evidenceId) {
  const ev = one('SELECT * FROM evidence WHERE id = ?', [evidenceId]);
  if (!ev) return sendJson(res, 404, { error: 'evidence_not_found' });
  return sendFile(res, dataPath(ev.storage_path));
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return sendJson(res, 404, { error: 'file_not_found' });
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.json': 'application/json; charset=utf-8',
    '.jsonl': 'application/jsonl; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}

function getExportFile(res, exportName, relative) {
  const target = path.resolve(EXPORTS_DIR, safeFilename(exportName), relative);
  const root = path.resolve(EXPORTS_DIR);
  if (!target.startsWith(root + path.sep)) return sendJson(res, 403, { error: 'invalid_path' });
  return sendFile(res, target);
}

async function exportDataset(req, res) {
  const actor = actorFromDashboard(req);
  const body = await readJson(req);
  const includeStatuses = Array.isArray(body.includeStatuses) && body.includeStatuses.length
    ? body.includeStatuses
    : ['reviewed', 'needs_more_data'];
  const result = createDatasetExport({ actorId: actor.id, includeStatuses, format: body.format || 'grome-jsonl' });
  sendJson(res, 201, result);
}

function createDatasetExport({ actorId, includeStatuses, format }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportId = id('ds');
  const exportName = `video-audit-${stamp}`;
  const exportDir = path.join(EXPORTS_DIR, exportName);
  const imagesDir = path.join(exportDir, 'images');
  const yoloImagesDir = path.join(exportDir, 'yolo-person', 'images');
  const yoloLabelsDir = path.join(exportDir, 'yolo-person', 'labels');
  ensureDir(imagesDir);
  ensureDir(yoloImagesDir);
  ensureDir(yoloLabelsDir);

  const placeholders = includeStatuses.map(() => '?').join(',');
  const rows = all(`SELECT id FROM cases WHERE status IN (${placeholders}) ORDER BY created_at ASC`, includeStatuses);
  const manifestPath = path.join(exportDir, 'manifest.jsonl');
  const manifestLines = [];
  let casesCount = 0;

  for (const row of rows) {
    const current = hydrateCase(one('SELECT * FROM cases WHERE id = ?', [row.id]));
    const evidenceOut = [];
    for (const item of current.evidence) {
      const source = dataPath(item.storage_path);
      if (!fs.existsSync(source)) {
        evidenceOut.push({ ...item, missing: true });
        continue;
      }
      const imageName = `${current.id}_${safeFilename(path.basename(source))}`;
      const target = path.join(imagesDir, imageName);
      fs.copyFileSync(source, target);
      fs.copyFileSync(source, path.join(yoloImagesDir, imageName));
      const annotations = current.annotations.filter(a => a.evidence_id === item.id && a.label === 'person' && a.x != null && a.w > 0 && a.h > 0);
      const yoloLines = annotations.map(a => toYoloLine(a, item.width || a.meta?.image_width, item.height || a.meta?.image_height)).filter(Boolean);
      fs.writeFileSync(path.join(yoloLabelsDir, imageName.replace(/\.[^.]+$/, '.txt')), yoloLines.join('\n'), 'utf8');
      evidenceOut.push({ ...item, export_path: `images/${imageName}`, sha256: item.sha256 || fileSha256(source) });
    }
    manifestLines.push(JSON.stringify({ case: current, evidence: evidenceOut }));
    run("UPDATE cases SET status = 'exported', updated_at = ? WHERE id = ?", [now(), current.id]);
    casesCount += 1;
  }

  fs.writeFileSync(manifestPath, manifestLines.join('\n') + (manifestLines.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(path.join(exportDir, 'README_EXPORT.md'), [
    '# GROME Video Audit Dataset',
    '',
    'Source of truth for CV training.',
    '',
    '- manifest.jsonl: cases, evidence, reviews, identities and annotations.',
    '- images/: copied evidence frames.',
    '- yolo-person/: YOLO person bbox export, class 0 = person.',
    '- crops/: identity crops are stored in the live data directory and linked from annotation records.',
    '',
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(exportDir, 'yolo-person', 'dataset.yaml'), [
    `path: ${path.join(exportDir, 'yolo-person').replaceAll(path.sep, '/')}`,
    'train: images',
    'val: images',
    'names:',
    '  0: person',
    '',
  ].join('\n'), 'utf8');

  run(
    'INSERT INTO dataset_exports (id, name, format, storage_path, cases_count, created_by, created_at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [exportId, exportName, format, relToData(exportDir), casesCount, actorId || null, now(), json({ includeStatuses })],
  );
  audit(actorId, 'dataset.export', 'dataset_export', exportId, { exportName, casesCount, format });
  return {
    id: exportId,
    name: exportName,
    path: exportDir,
    casesCount,
    manifestUrl: `/api/video-audit/exports/${encodeURIComponent(exportName)}/manifest.jsonl`,
  };
}

function toYoloLine(annotation, imageWidth, imageHeight) {
  if (!imageWidth || !imageHeight) return null;
  const cx = (Number(annotation.x) + Number(annotation.w) / 2) / Number(imageWidth);
  const cy = (Number(annotation.y) + Number(annotation.h) / 2) / Number(imageHeight);
  const w = Number(annotation.w) / Number(imageWidth);
  const h = Number(annotation.h) / Number(imageHeight);
  if (![cx, cy, w, h].every(Number.isFinite)) return null;
  return `0 ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`;
}

module.exports = {
  handle,
};
