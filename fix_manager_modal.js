const fs = require('fs');
let code = fs.readFileSync('mainscript.js', 'utf8');

// 1. Remove the first definitions to avoid duplication
const startIdx1 = code.indexOf('window.openManagerModal = function() {');
const endIdx1 = code.indexOf('window.submitManagerCheck = async function(e) {') + code.substring(code.indexOf('window.submitManagerCheck = async function(e) {')).indexOf('};') + 2;

code = code.substring(0, startIdx1) + code.substring(endIdx1);

// 2. Now replace the second definition with the combined version
const startIdx2 = code.indexOf('window.openManagerModal = function() {');
const endIdx2 = code.indexOf('window.submitManagerCheck = async function(e) {') + code.substring(code.indexOf('window.submitManagerCheck = async function(e) {')).indexOf('};') + 2;

const combinedLogic = `window.openManagerModal = function() {
    document.getElementById('manager-modal').classList.add('active');
    
    const locSelect = document.getElementById('manager-location');
    if (locSelect) {
        locSelect.innerHTML = '<option value="">Выберите салон...</option>';
        if (typeof ADAPTER !== 'undefined') {
            Object.keys(ADAPTER).forEach(loc => {
                locSelect.innerHTML += \`<option value="\${loc}">\${loc}</option>\`;
            });
        } else if (typeof LOCATIONS !== 'undefined') {
            LOCATIONS.forEach(loc => {
                locSelect.innerHTML += \`<option value="\${loc}">\${loc}</option>\`;
            });
        }
    }
    
    const container = document.getElementById('manager-fields-container');
    let html = '';
    
    // ZONES (AI CHECK)
    const zones = [
        { id: 'reception', title: 'Ресепшен и Витрина', desc: 'Косметика выставлена ровно, стол протерт, журналы аккуратно сложены.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Эталон:+Ресепшен' },
        { id: 'workstation', title: 'Рабочее место', desc: 'Тележка организована в идеальном порядке, кресло опущено и выровнено.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Эталон:+Рабочее+Место' },
        { id: 'coffee', title: 'Зона кофе/напитков', desc: 'Раковина прозрачно-сухая, стаканы выровнены по линии.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Эталон:+Напитки' },
        { id: 'facade', title: 'Входная группа', desc: 'Коврик чистый, двери без отпечатков пальцев.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Эталон:+Фасад' }
    ];

    html += '<h3 style="font-size: 18px; margin: 0 0 15px 0;">Шаг 1: Фото-отчет для ИИ</h3>';
    html += zones.map(zone => \`
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; margin-bottom: 20px;">
            <div style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 16px; margin: 0; color: #fff;">\${zone.title}</h3>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">\${zone.desc}</p>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="background: #000; padding: 8px; text-align: center; font-size: 11px; color: var(--accent); font-weight: bold; text-transform: uppercase;">Эталон</div>
                    <img src="\${zone.img}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
                </div>
                <div style="flex: 1; position: relative; background: #161616;">
                    <div style="background: rgba(0,0,0,0.5); padding: 8px; text-align: center; font-size: 11px; color: #fff; font-weight: bold; text-transform: uppercase;">Текущее состояние (Факт)</div>
                    <div style="display:flex; align-items:center; justify-content:center; min-height: 200px; padding: 20px; position:relative;">
                        <div id="btn-camera-\${zone.id}" onclick="openCamera('\${zone.id}')" 
                             style="cursor: pointer; background: rgba(255,255,255,0.05); border: 1px dashed var(--accent); border-radius: 12px; padding: 25px; width: 100%; text-align: center; color: var(--accent); font-size: 14px; font-weight: bold; transition: all 0.2s;">
                            📷 Сделать фото факта<br>
                            <span style="font-weight: 400; font-size: 12px; opacity: 0.7; color: #fff; display:block; margin-top:5px;">Строго через камеру (Live)</span>
                        </div>
                        
                        <img id="preview-\${zone.id}" style="width:100%; height:200px; object-fit:cover; display:none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        
                        <button type="button" id="retake-\${zone.id}" onclick="openCamera('\${zone.id}')" 
                                style="display:none; position:absolute; bottom:15px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; border:1px solid #444; padding:8px 16px; border-radius:8px; font-size:12px; cursor:pointer;">
                            🔄 Переснять
                        </button>
                    </div>
                </div>
            </div>
            <div style="padding: 12px; background: rgba(52, 199, 89, 0.05); color: #34C759; font-size: 12px; text-align: center;">
                Вы уверены, что факт идентичен эталону? Если отправить фото с бардаком, ИИ вернет проверку.
            </div>
        </div>
    \`).join('');

    // STANDARD CHECKLIST
    if (typeof MANAGER_CHECK_FIELDS !== 'undefined') {
        html += '<h3 style="font-size: 18px; margin: 30px 0 15px 0;">Шаг 2: Классический чек-лист</h3>';
        MANAGER_CHECK_FIELDS.forEach(f => {
            html += \`
                <div class="form-field" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid #333; margin-bottom: 15px;">
                    <label style="font-size: 15px; margin-bottom: 10px;">\${f.id}. \${f.label}</label>
                    <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                        <label><input type="radio" name="check_\${f.id}" value="yes" required> Да / Норма</label>
                        <label><input type="radio" name="check_\${f.id}" value="no"> Нет / Нарушение</label>
                        <label><input type="radio" name="check_\${f.id}" value="fixed"> Исправили</label>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: start;">
                        <input type="text" id="comment_\${f.id}" placeholder="Комментарий..." required style="flex: 1; border-radius: 6px; padding: 10px; background: #000; border: 1px solid #444; color: #fff;">
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <input type="file" id="photo_\${f.id}" accept="image/*" \${f.photo === 'required' ? 'required' : ''} style="width: 200px; font-size: 12px; color: #fff;">
                            \${f.photo === 'required' ? '<span style="color: #ff4444; font-size: 10px;">ФОТО ОБЯЗАТЕЛЬНО</span>' : '<span style="color: #888; font-size: 10px;">Фото опционально</span>'}
                        </div>
                    </div>
                </div>
            \`;
        });
    }

    container.innerHTML = html;
};

window.closeManagerModal = function() {
    document.getElementById('manager-modal').classList.remove('active');
};

window.openCamera = async function(zoneId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("ОШИБКА: Ваш браузер не поддерживает прямую работу с камерой. Открывать из галереи запрещено.");
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'camera-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0'; overlay.style.left = '0';
    overlay.style.width = '100vw'; overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#000';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex'; overlay.style.flexDirection = 'column';
    
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.style.flex = '1'; video.style.width = '100%'; video.style.objectFit = 'cover';
    
    const controls = document.createElement('div');
    controls.style.padding = '30px'; controls.style.display = 'flex'; controls.style.justifyContent = 'space-around'; controls.style.backgroundColor = '#111';

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Отмена';
    closeBtn.style.padding = '15px 30px'; closeBtn.style.fontSize = '16px'; closeBtn.style.borderRadius = '50px'; closeBtn.style.background = '#333'; closeBtn.style.color = '#fff'; closeBtn.style.border = 'none'; closeBtn.style.cursor = 'pointer';

    const snapBtn = document.createElement('button');
    snapBtn.innerText = '📸 Сделать фото';
    snapBtn.style.padding = '15px 30px'; snapBtn.style.fontSize = '16px'; snapBtn.style.borderRadius = '50px'; snapBtn.style.background = 'var(--accent)'; snapBtn.style.color = '#000'; snapBtn.style.border = 'none'; snapBtn.style.fontWeight = 'bold'; snapBtn.style.cursor = 'pointer';

    controls.appendChild(closeBtn); controls.appendChild(snapBtn);
    overlay.appendChild(video); overlay.appendChild(controls);
    document.body.appendChild(overlay);

    let activeStream = null;
    try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = activeStream;
    } catch(err) {
        alert("Нет доступа к камере. Зайдите в Настройки браузера -> Разрешения -> Камера -> Разрешить.");
        document.body.removeChild(overlay);
        return;
    }

    closeBtn.onclick = () => {
        if(activeStream) activeStream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
    };

    snapBtn.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1080;
        canvas.height = video.videoHeight || 1920;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if(activeStream) activeStream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
        
        document.getElementById('btn-camera-' + zoneId).style.display = 'none';
        const preview = document.getElementById('preview-' + zoneId);
        preview.style.display = 'block';
        preview.src = dataUrl;
        document.getElementById('retake-' + zoneId).style.display = 'block';
    };
};

window.submitManagerCheck = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('manager-submit-btn');
    btn.innerHTML = 'Нейросеть проверяет и сохраняет данные... ⏳';
    btn.disabled = true;

    try {
        const checkData = {
            location: document.getElementById('manager-location').value,
            date: new Date().toISOString().split('T')[0],
            items: [],
            visionResults: []
        };

        // 1. Check AI Zones
        const zones = ['reception', 'workstation', 'coffee', 'facade'];
        for (const zone of zones) {
            const preview = document.getElementById('preview-' + zone);
            if (preview && preview.src && preview.src.startsWith('data:image')) {
                const res = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zoneId: zone, images: [preview.src] })
                });
                if (!res.ok) {
                    const errPayload = await res.json();
                    throw new Error(errPayload.error || 'Server error');
                }
                const data = await res.json();
                checkData.visionResults.push({ zone, data });
            }
        }
        
        if (checkData.visionResults.length === 0) {
            throw new Error("Нет фотографий факта для проверки. Сделайте минимум одно AI-фото.");
        }

        const failed = checkData.visionResults.filter(r => r.data && r.data.approved === false);
        if (failed.length > 0) {
            const errText = failed.map(f => \`❌ Ракурс "\${f.zone}": \${f.data.comment}\`).join('\\n\\n');
            alert("⚠️ ИИ-Аудитор отклонил проверку из-за нарушения стандартов!\\n\\n" + errText + "\\n\\nПожалуйста, наведите порядок и переснимите отклоненные фото!");
            throw new Error("AI Validation Failed");
        }

        // 2. Iterate Checklist Items
        if (typeof fileToBase64 === 'undefined') {
            window.fileToBase64 = async function(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            }
        }

        if (typeof MANAGER_CHECK_FIELDS !== 'undefined') {
            for (const f of MANAGER_CHECK_FIELDS) {
                const radios = document.getElementsByName(\`check_\${f.id}\`);
                let statusVal = '';
                radios.forEach(r => { if(r.checked) statusVal = r.value; });
                
                const commentVal = document.getElementById(\`comment_\${f.id}\`).value;
                const fileInput = document.getElementById(\`photo_\${f.id}\`);
                
                let photoUrl = null;
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    const base64 = await fileToBase64(fileInput.files[0]);
                    const upRes = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64 })
                    });
                    if (upRes.ok) {
                        const upData = await upRes.json();
                        photoUrl = upData.url;
                    }
                }

                checkData.items.push({
                    id: f.id,
                    label: f.label,
                    status: statusVal,
                    comment: commentVal,
                    photo: photoUrl
                });
            }
        }

        // 3. Save Master Data
        checkData.status = 'approved_by_ai';
        const postRes = await fetch('/api/manager_checks', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(checkData)
        });
        
        if (!postRes.ok) throw new Error("Не удалось сохранить инспекцию на сервере");

        alert("✅ Инспекция успешно пройдена и сохранена! ИИ подтвердил идеальную чистоту и классический чек-лист сохранен.");
        document.getElementById('manager-form').reset();
        closeManagerModal();
        
    } catch(err) {
        if (err.message !== "AI Validation Failed") {
            console.error(err);
            alert("Ошибка: " + err.message);
        }
    } finally {
        btn.innerHTML = 'Отправить проверку';
        btn.disabled = false;
    }
};`;

code = code.substring(0, startIdx2) + combinedLogic + code.substring(endIdx2);
fs.writeFileSync('mainscript.js', code);
console.log('mainscript.js successfully updated to combine logic!');
