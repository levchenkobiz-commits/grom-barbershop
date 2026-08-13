const { getMasterAliases, matchesMaster } = require('./master_scope');

function currentAdapter() {
  const adapterPath = require.resolve('../adapter');
  delete require.cache[adapterPath];
  return require('../adapter').ADAPTER || {};
}

function publicAdapter(adapter = currentAdapter()) {
  return Object.fromEntries(Object.entries(adapter || {}).map(([location, branch]) => [location, {
    el_kassa_terminal: branch.el_kassa_terminal || '',
    masters: (branch.masters || []).map(master => ({
      dash: master.dash,
      el_kassa: master.el_kassa || [],
      aliases: master.aliases || [],
    })),
  }]));
}

function personalAdapter(masterName, adapter = currentAdapter()) {
  const aliases = getMasterAliases(masterName);
  return Object.fromEntries(Object.entries(adapter || {}).map(([location, branch]) => {
    const masters = (branch.masters || []).filter(master => matchesMaster(master.dash, aliases));
    if (!masters.length) return null;
    return [location, { el_kassa_terminal: branch.el_kassa_terminal || '', masters }];
  }).filter(Boolean));
}

function handleScript(req, res) {
  const source = String.raw`
const ADAPTER = ${JSON.stringify(publicAdapter())};
window.ADAPTER = ADAPTER;
function normalizeMasterIdentity(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zа-я0-9]+/gi, ' ').trim().replace(/\s+/g, ' ');
}
function getMasterIdentityAliases(master) {
  return [master.dash, ...(master.el_kassa || []), ...(master.aliases || [])].map(normalizeMasterIdentity).filter(Boolean);
}
function findAdapterMaster(name, branchName = null) {
  const requested = normalizeMasterIdentity(name);
  if (!requested) return null;
  const records = [];
  for (const [location, branch] of Object.entries(ADAPTER)) {
    if (branchName && location !== branchName) continue;
    for (const master of (branch.masters || [])) records.push({ location, master, aliases: getMasterIdentityAliases(master) });
  }
  const exact = records.filter(record => record.aliases.includes(requested));
  if (exact.length === 1) return { ...exact[0].master, location: exact[0].location };
  if (exact.length > 1) return null;
  const first = requested.split(' ')[0];
  const firstMatches = records.filter(record => record.aliases.some(alias => alias.split(' ')[0] === first));
  return firstMatches.length === 1 ? { ...firstMatches[0].master, location: firstMatches[0].location } : null;
}
function getDashNameByElkassa(name, branchName = null) { return findAdapterMaster(name, branchName)?.dash; }
function getYclientsId(name) { return findAdapterMaster(name)?.yclients_id; }
function getTerminalId(branchName) { return ADAPTER[branchName]?.el_kassa_terminal || null; }
function getYclientsCompanyId(branchName) { return ADAPTER[branchName]?.yclients_company_id || null; }
function getDashNameByYclients(name) { return findAdapterMaster(name)?.dash; }
function getDashNameByYclientsId(staffId) {
  const id = String(staffId || '');
  for (const branch of Object.values(ADAPTER)) {
    const master = (branch.masters || []).find(item => String(item.yclients_id || '') === id);
    if (master) return master.dash;
  }
  return undefined;
}
window.normalizeMasterIdentity = normalizeMasterIdentity;
window.getMasterIdentityAliases = getMasterIdentityAliases;
window.findAdapterMaster = findAdapterMaster;
`;
  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  res.end(source);
}

function handleConfig(req, res) {
  const user = req.authUser;
  const adapter = currentAdapter();
  const data = user && user.role === 'master' ? personalAdapter(user.name, adapter) : adapter;
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data || {}));
}

module.exports = { currentAdapter, handleScript, handleConfig, publicAdapter, personalAdapter };
