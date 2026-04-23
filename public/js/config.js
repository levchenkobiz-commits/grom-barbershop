/**
 * public/js/config.js
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
    "Опоздание":              300,
    "Невыход":                5000,
    "Воровство":              5000,
    "Грязное место":          500,
    "Без формы":              500,
    "Отказ клиенту":          1000,
    "Разговор на нац. языке": 500,
    "Жалоба":                 1000,
    "Поломка":                0,
    "Другое":                 0
};

/**
 * Загружает справочник штрафов с сервера.
 * Вызывается один раз из DOMContentLoaded.
 */
async function loadHandbook() {
    try {
        const res = await fetch('/api/handbook');
        if (res.ok) {
            window.GLOBAL_HANDBOOK = await res.json();
            console.log("[Config] Handbook loaded:", window.GLOBAL_HANDBOOK);
        }
    } catch (e) {
        console.error("[Config] Handbook load error:", e);
    }
}

/**
 * DOMContentLoaded — ранняя инициализация:
 * 1) Загружаем справочник
 * 2) Заполняем дропдауны локаций
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadHandbook();

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
