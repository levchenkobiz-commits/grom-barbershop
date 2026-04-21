const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

const tabsStart = '<div class="tabs">';
const tabsEndTag = '</div>'; // This might be ambiguous

// Better: find the buttons and the following div
const buttonsStart = '<button class="tab-btn active"';
const managerStart = '<div id="manager-section"';

const headerMarker = '</header>';
const managerMarker = '<div id="manager-section"';

const headerIdx = content.indexOf(headerMarker) + headerMarker.length;
const managerIdx = content.indexOf(managerMarker);

const head = content.substring(0, headerIdx);
const tail = content.substring(managerIdx);

const correctCenter = `
        <div class="tabs">
            <button class="tab-btn active" id="tab-analytics" onclick="switchTab('analytics', this)">Аналитика</button>
            <button class="tab-btn" id="tab-master" onclick="switchTab('master-cabinet', this)">Кабинет мастера</button>
            <button class="tab-btn" id="tab-ovn" onclick="switchTab('ovn', this)">Видеоконтроль (ОВН)</button>
            <button class="tab-btn" id="tab-lates" onclick="switchTab('lates', this)">ОПОЗДАНИЯ</button>
            <button class="tab-btn" id="tab-manager" onclick="switchTab('manager', this)">Кабинет менеджера</button>
            <button class="tab-btn" id="tab-schedule" onclick="switchTab('schedule', this)">ГРАФИК</button>
        </div>

        <div id="analytics-section" class="tab-content active">
            <h1 class="section-title">Аналитика сети</h1>
            <div class="analytics-wrapper">
                <div class="metrics-grid">
                    <div class="card analytic-card" onclick="toggleDrilldown('revenue')">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                            <button class="btn-refresh-cell" onclick="event.stopPropagation(); triggerSyncModule('finance', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button>
                        </div>
                        <div class="card-label">Рост квартала (YoY)</div>
                        <div class="card-value">+0%</div>
                        <div class="card-subtext">Загрузка...</div>
                    </div>
                    <div class="card analytic-card" onclick="toggleDrilldown('returns')">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                            <button class="btn-refresh-cell" onclick="event.stopPropagation(); triggerSyncModule('clients', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button>
                        </div>
                        <div class="card-label">Return Rate (90d)</div>
                        <div class="card-value">0%</div>
                        <div class="card-subtext">LTV прогноз: расчет...</div>
                    </div>
                    <div class="card analytic-card" onclick="toggleDrilldown('intervals')">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                            <button class="btn-refresh-cell" onclick="event.stopPropagation(); triggerSyncModule('clients', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button>
                        </div>
                        <div class="card-label">Цикл визита (ср.)</div>
                        <div class="card-value">0д</div>
                        <div class="card-subtext">Дней между стрижками</div>
                    </div>
                    <div class="card analytic-card" onclick="toggleDrilldown('revenue')">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                            <button class="btn-refresh-cell" onclick="event.stopPropagation(); triggerSyncModule('finance', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button>
                        </div>
                        <div class="card-label">Выручка сегодня</div>
                        <div class="card-value">0 ₽</div>
                        <div class="card-subtext">Чистая (без бонусов)</div>
                    </div>
                    <div class="card analytic-card" onclick="toggleDrilldown('appointments')">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                            <button class="btn-refresh-cell" onclick="event.stopPropagation(); triggerSyncModule('online', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button>
                        </div>
                        <div class="card-label">Доля онл-записей (MTD)</div>
                        <div class="card-value">0%</div>
                        <div class="card-subtext">Записи от общего числа услуг</div>
                    </div>
                    <div class="card analytic-card" onclick="toggleDrilldown('occupancy')">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                            <button class="btn-refresh-cell" onclick="event.stopPropagation(); triggerSyncModule('online', this)" title="Обновить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg></button>
                        </div>
                        <div class="card-label">Заполняемость (MTD)</div>
                        <div class="card-value">0</div>
                        <div class="card-subtext">Ср. чеков в раб. день (>2)</div>
                    </div>
                    <div class="card analytic-card">
                        <div class="card-icons">
                            <span class="err-icon" title="Ошибка получения актуальных данных!">⚠️</span>
                        </div>
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
                        <tbody id="drilldown-body">
                            <!-- Data rows here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="master-cabinet-section" class="tab-content">
            <h1 class="section-title">Кабинет мастера (<span id="dynamic-master-name">Имя</span>)</h1>
            <div id="master-zone-container" style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px; background: var(--card-bg); padding: 15px 25px; border-radius: 20px; border: 1px solid var(--card-border);">
                <div style="font-size: 16px; font-weight: 700;">Текущая зона:</div>
                <div id="master-zone-badge" style="padding: 6px 14px; border-radius: 12px; font-weight: 800; font-size: 14px; background: rgba(52, 199, 89, 0.15); color: #34C759;">
                    🟢 ЗЕЛЕНАЯ
                </div>
                <div class="tooltip-wrapper" style="position: relative; display: inline-block; cursor: help;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #333; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">?</div>
                    <div class="tooltip-text" style="display: none; position: absolute; top: 30px; left: 0; width: 350px; background: #222; border: 1px solid var(--accent); padding: 15px; border-radius: 12px; font-size: 12px; color: #ccc; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        <b>Зеленая:</b> по умолчанию. <br>
                        <b>Желтая:</b> > 9 нарушений в неделю. <span style="color:#FF9F0A">Штраф за 1 самое частое нарушение.</span> Возврат в зеленую, если <= 9. <br>
                        <b>Красная:</b> > 9 нарушений в желтой зоне (или >= 14 в зеленой). <span style="color:#FF3B30">Штраф за ВСЕ нарушения.</span> Возврат в зеленую, если <= 9.<br>
                        <i style="color:#aaa; display:block; margin-top:8px;">* Опоздания, невыход и воровство/неоплата штрафуются <b>всегда</b> (в любой зоне).</i>
                    </div>
                </div>
                <div style="margin-left: auto; display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="font-size: 14px; color: var(--text-muted);">Нарушения (нед): <strong id="master-week-violations" style="color: #fff; font-size: 16px;">0</strong></div>
                    <div style="font-size: 14px; color: var(--text-muted);">Сумма штрафов (мес): <strong id="master-total-fines" style="color: #FF3B30; font-size: 16px;">0 ₽</strong></div>
                    <button class="btn-refresh" onclick="openSalaryModal(false)" style="padding: 4px 12px; font-size: 12px; border-radius: 8px; border: 1px solid #FF9F0A; color: #FF9F0A;">💰 Моя Зарплата</button>
                </div>
            </div>
        </div>

        <div id="ovn-section" class="tab-content">
            <h1 class="section-title">Видеоконтроль (ОВН)</h1>
            <div id="ovn-content"></div>
        </div>

        <div id="lates-section" class="tab-content">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h1 class="section-title" style="margin: 0;">Журнал опозданий</h1>
                <div id="lates-nav" style="display: flex; gap: 10px; align-items: center; background: var(--card-bg); padding: 5px 15px; border-radius: 12px; border: 1px solid var(--card-border);">
                    <button onclick="changeLatesDate(-1)" class="btn-refresh" style="padding: 5px 10px;">←</button>
                    <span id="lates-current-date" style="font-weight: 700; color: var(--accent); min-width: 100px; text-align: center;">...</span>
                    <button onclick="changeLatesDate(1)" class="btn-refresh" style="padding: 5px 10px;">→</button>
                </div>
            </div>
            <div class="ovn-matrix-container" style="padding: 0; overflow: hidden; border-radius: 20px;">
                <table id="lates-table" class="journal-table">
                    <thead>
                        <tr>
                            <th>Время</th>
                            <th>Филиал</th>
                            <th>Мастер</th>
                            <th>Опоздание</th>
                            <th>Штраф</th>
                        </tr>
                    </thead>
                    <tbody id="lates-table-body">
                        <!-- Entries added here by script -->
                    </tbody>
                </table>
            </div>
        </div>
`;

fs.writeFileSync(file, head + correctCenter + tail);
console.log("Full restoration complete.");
