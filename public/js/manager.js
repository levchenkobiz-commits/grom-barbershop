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
    { id: 2,  label: 'Инструмент мастера в исправном состоянии (нет сломанных машинок/гребней).', photo: 'optional' },
    { id: 3,  label: 'В салоне поддерживается комфортная температура в диапазоне 19-23 градуса.', photo: 'optional' },
    { id: 4,  label: 'В зале на видных местах не хранятся коробки промоутеров, вода и другой хозяйственный инвентарь.', photo: 'optional' },
    { id: 5,  label: 'Музыка играет строго из согласованного плей-листа, поддерживается оптимальная фоновая громкость.', photo: 'optional' },
    { id: 6,  label: 'Проверка технической части: работают все розетки, терминал, нет протечек воды, в туалете есть бумага и мыло.', photo: 'optional' },
    { id: 7,  label: 'Каждый мастер обязательно проводит детальную консультацию с клиентом перед началом стрижки.', photo: 'optional' },
    { id: 8,  label: 'Цветные бутылочки и косметика, не входящая в нашу официальную рабочую матрицу, полностью отсутствуют на рабочих местах.', photo: 'optional' },
    { id: 9,  label: 'Все зафиксированные нарушения из таблицы (ОВН) за последние 48 часов проработаны на месте с мастерами.', photo: 'optional' }
];

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
        tbody.innerHTML = '';

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
    const check = (window.MANAGER_CHECKS_DATA || []).find(c => c.id === id);
    if (!check) return;

    let html = `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;color:#fff;background:#000;padding:20px">
        <h2 style="color:#fff">Отчет: ${check.location}</h2>
        <p style="color:#888">${new Date(check.createdAt).toLocaleString('ru-RU')}</p>
        <hr style="border-color:#333">`;

    check.items.forEach(i => {
        const color     = i.status === 'yes' ? '#34C759' : (i.status === 'fixed' ? '#FF9F0A' : '#FF3B30');
        const statusMap = { yes: 'ДА / НОРМА', no: 'НЕТ / НАРУШЕНИЕ', fixed: 'ИСПРАВЛЕНО' };
        html += `
            <div style="margin-bottom:15px;border:1px solid #333;padding:15px;border-left:5px solid ${color};border-radius:8px;background:#111">
                <div style="font-size:15px;font-weight:bold;margin-bottom:8px">${i.id}. ${i.label}</div>
                <div style="margin-bottom:5px;color:${color};font-weight:bold">[${statusMap[i.status]}]</div>
                <div style="margin-bottom:10px;color:#ddd;font-style:italic">Комментарий: ${i.comment}</div>
                ${i.photo ? `<div style="margin-top:10px"><img src="${i.photo}" style="max-width:100%;border-radius:4px;border:1px solid #444"></div>` : ''}
            </div>`;
    });
    html += '</div>';

    const win = window.open('','_blank');
    win.document.body.style.backgroundColor = '#000';
    win.document.write(html);
};

// ==== ADAPTER GUI ====
window.openAdapterModal = function() {
    const container = document.getElementById('adapter-gui-container');
    if (!container) return;
    let html = '';

    for (const loc in ADAPTER) {
        const branch  = ADAPTER[loc];
        const masters = branch.masters || [];

        html += `<div class="adapter-branch" style="background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;margin-bottom:15px;border:1px solid #333">
            <div style="display:flex;gap:10px;margin-bottom:15px;align-items:center">
                <input type="text" class="branch-name-input" value="${loc}"
                    style="flex:1;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px;font-weight:bold;font-size:16px">
                <input type="text" class="branch-term-input" value="${branch.el_kassa_terminal || ''}" placeholder="El.Kassa Терминал"
                    style="width:150px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px">
                <input type="text" class="branch-yc-input" value="${branch.yclients_company_id || ''}" placeholder="YClients ID"
                    style="width:150px;background:#000;border:1px solid #444;color:#fff;padding:8px;border-radius:4px">
                <button onclick="this.closest('.adapter-branch').remove()"
                    style="background:#ff4444;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer">Удалить</button>
            </div>
            <div class="masters-list" style="padding-left:20px;border-left:2px solid #333;overflow-x:auto;padding-bottom:5px">
                <div style="display:grid;grid-template-columns:1.5fr 2fr 1.5fr 80px 80px 42px;gap:10px;margin-bottom:8px;font-size:11px;color:#666;font-weight:600">
                    <span>ДЭШ ИМЯ</span><span>ЭЛКАССА (через запятую)</span><span>YCLIENTS ID</span><span>ВЫХОД</span><span>%</span><span></span>
                </div>
                ${masters.map(m => `
                    <div class="adapter-master"
                        style="display:grid;grid-template-columns:1.5fr 2fr 1.5fr 80px 80px 42px;gap:10px;margin-bottom:8px;align-items:center">
                        <input type="text" class="m-dash" value="${m.dash}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:var(--accent);padding:6px;border-radius:4px">
                        <input type="text" class="m-el" value="${(m.el_kassa||[]).join(', ')}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px" placeholder="Имена в элкассе через запятую">
                        <input type="text" class="m-yc" value="${m.yclients_id||''}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px" placeholder="YClients ID">
                        <input type="number" class="m-base" value="${m.payBase||3000}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
                        <input type="number" class="m-percent" value="${m.payPercent||40}" style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
                        <button onclick="this.closest('.adapter-master').remove()"
                            style="background:transparent;color:#ff4444;border:1px solid #ff4444;padding:6px 0;border-radius:4px;cursor:pointer;text-align:center">✕</button>
                    </div>`).join('')}
                <button onclick="addAdapterMaster(this)"
                    style="margin-top:10px;background:transparent;border:1px dashed #555;color:#888;padding:6px 12px;border-radius:4px;cursor:pointer;width:100%">
                    + Добавить мастера
                </button>
            </div>
        </div>`;
    }

    container.innerHTML = html;
    document.getElementById('adapter-modal').classList.add('active');
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
            <button onclick="this.closest('.adapter-branch').remove()"
                style="background:#ff4444;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer">Удалить</button>
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
    div.style.cssText = 'display:grid;grid-template-columns:1.5fr 2fr 1.5fr 80px 80px 42px;gap:10px;margin-bottom:8px;align-items:center';
    div.innerHTML = `
        <input type="text" class="m-dash" value="Имя"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:var(--accent);padding:6px;border-radius:4px">
        <input type="text" class="m-el" value="" placeholder="Имена в элкассе через запятую"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <input type="text" class="m-yc" value="" placeholder="YClients ID"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <input type="number" class="m-base" value="3000"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <input type="number" class="m-percent" value="40"
            style="width:100%;min-width:0;background:#000;border:1px solid #444;color:#fff;padding:6px;border-radius:4px">
        <button onclick="this.closest('.adapter-master').remove()"
            style="background:transparent;color:#ff4444;border:1px solid #ff4444;padding:6px 0;border-radius:4px;cursor:pointer;text-align:center">✕</button>`;
    btn.parentNode.insertBefore(div, btn);
};

window.closeAdapterModal = function() {
    document.getElementById('adapter-modal').classList.remove('active');
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
                const mDash = mDiv.querySelector('.m-dash').value.trim();
                if (!mDash) return;
                masters.push({
                    dash:              mDash,
                    el_kassa:          mDiv.querySelector('.m-el').value.split(',').map(s => s.trim()).filter(Boolean),
                    yclients_id:       mDiv.querySelector('.m-yc').value.trim(),
                    payBase:           parseFloat(mDiv.querySelector('.m-base').value) || 3000,
                    payPercent:        parseFloat(mDiv.querySelector('.m-percent').value) || 40
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
