/**
 * public/js/permissions.js
 * =====================================================
 * ЕДИНСТВЕННЫЙ источник правды о правах ролей.
 *
 * ⚠️  ПРАВИЛА ДЛЯ АГЕНТОВ:
 * ─────────────────────────────────────────────────────
 * 1. НЕ ПИШИ  if (role === 'ovn') return;  в других файлах.
 *    Вместо этого:  if (!PERM.can('editScheduleCell')) return;
 *
 * 2. Если нужно добавить новое разрешение — добавь его ЗДЕСЬ
 *    в таблицу ROLE_PERMISSIONS и используй через PERM.can().
 *
 * 3. Изменение прав для роли = одна строка в этом файле.
 *    Ничего больше менять не нужно.
 * ─────────────────────────────────────────────────────
 *
 * Зависимости: нет (загружается раньше всех модулей)
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════
    //  ТАБЛИЦА ПРАВ — единая точка правды
    // ═══════════════════════════════════════════════════
    //
    //  true  = разрешено
    //  false = запрещено
    //
    //  Если права нет в таблице — по умолчанию false.

    const ROLE_PERMISSIONS = {

        owner: {
            // ── Вкладки ──
            tabAnalytics:       true,
            tabOvn:             true,
            tabLates:           true,
            tabSchedule:        true,
            tabManager:         true,
            tabMasterCabinet:   false,

            // ── Расписание ──
            editScheduleCell:   true,    // клик по ячейке расписания
            saveSchedule:       true,    // кнопка «Сохранить»
            contextMenuSchedule:true,    // правый клик → замена мастера

            // ── ОВН (видеоконтроль) ──
            createOvnCheck:     true,    // кнопка «+ Проверка»
            editOvnCheck:       true,    // редактировать чужую проверку
            reactToOvn:         true,    // менеджерская реакция

            // ── Опоздания ──
            markArrival:        true,    // отмечать приход мастера
            markNoShow:         true,    // фиксировать невыход

            // ── Настройки ──
            showAdapterBtn:     true,    // кнопка YC адаптер
            showSettingsMenu:   true,    // меню настроек
        },

        manager: {
            tabAnalytics:       true,
            tabOvn:             true,
            tabLates:           true,
            tabSchedule:        true,
            tabManager:         true,
            tabMasterCabinet:   false,

            editScheduleCell:   true,
            saveSchedule:       true,
            contextMenuSchedule:true,

            createOvnCheck:     false,   // только ОВН-операторы создают
            editOvnCheck:       true,
            reactToOvn:         true,

            markArrival:        true,
            markNoShow:         true,

            showAdapterBtn:     true,
            showSettingsMenu:   true,
        },

        ovn: {
            tabAnalytics:       false,
            tabOvn:             true,
            tabLates:           true,
            tabSchedule:        true,
            tabManager:         false,
            tabMasterCabinet:   false,

            editScheduleCell:   true,
            saveSchedule:       true,
            contextMenuSchedule:true,

            createOvnCheck:     true,
            editOvnCheck:       true,
            reactToOvn:         false,

            markArrival:        true,
            markNoShow:         true,

            showAdapterBtn:     false,
            showSettingsMenu:   true,
        },

        master: {
            tabAnalytics:       false,
            tabOvn:             false,
            tabLates:           false,
            tabSchedule:        false,
            tabManager:         false,
            tabMasterCabinet:   true,

            editScheduleCell:   false,
            saveSchedule:       false,
            contextMenuSchedule:false,

            createOvnCheck:     false,
            editOvnCheck:       false,
            reactToOvn:         false,

            markArrival:        false,
            markNoShow:         false,

            showAdapterBtn:     false,
            showSettingsMenu:   false,
        },
    };

    // ═══════════════════════════════════════════════════
    //  API — используй в любом модуле
    // ═══════════════════════════════════════════════════

    const PERM = {
        /**
         * Проверяет разрешение для текущего пользователя.
         * @param {string} permission — ключ из ROLE_PERMISSIONS
         * @returns {boolean}
         *
         * Пример: if (!PERM.can('editScheduleCell')) return;
         */
        can(permission) {
            const role = (window.USER && window.USER.role) || '';
            const perms = ROLE_PERMISSIONS[role];
            return perms ? (perms[permission] === true) : false;
        },

        /**
         * Проверяет разрешение для конкретной роли (без привязки к текущему юзеру).
         * @param {string} role
         * @param {string} permission
         * @returns {boolean}
         */
        roleHas(role, permission) {
            const perms = ROLE_PERMISSIONS[role];
            return perms ? (perms[permission] === true) : false;
        },

        /**
         * Возвращает все разрешения текущего пользователя.
         * @returns {Object}
         */
        getAll() {
            const role = (window.USER && window.USER.role) || '';
            return ROLE_PERMISSIONS[role] || {};
        },

        /**
         * Вся таблица (для отладки / серверной синхронизации).
         */
        TABLE: ROLE_PERMISSIONS,
    };

    // Глобально доступен из любого модуля
    window.PERM = PERM;

    // ═══════════════════════════════════════════════════
    //  FETCH INTERCEPTOR — автоматически отправляет
    //  X-User-Key заголовок для серверной авторизации.
    //  Ни один модуль не нужно менять — это прозрачно.
    // ═══════════════════════════════════════════════════

    function getStoredUserKey() {
        const saved = localStorage.getItem('grome_user');
        if (saved) {
            try {
                const user = JSON.parse(saved);
                const key = user && (user.key || user.tg_id || user.id);
                if (key) return String(key);
            } catch(e) {}
        }

        // Совместимость со входом до рефакторинга: раньше сохранялся только tg_id.
        const legacyKey = localStorage.getItem('tg_id');
        return legacyKey ? String(legacyKey) : '';
    }

    const _originalFetch = window.fetch;
    window.fetch = function(input, options) {
        options = options || {};
        const url = typeof input === 'string'
            ? input
            : (input && typeof input.url === 'string' ? input.url : '');

        // Только для API-запросов этого приложения (не CDN и т.д.)
        if (url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')) {
            const userKey = getStoredUserKey();
            if (userKey) {
                const inheritedHeaders = input instanceof Request ? input.headers : undefined;
                const headers = new Headers(options.headers || inheritedHeaders || {});
                headers.set('X-User-Key', userKey);
                options.headers = headers;
            }
        }
        return _originalFetch.call(window, input, options);
    };

})();
