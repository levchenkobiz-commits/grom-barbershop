/**
 * Grome Adapter (Registry)
 * Единый источник правки для всех идентификаторов:
 * Дашборд (Короткие имена) <==> El.Kassa (Терминалы, Имена) <==> YClients (Company ID, Staff ID)
 */

const ADAPTER = {
    "Алексеевская": {
        "el_kassa_terminal": "64963",
        "yclients_company_id": "1113666",
        "masters": [
            {
                "dash": "Шавкат",
                "el_kassa": [
                    "Шавкат"
                ],
                "yclients_id": "4991729",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Шурик",
                "el_kassa": [
                    "Шурик"
                ],
                "yclients_id": "",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Шохназар Д.",
                "el_kassa": [
                    "Шохназар"
                ],
                "yclients_id": "3973848",
                "payBase": 5000,
                "payPercent": 40
            }
        ]
    },
    "Партизанская": {
        "el_kassa_terminal": "98439",
        "yclients_company_id": "1158048",
        "masters": [
            {
                "dash": "Элёрбек М.",
                "el_kassa": [
                    "Элёрбек"
                ],
                "yclients_id": "4739073",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Азамджон Т.",
                "el_kassa": [
                    "Азамджон"
                ],
                "yclients_id": "4938947",
                "payBase": 5000,
                "payPercent": 40
            }
        ]
    },
    "Варшавская": {
        "el_kassa_terminal": "62837",
        "yclients_company_id": "1158051",
        "masters": [
            {
                "dash": "Тима Ж.",
                "el_kassa": [
                    "Тима"
                ],
                "yclients_id": "4308882",
                "payBase": 5000,
                "payPercent": 50
            },
            {
                "dash": "Азим",
                "el_kassa": [
                    "Азим"
                ],
                "yclients_id": "5057982",
                "payBase": 5000,
                "payPercent": 50
            }
        ]
    },
    "Рязанский": {
        "el_kassa_terminal": "56972",
        "yclients_company_id": "1254232",
        "masters": [
            {
                "dash": "Рахмон Д.",
                "el_kassa": [
                    "Рахмон"
                ],
                "yclients_id": "4846941",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Новы мастер рп",
                "el_kassa": [
                    "Новы мастер рп"
                ],
                "yclients_id": "5123262",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Олим",
                "el_kassa": [
                    "Олим"
                ],
                "yclients_id": "",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Мухаммад",
                "el_kassa": [
                    "Мухаммад"
                ],
                "yclients_id": "",
                "payBase": 5000,
                "payPercent": 40
            }
        ]
    },
    "Сокол": {
        "el_kassa_terminal": "25307",
        "yclients_company_id": "1158043",
        "masters": [
            {
                "dash": "Авазбек М.",
                "el_kassa": [
                    "Авазбек",
                    "Али"
                ],
                "yclients_id": "4332696",
                "payBase": 5000,
                "payPercent": 50
            },
            {
                "dash": "Мухамаджон С.",
                "el_kassa": [
                    "Мухамаджон"
                ],
                "yclients_id": "4906984",
                "payBase": 5000,
                "payPercent": 50
            }
        ]
    },
    "Текстильщики": {
        "el_kassa_terminal": "35248",
        "yclients_company_id": "1158050",
        "masters": [
            {
                "dash": "Санжар Б.",
                "el_kassa": [
                    "Санжар"
                ],
                "yclients_id": "3523679",
                "payBase": 5000,
                "payPercent": 40
            },
            {
                "dash": "Эрболот С.",
                "el_kassa": [
                    "Эрболот"
                ],
                "yclients_id": "4900471",
                "payBase": 5000,
                "payPercent": 40
            }
        ]
    }
};

/** API АДАПТЕРА ДЛЯ ПРИЛОЖЕНИЯ */

// 1. Получить короткое имя мастера для дашборда из грязного имени элкассы
function getDashNameByElkassa(elkassaName, branchName = null) {
    if (!elkassaName) return "Неизвестный";
    
    // Ищем точное совпадение в филиале
    if (branchName && ADAPTER[branchName]) {
        for (const master of ADAPTER[branchName].masters) {
            if (master.el_kassa.some(name => elkassaName.toLowerCase().includes(name.toLowerCase()))) {
                return master.dash;
            }
        }
    }
    
    // Ищем точное совпадение по всей сети (подмены / переводы)
    for (const [loc, config] of Object.entries(ADAPTER)) {
        for (const master of config.masters) {
            if (master.el_kassa.some(name => elkassaName.toLowerCase().includes(name.toLowerCase()))) {
                return master.dash;
            }
        }
    }

    // Если не найдено, возвращаем как есть, но обрезаем
    return elkassaName.split(' ')[0];
}

// 2. Получить YClients ID мастера по имени из дашборда
function getYclientsId(dashName, branchName) {
    if (!ADAPTER[branchName]) return null;
    const master = ADAPTER[branchName].masters.find(m => m.dash === dashName);
    return master ? master.yclients_id : null;
}

// Получить имя дашборда по имени YClients
function getDashNameByYclients(ycName, branchName = null) {
    if (!ycName) return "Неизвестный";
    
    if (branchName && ADAPTER[branchName]) {
        for (const master of ADAPTER[branchName].masters) {
            const namesToCheck = [master.dash, ...(master.el_kassa || [])];
            if (namesToCheck.some(n => ycName.toLowerCase().includes(n.toLowerCase()))) {
                return master.dash;
            }
        }
    }

    for (const [loc, config] of Object.entries(ADAPTER)) {
        for (const master of config.masters) {
            const namesToCheck = [master.dash, ...(master.el_kassa || [])];
            if (namesToCheck.some(n => ycName.toLowerCase().includes(n.toLowerCase()))) {
                return master.dash;
            }
        }
    }
    return ycName.split(' ')[0];
}

// 3. Получить Терминал Эл.Кассы
function getTerminalId(branchName) {
    if (!ADAPTER[branchName]) return null;
    return ADAPTER[branchName].el_kassa_terminal;
}

// 4. Получить Company ID YClients
function getYclientsCompanyId(branchName) {
    if (!ADAPTER[branchName]) return null;
    return ADAPTER[branchName].yclients_company_id;
}

// Для использования в Node.js (agent.js, сервер)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ADAPTER,
        getDashNameByElkassa,
        getYclientsId,
        getTerminalId,
        getYclientsCompanyId,
        getDashNameByYclients
    };
}

function getDashNameByYclientsId(staffId) {
    if (!staffId) return null;
    const strId = String(staffId).trim();
    for (const [loc, config] of Object.entries(ADAPTER)) {
        for (const master of config.masters) {
            if (master.yclients_id === strId) {
                return master.dash;
            }
        }
    }
    return null;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports.getDashNameByYclientsId = getDashNameByYclientsId;
}
