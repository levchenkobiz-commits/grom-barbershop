/**
 * routes/adapter.js
 * Маршрут: POST /api/adapter — сохранить новый adapter.js на диск
 */

const fs   = require('fs');
const crypto = require('crypto');
const PATHS = require('./paths');
const { getStaffDirectory } = require('./elkassa');

const DISABLED_BRANCHES = new Set(['Варшавская']);

function masterIdentity(master) {
  const yclientsId = String(master?.yclients_id || '').trim();
  if (yclientsId) return `yc:${yclientsId}`;
  return `name:${String(master?.dash || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()}`;
}

function findAddedMasters(previousAdapter, nextAdapter) {
  const existing = new Set();
  for (const branch of Object.values(previousAdapter || {})) {
    for (const master of Array.isArray(branch?.masters) ? branch.masters : []) {
      existing.add(masterIdentity(master));
    }
  }
  const added = [];
  for (const [location, branch] of Object.entries(nextAdapter || {})) {
    for (const master of Array.isArray(branch?.masters) ? branch.masters : []) {
      if (!existing.has(masterIdentity(master))) {
        added.push({ masterName: master.dash, location, yclientsId: String(master.yclients_id || '') });
      }
    }
  }
  return added;
}

function loadCurrentAdapter() {
  try {
    const adapterPath = require.resolve('../adapter');
    delete require.cache[adapterPath];
    return require(adapterPath).ADAPTER || {};
  } catch (_) {
    return {};
  }
}

function validateAdapter(rawAdapter, staffDirectory) {
  const errors = [];
  const yclientsIds = new Set();
  const identityAliases = new Map();
  for (const [branchName, branch] of Object.entries(rawAdapter || {})) {
    if (DISABLED_BRANCHES.has(branchName)) {
      errors.push(`${branchName}: филиал отключён`);
      continue;
    }
    const terminal = String(branch.el_kassa_terminal || '').trim();
    if (!terminal) errors.push(`${branchName}: не указан терминал El.Kassa`);
    if (!String(branch.yclients_company_id || '').trim()) errors.push(`${branchName}: не указан YClients company ID`);
    const exactElKassaNames = new Set((staffDirectory.byTerminal[terminal] || []).map(name => String(name).trim()));
    for (const master of Array.isArray(branch.masters) ? branch.masters : []) {
      const dashName = String(master.dash || '').trim();
      const elNames = Array.isArray(master.el_kassa)
        ? master.el_kassa.map(value => String(value || '').trim()).filter(Boolean)
        : String(master.el_kassa || '').split(',').map(value => value.trim()).filter(Boolean);
      const elName = elNames[0] || '';
      const yclientsId = String(master.yclients_id || '').trim();
      const label = dashName || elName || 'Мастер без имени';
      const aliases = [dashName, ...elNames, ...(Array.isArray(master.aliases) ? master.aliases : [])]
        .map(value => String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\([^)]*\)/g, ' ').replace(/[^a-zа-я0-9]+/gi, ' ').trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      for (const alias of aliases) {
        const owner = identityAliases.get(alias);
        if (owner && owner !== label) errors.push(`${branchName} / ${label}: псевдоним «${alias}» уже принадлежит ${owner}`);
        else identityAliases.set(alias, label);
      }
      if (elNames.length !== 1) errors.push(`${branchName} / ${label}: разрешено ровно одно имя El.Kassa`);
      if (!elName || !exactElKassaNames.has(elName)) errors.push(`${branchName} / ${label}: имя отсутствует в El.Kassa этого терминала`);
      if (dashName !== elName) errors.push(`${branchName} / ${label}: имя в адаптере должно точно совпадать с El.Kassa`);
      if (!/^\d+$/.test(yclientsId)) errors.push(`${branchName} / ${label}: заполните числовой YClients ID`);
      if (yclientsId && yclientsIds.has(yclientsId)) errors.push(`${branchName} / ${label}: YClients ID уже используется`);
      if (yclientsId) yclientsIds.add(yclientsId);
    }
  }
  return errors;
}

function normalizeAdapter(rawAdapter, previousAdapter = {}) {
  const adapter = {};
  for (const [branchName, branch] of Object.entries(rawAdapter || {})) {
    const masters = Array.isArray(branch.masters) ? branch.masters : [];
    const previousIdsByName = new Map(((previousAdapter[branchName] || {}).masters || []).map(master => [
      String(master.dash || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(),
      String(master.grome_id || ''),
    ]));
    adapter[branchName] = {
      ...branch,
      masters: masters.map(master => {
        const elNames = Array.isArray(master.el_kassa)
          ? master.el_kassa.map(s => String(s || '').trim()).filter(Boolean)
          : String(master.el_kassa || '').split(',').map(s => s.trim()).filter(Boolean);
        const primaryName = elNames[0] || String(master.dash || '').trim();
        const normalizedName = primaryName.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
        const aliases = Array.isArray(master.aliases)
          ? Array.from(new Set(master.aliases.map(value => String(value || '').trim()).filter(Boolean)))
          : [];
        return {
          ...master,
          grome_id: /^gm_[a-z0-9]{8,}$/i.test(String(master.grome_id || previousIdsByName.get(normalizedName) || ''))
            ? String(master.grome_id || previousIdsByName.get(normalizedName))
            : `gm_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          dash: primaryName,
          el_kassa: primaryName ? (elNames.length ? elNames : [primaryName]) : [],
          aliases,
          topMaster: master.topMaster === true,
        };
      }).filter(master => master.dash),
    };
  }
  return adapter;
}

function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const inputAdapter = JSON.parse(body);
      const staffDirectory = await getStaffDirectory(7, false);
      const errors = validateAdapter(inputAdapter, staffDirectory);
      if (errors.length) {
        res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Адаптер не сохранён', details: errors }));
      }
      const previousAdapter = loadCurrentAdapter();
      const rawAdapter = normalizeAdapter(inputAdapter, previousAdapter);
      const addedMasters = findAddedMasters(previousAdapter, rawAdapter);

      const fileContent = String.raw`/**
 * Grome Adapter (Registry)
 * Единый источник правды для всех идентификаторов:
 * Дашборд (Короткие имена) <=> El.Kassa (Терминалы, Имена) <=> YClients (Company ID, Staff ID)
 */

const ADAPTER = ${JSON.stringify(rawAdapter, null, 4)};

/** API АДАПТЕРА ДЛЯ ПРИЛОЖЕНИЯ */

function normalizeMasterIdentity(value) {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-zа-я0-9]+/gi, ' ').trim().replace(/\s+/g, ' ');
}

function getMasterIdentityAliases(master) {
    return [master.dash, ...(master.el_kassa || []), ...(master.aliases || [])]
        .map(normalizeMasterIdentity).filter(Boolean);
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
    const requestedFirst = requested.split(' ')[0];
    const firstToken = records.filter(record => record.aliases.some(alias => alias.split(' ')[0] === requestedFirst));
    if (firstToken.length === 1) return { ...firstToken[0].master, location: firstToken[0].location };
    const bounded = records.filter(record => record.aliases.some(alias => requested.startsWith(alias + ' ') || alias.startsWith(requested + ' ')));
    return bounded.length === 1 ? { ...bounded[0].master, location: bounded[0].location } : null;
}

function getDashNameByElkassa(elkassaName, branchName = null) {
    return findAdapterMaster(elkassaName, branchName)?.dash || null;
}

// 2. Получить YClients ID мастера по имени из дашборда
function getYclientsId(dashName, branchName) {
    if (!ADAPTER[branchName]) return null;
    const master = ADAPTER[branchName].masters.find(m => m.dash === dashName);
    return master ? master.yclients_id : null;
}

// 3. Получить имя дашборда по имени YClients
function getDashNameByYclients(ycName, branchName = null) {
    return findAdapterMaster(ycName, branchName)?.dash || null;
}

// 4. Получить Терминал Эл.Кассы
function getTerminalId(branchName) {
    if (!ADAPTER[branchName]) return null;
    return ADAPTER[branchName].el_kassa_terminal;
}

// 5. Получить Company ID YClients
function getYclientsCompanyId(branchName) {
    if (!ADAPTER[branchName]) return null;
    return ADAPTER[branchName].yclients_company_id;
}

// 6. Получить имя мастера для дашборда по YClients staff_id
function getDashNameByYclientsId(staffId) {
    if (!staffId) return undefined;
    const sid = String(staffId);
    for (const [, config] of Object.entries(ADAPTER)) {
        for (const master of config.masters) {
            if (master.yclients_id === sid) return master.dash;
        }
    }
    return undefined;
}

if (typeof window !== 'undefined') {
    window.ADAPTER = ADAPTER;
    window.normalizeMasterIdentity = normalizeMasterIdentity;
    window.getMasterIdentityAliases = getMasterIdentityAliases;
    window.findAdapterMaster = findAdapterMaster;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADAPTER, normalizeMasterIdentity, getMasterIdentityAliases, findAdapterMaster, getDashNameByElkassa, getYclientsId, getTerminalId, getYclientsCompanyId, getDashNameByYclients, getDashNameByYclientsId };
}
`;

      fs.writeFileSync(PATHS.adapterOut, fileContent, 'utf-8');
      require('./master_onboarding').loadAndSync();
      // The adapter is the source of truth: create/activate master cabinets
      // immediately after a successful save, not only when someone opens the list.
      const { reconcileMasterAccounts } = require('./master_accounts');
      reconcileMasterAccounts(rawAdapter);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', addedMasters }));
    } catch (e) {
      console.error('[Adapter] save error:', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Адаптер не сохранён: ' + e.message }));
    }
  });
}

module.exports = { handlePost, normalizeAdapter, validateAdapter, findAddedMasters, masterIdentity };
