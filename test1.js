ÿ
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
                ovnLocSelect.innerHTML = '<option value=""> !9 ± µ! Q! µ...</option>';
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
                                el.insertAdjacentHTML('beforeend', `<div class="err-warn" style="position:absolute; top:10px; right:12px; font-size:16px; cursor:help; z-index:10;" title="${msg}">2Y ?Q</div>`);
                            }
                        } else if (w) {
                            w.remove();
                        }
                    }
                }
                applyWarn(1, errs.elkassa || errs.general, " [!¬ Q ± T ° ! U µ ‘. ! El.Kassa/ ± ° · U ");
                applyWarn(2, errs.elkassa || errs.general, " [!¬ Q ± T ° ! U µ ‘. ! El.Kassa/ ± ° · U ");
                applyWarn(3, errs.elkassa || errs.general, " [!¬ Q ± T ° ! U µ ‘. ! El.Kassa/ ± ° · U ");
                applyWarn(4, errs.elkassa || errs.general, " [!¬ Q ± T ° ! U µ ‘. ! El.Kassa/ ± ° · U ");
                applyWarn(5, errs.yclients || errs.elkassa || errs.general, " [!¬ Q ± T °  U!  µ! ° YCLIENTS  Q » Q El.Kassa");
                applyWarn(6, errs.elkassa || errs.general, " [!¬ Q ± T ° ! U µ ‘. ! El.Kassa/ ± ° · U ");

                let nowStr = data.lastUpdate;
                if (!nowStr) nowStr = dayjs().format("HH:mm DD.MM.YYYY");
                const now = dayjs(nowStr, "HH:mm DD.MM.YYYY");

                let startStr = " \ °!! ° » U  T .";
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
                        revCard.querySelector('.card-subtext').innerText = `${startStr}-${endStr} (${curRev} vs ${prevRev} 2)`;
                    } catch(e) {}
                    
                    try {
                        const pCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(4) .card-value');
                        if (pCard) pCard.innerText = (data.revenue.today || 0).toLocaleString() + ' 2';
                    } catch(e) {}
                }
                
                if (data.returnRate) {
                    try {
                        const rrCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(2)');
                        rrCard.querySelector('.card-value').innerText = (data.returnRate.value || 0) + '%';
                        if (data.returnRate.drilldown && data.returnRate.drilldown[0]) {
                            rrCard.querySelector('.card-subtext').innerText = data.returnRate.drilldown[0].value;
                        } else {
                            rrCard.querySelector('.card-subtext').innerText = " Y U V U!! ° 64-32  ‘ !";
                        }
                    } catch(e) {}
                }
                
                if (data.cycle) {
                    try {
                        const cycleCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(3) .card-value');
                        if (cycleCard) cycleCard.innerText = (data.cycle.value || 0) + ' ‘';
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
            const myName = "  U!&  ° · °!  ."; // Mock for now per user request
            
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
                        document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(3) .card-subtext').innerText = sub + "   µ! !S !¬ Q!&!!";
                    }
                }
            }
            
            const avgRr = data.returnRate.value || 0;
            const rrEl = document.getElementById('master-rr');
            const rrSubEl = document.getElementById('master-rr-sub');
            if (myRr >= avgRr) {
                rrEl.style.color = '#34C759'; // Green if above average
                rrSubEl.innerText = ` !9!¬ µ !! µ ‘  µ V U  W U ! µ! Q (${avgRr.toFixed(1)}%)`;
            } else {
                rrEl.style.color = '#ff4444'; // Red
                rrSubEl.innerText = ` \ Q ¶ µ !! µ ‘  µ V U  W U ! µ! Q (${avgRr.toFixed(1)}%)`;
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
                            return v.includes(" · ° X µ!! °  Q    µ!") || v.includes("2Z&") || v.includes('!2!°!!˜!µ!') || !v || v.includes('! U V » °! U  °   U µ') || v.includes('!!!!"!"');
                        }).length;
                        const ovnScore = Math.round((passed / myChecks.length) * 100);
                        document.getElementById('master-ovn-score').innerText = ovnScore + '%';
                        document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(2) .card-subtext').innerText = `${passed}  Q · ${myChecks.length}  W! U  µ! U T`;
                    } else {
                        document.getElementById('master-ovn-score').innerText = '0%';
                        document.querySelector('#master-cabinet-section .metrics-grid .card:nth-child(2) .card-subtext').innerText = ` \ µ!  W! U  µ! U T`;
                    }
                }
            } catch(e) {}
            // Update Fines and Zone immediately
            try {
                const allFines = calculateFines(ovnList);
                const myFines = allFines[myName];
                if (myFines) {
                    document.getElementById('master-week-violations').innerText = myFines.weekViolations;
                    document.getElementById('master-total-fines').innerText = myFines.monthFines + ' 2';
                    
                    const zoneBadgeEl = document.getElementById('master-zone-badge');
                    if (myFines.state === 'Green') {
                        zoneBadgeEl.innerHTML = '@__^   " : " \ R ';
                        zoneBadgeEl.style.color = '#34C759';
                        zoneBadgeEl.style.background = 'rgba(52, 199, 89, 0.15)';
                    } else if (myFines.state === 'Yellow') {
                        zoneBadgeEl.innerHTML = '@__   " : ^ R ';
                        zoneBadgeEl.style.color = '#FF9F0A';
                        zoneBadgeEl.style.background = 'rgba(255, 159, 10, 0.15)';
                    } else if (myFines.state === 'Red') {
                        zoneBadgeEl.innerHTML = '@_‘  Y   R  \ R ';
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
                const search = target === 'ovn' ? '  Q ‘ µ U T U !! U »!
' : (target === 'lates' ? ' U W U · ‘ °  Q!' : (target === 'schedule' ? ' V! °! Q T' : ' °  ° » Q! Q T °'));
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
            select.innerHTML = '<option value=""> !9 ± µ! Q! µ  X °!! µ! °</option>';
            
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
                btn.innerText = '2
:   U!&! °  µ  Q µ...';
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

                if (!res.ok) throw new Error('  µ!  µ!  U!  µ! Q » ' + res.status);

                // Explicitly clear and close
                document.getElementById('ovn-form').reset();
                closeOVNModal();
                
                // Refresh list
                await loadOVNHistory();
                console.log('Save success, UI updated.');
            } catch (err) {
                console.error('Save error:', err);
                alert(' \ µ !S ‘ ° » U!!
 ! U!&! °  Q!!
: ' + err.message);
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
                    " R » µ T! µ µ ! T °!": { total:0, ok:0, masters:{} },
                    "  °!!¬ ° ! T °!": { total:0, ok:0, masters:{} },
                    " _ °!! Q · ° ! T °!": { total:0, ok:0, masters:{} },
                    "  ! · °  T °": { total:0, ok:0, masters:{} },
                    "  U T U »": { total:0, ok:0, masters:{} },
                    " ^ µ T!! Q »!
!0 Q T Q": { total:0, ok:0, masters:{} }
                };
                
                const curMonth = dayjs().format('YYYY-MM');
                reports.forEach(r => {
                    const rMonth = dayjs(r.createdAt).format('YYYY-MM');
                    if (rMonth === curMonth) {
                        totalMtd++;
                        const lowV = (r.violation || "").toLowerCase();
                        const isOk = lowV.includes('  µ!') || lowV.includes('2Z&');
                        if (isOk) passed++;
                        
                        const loc = r.location || " \ µ Q ·  µ!!  U";
                        if (branchData[loc]) {
                            branchData[loc].total++;
                            if (isOk) branchData[loc].ok++;
                            
                            const b = r.barber || " \ µ Q ·  µ!!  U";
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
                    if (eLoc === ' R » µ T! µ µ ! T °!') eLoc = ' R » µ T! µ µ ! T °! 2?Q';
                    if (eLoc === '  °!!¬ ° ! T °!') eLoc = '  °!!¬ ° ! T °! 2?Q';
                    if (eLoc === ' _ °!! Q · ° ! T °!') eLoc = ' _ °!! Q · ° ! T °! 2?Q';
                    return {
                        name: eLoc,
                        value: `${rate}% (${bD.ok}/${bD.total})`,
                        trend: rate >= 80 ? 'up' : 'down',
                        masters: Object.keys(bD.masters).sort().map(m => {
                            const mD = bD.masters[m];
                            const mRate = mD.total > 0 ? ((mD.ok / mD.total)*100).toFixed(0) : 0;
                            return { name: m, v: `${mRate}% (${mD.ok}  Q · ${mD.total})` };
                        })
                    };
                });
                
                const cardVal = document.getElementById('card-ovn-runrate');
                const cardSub = document.getElementById('card-ovn-subtext');
                if(cardVal) cardVal.innerText = ovnPerc + '%';
                if(cardSub) cardSub.innerText = `${passed}  Q · ${totalMtd}  ± µ ·  · ° X µ!! °  Q `;

                if (window.USER && window.USER.role === 'master') {
                    const myName = window.USER.name;
                    const myOvn = reports.filter(r => r.barber === myName);
                    if (myOvn.length > 0) {
                        const successCount = myOvn.filter(r => {
                            const lowV = (r.violation || "").toLowerCase();
                            return lowV.includes('  µ!') || lowV.includes('2Z&');
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
                            scoreEl.innerText = ' \ µ!  ‘ °  !9!&';
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
                        counterEl.innerText = ` [!! ° » U!!
  W! U  µ! U T: ${remaining}`;
                        counterEl.style.color = "#FF9F0A";
                    } else {
                        counterEl.innerText = ` _! U  µ! T Q  · °  µ!!¬ µ !9 2Z&`;
                        counterEl.style.color = "#34C759";
                    }
                }

                window.editOvnRow = async function(id) {
                    const newNotes = prompt("   µ ‘ ° T! Q! U  °  Q µ (! U »!
 T U 1 ! ° ·):");
                    if (!newNotes) return;
                    
                    const time = dayjs().format("HH.mm");
                    const user = (window.USER && window.USER.name) || " Y! µ  Q!";
                    const finalNotes = newNotes + " ( U!! µ ‘ ° T! Q! U  °  U " + time + " " + user + ")";
                    
                    try {
                        const res = await fetch('/api/ovn', {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ id, notes: finalNotes })
                        });
                        if (res.ok) {
                            loadOVNHistory();
                        } else {
                            alert(" [!¬ Q ± T °  W! Q ! U!&! °  µ  Q Q");
                        }
                    } catch (e) {
                         alert(" [!¬ Q ± T ° ! µ! Q");
                    }
                };

                const renderRow = (r) => {
                    const lowV = (r.violation || "").toLowerCase();
                    let badgeClass = 'badge-no';
                    if (lowV.includes('  µ!') || lowV.includes('2Z&')) badgeClass = 'badge-yes';

                    const matchVal = (r.match || "").trim() === ' ‘ °';
                    const matchTag = matchVal 
                        ? `<span style="color:#34C759; margin-left:4px" title=" § µ T ! U  W ° ‘ ° µ!">2</span>`
                        : `<span style="color:#FF3B30; margin-left:4px" title="   °!!& U ¶ ‘ µ  Q µ">2</span>`;

                    const notesRaw = r.notes || '-';
                    const canEdit = !notesRaw.includes(' U!! µ ‘ ° T! Q! U  °  U');
                    const editIcon = canEdit ? `<span style="cursor:pointer; margin-left:8px; display:inline-block;" onclick="editOvnRow(${r.id})" title="   µ ‘ ° T! Q! U  °!!
">2Z?Q</span>` : '';

                    return `<tr>
                        <td data-label=" Z R  ^ "  " style="font-size:14px; padding-left:25px"><b>${r.barber}</b></td>
                        <td data-label=" \ R     " \ ˜ ""><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
                        <td data-label="  R ^ R  _   [  Z." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        <td data-label="  R : [ \" style="font-size:13px; font-weight:700; color:var(--accent)">${r.location}</td>
                        <td style="font-size:13px; opacity:0.7">
                            ${dayjs(r.date || "").format('DD.MM')} ${r.time || ""} 
                            ${matchTag}
                        </td>
                        <td data-label="   R  [ ^ R" style="font-size:12px; opacity:0.7">
                            ${notesRaw}${editIcon}
                        </td>
                    </tr>`;
                };

                const tblToday = document.getElementById('ovn-today-history');
                if (tblToday) {
                    tblToday.innerHTML = todayReports.length ? todayReports.map(renderRow).join('') : '<tr><td colspan="6" style="text-align:center; padding:40px; opacity:0.5">  µ V U ‘ !  W! U  µ! U T  µ!0 µ   µ  ±!9 » U</td></tr>';
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
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; opacity:0.5">  !! U X  W µ! Q U ‘ µ   µ!  · ° W Q! µ </td></tr>';
                return;
            }

            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                let badgeClass = 'badge-no';
                if (lowV.includes('  µ!') || lowV.includes('2Z&')) badgeClass = 'badge-yes';

                const matchVal = (r.match || "").trim() === ' ‘ °';
                const matchTag = matchVal 
                    ? `<span style="color:#34C759; margin-left:4px" title=" § µ T ! U  W ° ‘ ° µ!">2</span>`
                    : `<span style="color:#FF3B30; margin-left:4px" title="   °!!& U ¶ ‘ µ  Q µ">2</span>`;

                const notesRaw = r.notes || '-';
                const canEdit = !notesRaw.includes(' U!! µ ‘ ° T! Q! U  °  U');
                const editIcon = canEdit ? `<span style="cursor:pointer; margin-left:8px; display:inline-block;" onclick="editOvnRow(${r.id})" title="   µ ‘ ° T! Q! U  °!!
">2Z?Q</span>` : '';

                return `<tr>
                    <td data-label=" Z R  ^ "  " style="font-size:14px; padding-left:25px"><b>${r.barber}</b></td>
                    <td data-label=" \ R     " \ ˜ ""><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
                    <td data-label="  R ^ R  _   [  Z." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        ${dayjs(r.createdAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') ? '<span style="color:var(--accent); margin-left:3px">2</span>' : ''}
                    </td>
                    <td data-label="  R : [ \" style="font-size:13px; font-weight:700; color:var(--accent)">${r.location}</td>
                    <td style="font-size:13px; opacity:0.7">
                        ${dayjs(r.date || "").format('DD.MM')} ${r.time || ""} 
                        ${matchTag}
                    </td>
                    <td data-label="   R  [ ^ R" style="font-size:12px; opacity:0.7">${notesRaw}${editIcon}</td>
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
                        if (dateEl) dateEl.innerHTML = `<span style="color: #34C759">2 LIVE</span>  [ ±  U  » µ  U: ${data.lastUpdate || '! U »!
 T U !!! U'}`;
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
              if (btn) { btn.innerHTML = '@_   ° V!!S · T °...'; btn.disabled = true; }
              await fetch('/api/sync', { method: 'POST', body: JSON.stringify({}) });
              
              const check = setInterval(async () => {
                  try {
                      const res = await fetch('/api/sync_status');
                      const data = await res.json();
                      if (!data.isSyncing) {
                          clearInterval(check);
                          if (btn) { btn.innerHTML = '@_  [ ±  U  Q!!
 ! µ !! °!'; btn.disabled = false; }
                          loadData();
                      }
                  } catch(e) {}
              }, 2000);
          }

        async function loadLatesHistory() {
            try {
                console.log('@_ Loading Lates... Database check...');
                const [ovnRes, schedRes] = await Promise.all([
                    fetch('/api/ovn').then(r => r.json()).catch(() => []),
                    fetch('/api/schedule').then(r => r.json()).catch(() => [])
                ]);
                
                const date = dayjs().format('YYYY-MM-DD');
                const loc = document.getElementById('lates-audit-loc').value || " R » µ T! µ µ ! T °!";
                window.lastOvnRes = ovnRes;

                // 1. WORKFORCE AUDIT (GRID)
                const sched = schedRes.find(s => s.date === date && s.location === loc) || { masters: [] };
                const mastersList = sched.masters || [];
                const checksForSelectedDay = ovnRes.filter(r => dayjs(r.date || r.createdAt).format('YYYY-MM-DD') === date && r.location === loc);

                document.getElementById('lates-workforce-audit').innerHTML = mastersList.map(m => {
                    const check = checksForSelectedDay.find(r => r.barber === m.name);
                    const isChecked = !!check;
                    const statusColor = isChecked ? (check.violation === "  ° X µ!! °  Q    µ!" || (check.violation||"").includes('  2  °  !˜  µ ') ? "#34C759" : "#FF3B30") : "rgba(255,255,255,0.1)";
                    const latenessMsg = isChecked ? (check.violation === "  ° X µ!! °  Q    µ!" || (check.violation||"").includes('  2  °  !˜  µ ') ? "2Z&   U ! µ X!" : "2Y ?Q  [ W U · ‘ °  Q µ") : " [ ¶ Q ‘ °  Q µ...";

                    return `
                        <div class="card" style="padding: 20px; border-top: 4px solid ${statusColor};">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                                <span style="font-weight:700; font-size:16px">${m.name || ' Z °!! µ!'}</span>
                                <span style="font-size:11px; padding:3px 8px; background:rgba(255,255,255,0.05); border-radius:6px; color:var(--text-muted)">
                                    ${m.isReplacement ? '  ° X µ  °' : ' [!  U   U '}
                                </span>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items:end">
                                <div class="form-field">
                                    <label> _ » ° </label>
                                    <input type="text" class="sched-plan" value="${m.startTime || '--:--'}" readonly disabled style="padding:8px; background: rgba(255,255,255,0.05); color: var(--text-muted); border-color: transparent; text-align: center;">
                                </div>
                                <div class="form-field">
                                    <label> ¤ ° T!</label>
                                    <input type="time" class="sched-fact" value="${check ? check.time : ''}" style="padding:8px" 
                                           onchange="updateLateness(this, '${(m.name || '').replace(/\s+/g, '')}')">
                                </div>
                            </div>
                            <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:center">
                                <div id="late-calc-${(m.name || '').replace(/\s+/g, '')}" style="font-size:13px; font-weight:700">${latenessMsg}</div>
                                <button class="btn-refresh" style="padding:6px 16px; font-size:12px; border:1px solid ${isChecked ? '#555' : 'var(--accent)'};" 
                                        onclick="quickSaveLate('${m.name || ''}', this)">
                                    ${isChecked ? ' [ ±  U  Q!!
' : '  U!&! °  Q!!
'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('') || `<div style="grid-column: span 3; color:var(--text-muted); text-align:center; padding:40px"> ! °! Q T  W!S!!.</div>`;

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
                    counterEl.innerText = ` [!! ° » U!!
  W! U  µ! Q!!
  ! µ V U: ${remainingGlobal}`;
                    counterEl.style.color = "#FF9F0A";
                } else if (totalMastersGlobal > 0) {
                    counterEl.innerText = ` ! µ ! U!! T Q  W! U  µ! µ !9 2Z&`;
                    counterEl.style.color = "#34C759";
                } else {
                    counterEl.innerText = " ! °! Q T   µ ! U!! °  » µ ";
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
                console.error('@_‘ Lates critical error:', e); 
                document.getElementById('lates-history').innerHTML = '<tr><td colspan="7" style="color:red"> [!¬ Q ± T °  · ° V!!S · T Q  ‘ °  !9!&</td></tr>';
            }
        }

        function updateLateness(el, barberId) {
            const card = el.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = card.querySelector('.sched-fact').value;
            const resEl = document.getElementById(`late-calc-${barberId}`);
            if (plan && fact) {
                const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
                resEl.innerHTML = diff > 0 ? `<span style="color:#FF3B30">2Y ?Q  [ W U · ‘ °  Q µ: ${diff}  X Q </span>` : `<span style="color:#34C759">2Z&   U ! µ X!</span>`;
            }
        }

        window.applyLatesPreset = function() {
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
                return v.includes(' U W U · ‘ ° »') || v.includes('!!"!!!!"!·!"');
            }).sort((a,b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
            
            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                const isOk = lowV === " · ° X µ!! °  Q    µ!" || lowV.includes('!2!°!!˜!µ!') || !lowV;

                let badgeStyles = 'background: rgba(255,255,255,0.05); color: #888;';
                if (lowV.includes('! U V » °! U  °   U µ') || lowV.includes('!!!!"!"!2Y!!')) badgeStyles = 'background: rgba(52,199,89,0.1); color: #34C759;';
                else if (lowV.includes(' U W U · ‘ ° »') || lowV.includes('!!"!!!!"!·!"') || (r.schedTime && r.time > r.schedTime)) {
                     badgeStyles = 'background: rgba(255,59,48,0.1); color: #FF3B30; font-weight:700;';
                }

                let delayText = '-';
                if (r.schedTime && r.time) {
                    const diff = dayjs(`2000-01-01 ${r.time}`).diff(dayjs(`2000-01-01 ${r.schedTime}`), 'minute');
                    if (diff > 0) delayText = `+${diff}  X Q `;
                    else if (diff < 0) delayText = `${Math.abs(diff)}  X Q  ! ° !
!¬ µ`;
                    else delayText = '  U ! µ X!';
                }

                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.01); height: 50px;">
                    <td style="font-size:14px; padding-left:25px"><b>${r.barber || ' Z °!! µ!'}</b></td>
                    <td><span style="display:inline-block; padding:4px 10px; border-radius:8px; font-size:12px; ${badgeStyles}; text-align:center;">${r.violation || (delayText.includes('+') ? ' [ W U · ‘ ° »' : (isOk ? ' [ T' : '-'))}</span></td>
                    <td style="font-size:11px; white-space:nowrap; opacity:0.6;">${dayjs(r.date || r.createdAt || new Date()).format('DD.MM HH:mm')}</td>
                    <td style="font-size:14px; font-weight:700; color:var(--accent)">${r.location || '...'}</td>
                    <td style="font-size:13px; opacity:0.7">${r.schedTime || '--:--'}</td>
                    <td style="font-size:13px; color:white"><b>${r.time || '--:--'}</b></td>
                    <td style="font-size:13px; color:${delayText.includes('+') ? '#FF3B30' : (isOk ? '#34C759' : 'inherit')}"><b>${delayText}</b></td>
                </tr>`;
            }).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; opacity:0.5"> !S!  ° »  W!S!!</td></tr>';
        };

        async function quickSaveLate(barber, btn) {
            const card = btn.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = card.querySelector('.sched-fact').value;
            if (!fact) { alert('  T ° ¶ Q! µ ! ° T! Q!! µ! T U µ  ! µ X!  W! Q!& U ‘ °'); return; }

            const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
            const violation = diff > 0 ? ' Z °!! µ!  U W U · ‘ ° »' : '  ° X µ!! °  Q    µ!';
            const fine = diff > 0 ? 500 : 0;

            const report = {
                location: document.getElementById('lates-audit-loc').value,
                barber: barber,
                date: dayjs().format('YYYY-MM-DD'),
                time: fact,
                schedTime: plan,
                fine: fine,
                slot: "1",
                match: " ‘ °",
                violation: violation,
                notes: diff > 0 ? ` [ W U · ‘ °  Q µ   ° ${diff}  X Q ` : ' [! T!!9! Q µ   U ! µ X!'
            };

            try {
                btn.innerText = '2
:...';
                const res = await fetch('/api/ovn', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(report)
                });
                if (!res.ok) throw new Error('Server error');
                btn.innerText = '2Z&   U! U  U';
                setTimeout(() => loadLatesHistory(), 500);
            } catch(e) {
                alert(' [!¬ Q ± T ° ! U!&! °  µ  Q!: ' + e.message);
                btn.innerText = ' [!¬ Q ± T °';
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
                .filter(c => (c.classList.contains('work') || c.innerText.toLowerCase().includes('! ° ±') || c.innerText.toLowerCase().includes(' ‘ U')) && !c.innerText.toLowerCase().includes(' !9!& U ‘  U ') && !c.innerText.toLowerCase().includes(' !9!&'))
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
                        if (timeText === ' !9!& U ‘  U ' || timeText === ' !9!&') {
                            cell.classList.remove('work', 'replacement');
                        } else {
                            cell.classList.add('work');
                            cell.classList.remove('replacement');
                        }
                    });
                } else {
                    let finalVal = timeText;
                    if (pendingReplacementMaster) {
                        finalVal = pendingReplacementMaster + ' (' + timeText + ') (  R Z " \ R)';
                        currentContextCell.el.classList.add('replacement');
                    }
                    
                    currentContextCell.el.innerText = finalVal;
                    
                    if (timeText === ' !9!& U ‘  U ' || timeText === ' !9!&') {
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
            const val = prompt('   µ ‘ Q! µ  ! µ X! (  ° W! Q X µ!,   10  ‘ U 20):');
            if (val) applyTime(val);
        }

        function clearCell() {
            if (currentContextCell) {
                currentContextCell.el.innerText = ' !9!& U ‘  U ';
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
            
            let headHtml = '<tr><th class="sched-master-name"> Z °!! µ! /   °! °</th>';
            const rusDays = ['  ', ' _ \', '  ^', '   ', ' § ^', ' _ ^', '  '];
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
                    bodyHtml += `<tr><td class="sched-master-name sched-master-row-btn" onclick="showRowTimePicker(event, '${loc}', '${m}')" title=" !9 ±! °!!
  V! °! Q T   °   µ!!
  X µ!!! ">${m}</td>`;
                    for (let i = 0; i < 31; i++) {
                        const date = startDate.add(i, 'day').format('YYYY-MM-DD');
                        const entry = schedData.find(s => s.date === date && s.location === loc);
                        const entryMasters = (entry && Array.isArray(entry.masters)) ? entry.masters : [];
                        const masterData = entryMasters.find(x => x.name === m);
                        
                        let val = ' !9!& U ‘  U ';
                        let cls = '';
                        if (masterData) {
                            val = masterData.text || (masterData.startTime === '10:00' ? '  10  ‘ U 22' : (masterData.startTime === '09:00' ? '  09  ‘ U 22' : '! ° ±'));
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
                bodyHtml += `<tr style="opacity: 0.6;"><td class="sched-master-name" style="font-size: 11px;"> \ U !9  /   ° X µ  °</td>`;
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
                                    onclick="showContextMenu(event, '${date}', '${loc}', 'NEW')"
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
            btn.innerText = '2
:   U!&! °  µ  Q µ...';
            btn.disabled = true;

            const gridData = {}; // { "date|loc": [masters] }
            
            document.querySelectorAll('.sched-cell').forEach(cell => {
                const date = cell.dataset.date;
                const loc = cell.dataset.loc;
                const master = cell.dataset.master;
                const text = cell.innerText.trim();
                
                const key = `${date}|${loc}`;
                if (!gridData[key]) gridData[key] = [];
                
                if (text === '' || text.toLowerCase() === ' !9!& U ‘  U ' || text.toLowerCase() === ' !9!&') return;
                
                if (master === 'NEW') {
                    // Split multiple replacements if any
                    text.split(',').forEach(m => {
                        gridData[key].push({
                            name: m.replace('(  R Z " \ R)', '').trim(),
                            isReplacement: true,
                            startTime: '10:00', // Default
                            text: m.trim()
                        });
                    });
                } else {
                    gridData[key].push({
                        name: master,
                        isReplacement: text.includes('(  R Z " \ R)'),
                        startTime: text.includes('09') ? '09:00' : '10:00',
                        text: text
                    });
                }
            });

            try {
                const payload = Object.entries(gridData).map(([key, masters]) => {
                    const [date, location] = key.split('|');
                    return { date, location, masters };
                });
                
                const resp = await fetch('/api/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!resp.ok) throw new Error('Bad server response');
                btn.innerText = '2Z&   U!&! °  µ  U';
                setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
            } catch (e) {
                alert(' [!¬ Q ± T ° ! U!&! °  µ  Q!');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }

        window.USER = null;

                window.onload = async () => {

            const urlParams = new URLSearchParams(window.location.search);
            const getCookie = (name) => {
                let m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[]\/+^])/g, '\\$1') + "=([^;]*)"));
                return m ? decodeURIComponent(m[1]) : undefined;
            };
            
            let urlId = urlParams.get('tg_id');
            let tg_id = urlId || localStorage.getItem('tg_id') || getCookie('tg_id');
            
            if (tg_id) {
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
                            document.getElementById('welcome-msg').innerText = ` _! Q  µ!, ${user.name} @_9`;
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
            if (hash) {
                switchTab(hash);
            } else {
                if (window.USER?.role === 'ovn') switchTab('ovn', document.getElementById('tab-ovn'));
                else if (window.USER?.role === 'master') switchTab('master-cabinet', document.getElementById('tab-master'));
                else switchTab('analytics', document.getElementById('tab-analytics'));
            }
            setInterval(loadData, 30000);
            loadOVNHistory();
            loadLatesHistory();
            loadSchedule();
            loadMasterSchedule();
            loadManagerChecks();
        }

        function applyRoleConstraints() {
            const role = window.USER.role;
            if (role === 'owner' || role === 'manager') {
                document.getElementById('adapter-btn').style.display = 'block';
                document.getElementById('tab-manager').style.display = 'inline-block';
                document.getElementById('tab-master').style.display = 'inline-block';
            } else if (role === 'ovn') {
                document.getElementById('tab-analytics').style.display = 'none';
                document.getElementById('tab-master').style.display = 'none';
                document.getElementById('tab-manager').style.display = 'none';
                document.getElementById('tab-ovn').style.display = 'inline-block';
                document.getElementById('tab-lates').style.display = 'inline-block';
                document.getElementById('tab-schedule').style.display = 'inline-block';
                const hintEl = document.getElementById('schedule-hint-text');
                if (hintEl) hintEl.style.display = 'block';
                switchTab('ovn', document.getElementById('tab-ovn'));
            } else if (role === 'master') {
                document.getElementById('tab-analytics').style.display = 'none';
                document.getElementById('tab-ovn').style.display = 'none';
                document.getElementById('tab-lates').style.display = 'none';
                document.getElementById('tab-schedule').style.display = 'none';
                document.getElementById('tab-manager').style.display = 'none';
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
                document.getElementById('drilldown-title').innerText = '  µ! ° » Q · °!  Q!:  Y °!! µ!!  U  [  \ (  °  X µ!!! )';
                document.getElementById('drilldown-body').innerHTML = window.OVN_DRILLDOWN.map((item, idx) => `
                    <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                        <td><span class="chevron">2T</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '2 ' : '2 ˜'}</td>
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
            document.getElementById('drilldown-title').innerText = '  µ! ° » Q · °!  Q!: ' + type;
            document.getElementById('drilldown-body').innerHTML = data.drilldown.map((item, idx) => `
                <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                    <td><span class="chevron">2T</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '2 ' : '2 ˜'}</td>
                </tr>
                ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
            `).join('');
            window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        }

        window.openAdapterModal = openAdapterModal;
window.closeAdapterModal = closeAdapterModal;
window.addAdapterBranch = addAdapterBranch;
window.addAdapterMaster = addAdapterMaster;
window.saveAdapter = saveAdapter;
        function openAdapterModal() {
            const container = document.getElementById('adapter-gui-container');
            let html = '';
            
            for (const [branchName, config] of Object.entries(ADAPTER)) {
                html += `
                <div class="adapter-branch" data-branch="${branchName}" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #333;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
                        <input type="text" class="branch-name-input" value="${branchName}" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-weight: bold; font-size: 16px;" placeholder=" \ ° ·  °  Q µ ! Q » Q ° » °">
                        <input type="text" class="branch-term-input" value="${config.el_kassa_terminal || ''}" placeholder="El.Kassa  ^ µ! X Q  ° »" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                        <input type="text" class="branch-yc-input" value="${config.yclients_company_id || ''}" placeholder="YClients ID" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                        <button onclick="this.closest('.adapter-branch').remove()" style="background: #ff4444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">  ‘ ° » Q!!
</button>
                    </div>
                    
                    <div class="masters-list" style="padding-left: 20px; border-left: 2px solid #333; overflow-x: auto; padding-bottom: 5px;"><div style="min-width: 680px;"><div style="font-size: 12px; color: #888; margin-bottom: 5px; display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 80px 80px 42px; gap: 10px; align-items: center;">
                            <span> ˜ X!     °!¬ ± U! ‘ µ (dash)</span>
                            <span> ˜ X µ  °    ­ » T °!! µ (!! µ! µ ·  · ° W!!!S!)</span>
                            <span>YClients Staff ID</span>
                            <span> !9!& U ‘</span>
                            <span> _! U!  µ !</span>
                            <span></span>
                        </div>
                `;
                
                if (config.masters) {
                    for (const master of config.masters) {
                        html += `
                        <div class="adapter-master" style="display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 80px 80px 42px; gap: 10px; margin-bottom: 8px; align-items: center;">
                            <input type="text" class="m-dash" value="${master.dash || ''}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: var(--accent); padding: 6px; border-radius: 4px;">
                            <input type="text" class="m-el" value="${(master.el_kassa || []).join(', ')}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="  U!&  ° · °!  .,   U!&  ° · °!">
                            <input type="text" class="m-yc" value="${master.yclients_id || ''}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="YClients ID">
                            <input type="number" class="m-base" value="${master.payBase || 3000}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder=" !9!& U ‘">
                            <input type="number" class="m-percent" value="${master.payPercent || 40}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="%">
                            <button onclick="this.closest('.adapter-master').remove()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 0; border-radius: 4px; cursor: pointer; text-align: center;">2Z"</button>
                        </div>`;
                    }
                }
                
                html += `
                        <button onclick="addAdapterMaster(this)" style="margin-top: 10px; background: transparent; border: 1px dashed #555; color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">+   U ± °  Q!!
  X °!! µ! °</button>
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
                    <input type="text" class="branch-name-input" value=" \ U !9  ! Q » Q ° »" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-weight: bold; font-size: 16px;">
                    <input type="text" class="branch-term-input" value="" placeholder="El.Kassa  ^ µ! X Q  ° »" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                    <input type="text" class="branch-yc-input" value="" placeholder="YClients ID" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                    <button onclick="this.closest('.adapter-branch').remove()" style="background: #ff4444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">  ‘ ° » Q!!
</button>
                </div>
                <div class="masters-list" style="padding-left: 20px; border-left: 2px solid #333; overflow-x: auto; padding-bottom: 5px;">
                    <button onclick="addAdapterMaster(this)" style="margin-top: 10px; background: transparent; border: 1px dashed #555; color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">+   U ± °  Q!!
  X °!! µ! °</button>
                </div>
            `;
            container.insertBefore(div, container.firstChild);
        }

        function addAdapterMaster(btn) {
            const list = btn.closest('.masters-list');
            const div = document.createElement('div');
            div.className = 'adapter-master';
            div.style.cssText = "display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 80px 80px 42px; gap: 10px; margin-bottom: 8px; align-items: center;";
            div.innerHTML = `
                <input type="text" class="m-dash" value=" ˜ X!" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: var(--accent); padding: 6px; border-radius: 4px;">
                <input type="text" class="m-el" value="" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder=" ˜ X µ  °   ! » T °!! µ !! µ! µ ·  · ° W!!!S!">
                <input type="text" class="m-yc" value="" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="YClients ID">
                <input type="number" class="m-base" value="3000" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder=" !9!& U ‘">
                <input type="number" class="m-percent" value="40" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="%">
                <button onclick="this.closest('.adapter-master').remove()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 0; border-radius: 4px; cursor: pointer; text-align: center;">2Z"</button>
            `;
            btn.parentNode.insertBefore(div, btn);
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
                        const mBase = parseFloat(mDiv.querySelector('.m-base').value) || 3000;
                        const mPercent = parseFloat(mDiv.querySelector('.m-percent').value) || 40;
                        
                        masters.push({
                            dash: mDash,
                            el_kassa: mElArray,
                            yclients_id: mYc,
                            payBase: mBase,
                            payPercent: mPercent
                        });
                    });
                    
                    newAdapter[bName] = {
                        el_kassa_terminal: term,
                        yclients_company_id: ycid,
                        masters: masters
                    };
                });

                btn.innerText = '  U!&! °  µ  Q µ...';
                
                const res = await fetch('/api/adapter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newAdapter)
                });
                
                if(res.ok) {
                    btn.innerText = '2Z&   U!&! °  µ  U';
                    setTimeout(() => { btn.innerText = '  U!&! °  Q!!
  Q · X µ  µ  Q!'; closeAdapterModal(); location.reload(); }, 1500);
                } else {
                    throw new Error(' [!¬ Q ± T °  W! Q ! U!&! °  µ  Q Q   ° ! µ!  µ! µ');
                }
            } catch(e) {
                alert(' [!¬ Q ± T ° ! U!&! °  µ  Q!:\n' + e.message);
                btn.innerText = '  U!&! °  Q!!
  Q · X µ  µ  Q!';
            }
        }

        // ================= MANAGER CABINET LOGIC =================
        const MANAGER_CHECK_FIELDS = [
            { id: 1, label: ' \ °!!S ¶  °! ! µ T » ° X °  Q! W! °   °, !! Q!! °!.', photo: 'required' },
            { id: 2, label: '   ° X T Q ! !  µ  ° X Q, !  µ! Q »!
  Q T Q, ! µ » µ  Q · U!...', photo: 'optional' },
            { id: 3, label: ' Z °!! µ! °   ! U! X µ, ! U! X ° !! Q!! °!,  U ±!S !
  · ° T!!9! U V U ! Q W °.', photo: 'required' },
            { id: 4, label: ' Y! µ! » U ! ° ·  µ! !S! U  T U  !& U ‘!S,   °  T! µ! » µ  W µ !
! °!', photo: 'required' },
            { id: 5, label: ' ^ µ » µ  Q · U!  Q  X!S ·!9 T ° »!
 !9  !  µ !!   T »!!! µ !9', photo: 'optional' },
            { id: 6, label: ' ˜ !!!!S X µ !  X °!! µ! °    Q! W! °   U X ! U!! U!  Q Q.', photo: 'optional' },
            { id: 7, label: ' \ ° !¬ T °! °!&   µ!   U » U!,   µ!  » Q!! !9!&   µ!0 µ ', photo: 'optional' },
            { id: 8, label: '  ! ° » U  µ ! µ X W µ! °!!S! °    ‘ Q ° W ° · U  µ 19-23  V! ° ‘!S! °...', photo: 'optional' },
            { id: 9, label: ' \ °  Z U  T µ  Q  ‘!!S V Q!&  W U  µ!!&  U!!!!&   µ  » µ ¶ °! !!! W T Q...', photo: 'required' },
            { id: 10, label: '   · ° » µ   µ  » µ ¶ °!  T U! U ± T Q  W! U X U!S! µ! U ...', photo: 'optional' },
            { id: 11, label: ' Z!S ·!9 T °  Q V! ° µ!  Q · ! U V » °! U  °   U V U  W » µ - » Q!! °...', photo: 'optional' },
            { id: 12, label: ' _! U  µ! T ° ! µ!&  Q!! µ! T U  !! °!! Q...', photo: 'optional' },
            { id: 13, label: ' Y U !!S »!
! °!  Q!  W µ! µ ‘ !!! Q ¶ T U ...', photo: 'optional' },
            { id: 14, label: ' ¦  µ! !9 µ  ±!S!!9 » U!! T Q,  T U! X µ! Q T °   µ  Q ·   °!¬ µ   X °!! Q! !9  U!!!S!!! !S!!', photo: 'required' },
            { id: 15, label: ' _! U  µ! T °  ± » Q ¶ ° !¬ Q!&  · ° W Q! µ  !S  ! µ!&  X °!! µ! U ', photo: 'optional' },
            { id: 16, label: ' ! µ   °!!S!¬ µ  Q!  Q · ! ° ± » Q! !9  · °  W U! » µ ‘  Q µ 48 !! °! U   W! U! ° ± U! ° !9   °  X µ!! µ', photo: 'optional' },
            { id: 17, label: '  U!! °  » µ  Q µ  V! °! Q T °', photo: 'optional' }
        ];

        window.openManagerModal = function() {
            const container = document.getElementById('manager-fields-container');
            let html = '';
            MANAGER_CHECK_FIELDS.forEach(f => {
                html += `
                    <div class="form-field" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                        <label style="font-size: 15px; margin-bottom: 10px;">${f.id}. ${f.label}</label>
                        <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                            <label><input type="radio" name="check_${f.id}" value="yes" required>   ° /  \ U! X °</label>
                            <label><input type="radio" name="check_${f.id}" value="no">  \ µ! /  \ °!!S!¬ µ  Q µ</label>
                            <label><input type="radio" name="check_${f.id}" value="fixed">  ˜! W! °  » µ  U</label>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: start;">
                            <input type="text" id="comment_${f.id}" placeholder=" Y U X X µ ! °! Q ..." required style="flex: 1; border-radius: 6px; padding: 10px; background: #000; border: 1px solid #444; color: #fff;">
                            <div style="display: flex; flex-direction: column; gap: 5px;">
                                <input type="file" id="photo_${f.id}" accept="image/*" ${f.photo === 'required' ? 'required' : ''} style="width: 200px; font-size: 12px; color: #fff;">
                                ${f.photo === 'required' ? '<span style="color: #ff4444; font-size: 10px;"> ¤ [ ^ [  [    R ^ " : ¬ \ [</span>' : '<span style="color: #888; font-size: 10px;"> ¤ U! U  U W!  Q U  ° »!
  U</span>'}
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
            
            const locSelect = document.getElementById('manager-location');
            locSelect.innerHTML = '<option value=""> !9 ± µ! Q! µ ! ° » U ...</option>';
            Object.keys(ADAPTER).forEach(loc => {
                locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
            });

            document.getElementById('manager-modal').classList.add('active');
        }

        window.closeManagerModal = function() {
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

        window.submitManagerCheck = async function(e) {
            e.preventDefault();
            const btn = document.getElementById('manager-submit-btn');
            btn.disabled = true;
            btn.innerText = '  ° V!!S · T ° ! U! U...';

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

                btn.innerText = '  U!&! °  µ  Q µ...';

                const res = await fetch('/api/manager_checks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(checkData)
                });

                if (res.ok) {
                    btn.innerText = '2Z&   U! U  U';
                    setTimeout(() => {
                        closeManagerModal();
                        loadManagerChecks();
                        btn.disabled = false;
                        btn.innerText = ' [! W! °  Q!!
  W! U  µ! T!S';
                    }, 1000);
                } else {
                    throw new Error(' [!¬ Q ± T ° ! µ!  µ! °');
                }
            } catch (err) {
                console.error(err);
                alert(' [!¬ Q ± T °: ' + err.message);
                btn.disabled = false;
                btn.innerText = ' [! W! °  Q!!
  W! U  µ! T!S';
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
                            ? badItems.map(i => `<div style="margin-bottom:3px;"><strong> _. ${i.id}:</strong> ${i.comment}</div>`).join('') 
                            : '<span style="color:#34C759"> ˜ ‘ µ ° »!
  U ( ± µ ·   °!!S!¬ µ  Q )</span>';

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${dateStr}</td>
                            <td style="font-weight: 600;">${c.location}</td>
                            <td>${cleanItems} / ${totalItems}  !9 W U »  µ  U</td>
                            <td style="font-size: 11px; line-height: 1.3; max-width: 300px;">${issuesText}</td>
                            <td><button onclick="viewManagerCheck(${c.id})" class="btn-refresh" style="padding: 5px 10px;"> _! U! X U!!</button></td>
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
                <h2 style="color: #fff;"> [!!! µ!: ${check.location}</h2>
                <p style="color: #888;">${new Date(check.createdAt).toLocaleString('ru-RU')}</p><hr style="border-color: #333;">`;
            
            check.items.forEach(i => {
                const color = i.status === 'yes' ? '#34C759' : (i.status === 'fixed' ? '#FF9F0A' : '#FF3B30');
                const statusMap = { 'yes': '  R /  \ [   Z R', 'no': ' \ " ^ /  \ R     " \ ˜ "', 'fixed': ' ˜  _   R  : " \ [' };
                reportHtml += `
                    <div style="margin-bottom: 15px; border: 1px solid #333; padding: 15px; border-left: 5px solid ${color}; border-radius: 8px; background: #111;">
                        <div style="font-size: 15px; font-weight: bold; margin-bottom: 8px;">${i.id}. ${i.label}</div>
                        <div style="margin-bottom: 5px; color: ${color}; font-weight: bold;">[${statusMap[i.status]}]</div>
                        <div style="margin-bottom: 10px; color: #ddd; font-style: italic;"> Y U X X µ ! °! Q : ${i.comment}</div>
                        ${i.photo ? `<div style="margin-top: 10px;"><img src="${i.photo}" style="max-width: 100%; border-radius: 4px; border: 1px solid #444;"></div>` : ''}
                    </div>
                `;
            });
            reportHtml += `</div>`;
            
            const win = window.open('','_blank');
            win.document.body.style.backgroundColor = '#000';
            win.document.write(reportHtml);
        }

        /* FINES LOGIC */
        function getViolationFine(violationRaw, notesRaw, r) {
            if (r && r.isManualFine) return Number(r.cost) || 0;
            const v = (violationRaw || '').toLowerCase();
            const n = (notesRaw || '').toLowerCase();
            if (v.includes(' U W U · ‘ ° »') || n.includes(' U W U · ‘ °  Q')) {
                let minutes = 0;
                const match = n.match(/  °\s+(\d+)\s+ X Q /);
                if (match) minutes = parseInt(match[1]);
                if (minutes >= 30) return 1000;
                if (minutes >= 20) return 500;
                if (minutes >= 10) return 300;
                if (minutes > 0) return 300;
                return 500;
            }
            if (v.includes('  U! U !!  U')) return 5000;
            if (v.includes('  µ U W » °!! µ   °!') || v.includes('! µ! X Q  ° »')) return 5000;
            if (v.includes('  µ  !9!& U ‘') || v.includes('  µ !9!& U ‘')) return 5000;
            if (v.includes(' U! T ° ·')) return 1000;
            if (v.includes('  °! . ! ·!9 T µ') || v.includes('  °!  Q U  ° »!
 ')) return 500;
            if (v.includes(' µ ‘ ° ') || v.includes('  ° W Q! T Q ') || v.includes(' ± µ · ! U! X!9')) return 500;
            if (v.includes(' V!! ·  U µ')) return 500;
            if (v.includes(' Q !!!!S X µ !')) return 300;
            if (v.includes(' · µ! T ° » U')) return 300;
            if (v.includes(' · ° X µ!! °  Q    µ!') || v.includes('2Z&') || v.includes('!2!°!!˜!µ!')) return 0;
            return 300;
        }

        function isMandatoryFine(vRaw, nRaw, r) {
            if (r && r.isManualFine) return true;
            const v = (vRaw || '').toLowerCase();
            const n = (nRaw || '').toLowerCase();
            if (v.includes(' U W U · ‘ ° »') || n.includes(' U W U · ‘ °  Q')) return true;
            if (v.includes('  U! U !!  U')) return true;
            if (v.includes('  µ U W » °!! µ   °!') || v.includes('! µ! X Q  ° »')) return true;
            if (v.includes('  µ  !9!& U ‘') || v.includes('  µ !9!& U ‘')) return true;
            return false;
        }

        function calculateFines(reports) {
            const masters = {};
            reports.forEach(r => {
                const name = r.barber;
                if (!name) return;
                if (!masters[name]) masters[name] = { reports: [], loc: r.location };
                masters[name].reports.push(r);
            });

            const results = {};
            const currentMonth = dayjs().format('YYYY-MM');

            for (const master in masters) {
                const mReports = masters[master].reports.sort((a,b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());
                let state = 'Green';
                let currentMonthFines = 0;
                const weeks = {};
                
                mReports.forEach(r => {
                    const d = dayjs(r.date || r.createdAt);
                    const wId = d.isoWeek() + '-' + d.year();
                    if (!weeks[wId]) weeks[wId] = [];
                    weeks[wId].push(r);
                });
                
                const sortedWeeks = Object.keys(weeks).sort((a,b) => {
                    const [wA, yA] = a.split('-');
                    const [wB, yB] = b.split('-');
                    if (yA !== yB) return yA - yB;
                    return wA - wB;
                });

                const currentWeekId = dayjs().isoWeek() + '-' + dayjs().year();
                let currentWeekViolationsCount = 0;
                let isCurrentMonth = false;

                for (const wId of sortedWeeks) {
                    const weekReports = weeks[wId];
                    let violationsCount = 0;
                    let lateCount = 0;
                    const weekViolationsList = [];
                    
                    isCurrentMonth = weekReports.some(r => dayjs(r.date || r.createdAt).format('YYYY-MM') === currentMonth);
                    
                    weekReports.forEach(r => {
                        const isMandatory = isMandatoryFine(r.violation, r.notes, r);
                        const fineVal = getViolationFine(r.violation, r.notes, r);
                        const isViol = fineVal > 0;
                        const vString = (r.violation||'').toLowerCase();
                        
                        if (isViol) {
                            violationsCount++;
                            if (!isMandatory) weekViolationsList.push({ type: vString, fine: fineVal, r });
                        }
                        
                        if (isMandatory) {
                            let finalFine = fineVal;
                            if (vString.includes(' U W U · ‘ ° »') || (r.notes||'').toLowerCase().includes(' U W U · ‘ °  Q')) {
                                lateCount++;
                                if (lateCount >= 2) finalFine *= 2;
                            }
                            if (dayjs(r.date || r.createdAt).format('YYYY-MM') === currentMonth) {
                                currentMonthFines += finalFine;
                            }
                        }
                    });
                    
                    if (wId === currentWeekId) {
                        currentWeekViolationsCount = violationsCount;
                    }

                    let zoneFine = 0;
                    if (state === 'Green') {
                        if (violationsCount >= 14) {
                            state = 'Red';
                            weekViolationsList.forEach(v => { zoneFine += v.fine; });
                        } else if (violationsCount > 9) {
                            state = 'Yellow';
                            if (weekViolationsList.length > 0) {
                                const freq = {};
                                weekViolationsList.forEach(v => { freq[v.type] = (freq[v.type]||0) + 1; });
                                let topType = '', maxF = 0;
                                for (let t in freq) { if (freq[t] > maxF) { maxF = freq[t]; topType = t; } }
                                const topV = weekViolationsList.find(x => x.type === topType);
                                if (topV) zoneFine += topV.fine;
                            }
                        } else {
                            state = 'Green';
                        }
                    } else if (state === 'Yellow') {
                        if (violationsCount > 9) {
                            state = 'Red';
                            weekViolationsList.forEach(v => { zoneFine += v.fine; });
                        } else {
                            state = 'Green';
                        }
                    } else if (state === 'Red') {
                        if (violationsCount <= 9) {
                            state = 'Green';
                        } else {
                            state = 'Red';
                            weekViolationsList.forEach(v => { zoneFine += v.fine; });
                        }
                    }
                    
                    if (isCurrentMonth) {
                        currentMonthFines += zoneFine;
                    }
                }
                
                results[master] = {
                    loc: masters[master].loc,
                    state: state,
                    weekViolations: currentWeekViolationsCount,
                    monthFines: currentMonthFines
                };
            }
            return results;
        }

        window.openFinesModal = function() {
            document.getElementById('fines-modal').classList.add('active');
            renderFinesTable();
        }

        async function renderFinesTable() {
            const tbody = document.getElementById('fines-table-body');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">  ° V!!S · T °...</td></tr>';
            try {
                const res = await fetch('/api/ovn');
                const reports = await res.json();
                const results = calculateFines(reports);
                const manualTbody = document.getElementById('manual-fines-table-body');
                if (manualTbody) {
                    let mHtml = '';
                    reports.forEach(r => {
                        if (r.isManualFine) {
                            let d = r.date || r.createdAt || '';
                            if (d.includes('T')) d = d.split('T')[0];
                            mHtml += `<tr>
                                <td>${d}</td>
                                <td>${r.location || '-'}</td>
                                <td style="font-weight:700">${r.barber}</td>
                                <td>${r.violation || r.notes}</td>
                                <td style="color:#FF3B30; font-weight:bold;">${r.cost} 2</td>
                            </tr>`;
                        }
                    });
                    if (mHtml === '') mHtml = '<tr><td colspan="5" style="text-align:center; color:#888;">  !S!! !9!& !¬!! °! U    µ!</td></tr>';
                    manualTbody.innerHTML = mHtml;
                }
                if (Object.keys(results).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center"> \ µ!  ‘ °  !9!&</td></tr>';
                    return;
                }
                const currentMonth = dayjs().format('MM / YYYY');
                let html = '';
                const zoneBadge = {
                    'Green': '<span style="color:#34C759; background:rgba(52,199,89,0.15); padding:4px 10px; border-radius:6px; font-weight:800; font-size:12px;">@__^   " : " \ R </span>',
                    'Yellow': '<span style="color:#FF9F0A; background:rgba(255,159,10,0.15); padding:4px 10px; border-radius:6px; font-weight:800; font-size:12px;">@__   " : ^ R </span>',
                    'Red': '<span style="color:#FF3B30; background:rgba(255,59,48,0.15); padding:4px 10px; border-radius:6px; font-weight:800; font-size:12px;">@_‘  Y   R  \ R </span>'
                };
                for (const m in results) {
                    const data = results[m];
                    html += `<tr>
                        <td>${currentMonth}</td>
                        <td style="font-weight:700">${m}</td>
                        <td>${zoneBadge[data.state]}</td>
                        <td><strong style="color:white; font-size: 15px;">${data.weekViolations}</strong></td>
                        <td style="color:#FF3B30; font-weight:700; font-size: 15px;">${data.monthFines} 2</td>
                    </tr>`;
                }
                tbody.innerHTML = html;
            } catch(e) {
                console.error(e);
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#FF3B30"> [!¬ Q ± T °  · ° V!!S · T Q  ‘ °  !9!&  Q » Q ! T! Q W! °.</td></tr>';
            }
        }

        // ===================================
        // MANUAL FINE MODULE
        // ===================================
        window.openManualFineModal = function() {
            document.getElementById('manual-fine-modal').classList.add('active');
            document.getElementById('mf-date').value = dayjs().format('YYYY-MM-DD');
        }

        window.closeManualFineModal = function() {
            document.getElementById('manual-fine-modal').classList.remove('active');
        }

        window.updateMFMastersDropdown = function() {
            const loc = document.getElementById('mf-location').value;
            const sel = document.getElementById('mf-barber');
            sel.innerHTML = '<option value=""> !9 ± µ! Q! µ  X °!! µ! °</option>';
            if (loc && typeof ADAPTER !== "undefined" && ADAPTER[loc]) {
                ADAPTER[loc].masters.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.dash;
                    opt.textContent = m.dash;
                    sel.appendChild(opt);
                });
            }
        }

        window.submitManualFine = async function(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = '  U!&! °  µ  Q µ...';

            const payload = {
                location: document.getElementById('mf-location').value,
                barber: document.getElementById('mf-barber').value,
                date: document.getElementById('mf-date').value,
                violation: document.getElementById('mf-violation').value,
                cost: document.getElementById('mf-cost').value,
                notes: document.getElementById('mf-notes').value,
                isManualFine: true
            };

            try {
                const res = await fetch('/api/ovn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    alert('  !S!!  U  !¬!! °! !S! W µ!¬  U  ‘ U ± °  » µ !');
                    document.getElementById('manual-fine-form').reset();
                    closeManualFineModal();
                    if (document.getElementById('fines-modal').classList.contains('active')) {
                        renderFinesTable();
                    }
                    if (window.SALARY_MODE_MANAGER || document.getElementById('salary-modal').classList.contains('active')) {
                        renderSalaryTable();
                    }
                } else {
                    alert(' [!¬ Q ± T °  W! Q ! U!&! °  µ  Q Q !!S!!  U V U !¬!! °! °');
                }
            } catch (err) {
                console.error(err);
                alert(' [!¬ Q ± T ° ! µ! Q');
            } finally {
                btn.disabled = false;
                btn.textContent = ' \ °!! Q! » Q!!
 !¬!! °!';
            }
        }

// ===================================
// SALARY CALCULATION MODULE V2
// ===================================
window.SALARY_MODE_MANAGER = false;
window.SALARIES_CACHE = {}; 


window.openSalaryModal = function(isManager) {
    window.SALARY_MODE_MANAGER = isManager;
    document.getElementById('salary-modal').classList.add('active');
    
    const today = dayjs();
    let start, end;
    if (today.day() === 1) { // If Monday
        start = today.subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD');
        end = today.subtract(1, 'week').endOf('isoWeek').format('YYYY-MM-DD');
    } else {
        start = today.startOf('isoWeek').format('YYYY-MM-DD');
        end = today.endOf('isoWeek').format('YYYY-MM-DD');
    }
    
    document.getElementById('salary-date-start').value = start;
    document.getElementById('salary-date-end').value = end;
    
    renderSalaryTable();
};


window.getMasterSettings = function(masterName) {
    if (typeof ADAPTER !== "undefined") {
        for (const loc in ADAPTER) {
            if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                const m = ADAPTER[loc].masters.find(x => x.dash === masterName || (x.el_kassa && x.el_kassa.includes(masterName)));
                if (m) return { base: m.payBase || 5000, percent: m.payPercent || 40, loc: loc };
            }
        }
    }
    return { base: 5000, percent: 40, loc: ' \ µ Q · ' };
};

window.getShiftsAndHours = function(masterName, startStr, endStr, scheduleArray) {
    let totalParams = { hours: 0, shiftsCount: 0 };
    
    const startD = dayjs(startStr);
    const endD = dayjs(endStr);
    
    if (!scheduleArray) return totalParams;

    for (let d = startD; d.isBefore(endD) || d.isSame(endD, 'day'); d = d.add(1, 'day')) {
        const rowDate = d.format('YYYY-MM-DD');
        const dayScheds = scheduleArray.filter(s => s.date === rowDate);
        
        dayScheds.forEach(sd => {
            if (sd.masters) {
                const w = sd.masters.find(wk => wk.name === masterName);
                if (w) {
                    let sh = 12; // default
                    let text = w.text || w.time || ""; 
                    if (text) {
                        try {
                            const nums = text.match(/\d+/g);
                            if (nums && nums.length >= 2) {
                                const sH = parseInt(nums[0]);
                                const eH = parseInt(nums[1]);
                                sh = eH - sH;
                                if (sh < 0) sh += 24;
                            }
                        } catch(e){}
                    }
                    totalParams.shiftsCount++;
                    totalParams.hours += sh;
                }
            }
        });
    }
    return totalParams;
};

window.getFinesInPeriod = function(masterName, startStr, endStr, ovnArray) {
    if (!ovnArray) return 0;
    
    const mReports = ovnArray
        .filter(r => r.barber === masterName)
        .sort((a,b) => dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf());
        
    let state = 'Green';
    const weeks = {};
    mReports.forEach(r => {
        const d = dayjs(r.date || r.createdAt);
        const wId = d.isoWeek() + '-' + d.year();
        if (!weeks[wId]) weeks[wId] = [];
        weeks[wId].push(r);
    });
    
    const sortedWeeks = Object.keys(weeks).sort((a,b) => {
        const [wA, yA] = a.split('-');
        const [wB, yB] = b.split('-');
        if (yA !== yB) return yA - yB;
        return wA - wB;
    });

    let periodFines = 0;
    
    function addFineIfInPeriod(amount, rDate) {
        const d = dayjs(rDate);
        if ((d.isAfter(dayjs(startStr)) || d.isSame(dayjs(startStr), 'day')) &&
            (d.isBefore(dayjs(endStr)) || d.isSame(dayjs(endStr), 'day'))) {
            periodFines += amount;
        }
    }

    for (const wId of sortedWeeks) {
        const weekReports = weeks[wId];
        let violationsCount = 0;
        let lateCount = 0;
        const weekViolationsList = [];
        
        weekReports.forEach(r => {
            const isMandatory = (typeof isMandatoryFine === 'function' ? isMandatoryFine(r.violation, r.notes) : false);
            const fineVal = (typeof getViolationFine === 'function' ? getViolationFine(r.violation, r.notes) : 0);
            const isViol = fineVal > 0;
            const vString = (r.violation||'').toLowerCase();
            
            if (isViol) {
                violationsCount++;
                if (!isMandatory) weekViolationsList.push({ type: vString, fine: fineVal, r });
            }
            
            if (isMandatory) {
                let finalFine = fineVal;
                if (vString.includes(' U W U · ‘ ° »') || (r.notes||'').toLowerCase().includes(' U W U · ‘ °  Q')) {
                    lateCount++;
                    if (lateCount >= 2) finalFine *= 2;
                }
                addFineIfInPeriod(finalFine, r.date || r.createdAt);
            } else if (isViol && state === 'Red') {
                addFineIfInPeriod(fineVal, r.date || r.createdAt);
            }
        });
        
        if (state === 'Yellow' && violationsCount > 0) {
            let finesMap = {};
            weekViolationsList.forEach(v => {
                finesMap[v.type] = (finesMap[v.type]||0) + 1;
            });
            let maxType = null, maxC = 0;
            Object.keys(finesMap).forEach(k => {
                if(finesMap[k] > maxC) { maxC = finesMap[k]; maxType = k; }
            });
            if(maxType) {
                const violItem = weekViolationsList.find(x => x.type === maxType);
                if (violItem) {
                    addFineIfInPeriod(violItem.fine, violItem.r.date || violItem.r.createdAt);
                }
            }
        }
        
        if (state === 'Green') {
            if (violationsCount >= 14) state = 'Red';
            else if (violationsCount > 9) state = 'Yellow';
        } else if (state === 'Yellow') {
            if (violationsCount > 9) state = 'Red';
            else state = 'Green';
        } else if (state === 'Red') {
            if (violationsCount <= 9) state = 'Green';
        }
    }
    
    return periodFines;
};

window.renderSalaryTable = async function() {
    console.log("[SALARY] Starting calculation...");
    const startD = document.getElementById('salary-date-start').value;
    const endD = document.getElementById('salary-date-end').value;
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;"><div class="spinner" style="margin: 0 auto 10px auto;"></div>  ° V!!S ¶ ° µ X ! X µ !9  Q !¬!! °!!9...</td></tr>';
    
    let targetMasters = [];
    if (window.SALARY_MODE_MANAGER) {
        if (typeof ADAPTER !== "undefined") {
            Object.keys(ADAPTER).forEach(loc => {
                if (ADAPTER[loc] && Array.isArray(ADAPTER[loc].masters)) {
                    ADAPTER[loc].masters.forEach(m => targetMasters.push(m.dash));
                }
            });
        }
        targetMasters = [...new Set(targetMasters)].sort();
    } else {
        targetMasters = [window.CURRENT_MASTER || ''];
    }
    
    if (targetMasters.length === 0 || !targetMasters[0]) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;"> \ µ!  ‘ °  !9!&  Q » Q  X °!! µ!   µ  !9 ±! ° </td></tr>';
        return;
    }
    
    try {
        const [ovnRes, schedRes] = await Promise.all([
            fetch('/api/ovn?v='+Date.now()).then(r => r.json()).catch(() => []),
            fetch('/api/schedule?v='+Date.now()).then(r => r.json()).catch(() => [])
        ]);

        tbody.innerHTML = '';
        targetMasters.forEach(mName => {
            if (!mName) return;
            const conf = window.getMasterSettings(mName);
            let shifts = window.getShiftsAndHours(mName, startD, endD, schedRes);
            const fines = window.getFinesInPeriod(mName, startD, endD, ovnRes);
            
            const safeId = mName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9- R-  °-!]/g, '');
            let prevRev = window.SALARIES_CACHE ? (window.SALARIES_CACHE[safeId] || "") : "";
            
            // Auto-fill revenue if dates match the agent's cached week
            if (window.dashboardData && window.dashboardData.salaryWeekly) {
                const sw = window.dashboardData.salaryWeekly;
                // Convert sw.start/end (DD.MM.YYYY) to YYYY-MM-DD
                const swS = sw.start.split('.').reverse().join('-');
                const swE = sw.end.split('.').reverse().join('-');
                
                if (swS === startD && swE === endD) {
                    let elkassaName = mName;
                    if (typeof ADAPTER !== "undefined") {
                         for (const loc in ADAPTER) {
                             if (ADAPTER[loc] && ADAPTER[loc].masters) {
                                 const matchM = ADAPTER[loc].masters.find(x => x.dash === mName);
                                 if (matchM && matchM.el_kassa) {
                                     Object.keys(sw.revenue).forEach(ek => {
                                         if (matchM.el_kassa.includes(ek) || matchM.el_kassa.some(ak => ek.includes(ak))) elkassaName = ek;
                                     });
                                 }
                             }
                         }
                    }
                    const fetchedRev = sw.revenue[elkassaName];
                    if (fetchedRev !== undefined && (prevRev === "" || prevRev === "0" || prevRev === 0)) {
                        prevRev = String(fetchedRev);
                        if(!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
                        window.SALARIES_CACHE[safeId] = prevRev;
                    }
                    
                    // NEW: If shifts in schedule are 0, use workDays from Sales List
                    const fetchedWorkDays = sw.workDays ? (sw.workDays[elkassaName] || 0) : 0;
                    if (fetchedWorkDays > shifts.shiftsCount) {
                        shifts.shiftsCount = fetchedWorkDays;
                        shifts.hours = fetchedWorkDays * 12; 
                    }
                }
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 12px 10px; border-bottom: 1px solid #222;">
                    <strong>${mName}</strong><br><span style="font-size:11px;color:#888">${conf.loc}</span>
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; font-size:12px;">
                     !9!& U ‘ ${conf.base}2<br>${conf.percent}%
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222;">
                    <div style="position:relative; display:inline-block;">
                        <input type="number" id="rev-${safeId}" value="${prevRev}" placeholder="  T ° ¶ Q! µ  !9!!S!! T!S" 
                               style="width:110px; padding:8px 30px 8px 8px; background:#111; color:#fff; border:1px solid #444; border-radius:8px;" 
                               oninput="window.updateRowMath('${safeId}', '${mName}', ${conf.base}, ${conf.percent}, ${shifts.shiftsCount}, ${shifts.hours}, ${fines})">
                    </div>
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; font-size:12px;">
                      X µ : ${shifts.shiftsCount}<br> § °! U : ${shifts.hours}
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; color:#FF3B30; font-weight:600;">
                    -${fines} 2
                </td>
                <td id="res-${safeId}" style="padding: 12px 10px; border-bottom: 1px solid #222; font-size: 17px; font-weight: 800; text-align: right; color:#34C759;">
                    0 2
                </td>
            `;
            tbody.appendChild(tr);
            window.updateRowMath(safeId, mName, conf.base, conf.percent, shifts.shiftsCount, shifts.hours, fines);
        });
        console.log("[SALARY] Calculation complete.");
    } catch(err) {
        console.error("[SALARY] Error:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#FF3B30;"> [!¬ Q ± T °  W! Q  · ° V!!S · T µ: ' + err.message + '</td></tr>';
    }
};


window.updateRowMath = function(safeId, name, base, percent, shifts, hours, fines) {
    const revInput = document.getElementById('rev-' + safeId);
    if (!revInput) return;
    const rev = parseFloat(revInput.value) || 0;
    
    // Manual cache
    if (!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
    window.SALARIES_CACHE[safeId] = revInput.value;

    const basePay = base * shifts;
    const percentagePay = rev * (percent / 100);
    const earnings = Math.max(basePay, percentagePay) - fines;
    
    const resEl = document.getElementById('res-' + safeId);
    if (resEl) {
        resEl.innerHTML = (earnings).toLocaleString() + ' 2';
        if (percentagePay > basePay) {
            resEl.innerHTML += '<br><span style="font-size:10px; color:#888;">( W! U!  µ !)</span>';
        } else {
            resEl.innerHTML += '<br><span style="font-size:10px; color:#888;">( !9!& U ‘)</span>';
        }
    }
    window.refreshSalaryGrandTotal();
};

window.refreshSalaryGrandTotal = function() {
    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('td[id^="res-"]').forEach(td => {
        const val = parseInt(td.innerText.replace(/[^0-9]/g, '')) || 0;
        total += val;
    });
    const footer = document.getElementById('salary-table-footer');
    if (footer) {
        footer.innerHTML = `
            <tr style="background: rgba(52, 199, 89, 0.1); font-weight: 800;">
                <td colspan="5" style="padding: 15px; text-align: right; color: #fff;"> ˜ ^ [  [  Y   « _ : R ^ ":</td>
                <td style="padding: 15px; text-align: right; color: #34C759; font-size: 18px;">${total.toLocaleString()} 2</td>
            </tr>
        `;
    }
};

    

window.handleCleaningUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const btn = document.getElementById('cleaning-upload-btn');
    const statusText = document.getElementById('cleaning-status-text');
    const preview = document.getElementById('cleaning-preview');
    const placeholder = document.getElementById('cleaning-placeholder');
    
    btn.innerText = '  ° V!!S · T °...';
    btn.disabled = true;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result;
        
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64: base64 })
            });
            const data = await res.json();
            
            if (data.url) {
                preview.src = data.url;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                
                // Show success notification or change text
                const now = new Date();
                const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                statusText.innerText = ' ¤ U! U  · ° V!!S ¶ µ  U   ' + timeStr;
                btn.innerText = ' [ ±  U  Q!!
 ! U! U';
                btn.disabled = false;
            }
        } catch (err) {
            console.error('Upload failed:', err);
            statusText.innerText = ' [!¬ Q ± T °  · ° V!!S · T Q';
            btn.innerText = '  ‘ µ » °!!
 ! U! U';
            btn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
};

window.loadMasterSchedule = async function() {
    const masterNameEl = document.getElementById('dynamic-master-name');
    if (!masterNameEl) return;
    const masterName = masterNameEl.innerText.trim();

    const startInput = document.getElementById('master-sched-start');
    let startDateStr = startInput.value;
    if (!startDateStr) {
        startDateStr = dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD');
        startInput.value = startDateStr;
    }
    const startDate = dayjs(startDateStr);

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

    const rusDays = [' !', ' _ ', ' !', ' !', ' §!', ' _!', '  ±'];
    let html = '';
    
    for (let i = 0; i < 7; i++) {
        const d = startDate.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        
        let masterData = null;
        let workLocation = '';
        for (const entry of schedData) {
            if (entry.date === dateStr && Array.isArray(entry.masters)) {
                const found = entry.masters.find(m => m.name === masterName);
                if (found) {
                    masterData = found;
                    workLocation = entry.location;
                    break;
                }
            }
        }

        let val = ' !9!& U ‘  U ';
        let bg = 'rgba(255,255,255,0.05)';
        let border = '1px solid rgba(255,255,255,0.1)';
        
        if (masterData) {
            val = masterData.text || (masterData.startTime ? `  ${masterData.startTime.split(':')[0]}  ‘ U 22` : '  10  ‘ U 22');
            bg = 'rgba(212, 175, 55, 0.15)';
            border = '1px solid var(--accent)';
        }

        html += `
            <div style="flex: 1; min-width: 80px; padding: 12px 8px; border-radius: 12px; background: ${bg}; border: ${border}; text-align: center; display: flex; flex-direction: column; gap: 8px;">
                <div style="font-size: 11px; opacity: 0.6;">${rusDays[d.day()]}</div>
                <div style="font-size: 14px; font-weight: 600;">${d.format('DD.MM')}</div>
                <div style="font-size: 12px; color: ${masterData ? 'var(--accent)' : 'var(--text-muted)'}; font-weight: 500;">
                    ${val}
                </div>
                ${workLocation ? `<div style="font-size: 10px; opacity: 0.5;">${workLocation}</div>` : ''}
            </div>
        `;
    }

    const container = document.getElementById('master-sched-container');
    const emptyMsg = document.getElementById('master-sched-empty');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'flex';
        if(emptyMsg) emptyMsg.style.display = 'none';
    }
};







// --- SALARY MODULE FINAL ---
async function startSalaryCalcInternal() {
    console.log("[SALARY] Button Clicked!");
    const btn = document.getElementById('salary-calc-btn');
    if (!btn) { console.error("Btn not found"); return; }
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg style="animation: spin 1s linear infinite; margin-right:8px; display:inline-block; vertical-align:middle;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>  !! Q! °!...';
    try {
        await window.renderSalaryTable();
        console.log("[SALARY] Calculation Finished!");
    } catch(e) {
        console.error("[SALARY] Calc Error:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
}
window.startSalaryCalc = startSalaryCalcInternal;

// --- MANAGER AUDIT MODULE ---
window.openManagerModal = function() {
    document.getElementById('manager-modal').classList.add('active');
    
    const locSelect = document.getElementById('manager-location');
    if (locSelect && locSelect.options.length <= 1) {
        if (typeof LOCATIONS !== 'undefined') {
            LOCATIONS.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.textContent = loc;
                locSelect.appendChild(opt);
            });
        }
    }
    
    const container = document.getElementById('manager-fields-container');
    
    const zones = [
        { id: 'reception', title: '   µ! µ W!¬ µ   Q   Q!! Q  °', desc: ' Y U! X µ! Q T °  !9!! °  » µ  ° ! U   U, !! U »  W! U! µ!!,  ¶!S!  ° »!9  ° T T!S! °!  U ! » U ¶ µ !9.', img: 'https://dummyimage.com/600x400/111/E8FF38&text= ­! ° » U :+   µ! µ W!¬ µ ' },
        { id: 'workstation', title: '   ° ± U!! µ µ  X µ!! U', desc: ' ^ µ » µ ¶ T °  U! V °  Q · U  °  °    Q ‘ µ ° »!
  U X  W U!! ‘ T µ,  T! µ! » U  U W!S!0 µ  U  Q  !9! U   µ  U.', img: 'https://dummyimage.com/600x400/111/E8FF38&text= ­! ° » U :+   ° ± U!! µ µ+ Z µ!! U' },
        { id: 'coffee', title: '  U  °  T U! µ/  ° W Q! T U ', desc: '   ° T U  Q  °  W! U ·! °!!  U-!!S!& °!, !! ° T ° !9  !9! U   µ !9  W U  » Q  Q Q.', img: 'https://dummyimage.com/600x400/111/E8FF38&text= ­! ° » U :+ \ ° W Q! T Q' },
        { id: 'facade', title: ' !& U ‘  °!  V!!S W W °', desc: ' Y U ! Q T !! Q!!!9 ,  ‘  µ! Q  ± µ ·  U! W µ!! °! T U   W ° »!
!  µ .', img: 'https://dummyimage.com/600x400/111/E8FF38&text= ­! ° » U :+ ¤ °! ° ‘' }
    ];

    container.innerHTML = zones.map(zone => `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden;">
            <div style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 16px; margin: 0; color: #fff;">${zone.title}</h3>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">${zone.desc}</p>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="background: #000; padding: 8px; text-align: center; font-size: 11px; color: var(--accent); font-weight: bold; text-transform: uppercase;"> ­! ° » U </div>
                    <img src="${zone.img}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
                </div>
                <div style="flex: 1; position: relative; background: #161616;">
                    <div style="background: rgba(0,0,0,0.5); padding: 8px; text-align: center; font-size: 11px; color: #fff; font-weight: bold; text-transform: uppercase;"> ^ µ T!S!0 µ µ ! U!! U!  Q µ ( ¤ ° T!)</div>
                    <div style="display:flex; align-items:center; justify-content:center; min-height: 200px; padding: 20px; position:relative;">
                        <div id="btn-camera-${zone.id}" onclick="openCamera('${zone.id}')" 
                             style="cursor: pointer; background: rgba(255,255,255,0.05); border: 1px dashed var(--accent); border-radius: 12px; padding: 25px; width: 100%; text-align: center; color: var(--accent); font-size: 14px; font-weight: bold; transition: all 0.2s;">
                            @_·   ‘ µ » °!!
 ! U! U ! ° T! °<br>
                            <span style="font-weight: 400; font-size: 12px; opacity: 0.7; color: #fff; display:block; margin-top:5px;"> !! U V U !! µ! µ ·  T ° X µ!!S (Live)</span>
                        </div>
                        
                        <img id="preview-${zone.id}" style="width:100%; height:200px; object-fit:cover; display:none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        
                        <button type="button" id="retake-${zone.id}" onclick="openCamera('${zone.id}')" 
                                style="display:none; position:absolute; bottom:15px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; border:1px solid #444; padding:8px 16px; border-radius:8px; font-size:12px; cursor:pointer;">
                            @_  _ µ! µ! !!!

                        </button>
                    </div>
                </div>
            </div>
            <div style="padding: 12px; background: rgba(52, 199, 89, 0.05); color: #34C759; font-size: 12px; text-align: center;">
                 !9 !S  µ! µ !9, !!! U ! ° T!  Q ‘ µ ! Q!! µ  !! ° » U !S?  "! » Q  U! W! °  Q!!
 ! U! U !  ± °! ‘ ° T U X,  ˜ ˜   µ!  µ!  W! U  µ! T!S.
            </div>
        </div>
    `).join('');
};

window.closeManagerModal = function() {
    document.getElementById('manager-modal').classList.remove('active');
};

window.openCamera = async function(zoneId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(" [  ˜  Y R:   °!¬  ±! °!S · µ!   µ  W U ‘ ‘ µ! ¶ Q  ° µ!  W!! X!S! ! ° ± U!!S !  T ° X µ! U  (HTTPS !! µ ±!S µ!!!  ‘ »! iOS).  [! T!!9  °!!
  Q ·  V ° » µ! µ Q  · ° W! µ!0 µ  U.");
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'camera-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0'; overlay.style.left = '0';
    overlay.style.width = '100vw'; overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#000';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex'; overlay.style.flexDirection = 'column';
    
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.style.flex = '1'; video.style.width = '100%'; video.style.objectFit = 'cover';
    
    const controls = document.createElement('div');
    controls.style.padding = '30px'; controls.style.display = 'flex'; controls.style.justifyContent = 'space-around'; controls.style.backgroundColor = '#111';

    const closeBtn = document.createElement('button');
    closeBtn.innerText = ' [! X µ  °';
    closeBtn.style.padding = '15px 30px'; closeBtn.style.fontSize = '16px'; closeBtn.style.borderRadius = '50px'; closeBtn.style.background = '#333'; closeBtn.style.color = '#fff'; closeBtn.style.border = 'none'; closeBtn.style.cursor = 'pointer';

    const snapBtn = document.createElement('button');
    snapBtn.innerText = '@_Q   ‘ µ » °!!
 ! U! U';
    snapBtn.style.padding = '15px 30px'; snapBtn.style.fontSize = '16px'; snapBtn.style.borderRadius = '50px'; snapBtn.style.background = 'var(--accent)'; snapBtn.style.color = '#000'; snapBtn.style.border = 'none'; snapBtn.style.fontWeight = 'bold'; snapBtn.style.cursor = 'pointer';

    controls.appendChild(closeBtn); controls.appendChild(snapBtn);
    overlay.appendChild(video); overlay.appendChild(controls);
    document.body.appendChild(overlay);

    let activeStream = null;
    try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = activeStream;
    } catch(err) {
        alert(" \ µ!  ‘ U!!!S W °  T  T ° X µ! µ.   °  ‘ Q! µ    \ °!!! U  T Q  ±! °!S · µ! ° ->    ° ·! µ!¬ µ  Q! ->  Y ° X µ! ° ->    ° ·! µ!¬ Q!!
.");
        document.body.removeChild(overlay);
        return;
    }

    closeBtn.onclick = () => {
        if(activeStream) activeStream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
    };

    snapBtn.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1080;
        canvas.height = video.videoHeight || 1920;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // JPEG to save space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if(activeStream) activeStream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
        
        document.getElementById('btn-camera-' + zoneId).style.display = 'none';
        const preview = document.getElementById('preview-' + zoneId);
        preview.style.display = 'block';
        preview.src = dataUrl;
        document.getElementById('retake-' + zoneId).style.display = 'block';
    };
};

window.submitManagerCheck = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('manager-submit-btn');
    btn.innerHTML = ' \ µ ! U! µ!!
 (AI- Z U ‘ µ! °! U!)  W! U  µ!! µ! !! Q!! U!!S  Q  W U!! ‘ U T... 2V';
    btn.disabled = true;

    try {
        const zones = ['reception', 'workstation', 'coffee', 'facade'];
        const results = [];
        for (const zone of zones) {
            const preview = document.getElementById('preview-' + zone);
            
            if (preview && preview.src && preview.src.startsWith('data:image')) {
                // To save tokens and time, we can send only the fact image. Standard is hardcoded generic rules in AI right now.
                const res = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        zoneId: zone,
                        images: [preview.src] 
                    })
                });
                if (!res.ok) {
                    const errPayload = await res.json();
                    throw new Error(errPayload.error || 'Server error');
                }
                const data = await res.json();
                results.push({ zone, data });
            }
        }
        
        if (results.length === 0) {
            throw new Error(" \ µ! ! U! U V! °! Q  ! ° T! °  ‘ »!  W! U  µ! T Q.   ‘ µ » ° ! µ  X Q  Q X!S X  U ‘  U ! U! U.");
        }

        const failed = results.filter(r => r.data && r.data.approved === false);
        if (failed.length > 0) {
            const errText = failed.map(f => `2\
    ° T!S!! "${f.zone}": ${f.data.comment}`).join('\n\n');
            alert("2Y ?Q  ˜ ˜- R!S ‘ Q! U!  U! T » U  Q »  W! U  µ! T!S  Q ·- · °   °!!S!¬ µ  Q! !! °  ‘ °!! U !\n\n" + errText + "\n\n _ U ¶ ° »!S !! °,   °  µ ‘ Q! µ  W U!! ‘ U T  Q  W µ! µ!  Q X Q! µ  U! T » U  µ  !9 µ ! U! U!");
            btn.innerHTML = ' [! W! °  Q!!
  W! U  µ! T!S';
            btn.disabled = false;
            return;
        }

        const payload = {
            location: document.getElementById('manager-location').value,
            results: results,
            status: 'approved_by_ai'
        };

        const postRes = await fetch('/api/manager_checks', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        
        if (!postRes.ok) throw new Error(" \ µ !S ‘ ° » U!!
 ! U!&! °  Q!!
  Q ! W µ T!  Q!");

        alert("2Z& GPT-4o Vision:  ˜ ‘ µ ° »!
  °! !! Q!! U! °!  ! µ ! ° T!S!!!9  W! U!¬ » Q  W! U  µ! T!S,  Q ! W µ T!  Q! ! U!&! °  µ  °!");
        btn.innerHTML = ' [! W! °  Q!!
  W! U  µ! T!S';
        btn.disabled = false;
        document.getElementById('manager-form').reset();
        closeManagerModal();
        
        let c = document.getElementById('manager-checks-count');
        if (c) c.innerText = "1 / 3";
    } catch(err) {
        console.error(err);
        alert(" [!¬ Q ± T °  ˜ ˜: " + err.message);
        btn.innerHTML = ' [! W! °  Q!!
  W! U  µ! T!S';
        btn.disabled = false;
    }
};

