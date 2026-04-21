const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Precise CSS Block Fix
const cssStartMarker = '.tooltip-wrapper:hover .tooltip-text { display: block !important; }';
const cssEndMarker = '.sched-cell { ';

const fullCorrectCSS = `.tooltip-wrapper:hover .tooltip-text { display: block !important; }
        .analytic-card { position: relative; }
        .card-icons {
            position: absolute; top: 12px; right: 12px;
            display: flex; gap: 8px; align-items: center; z-index: 5;
        }
        .btn-refresh-cell { 
            cursor: pointer; color: var(--text-muted); background: none; 
            border: none; outline: none; padding: 4px; border-radius: 6px;
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .btn-refresh-cell:hover { background: rgba(255,255,255,0.05); color: var(--accent); }
        .err-icon { color: #FFCC00; font-size: 16px; cursor: help; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 10px; }

        /* Schedule Grid Styles */
        .sched-table-wrapper { 
            width: 100%; overflow-x: auto; background: var(--card-bg); 
            backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); border-radius: 20px; border: 1px solid var(--card-border);
            margin-top: 20px;
        }
        .sched-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .sched-table th, .sched-table td { 
            border: 1px solid rgba(255,255,255,0.05); 
            padding: 8px 6px; text-align: center; min-width: 90px;
            white-space: normal;
            word-wrap: break-word;
            line-height: 1.3;
        }
        .sched-table th { background: rgba(255,255,255,0.02); font-weight: 700; color: var(--text-muted); }
        .sched-table tr.loc-header td { 
            background: rgba(30, 215, 96, 0.05); color: var(--accent); 
            font-weight: 800; text-align: left; padding-left: 20px;
            font-size: 14px; border-top: 2px solid rgba(30,215,96,0.2);
        }
        .sched-cell { `;

if (content.includes(cssStartMarker) && content.includes(cssEndMarker)) {
    const startIdx = content.indexOf(cssStartMarker);
    const endIdx = content.indexOf(cssEndMarker);
    content = content.substring(0, startIdx) + fullCorrectCSS + content.substring(endIdx + cssEndMarker.length);
    console.log("Restored CSS Block perfectly.");
}

// 2. Analytic Cards Final Polish
const metricsGridStart = '<div class="metrics-grid">';
const metricsGridEnd = '<div id="drilldown"';

const fullCorrectMetricsContent = `<div class="metrics-grid">
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
            </div>
            `;

if (content.includes(metricsGridStart) && content.includes(metricsGridEnd)) {
    const mStartIdx = content.indexOf(metricsGridStart);
    const mEndIdx = content.indexOf(metricsGridEnd);
    content = content.substring(0, mStartIdx) + fullCorrectMetricsContent + content.substring(mEndIdx);
    console.log("Restored Metrics Grid perfectly.");
}

fs.writeFileSync(file, content);
console.log("Done.");
