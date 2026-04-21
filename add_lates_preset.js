const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const searchHtml = `<input type="date" id="lates-history-start" onchange="renderLatesJournal()"`;
const replaceHtml = `<select id="lates-history-preset" onchange="applyLatesPreset()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                        <option value="today">Сегодня</option>
                        <option value="week">Эта неделя</option>
                        <option value="month">Этот месяц</option>
                        <option value="all">Все время</option>
                        <option value="custom">Свои даты</option>
                    </select>
                    <input type="date" id="lates-history-start" onchange="document.getElementById('lates-history-preset').value='custom'; renderLatesJournal()"`;

html = html.replace(searchHtml, replaceHtml);
html = html.replace(`<input type="date" id="lates-history-end" onchange="renderLatesJournal()"`, `<input type="date" id="lates-history-end" onchange="document.getElementById('lates-history-preset').value='custom'; renderLatesJournal()"`);

fs.writeFileSync('index.html', html);


let js = fs.readFileSync('mainscript.js', 'utf8');

const jsInjectPoint = `window.renderLatesJournal = function() {`;
const jsInjectContent = `window.applyLatesPreset = function() {
            const preset = document.getElementById('lates-history-preset').value;
            const startEl = document.getElementById('lates-history-start');
            const endEl = document.getElementById('lates-history-end');
            
            if (preset === 'all') {
                startEl.value = '';
                endEl.value = '';
            } else if (preset === 'today') {
                startEl.value = dayjs().format('YYYY-MM-DD');
                endEl.value = dayjs().format('YYYY-MM-DD');
            } else if (preset === 'week') {
                startEl.value = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
                endEl.value = dayjs().format('YYYY-MM-DD');
            } else if (preset === 'month') {
                startEl.value = dayjs().startOf('month').format('YYYY-MM-DD');
                endEl.value = dayjs().format('YYYY-MM-DD');
            }
            renderLatesJournal();
        };

        window.renderLatesJournal = function() {`;

js = js.replace(jsInjectPoint, jsInjectContent);

// Add initial trigger inside loadLatesHistory to default to "today" correctly visually
const initReplaceSearch = `// 3. Trigger Journal Render
                renderLatesJournal();`;
const initReplace = `// 3. Trigger Journal Render
                applyLatesPreset(); // will trigger renderLatesJournal`;

js = js.replace(initReplaceSearch, initReplace);

fs.writeFileSync('mainscript.js', js);
console.log("Added date presets");
