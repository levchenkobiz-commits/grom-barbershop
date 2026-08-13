const fs = require('fs');
let adapterCache = null;
let adapterMtimeMs = -1;

function currentAdapterApi() {
  const adapterPath = require.resolve('../adapter');
  const mtimeMs = fs.statSync(adapterPath).mtimeMs;
  if (!adapterCache || mtimeMs !== adapterMtimeMs) {
    delete require.cache[adapterPath];
    adapterCache = require('../adapter');
    adapterMtimeMs = mtimeMs;
  }
  return adapterCache;
}

function currentAdapter() {
  return currentAdapterApi().ADAPTER || {};
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function resolveMaster(masterName, location = null) {
  const adapterApi = currentAdapterApi();
  return typeof adapterApi.findAdapterMaster === 'function'
    ? adapterApi.findAdapterMaster(masterName, location)
    : null;
}

function getMasterAliases(masterName) {
  const resolved = resolveMaster(masterName);
  if (!resolved) return new Set();
  return new Set([resolved.dash, ...(resolved.el_kassa || []), ...(resolved.aliases || [])].map(normalizeName).filter(Boolean));
}

function matchesMaster(value, aliases) {
  const normalized = normalizeName(value);
  if (!normalized || !aliases || aliases.size === 0) return false;
  return aliases.has(normalized);
}

function filterNamedObject(source, aliases) {
  return Object.fromEntries(
    Object.entries(source || {}).filter(([name]) => matchesMaster(name, aliases))
  );
}

function canonicalMasterName(masterName, location = null) {
  return resolveMaster(masterName, location)?.dash || null;
}

function adapterMasterNames() {
  return new Set(Object.values(currentAdapter()).flatMap(branch =>
    (branch && Array.isArray(branch.masters) ? branch.masters : []).map(master => master.dash)
  ));
}

// A manager may view a master's cabinet only through this canonical adapter
// lookup. Query text is never treated as an identity on its own.
function resolveAuthorizedMasterPreview(req) {
  let requested = '';
  try { requested = String(new URL(req.url, 'http://localhost').searchParams.get('master') || '').trim(); } catch (_) {}
  if (!requested) return { requested: false, master: null };
  const role = req && req.authUser && req.authUser.role;
  if (!['owner', 'manager'].includes(role)) return { requested: true, master: null, error: 'Недостаточно прав для просмотра кабинета мастера' };
  const master = canonicalMasterName(requested);
  return master
    ? { requested: true, master }
    : { requested: true, master: null, error: 'Мастер отсутствует в актуальном адаптере' };
}

module.exports = { currentAdapter, normalizeName, resolveMaster, canonicalMasterName, adapterMasterNames, getMasterAliases, matchesMaster, filterNamedObject, resolveAuthorizedMasterPreview };
