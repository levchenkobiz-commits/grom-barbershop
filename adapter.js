/**
 * Grome Adapter (Registry)
 * Единый источник правды для всех идентификаторов:
 * Дашборд (Короткие имена) <=> El.Kassa (Терминалы, Имена) <=> YClients (Company ID, Staff ID)
 */

const ADAPTER = {
    "Сокол": {
        "el_kassa_terminal": "25307",
        "yclients_company_id": "1158043",
        "masters": [
            {
                "dash": "Авазбек М.",
                "el_kassa": [
                    "Авазбек М."
                ],
                "aliases": ["Авазбек"],
                "yclients_id": "4332696",
                "payBase": 5000,
                "payPercent": 50,
                "topMaster": false
            },
            {
                "dash": "Мухамаджон С.",
                "el_kassa": [
                    "Мухамаджон С."
                ],
                "aliases": ["Мухамаджон", "Мухаммаджон"],
                "yclients_id": "4906984",
                "payBase": 5000,
                "payPercent": 50,
                "topMaster": false
            }
        ]
    },
    "Алексеевская": {
        "el_kassa_terminal": "64963",
        "yclients_company_id": "1113666",
        "masters": [
            {
                "dash": "Шавкатбек М.",
                "el_kassa": [
                    "Шавкатбек М."
                ],
                "aliases": ["Шавкатбек", "Шавкат"],
                "yclients_id": "4991729",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": true
            },
            {
                "dash": "Сухробжон Д.",
                "el_kassa": [
                    "Сухробжон Д."
                ],
                "aliases": ["Сухробжон", "Сухроб"],
                "yclients_id": "5282325",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            },
            {
                "dash": "Азимжон Ш.",
                "el_kassa": [
                    "Азимжон Ш."
                ],
                "aliases": ["Азимжон", "Азим"],
                "yclients_id": "5808624",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            }
        ]
    },
    "Партизанская": {
        "el_kassa_terminal": "98439",
        "yclients_company_id": "1158048",
        "masters": [
            {
                "dash": "Тологон А.",
                "el_kassa": [
                    "Тологон А."
                ],
                "aliases": ["Тологон"],
                "yclients_id": "5527905",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            },
            {
                "dash": "Азамат",
                "el_kassa": [
                    "Азамат"
                ],
                "yclients_id": "5726382",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            }
        ]
    },
    "Рязанский": {
        "el_kassa_terminal": "56972",
        "yclients_company_id": "1254232",
        "masters": [
            {
                "dash": "Олимжон Х.",
                "el_kassa": [
                    "Олимжон Х."
                ],
                "aliases": ["Олимжон"],
                "yclients_id": "5598078",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            },
            {
                "dash": "Фархад",
                "el_kassa": [
                    "Фархад"
                ],
                "yclients_id": "5701596",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            },
            {
                "dash": "Мухамад",
                "el_kassa": [
                    "Мухамад"
                ],
                "yclients_id": "5751696",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            }
        ]
    },
    "Текстильщики": {
        "el_kassa_terminal": "35248",
        "yclients_company_id": "1158050",
        "masters": [
            {
                "dash": "Эрболот С.",
                "el_kassa": [
                    "Эрболот С."
                ],
                "yclients_id": "4900471",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": true
            },
            {
                "dash": "Самаган С.",
                "el_kassa": [
                    "Самаган С."
                ],
                "aliases": ["Самаган"],
                "yclients_id": "5743830",
                "payBase": 5000,
                "payPercent": 40,
                "topMaster": false
            }
        ]
    }
};

/** API АДАПТЕРА ДЛЯ ПРИЛОЖЕНИЯ */

function normalizeMasterIdentity(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-zа-я0-9]+/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function getMasterIdentityAliases(master) {
    return [master.dash, ...(master.el_kassa || []), ...(master.aliases || [])]
        .map(normalizeMasterIdentity)
        .filter(Boolean);
}

// Единственный resolver идентичности. Возвращает только мастера из ADAPTER.
// Неоднозначное или неизвестное имя всегда даёт null — новый профиль не создаётся.
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
    return null;
}

// 1. Получить каноническое имя. Неизвестные сотрудники исключаются.
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
