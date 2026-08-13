/** Master paperwork and uniform status. Adapter identities remain authoritative. */
const fs = require('fs');
const PATHS = require('./paths');

const DOCUMENT_STATUSES = new Set(['pending', 'completed']);
const UNIFORM_STATUSES = new Set(['none', 'issued', 'apron', 'shirt', 'own']);

function currentAdapter() {
  const adapterPath = require.resolve('../adapter');
  delete require.cache[adapterPath];
  return require(adapterPath).ADAPTER || {};
}

function masterKey(master) {
  return String(master?.grome_id || '').trim();
}

function emptyState() {
  return { version: 1, masters: {} };
}

function syncState(adapter, inputState = emptyState(), now = new Date().toISOString()) {
  const state = {
    version: 1,
    masters: { ...(inputState && inputState.masters ? inputState.masters : {}) },
  };
  const activeKeys = new Set();

  for (const [salon, branch] of Object.entries(adapter || {})) {
    for (const master of (branch.masters || [])) {
      const id = masterKey(master);
      if (!id) continue;
      activeKeys.add(id);
      const previous = state.masters[id] || {};
      state.masters[id] = {
        id,
        employeeId: id,
        masterName: String(master.dash || ''),
        salon,
        createdAt: previous.createdAt || now,
        documentsStatus: DOCUMENT_STATUSES.has(previous.documentsStatus) ? previous.documentsStatus : 'pending',
        uniformStatus: UNIFORM_STATUSES.has(previous.uniformStatus) ? previous.uniformStatus : 'none',
        updatedAt: previous.updatedAt || null,
        updatedBy: previous.updatedBy || '',
        active: true,
      };
    }
  }

  for (const [id, record] of Object.entries(state.masters)) {
    if (!activeKeys.has(id)) state.masters[id] = { ...record, active: false };
  }
  return state;
}

function readState() {
  try { return JSON.parse(fs.readFileSync(PATHS.masterOnboarding, 'utf8')); }
  catch (_) { return emptyState(); }
}

function writeState(state) {
  const temp = `${PATHS.masterOnboarding}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(temp, PATHS.masterOnboarding);
}

function loadAndSync() {
  const state = syncState(currentAdapter(), readState());
  writeState(state);
  return state;
}

function publicRecords(state) {
  return Object.values(state.masters || {})
    .filter(record => record.active !== false)
    .sort((a, b) => a.salon.localeCompare(b.salon, 'ru') || a.masterName.localeCompare(b.masterName, 'ru'));
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

function handleGet(req, res) {
  const state = loadAndSync();
  json(res, 200, {
    records: publicRecords(state),
    statuses: {
      documents: ['pending', 'completed'],
      uniform: ['none', 'issued', 'apron', 'shirt', 'own'],
    },
  });
}

function handlePatch(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const payload = JSON.parse(body || '{}');
      const id = String(payload.id || '');
      const state = loadAndSync();
      const record = state.masters[id];
      if (!record || record.active === false) return json(res, 404, { error: 'Мастер не найден в адаптере' });

      let changed = false;
      if (payload.documentsStatus !== undefined) {
        if (!DOCUMENT_STATUSES.has(payload.documentsStatus)) return json(res, 400, { error: 'Некорректный статус документов' });
        record.documentsStatus = payload.documentsStatus;
        changed = true;
      }
      if (payload.uniformStatus !== undefined) {
        if (!UNIFORM_STATUSES.has(payload.uniformStatus)) return json(res, 400, { error: 'Некорректный статус формы' });
        record.uniformStatus = payload.uniformStatus;
        changed = true;
      }
      if (!changed) return json(res, 400, { error: 'Не указан новый статус' });

      record.updatedAt = new Date().toISOString();
      record.updatedBy = req.authUser?.name || '';
      writeState(state);
      json(res, 200, { status: 'ok', record });
    } catch (error) {
      json(res, 400, { error: `Статус не сохранён: ${error.message}` });
    }
  });
}

module.exports = {
  handleGet, handlePatch, loadAndSync, syncState, publicRecords, masterKey,
  DOCUMENT_STATUSES, UNIFORM_STATUSES,
};
