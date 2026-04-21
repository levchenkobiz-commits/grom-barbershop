const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// HTML Replacements
const oldLatesHeaderRegex = /<div style="display: flex; gap: 20px; align-items: center;">\s*<div>\s*<label style="display:block; margin-bottom:8px">Дата аудита<\/label>\s*<input type="date" id="lates-audit-date"[^>]*>\s*<\/div>/g;

html = html.replace(oldLatesHeaderRegex, `<div style="display: flex; gap: 20px; align-items: center;">`);

html = html.replace('<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Статус на <span id="lates-current-view-date">...</span></div>', '<div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Актуально на сегодня</div>');

const newHistoryHeader = `
            <!-- JOURNAL HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-top: 40px; border-top: 1px solid #333;">
                <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Журнал опозданий</h2>
                <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                    <input type="date" id="lates-history-start" onchange="renderLatesJournal()" style="background: var(--card-bg); color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    <span style="color: #666; font-size: 20px;">-</span>
                    <input type="date" id="lates-history-end" onchange="renderLatesJournal()" style="background: var(--card-bg); color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 140px;">
                    
                    <select id="lates-history-loc-filter" onchange="renderLatesJournal()" style="background: var(--card-bg); color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 160px; margin-left: 10px;">
                        <option value="">Все филиалы</option>
                        <option value="Алексеевская">Алексеевская</option>
                        <option value="Партизанская">Партизанская</option>
                        <option value="Варшавская">Варшавская</option>
                        <option value="Рязанский">Рязанcкий</option>
                        <option value="Сокол">Сокол</option>
                        <option value="Текстильщики">Текстильщики</option>
                    </select>
                    
                    <input type="text" id="lates-history-master-filter" placeholder="Имя мастера" onkeyup="renderLatesJournal()" style="background: #000; color: #fff; border: 1px solid var(--card-border); padding: 10px; border-radius: 12px; width: 150px;">
                </div>
            </div>

            <div class="ovn-matrix-container" style="padding: 0; overflow: hidden; border-radius: 20px;">`;

html = html.replace('<div class="ovn-matrix-container" style="padding: 0; overflow: hidden; border-radius: 20px;">\n                <table id="lates-table">', newHistoryHeader + '\n                <table id="lates-table">');

fs.writeFileSync('index.html', html);


let js = fs.readFileSync('mainscript.js', 'utf8');

const jsOldLoadLates = /const date = document.getElementById\('lates-audit-date'\).value \|\| dayjs\(\).format\('YYYY-MM-DD'\);\s*const loc = document.getElementById\('lates-audit-loc'\).value \|\| "Алексеевская";\s*document.getElementById\('lates-current-view-date'\)\.innerText = dayjs\(date\)\.format\('DD\.MM\.YYYY'\);/g;

js = js.replace(jsOldLoadLates, `const date = dayjs().format('YYYY-MM-DD');
                const loc = document.getElementById('lates-audit-loc').value || "Алексеевская";
                window.lastOvnRes = ovnRes;`);


const historyTableBlockRegex = /\/\/ 3\. TABLE HISTORY \(Robust filter\)[\s\S]*?<\/td>[\s\S]*?<\/tr>`\s*;\s*}\)\.join\(''\);\s*}/g;

const newHistoryFunc = `// 3. Trigger Journal Render
                renderLatesJournal();
            } catch(e) {
                console.error("Ошибка Lates History:", e);
            }
        }
        
        window.renderLatesJournal = function() {
            if (!window.lastOvnRes) return;
            const res = window.lastOvnRes;
            
            const startD = document.getElementById('lates-history-start').value;
            const endD = document.getElementById('lates-history-end').value;
            const locFilter = document.getElementById('lates-history-loc-filter').value;
            const masterFilter = document.getElementById('lates-history-master-filter').value.toLowerCase().trim();
            
            const tbody = document.getElementById('lates-history');
            
            const list = res.filter(r => {
                const rDateStr = r.date || r.createdAt;
                if (!rDateStr) return false;
                
                const recDay = dayjs(rDateStr);
                
                if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
                if (endD && recDay.isAfter(dayjs(endD), 'day')) return false;
                if (locFilter && r.location !== locFilter && locFilter !== "") return false;
                if (masterFilter && (!r.barber || !r.barber.toLowerCase().includes(masterFilter))) return false;
                
                if (r.schedTime) return true;
                const v = (r.violation || "").toLowerCase();
                return v !== "замечаний нет" && !v.includes('р—р°рјрµс') && v !== "";
            }).sort((a,b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
            
            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                let badgeStyles = 'background: rgba(255,255,255,0.05); color: #888;';
                if (lowV.includes('согласованное') || lowV.includes('рїрѕрґс‚рі')) badgeStyles = 'background: rgba(52,199,89,0.1); color: #34C759;';
                else if (lowV.includes('опоздал') || lowV.includes('рѕрїрѕр·рґ') || (r.schedTime && r.time > r.schedTime)) {
                     badgeStyles = 'background: rgba(255,59,48,0.1); color: #FF3B30; font-weight:700;';
                }

                let delayText = '-';
                if (r.schedTime && r.time) {
                    const diff = dayjs(\`2000-01-01 \${r.time}\`).diff(dayjs(\`2000-01-01 \${r.schedTime}\`), 'minute');
                    if (diff > 0) delayText = \`+\${diff} мин\`;
                    else if (diff < 0) delayText = \`\${Math.abs(diff)} мин раньше\`;
                    else delayText = 'вовремя';
                }

                return \`
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.01); height: 50px;">
                    <td style="font-size:11px; white-space:nowrap; opacity:0.6; padding-left:25px">\${dayjs(r.date || r.createdAt || new Date()).format('DD.MM HH:mm')}</td>
                    <td style="font-size:12px; font-weight:600; color:var(--accent)">\${r.location || '-'}</td>
                    <td style="font-size:13px; font-weight:700">\${r.barber || '-'}</td>
                    <td style="font-size:12px; opacity:0.7">\${r.schedTime || '--:--'}</td>
                    <td style="font-size:13px; font-weight:600">\${r.time || '-'}</td>
                    <td style="font-size:12px; font-weight:600; color: \${delayText.includes('+') ? '#FF3B30' : (delayText.includes('раньше') ? '#34C759' : '#888')}">\${delayText}</td>
                    <td><span style="font-size:10px; padding:4px 8px; border-radius:4px; \${badgeStyles}">\${r.violation || 'Аудит без нарушений'}</span></td>
                </tr>\`;
            }).join('');
        }`;

js = js.replace(historyTableBlockRegex, newHistoryFunc);
fs.writeFileSync('mainscript.js', js);
console.log("Refactored layout!");
