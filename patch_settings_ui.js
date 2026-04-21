const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');

const tabSettingsBtn = `<button class="tab-btn" id="tab-settings" onclick="switchTab('settings', this)">Настройки</button>`;
if (!html.includes('id="tab-settings"')) {
    html = html.replace(/(<button class="tab-btn" id="tab-schedule".*?<\/button>)/, "$1\n            " + tabSettingsBtn);
}

const settingsContent = `
    <!-- Settings Tab -->
    <div id="content-settings" class="tab-content" style="display:none; padding: 20px; color: #fff;">
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Мой рабочий график</h2>
        <p style="color: #aaa; margin-bottom: 20px;">Отметьте дни, когда вы работаете. Бот будет проверять выполнение плана (ОВН: 35 проверок, Менеджер: 3 оценки) только в эти дни.</p>
        <div id="settings-schedule-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;">
           <!-- JS will populate next 14 days -->
        </div>
        <button onclick="saveMySchedule()" style="background: #007AFF; color: #fff; padding: 12px 24px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer;">Сохранить график</button>
    </div>
`;
if (!html.includes('id="content-settings"')) {
    html = html.replace(/(<\/div>\s*<\/main>)/, settingsContent + "\n$1");
}

fs.writeFileSync('index.html', html, 'utf8');

// 2. Update mainscript.js
let js = fs.readFileSync('mainscript.js', 'utf8');
const scriptToAdd = `
window.renderSettingsSchedule = function() {
    const container = document.getElementById('settings-schedule-container');
    if (!container) return;
    
    // We already have window.USER.schedule if backend provided it, wait...
    // Let's refetch it just in case
    if (!window.USER) return container.innerHTML = 'Сначала войдите в систему';
    
    // Create next 14 days
    const today = dayjs();
    let mySchedule = window.USER.schedule || [];
    let htmlStr = '';
    
    for (let i = 0; i < 14; i++) {
        const d = today.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        const dateDisp = d.format('DD.MM (dd)');
        const isChecked = mySchedule.includes(dateStr) ? 'class="sched-btn active" style="background:#007AFF;border-color:#007AFF;color:#fff;"' : 'class="sched-btn" style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#aaa;"';
        
        htmlStr += \`
            <div data-date="\${dateStr}" \${isChecked} onclick="toggleScheduleDate(this)" 
                style="padding: 10px 15px; border-radius: 8px; border: 1px solid; cursor: pointer; transition: 0.2s;">
                \${dateDisp}
            </div>
        \`;
    }
    
    container.innerHTML = htmlStr;
};

window.toggleScheduleDate = function(el) {
    if (el.classList.contains('active')) {
        el.classList.remove('active');
        el.style.background = 'rgba(255,255,255,0.05)';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        el.style.color = '#aaa';
    } else {
        el.classList.add('active');
        el.style.background = '#007AFF';
        el.style.borderColor = '#007AFF';
        el.style.color = '#fff';
    }
};

window.saveMySchedule = async function() {
    if (!window.USER) return showToast('Ошибка: нет пользователя', 'error');
    
    const container = document.getElementById('settings-schedule-container');
    const activeDivs = container.querySelectorAll('.sched-btn.active');
    const dates = Array.from(activeDivs).map(d => d.getAttribute('data-date'));
    
    try {
        const res = await fetch('/api/me/schedule?tg_id=' + window.USER.id, {
            method: 'POST',
            body: JSON.stringify({ schedule: dates })
        });
        if (res.ok) {
            showToast('График успешно сохранен!', 'success');
            window.USER.schedule = dates;
        } else {
            showToast('Ошибка при сохранении', 'error');
        }
    } catch(err) {
        showToast('Ошибка сети', 'error');
    }
};

// Hook into switchTab
const origSwitchTabForSettings = window.switchTab;
window.switchTab = function(tabId, el) {
    if (origSwitchTabForSettings) origSwitchTabForSettings(tabId, el);
    if (tabId === 'settings') {
        window.renderSettingsSchedule();
    }
};

// Also display tab-settings only to auth'd users who need it
const settingsTabBtn = document.getElementById('tab-settings');
if (settingsTabBtn) {
    // Hidden by default, unhide in appInit
    settingsTabBtn.style.display = 'none';
}
`;

if (!js.includes('renderSettingsSchedule')) {
    js += '\n' + scriptToAdd;
    // We should also patch appInit or something that unhides the tab for manager/ovn.
    js = js.replace(
        "if (user.role === 'manager') document.getElementById('tab-manager').style.display = 'inline-block';",
        "if (user.role === 'manager') document.getElementById('tab-manager').style.display = 'inline-block';\n                        if (['manager', 'ovn', 'owner'].includes(user.role)) { const t = document.getElementById('tab-settings'); if(t) t.style.display='inline-block'; }"
    );
    // Same for OVN:
    js = js.replace(
        "if (user.role === 'ovn') document.getElementById('tab-ovn').style.display = 'inline-block';",
        "if (user.role === 'ovn') document.getElementById('tab-ovn').style.display = 'inline-block';\n                        if (['manager', 'ovn', 'owner'].includes(user.role)) { const t = document.getElementById('tab-settings'); if(t) t.style.display='inline-block'; }"
    );

    fs.writeFileSync('mainscript.js', js, 'utf8');
}
console.log('UI Patched!');
