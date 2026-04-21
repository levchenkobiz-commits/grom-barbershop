const fs = require('fs');

// Patch index.html
let html = fs.readFileSync('index.html', 'utf8');

const regexOptionsObj = /<select id="ovn-history-preset"[\s\S]*?<\/select>/;

let updatedSelect = `<select id="ovn-history-preset" onchange="applyOvnPreset()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                        <option value="none">Выберите период</option>
                        <option value="today">Сегодня</option>
                        <option value="yesterday">Вчера</option>
                        <option value="week">Эта неделя</option>
                        <option value="month">Этот месяц</option>
                        <option value="all">Все время</option>
                        <option value="custom">Свои даты</option>
                    </select>
                    
                    <button onclick="shiftOvnDate(-1)" title="Предыдущий день" style="background:#000; border:1px solid var(--card-border); color:#fff; border-radius:12px; padding:10px 15px; cursor:pointer;">&larr;</button>`;

const regexEndDate = /<input type="date" id="ovn-history-end"[\s\S]*?>/;

let updatedEndDate = `<input type="date" id="ovn-history-end" onchange="document.getElementById('ovn-history-preset').value='custom'; renderOvnJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    <button onclick="shiftOvnDate(1)" title="Следующий день" style="background:#000; border:1px solid var(--card-border); color:#fff; border-radius:12px; padding:10px 15px; cursor:pointer;">&rarr;</button>`;

html = html.replace(regexOptionsObj, updatedSelect);
html = html.replace(regexEndDate, updatedEndDate);

fs.writeFileSync('index.html', html);

// Patch mainscript.js
let js = fs.readFileSync('mainscript.js', 'utf8');

const shiftDateFunc = `
        window.shiftOvnDate = function(days) {
            const startEl = document.getElementById('ovn-history-start');
            const endEl = document.getElementById('ovn-history-end');
            const presetEl = document.getElementById('ovn-history-preset');
            
            let baseDate = startEl.value ? dayjs(startEl.value) : dayjs();
            
            let newDate = baseDate.add(days, 'day').format('YYYY-MM-DD');
            startEl.value = newDate;
            endEl.value = newDate;
            presetEl.value = 'custom';
            
            renderOvnJournal();
        };

        window.renderOvnJournal = function() {`;

js = js.replace(/window\.renderOvnJournal = function\(\) \{/, shiftDateFunc);
fs.writeFileSync('mainscript.js', js);

console.log("Nav arrows added");
