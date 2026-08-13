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

// ==== MOBILE MANAGER NAVIGATION ====
const MOBILE_MANAGER_NAV_ITEMS = [
    ['comeback', 'Возврат', '<path d="M9 7H5v-4M5 7a8 8 0 1 1-1 8"/>', 'tabComeback'],
    ['retention', 'ROI', '<path d="M4 18V9M10 18V5M16 18v-6M3 21h18"/>', 'tabRetention'],
    ['analytics', 'Аналитика', '<path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/>', 'tabAnalytics'],
    ['ovn', 'ОВН', '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>', 'tabOvn'],
    ['lates', 'Опоздания', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'tabLates'],
    ['manager', 'Кабинет', '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6"/>', 'tabManager'],
    ['schedule', 'График', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', 'tabSchedule'],
    ['salary', 'Зарплата', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>', 'salaryCalculation'],
];

function ensureManagerMobileNav() {
    const enabled = window.PERM && PERM.can('mobileBottomNav');
    document.body.classList.toggle('manager-mobile-nav-enabled', !!enabled);
    document.getElementById('manager-mobile-nav')?.remove();
    if (!enabled) return;

    if (!document.getElementById('manager-mobile-nav-style')) {
        const style = document.createElement('style');
        style.id = 'manager-mobile-nav-style';
        style.textContent = `
            #manager-mobile-nav{display:none}
            @media(max-width:768px){
                body.manager-mobile-nav-enabled{padding-bottom:calc(108px + env(safe-area-inset-bottom))}
                body.manager-mobile-nav-enabled .tabs-container{display:none!important}
                #manager-mobile-nav{position:fixed;left:0;right:0;bottom:0;z-index:900;display:flex;align-items:stretch;width:100%;min-height:90px;padding:4px 4px max(26px,env(safe-area-inset-bottom));background:rgba(8,8,8,.96);border-top:1px solid rgba(255,255,255,.10);box-shadow:0 -8px 30px rgba(0,0,0,.45);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}
                .manager-mobile-nav-btn{flex:1 1 0;min-width:0;min-height:56px;padding:5px 1px;border:0;background:transparent;color:rgba(255,255,255,.52);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:600 clamp(8px,2.25vw,10px)/1.1 Inter,-apple-system,sans-serif;cursor:pointer;white-space:nowrap;transition:color .18s,background .18s}
                .manager-mobile-nav-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s}
                .manager-mobile-nav-btn.active{color:var(--accent)}
                .manager-mobile-nav-btn.active svg{transform:scale(1.1)}
                body.manager-mobile-nav-enabled #settings-menu{position:fixed!important;top:max(12px,env(safe-area-inset-top))!important;left:12px!important;right:12px!important;width:auto!important;min-width:0!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;overflow-y:auto!important;box-sizing:border-box!important}
                body.manager-mobile-nav-enabled #settings-menu .menu-item{white-space:normal;overflow-wrap:anywhere}
            }
        `;
        document.head.appendChild(style);
    }

    const nav = document.createElement('nav');
    nav.id = 'manager-mobile-nav';
    nav.setAttribute('aria-label', 'Навигация кабинета менеджера');
    const visibleItems = MOBILE_MANAGER_NAV_ITEMS.filter(([, , , permission]) => PERM.can(permission));
    nav.innerHTML = visibleItems.map(([target, label, icon]) =>
        `<button type="button" class="manager-mobile-nav-btn" data-target="${target}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></button>`
    ).join('');
    nav.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        if (button.dataset.target === 'retention') window.location.href = '/retention-engine.html';
        else if (button.dataset.target === 'salary') window.openSalaryModal(true);
        else window.switchTab(button.dataset.target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    document.body.appendChild(nav);
}

function syncManagerMobileNav(target) {
    const nav = document.getElementById('manager-mobile-nav');
    if (!nav) return;
    nav.querySelectorAll('button').forEach(button => {
        const active = button.dataset.target === target;
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
}

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
    if (target === 'comeback') typeof window.loadComeback === 'function' && window.loadComeback();
    syncManagerMobileNav(target);
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
        'tab-comeback':   'tabComeback',
        'tab-retention':  'tabRetention',
    };
    Object.entries(TAB_MAP).forEach(([tabId, perm]) => {
        const el = document.getElementById(tabId);
        if (el) el.style.display = PERM.can(perm) ? 'inline-block' : 'none';
    });
    ensureManagerMobileNav();

    // ── Область графиков ──
    // Кирилл видит общий график управленцев, но не график мастеров.
    const masterSchedule = document.getElementById('master-schedule-section');
    const managerSchedule = document.getElementById('manager-schedule-section');
    if (masterSchedule) masterSchedule.style.display = PERM.can('viewMasterSchedule') ? 'block' : 'none';
    if (managerSchedule) managerSchedule.style.display = PERM.can('viewManagerSchedule') ? 'block' : 'none';
    const scheduleTab = document.getElementById('tab-schedule');
    if (scheduleTab && !PERM.can('viewMasterSchedule') && PERM.can('viewManagerSchedule')) {
        scheduleTab.textContent = 'ГРАФИК УПРАВЛЕНЦЕВ';
    }

    // ── Кнопка YC адаптер ──
    const ab = document.getElementById('adapter-btn');
    if (ab) ab.style.display = PERM.can('showAdapterBtn') ? 'block' : 'none';
    const onboardingButton = document.getElementById('master-onboarding-btn');
    if (onboardingButton) onboardingButton.style.display = PERM.can('manageMasterOnboarding') ? 'block' : 'none';
    const onboardingMenuItem = document.getElementById('master-onboarding-menu-item');
    if (onboardingMenuItem) onboardingMenuItem.style.display = PERM.can('manageMasterOnboarding') ? 'flex' : 'none';
    const adapterMenuItem = document.getElementById('adapter-menu-item');
    if (adapterMenuItem) adapterMenuItem.style.display = PERM.can('showAdapterBtn') ? 'flex' : 'none';

    // ── Расчёт зарплат ──
    // Доступ определяется одним правом роли: одинаково для desktop-кнопки
    // и мобильной навигации. Это не даёт UI расходиться с серверным доступом.
    const salaryCalculationButton = document.getElementById('salary-calculation-btn');
    if (salaryCalculationButton) {
        salaryCalculationButton.style.display = PERM.can('salaryCalculation') ? 'inline-flex' : 'none';
    }

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
