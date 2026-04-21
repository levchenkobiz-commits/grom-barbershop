const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// First, fix the corrupted drilldown / analytics section
const corruptedSectionStart = `<span class="err-icon" style="position: absolute; top: 10px; right: 40px; color: #FFCC00; font-size: 18px; display: none; cursor: help;" title="Ошибка получения актуальных данных!">⚠️</span>
                    <div class="card-label">Заполняемость (MTD) <button class="btn-refresh-cell" style="float: right; cursor: pointer; color: var(--text-muted); background: none; border: none; outline: none; margin-top: -3px;" onclick="event.stopPropagation(); triggerSyncModule('online', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button></div>
                    <div class="card-value">0</div>
                    <div class="card-subtext">Ср. чеков в раб. день (>2)</div>
                </div>
                <div class="card" onclick="toggleDrilldown('ovn')">
                    <tbody id="drilldown-body">`;

const fixedSection = `<span class="err-icon" style="position: absolute; top: 10px; right: 40px; color: #FFCC00; font-size: 18px; display: none; cursor: help;" title="Ошибка получения актуальных данных!">⚠️</span>
                    <div class="card-label">Качество сервиса (ОВН)</div>
                    <div class="card-value" id="card-ovn-runrate">0%</div>
                    <div class="card-subtext" id="card-ovn-subtext">0 из 0 проверок без замечаний</div>
                </div>
            </div>

            <div id="drilldown" class="drilldown">
                <div style="display:flex; justify-content:space-between; margin-bottom:30px; align-items:center;">
                    <h2 id="drilldown-title" style="font-size:24px; font-weight:700;">Детализация</h2>
                    <button onclick="document.getElementById('drilldown').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <table id="drilldown-table">
                    <thead>
                        <tr>
                            <th>Филиал / Мастер</th>
                            <th>Показатель</th>
                            <th>Тренд</th>
                        </tr>
                    </thead>
                    <tbody id="drilldown-body">`;

html = html.replace(corruptedSectionStart, fixedSection);

// Next, actually replace the ovn-section logic correctly
const ovnSectionRegex = /<div id="ovn-section" class="tab-content">[\s\S]*?<table id="ovn-table">[\s\S]*?<\/div>\s*<\/div>/;

const newOvnSection = `<div id="ovn-section" class="tab-content">
            <!-- DAILY CHECKS (TODAY) -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: var(--card-bg); padding: 20px; border-radius: 20px; border: 1px solid var(--card-border);">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <button class="btn-submit" onclick="openOVNModal()" style="width: auto; padding: 10px 20px; border-radius: 12px; font-size: 14px;">
                        + Новая проверка
                    </button>
                    <button id="adapter-btn" class="btn-refresh" onclick="openAdapterModal()" style="border-radius: 12px; padding: 10px 20px; background: transparent; border: 1px dashed var(--text-muted); color: var(--text-muted); font-size: 14px; display: none;">⚙️ YC Адаптер</button>
                </div>
                <div style="text-align: right">
                   <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Актуально на сегодня</div>
                   <h2 style="font-size: 20px; font-weight: 700; color: #FF9F0A;"><span id="ovn-remaining-count">Осталось проверок: 35</span></h2>
                </div>
            </div>

            <!-- TODAY'S OVN GRID -->
            <div class="ovn-matrix-container" style="padding: 0; overflow: hidden; border-radius: 20px; margin-bottom: 40px;">
                <table id="ovn-today-table">
                    <thead>
                        <tr>
                            <th>Дата просм.</th>
                            <th>Салон</th>
                            <th>Барбер</th>
                            <th>Время</th>
                            <th>Нарушение</th>
                            <th>Работа</th>
                        </tr>
                    </thead>
                    <tbody id="ovn-today-history"></tbody>
                </table>
            </div>

            <!-- JOURNAL HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-top: 40px; border-top: 1px solid #333;">
                <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Журнал видеоконтроля</h2>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                    <select id="ovn-history-preset" onchange="applyOvnPreset()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                        <option value="none">Выберите период</option>
                        <option value="today">Сегодня</option>
                        <option value="yesterday">Вчера</option>
                        <option value="week">Эта неделя</option>
                        <option value="month">Этот месяц</option>
                        <option value="all">Все время</option>
                        <option value="custom">Свои даты</option>
                    </select>
                    
                    <input type="date" id="ovn-history-start" onchange="document.getElementById('ovn-history-preset').value='custom'; renderOvnJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    <span style="color: #666; font-size: 20px;">-</span>
                    <input type="date" id="ovn-history-end" onchange="document.getElementById('ovn-history-preset').value='custom'; renderOvnJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    
                    <select id="ovn-history-loc-filter" onchange="renderOvnJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 160px;">
                        <option value="">Все филиалы</option>
                        <option value="Алексеевская">Алексеевская</option>
                        <option value="Партизанская">Партизанская</option>
                        <option value="Варшавская">Варшавская</option>
                        <option value="Рязанка">Рязанка</option>
                        <option value="Сокол">Сокол</option>
                        <option value="Текстильщики">Текстильщики</option>
                    </select>
                    
                    <select id="ovn-history-master-filter" onchange="renderOvnJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 150px;">
                        <option value="">Все мастера</option>
                    </select>
                </div>
            </div>

            <div class="ovn-matrix-container" id="ovn-history-table-container" style="padding: 0; overflow: hidden; border-radius: 20px; display: none;">
                <table id="ovn-table">
                    <thead>
                        <tr>
                            <th>Дата просм.</th>
                            <th>Салон</th>
                            <th>Барбер</th>
                            <th>Время</th>
                            <th>Нарушение</th>
                            <th>Работа</th>
                        </tr>
                    </thead>
                    <tbody id="ovn-history-list">
                    </tbody>
                </table>
            </div>
        </div>`;

html = html.replace(ovnSectionRegex, newOvnSection);

fs.writeFileSync('index.html', html);
console.log("HTML patched with full new OVN layout");
