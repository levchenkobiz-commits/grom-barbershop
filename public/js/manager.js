/**
 * public/js/manager.js
 * =====================================================
 * Модуль Кабинет менеджера (инспекционные чек-листы).
 *
 * Содержит:
 *  - MANAGER_CHECK_FIELDS (поля инспекции)
 *  - loadManagerChecks, viewManagerCheck
 *  - Adapter GUI: openAdapterModal, addAdapterBranch, addAdapterMaster,
 *    closeAdapterModal, saveAdapter
 *
 * Зависимости: config.js, ui.js (window.showToast)
 */

// ==== MANAGER INSPECTION CHECKLIST ====
const MANAGER_CHECK_FIELDS = [
    { id: 1,  label: 'Рамки с ценами, светильники в зале исправны, включены и выглядят опрятно.', photo: 'optional' },
    { id: 2,  label: 'Шейвер, триммер, машинка не цепляют волосы и не царапают кожу.', photo: 'optional' },
    { id: 3,  label: 'В салоне поддерживается комфортная температура в диапазоне 19-23 градуса.', photo: 'optional' },
    { id: 4,  label: 'В зале на видных местах не хранятся коробки промоутеров, вода и другой хозяйственный инвентарь.', photo: 'optional' },
    { id: 5,  label: 'Музыка играет строго из согласованного плей-листа, поддерживается оптимальная фоновая громкость.', photo: 'optional' },
    { id: 6,  label: 'Проверка технической части: работают все розетки, терминал, нет протечек воды.', photo: 'optional' },
    { id: 7,  label: 'Цветные бутылочки и косметика, не входящая в нашу официальную рабочую матрицу, полностью отсутствуют на рабочих местах.', photo: 'optional' },
    { id: 8,  label: 'Все зафиксированные нарушения из таблицы (ОВН) за последние 48 часов проработаны на месте с мастерами.', photo: 'optional' }
];

function escapeManagerHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function canEditManagerCheck(check) {
    if (!check || !check.createdAt) return false;
    const createdAt = new Date(check.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt < 24 * 60 * 60 * 1000;
}

function ensureManagerHistoryGroupedStyles() {
    const tbody = document.getElementById('manager-history');
    const table = tbody ? tbody.closest('table') : null;
    if (table) table.classList.add('manager-history-grouped');

    if (document.getElementById('manager-history-grouped-style')) return;

    const style = document.createElement('style');
    style.id = 'manager-history-grouped-style';
    style.textContent = `
        .manager-history-grouped {
            border-collapse: separate;
            border-spacing: 0 8px;
        }
        .manager-history-grouped th {
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .manager-date-row td {
            padding: 16px 18px 8px;
            border: 0;
            background: linear-gradient(90deg, rgba(232,255,56,0.12), rgba(255,255,255,0.035));
            border-top: 1px solid rgba(232,255,56,0.18);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px;
        }
        .manager-date-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: wrap;
        }
        .manager-date-title {
            color: var(--accent);
            font-size: 15px;
            font-weight: 800;
        }
        .manager-date-meta {
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 700;
        }
        .manager-check-row {
            background: rgba(255,255,255,0.022);
        }
        .manager-check-row:hover {
            background: rgba(255,255,255,0.045);
        }
        .manager-check-row td {
            border-top: 1px solid rgba(255,255,255,0.045);
            border-bottom: 1px solid rgba(255,255,255,0.045);
            vertical-align: middle;
        }
        .manager-check-row td:first-child {
            border-left: 1px solid rgba(255,255,255,0.045);
            border-radius: 10px 0 0 10px;
        }
        .manager-check-row td:last-child {
            border-right: 1px solid rgba(255,255,255,0.045);
            border-radius: 0 10px 10px 0;
        }
        @media (max-width: 768px) {
            .manager-history-grouped {
                border-spacing: 0;
            }
            .manager-date-row {
                display: block;
                margin: 0 0 10px;
            }
            .manager-date-row td {
                display: block;
                width: 100%;
            }
            .manager-check-row {
                margin-bottom: 12px;
            }
        }
    `;
    document.head.appendChild(style);
}


// ==== LOAD MANAGER CHECKS ====
async function loadManagerChecks() {
    try {
        const res    = await fetch('/api/manager_checks');
        if (!res.ok) return;
        const checks = await res.json();

        const today       = new Date().toISOString().split('T')[0];
        const todayChecks = checks.filter(c => c.date === today);
        const counterEl   = document.getElementById('manager-checks-count');
        if (counterEl) counterEl.innerText = `${todayChecks.length} / 3`;

        const tbody = document.getElementById('manager-history');
        if (!tbody) return;
        ensureManagerHistoryGroupedStyles();
        tbody.innerHTML = '';

        const checksToRender = checks.slice(0, 50);
        const dayCounts = checksToRender.reduce((acc, c) => {
            const d = dayjs(c.createdAt || c.date);
            const key = d.isValid() ? d.format('YYYY-MM-DD') : 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        let lastDayKey = null;

        checksToRender.forEach(c => {
            const created = dayjs(c.createdAt || c.date);
            const dayKey = created.isValid() ? created.format('YYYY-MM-DD') : 'unknown';
            if (dayKey !== lastDayKey) {
                lastDayKey = dayKey;
                const dayLabel = created.isValid() ? created.format('DD.MM.YYYY') : '\u0411\u0435\u0437 \u0434\u0430\u0442\u044b';
                const dayRow = document.createElement('tr');
                dayRow.className = 'manager-date-row';
                dayRow.innerHTML = `
                    <td colspan="5">
                        <div class="manager-date-heading">
                            <span class="manager-date-title">${escapeManagerHtml(dayLabel)}</span>
                            <span class="manager-date-meta">${dayCounts[dayKey] || 0} \u043f\u0440\u043e\u0432\u0435\u0440\u043e\u043a</span>
                        </div>
                    </td>
                `;
                tbody.appendChild(dayRow);
            }

            const dateStr = created.isValid() ? created.format('DD.MM, HH:mm') : '\u0411\u0435\u0437 \u0434\u0430\u0442\u044b';
            const items = Array.isArray(c.items) ? c.items : [];
            const totalItems = items.length;
            const cleanItems = items.filter(i => i.status === 'yes').length;
            const badItems   = items.filter(i => i.status === 'no');
            const issuesText = badItems.length > 0
                ? badItems.map(i => `<div style="margin-bottom:3px"><strong>\u041f. ${escapeManagerHtml(i.id)}:</strong> ${escapeManagerHtml(i.comment || '')}</div>`).join('')
                : '<span style="color:#34C759">\u0418\u0434\u0435\u0430\u043b\u044c\u043d\u043e (\u0431\u0435\u0437 \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u0439)</span>';

            const row = document.createElement('tr');
            row.className = 'manager-check-row';
            row.innerHTML = `
                <td>${escapeManagerHtml(dateStr)}</td>
                <td style="font-weight:600">${escapeManagerHtml(c.location || '')}</td>
                <td>${cleanItems} / ${totalItems} \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e</td>
                <td style="font-size:11px;line-height:1.3;max-width:300px">${issuesText}</td>
                <td>
                    <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
                        <button onclick="viewManagerCheck('${escapeManagerHtml(c.id)}')" class="btn-refresh" style="padding:5px 10px">\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440</button>
                        ${canEditManagerCheck(c)
                            ? `<button onclick="editManagerCheck('${escapeManagerHtml(c.id)}')" class="btn-refresh" style="padding:5px 10px;color:var(--accent)">\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c</button>`
                            : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        window.MANAGER_CHECKS_DATA = checks;
        return;

        checks.slice(0, 50).forEach(c => {
            const dateStr    = new Date(c.createdAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
            const totalItems = c.items.length;
            const cleanItems = c.items.filter(i => i.status === 'yes').length;
            const badItems   = c.items.filter(i => i.status === 'no');
            const issuesText = badItems.length > 0
                ? badItems.map(i => `<div style="margin-bottom:3px"><strong>П. ${i.id}:</strong> ${i.comment}</div>`).join('')
                : '<span style="color:#34C759">Идеально (без нарушений)</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dateStr}</td>
                <td style="font-weight:600">${c.location}</td>
                <td>${cleanItems} / ${totalItems} выполнено</td>
                <td style="font-size:11px;line-height:1.3;max-width:300px">${issuesText}</td>
                <td><button onclick="viewManagerCheck(${c.id})" class="btn-refresh" style="padding:5px 10px">Просмотр</button></td>
            `;
            tbody.appendChild(row);
        });

        window.MANAGER_CHECKS_DATA = checks;
    } catch(e) {
        console.error('[Manager] loadManagerChecks error:', e);
    }
}

// ==== VIEW CHECK REPORT ====
window.viewManagerCheck = function(id) {
    const check = (window.MANAGER_CHECKS_DATA || []).find(c => String(c.id) === String(id));
    if (!check) return;

    let html = `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;color:#fff;background:#000;padding:20px">
        <h2 style="color:#fff">Отчет: ${check.location}</h2>
        <p style="color:#888">${new Date(check.createdAt).toLocaleString('ru-RU')}</p>
        <hr style="border-color:#333">`;

    check.items.forEach(i => {
        const color     = i.status === 'yes' ? '#34C759' : (i.status === 'fixed' ? '#FF9F0A' : '#FF3B30');
        const statusMap = { yes: 'ДА / НОРМА', no: 'НЕТ / НАРУШЕНИЕ', fixed: 'ИСПРАВЛЕНО' };
        html += `
            <div style="margin-bottom:15px;border:1px solid #333;padding:15px;border-left:5px solid ${color}">
                <div style="font-weight:600;margin-bottom:8px">${i.id}. ${i.label}</div>
                <div style="color:${color};font-size:13px;font-weight:700">${statusMap[i.status] || i.status}</div>
                ${i.comment ? `<div style="margin-top:6px;color:#aaa;font-size:12px">${i.comment}</div>` : ''}
            </div>`;
    });

    html += '</div>';
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
};


// ==== ADAPTER GUI ====

function _renderAdapterGUI(adapterData) {
    const container = document.getElementById('adapter-gui-container');
    if (!container) return;
    let html = '';

    const keys = Object.keys(adapterData || {});
    if (keys.length === 0) {
        html = `<div style="text-align:center;padding:40px;color:#666;">
            <div style="font-size:32px;margin-bottom:16px;">📭</div>
            <div style="font-size:15px;margin-bottom:8px;">Адаптер не настроен</div>
            <div style="font-size:13px;">Нажмите «+ Добавить филиал», чтобы начать настройку.</div>
        </div>`;
    } else {
        for (const loc of keys) {
            const branch  = adapterData[loc];
            const masters = branch.masters || [];

            html += `<div class="adapter-branch" style="background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:15px;border:1px solid #333">
                <div style="display:flex;gap:10px;margin-bottom:15px;align-items:center;flex-wrap:wrap;">
                    <input type="text" class="branch-name-input" value="${loc}"
                        style="flex:1;min-width:120px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px;font-weight:bold;font-size:16px">
                    <input type="text" class="branch-term-input" value="${branch.el_kassa_terminal || ''}" placeholder="El.Kassa Терминал"
                        style="width:140px;min-width:100px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px">
                    <input type="text" class="branch-yc-input" value="${branch.yclients_company_id || ''}" placeholder="YClients ID"
                        style="width:140px;min-width:100px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px">
                    <button onclick="this.closest('.adapter-branch').remove()" aria-hidden="true" tabindex="-1"
                        style="display:none;background:#ff4444;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer">Удалить</button>
                </div>
                <div class="masters-list" style="padding-left:20px;border-left:2px solid #333;overflow-x:auto;padding-bottom:5px">
                    <div style="display:grid;grid-template-columns:2fr 1.5fr 80px 80px 90px 42px;gap:10px;margin-bottom:8px;font-size:11px;color:#666;font-weight:600;min-width:590px;">
                        <span>ЭЛКАССА (через запятую)</span><span>YCLIENTS ID</span><span>ВЫХОД</span><span>%</span><span>СТАТУС</span><span></span>
                    </div>
                    ${masters.map(m => `
                        <div class="adapter-master"
                            style="display:grid;grid-template-columns:2fr 1.5fr 80px 80px 90px 42px;gap:10px;margin-bottom:8px;align-items:center;min-width:590px;">
                            <input type="text" class="m-el" value="${(m.el_kassa||[]).join(', ')}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px" placeholder="Имена в элкассе через запятую">
                            <input type="text" class="m-yc" value="${m.yclients_id||''}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px" placeholder="YClients ID">
                            <input type="number" class="m-base" value="${m.payBase||3000}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
                            <input type="number" class="m-percent" value="${m.payPercent||40}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
                            <label style="display:flex;align-items:center;justify-content:center;gap:6px;color:#FFD54A;font-size:11px;cursor:pointer;text-transform:none;">
                                <input type="checkbox" class="m-top" ${m.topMaster === true ? 'checked' : ''} style="width:16px;height:16px;accent-color:#FFD54A;">
                                TOP
                            </label>
                            <button onclick="this.closest('.adapter-master').remove()"
                                style="background:transparent;color:#ff4444;border:1px solid #ff4444;padding:6px 0;border-radius:4px;cursor:pointer;text-align:center">✕</button>
                        </div>`).join('')}
                    <button onclick="addAdapterMaster(this)"
                        style="margin-top:10px;background:transparent;border:1px dashed #555;color:#888;padding:6px 12px;border-radius:4px;cursor:pointer;width:100%;min-width:200px;">
                        + Добавить мастера
                    </button>
                </div>
            </div>`;
        }
    }

    container.innerHTML = html;
}

window.openAdapterModal = async function() {
    const container = document.getElementById('adapter-gui-container');
    if (!container) return;

    // Show loading state
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#666;">
        <div style="font-size:24px;margin-bottom:12px;">⏳</div>
        <div>Загрузка данных...</div>
    </div>`;
    document.getElementById('adapter-modal').classList.add('active');

    // Use cached ADAPTER if available and non-empty, otherwise fetch fresh
    const cached = (typeof ADAPTER !== 'undefined') ? ADAPTER : {};
    if (cached && Object.keys(cached).length > 0) {
        _renderAdapterGUI(cached);
        return;
    }

    // Fetch from server
    try {
        const res  = await fetch('/api/adapter');
        const data = res.ok ? await res.json() : {};
        if (typeof window !== 'undefined') window.ADAPTER = data;
        _renderAdapterGUI(data);
    } catch(e) {
        console.error('[Adapter] fetch error:', e);
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#FF3B30;">
            <div style="font-size:24px;margin-bottom:12px;">⚠️</div>
            <div>Ошибка загрузки адаптера. Проверьте соединение.</div>
        </div>`;
    }
};


window.addAdapterBranch = function() {
    const container = document.getElementById('adapter-gui-container');
    const div       = document.createElement('div');
    div.className   = 'adapter-branch';
    div.style.cssText = 'background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:15px;border:1px solid #333';
    div.innerHTML   = `
        <div style="display:flex;gap:10px;margin-bottom:15px;align-items:center">
            <input type="text" class="branch-name-input" value="Новый филиал"
                style="flex:1;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px;font-weight:bold;font-size:16px">
            <input type="text" class="branch-term-input" value="" placeholder="El.Kassa Терминал"
                style="width:150px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px">
            <input type="text" class="branch-yc-input" value="" placeholder="YClients ID"
                style="width:150px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px">
            <button onclick="this.closest('.adapter-branch').remove()" aria-hidden="true" tabindex="-1"
                style="display:none;background:#ff4444;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer">Удалить</button>
        </div>
        <div class="masters-list" style="padding-left:20px;border-left:2px solid #333;overflow-x:auto;padding-bottom:5px">
            <button onclick="addAdapterMaster(this)"
                style="margin-top:10px;background:transparent;border:1px dashed #555;color:#888;padding:6px 12px;border-radius:4px;cursor:pointer;width:100%">
                + Добавить мастера
            </button>
        </div>`;
    container.insertBefore(div, container.firstChild);
};

window.addAdapterMaster = function(btn) {
    const list = btn.closest('.masters-list');
    const div  = document.createElement('div');
    div.className = 'adapter-master';
    div.style.cssText = 'display:grid;grid-template-columns:2fr 1.5fr 80px 80px 90px 42px;gap:10px;margin-bottom:8px;align-items:center;min-width:590px';
    div.innerHTML = `
        <input type="text" class="m-el" value="" placeholder="Имена в элкассе через запятую"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <input type="text" class="m-yc" value="" placeholder="YClients ID"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <input type="number" class="m-base" value="3000"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <input type="number" class="m-percent" value="40"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <label style="display:flex;align-items:center;justify-content:center;gap:6px;color:#FFD54A;font-size:11px;cursor:pointer;text-transform:none;">
            <input type="checkbox" class="m-top" style="width:16px;height:16px;accent-color:#FFD54A;">
            TOP
        </label>
        <button onclick="this.closest('.adapter-master').remove()"
            style="background:transparent;color:#ff4444;border:1px solid #ff4444;padding:6px 0;border-radius:4px;cursor:pointer;text-align:center">✕</button>`;
    btn.parentNode.insertBefore(div, btn);

    // Предложить загрузить фото нового мастера
    const branchDiv  = btn.closest('.adapter-branch');
    const locInput   = branchDiv ? branchDiv.querySelector('.branch-name-input') : null;
    const location   = locInput ? locInput.value.trim() : '';
    // Небольшая задержка чтобы пользователь успел ввести имя El.Kassa
    setTimeout(() => {
        const nameInput = div.querySelector('.m-el');
        const masterName = nameInput ? nameInput.value.split(',').map(s => s.trim()).filter(Boolean)[0] : '';
        if (typeof promptMasterPhoto === 'function') {
            promptMasterPhoto(masterName || 'Новый мастер', location);
        }
    }, 300);
};

window.closeAdapterModal = function() {
    document.getElementById('adapter-modal').classList.remove('active');
};

// ==== MANAGER CHECK MODAL (AI INSPECTION) ====

window.openManagerModal = function(checkToEdit) {
    const modal = document.getElementById('manager-modal');
    if (!modal) return;
    window.CURRENT_EDIT_MANAGER_CHECK_ID = checkToEdit ? checkToEdit.id : null;
    const title = modal.querySelector('h2');
    if (title) title.textContent = checkToEdit
        ? '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u043c\u0435\u043d\u0435\u0434\u0436\u0435\u0440\u0430'
        : '\u041d\u043e\u0432\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043c\u0435\u043d\u0435\u0434\u0436\u0435\u0440\u0430';

    // Заполняем список салонов из ADAPTER если select пустой
    const locSelect = document.getElementById('manager-location');
    if (locSelect && locSelect.options.length <= 1 && typeof ADAPTER !== 'undefined') {
        locSelect.innerHTML = '<option value="">Выберите салон</option>';
        Object.keys(ADAPTER).forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            locSelect.appendChild(opt);
        });
    }
    if (locSelect) locSelect.value = checkToEdit ? (checkToEdit.location || '') : '';

    // Шаг 1: Рабочие места (только для Алексеевской)
    const container = document.getElementById('manager-fields-container');
    let html = '';

    const selectedLocation = document.getElementById('manager-location') ? document.getElementById('manager-location').value : '';

    if (selectedLocation === 'Алексеевская') {
        html += '<h3 style="font-size:18px;margin:0 0 15px 0;">Шаг 1: Фото рабочих мест</h3>';
        [1, 2, 3].forEach(n => {
            html += `
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;margin-bottom:16px;">
                <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:12px;">📸 Рабочее место ${n}</div>
                <label style="display:block;width:100%;cursor:pointer;">
                    <div id="wp-preview-wrap-${n}" style="position:relative;">
                        <div id="wp-placeholder-${n}" style="border:2px dashed rgba(255,255,255,0.15);border-radius:12px;padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">
                            Нажмите, чтобы прикрепить фото
                        </div>
                        <img id="wp-preview-${n}" style="display:none;width:100%;border-radius:12px;object-fit:cover;max-height:200px;">
                    </div>
                    <input type="file" accept="image/*" capture="environment" style="display:none"
                        onchange="(function(inp,n){
                            const f=inp.files[0];if(!f)return;
                            const r=new FileReader();
                            r.onload=function(e){
                                const img=document.getElementById('wp-preview-'+n);
                                const ph=document.getElementById('wp-placeholder-'+n);
                                img.src=e.target.result;
                                img.style.display='block';
                                ph.style.display='none';
                                window._wpPhotos=window._wpPhotos||{};
                                window._wpPhotos[n]=e.target.result;
                            };
                            r.readAsDataURL(f);
                        })(this,${n})">
                </label>
            </div>`;
        });
    }

    // Шаг 2 (или Шаг 1 для других локаций): Чек-лист
    const stepLabel = selectedLocation === 'Алексеевская' ? 'Шаг 2' : 'Шаг 1';
    html += `<style>
        .ios-segmented-control { display:flex;gap:8px;margin-bottom:15px;background:rgba(0,0,0,0.4);padding:5px;border-radius:12px; }
        .ios-radio { flex:1;text-align:center;cursor:pointer;position:relative; }
        .ios-radio input[type="radio"] { display:none; }
        .ios-radio-inner { padding:12px 6px;font-size:13px;font-weight:700;border-radius:10px;transition:all 0.25s;color:var(--text-muted);border:1px solid transparent; }
        .ios-radio input[type="radio"]:checked + .ios-radio-inner { box-shadow:0 4px 10px rgba(0,0,0,0.3);transform:scale(1.02);background:#333;color:#fff; }
        .ios-radio input[value="yes"]:checked + .ios-radio-inner { background:rgba(52,199,89,0.15);color:#34C759!important;border:1px solid rgba(52,199,89,0.4); }
        .ios-radio input[value="no"]:checked  + .ios-radio-inner { background:rgba(255,69,58,0.15);color:#FF453A!important;border:1px solid rgba(255,69,58,0.4); }
        .manager-check-field { background:rgba(255,255,255,0.02);padding:20px;border-radius:16px;border:1px solid rgba(255,255,255,0.05);margin-bottom:15px; }
    </style>`;
    html += `<h3 style="font-size:18px;margin:30px 0 15px 0;">${stepLabel}: Чек-лист</h3>`;
    MANAGER_CHECK_FIELDS.forEach(f => {
        html += `
            <div class="form-field manager-check-field">
                <label style="font-size:14px;margin-bottom:15px;display:block;font-weight:500;line-height:1.4;">${f.id}. ${f.label}</label>
                <div class="ios-segmented-control">
                    <label class="ios-radio"><input type="radio" name="check_${f.id}" value="yes" required><div class="ios-radio-inner">✅ Норма</div></label>
                    <label class="ios-radio"><input type="radio" name="check_${f.id}" value="no"><div class="ios-radio-inner">❌ Нарушение</div></label>
                </div>
                <input type="text" id="comment_${f.id}" placeholder="Комментарий..."
                    style="width:100%;border-radius:12px;padding:14px 16px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:14px;outline:none;box-sizing:border-box;"
                    onfocus="this.style.border='1px solid var(--accent)'" onblur="this.style.border='1px solid rgba(255,255,255,0.1)'">
            </div>`;
    });

    container.innerHTML = html;
    window._wpPhotos = {};
    if (checkToEdit) {
        (checkToEdit.items || []).forEach(item => {
            const radio = document.querySelector(`input[name="check_${item.id}"][value="${item.status}"]`);
            if (radio) radio.checked = true;
            const comment = document.getElementById('comment_' + item.id);
            if (comment) comment.value = item.comment || '';
        });
        const submit = document.getElementById('manager-submit-btn');
        if (submit) submit.textContent = '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f';
    } else {
        const submit = document.getElementById('manager-submit-btn');
        if (submit) submit.textContent = '\u0423 \u043c\u0435\u043d\u044f \u0432\u0441\u0451 \u043f\u043e\u0434 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u0435\u043c';
    }
    modal.classList.add('active');
};

window.editManagerCheck = function(id) {
    const check = (window.MANAGER_CHECKS_DATA || []).find(c => String(c.id) === String(id));
    if (!check) return;
    if (!canEditManagerCheck(check)) {
        if (window.showToast) showToast('\u0421\u0440\u043e\u043a \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f 24 \u0447\u0430\u0441\u0430 \u0438\u0441\u0442\u0451\u043a', 'error');
        return;
    }
    window.openManagerModal(check);
};


// ==== CAMERA CAPTURE ====
window.openCamera = async function(zoneId) {
    // Helper: apply captured photo to the UI
    function applyPhoto(dataUrl) {
        const btn = document.getElementById('btn-camera-' + zoneId);
        if (btn) btn.style.display = 'none';
        const preview = document.getElementById('preview-' + zoneId);
        if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
        const retake = document.getElementById('retake-' + zoneId);
        if (retake) retake.style.display = 'block';
    }

    // Camera requires HTTPS — guide user to the secure URL
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!isSecure) {
        if (window.showToast) showToast('Камера работает только по HTTPS. Открой app.grome.pro', 'error');
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (window.showToast) showToast('Камера недоступна. Разреши доступ в настройках браузера.', 'error');
        return;
    }

    // Build fullscreen camera overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:999999;display:flex;flex-direction:column;';
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.style.cssText = 'flex:1;width:100%;object-fit:cover;';
    const controls = document.createElement('div');
    controls.style.cssText = 'padding:30px;display:flex;justify-content:space-around;background:#111;';
    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Отмена';
    closeBtn.style.cssText = 'padding:15px 30px;font-size:16px;border-radius:50px;background:#333;color:#fff;border:none;cursor:pointer;';
    const snapBtn = document.createElement('button');
    snapBtn.innerText = '📸 Сделать фото';
    snapBtn.style.cssText = 'padding:15px 30px;font-size:16px;border-radius:50px;background:var(--accent);color:#000;border:none;font-weight:bold;cursor:pointer;';
    controls.appendChild(closeBtn); controls.appendChild(snapBtn);
    overlay.appendChild(video); overlay.appendChild(controls);
    document.body.appendChild(overlay);

    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
    } catch(err) {
        document.body.removeChild(overlay);
        if (window.showToast) showToast('Нет доступа к камере. Разреши в настройках браузера.', 'error');
        return;
    }

    closeBtn.onclick = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
    };
    snapBtn.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1080;
        canvas.height = video.videoHeight || 1920;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (stream) stream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
        applyPhoto(dataUrl);
    };
};

window.closeManagerModal = function() {
    const modal = document.getElementById('manager-modal');
    if (modal) modal.classList.remove('active');
    window.CURRENT_EDIT_MANAGER_CHECK_ID = null;
};

// ==== API BALANCE ERROR BANNER ====
function _showApiBalanceError() {
    const old = document.getElementById('api-balance-banner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.id = 'api-balance-banner';
    banner.style.cssText = [
        'position:fixed', 'top:20px', 'left:50%', 'transform:translateX(-50%)',
        'background:#FF3B30', 'color:#fff', 'padding:14px 20px', 'border-radius:14px',
        'font-size:14px', 'font-weight:600', 'z-index:999999',
        'box-shadow:0 6px 24px rgba(255,59,48,0.45)', 'max-width:90vw', 'text-align:center',
        'cursor:pointer'
    ].join(';');
    banner.innerHTML = '⚠️ Недостаточно баланса API — фотопроверка недоступна<br><span style="font-weight:400;font-size:12px;opacity:0.9">Нажмите чтобы закрыть</span>';
    banner.onclick = () => banner.remove();
    document.body.appendChild(banner);
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 10000);
}

window.submitManagerCheck = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('manager-submit-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '⌛ Сохранение...';
    btn.disabled = true;

    try {
        const location = document.getElementById('manager-location').value;
        if (!location) {
            if (window.showToast) showToast('Выберите салон', 'error');
            else alert('Выберите салон');
            return;
        }

        const user = window.USER;
        const now  = new Date();
        const editId = window.CURRENT_EDIT_MANAGER_CHECK_ID;

        // Шаг 1: Отправляем фото зон в OpenAI Vision
        const zones = ['reklama', 'forma', 'kreslo', 'tv', 'shkaf', 'moyka'];
        const visionResults = [];

        btn.innerHTML = editId ? '\u{1F4BE} \u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...' : '🤖 ИИ проверяет фото...';
        for (const zoneId of editId ? [] : zones) {
            const preview = document.getElementById('preview-' + zoneId);
            if (preview && preview.src && preview.src.startsWith('data:image')) {
                const res = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zoneId, images: [preview.src] })
                });
                if (!res.ok) {
                    const errPayload = await res.json().catch(() => ({}));
                    if (errPayload.api_error) {
                        // Показываем баннер "недостаточно баланса API"
                        _showApiBalanceError();
                        throw new Error('API_BALANCE');
                    }
                    throw new Error(errPayload.error || 'Ошибка Vision API');
                }
                const data = await res.json();
                visionResults.push({ zone: zoneId, data });
            }
        }

        // Блокируем если ИИ отклонил хотя бы одну зону
        const failed = visionResults.filter(r => r.data && r.data.approved === false);
        if (failed.length > 0) {
            const errText = failed.map(f => `❌ ${f.zone}: ${f.data.comment}`).join('\n');
            showToast('⚠️ ИИ-Аудитор отклонил проверку!\n\n' + errText + '\n\nУстраните нарушения и переснимите фото.', 'error');
            throw new Error('AI_REJECTED');
        }

        // Шаг 2: Собираем чек-лист
        btn.innerHTML = '💾 Сохранение...';
        const items = [];
        for (const f of (MANAGER_CHECK_FIELDS || [])) {
            const radios = document.getElementsByName('check_' + f.id);
            let statusVal = 'yes';
            radios.forEach(r => { if (r.checked) statusVal = r.value; });
            const commentEl = document.getElementById('comment_' + f.id);
            items.push({ id: f.id, label: f.label, status: statusVal, comment: commentEl ? commentEl.value.trim() : '' });
        }

        const hasViolations = items.some(i => i.status === 'no');
        const overallStatus = hasViolations ? 'has_violations' : 'ok';
        const photoUrls = [];
        for (const zoneId of editId ? [] : zones) {
            const preview = document.getElementById('preview-' + zoneId);
            if (!preview || !preview.src || !preview.src.startsWith('data:image')) continue;
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64: preview.src })
            });
            if (uploadRes.ok) {
                const uploaded = await uploadRes.json();
                if (uploaded.url) photoUrls.push(uploaded.url);
            }
        }

        const checkData = {
            location:    location,
            date:        now.toISOString().split('T')[0],
            time:        now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            status:      overallStatus,
            submittedBy: user ? (user.name || user.tg_id) : 'Менеджер',
            items:       items,
            visionResults,
            photoUrls,
            clientRequestId: (window.crypto && typeof window.crypto.randomUUID === 'function')
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`
        };
        if (editId) checkData.id = editId;

        let res = null;
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                res = await fetch('/api/manager_checks', {
                    method:  editId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(checkData)
                });
                if (res.ok) break;

                const err = await res.json().catch(() => ({}));
                lastError = new Error(err.error || 'Ошибка сервера ' + res.status);
                if (res.status < 500) break;
            } catch (fetchError) {
                lastError = fetchError;
            }
        }

        if (!res || !res.ok) {
            throw lastError || new Error('Не удалось сохранить проверку');
        }

        const msg = hasViolations
            ? '⚠️ Проверка сохранена — обнаружены нарушения!'
            : '✅ Проверка пройдена — всё в норме!';
        if (window.showToast) showToast(msg, 'success');
        document.getElementById('manager-form').reset();
        window.CURRENT_EDIT_MANAGER_CHECK_ID = null;
        window.closeManagerModal();
        loadManagerChecks();

    } catch(err) {
        if (err.message !== 'AI_REJECTED' && err.message !== 'API_BALANCE') {
            console.error('[Manager] submit error:', err);
            if (window.showToast) showToast('Ошибка: ' + err.message, 'error');
            else alert('Ошибка: ' + err.message);
        }
    } finally {
        btn.innerHTML = origText;
        btn.disabled  = false;
    }
};

window.saveAdapter = async function() {
    const btn = document.querySelector('#adapter-modal .btn-submit');
    try {
        const newAdapter = {};
        document.querySelectorAll('.adapter-branch').forEach(branchDiv => {
            const bName = branchDiv.querySelector('.branch-name-input').value.trim();
            if (!bName) return;
            const term = branchDiv.querySelector('.branch-term-input').value.trim();
            const ycid = branchDiv.querySelector('.branch-yc-input').value.trim();
            const masters = [];
            branchDiv.querySelectorAll('.adapter-master').forEach(mDiv => {
                const elNames = mDiv.querySelector('.m-el').value.split(',').map(s => s.trim()).filter(Boolean);
                const mDash = elNames[0] || '';
                if (!mDash) return;
                masters.push({
                    dash:              mDash,
                    el_kassa:          elNames,
                    yclients_id:       mDiv.querySelector('.m-yc').value.trim(),
                    payBase:           parseFloat(mDiv.querySelector('.m-base').value) || 3000,
                    payPercent:        parseFloat(mDiv.querySelector('.m-percent').value) || 40,
                    topMaster:         Boolean(mDiv.querySelector('.m-top') && mDiv.querySelector('.m-top').checked)
                });
            });
            newAdapter[bName] = { el_kassa_terminal: term, yclients_company_id: ycid, masters };
        });

        btn.innerText = 'Сохранение...';
        const res = await fetch('/api/adapter', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(newAdapter)
        });
        if (res.ok) {
            btn.innerText = '✅ Сохранено';
            setTimeout(() => { btn.innerText = 'Сохранить изменения'; closeAdapterModal(); location.reload(); }, 1500);
        } else {
            throw new Error('Ошибка при сохранении на сервере');
        }
    } catch(e) {
        showToast('Ошибка сохранения:\n' + e.message, 'error');
        btn.innerText = 'Сохранить изменения';
    }
};

// ==== loadManagerDashboard — вызывается из mainscript после сохранения проверки ====
window.loadManagerDashboard = async function() {
    await loadManagerChecks();
    await loadManagerReactionStats();
};

// ==== СРЕДНЕЕ ВРЕМЯ РЕАКЦИИ (блок в кабинете менеджера) ====
window.loadManagerReactionStats = async function() {
    const el = document.getElementById('manager-avg-reaction');
    if (!el) return;
    try {
        const res  = await fetch('/api/ovn');
        if (!res.ok) return;
        const data = await res.json();

        const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
        const withReaction = data.filter(r =>
            r.reactionAt && r.createdAt &&
            new Date(r.createdAt).getTime() > cutoff
        );

        if (withReaction.length === 0) {
            el.innerHTML = `<div style="opacity:0.5;font-size:13px">Нет данных за 30 дней</div>`;
            return;
        }

        const avgMs = withReaction.reduce((sum, r) => {
            const ms = typeof window.getOvnReactionWorkingMs === 'function'
                ? window.getOvnReactionWorkingMs(r)
                : (new Date(r.reactionAt) - new Date(r.createdAt));
            return sum + ms;
        }, 0) / withReaction.length;

        const avgMin = Math.round(avgMs / 60000);
        const label  = `${avgMin} мин`;
        const color  = avgMin < 120 ? '#34C759' : avgMin < 360 ? '#FF9F0A' : '#FF3B30';

        el.innerHTML = `
            <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.03);border-radius:16px;border:1px solid rgba(255,255,255,0.07)">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Среднее время реакции (30 дней)</div>
                <div style="font-size:42px;font-weight:700;color:${color};line-height:1">${label}</div>
                <div style="font-size:12px;color:#666;margin-top:6px">по ${withReaction.length} нарушениям с реакцией</div>
            </div>`;
    } catch(e) {
        console.error('[Manager] reaction stats error:', e);
    }
};

// ==== ДИАЛОГ ФОТО МАСТЕРА (из адаптера) ====
window.promptMasterPhoto = function(masterName, location) {
    // Показываем модалку с выбором: добавить сейчас или позже
    const modal = document.createElement('div');
    modal.id = 'master-photo-prompt';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;
        display:flex;align-items:center;justify-content:center;padding:20px`;
    modal.innerHTML = `
        <div style="background:#111;border:1px solid #333;border-radius:20px;padding:28px;max-width:420px;width:100%">
            <h3 style="margin:0 0 8px;font-size:18px">📸 Фото работ мастера</h3>
            <p style="color:#888;font-size:13px;margin:0 0 16px;line-height:1.5">
                Добавьте 2–3 фото стрижек с фейдом для мастера <b style="color:#fff">${masterName}</b>.<br>
                <span style="color:#FFCC00;font-size:12px">⚠️ Пожалуйста, загружайте только фото работ с фейдом, 2–3 шт.</span>
            </p>
            <div id="photo-upload-zone" style="border:2px dashed #444;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;cursor:pointer;transition:border-color 0.2s"
                onclick="document.getElementById('master-photo-file').click()"
                ondragover="event.preventDefault();this.style.borderColor='#FFCC00'"
                ondragleave="this.style.borderColor='#444'"
                ondrop="handleMasterPhotoDrop(event,'${masterName}')">
                <div style="font-size:32px;margin-bottom:8px">📷</div>
                <div style="font-size:13px;color:#888">Нажмите или перетащите фото (2–3 шт.)</div>
                <input type="file" id="master-photo-file" multiple accept="image/*" style="display:none"
                    onchange="handleMasterPhotoSelect(this,'${masterName}')">
            </div>
            <div id="photo-thumbs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px"></div>
            <div style="display:flex;gap:10px">
                <button id="save-photos-btn" onclick="saveMasterPhotos('${masterName}','${location || ''}')" disabled
                    style="flex:1;background:#FFCC00;color:#000;border:none;padding:12px;border-radius:10px;
                           font-weight:700;cursor:not-allowed;opacity:0.5;font-size:14px">
                    Загрузить фото
                </button>
                <button onclick="remindLaterMasterPhoto('${masterName}','${location || ''}')"
                    style="flex:1;background:transparent;border:1px solid #444;color:#888;padding:12px;
                           border-radius:10px;font-size:14px;cursor:pointer">
                    Загружу позже
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    window._masterPhotoFiles = [];
};

window.handleMasterPhotoSelect = function(input, masterName) {
    window._masterPhotoFiles = Array.from(input.files);
    renderPhotoThumbs(window._masterPhotoFiles);
};

window.handleMasterPhotoDrop = function(e, masterName) {
    e.preventDefault();
    document.getElementById('photo-upload-zone').style.borderColor = '#444';
    window._masterPhotoFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    renderPhotoThumbs(window._masterPhotoFiles);
};

function renderPhotoThumbs(files) {
    const thumbs = document.getElementById('photo-thumbs');
    if (!thumbs) return;
    thumbs.innerHTML = '';
    const btn = document.getElementById('save-photos-btn');
    files.forEach(f => {
        const img = document.createElement('img');
        img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #333';
        const reader = new FileReader();
        reader.onload = e => { img.src = e.target.result; };
        reader.readAsDataURL(f);
        thumbs.appendChild(img);
    });
    if (btn) {
        btn.disabled = files.length === 0;
        btn.style.opacity = files.length === 0 ? '0.5' : '1';
        btn.style.cursor  = files.length === 0 ? 'not-allowed' : 'pointer';
    }
}

window.saveMasterPhotos = async function(masterName, location) {
    const files = window._masterPhotoFiles || [];
    if (files.length === 0) return;
    const btn = document.getElementById('save-photos-btn');
    if (btn) { btn.innerText = 'Загрузка...'; btn.disabled = true; }

    try {
        for (const file of files) {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            await fetch('/api/master_photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterName, base64 })
            });
        }
        // Убираем из очереди напоминаний
        await fetch('/api/pending_photos?master=' + encodeURIComponent(masterName), { method: 'DELETE' });

        showToast(`✅ Фото мастера ${masterName} загружены!`, 'success');
        const modal = document.getElementById('master-photo-prompt');
        if (modal) modal.remove();
    } catch(e) {
        showToast('Ошибка загрузки: ' + e.message, 'error');
        if (btn) { btn.innerText = 'Загрузить фото'; btn.disabled = false; }
    }
};

window.remindLaterMasterPhoto = async function(masterName, location) {
    // Добавляем в очередь повторных напоминаний (каждые 24ч до загрузки)
    await fetch('/api/pending_photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            masterName,
            location,
            addedBy: window.USER ? window.USER.name : 'Менеджер'
        })
    });
    showToast('Напомним через 24 часа', 'success');
    const modal = document.getElementById('master-photo-prompt');
    if (modal) modal.remove();
};

// ==== ПРОСМОТР ФОТО МАСТЕРА ====
window.viewMasterPhotos = async function(masterName) {
    try {
        const res  = await fetch('/api/master_photos?master=' + encodeURIComponent(masterName));
        const data = await res.json();
        if (!data.photos || data.photos.length === 0) {
            showToast('Фото пока не загружены', 'error');
            return;
        }
        const modal = document.createElement('div');
        modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;
            display:flex;align-items:center;justify-content:center;padding:20px;flex-direction:column;gap:16px`;
        modal.onclick = () => modal.remove();
        modal.innerHTML = `
            <div style="font-size:16px;font-weight:700;color:#fff">${masterName} — работы</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
                ${data.photos.map(url => `<img src="${url}" style="height:220px;width:auto;border-radius:12px;object-fit:cover;box-shadow:0 4px 20px rgba(0,0,0,0.5)">`).join('')}
            </div>
            <div style="font-size:12px;color:#666">Нажмите в любое место, чтобы закрыть</div>`;
        document.body.appendChild(modal);
    } catch(e) {
        showToast('Ошибка загрузки фото', 'error');
    }
};
