/**
 * public/js/ui.js
 * =====================================================
 * Базовый UI: уведомления, переключение вкладок,
 * ролевые ограничения, меню настроек.
 *
 * Зависимости: config.js (window.LOCATIONS, window.USER)
 */

// ==== CARD-ICONS LAYOUT PATCH ====
// Separates the ⚠ error icon (bottom-right) from the 🔄 refresh button (top-right)
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .card-icons {
            position: absolute;
            top: 12px;
            right: 12px;
            bottom: 12px;
            width: auto;
            display: flex;
            flex-direction: column-reverse;
            justify-content: space-between;
            align-items: flex-end;
            z-index: 5;
            gap: 0;
            pointer-events: none;
        }
        .card-icons > * { pointer-events: auto; }
        .err-icon { color: #FFCC00; font-size: 16px; cursor: help; }
    `;
    document.head.appendChild(style);
})();

// ==== TOAST NOTIFICATIONS ====

window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'grome-toast ' + type;

    let icon = '💬';
    if (type === 'success') icon = '✅';
    if (type === 'error')   icon = '❌';

    toast.innerHTML = `
        <div class="grome-toast-icon">${icon}</div>
        <div class="grome-toast-content">${msg}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
    }, 3000);
};

// ==== TAB SWITCHING ====
/**
 * Переключает активную вкладку.
 * Вызывается как явно (клик), так и через hashchange.
 * Другие модули могут подписаться, переопределив window.switchTab
 * (см. settings блок в app.js).
 */
window.switchTab = function(target, btn) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const section = document.getElementById(target + '-section');
    if (section) section.classList.add('active');

    if (target === 'master-cabinet') {
        // Загружаем 7-дневное расписание
        if (typeof window.loadMasterSchedule === 'function') {
            setTimeout(window.loadMasterSchedule, 100);
        }
        // Обновляем карточки кабинета мастера (OVN, штрафы, зона, возвращаемость)
        if (typeof updateMasterCabinet === 'function') {
            setTimeout(() => updateMasterCabinet(window.DASH_DATA || window.dashboardData || {}), 200);
        }
    }

    if (!btn) {
        btn = Array.from(document.querySelectorAll('.tab-btn'))
                   .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + target + "'"));
    }
    if (btn) btn.classList.add('active');

    history.pushState(null, null, '#' + target);

    // Lazy-load tab data
    if (target === 'ovn')      typeof loadOVNHistory    === 'function' && loadOVNHistory();
    if (target === 'lates')    typeof loadLatesHistory  === 'function' && loadLatesHistory();
    if (target === 'schedule') typeof loadSchedule      === 'function' && loadSchedule();
    if (target === 'schedule') typeof window.renderMgmtGrid === 'function' && window.renderMgmtGrid();
    if (target === 'settings') typeof window.renderSettingsSchedule === 'function' && window.renderSettingsSchedule();
};

// ==== ROLE-BASED UI CONSTRAINTS ====
// Использует PERM.can() из permissions.js — единственный источник правды о правах.
// НЕ ДОБАВЛЯЙ сюда if (role === ...) — меняй таблицу в permissions.js.
window.applyRoleConstraints = function() {
    if (!window.USER || !window.USER.role) return;

    // ── Видимость вкладок ──
    const TAB_MAP = {
        'tab-analytics':  'tabAnalytics',
        'tab-ovn':        'tabOvn',
        'tab-lates':      'tabLates',
        'tab-schedule':   'tabSchedule',
        'tab-manager':    'tabManager',
        'tab-master':     'tabMasterCabinet',
    };
    Object.entries(TAB_MAP).forEach(([tabId, perm]) => {
        const el = document.getElementById(tabId);
        if (el) el.style.display = PERM.can(perm) ? 'inline-block' : 'none';
    });

    // ── Кнопка YC адаптер ──
    const ab = document.getElementById('adapter-btn');
    if (ab) ab.style.display = PERM.can('showAdapterBtn') ? 'block' : 'none';

    // ── Настройки (целиком скрываем кнопку для мастеров) ──
    if (!PERM.can('showSettingsMenu')) {
        const settingsDropdown = document.querySelector('.settings-dropdown');
        if (settingsDropdown) settingsDropdown.style.display = 'none';
    }

    // ── Кнопка «+ Проверка» в секции ОВН ──
    if (!PERM.can('createOvnCheck')) {
        const ovnSection = document.getElementById('ovn-section');
        if (ovnSection) {
            ovnSection.querySelectorAll('button[onclick*="openOVNModal"]').forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }
};

// ==== SETTINGS DROPDOWN TOGGLE ====
window.toggleSettingsMenu = function() {
    const menu = document.getElementById('settings-menu');
    if (!menu) return;
    menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
};

// Close settings menu on outside click
window.addEventListener('click', function(event) {
    if (!event.target.matches('.btn-refresh') && !event.target.closest('.settings-dropdown')) {
        const menu = document.getElementById('settings-menu');
        if (menu) menu.style.display = 'none';
    }
});
