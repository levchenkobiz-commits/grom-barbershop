/**
 * public/js/config.js
 * FINANCIAL DEFAULTS — DO NOT TOUCH the handbook block without explicit user authorization.
 * Mandatory instructions: /root/grom-dashboard/AGENTS.md
 * =====================================================
 * ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ для общего состояния.
 * Все остальные модули ЧИТАЮТ отсюда — никто не перезаписывает чужое.
 *
 * Экспортирует в window:
 *   - window.LOCATIONS        — список филиалов из ADAPTER
 *   - window.BARBER_ROSTER    — { [loc]: [masterName, ...] }
 *   - window.GLOBAL_HANDBOOK  — штрафы (загружаются с /api/handbook)
 *   - window.CURRENT_MASTER   — имя залогиненного мастера
 */

// ---- Инициализация LOCATIONS и BARBER_ROSTER из ADAPTER ----
// ADAPTER определён в index.html (встроен из adapter.js)
window.LOCATIONS = Object.keys(ADAPTER);
window.BARBER_ROSTER = {};
window.LOCATIONS.forEach(loc => {
    window.BARBER_ROSTER[loc] = ADAPTER[loc].masters.map(m => m.dash);
});

// ---- Дефолтный мастер (будет перезаписан после логина из /api/me) ----
window.CURRENT_MASTER = "";

// ---- Справочник штрафов (будет загружен с сервера) ----
window.GLOBAL_HANDBOOK = {
    "Опоздание 1-3 мин":                0,
    "Опоздание 4-10 мин":               200,
    "Опоздание 11-20 мин":              300,
    "Опоздание 21-30 мин":              500,
    "Опоздание 31-60 мин":              1000,
    "Опоздание 61+ мин (Невыход)":      5000,
    "Опоздание второй мастер 1-3 мин":   0,
    "Опоздание второй мастер 4-10 мин":  200,
    "Опоздание второй мастер 11-20 мин": 300,
    "Опоздание второй мастер 21-30 мин": 500,
    "Опоздание второй мастер 31-60 мин": 1000,
    "Опоздание второй мастер 61+ мин (Невыход)": 5000,
    "Невыход":                          5000,
    "Услуга не проведена через терминал": 5000,
    "Грязное рабочее место":            500,
    "Без формы":                        500,
    "Еда / напитки на рабочем месте":   500,
    "Разговор на нац. языке":           500,
    "Отказ клиенту":                    1000,
    "Не показал зеркало заднего вида":  300,
    "Не обработал инструмент":          300,
    "Поломка":                          0,
    "Про акцию не сказал":              200,
    "Телефон при клиенте":              0,
    "Другое":                           0
};

/**
 * Загружает справочник штрафов с сервера.
 * Вызывается один раз из DOMContentLoaded.
 */
async function loadHandbook() {
    try {
        const res = await fetch('/api/handbook');
        if (res.ok) {
            const handbook = await res.json();
            window.GLOBAL_HANDBOOK = window.VIOLATION_RULES
                ? window.VIOLATION_RULES.canonicalizeHandbook(handbook)
                : handbook;
            console.log("[Config] Handbook loaded:", window.GLOBAL_HANDBOOK);
        }
    } catch (e) {
        console.error("[Config] Handbook load error:", e);
    }
}

window.HANDBOOK_READY = loadHandbook();

/**
 * DOMContentLoaded — ранняя инициализация:
 * 1) Загружаем справочник
 * 2) Заполняем дропдауны локаций
 */
document.addEventListener('DOMContentLoaded', async () => {
    await window.HANDBOOK_READY;

    const ovnLocSelect   = document.getElementById('ovn-location');
    const latesLocSelect = document.getElementById('lates-audit-loc');

    if (ovnLocSelect) {
        ovnLocSelect.innerHTML = '<option value="">Выберите...</option>';
        window.LOCATIONS.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc; opt.textContent = loc;
            ovnLocSelect.appendChild(opt);
        });
    }

    if (latesLocSelect) {
        latesLocSelect.innerHTML = '';
        window.LOCATIONS.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc; opt.textContent = loc;
            latesLocSelect.appendChild(opt);
        });
    }
});

// ---- Единый resolver мастеров из ADAPTER ----
window.getAdapterMasterRecord = function(name, location = null) {
    if (!name || typeof window.findAdapterMaster !== 'function') return null;
    return window.findAdapterMaster(name, location) || null;
};

window.getAdapterMasterCanonical = function(name, location = null) {
    return window.getAdapterMasterRecord(name, location)?.dash || null;
};

window.getAdapterMasterLocation = function(name) {
    return window.getAdapterMasterRecord(name)?.location || '';
};

window.isSameAdapterMaster = function(left, right) {
    const a = window.getAdapterMasterCanonical(left);
    const b = window.getAdapterMasterCanonical(right);
    return Boolean(a && b && a === b);
};

window.isAdapterMaster = function(name) {
    return Boolean(window.getAdapterMasterCanonical(name));
};

// ---- Получить все имена мастеров из адаптера (Set) ----
window.getAdapterMasterNames = function() {
    const names = new Set();
    if (typeof ADAPTER === 'undefined') return names;
    for (const loc in ADAPTER) {
        if (!ADAPTER[loc] || !Array.isArray(ADAPTER[loc].masters)) continue;
        ADAPTER[loc].masters.forEach(m => names.add(m.dash));
    }
    return names;
};
