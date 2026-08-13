const crypto = require('crypto');
const fs = require('fs');
const PATHS = require('./paths');

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  const transliterated = Array.from(normalizeName(value))
    .map(char => TRANSLIT[char] == null ? char : TRANSLIT[char])
    .join('');
  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'master';
}

function generatePassword(length = 12) {
  let password = '';
  while (password.length < length) {
    password += PASSWORD_ALPHABET[crypto.randomInt(0, PASSWORD_ALPHABET.length)];
  }
  return password;
}

function readRoles() {
  if (!fs.existsSync(PATHS.roles)) return {};
  return JSON.parse(fs.readFileSync(PATHS.roles, 'utf8'));
}

function writeRoles(roles) {
  const temporary = `${PATHS.roles}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(roles, null, 2)}\n`, 'utf8');
  JSON.parse(fs.readFileSync(temporary, 'utf8'));
  fs.renameSync(temporary, PATHS.roles);
}

function adapterMasters(adapter) {
  const grouped = new Map();
  for (const [location, branch] of Object.entries(adapter || {})) {
    for (const master of Array.isArray(branch && branch.masters) ? branch.masters : []) {
      const name = String(master && master.dash || '').trim();
      const key = normalizeName(name);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, { name, locations: [] });
      const record = grouped.get(key);
      if (!record.locations.includes(location)) record.locations.push(location);
    }
  }
  return Array.from(grouped.values());
}

function uniqueLogin(base, roles) {
  let login = `master-${slugify(base)}`;
  let suffix = 2;
  while (Object.hasOwn(roles, login)) {
    login = `master-${slugify(base)}-${suffix}`;
    suffix += 1;
  }
  return login;
}

function reconcileMasterAccounts(adapter) {
  const roles = readRoles();
  const masters = adapterMasters(adapter);
  const activeNames = new Set(masters.map(master => normalizeName(master.name)));
  let changed = false;

  for (const master of masters) {
    const normalized = normalizeName(master.name);
    let login = Object.keys(roles).find(key => {
      const user = roles[key];
      return user && user.role === 'master' && normalizeName(user.name) === normalized;
    });
    if (!login) {
      login = uniqueLogin(master.name, roles);
      roles[login] = {
        password: generatePassword(),
        role: 'master',
        name: master.name,
        source: 'adapter',
        active: true,
        mustChangePassword: true,
        passwordIssuedAt: new Date().toISOString(),
        locations: master.locations,
      };
      changed = true;
      continue;
    }

    const user = roles[login];
    if (user.source === 'adapter') {
      const nextLocations = master.locations.slice().sort();
      const currentLocations = Array.isArray(user.locations) ? user.locations.slice().sort() : [];
      if (user.name !== master.name ||
          user.active === false ||
          JSON.stringify(currentLocations) !== JSON.stringify(nextLocations)) {
        user.name = master.name;
        user.active = true;
        user.locations = master.locations;
        changed = true;
      }
    }
  }

  for (const user of Object.values(roles)) {
    if (!user || user.role !== 'master' || user.source !== 'adapter') continue;
    const shouldBeActive = activeNames.has(normalizeName(user.name));
    if (user.active !== shouldBeActive) {
      user.active = shouldBeActive;
      changed = true;
    }
  }

  if (changed) writeRoles(roles);
  return { roles, masters, changed };
}

function credentialsForAdapter(adapter) {
  const { roles, masters } = reconcileMasterAccounts(adapter);
  return masters.map(master => {
    const login = Object.keys(roles).find(key => {
      const user = roles[key];
      return user && user.role === 'master' &&
        user.active !== false &&
        normalizeName(user.name) === normalizeName(master.name);
    });
    const user = login ? roles[login] : null;
    return {
      name: master.name,
      locations: master.locations,
      login: login || '',
      password: user ? user.password : '',
      active: Boolean(login && user && user.password),
    };
  });
}

function currentAdapter() {
  const adapterPath = require.resolve('../adapter');
  delete require.cache[adapterPath];
  return require('../adapter').ADAPTER || {};
}

function ensureCurrentMasterAccounts() {
  return reconcileMasterAccounts(currentAdapter());
}

function handleGet(req, res) {
  try {
    const accounts = credentialsForAdapter(currentAdapter());
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(JSON.stringify({ accounts }));
  } catch (error) {
    console.error('[MasterAccounts] read error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Не удалось получить данные личных кабинетов' }));
  }
}

function handlePreviewList(req, res) {
  try {
    const masters = adapterMasters(currentAdapter()).map(master => ({ name: master.name, locations: master.locations }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' });
    res.end(JSON.stringify({ masters }));
  } catch (error) {
    console.error('[MasterAccounts] preview list error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Не удалось получить актуальный список мастеров' }));
  }
}

module.exports = {
  adapterMasters,
  credentialsForAdapter,
  ensureCurrentMasterAccounts,
  generatePassword,
  handleGet, handlePreviewList,
  normalizeName,
  reconcileMasterAccounts,
};
