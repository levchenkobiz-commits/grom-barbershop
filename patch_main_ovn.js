const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

const regex = /async function loadOVNHistory\(\) \{[\s\S]*?\/\/ 3\. Filter if date is selected[\s\S]*?\}\)\.join\(''\);\s*\} catch\(e\) \{ console\.error\('History load error:', e\); \}/;

const replacement = `async function loadOVNHistory() {
            try {
                const res = await fetch('/api/ovn_files');
                if (!res.ok) throw new Error('fetch error');
                let reports = await res.json();
                reports = reports.reverse();

                window.lastOvnVideoRes = reports;

                // Daily Metrics logic preserved
                let totalMtd = 0; let passed = 0;
                let branchData = {
                    "Алексеевская": { total:0, ok:0, masters:{} },
                    "Варшавская": { total:0, ok:0, masters:{} },
                    "Партизанская": { total:0, ok:0, masters:{} },
                    "Рязанка": { total:0, ok:0, masters:{} },
                    "Сокол": { total:0, ok:0, masters:{} },
                    "Текстильщики": { total:0, ok:0, masters:{} }
                };
                
                const curMonth = dayjs().format('YYYY-MM');
                reports.forEach(r => {
                    const rMonth = dayjs(r.createdAt).format('YYYY-MM');
                    if (rMonth === curMonth) {
                        totalMtd++;
                        const lowV = (r.violation || "").toLowerCase();
                        const isOk = lowV.includes('нет') || lowV.includes('✅');
                        if (isOk) passed++;
                        
                        const loc = r.location || "Неизвестно";
                        if (branchData[loc]) {
                            branchData[loc].total++;
                            if (isOk) branchData[loc].ok++;
                            
                            const b = r.barber || "Неизвестно";
                            if (!branchData[loc].masters[b]) branchData[loc].masters[b] = { total:0, ok:0 };
                            branchData[loc].masters[b].total++;
                            if (isOk) branchData[loc].masters[b].ok++;
                        }
                    }
                });
                
                window.ovnRunrate = totalMtd > 0 ? (passed / totalMtd) * 100 : 0;
                const ovnPerc = window.ovnRunrate.toFixed(0);
                
                window.ovnDrilldown = Object.keys(branchData).map(loc => {
                    const bD = branchData[loc];
                    const rate = bD.total > 0 ? ((bD.ok / bD.total)*100).toFixed(0) : 0;
                    let eLoc = loc;
                    if (eLoc === 'Алексеевская') eLoc = 'Алексеевская Ⓜ️';
                    if (eLoc === 'Варшавская') eLoc = 'Варшавская Ⓜ️';
                    if (eLoc === 'Партизанская') eLoc = 'Партизанская Ⓜ️';
                    return {
                        name: eLoc,
                        value: \`\${rate}% (\${bD.ok}/\${bD.total})\`,
                        trend: rate >= 80 ? 'up' : 'down',
                        masters: Object.keys(bD.masters).sort().map(m => {
                            const mD = bD.masters[m];
                            const mRate = mD.total > 0 ? ((mD.ok / mD.total)*100).toFixed(0) : 0;
                            return { name: m, v: \`\${mRate}% (\${mD.ok} из \${mD.total})\` };
                        })
                    };
                });
                
                const cardVal = document.getElementById('card-ovn-runrate');
                const cardSub = document.getElementById('card-ovn-subtext');
                if(cardVal) cardVal.innerText = ovnPerc + '%';
                if(cardSub) cardSub.innerText = \`\${passed} из \${totalMtd} без замечаний\`;

                if (window.USER && window.USER.role === 'master') {
                    const myName = window.USER.name;
                    const myOvn = reports.filter(r => r.barber === myName);
                    if (myOvn.length > 0) {
                        const successCount = myOvn.filter(r => {
                            const lowV = (r.violation || "").toLowerCase();
                            return lowV.includes('нет') || lowV.includes('✅');
                        }).length;
                        const score = (successCount / myOvn.length) * 100;
                        const scoreEl = document.getElementById('master-ovn-score');
                        if (scoreEl) {
                            scoreEl.innerText = score.toFixed(0) + '%';
                            scoreEl.style.color = score >= 80 ? '#34C759' : '#ff4444';
                        }
                    } else {
                        const scoreEl = document.getElementById('master-ovn-score');
                        if(scoreEl) {
                            scoreEl.innerText = 'Нет данных';
                            scoreEl.style.color = '#fff';
                        }
                    }
                }

                // --- 2. DISPLAY TODAY'S CHECKS ---
                const todayStr = dayjs().format('YYYY-MM-DD');
                const todayReports = reports.filter(r => dayjs(r.createdAt).format('YYYY-MM-DD') === todayStr);
                const checksCount = todayReports.length;
                const targetChecks = 35;
                const remaining = Math.max(0, targetChecks - checksCount);
                
                const counterEl = document.getElementById('ovn-remaining-count');
                if (counterEl) {
                    if (remaining > 0) {
                        counterEl.innerText = \`Осталось проверок: \${remaining}\`;
                        counterEl.style.color = "#FF9F0A";
                    } else {
                        counterEl.innerText = \`Проверки завершены ✅\`;
                        counterEl.style.color = "#34C759";
                    }
                }

                const renderRow = (r) => {
                    const lowV = (r.violation || "").toLowerCase();
                    let badgeClass = 'badge-no';
                    if (lowV.includes('нет') || lowV.includes('✅')) badgeClass = 'badge-yes';

                    const matchVal = (r.match || "").trim() === 'да';
                    const matchTag = matchVal 
                        ? \`<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>\`
                        : \`<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>\`;

                    return \`<tr>
                        <td style="font-size:11px; white-space:nowrap; opacity:0.8">
                            \${dayjs(r.createdAt).format('HH:mm DD.MM')}
                            \${dayjs(r.createdAt).format('YYYY-MM-DD') === todayStr ? '<span style="color:var(--accent); margin-left:3px">●</span>' : ''}
                        </td>
                        <td style="font-size:13px; font-weight:700; color:var(--accent)">\${r.location}</td>
                        <td style="font-size:14px"><b>\${r.barber}</b></td>
                        <td style="font-size:13px; opacity:0.7">
                            \${dayjs(r.date || "").format('DD.MM')} \${r.time || ""} 
                            \${matchTag}
                        </td>
                        <td><span class="badge-status \${badgeClass}">\${r.violation}</span></td>
                        <td style="font-size:12px; opacity:0.7">\${r.notes || '-'}</td>
                    </tr>\`;
                };

                const tblToday = document.getElementById('ovn-today-history');
                if (tblToday) {
                    tblToday.innerHTML = todayReports.length ? todayReports.map(renderRow).join('') : '<tr><td colspan="6" style="text-align:center; padding:40px; opacity:0.5">Сегодня проверок еще не было</td></tr>';
                }

                // --- 3. JOURNAL DROPDOWN SETUP ---
                const masterSelect = document.getElementById('ovn-history-master-filter');
                if (masterSelect && masterSelect.options.length <= 1) {
                    let allMasters = [];
                    if (typeof BARBER_ROSTER !== 'undefined') {
                        Object.values(BARBER_ROSTER).forEach(l => allMasters = allMasters.concat(l));
                    }
                    const uniqueMasters = Array.from(new Set(allMasters)).sort((a,b) => a.localeCompare(b));
                    uniqueMasters.forEach(name => {
                        const opt = document.createElement('option');
                        opt.value = name; opt.textContent = name;
                        masterSelect.appendChild(opt);
                    });
                }

                if (typeof renderOvnJournal === 'function') {
                    renderOvnJournal();
                }

            } catch(e) { console.error('History load error:', e); }`;


const appendRegex = /async function loadData\(\)/;
const ovnJournalFuncs = `window.applyOvnPreset = function() {
            const preset = document.getElementById('ovn-history-preset').value;
            const startEl = document.getElementById('ovn-history-start');
            const endEl = document.getElementById('ovn-history-end');
            
            if (preset === 'none' || preset === 'all') {
                startEl.value = ''; endEl.value = '';
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
            renderOvnJournal();
        };

        window.renderOvnJournal = function() {
            if (!window.lastOvnVideoRes) return;
            const res = window.lastOvnVideoRes;
            
            const startD = document.getElementById('ovn-history-start').value;
            const endD = document.getElementById('ovn-history-end').value;
            const locFilter = document.getElementById('ovn-history-loc-filter').value;
            const masterFilter = document.getElementById('ovn-history-master-filter').value;
            
            const tbody = document.getElementById('ovn-history-list');
            const tableContainer = document.getElementById('ovn-history-table-container');

            if (!startD && !endD && !locFilter && !masterFilter && document.getElementById('ovn-history-preset').value === 'none') {
                tableContainer.style.display = 'none';
                return;
            } else {
                tableContainer.style.display = 'block';
            }
            
            const list = res.filter(r => {
                const rDateStr = r.createdAt;
                if (!rDateStr) return false;
                
                const recDay = dayjs(rDateStr);
                
                if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
                if (endD && recDay.isAfter(dayjs(endD), 'day')) return false;
                if (locFilter && r.location && r.location !== locFilter && locFilter !== "") return false;
                if (masterFilter && masterFilter !== "" && r.barber !== masterFilter) return false;
                
                return true;
            }).sort((a,b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
            
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; opacity:0.5">В этом периоде нет записей</td></tr>';
                return;
            }

            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                let badgeClass = 'badge-no';
                if (lowV.includes('нет') || lowV.includes('✅')) badgeClass = 'badge-yes';

                const matchVal = (r.match || "").trim() === 'да';
                const matchTag = matchVal 
                    ? \`<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>\`
                    : \`<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>\`;

                return \`<tr>
                    <td style="font-size:11px; white-space:nowrap; opacity:0.8">
                        \${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        \${dayjs(r.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? '<span style="color:var(--accent); margin-left:3px">●</span>' : ''}
                    </td>
                    <td style="font-size:13px; font-weight:700; color:var(--accent)">\${r.location}</td>
                    <td style="font-size:14px"><b>\${r.barber}</b></td>
                    <td style="font-size:13px; opacity:0.7">
                        \${dayjs(r.date || "").format('DD.MM')} \${r.time || ""} 
                        \${matchTag}
                    </td>
                    <td><span class="badge-status \${badgeClass}">\${r.violation}</span></td>
                    <td style="font-size:12px; opacity:0.7">\${r.notes || '-'}</td>
                </tr>\`;
            }).join('');
        };

        async function loadData()`;


js = js.replace(regex, replacement);
js = js.replace(appendRegex, ovnJournalFuncs);

fs.writeFileSync('mainscript.js', js);
console.log("OVN Refactor Applied in JS");
