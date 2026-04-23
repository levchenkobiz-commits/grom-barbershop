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
    const urlParams  = new URLSearchParams(window.location.search);
    const getCookie  = (name) => {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]/+^])/g, '\\$1') + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : undefined;
    };

    let urlId = urlParams.get('tg_id');
    let tg_id = urlId || localStorage.getItem('tg_id') || getCookie('tg_id') || 'manager_test';

    if (tg_id) {
        try {
            const res = await fetch('/api/me?tg_id=' + tg_id);
            if (res.ok) {
                const user = await res.json();
                localStorage.setItem('tg_id', tg_id);
                document.cookie = `tg_id=${tg_id}; path=/; max-age=31536000`;
                window.USER = user;

                document.getElementById('login-screen').classList.add('hidden');

                if (urlId) {
                    const welcomeScreen = document.getElementById('welcome-screen');
                    document.getElementById('welcome-msg').innerText = `Привет, ${user.name} 👋`;
                    welcomeScreen.classList.remove('hidden');

                    setTimeout(() => {
                        welcomeScreen.style.opacity = '0';
                        setTimeout(() => {
                            welcomeScreen.classList.add('hidden');
                            document.getElementById('app-container').classList.remove('hidden');
                            initializeApp();
                        }, 500);
                    }, 1500);
                } else {
                    document.getElementById('app-container').classList.remove('hidden');
                    initializeApp();
                }
            } else {
                localStorage.removeItem('tg_id');
                document.cookie = 'tg_id=; path=/; max-age=0;';
                document.getElementById('login-screen').classList.remove('hidden');
            }
        } catch(e) {
            console.error('[App] Auth error:', e);
            document.getElementById('login-screen').classList.remove('hidden');
        }
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
};

async function initializeApp() {
    const user = window.USER;
    if (!user) return;

    // 1. Имя мастера
    window.CURRENT_MASTER = user.name;
    const nameEl = document.getElementById('dynamic-master-name');
    if (nameEl) nameEl.innerText = user.name;

    // 2. Ролевые ограничения UI
    applyRoleConstraints();

    // 3. Начальная вкладка
    const hash      = (window.location.hash || '').replace('#', '');
    const validTabs = ['analytics','ovn','lates','schedule','master-cabinet','manager','settings'];

    if (hash && validTabs.includes(hash)) {
        switchTab(hash);
    } else {
        if (user.role === 'ovn')    switchTab('ovn',            document.getElementById('tab-ovn'));
        else if (user.role === 'master') switchTab('master-cabinet', document.getElementById('tab-master'));
        else                             switchTab('analytics',       document.getElementById('tab-analytics'));
    }

    // 4. Загружаем данные
    await loadData();
    setInterval(loadData, 120000);

    // 5. Lazy-load остальных вкладок
    loadOVNHistory();
    loadLatesHistory();
    loadSchedule();
    if (typeof loadMasterSchedule === 'function') loadMasterSchedule();
    if (user.role === 'manager' || user.role === 'owner') loadManagerChecks();

    // 6. Hash-навигация
    window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace('#', '');
        if (h && validTabs.includes(h)) switchTab(h);
    });
}

// Экспортируем для совместимости
window.initializeApp = initializeApp;

// ==== LOGOUT ====
window.handleLogout = function() {
    localStorage.removeItem('tg_id');
    document.cookie = 'tg_id=; path=/; max-age=0;';
    window.USER = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
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
