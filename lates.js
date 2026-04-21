
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
                const errs = data.errors || {};
                function applyWarn(cellIndex, hasErr, msg) {
                    const el = document.querySelector(`#analytics-section .metrics-grid .card:nth-child(${cellIndex})`);
                    if(el) {
                        let w = el.querySelector('.err-warn');
                        if (hasErr) {
                            if (!w) {
                                el.style.position = 'relative';
                                el.insertAdjacentHTML('beforeend', `<div class="err-warn" style="position:absolute; top:10px; right:12px; font-size:16px; cursor:help; z-index:10;" title="${msg}">⚠️</div>`);
                            }
                        } else if (w) {
                            w.remove();
                        }
                    }
                }
                applyWarn(1, errs.elkassa || errs.general, "Ошибка соед. с El.Kassa/базой");
                applyWarn(2, errs.elkassa || errs.general, "Ошибка соед. с El.Kassa/базой");
                applyWarn(3, errs.elkassa || errs.general, "Ошибка соед. с El.Kassa/базой");
                applyWarn(4, errs.elkassa || errs.general, "Ошибка соед. с El.Kassa/базой");
                applyWarn(5, errs.yclients || errs.elkassa || errs.general, "Ошибка ответа YCLIENTS или El.Kassa");
                applyWarn(6, errs.elkassa || errs.general, "Ошибка соед. с El.Kassa/базой");

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
            let ovnList = [];
            try {
                const fetchRes = await fetch('/api/ovn');
                if(fetchRes.ok) {
                    ovnList = await fetchRes.json();
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
            // Update Fines and Zone immediately
            try {
                const allFines = calculateFines(ovnList);
                const myFines = allFines[myName];
                if (myFines) {
                    document.getElementById('master-week-violations').innerText = myFines.weekViolations;
                    document.getElementById('master-total-fines').innerText = myFines.monthFines + ' ₽';
                    
                    const zoneBadgeEl = document.getElementById('master-zone-badge');
                    if (myFines.state === 'Green') {
                        zoneBadgeEl.innerHTML = '🟢 ЗЕЛЕНАЯ';
                        zoneBadgeEl.style.color = '#34C759';
                        zoneBadgeEl.style.background = 'rgba(52, 199, 89, 0.15)';
                    } else if (myFines.state === 'Yellow') {
                        zoneBadgeEl.innerHTML = '🟡 ЖЕЛТАЯ';
                        zoneBadgeEl.style.color = '#FF9F0A';
                        zoneBadgeEl.style.background = 'rgba(255, 159, 10, 0.15)';
                    } else if (myFines.state === 'Red') {
                        zoneBadgeEl.innerHTML = '🔴 КРАСНАЯ';
                        zoneBadgeEl.style.color = '#FF3B30';
                        zoneBadgeEl.style.background = 'rgba(255, 59, 48, 0.15)';
                    }
                }
            } catch(e) { console.error('Fines update error:', e); }

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
            if (target === 'master-cabinet' && typeof window.loadMasterSchedule === 'function') {
                setTimeout(window.loadMasterSchedule, 100);
            }
            
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
            const auditDate = dayjs().format('YYYY-MM-DD');
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
                if (!res.ok) throw new Error('fetch error');
                let reports = await res.json();

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
                        counterEl.innerText = `Осталось проверок: ${remaining}`;
                        counterEl.style.color = "#FF9F0A";
                    } else {
                        counterEl.innerText = `Проверки завершены ✅`;
                        counterEl.style.color = "#34C759";
                    }
                }

                const renderRow = (r) => {
                    const lowV = (r.violation || "").toLowerCase();
                    let badgeClass = 'badge-no';
                    if (lowV.includes('нет') || lowV.includes('✅')) badgeClass = 'badge-yes';

                    const matchVal = (r.match || "").trim() === 'да';
                    const matchTag = matchVal 
                        ? `<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>`
                        : `<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>`;

                    return `<tr>
                        <td data-label="МАСТЕР" style="font-size:14px; padding-left:25px"><b>${r.barber}</b></td>
                        <td data-label="НАРУШЕНИЕ"><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
                        <td data-label="ДАТА ПРОСМ." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        <td data-label="САЛОН" style="font-size:13px; font-weight:700; color:var(--accent)">${r.location}</td>
                        <td style="font-size:13px; opacity:0.7">
                            ${dayjs(r.date || "").format('DD.MM')} ${r.time || ""} 
                            ${matchTag}
                        </td>
                        <td data-label="РАБОТА" style="font-size:12px; opacity:0.7">${r.notes || '-'}</td>
                    </tr>`;
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

            } catch(e) { console.error('History load error:', e); }
        }

        window.applyOvnPreset = function() {
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
                    ? `<span style="color:#34C759; margin-left:4px" title="Чек совпадает">●</span>`
                    : `<span style="color:#FF3B30; margin-left:4px" title="Расхождение">●</span>`;

                return `<tr>
                    <td data-label="МАСТЕР" style="font-size:14px; padding-left:25px"><b>${r.barber}</b></td>
                    <td data-label="НАРУШЕНИЕ"><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
                    <td data-label="ДАТА ПРОСМ." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        ${dayjs(r.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? '<span style="color:var(--accent); margin-left:3px">●</span>' : ''}
                    </td>
                    <td data-label="САЛОН" style="font-size:13px; font-weight:700; color:var(--accent)">${r.location}</td>
                    <td style="font-size:13px; opacity:0.7">
                        ${dayjs(r.date || "").format('DD.MM')} ${r.time || ""} 
                        ${matchTag}
                    </td>
                    <td data-label="РАБОТА" style="font-size:12px; opacity:0.7">${r.notes || '-'}</td>
                </tr>`;
            }).join('');
        };

        async function loadData() {
            try {
                const res = await fetch(`./data.json?v=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data) return;
                      window.dashboardData = data;
                      console.log('Data loaded:', data);
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

                  window.triggerSyncModule = async function(module, btn) {
              if (btn) btn.innerHTML = `<svg style="animation: spin 1s linear infinite;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
              try {
                  await fetch('/api/sync', { method: 'POST', body: JSON.stringify({ module }) });
                  const check = setInterval(async () => {
                      try {
                          const res = await fetch('/api/sync_status');
                          const data = await res.json();
                          if (!data.isSyncing) {
                              clearInterval(check);
                              if (btn) btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                              if (btn) btn.style.color = '#34C759';
                              setTimeout(() => {
                                  if(btn) btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.8-10.42L2 8"></path></svg>`;
                                  if(btn) btn.style.color = 'var(--text-muted)';
                              }, 2000);
                              loadData();
                          }
                      } catch(e) {}
                  }, 2000);
              } catch(e) {}
          }

          window.triggerSync = async function() {
              const btn = document.getElementById('refresh-btn');
              if (btn) { btn.innerHTML = '🔄 Загрузка...'; btn.disabled = true; }
              await fetch('/api/sync', { method: 'POST', body: JSON.stringify({}) });
              
              const check = setInterval(async () => {
                  try {
                      const res = await fetch('/api/sync_status');
                      const data = await res.json();
                      if (!data.isSyncing) {
                          clearInterval(check);
                          if (btn) { btn.innerHTML = '🔄 Обновить сейчас'; btn.disabled = false; }
                          loadData();
                      }
                  } catch(e) {}
              }, 2000);
          }

        async function loadLatesHistory() {
            try {
                console.log('🔄 Loading Lates... Database check...');
                const [ovnRes, schedRes] = await Promise.all([
                    fetch('/api/ovn').then(r => r.json()).catch(() => []),
                    fetch('/api/schedule').then(r => r.json()).catch(() => [])
                ]);
                
                const date = dayjs().format('YYYY-MM-DD');
                const loc = document.getElementById('lates-audit-loc').value || "Алексеевская";
                window.lastOvnRes = ovnRes;

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
                                    <input type="text" class="sched-plan" value="${m.startTime || '--:--'}" readonly disabled style="padding:8px; background: rgba(255,255,255,0.05); color: var(--text-muted); border-color: transparent; text-align: center;">
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

                // 2. COUNTER (Remaining GLOBAL across all branches)
                let totalMastersGlobal = 0;
                let checkedMastersGlobal = 0;
                const checksForSelectedDayGlobal = ovnRes.filter(r => dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date);
                
                schedRes.filter(s => s.date === date).forEach(s => {
                    const branchMasters = s.masters || [];
                    totalMastersGlobal += branchMasters.length;
                    checkedMastersGlobal += branchMasters.filter(m => checksForSelectedDayGlobal.some(r => r.barber === m.name && r.location === s.location)).length;
                });
                
                const remainingGlobal = totalMastersGlobal - checkedMastersGlobal;
                
                const counterEl = document.getElementById('lates-remaining-count');
                if (remainingGlobal > 0) {
                    counterEl.innerText = `Осталось проверить всего: ${remainingGlobal}`;
                    counterEl.style.color = "#FF9F0A";
                } else if (totalMastersGlobal > 0) {
                    counterEl.innerText = `Все точки проверены ✅`;
                    counterEl.style.color = "#34C759";
                } else {
                    counterEl.innerText = "График не составлен";
                    counterEl.style.color = "var(--text-muted)";
                }

                // 3. TABLE HISTORY DELEGATED
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
                }
                
            } catch(e) { 
                console.error('🔴 Lates critical error:', e); 
                document.getElementById('lates-history').innerHTML = '<tr><td colspan="7" style="color:red">Ошибка загрузки данных</td></tr>';
            }
        }

        