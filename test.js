
        const LOCATIONS = Object.keys(ADAPTER);
        const BARBER_ROSTER = {};
        LOCATIONS.forEach(loc => {
            BARBER_ROSTER[loc] = ADAPTER[loc].masters.map(m => m.dash);
        });

        document.addEventListener('DOMContentLoaded', () => {
            // Populate Location Dropdowns from ADAPTER
            const ovnLocSelect = document.getElementById('ovn-location');
            const latesLocSelect = document.getElementById('lates-audit-loc');
            
            if (ovnLocSelect) {
                ovnLocSelect.innerHTML = '<option value="">Выберите...</option>';
                LOCATIONS.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc;
                    opt.textContent = loc;
                    ovnLocSelect.appendChild(opt);
                });
            }
            
            if (latesLocSelect) {
                latesLocSelect.innerHTML = '';
                LOCATIONS.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc;
                    opt.textContent = loc;
                    latesLocSelect.appendChild(opt);
                });
            }
        });
        
        function renderData(data) {
            try {
                let nowStr = data.lastUpdate;
                if (!nowStr) nowStr = dayjs().format("HH:mm DD.MM.YYYY");
                const now = dayjs(nowStr, "HH:mm DD.MM.YYYY");

                let startStr = "Начало кв.";
                let endStr = "----";
                try {
                    endStr = now.format('DD.MM');
                    startStr = now.startOf('quarter').format('DD.MM');
                } catch(e) {
                    console.error("dayjs format error:", e);
                }

                if (data.revenue) {
                    try {
                        const revCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(1)');
                        const growthVal = data.revenue.growth || 0;
                        revCard.querySelector('.card-value').innerText = (growthVal >= 0 ? '+' : '') + growthVal + '%';
                        const curRev = data.revenue.current ? data.revenue.current.toLocaleString() : "0";
                        const prevRev = data.revenue.previous ? data.revenue.previous.toLocaleString() : "0";
                        revCard.querySelector('.card-subtext').innerText = `${startStr}-${endStr} (${curRev} vs ${prevRev} ₽)`;
                    } catch(e) {}
                    
                    try {
                        const pCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(4) .card-value');
                        if (pCard) pCard.innerText = (data.revenue.today || 0).toLocaleString() + ' ₽';
                    } catch(e) {}
                }
                
                if (data.returnRate) {
                    try {
                        const rrCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(2)');
                        rrCard.querySelector('.card-value').innerText = (data.returnRate.value || 0) + '%';
                        if (data.returnRate.drilldown && data.returnRate.drilldown[0]) {
                            rrCard.querySelector('.card-subtext').innerText = data.returnRate.drilldown[0].value;
                        } else {
                            rrCard.querySelector('.card-subtext').innerText = "Когорта 64-32 дня";
                        }
                    } catch(e) {}
                }
                
                if (data.cycle) {
                    try {
                        const cycleCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(3) .card-value');
                        if (cycleCard) cycleCard.innerText = (data.cycle.value || 0) + 'д';
                    } catch(e) {}
                }
                
                if (data.appointments) {
                    try {
                        const apptCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(5) .card-value');
                        if (apptCard) apptCard.innerText = (data.appointments.percentage || 0) + '%';
                    } catch(e) {}
                }

                if (data.occupancy) {
                    try {
                        const occCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(6) .card-value');
                        if (occCard) occCard.innerText = (data.occupancy.value || 0);
                    } catch(e) {}
                }

                // Always render Master Cabinet mock for showcase
                try {
                    updateMasterCabinet(data);
                } catch(e) {}
                window.DASH_DATA = data;
            } catch(e) {
                console.error("renderData general error:", e);
            }
        }

        async function updateMasterCabinet(data) {
            const myName = "Шохназар Д."; // Mock for now per user request
            
            // Occupancy
            let myOcc = '0';
            if (data.occupancy && data.occupancy.drilldown[0]) {
                const occObj = data.occupancy.drilldown[0].masters.find(m => m.name === myName);
                if (occObj) myOcc = occObj.v;
            }
            document.getElementById('master-occupancy').innerText = myOcc;
            
            // Return Rate
            let myRr = 0;
            if (data.returnRate && data.returnRate.drilldown[0]) {
                const rrObj = data.returnRate.drilldown[0].masters.find(m => m.name === myName);
                if (rrObj) {
                    myRr = parseFloat(rrObj.v); // parses "13.5% (10/74)"
                    document.getElementById('master-rr').innerText = myRr.toFixed(1) + '%';
                    const parts = rrObj.v.split('(');
                    if(parts.length > 1) {
                        const sub = parts[1].replace(')','');
                        document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(3) .card-subtext').innerText = sub + " вернувшихся";
                    }
                }
            }
            
            const avgRr = data.returnRate.value || 0;
            const rrEl = document.getElementById('master-rr');
            const rrSubEl = document.getElementById('master-rr-sub');
            if (myRr >= avgRr) {
                rrEl.style.color = '#34C759'; // Green if above average
                rrSubEl.innerText = `Выше среднего по сети (${avgRr.toFixed(1)}%)`;
            } else {
                rrEl.style.color = '#ff4444'; // Red
                rrSubEl.innerText = `Ниже среднего по сети (${avgRr.toFixed(1)}%)`;
            }

            // OVN Fetch
            try {
                const fetchRes = await fetch('/api/ovn');
                if(fetchRes.ok) {
                    const ovnList = await fetchRes.json();
                    const myChecks = ovnList.filter(o => myName.startsWith(o.barber) || (o.barber && o.barber.startsWith(myName)));
                    if (myChecks.length > 0) {
                        const passed = myChecks.filter(r => {
                            const v = (r.violation||"").toLowerCase();
                            return v.includes("замечаний нет") || v.includes("✅") || v.includes('р—р°рјрµс') || !v || v.includes('согласованное') || v.includes('рїрѕрґ');
                        }).length;
                        const ovnScore = Math.round((passed / myChecks.length) * 100);
                        document.getElementById('master-ovn-score').innerText = ovnScore + '%';
                        document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(2) .card-subtext').innerText = `${passed} из ${myChecks.length} проверок`;
                    } else {
                        document.getElementById('master-ovn-score').innerText = '0%';
                        document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(2) .card-subtext').innerText = `Нет проверок`;
                    }
                }
            } catch(e) {}
            
            // YClients Online percentage
            let myYc = '0%';
            if (data.appointments && data.appointments.drilldown[0] && Array.isArray(data.appointments.drilldown[0].masters)) {
                const ycObj = data.appointments.drilldown[0].masters.find(m => m.name === myName);
                if (ycObj) myYc = ycObj.v;
            }
            document.getElementById('master-yc-percent').innerText = myYc;
        }

        function switchTab(target, btn) {
            document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(target + '-section').classList.add('active');
            
            // Get button if called via hash change
            if (!btn) {
                const search = target === 'ovn' ? 'видеоконтроль' : (target === 'lates' ? 'опоздания' : (target === 'schedule' ? 'график' : 'аналитика'));
                btn = Array.from(document.querySelectorAll('.tab-btn'))
                             .find(b => b.textContent.toLowerCase().includes(search));
            }
            if (btn) btn.classList.add('active');
            
            // Update URL hash without scroll
            history.pushState(null, null, '#' + target);

            if (target === 'ovn') loadOVNHistory();
            if (target === 'lates') loadLatesHistory();
            if (target === 'schedule') loadSchedule();
        }


        function openOVNModal(loc = '') { 
            document.getElementById('ovn-modal').classList.add('active'); 
            if (loc) {
                document.getElementById('ovn-location').value = loc;
                updateMastersDropdown();
            }
            
            // Auto pre-fill with audit date if set
            const auditDate = document.getElementById('lates-audit-date').value;
            if (auditDate) document.getElementById('ovn-date').value = auditDate;
            else document.getElementById('ovn-date').value = dayjs().format('YYYY-MM-DD');
        }
        function closeOVNModal() { 
            document.getElementById('ovn-modal').classList.remove('active');
            // Remove extra violation rows on close
            const container = document.getElementById('ovn-violations-container');
            while (container.children.length > 1) {
                container.removeChild(container.lastChild);
            }
        }

        function addViolationRow() {
            const container = document.getElementById('ovn-violations-container');
            const firstSelect = container.querySelector('select');
            const newDiv = document.createElement('div');
            newDiv.style.display = 'flex';
            newDiv.style.gap = '10px';
            newDiv.style.alignItems = 'center';
            
            const newSelect = firstSelect.cloneNode(true);
            newSelect.required = false; // Only first one is strictly required
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.cssText = 'background:none; border:none; color:#ff4d4d; font-size:20px; cursor:pointer; padding:0 5px;';
            removeBtn.onclick = () => newDiv.remove();
            
            newDiv.appendChild(newSelect);
            newDiv.appendChild(removeBtn);
            container.appendChild(newDiv);
        }

        function updateMastersDropdown() {
            const loc = document.getElementById('ovn-location').value;
            const select = document.getElementById('ovn-barber');
            select.innerHTML = '<option value="">Выберите мастера</option>';
            
            if (!loc || !BARBER_ROSTER[loc]) return;
            
            const uniqueMasters = [...BARBER_ROSTER[loc]].sort((a,b) => a.localeCompare(b));

            uniqueMasters.forEach(name => {
                const o = document.createElement('option'); 
                o.value = name; 
                o.textContent = name; 
                select.appendChild(o);
            });
        }

        async function submitOVN(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            
            try {
                btn.innerText = '⌛ Сохранение...';
                btn.disabled = true;

                const report = {
                    location: document.getElementById('ovn-location').value,
                    barber: document.getElementById('ovn-barber').value,
                    date: document.getElementById('ovn-date').value,
                    time: document.getElementById('ovn-time').value,
                    cost: document.getElementById('ovn-cost').value,
                    match: document.getElementById('ovn-match').value,
                    nation: document.getElementById('ovn-nation').value,
                    violation: Array.from(document.querySelectorAll('.ovn-violation-select'))
                                    .map(s => s.value)
                                    .filter((v, i, a) => v !== '' && a.indexOf(v) === i) // unique & not empty
                                    .join(', '),
                    notes: document.getElementById('ovn-notes').value
                };

                const res = await fetch('/api/ovn', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(report)
                });

                if (!res.ok) throw new Error('Сервер ответил ' + res.status);

                // Explicitly clear and close
                document.getElementById('ovn-form').reset();
                closeOVNModal();
                
                // Refresh list
                await loadOVNHistory();
                console.log('Save success, UI updated.');
            } catch (err) {
                console.error('Save error:', err);
                alert('Не удалось сохранить: ' + err.message);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }

        async function loadOVNHistory() {
            try {
                const res = await fetch('/api/ovn');
                let reportsRaw = await res.json();
                // Exclude late/attendance checks from OVN journal
                let reports = reportsRaw.filter(r => !r.schedTime);
                
                // 1. Sort by creation date (newest first)
                reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                // Compute Runrate for Analytics Dash (MTD)
                const startOfM = dayjs().startOf('month');
                const mtdReports = reports.filter(r => dayjs(r.createdAt || r.date).isAfter(startOfM) || dayjs(r.createdAt || r.date).isSame(startOfM, 'day'));
                let passed = 0;
                let branchMap = {};

                mtdReports.forEach(r => {
                    const lowV = (r.violation || "").toLowerCase();
                    const isOk = lowV.includes('нет') || lowV.includes('✅');
                    if (isOk) passed++;
                    
                    const loc = (r.location || 'Прочее').trim();
                    const barb = (r.barber || 'Неизвестно').trim();
                    
                    if (!branchMap[loc]) branchMap[loc] = { total: 0, ok: 0, masters: {} };
                    branchMap[loc].total++;
                    if (isOk) branchMap[loc].ok++;
                    
                    if (!branchMap[loc].masters[barb]) branchMap[loc].masters[barb] = { total: 0, ok: 0 };
                    branchMap[loc].masters[barb].total++;
                    if (isOk) branchMap[loc].masters[barb].ok++;
                });
                
                const totalMtd = mtdReports.length;
                const ovnPerc = totalMtd > 0 ? ((passed / totalMtd) * 100).toFixed(0) : 0;
                
                const branchEmojis = {
                    "Текст": "<span style='color:#AF52DE;font-size:16px;margin-right:4px'>●</span>",
                    "Рязан": "<span style='color:#AF52DE;font-size:16px;margin-right:4px'>●</span>",
                    "Алексеевская": "<span style='color:#FF9500;font-size:16px;margin-right:4px'>●</span>",
                    "Варшав": "<span style='color:#64D2FF;font-size:16px;margin-right:4px'>●</span>",
                    "Сокол": "<span style='color:#34C759;font-size:16px;margin-right:4px'>●</span>",
                    "Партизан": "<span style='color:#0143B3;font-size:16px;margin-right:4px'>●</span>"
                };

                window.OVN_DRILLDOWN = Object.keys(branchMap).sort().map(loc => {
                    const bD = branchMap[loc];
                    const rate = bD.total > 0 ? ((bD.ok / bD.total)*100).toFixed(0) : 0;
                    
                    let eLoc = loc;
                    for (const k in branchEmojis) {
                       if (loc.includes(k)) {
                           eLoc = branchEmojis[k] + loc;
                           break;
                       }
                    }
                    if (eLoc === loc) eLoc = "<span style='color:var(--text-muted);font-size:16px;margin-right:4px'>●</span>" + loc;
                    
                    return {
                        name: eLoc,
                        value: `${rate}% (${bD.ok}/${bD.total})`,
                        trend: rate >= 80 ? 'up' : 'down',
                        masters: Object.keys(bD.masters).sort().map(m => {
                            const mD = bD.masters[m];
                            const mRate = mD.total > 0 ? ((mD.ok / mD.total)*100).toFixed(0) : 0;
                            return { name: m, v: `${mRate}% (${mD.ok} из ${mD.total})` };
                        })
                    };
                });
                
                const cardVal = document.getElementById('card-ovn-runrate');
                const cardSub = document.getElementById('card-ovn-subtext');
                if(cardVal) cardVal.innerText = ovnPerc + '%';
                if(cardSub) cardSub.innerText = `${passed} из ${totalMtd} без замечаний`;

                // Calculate Individual Master OVN quality score
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

                // 2. Count today's checks removed
                
                // 3. Filter if date is selected
                const filterDate = document.getElementById('ovn-history-filter').value;
                if (filterDate) {
                    reports = reports.filter(r => dayjs(r.createdAt).format('YYYY-MM-DD') === filterDate);
                }

                document.getElementById('ovn-history').innerHTML = reports.map(r => {
                    const lowV = (r.violation || "").toLowerCase();
                    let badgeClass = 'badge-no';
                    if (lowV.includes('нет') || lowV.includes('✅')) badgeClass = 'badge-yes';

                    const matchVal = (r.match || "").trim() === 'да';
                    const matchTag = matchVal 
                        ? `<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>`
                        : `<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>`;

                    return `
                    <tr>
                        <td style="font-size:11px; white-space:nowrap; opacity:0.8">
                            ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                            ${dayjs(r.createdAt).format('YYYY-MM-DD') === todayStr ? '<span style="color:var(--accent); margin-left:3px">●</span>' : ''}
                        </td>
                        <td style="font-size:13px">${r.location}</td>
                        <td style="font-size:13px"><b>${r.barber}</b></td>
                        <td style="font-size:13px">
                            ${dayjs(r.date || "").format('DD.MM')} ${r.time || ""} 
                            ${matchTag}
                        </td>
                        <td><span class="badge-status ${badgeClass}">${r.violation}</span></td>
                        <td style="font-size:12px; opacity:0.7">${r.notes || '-'}</td>
                    </tr>
                `}).join('');
            } catch(e) { console.error('History load error:', e); }
        }

        async function loadData() {
            try {
                const res = await fetch(`./data.json?v=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data) return;
                    renderData(data);
                    try {
                        const dateEl = document.getElementById('current-date');
                        if (dateEl) dateEl.innerHTML = `<span style="color: #34C759">● LIVE</span> Обновлено: ${data.lastUpdate || 'только что'}`;
                    } catch(e) {}
                }
            } catch (err) {
                console.error("loadData fetch error:", err);
            }
        }

        async function triggerSync() {
            await fetch('/api/sync', { method: 'POST' });
            loadData();
        }

        async function loadLatesHistory() {
            try {
                console.log('🔄 Loading Lates... Database check...');
                const [ovnRes, schedRes] = await Promise.all([
                    fetch('/api/ovn').then(r => r.json()).catch(() => []),
                    fetch('/api/schedule').then(r => r.json()).catch(() => [])
                ]);
                
                const date = document.getElementById('lates-audit-date').value || dayjs().format('YYYY-MM-DD');
                const loc = document.getElementById('lates-audit-loc').value || "Алексеевская";
                document.getElementById('lates-current-view-date').innerText = dayjs(date).format('DD.MM.YYYY');

                // 1. WORKFORCE AUDIT (GRID)
                const sched = schedRes.find(s => s.date === date && s.location === loc) || { masters: [] };
                const mastersList = sched.masters || [];
                const checksForSelectedDay = ovnRes.filter(r => dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date && r.location === loc);

                document.getElementById('lates-workforce-audit').innerHTML = mastersList.map(m => {
                    const check = checksForSelectedDay.find(r => r.barber === m.name);
                    const isChecked = !!check;
                    const statusColor = isChecked ? (check.violation === "Замечаний нет" || (check.violation||"").includes('Р—Р°РјРµС') ? "#34C759" : "#FF3B30") : "rgba(255,255,255,0.1)";
                    const latenessMsg = isChecked ? (check.violation === "Замечаний нет" || (check.violation||"").includes('Р—Р°РјРµС') ? "✅ Вовремя" : "⚠️ Опоздание") : "Ожидание...";

                    return `
                        <div class="card" style="padding: 20px; border-top: 4px solid ${statusColor};">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                                <span style="font-weight:700; font-size:16px">${m.name || 'Мастер'}</span>
                                <span style="font-size:11px; padding:3px 8px; background:rgba(255,255,255,0.05); border-radius:6px; color:var(--text-muted)">
                                    ${m.isReplacement ? 'Замена' : 'Основной'}
                                </span>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items:end">
                                <div class="form-field">
                                    <label>План</label>
                                    <select class="sched-plan" style="padding:8px" onchange="updateLateness(this, '${(m.name || '').replace(/\s+/g, '')}')">
                                        <option value="09:00" ${m.startTime === '09:00' ? 'selected' : ''}>09:00</option>
                                        <option value="10:00" ${m.startTime === '10:00' ? 'selected' : ''}>10:00</option>
                                        <option value="11:00" ${m.startTime === '11:00' ? 'selected' : ''}>11:00</option>
                                    </select>
                                </div>
                                <div class="form-field">
                                    <label>Факт</label>
                                    <input type="time" class="sched-fact" value="${check ? check.time : ''}" style="padding:8px" 
                                           onchange="updateLateness(this, '${(m.name || '').replace(/\s+/g, '')}')">
                                </div>
                            </div>
                            <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:center">
                                <div id="late-calc-${(m.name || '').replace(/\s+/g, '')}" style="font-size:13px; font-weight:700">${latenessMsg}</div>
                                <button class="btn-refresh" style="padding:6px 16px; font-size:12px; border:1px solid ${isChecked ? '#555' : 'var(--accent)'};" 
                                        onclick="quickSaveLate('${m.name || ''}', this)">
                                    ${isChecked ? 'Обновить' : 'Сохранить'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('') || `<div style="grid-column: span 3; color:var(--text-muted); text-align:center; padding:40px">График пуст.</div>`;

                // 2. COUNTER (Remaining)
                const totalMasters = mastersList.length;
                const checkedMastersCount = mastersList.filter(m => checksForSelectedDay.some(r => r.barber === m.name)).length;
                const remaining = totalMasters - checkedMastersCount;
                
                const counterEl = document.getElementById('lates-remaining-count');
                if (remaining > 0) {
                    counterEl.innerText = `Осталось проверить: ${remaining}`;
                    counterEl.style.color = "#FF9F0A";
                } else if (totalMasters > 0) {
                    counterEl.innerText = `Все проверены ✅`;
                    counterEl.style.color = "#34C759";
                } else {
                    counterEl.innerText = "График не составлен";
                    counterEl.style.color = "var(--text-muted)";
                }

                // 3. TABLE HISTORY (Robust filter)
                const latesList = ovnRes.filter(r => {
                    if (r.schedTime) return true; // Show all attendance records
                    const v = (r.violation || "").toLowerCase();
                    return v !== "замечаний нет" && !v.includes('р—р°рјрµс') && v !== "";
                });
                
                document.getElementById('lates-history').innerHTML = latesList.map(r => {
                    try {
                        const lowV = (r.violation || "").toLowerCase();
                        const isOk = lowV === "замечаний нет" || lowV.includes('р—р°рјрµс') || !lowV;
                        
                        let badgeStyles = 'background: rgba(255,255,255,0.05); color: #888;';
                        if (lowV.includes('согласованное') || lowV.includes('рїрѕрґс‚рі')) badgeStyles = 'background: rgba(52,199,89,0.1); color: #34C759;';
                        else if (lowV.includes('опоздал') || lowV.includes('рѕрїрѕр·рґ') || (r.schedTime && r.time > r.schedTime)) {
                             badgeStyles = 'background: rgba(255,59,48,0.1); color: #FF3B30; font-weight:700;';
                        }

                        let delayText = '-';
                        if (r.schedTime && r.time) {
                            const diff = dayjs(`2000-01-01 ${r.time}`).diff(dayjs(`2000-01-01 ${r.schedTime}`), 'minute');
                            if (diff > 0) delayText = `+${diff} мин`;
                            else if (diff < 0) delayText = `${Math.abs(diff)} мин раньше`;
                            else delayText = 'вовремя';
                        }

                        return `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.01); height: 50px;">
                            <td style="font-size:11px; white-space:nowrap; opacity:0.6; padding-left:25px">${dayjs(r.createdAt || r.id || new Date()).format('HH:mm DD.MM')}</td>
                            <td style="font-size:14px; font-weight:700; color:var(--accent)">${r.location || '...'}</td>
                            <td style="font-size:14px"><b>${r.barber || 'Мастер'}</b></td>
                            <td style="font-size:13px; opacity:0.7">${r.schedTime || '--:--'}</td>
                            <td style="font-size:13px; color:white"><b>${r.time || '--:--'}</b></td>
                            <td style="font-size:13px; color:${delayText.includes('+') ? '#FF3B30' : (isOk ? '#34C759' : 'inherit')}"><b>${delayText}</b></td>
                            <td><span style="display:inline-block; padding:4px 10px; border-radius:8px; font-size:12px; ${badgeStyles}">${r.violation || (delayText.includes('+') ? 'Опоздал' : (isOk ? 'Ок' : '-'))}</span></td>
                        </tr>`;
                    } catch(e) { return '<tr><td colspan="7">Ошибка строки</td></tr>'; }
                }).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; opacity:0.5">Журнал пуст</td></tr>';
                
            } catch(e) { 
                console.error('🔴 Lates critical error:', e); 
                document.getElementById('lates-history').innerHTML = '<tr><td colspan="7" style="color:red">Ошибка загрузки данных</td></tr>';
            }
        }

        function updateLateness(el, barberId) {
            const card = el.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = el.value;
            const resEl = document.getElementById(`late-calc-${barberId}`);
            if (plan && fact) {
                const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
                resEl.innerHTML = diff > 0 ? `<span style="color:#FF3B30">⚠️ Опоздание: ${diff} мин</span>` : `<span style="color:#34C759">✅ Вовремя</span>`;
            }
        }

        async function quickSaveLate(barber, btn) {
            const card = btn.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = card.querySelector('.sched-fact').value;
            if (!fact) { alert('Укажите фактическое время прихода'); return; }

            const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
            const violation = diff > 0 ? 'Мастер опоздал' : 'Замечаний нет';
            const fine = diff > 0 ? 500 : 0;

            const report = {
                location: document.getElementById('lates-audit-loc').value,
                barber: barber,
                date: document.getElementById('lates-audit-date').value,
                time: fact,
                schedTime: plan,
                fine: fine,
                slot: "1",
                match: "да",
                violation: violation,
                notes: diff > 0 ? `Опоздание на ${diff} мин` : 'Открытие вовремя'
            };

            try {
                btn.innerText = '⌛...';
                const res = await fetch('/api/ovn', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(report)
                });
                if (!res.ok) throw new Error('Server error');
                btn.innerText = '✅ Готово';
                setTimeout(() => loadLatesHistory(), 500);
            } catch(e) {
                alert('Ошибка сохранения: ' + e.message);
                btn.innerText = 'Ошибка';
            }
        }

        const PRIMARY = BARBER_ROSTER;

        let currentContextCell = null;
        let pendingReplacementMaster = null;

        function showContextMenu(e, date, location, masterName) {
            e.preventDefault();
            closeTimePicker();
            const menu = document.getElementById('sched-context-menu');
            menu.style.display = 'block';
            menu.style.left = e.pageX + 'px';
            menu.style.top = e.pageY + 'px';
            
            currentContextCell = { date, location, masterName, el: e.target };
            pendingReplacementMaster = null;
            
            const mastersList = document.getElementById('ctx-masters-list');
            let all = [];
            Object.values(PRIMARY).forEach(list => all = all.concat(list));
            const unique = Array.from(new Set(all)).sort((a,b) => a.localeCompare(b));
            const workingOnDate = Array.from(document.querySelectorAll(`.sched-cell[data-date="${date}"]`))
                .filter(c => (c.classList.contains('work') || c.innerText.toLowerCase().includes('раб') || c.innerText.toLowerCase().includes('до')) && !c.innerText.toLowerCase().includes('выходной') && !c.innerText.toLowerCase().includes('вых'))
                .map(c => c.dataset.master);

            const available = unique.filter(m => !workingOnDate.includes(m));

            mastersList.innerHTML = available.map(m => `
                <div class="ctx-item" onclick="prepareReplacement('${m}', event)">${m}</div>
            `).join('');
        }

        function prepareReplacement(masterName, e) {
            e.stopPropagation();
            pendingReplacementMaster = masterName;
            // Shift context menu to show time options or just show time picker
            const picker = document.getElementById('time-picker');
            picker.style.display = 'block';
            picker.style.left = (parseInt(document.getElementById('sched-context-menu').style.left) + 180) + 'px';
            picker.style.top = document.getElementById('sched-context-menu').style.top;
        }

        function showRowTimePicker(e, loc, master) {
            e.stopPropagation();
            closeContextMenu();
            const picker = document.getElementById('time-picker');
            picker.style.display = 'block';
            picker.style.left = e.pageX + 'px';
            picker.style.top = e.pageY + 'px';
            currentContextCell = { isRow: true, loc, master };
            pendingReplacementMaster = null;
        }

        function showTimePicker(e, cell) {
            e.stopPropagation();
            closeContextMenu();
            const picker = document.getElementById('time-picker');
            picker.style.display = 'block';
            picker.style.left = e.pageX + 'px';
            picker.style.top = e.pageY + 'px';
            currentContextCell = { el: cell };
            pendingReplacementMaster = null; 
        }

        function applyTime(timeText) {
            if (currentContextCell) {
                if (currentContextCell.isRow) {
                    const selector = `.sched-cell[data-loc="${currentContextCell.loc}"][data-master="${currentContextCell.master}"]`;
                    document.querySelectorAll(selector).forEach(cell => {
                        cell.innerText = timeText;
                        if (timeText === 'выходной' || timeText === 'вых') {
                            cell.classList.remove('work', 'replacement');
                        } else {
                            cell.classList.add('work');
                            cell.classList.remove('replacement');
                        }
                    });
                } else {
                    let finalVal = timeText;
                    if (pendingReplacementMaster) {
                        finalVal = pendingReplacementMaster + ' (' + timeText + ') (ЗАМЕНА)';
                        currentContextCell.el.classList.add('replacement');
                    }
                    
                    currentContextCell.el.innerText = finalVal;
                    
                    if (timeText === 'выходной' || timeText === 'вых') {
                        currentContextCell.el.classList.remove('work', 'replacement');
                    } else {
                        currentContextCell.el.classList.add('work');
                    }
                }
            }
            closeTimePicker();
            closeContextMenu();
        }

        function applyCustomTime() {
            const val = prompt('Введите время (например, С 10 до 20):');
            if (val) applyTime(val);
        }

        function clearCell() {
            if (currentContextCell) {
                currentContextCell.el.innerText = 'выходной';
                currentContextCell.el.classList.remove('replacement', 'work');
            }
            closeContextMenu();
        }

        function closeContextMenu() {
            document.getElementById('sched-context-menu').style.display = 'none';
        }
        function closeTimePicker() {
            document.getElementById('time-picker').style.display = 'none';
        }

        document.addEventListener('click', () => { closeContextMenu(); closeTimePicker(); });

        async function loadSchedule() {
            const startDateStr = document.getElementById('sched-start-date').value || dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
            document.getElementById('sched-start-date').value = startDateStr;
            const startDate = dayjs(startDateStr);
            
            const thead = document.getElementById('sched-thead');
            const tbody = document.getElementById('sched-tbody');
            
            let headHtml = '<tr><th class="sched-master-name">Мастер / Дата</th>';
            const rusDays = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
            for (let i = 0; i < 31; i++) {
                const d = startDate.add(i, 'day');
                headHtml += `<th>${d.format('DD.MM')}<br><small style="font-weight:400">${rusDays[d.day()]}</small></th>`;
            }
            headHtml += '</tr>';
            thead.innerHTML = headHtml;

            let schedData = [];
            try {
                const res = await fetch('/api/schedule');
                if (res.ok) {
                    const parsed = await res.json();
                    if (Array.isArray(parsed)) schedData = parsed;
                }
            } catch (e) {
                console.error("Error loading schedule:", e);
            }

            let bodyHtml = '';
            for (const [loc, masters] of Object.entries(PRIMARY)) {
                bodyHtml += `<tr class="loc-header"><td colspan="32">${loc}</td></tr>`;
                
                masters.forEach(m => {
                    bodyHtml += `<tr><td class="sched-master-name sched-master-row-btn" onclick="showRowTimePicker(event, '${loc}', '${m}')" title="Выбрать график на весь месяц">${m} <span style="font-size:10px; opacity:0.5;">✏️</span></td>`;
                    for (let i = 0; i < 31; i++) {
                        const date = startDate.add(i, 'day').format('YYYY-MM-DD');
                        const entry = schedData.find(s => s.date === date && s.location === loc);
                        const entryMasters = (entry && Array.isArray(entry.masters)) ? entry.masters : [];
                        const masterData = entryMasters.find(x => x.name === m);
                        
                        let val = 'выходной';
                        let cls = '';
                        if (masterData) {
                            val = masterData.text || (masterData.startTime === '10:00' ? 'С 10 до 22' : (masterData.startTime === '09:00' ? 'С 09 до 22' : 'раб'));
                            cls = 'work';
                            if (masterData.isReplacement) cls += ' replacement';
                        }
                        
                        bodyHtml += `<td><div class="sched-cell ${cls}" 
                                        onclick="showTimePicker(event, this)"
                                        oncontextmenu="showContextMenu(event, '${date}', '${loc}', '${m}')"
                                        data-date="${date}" data-loc="${loc}" data-master="${m}">${val}</div></td>`;
                    }
                    bodyHtml += '</tr>';
                });

                // Replacement row
                bodyHtml += `<tr style="opacity: 0.6;"><td class="sched-master-name" style="font-size: 11px;">Новый / Замена</td>`;
                for (let i = 0; i < 31; i++) {
                    const date = startDate.add(i, 'day').format('YYYY-MM-DD');
                    const entry = schedData.find(s => s.date === date && s.location === loc);
                    const entryMasters = (entry && Array.isArray(entry.masters)) ? entry.masters : [];
                    const repls = entryMasters.filter(x => x.isReplacement && !PRIMARY[loc].includes(x.name));
                    
                    let val = '';
                    let cls = 'replacement';
                    if (repls.length > 0) {
                        val = repls.map(r => r.text || (r.name + ' (' + r.startTime + ')')).join(', ');
                    }
                    
                    bodyHtml += `<td><div class="sched-cell ${cls}" 
                                    onclick="showTimePicker(event, this)"
                                    oncontextmenu="showContextMenu(event, '${date}', '${loc}', 'NEW')"
                                    data-date="${date}" data-loc="${loc}" data-master="NEW">${val}</div></td>`;
                }
                bodyHtml += '</tr>';
            }
            tbody.innerHTML = bodyHtml;

            // Sync top scrollbar
            setTimeout(() => {
                const tScroll = document.querySelector('.sched-top-scroll');
                const tDummy = document.querySelector('.sched-top-dummy');
                const wrapper = document.querySelector('.sched-table-wrapper');
                const table = document.querySelector('.sched-table');
                
                if (tDummy && table) {
                    tDummy.style.width = table.scrollWidth + 'px';
                }
                if (tScroll && wrapper && !tScroll.dataset.synced) {
                    tScroll.addEventListener('scroll', () => { wrapper.scrollLeft = tScroll.scrollLeft; });
                    wrapper.addEventListener('scroll', () => { tScroll.scrollLeft = wrapper.scrollLeft; });
                    tScroll.dataset.synced = "true";
                }
            }, 50);
        }

        async function saveScheduleAll() {
            const btn = document.querySelector('#schedule-section .btn-submit');
            const originalText = btn.innerText;
            btn.innerText = '⌛ Сохранение...';
            btn.disabled = true;

            const gridData = {}; // { "date|loc": [masters] }
            
            document.querySelectorAll('.sched-cell').forEach(cell => {
                const date = cell.dataset.date;
                const loc = cell.dataset.loc;
                const master = cell.dataset.master;
                const text = cell.innerText.trim();
                
                if (text === '' || text.toLowerCase() === 'выходной' || text.toLowerCase() === 'вых') return;

                const key = `${date}|${loc}`;
                if (!gridData[key]) gridData[key] = [];
                
                if (master === 'NEW') {
                    // Split multiple replacements if any
                    text.split(',').forEach(m => {
                        gridData[key].push({
                            name: m.replace('(ЗАМЕНА)', '').trim(),
                            isReplacement: true,
                            startTime: '10:00', // Default
                            text: m.trim()
                        });
                    });
                } else {
                    gridData[key].push({
                        name: master,
                        isReplacement: text.includes('(ЗАМЕНА)'),
                        startTime: text.includes('09') ? '09:00' : '10:00',
                        text: text
                    });
                }
            });

            try {
                // Send separately for each day/loc for simplicity or all at once
                for (const [key, masters] of Object.entries(gridData)) {
                    const [date, location] = key.split('|');
                    await fetch('/api/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date, location, masters })
                    });
                }
                btn.innerText = '✅ Сохранено';
                setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
            } catch (e) {
                alert('Ошибка сохранения');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }

        window.USER = null;

        window.onload = async () => {
            // AUTHENTICATION LOGIC (DISABLED TEMPORARILY)
            window.USER = { role: 'owner', name: 'Admin (Auth Disabled)' };
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            initializeApp();
            return;

            const urlParams = new URLSearchParams(window.location.search);
            const getCookie = (name) => {
                let m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + "=([^;]*)"));
                return m ? decodeURIComponent(m[1]) : undefined;
            };
            
            let urlId = urlParams.get('tg_id');
            let tg_id = urlId || localStorage.getItem('tg_id') || getCookie('tg_id');
            
            if (tg_id) {
                if (urlId) window.history.replaceState({}, document.title, window.location.pathname);
                
                try {
                    const res = await fetch('/api/me?tg_id=' + tg_id);
                    if (res.ok) {
                        const user = await res.json();
                        localStorage.setItem('tg_id', tg_id);
                        document.cookie = `tg_id=${tg_id}; path=/; max-age=31536000`; // 1 year memory
                        window.USER = user;
                        
                        document.getElementById('login-screen').classList.add('hidden');
                        
                        if (urlId) {
                            // Show welcome animation ONLY for fresh login
                            const welcomeScreen = document.getElementById('welcome-screen');
                            document.getElementById('welcome-msg').innerText = `Привет, ${user.name} 👋`;
                            welcomeScreen.classList.remove('hidden');
                            
                            setTimeout(() => {
                                welcomeScreen.style.opacity = '0';
                                setTimeout(() => {
                                    welcomeScreen.classList.add('hidden');
                                    document.getElementById('app-container').classList.remove('hidden');
                                    initializeApp();
                                }, 500);
                            }, 1500);
                        } else {
                            // Instant access for returning users
                            document.getElementById('app-container').classList.remove('hidden');
                            initializeApp();
                        }
                    } else {
                        localStorage.removeItem('tg_id');
                        document.cookie = 'tg_id=; path=/; max-age=0;';
                        document.getElementById('login-screen').classList.remove('hidden');
                    }
                } catch(e) {
                    document.getElementById('login-screen').classList.remove('hidden');
                }
            } else {
                document.getElementById('login-screen').classList.remove('hidden');
            }
        };

        async function initializeApp() {
            // role-based UI tweaks
            applyRoleConstraints();

            await loadData();
            const hash = location.hash.replace('#', '');
            if (hash) switchTab(hash); else switchTab('analytics');
            setInterval(loadData, 30000);
            loadOVNHistory();
            loadLatesHistory();
            loadSchedule();
            loadManagerChecks();
        }

        function applyRoleConstraints() {
            const role = window.USER.role;
            if (role === 'owner') {
                document.getElementById('adapter-btn').style.display = 'block';
            }
            if (role === 'owner' || role === 'manager') {
                document.getElementById('tab-manager').style.display = 'inline-block';
            }
            if (role === 'master') {
                document.getElementById('tab-analytics').style.display = 'none';
                document.getElementById('tab-ovn').style.display = 'none';
                document.getElementById('tab-lates').style.display = 'none';
                document.getElementById('tab-master').style.display = 'inline-block';
                switchTab('master-cabinet', document.getElementById('tab-master'));
            } else {
                document.getElementById('tab-master').style.display = 'inline-block';
            }
        }

        function toggleDrilldown(type) {
            const container = document.getElementById('drilldown');
            
            if (type === 'ovn') {
                if (!window.OVN_DRILLDOWN) return;
                container.style.display = 'block';
                document.getElementById('drilldown-title').innerText = 'Детализация: Качество ОВН (За месяц)';
                document.getElementById('drilldown-body').innerHTML = window.OVN_DRILLDOWN.map((item, idx) => `
                    <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                        <td><span class="chevron">›</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '↗' : '↘'}</td>
                    </tr>
                    ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
                `).join('');
                window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
                return;
            }

            if(!window.DASH_DATA) return;
            const data = window.DASH_DATA[type === 'revenue' ? 'revenue' : (type === 'returns' ? 'returnRate' : (type === 'intervals' ? 'cycle' : (type === 'appointments' ? 'appointments' : (type === 'occupancy' ? 'occupancy' : null))))];
            if(!data) return;
            container.style.display = 'block';
            document.getElementById('drilldown-title').innerText = 'Детализация: ' + type;
            document.getElementById('drilldown-body').innerHTML = data.drilldown.map((item, idx) => `
                <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                    <td><span class="chevron">›</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '↗' : '↘'}</td>
                </tr>
                ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
            `).join('');
            window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        }

        function openAdapterModal() {
            const container = document.getElementById('adapter-gui-container');
            let html = '';
            
            for (const [branchName, config] of Object.entries(ADAPTER)) {
                html += `
                <div class="adapter-branch" data-branch="${branchName}" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #333;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
                        <input type="text" class="branch-name-input" value="${branchName}" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-weight: bold; font-size: 16px;" placeholder="Название филиала">
                        <input type="text" class="branch-term-input" value="${config.el_kassa_terminal || ''}" placeholder="El.Kassa Терминал" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                        <input type="text" class="branch-yc-input" value="${config.yclients_company_id || ''}" placeholder="YClients ID" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                        <button onclick="this.closest('.adapter-branch').remove()" style="background: #ff4444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Удалить</button>
                    </div>
                    
                    <div class="masters-list" style="padding-left: 20px; border-left: 2px solid #333;">
                        <div style="font-size: 12px; color: #888; margin-bottom: 5px; display: flex;">
                            <span style="flex: 1;">Имя в Дашборде (dash)</span>
                            <span style="flex: 2; margin-left: 10px;">Имена в Элкассе (через запятую)</span>
                            <span style="flex: 1; margin-left: 10px;">YClients Staff ID</span>
                            <span style="width: 70px;"></span>
                        </div>
                `;
                
                if (config.masters) {
                    for (const master of config.masters) {
                        html += `
                        <div class="adapter-master" style="display: flex; gap: 10px; margin-bottom: 8px;">
                            <input type="text" class="m-dash" value="${master.dash || ''}" style="flex: 1; background: #000; border: 1px solid #444; color: var(--accent); padding: 6px; border-radius: 4px;">
                            <input type="text" class="m-el" value="${(master.el_kassa || []).join(', ')}" style="flex: 2; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="Шохназар Д., Шохназар">
                            <input type="text" class="m-yc" value="${master.yclients_id || ''}" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;">
                            <button onclick="this.closest('.adapter-master').remove()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 12px; border-radius: 4px; cursor: pointer;">✕</button>
                        </div>`;
                    }
                }
                
                html += `
                        <button onclick="addAdapterMaster(this)" style="margin-top: 10px; background: transparent; border: 1px dashed #555; color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">+ Добавить мастера</button>
                    </div>
                </div>`;
            }
            container.innerHTML = html;
            document.getElementById('adapter-modal').classList.add('active');
        }
        
        function addAdapterBranch() {
            const container = document.getElementById('adapter-gui-container');
            const div = document.createElement('div');
            div.className = 'adapter-branch';
            div.style.cssText = "background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #333;";
            div.innerHTML = `
                <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
                    <input type="text" class="branch-name-input" value="Новый филиал" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-weight: bold; font-size: 16px;">
                    <input type="text" class="branch-term-input" value="" placeholder="El.Kassa Терминал" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                    <input type="text" class="branch-yc-input" value="" placeholder="YClients ID" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                    <button onclick="this.closest('.adapter-branch').remove()" style="background: #ff4444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Удалить</button>
                </div>
                <div class="masters-list" style="padding-left: 20px; border-left: 2px solid #333;">
                    <button onclick="addAdapterMaster(this)" style="margin-top: 10px; background: transparent; border: 1px dashed #555; color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">+ Добавить мастера</button>
                </div>
            `;
            container.insertBefore(div, container.firstChild);
        }

        function addAdapterMaster(btn) {
            const list = btn.closest('.masters-list');
            const div = document.createElement('div');
            div.className = 'adapter-master';
            div.style.cssText = "display: flex; gap: 10px; margin-bottom: 8px;";
            div.innerHTML = `
                <input type="text" class="m-dash" value="Имя" style="flex: 1; background: #000; border: 1px solid #444; color: var(--accent); padding: 6px; border-radius: 4px;">
                <input type="text" class="m-el" value="" style="flex: 2; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="Имена в элкассе через запятую">
                <input type="text" class="m-yc" value="" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="YClients ID">
                <button onclick="this.closest('.adapter-master').remove()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 12px; border-radius: 4px; cursor: pointer;">✕</button>
            `;
            list.insertBefore(div, btn);
        }

        function closeAdapterModal() {
            document.getElementById('adapter-modal').classList.remove('active');
        }

        async function saveAdapter() {
            const btn = document.querySelector('#adapter-modal .btn-submit');
            try {
                const newAdapter = {};
                document.querySelectorAll('.adapter-branch').forEach(branchDiv => {
                    const bName = branchDiv.querySelector('.branch-name-input').value.trim();
                    if (!bName) return;
                    
                    const term = branchDiv.querySelector('.branch-term-input').value.trim();
                    const ycid = branchDiv.querySelector('.branch-yc-input').value.trim();
                    
                    const masters = [];
                    branchDiv.querySelectorAll('.adapter-master').forEach(mDiv => {
                        const mDash = mDiv.querySelector('.m-dash').value.trim();
                        if (!mDash) return;
                        
                        const mElText = mDiv.querySelector('.m-el').value;
                        const mElArray = mElText.split(',').map(s => s.trim()).filter(s => s);
                        
                        const mYc = mDiv.querySelector('.m-yc').value.trim();
                        
                        masters.push({
                            dash: mDash,
                            el_kassa: mElArray,
                            yclients_id: mYc
                        });
                    });
                    
                    newAdapter[bName] = {
                        el_kassa_terminal: term,
                        yclients_company_id: ycid,
                        masters: masters
                    };
                });

                btn.innerText = 'Сохранение...';
                
                const res = await fetch('/api/adapter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newAdapter)
                });
                
                if(res.ok) {
                    btn.innerText = '✅ Сохранено';
                    setTimeout(() => { btn.innerText = 'Сохранить изменения'; closeAdapterModal(); location.reload(); }, 1500);
                } else {
                    throw new Error('Ошибка при сохранении на сервере');
                }
            } catch(e) {
                alert('Ошибка сохранения:\n' + e.message);
                btn.innerText = 'Сохранить изменения';
            }
        // ================= MANAGER CABINET LOGIC =================
        const MANAGER_CHECK_FIELDS = [
            { id: 1, label: 'Наружная реклама исправна, чистая.', photo: 'required' },
            { id: 2, label: 'Рамки с ценами, светильники, телевизор...', photo: 'optional' },
            { id: 3, label: 'Мастера в форме, форма чистая, обувь закрытого типа.', photo: 'required' },
            { id: 4, label: 'Кресло развернуто ко входу, на кресле пеньюар', photo: 'required' },
            { id: 5, label: 'Телевизор и музыкальный центр включены', photo: 'optional' },
            { id: 6, label: 'Инструмент мастера в исправном состоянии.', photo: 'optional' },
            { id: 7, label: 'На шкафах нет волос, нет личных вещей', photo: 'optional' },
            { id: 8, label: 'В салоне температура в диапазоне 19-23 градуса...', photo: 'optional' },
            { id: 9, label: 'На Мойке и других поверхностях не лежат тряпки...', photo: 'required' },
            { id: 10, label: 'В зале не лежат коробки промоутеров...', photo: 'optional' },
            { id: 11, label: 'Музыка играет из согласованного плей-листа...', photo: 'optional' },
            { id: 12, label: 'Проверка технической части...', photo: 'optional' },
            { id: 13, label: 'Консультация перед стрижкой...', photo: 'optional' },
            { id: 14, label: 'Цветные бутылочки, косметика не из нашей матрицы отсутствуют', photo: 'required' },
            { id: 15, label: 'Проверка ближайших записей у всех мастеров', photo: 'optional' },
            { id: 16, label: 'Все нарушения из таблицы за последние 48 часов проработаны на месте', photo: 'optional' },
            { id: 17, label: 'Составление графика', photo: 'optional' }
        ];

        function openManagerModal() {
            const container = document.getElementById('manager-fields-container');
            let html = '';
            MANAGER_CHECK_FIELDS.forEach(f => {
                html += `
                    <div class="form-field" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                        <label style="font-size: 15px; margin-bottom: 10px;">${f.id}. ${f.label}</label>
                        <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                            <label><input type="radio" name="check_${f.id}" value="yes" required> Да / Норма</label>
                            <label><input type="radio" name="check_${f.id}" value="no"> Нет / Нарушение</label>
                            <label><input type="radio" name="check_${f.id}" value="fixed"> Исправлено</label>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: start;">
                            <input type="text" id="comment_${f.id}" placeholder="Комментарий обязательно..." required style="flex: 1; border-radius: 6px; padding: 10px; background: #000; border: 1px solid #444; color: #fff;">
                            <div style="display: flex; flex-direction: column; gap: 5px;">
                                <input type="file" id="photo_${f.id}" accept="image/*" ${f.photo === 'required' ? 'required' : ''} style="width: 200px; font-size: 12px; color: #fff;">
                                ${f.photo === 'required' ? '<span style="color: #ff4444; font-size: 10px;">ФОТО ОБЯЗАТЕЛЬНО</span>' : '<span style="color: #888; font-size: 10px;">Фото опционально</span>'}
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
            
            const locSelect = document.getElementById('manager-location');
            locSelect.innerHTML = '<option value="">Выберите салон...</option>';
            Object.keys(ADAPTER).forEach(loc => {
                locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
            });

            document.getElementById('manager-modal').classList.add('active');
        }

        function closeManagerModal() {
            document.getElementById('manager-modal').classList.remove('active');
        }

        async function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }

        async function submitManagerCheck(e) {
            e.preventDefault();
            const btn = document.getElementById('manager-submit-btn');
            btn.disabled = true;
            btn.innerText = 'Загрузка фото...';

            try {
                const checkData = {
                    location: document.getElementById('manager-location').value,
                    date: new Date().toISOString().split('T')[0],
                    items: []
                };

                for (const f of MANAGER_CHECK_FIELDS) {
                    const radios = document.getElementsByName(`check_${f.id}`);
                    let statusVal = '';
                    radios.forEach(r => { if(r.checked) statusVal = r.value; });
                    
                    const commentVal = document.getElementById(`comment_${f.id}`).value;
                    const fileInput = document.getElementById(`photo_${f.id}`);
                    
                    let photoUrl = null;
                    if (fileInput.files && fileInput.files.length > 0) {
                        const base64 = await fileToBase64(fileInput.files[0]);
                        const upRes = await fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ base64 })
                        });
                        if (upRes.ok) {
                            const upData = await upRes.json();
                            photoUrl = upData.url;
                        } else {
                            console.warn("Upload failed for item", f.id);
                        }
                    }

                    checkData.items.push({
                        id: f.id,
                        label: f.label,
                        status: statusVal,
                        comment: commentVal,
                        photo: photoUrl
                    });
                }

                btn.innerText = 'Сохранение...';

                const res = await fetch('/api/manager_checks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(checkData)
                });

                if (res.ok) {
                    btn.innerText = '✅ Готово';
                    setTimeout(() => {
                        closeManagerModal();
                        loadManagerChecks();
                        btn.disabled = false;
                        btn.innerText = 'Отправить проверку';
                    }, 1000);
                } else {
                    throw new Error('Ошибка сервера');
                }
            } catch (err) {
                console.error(err);
                alert('Ошибка: ' + err.message);
                btn.disabled = false;
                btn.innerText = 'Отправить проверку';
            }
        }

        async function loadManagerChecks() {
            try {
                const res = await fetch('/api/manager_checks');
                if (res.ok) {
                    const checks = await res.json();
                    
                    const today = new Date().toISOString().split('T')[0];
                    const todayChecks = checks.filter(c => c.date === today);
                    document.getElementById('manager-checks-count').innerText = `${todayChecks.length} / 3`;

                    const tbody = document.getElementById('manager-history');
                    tbody.innerHTML = '';
                    
                    checks.slice(0, 50).forEach(c => {
                        const dateStr = new Date(c.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                        
                        const totalItems = c.items.length;
                        const cleanItems = c.items.filter(i => i.status === 'yes').length;
                        const badItems = c.items.filter(i => i.status === 'no');
                        
                        let issuesText = badItems.length > 0 
                            ? badItems.map(i => `<div style="margin-bottom:3px;"><strong>П. ${i.id}:</strong> ${i.comment}</div>`).join('') 
                            : '<span style="color:#34C759">Идеально (без нарушений)</span>';

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${dateStr}</td>
                            <td style="font-weight: 600;">${c.location}</td>
                            <td>${cleanItems} / ${totalItems} выполнено</td>
                            <td style="font-size: 11px; line-height: 1.3; max-width: 300px;">${issuesText}</td>
                            <td><button onclick="viewManagerCheck(${c.id})" class="btn-refresh" style="padding: 5px 10px;">Просмотр</button></td>
                        `;
                        tbody.appendChild(row);
                    });
                    
                    window.MANAGER_CHECKS_DATA = checks;
                }
            } catch (e) {
                console.error("Manager checks load error", e);
            }
        }

        function viewManagerCheck(id) {
            const check = window.MANAGER_CHECKS_DATA.find(c => c.id === id);
            if(!check) return;
            
            let reportHtml = `<div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #fff; background: #000; padding: 20px;">
                <h2 style="color: #fff;">Отчет: ${check.location}</h2>
                <p style="color: #888;">${new Date(check.createdAt).toLocaleString('ru-RU')}</p><hr style="border-color: #333;">`;
            
            check.items.forEach(i => {
                const color = i.status === 'yes' ? '#34C759' : (i.status === 'fixed' ? '#FF9F0A' : '#FF3B30');
                const statusMap = { 'yes': 'ДА / НОРМА', 'no': 'НЕТ / НАРУШЕНИЕ', 'fixed': 'ИСПРАВЛЕНО' };
                reportHtml += `
                    <div style="margin-bottom: 15px; border: 1px solid #333; padding: 15px; border-left: 5px solid ${color}; border-radius: 8px; background: #111;">
                        <div style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">${i.id}. ${i.label}</div>
                        <div style="margin-bottom: 5px; color: ${color}; font-weight: bold;">[${statusMap[i.status]}]</div>
                        <div style="margin-bottom: 10px; color: #ddd; font-style: italic;">Комментарий: ${i.comment}</div>
                        ${i.photo ? `<div style="margin-top: 10px;"><img src="${i.photo}" style="max-width: 100%; border-radius: 4px; border: 1px solid #444;"></div>` : ''}
                    </div>
                `;
            });
            reportHtml += `</div>`;
            
            const win = window.open('','_blank');
            win.document.body.style.backgroundColor = '#000';
            win.document.write(reportHtml);
        }
    