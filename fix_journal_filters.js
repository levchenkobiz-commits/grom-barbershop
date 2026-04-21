const fs = require('fs');

let js = fs.readFileSync('mainscript.js', 'utf8');

const regex = /\/\/ 3\. TABLE HISTORY \(Robust filter\)[\s\S]*?document\.getElementById\('lates-history'\)\.innerHTML\s*=\s*latesList\.map\([\s\S]*?\}\)\.join\(''\)\s*\|\|\s*'[^']*';/g;

const replacement = `// 3. TABLE HISTORY DELEGATED
                window.lastOvnRes = ovnRes;
                
                // Populate Masters dropdown once natively
                const masterSelect = document.getElementById('lates-history-master-filter');
                if (masterSelect && masterSelect.options.length <= 1) {
                    let allMasters = [];
                    if (typeof BARBER_ROSTER !== 'undefined') {
                        Object.values(BARBER_ROSTER).forEach(l => allMasters = allMasters.concat(l));
                    }
                    const uniqueMasters = Array.from(new Set(allMasters)).sort((a,b) => a.localeCompare(b));
                    uniqueMasters.forEach(name => {
                        const opt = document.createElement('option');
                        opt.value = name;
                        opt.textContent = name;
                        masterSelect.appendChild(opt);
                    });
                }
                
                if (typeof renderLatesJournal === 'function') {
                    renderLatesJournal();
                }`;

js = js.replace(regex, replacement);

const funcAppendRegex = /async function quickSaveLate/;
const injectedFunctions = `window.applyLatesPreset = function() {
            const preset = document.getElementById('lates-history-preset').value;
            const startEl = document.getElementById('lates-history-start');
            const endEl = document.getElementById('lates-history-end');
            
            if (preset === 'all') {
                startEl.value = '';
                endEl.value = '';
            } else if (preset === 'today') {
                startEl.value = dayjs().format('YYYY-MM-DD');
                endEl.value = dayjs().format('YYYY-MM-DD');
            } else if (preset === 'yesterday') {
                startEl.value = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
                endEl.value = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            } else if (preset === 'week') {
                startEl.value = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
                endEl.value = dayjs().format('YYYY-MM-DD');
            } else if (preset === 'month') {
                startEl.value = dayjs().startOf('month').format('YYYY-MM-DD');
                endEl.value = dayjs().format('YYYY-MM-DD');
            }
            renderLatesJournal();
        };

        window.renderLatesJournal = function() {
            if (!window.lastOvnRes) return;
            const res = window.lastOvnRes;
            
            const presetEl = document.getElementById('lates-history-preset');
            if (presetEl && presetEl.value === 'today' && !document.getElementById('lates-history-start').value) {
                applyLatesPreset();
                return;
            }

            const startD = document.getElementById('lates-history-start').value;
            const endD = document.getElementById('lates-history-end').value;
            const locFilter = document.getElementById('lates-history-loc-filter').value;
            const masterFilter = document.getElementById('lates-history-master-filter').value;
            
            const tbody = document.getElementById('lates-history');
            
            const list = res.filter(r => {
                const rDateStr = r.date || r.createdAt;
                if (!rDateStr) return false;
                
                const recDay = dayjs(rDateStr);
                
                if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
                if (endD && recDay.isAfter(dayjs(endD), 'day')) return false;
                if (locFilter && r.location && r.location !== locFilter && locFilter !== "") return false;
                if (masterFilter && masterFilter !== "" && r.barber !== masterFilter) return false;
                
                if (r.schedTime) return true;
                const v = (r.violation || "").toLowerCase();
                return v !== "замечаний нет" && !v.includes('р—р°рјрµс') && v !== "";
            }).sort((a,b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
            
            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                const isOk = lowV === "замечаний нет" || lowV.includes('р—р°рјрµс') || !lowV;

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
                    <td style="font-size:14px; font-weight:700; color:var(--accent)">\${r.location || '...'}</td>
                    <td style="font-size:14px"><b>\${r.barber || 'Мастер'}</b></td>
                    <td style="font-size:13px; opacity:0.7">\${r.schedTime || '--:--'}</td>
                    <td style="font-size:13px; color:white"><b>\${r.time || '--:--'}</b></td>
                     <td style="font-size:13px; color:\${delayText.includes('+') ? '#FF3B30' : (isOk ? '#34C759' : 'inherit')}"><b>\${delayText}</b></td>
                    <td><span style="display:inline-block; padding:4px 10px; border-radius:8px; font-size:12px; \${badgeStyles}">\${r.violation || (delayText.includes('+') ? 'Опоздал' : (isOk ? 'Ок' : '-'))}</span></td>
                </tr>\`;
            }).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; opacity:0.5">Журнал пуст</td></tr>';
        };

        async function quickSaveLate`;

js = js.replace(funcAppendRegex, injectedFunctions);

fs.writeFileSync('mainscript.js', js);
console.log("Journal Refactor Fixed.");
