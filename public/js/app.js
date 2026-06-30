/**
 * public/js/app.js
 * =====================================================
 * Точка входа: авторизация, инициализация приложения,
 * Settings (расписание мастера на 14 дней).
 *
 * Зависимости: ui.js, analytics.js, ovn.js, lates.js,
 *              schedule.js, manager.js
 */

// ==== APP INIT ====

window.onload = async () => {
    // Попробуем восстановить сессию из localStorage
    const saved = localStorage.getItem('grome_user');
    if (saved) {
        try {
            window.USER = JSON.parse(saved);
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            initializeApp();
            return;
        } catch(e) {
            localStorage.removeItem('grome_user');
        }
    }
    document.getElementById('login-screen').classList.remove('hidden');
};

// ==== LOGIN SUBMIT ====
window.handleLoginSubmit = async function() {
    const loginEl = document.getElementById('login-input');
    const passEl  = document.getElementById('password-input');
    const errEl   = document.getElementById('login-error');
    const btnEl   = document.getElementById('login-btn');

    const login    = (loginEl.value || '').trim();
    const password = (passEl.value || '').trim();

    if (!login || !password) {
        errEl.textContent = 'Введите логин и пароль';
        errEl.style.display = 'block';
        return;
    }

    btnEl.disabled   = true;
    btnEl.textContent = '⌛ Вход...';
    errEl.style.display = 'none';

    try {
        const res  = await fetch('/api/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ login, password })
        });
        const data = await res.json();

        if (!res.ok || data.error) {
            errEl.textContent   = data.error || 'Неверный логин или пароль';
            errEl.style.display = 'block';
            btnEl.disabled      = false;
            btnEl.textContent   = 'Войти';
            return;
        }

        // Сохраняем сессию (включаем key для X-User-Key заголовка в fetch interceptor)
        window.USER = { ...data.user, key: data.key };
        localStorage.setItem('grome_user', JSON.stringify(window.USER));

        // Приветствие
        const welcomeScreen = document.getElementById('welcome-screen');
        document.getElementById('welcome-msg').innerText = `Привет, ${data.user.name} 👋`;
        document.getElementById('login-screen').classList.add('hidden');
        welcomeScreen.classList.remove('hidden');

        setTimeout(() => {
            welcomeScreen.style.opacity = '0';
            setTimeout(() => {
                welcomeScreen.classList.add('hidden');
                welcomeScreen.style.opacity = '';
                document.getElementById('app-container').classList.remove('hidden');
                initializeApp();
            }, 500);
        }, 1200);

    } catch(e) {
        errEl.textContent   = 'Ошибка подключения';
        errEl.style.display = 'block';
        btnEl.disabled      = false;
        btnEl.textContent   = 'Войти';
    }
};

// ==== ENTER KEY SUPPORT ====
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen && !loginScreen.classList.contains('hidden')) {
            window.handleLoginSubmit();
        }
    }
});

async function initializeApp() {
    const user = window.USER;
    if (!user) return;
    ensureLogoutButton();

    // 0. Сразу скрываем все секции (analytics active в HTML по умолчанию)
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));

    // 1. Имя мастера
    window.CURRENT_MASTER = user.name;
    const nameEl = document.getElementById('dynamic-master-name');
    if (nameEl) nameEl.innerText = user.name;

    // 2. Ролевые ограничения UI
    applyRoleConstraints();

    // 3. Начальная вкладка (с проверкой прав!)
    const hash      = (window.location.hash || '').replace('#', '');
    const validTabs = ['analytics','ovn','lates','schedule','master-cabinet','manager','settings'];

    // Маппинг хеша → пермишн (проверяем, имеет ли юзер доступ к вкладке из URL)
    const HASH_PERM = {
        'analytics': 'tabAnalytics', 'ovn': 'tabOvn', 'lates': 'tabLates',
        'schedule': 'tabSchedule', 'master-cabinet': 'tabMasterCabinet',
        'manager': 'tabManager', 'settings': 'tabAnalytics',
    };

    if (hash && validTabs.includes(hash) && PERM.can(HASH_PERM[hash] || '')) {
        switchTab(hash);
    } else {
        // Начальная вкладка определяется правами из permissions.js
        if (PERM.can('tabMasterCabinet') && !PERM.can('tabAnalytics'))     switchTab('master-cabinet', document.getElementById('tab-master'));
        else if (PERM.can('tabOvn') && !PERM.can('tabAnalytics'))          switchTab('ovn',            document.getElementById('tab-ovn'));
        else                                                                switchTab('analytics',       document.getElementById('tab-analytics'));
    }

    // 4. Загружаем данные
    await loadData();
    setInterval(loadData, 120000);

    // 5. Lazy-load остальных вкладок
    if (typeof window.loadManagerSchedule === 'function') await window.loadManagerSchedule();
    loadOVNHistory();
    loadLatesHistory();
    loadSchedule();
    if (typeof loadMasterSchedule === 'function') loadMasterSchedule();
    if (PERM.can('tabManager')) {
        loadManagerChecks();
    }

    // 6. Hash-навигация
    window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace('#', '');
        if (h && validTabs.includes(h)) switchTab(h);
    });
}

// Экспортируем для совместимости
window.initializeApp = initializeApp;

function ensureLogoutButton() {
    if (document.getElementById('logout-btn')) return;

    const header = document.querySelector('header');
    if (!header) return;

    const button = document.createElement('button');
    button.id = 'logout-btn';
    button.type = 'button';
    button.className = 'btn-refresh';
    button.textContent = 'Выйти';
    button.onclick = window.handleLogout;
    button.style.marginLeft = '12px';
    button.style.borderColor = 'rgba(255,255,255,0.18)';

    header.appendChild(button);
}

// ==== LOGOUT ====
window.handleLogout = function() {
    localStorage.removeItem('grome_user');
    localStorage.removeItem('tg_id');
    document.cookie = 'tg_id=; path=/; max-age=0;';
    window.USER = null;
    window.location.hash = '';
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    // Очищаем поля формы
    const li = document.getElementById('login-input');
    const pi = document.getElementById('password-input');
    if (li) li.value = '';
    if (pi) pi.value = '';
    const err = document.getElementById('login-error');
    if (err) err.style.display = 'none';
    const btn = document.getElementById('login-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Войти'; }
};


// ==== SETTINGS: 14-day schedule ====
window.renderSettingsSchedule = function() {
    const container = document.getElementById('settings-schedule-container');
    if (!container) return;
    if (!window.USER) { container.innerHTML = 'Сначала войдите в систему'; return; }

    const today      = dayjs();
    const mySchedule = window.USER.schedule || [];
    let html         = '';

    for (let i = 0; i < 14; i++) {
        const d        = today.add(i, 'day');
        const dateStr  = d.format('YYYY-MM-DD');
        const dateDisp = d.format('DD.MM (dd)');
        const isActive = mySchedule.includes(dateStr);
        const style = isActive
            ? 'background:#007AFF;border-color:#007AFF;color:#fff'
            : 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#aaa';
        html += `<div data-date="${dateStr}"
                      class="sched-btn${isActive ? ' active' : ''}"
                      onclick="toggleScheduleDate(this)"
                      style="padding:10px 15px;border-radius:8px;border:1px solid;cursor:pointer;transition:0.2s;${style}">
                    ${dateDisp}
                 </div>`;
    }
    container.innerHTML = html;
};

window.toggleScheduleDate = function(el) {
    if (el.classList.contains('active')) {
        el.classList.remove('active');
        el.style.background  = 'rgba(255,255,255,0.05)';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        el.style.color       = '#aaa';
    } else {
        el.classList.add('active');
        el.style.background  = '#007AFF';
        el.style.borderColor = '#007AFF';
        el.style.color       = '#fff';
    }
};

window.saveMySchedule = async function() {
    if (!window.USER) return showToast('Ошибка: нет пользователя', 'error');
    const container = document.getElementById('settings-schedule-container');
    const dates = Array.from(container.querySelectorAll('.sched-btn.active')).map(d => d.getAttribute('data-date'));

    try {
        const res = await fetch('/api/me/schedule?tg_id=' + (localStorage.getItem('tg_id') || ''), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body:   JSON.stringify({ schedule: dates })
        });
        if (res.ok) { showToast('График успешно сохранен!', 'success'); window.USER.schedule = dates; }
        else        { showToast('Ошибка при сохранении', 'error'); }
    } catch(err) { showToast('Ошибка сети', 'error'); }
};
