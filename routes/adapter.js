/**
 * routes/adapter.js
 * Маршрут: POST /api/adapter — сохранить новый adapter.js на диск
 */

const fs   = require('fs');
const PATHS = require('./paths');

function handlePost(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const rawAdapter = JSON.parse(body);

      const fileContent = `/**
 * Grome Adapter (Registry)
 * Единый источник правды для всех идентификаторов:
 * Дашборд (Короткие имена) <=> El.Kassa (Терминалы, Имена) <=> YClients (Company ID, Staff ID)
 */

const ADAPTER = ${JSON.stringify(rawAdapter, null, 4)};

/** API АДАПТЕРА ДЛЯ ПРИЛОЖЕНИЯ */

// 1. Получить короткое имя мастера для дашборда из грязного имени элкассы
function getDashNameByElkassa(elkassaName, branchName = null) {
    if (!elkassaName) return "Неизвестный";
    for (const [loc, config] of Object.entries(ADAPTER)) {
        if (branchName && loc !== branchName) continue;
        for (const master of config.masters) {
            if (master.el_kassa.some(name => elkassaName.toLowerCase().includes(name.toLowerCase()))) {
                return master.dash;
            }
        }
    }
    return elkassaName.split(' ')[0];
}

// 2. Получить YClients ID мастера по имени из дашборда
function getYclientsId(dashName, branchName) {
    if (!ADAPTER[branchName]) return null;
    const master = ADAPTER[branchName].masters.find(m => m.dash === dashName);
    return master ? master.yclients_id : null;
}

// 3. Получить имя дашборда по имени YClients
function getDashNameByYclients(ycName, branchName = null) {
    if (!ycName) return "Неизвестный";
    for (const [loc, config] of Object.entries(ADAPTER)) {
        if (branchName && loc !== branchName) continue;
        for (const master of config.masters) {
            const namesToCheck = [master.dash, ...(master.el_kassa || [])];
            if (namesToCheck.some(n => ycName.toLowerCase().includes(n.toLowerCase()))) {
                return master.dash;
            }
        }
    }
    return ycName.split(' ')[0];
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADAPTER, getDashNameByElkassa, getYclientsId, getTerminalId, getYclientsCompanyId, getDashNameByYclients };
}
`;

      fs.writeFileSync(PATHS.adapterOut, fileContent, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success' }));
    } catch (e) {
      console.error('[Adapter] save error:', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed' }));
    }
  });
}

module.exports = { handlePost };
