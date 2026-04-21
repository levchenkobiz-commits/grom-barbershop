const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let start = html.indexOf('<!-- CALENDAR & DAILY AUDIT -->');
let end = html.indexOf('<div id="schedule-section" class="tab-content">');

if (start > -1 && end > -1) {
    let replacement = `<!-- CALENDAR & DAILY AUDIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: var(--card-bg); padding: 20px; border-radius: 20px; border: 1px solid var(--card-border);">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div>
                        <label style="display:block; margin-bottom:8px">Локация (Сегодня)</label>
                        <select id="lates-audit-loc" onchange="loadLatesHistory()" style="width: 200px; padding: 10px; background: var(--card-bg); color: #fff; border: 1px solid var(--card-border); border-radius: 8px;">
                            <option value="Алексеевская">Алексеевская</option>
                            <option value="Партизанская">Партизанская</option>
                            <option value="Варшавская">Варшавская</option>
                        </select>
                    </div>
                </div>
                <div style="text-align: right">
                   <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Актуально на сегодня</div>
                   <h2 style="font-size: 20px; font-weight: 700; color: #FF9F0A;"><span id="lates-remaining-count">...</span></h2>
                </div>
            </div>

            <!-- WORKFORCE AUDIT GRID (Linked to Schedule) -->
            <div id="lates-workforce-audit" style="margin-bottom: 40px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                <!-- Filled dynamically from Schedule -->
            </div>

            <!-- JOURNAL HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-top: 40px; border-top: 1px solid #333;">
                <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Журнал опозданий</h2>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                    <input type="date" id="lates-history-start" onchange="renderLatesJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    <span style="color: #666; font-size: 20px;">-</span>
                    <input type="date" id="lates-history-end" onchange="renderLatesJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    
                    <select id="lates-history-loc-filter" onchange="renderLatesJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 160px;">
                        <option value="">Все филиалы</option>
                        <option value="Алексеевская">Алексеевская</option>
                        <option value="Партизанская">Партизанская</option>
                        <option value="Варшавская">Варшавская</option>
                        <option value="Рязанка">Рязанка</option>
                        <option value="Сокол">Сокол</option>
                        <option value="Текстильщики">Текстильщики</option>
                    </select>
                    
                    <input type="text" id="lates-history-master-filter" placeholder="Имя мастера" onkeyup="renderLatesJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 150px;">
                </div>
            </div>

            <div class="ovn-matrix-container" style="padding: 0; overflow: hidden; border-radius: 20px;">
                <table id="lates-table">
                    <thead>
                        <tr>
                            <th style="padding-left:25px">Дата / Время</th>
                            <th>Локация</th>
                            <th>Мастер</th>
                            <th>График</th>
                            <th>Приход</th>
                            <th>Задержка</th>
                            <th>Нарушение</th>
                        </tr>
                    </thead>
                    <tbody id="lates-history"></tbody>
                </table>
            </div>\n        </div>\n\n        `;
    html = html.substring(0, start) + replacement + html.substring(end);
    fs.writeFileSync('index.html', html);
    console.log("Successfully replaced index.html");
} else {
    console.error("Tags not found");
}

