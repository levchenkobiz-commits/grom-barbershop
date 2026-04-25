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

// ==== MANAGER CHECK MODAL (AI INSPECTION) ====

window.openManagerModal = function() {
    const modal = document.getElementById('manager-modal');
    if (!modal) return;

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

    // Шаг 1: Зоны AI-фото
    const container = document.getElementById('manager-fields-container');
    let html = '';

    const zones = [
        { id: 'reklama', title: 'Наружная реклама',         desc: 'Реклама исправна и чистая.',                      img: 'https://dummyimage.com/600x400/111/E8FF38&text=Реклама' },
        { id: 'forma',   title: 'Мастера в форме',           desc: 'Чистая форма, закрытая обувь.',                   img: 'https://dummyimage.com/600x400/111/E8FF38&text=Мастера' },
        { id: 'kreslo',  title: 'Кресло развернуто ко входу', desc: 'Кресло направлено ко входу, есть пеньюар.',       img: 'https://dummyimage.com/600x400/111/E8FF38&text=Кресло' },
        { id: 'tv',      title: 'Телевизор',                  desc: 'Телевизор включен и работает.',                   img: 'https://dummyimage.com/600x400/111/E8FF38&text=Телевизор' },
        { id: 'shkaf',   title: 'Шкафы',                      desc: 'На шкафах нет волос и личных вещей.',             img: 'https://dummyimage.com/600x400/111/E8FF38&text=Шкафы' },
        { id: 'moyka',   title: 'Мойка',                      desc: 'Раковина чистая, нет тряпок на виду.',            img: 'https://dummyimage.com/600x400/111/E8FF38&text=Мойка' }
    ];

    html += '<h3 style="font-size:18px;margin:0 0 15px 0;">Шаг 1: Фото-проверка ИИ</h3>';
    html += zones.map(zone => `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;margin-bottom:20px;">
            <div style="padding:15px 20px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h3 style="font-size:16px;margin:0;color:#fff;">${zone.title}</h3>
                    <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0 0;">${zone.desc}</p>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;">
                <div style="flex:1;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="background:#000;padding:8px;text-align:center;font-size:11px;color:var(--accent);font-weight:bold;text-transform:uppercase;">Эталон</div>
                    <img src="${zone.img}" style="width:100%;height:200px;object-fit:cover;display:block;">
                </div>
                <div style="flex:1;position:relative;background:#161616;">
                    <div style="background:rgba(0,0,0,0.5);padding:8px;text-align:center;font-size:11px;color:#fff;font-weight:bold;text-transform:uppercase;">Текущее состояние (Факт)</div>
                    <div style="display:flex;align-items:center;justify-content:center;min-height:200px;padding:20px;position:relative;">
                        <div id="btn-camera-${zone.id}" onclick="openCamera('${zone.id}')"
                             style="cursor:pointer;background:rgba(255,255,255,0.05);border:1px dashed var(--accent);border-radius:12px;padding:25px;width:100%;text-align:center;color:var(--accent);font-size:14px;font-weight:bold;transition:all 0.2s;">
                             Сделать фото факта<br>
                            <span style="font-weight:400;font-size:12px;opacity:0.7;color:#fff;display:block;margin-top:5px;">Строго через камеру (Live)</span>
                        </div>
                        <img id="preview-${zone.id}" style="width:100%;height:200px;object-fit:cover;display:none;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.5);">
                        <button type="button" id="retake-${zone.id}" onclick="openCamera('${zone.id}')"
                                style="display:none;position:absolute;bottom:15px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;border:1px solid #444;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer;">
                             Переснять
                        </button>
                    </div>
                </div>
            </div>
            <div style="padding:12px;background:rgba(52,199,89,0.05);color:#34C759;font-size:12px;text-align:center;">
                Вы уверены, что факт идентичен эталону? Если отправить фото с бардаком, ИИ вернет проверку.
            </div>
        </div>
    `).join('');

    // Шаг 2: Чек-лист
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
    html += '<h3 style="font-size:18px;margin:30px 0 15px 0;">Шаг 2: Чек-лист</h3>';
    MANAGER_CHECK_FIELDS.forEach(f => {
        html += `
            <div class="form-field manager-check-field">
                <label style="font-size:14px;margin-bottom:15px;display:block;font-weight:500;line-height:1.4;">${f.id}. ${f.label}</label>
                <div class="ios-segmented-control">
                    <label class="ios-radio"><input type="radio" name="check_${f.id}" value="yes" required><div class="ios-radio-inner">✅ Норма</div></label>
                    <label class="ios-radio"><input type="radio" name="check_${f.id}" value="no"><div class="ios-radio-inner">❌ Нарушение</div></label>
                </div>
                <input type="text" id="comment_${f.id}" placeholder="Комментарий..." required
                    style="width:100%;border-radius:12px;padding:14px 16px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;font-size:14px;outline:none;box-sizing:border-box;"
                    onfocus="this.style.border='1px solid var(--accent)'" onblur="this.style.border='1px solid rgba(255,255,255,0.1)'">
            </div>`;
    });

    container.innerHTML = html;
    modal.classList.add('active');
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
};

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

        // Шаг 1: Отправляем фото зон в OpenAI Vision
        const zones = ['reklama', 'forma', 'kreslo', 'tv', 'shkaf', 'moyka'];
        const visionResults = [];

        btn.innerHTML = '🤖 ИИ проверяет фото...';
        for (const zoneId of zones) {
            const preview = document.getElementById('preview-' + zoneId);
            if (preview && preview.src && preview.src.startsWith('data:image')) {
                const res = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zoneId, images: [preview.src] })
                });
                if (!res.ok) {
                    const errPayload = await res.json().catch(() => ({}));
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

        const checkData = {
            location:    location,
            date:        now.toISOString().split('T')[0],
            time:        now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            status:      overallStatus,
            submittedBy: user ? (user.name || user.tg_id) : 'Менеджер',
            items:       items,
            visionResults
        };

        const res = await fetch('/api/manager_checks', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(checkData)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка сервера ' + res.status);
        }

        const msg = hasViolations
            ? '⚠️ Проверка сохранена — обнаружены нарушения!'
            : '✅ Проверка пройдена — всё в норме!';
        if (window.showToast) showToast(msg, 'success');
        document.getElementById('manager-form').reset();
        window.closeManagerModal();
        loadManagerChecks();

    } catch(err) {
        if (err.message !== 'AI_REJECTED') {
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
