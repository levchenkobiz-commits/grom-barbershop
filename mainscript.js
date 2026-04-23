
// ==== TOAST NOTIFICATIONS ====
window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // fail gracefully

    const toast = document.createElement('div');
    toast.className = 'grome-toast ' + type;
    
    let icon = '???';
    if(type === 'success') icon = '?';
    if(type === 'error') icon = '???';
    
    toast.innerHTML = `
        <div class="grome-toast-icon">${icon}</div>
        <div class="grome-toast-content">${msg}</div>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if(toast.parentElement) toast.remove();
        }, 400); // Wait for transition
    }, 3000);
};


        const LOCATIONS = Object.keys(ADAPTER);
        const BARBER_ROSTER = {};
        LOCATIONS.forEach(loc => {
            BARBER_ROSTER[loc] = ADAPTER[loc].masters.map(m => m.dash);
        });

        // Set global logged-in master
        window.CURRENT_MASTER = "Шохназар Д.";

        let GLOBAL_HANDBOOK = {
            "Опоздание": 300,
            "Невыход": 5000,
            "Воровство": 5000,
            "Грязное место": 500,
            "Без формы": 500,
            "Отказ клиенту": 1000,
            "Разговор на нац. языке": 500,
            "Жалоба": 1000,
            "Поломка": 0,
            "Другое": 0
        };

        async function loadHandbook() {
            try {
                const res = await fetch('/api/handbook');
                if (res.ok) {
                    GLOBAL_HANDBOOK = await res.json();
                    console.log("Handbook loaded:", GLOBAL_HANDBOOK);
                }
            } catch (e) { console.error("Handbook load error:", e); }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            await loadHandbook();
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
                        revCard.querySelector('.card-subtext').innerText = (data.revenue.period ? data.revenue.period + ' | ' : `${startStr}-${endStr} | `) + `(${curRev} vs ${prevRev} ₽)`;
                    } catch(e) {}
                    
                    try {
                        const todayCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(4)');
                        if (todayCard) {
                            todayCard.querySelector('.card-value').innerText = (data.revenue.today || 0).toLocaleString() + ' ₽';
                            todayCard.querySelector('.card-subtext').innerText = 'Сегодня | Чистая (без бонусов)';
                        }
                    } catch(e) {}
                }
                
                if (data.returnRate) {
                    try {
                        const rrCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(2)');
                        rrCard.querySelector('.card-value').innerText = (data.returnRate.value || 0) + '%';
                        if (data.returnRate.drilldown && data.returnRate.drilldown[0]) {
                            rrCard.querySelector('.card-subtext').innerText = (data.returnRate.period ? data.returnRate.period + ' | ' : '') + data.returnRate.drilldown[0].value;
                        } else {
                            rrCard.querySelector('.card-subtext').innerText = (data.returnRate.period ? data.returnRate.period + ' | ' : '') + "Когорта 64-32 дня";
                        }
                    } catch(e) {}
                }
                
                if (data.cycle) {
                    try {
                        const cycleCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(3)');
                        if (cycleCard) {
                            cycleCard.querySelector('.card-value').innerText = (data.cycle.value || 0) + 'д';
                            cycleCard.querySelector('.card-subtext').innerText = (data.cycle.period ? data.cycle.period + ' | ' : '') + "Дней между стрижками";
                        }
                    } catch(e) {}
                }
                
                if (data.appointments) {
                    try {
                        const apptCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(5)');
                        if (apptCard) {
                            apptCard.querySelector('.card-value').innerText = (data.appointments.percentage || 0) + '%';
                            apptCard.querySelector('.card-subtext').innerText = (data.appointments.period ? data.appointments.period + ' | ' : '') + "Записи от общего числа услуг";
                        }
                    } catch(e) {}
                }

                if (data.occupancy) {
                    try {
                        const occCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(6)');
                        if (occCard) {
                            occCard.querySelector('.card-value').innerText = (data.occupancy.value || 0);
                            occCard.querySelector('.card-subtext').innerText = (data.occupancy.period ? data.occupancy.period + ' | ' : '') + "Ср. чеков в раб. день (>2)";
                        }
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
            const myName = window.CURRENT_MASTER || "Шохназар Д."; // Sync with global session
            
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
                btn = Array.from(document.querySelectorAll('.tab-btn'))
                             .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + target + "'"));
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

        
        window.handleOvnViolationChange = function() {
            const selectEl = document.getElementById('ovn-violation');
            const sumContainer = document.getElementById('unpaid-sum-container');
            const sumInput = document.getElementById('ovn-unpaid-sum');
            if(!selectEl || !sumContainer) return;
            
            let hasUnpaid = false;
            // The value is exactly what we injected in HTML
            const tgt = 'Пробиты не все услуги';
            if (selectEl.multiple) {
                const opts = Array.from(selectEl.selectedOptions);
                hasUnpaid = opts.some(opt => opt.value === tgt);
            } else {
                hasUnpaid = selectEl.value === tgt;
            }
            
            if (hasUnpaid) {
                sumContainer.style.display = 'block';
                sumInput.required = true;
            } else {
                sumContainer.style.display = 'none';
                sumInput.required = false;
                sumInput.value = '';
            }
        };

        window.submitOVN = async function(e) {
            e.preventDefault();
            const btn = e.target.querySelector('.btn-submit');
            btn.disabled = true;
            btn.innerText = 'Сохранение...';
            try {
                const report = {
                    location: document.getElementById('ovn-location').value,
                    barber: document.getElementById('ovn-barber').value,
                    date: document.getElementById('ovn-date').value,
                    time: document.getElementById('ovn-time').value,
                    cost: parseFloat(document.getElementById('ovn-cost').value) || 0,
                    match: '', // Match field deprecated
                    nation: document.getElementById('ovn-nation').value,
                    violation: Array.from(document.querySelectorAll('.ovn-violation-select'))
                                    .map(s => s.value)
                                    .filter(v => v !== '') // not empty
                                    .join(', '),
                    notes: (function(){
                        let text = (document.getElementById('ovn-notes') ? document.getElementById('ovn-notes').value : '') || '';
                        let unpaidInput = document.getElementById('ovn-unpaid-sum');
                        let selects = Array.from(document.querySelectorAll('.ovn-violation-select')).map(s => s.value);
                        let single = document.getElementById('ovn-violation');
                        if (single) {
                            if (single.multiple) Array.from(single.selectedOptions).forEach(o=>selects.push(o.value));
                            else selects.push(single.value);
                        }
                        if (unpaidInput && unpaidInput.value && selects.some(v => v && v.includes('Пробиты не все услуги'))) {
                            text += ' (Сумма непробитых услуг: ' + unpaidInput.value + ')';
                        }
                        return text;
                    })()
                };

                let curMethod = 'POST';
                if (window.CURRENT_EDIT_OVN_ID) {
                    curMethod = 'PUT';
                    report.id = window.CURRENT_EDIT_OVN_ID;
                    report.editorName = window.USER ? window.USER.name : 'Аноним';
                }

                const res = await fetch('/api/ovn', { 
                    method: curMethod, 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(report)
                });

                if (!res.ok) {
                    throw new Error('Ошибка сервера ' + res.status);
                }

                showToast('Успешно сохранено!', "success");
                closeOVNModal();
                loadOVNHistory();
            } catch(err) {
                console.error(err);
                showToast("Ошибка: " + err.message, "error");
            } finally {
                btn.disabled = false;
                btn.innerText = 'Сохранить';
            }
        };



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
                if(cardSub) {
                    const startStr = dayjs().startOf('month').format('DD.MM');
                    const endStr = dayjs().subtract(1, 'day').format('DD.MM');
                    cardSub.innerText = `${startStr}-${endStr} | ${passed} из ${totalMtd} без замечаний`;
                }

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

                    const role = window.USER ? window.USER.role : '';
                    const canEdit = (role === 'ovn' || role === 'manager' || role === 'owner') && !r.editedBy;
                    const editHtml = canEdit ? `<span onclick="triggerEditOVN('${r.id}', '${(r.notes || "").replace(/'/g, "\\'")}')" style="cursor:pointer; margin-left:8px; opacity:0.6" title="Редактировать">✏️</span>` : '';

                    return `<tr>
                        <td data-label="МАСТЕР" style="font-size:14px; padding-left:25px"><b>${r.barber}</b></td>
                        <td data-label="НАРУШЕНИЕ"><span class="badge-status ${badgeClass}" style="text-align:center">${r.violation}</span></td>
                        <td data-label="ДАТА ПРОСМ." style="font-size:11px; white-space:nowrap; opacity:0.8">
                            ${dayjs(r.createdAt).format('HH:mm DD.MM')}
                        </td>
                        <td data-label="САЛОН" style="font-size:13px; font-weight:700; color:var(--accent)">${r.location}</td>
                        <td style="font-size:13px; opacity:0.7">
                            ${dayjs(r.date || "").format('DD.MM')} ${r.time || ""} 
                            ${matchTag}
                        </td>
                        <td data-label="РАБОТА" style="font-size:12px; opacity:0.7">
                            ${r.notes || '-'}
                            ${editHtml}
                        </td>
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

        window.shiftLatesDate = function(days) {
            const startEl = document.getElementById('lates-history-start');
            const endEl = document.getElementById('lates-history-end');
            const presetEl = document.getElementById('lates-history-preset');
            
            let baseDate = startEl.value ? dayjs(startEl.value) : dayjs();
            
            let newDate = baseDate.add(days, 'day').format('YYYY-MM-DD');
            startEl.value = newDate;
            endEl.value = newDate;
            presetEl.value = 'custom';
            
            renderLatesJournal();
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

                const role = window.USER ? window.USER.role : '';
                const canEdit = (role === 'ovn' || role === 'manager' || role === 'owner') && !r.editedBy;
                const editHtml = canEdit ? `<span onclick="triggerEditOVN('${r.id}', '${(r.notes || "").replace(/'/g, "\\'")}')" style="cursor:pointer; margin-left:8px; opacity:0.6" title="Редактировать">✏️</span>` : '';

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
                    <td data-label="РАБОТА" style="font-size:12px; opacity:0.7">
                        ${r.notes || '-'}
                        ${editHtml}
                    </td>
                </tr>`;
            }).join('');
        };

        window.triggerEditOVN = async function(id) {
            const report = window.lastOvnVideoRes.find(r => r.id == id);
            if (!report) return showToast("Не удалось найти запись", "success");

            window.CURRENT_EDIT_OVN_ID = id;

            document.getElementById('ovn-location').value = report.location;
            window.updateMastersDropdown(); 
            
            setTimeout(() => {
                document.getElementById('ovn-barber').value = report.master;
                if (!document.getElementById('ovn-barber').value) {
                    const opt = document.createElement('option');
                    opt.value = report.master;
                    opt.innerText = report.master;
                    document.getElementById('ovn-barber').appendChild(opt);
                    document.getElementById('ovn-barber').value = report.master;
                }
                
                let dateVal = report.date || '';
                if (dateVal.includes('.')) {
                   const parts = dateVal.split('.');
                   if (parts.length === 3) dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                document.getElementById('ovn-date').value = dateVal;
                
                document.getElementById('ovn-time').value = report.time || '';
                document.getElementById('ovn-cost').value = report.price !== undefined ? report.price : '';
                
                const receiptMatch = (report.receipt || '').toLowerCase().includes('да') ? 'да' : 'нет';
                document.getElementById('ovn-match').value = receiptMatch;
                
                document.getElementById('ovn-nation').value = report.race || report.ethnicity || 'Русский';
                
                const container = document.getElementById('ovn-violations-container');
                const firstSelect = container.querySelector('select');
                container.innerHTML = ''; 
                container.appendChild(firstSelect);
                
                const violationsList = (report.violation || '').split(',').map(s => s.trim()).filter(Boolean);
                firstSelect.value = violationsList[0] && Array.from(firstSelect.options).some(o=>o.value===violationsList[0]) ? violationsList[0] : 'Замечаний нет';
                
                for (let i = 1; i < violationsList.length; i++) {
                    const nextV = violationsList[i];
                    if (nextV && Array.from(firstSelect.options).some(o=>o.value===nextV)) {
                        const newDiv = document.createElement('div');
                        newDiv.style.display = 'flex';
                        newDiv.style.gap = '10px';
                        newDiv.style.alignItems = 'center';
                        
                        const newSelect = firstSelect.cloneNode(true);
                        newSelect.required = false;
                        newSelect.value = nextV;
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.type = 'button';
                        removeBtn.innerHTML = '×';
                        removeBtn.style.cssText = 'background: rgba(255,59,48,0.2); color: #FF3B30; border: none; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1;';
                        removeBtn.onclick = function() { newDiv.remove(); };
                        
                        newDiv.appendChild(newSelect);
                        newDiv.appendChild(removeBtn);
                        container.appendChild(newDiv);
                    }
                }
                
                let cleanNotes = report.notes ? report.notes.replace(/ \(отредактировано.*\)/, '') : '';
                document.getElementById('ovn-notes').value = cleanNotes;
                
                const titleEl = document.getElementById('ovn-modal-title');
                if (titleEl) titleEl.innerText = "Редактирование проверки ОВН";
                
                const modal = document.getElementById('ovn-modal');
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('active');
            }, 50);
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
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items:start">
                                <div class="form-field">
                                    <label style="font-size:9px; opacity:0.5; margin-bottom:4px">План</label>
                                    <input type="text" class="sched-plan" value="${m.startTime || '--:--'}" readonly disabled style="width:100%; padding:6px; background: rgba(255,255,255,0.08); color: var(--text-muted); border: 1px solid transparent; text-align: center; border-radius:10px; font-size:14px;">
                                </div>
                                <div class="form-field">
                                    <label style="font-size:9px; opacity:0.5; margin-bottom:4px">Факт</label>
                                    <input type="time" class="sched-fact" value="${check ? check.time : ''}" style="width:100%; padding:6px; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.1); text-align: center; border-radius:10px; font-size:14px; outline:none;" 
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

        function updateLateness(el, barberId) {
            const card = el.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = card.querySelector('.sched-fact').value;
            const resEl = document.getElementById(`late-calc-${barberId}`);
            if (plan && fact) {
                const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
                resEl.innerHTML = diff > 0 ? `<span style="color:#FF3B30">⚠️ Опоздание: ${diff} мин</span>` : `<span style="color:#34C759">✅ Вовремя</span>`;
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
                return v.includes('опоздал') || v.includes('рѕрїрѕр·рґ');
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
                    const diff = dayjs(`2000-01-01 ${r.time}`).diff(dayjs(`2000-01-01 ${r.schedTime}`), 'minute');
                    if (diff > 0) delayText = `+${diff} мин`;
                    else if (diff < 0) delayText = `${Math.abs(diff)} мин раньше`;
                    else delayText = 'вовремя';
                }

                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.01); height: 50px;">
                    <td style="font-size:14px; padding-left:25px"><b>${r.barber || 'Мастер'}</b></td>
                    <td><span style="display:inline-block; padding:4px 10px; border-radius:8px; font-size:12px; ${badgeStyles}; text-align:center;">${r.violation || (delayText.includes('+') ? 'Опоздал' : (isOk ? 'Ок' : '-'))}</span></td>
                    <td style="font-size:11px; white-space:nowrap; opacity:0.6;">${dayjs(r.date || r.createdAt || new Date()).format('DD.MM HH:mm')}</td>
                    <td style="font-size:14px; font-weight:700; color:var(--accent)">${r.location || '...'}</td>
                    <td style="font-size:13px; opacity:0.7">${r.schedTime || '--:--'}</td>
                    <td style="font-size:13px; color:white"><b>${r.time || '--:--'}</b></td>
                    <td style="font-size:13px; color:${delayText.includes('+') ? '#FF3B30' : (isOk ? '#34C759' : 'inherit')}"><b>${delayText}</b></td>
                </tr>`;
            }).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; opacity:0.5">Журнал пуст</td></tr>';
        };

        async function quickSaveLate(barber, btn) {
            const card = btn.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = card.querySelector('.sched-fact').value;
            if (!fact) { showToast('Укажите фактическое время прихода', "success"); return; }

            const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
            const violation = diff > 0 ? 'Мастер опоздал' : 'Замечаний нет';
            const fine = diff > 0 ? 500 : 0;

            const report = {
                location: document.getElementById('lates-audit-loc').value,
                barber: barber,
                date: dayjs().format('YYYY-MM-DD'),
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
                showToast('Ошибка сохранения: ' + e.message, "error");
                btn.innerText = 'Ошибка';
            }
        }

        const PRIMARY = BARBER_ROSTER;

        let currentContextCell = null;
        let pendingReplacementMaster = null;

        function showContextMenu(e, date, location, masterName) {
            if (window.USER && window.USER.role === 'ovn') return;
            e.preventDefault();
            e.stopPropagation();
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
            const available = unique;

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
            if (window.USER && window.USER.role === 'ovn') return;
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
            if (window.USER && window.USER.role === 'ovn') return;
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
            closeTimePicker();
            document.getElementById('custom-time-modal').classList.add('active');
        }

        function closeCustomTimeModal() {
            document.getElementById('custom-time-modal').classList.remove('active');
        }

        function submitCustomTime() {
            const from = document.getElementById('custom-time-from').value;
            const to = document.getElementById('custom-time-to').value;
            applyTime('\u0421 ' + from + ' \u0434\u043E ' + to);
            closeCustomTimeModal();
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
                    bodyHtml += `<tr><td class="sched-master-name sched-master-row-btn" onclick="showRowTimePicker(event, '${loc}', '${m}')" title="Выбрать график на весь месяц">${m}</td>`;
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
            btn.innerText = '⌛ Сохранение...';
            btn.disabled = true;

            const gridData = {}; // { "date|loc": [masters] }
            
            document.querySelectorAll('.sched-cell').forEach(cell => {
                const date = cell.dataset.date;
                const loc = cell.dataset.loc;
                const master = cell.dataset.master;
                const text = cell.innerText.trim();
                
                const key = `${date}|${loc}`;
                if (!gridData[key]) gridData[key] = [];
                
                if (text === '' || text.toLowerCase() === 'выходной' || text.toLowerCase() === 'вых') return;
                
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
                btn.innerText = '✅ Сохранено';
                setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
            } catch (e) {
                showToast('Ошибка сохранения', "error");
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
            let tg_id = urlId || localStorage.getItem('tg_id') || getCookie('tg_id') || 'manager_test';
            
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
            if (hash) {
                switchTab(hash);
            } else {
                if (window.USER?.role === 'ovn') switchTab('ovn', document.getElementById('tab-ovn'));
                else if (window.USER?.role === 'master') switchTab('master-cabinet', document.getElementById('tab-master'));
                else switchTab('analytics', document.getElementById('tab-analytics'));
            }
            
            window.addEventListener('hashchange', () => {
                const h = location.hash.replace('#', '');
                if (h) switchTab(h);
            });
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
                document.getElementById('tab-master').style.display = 'none';
            } else if (role === 'ovn') {
                document.getElementById('tab-analytics').style.display = 'none';
                document.getElementById('tab-master').style.display = 'none';
                document.getElementById('tab-manager').style.display = 'none';
                document.getElementById('tab-ovn').style.display = 'inline-block';
                document.getElementById('tab-lates').style.display = 'inline-block';
                document.getElementById('tab-schedule').style.display = 'inline-block';
                const saveBtn = document.querySelector('#schedule-section .btn-submit');
                if (saveBtn) saveBtn.style.display = 'none';
                const hintEl = document.getElementById('schedule-hint-text');
                if (hintEl) hintEl.style.display = 'none';
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
                document.getElementById('drilldown-title').innerText = 'Детализация: Качество ОВН (За месяц)';
                document.getElementById('drilldown-table').innerHTML = `
                    <thead>
                        <tr>
                            <th>Филиал / Мастер</th>
                            <th>Показатель</th>
                            <th>Тренд</th>
                        </tr>
                    </thead>
                    <tbody id="drilldown-body">
                ` + window.OVN_DRILLDOWN.map((item, idx) => `
                    <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                        <td><span class="chevron">›</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '↗' : '↘'}</td>
                    </tr>
                    ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
                `).join('') + `</tbody>`;
                window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
                return;
            }

            if(!window.DASH_DATA) return;
            const data = window.DASH_DATA[type === 'revenue' ? 'revenue' : (type === 'returns' ? 'returnRate' : (type === 'intervals' ? 'cycle' : (type === 'appointments' ? 'appointments' : (type === 'occupancy' ? 'occupancy' : null))))];
            if(!data) return;
            if (type === 'returns' && data.drilldown && data.drilldown.length >= 2) {
                container.style.display = 'block';
                const labels = {
                    'revenue': 'Выручка / Рост',
                    'returns': 'Возвращаемость (RR)',
                    'intervals': 'Цикл визита',
                    'appointments': 'Онлайн-записи',
                    'occupancy': 'Заполняемость'
                };
                document.getElementById('drilldown-title').innerText = 'Детализация: ' + (labels[type] || type);
                
                if (!window.switchDrillTab) {
                    window.switchDrillTab = function(tabName, btn) {
                        document.querySelectorAll('.drill-tab').forEach(b => {
                            b.style.color = '#888';
                            b.style.borderBottom = 'none';
                        });
                        btn.style.color = '#E8FF38';
                        btn.style.borderBottom = '2px solid #E8FF38';
                        document.getElementById('drill-masters-body').style.display = tabName === 'masters' ? 'table-row-group' : 'none';
                        document.getElementById('drill-branches-body').style.display = tabName === 'branches' ? 'table-row-group' : 'none';
                    };
                }

                document.getElementById('drilldown-table').innerHTML = `
                    <thead>
                        <tr><td colspan="3" style="padding:0; border:none;">
                            <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:15px; font-size:14px; font-weight:600;">
                                <div class="drill-tab" onclick="switchDrillTab('masters', this)" style="padding:15px 25px; cursor:pointer; color:#E8FF38; border-bottom:2px solid #E8FF38;">По мастерам</div>
                                <div class="drill-tab" onclick="switchDrillTab('branches', this)" style="padding:15px 25px; cursor:pointer; color:#888;">По филиалам</div>
                            </div>
                        </td></tr>
                        <tr>
                            <th>Объект детализации</th>
                            <th>Возвращаемость (RR)</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="drill-masters-body">
                        ${data.drilldown[0].masters.map((m, i) => `<tr><td>${i+1}. ${m.name}</td><td colspan="2" style="font-weight:bold; color:var(--accent);">${m.v}</td></tr>`).join('')}
                    </tbody>
                    <tbody id="drill-branches-body" style="display:none;">
                        ${data.drilldown[1].masters.map((m, i) => `<tr><td>${i+1}. ${m.name}</td><td colspan="2" style="font-weight:bold; color:var(--accent);">${m.v}</td></tr>`).join('')}
                    </tbody>
                `;
                window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
                return;
            }

            const labels = {
                'revenue': 'Выручка / Рост',
                'returns': 'Возвращаемость (RR)',
                'intervals': 'Цикл визита',
                'appointments': 'Онлайн-записи',
                'occupancy': 'Заполняемость'
            };
            container.style.display = 'block';
            document.getElementById('drilldown-title').innerText = 'Детализация: ' + (labels[type] || type);
            document.getElementById('drilldown-table').innerHTML = `
                <thead>
                    <tr>
                        <th>Филиал / Мастер</th>
                        <th>Показатель</th>
                        <th>Тренд</th>
                    </tr>
                </thead>
                <tbody id="drilldown-body">
                ` + data.drilldown.map((item, idx) => `
                <tr class="branch-row" onclick="this.classList.toggle('active'); document.querySelectorAll('.m-${idx}').forEach(m => m.classList.toggle('active'))">
                    <td><span class="chevron">›</span>${item.name}</td><td>${item.value}</td><td class="trend-${item.trend}">${item.trend === 'up' ? '↗' : '↘'}</td>
                </tr>
                ${item.masters.map(m => `<tr class="master-row m-${idx}"><td>${m.name}</td><td>${m.v}</td><td>-</td></tr>`).join('')}
            `).join('') + `</tbody>`;
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
                        <input type="text" class="branch-name-input" value="${branchName}" style="flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px; font-weight: bold; font-size: 16px;" placeholder="Название филиала">
                        <input type="text" class="branch-term-input" value="${config.el_kassa_terminal || ''}" placeholder="El.Kassa Терминал" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                        <input type="text" class="branch-yc-input" value="${config.yclients_company_id || ''}" placeholder="YClients ID" style="width: 150px; background: #000; border: 1px solid #444; color: #fff; padding: 8px; border-radius: 4px;">
                        <button onclick="this.closest('.adapter-branch').remove()" style="background: #ff4444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Удалить</button>
                    </div>
                    
                    <div class="masters-list" style="padding-left: 20px; border-left: 2px solid #333; overflow-x: auto; padding-bottom: 5px;"><div style="min-width: 680px;"><div style="font-size: 12px; color: #888; margin-bottom: 5px; display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 80px 80px 42px; gap: 10px; align-items: center;">
                            <span>Имя в Дашборде (dash)</span>
                            <span>Имена в Элкассе (через запятую)</span>
                            <span>YClients Staff ID</span>
                            <span>Выход</span>
                            <span>Процент</span>
                            <span></span>
                        </div>
                `;
                
                if (config.masters) {
                    for (const master of config.masters) {
                        html += `
                        <div class="adapter-master" style="display: grid; grid-template-columns: 1.5fr 2fr 1.5fr 80px 80px 42px; gap: 10px; margin-bottom: 8px; align-items: center;">
                            <input type="text" class="m-dash" value="${master.dash || ''}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: var(--accent); padding: 6px; border-radius: 4px;">
                            <input type="text" class="m-el" value="${(master.el_kassa || []).join(', ')}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="Шохназар Д., Шохназар">
                            <input type="text" class="m-yc" value="${master.yclients_id || ''}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="YClients ID">
                            <input type="number" class="m-base" value="${master.payBase || 3000}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="Выход">
                            <input type="number" class="m-percent" value="${master.payPercent || 40}" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="%">
                            <button onclick="this.closest('.adapter-master').remove()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 0; border-radius: 4px; cursor: pointer; text-align: center;">✕</button>
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
                <div class="masters-list" style="padding-left: 20px; border-left: 2px solid #333; overflow-x: auto; padding-bottom: 5px;">
                    <button onclick="addAdapterMaster(this)" style="margin-top: 10px; background: transparent; border: 1px dashed #555; color: #888; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">+ Добавить мастера</button>
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
                <input type="text" class="m-dash" value="Имя" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: var(--accent); padding: 6px; border-radius: 4px;">
                <input type="text" class="m-el" value="" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="Имена в элкассе через запятую">
                <input type="text" class="m-yc" value="" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="YClients ID">
                <input type="number" class="m-base" value="3000" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="Выход">
                <input type="number" class="m-percent" value="40" style="width: 100%; min-width: 0; background: #000; border: 1px solid #444; color: #fff; padding: 6px; border-radius: 4px;" placeholder="%">
                <button onclick="this.closest('.adapter-master').remove()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 6px 0; border-radius: 4px; cursor: pointer; text-align: center;">✕</button>
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
                showToast('Ошибка сохранения:\n' + e.message, "error");
                btn.innerText = 'Сохранить изменения';
            }
        }

        // ================= MANAGER CABINET LOGIC =================
        const MANAGER_CHECK_FIELDS = [
            { id: 1, label: 'Рамки с ценами, светильники в зале исправны, включены и выглядят опрятно.', photo: 'optional' },
            { id: 2, label: 'Инструмент мастера в исправном состоянии (нет сломанных машинок/гребней).', photo: 'optional' },
            { id: 3, label: 'В салоне поддерживается комфортная температура в диапазоне 19-23 градуса.', photo: 'optional' },
            { id: 4, label: 'В зале на видных местах не хранятся коробки промоутеров, вода и другой хозяйственный инвентарь.', photo: 'optional' },
            { id: 5, label: 'Музыка играет строго из согласованного плей-листа, поддерживается оптимальная фоновая громкость.', photo: 'optional' },
            { id: 6, label: 'Проверка технической части: работают все розетки, терминал, нет протечек воды, в туалете есть бумага и мыло.', photo: 'optional' },
            { id: 7, label: 'Каждый мастер обязательно проводит детальную консультацию с клиентом перед началом стрижки.', photo: 'optional' },
            { id: 8, label: 'Цветные бутылочки и косметика, не входящая в нашу официальную рабочую матрицу, полностью отсутствуют на рабочих местах.', photo: 'optional' },
            { id: 9, label: 'Все зафиксированные нарушения из таблицы (ОВН) за последние 48 часов проработаны на месте с мастерами.', photo: 'optional' }
        ];

        

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

        /* FINES LOGIC */
        function getViolationFine(violationRaw, notesRaw, r) {
            if (r && r.isManualFine) return Number(r.cost) || 0;
            
            let violations = [];
            if (Array.isArray(violationRaw)) {
                violations = violationRaw;
            } else if (typeof violationRaw === 'string' && violationRaw.includes(',')) {
                violations = violationRaw.split(',').map(v => v.trim());
            } else {
                violations = [violationRaw];
            }
            let maxFine = 0;

            for (const raw of violations) {
                const v = (raw || '').toLowerCase();
                const n = (notesRaw || '').toLowerCase();
                let currentFine = 0;

                // Match with keys in handbook
                for (const [key, value] of Object.entries(GLOBAL_HANDBOOK)) {
                    const lowKey = key.toLowerCase();
                    if (v.includes(lowKey) || n.includes(lowKey)) {
                        currentFine = value;
                        break;
                    }
                }

                
                // Inject parse logic for "Пробиты не все услуги" penalty
                if (v.includes('пробиты не все услуги')) {
                    const matchRegex = /Сумма непробитых услуг: (\d+)/;
                    const m = n.match(matchRegex) || v.match(matchRegex);
                    if (m) currentFine = parseInt(m[1], 10);
                }

                // fallback/special logic for variants
                if (currentFine === 0) {
                     if (v.includes('опоздал') || n.includes('опоздани')) currentFine = GLOBAL_HANDBOOK["Опоздание"] || 300;
                     else if (v.includes('не выход') || v.includes('невыход')) currentFine = GLOBAL_HANDBOOK["Невыход"] || 5000;
                     else if (v.includes('воровство') || v.includes('неоплаченная')) currentFine = GLOBAL_HANDBOOK["Воровство"] || 5000;
                }

                // Minutes logic
                if (v.includes('опоздал') || n.includes('опоздани')) {
                    let minutes = 0;
                    const match = n.match(/на\s+(\d+)\s+мин/);
                    if (match) minutes = parseInt(match[1]);
                    if (minutes >= 30) currentFine = Math.max(currentFine, 1000);
                    else if (minutes >= 20) currentFine = Math.max(currentFine, 500);
                }
                
                if (currentFine > maxFine) maxFine = currentFine;
            }
            return maxFine;
        }

        function isMandatoryFine(vRaw, nRaw, r) {
            if (r && r.isManualFine) return true;
            let violations = [];
            if (Array.isArray(vRaw)) {
                violations = vRaw;
            } else if (typeof vRaw === 'string' && vRaw.includes(',')) {
                violations = vRaw.split(',').map(v => v.trim());
            } else {
                violations = [vRaw];
            }
            for (const raw of violations) {
                const v = (raw || '').toLowerCase();
                const n = (nRaw || '').toLowerCase();
                if (v.includes('пробит')) return true;
                if (v.includes('опоздал') || n.includes('опоздани')) return true;
                if (v.includes('воровство')) return true;
                if (v.includes('неоплаченная') || v.includes('терминал')) return true;
                if (v.includes('не выход') || v.includes('невыход')) return true;
            }
            return false;
        }

        function calculateFines(reports) {
            const masters = {};
            reports.forEach(r => {
                const rawName = r.barber;
                if (!rawName) return;
                const name = rawName.trim();
                // Ensure name matches adapter capitalization if possible, otherwise use trimmed rawName
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
                        const vList = Array.isArray(r.violation) ? r.violation : (r.violation ? String(r.violation).split(',').map(v => v.trim()) : []);
                        
                        vList.forEach(vName => {
                             if (!vName) return;
                             
                             const fine = getViolationFine(vName, r.notes, r);
                             const isMandatory = isMandatoryFine(vName, r.notes, r);
                             
                             // All explicit violations count towards the zone threshold
                             if (!vName.toLowerCase().includes('замечаний нет')) {
                                 violationsCount++;
                             }

                             if (isMandatory) {
                                 let finalFine = fine;
                                 if (vName.toLowerCase().includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) {
                                     lateCount++;
                                     if (lateCount >= 2) finalFine *= 2;
                                 }
                                 if (dayjs(r.date || r.createdAt).format('YYYY-MM') === currentMonth) {
                                     currentMonthFines += finalFine;
                                 }
                             } else if (fine > 0) {
                                 weekViolationsList.push({ type: vName.toLowerCase(), fine: fine, r });
                             }
                        });
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
                            // Only reset to Green if week is over or it's a new week with few violations
                            // Actually, keep Green if we are already Green.
                            state = 'Green';
                        }
                    } else if (state === 'Yellow') {
                        if (violationsCount > 9) {
                            state = 'Red';
                            weekViolationsList.forEach(v => { zoneFine += v.fine; });
                        } else if (violationsCount === 0) {
                            // Recovery: reset to Green only if 0 violations in a full week
                            state = 'Green';
                        } else {
                            // Stay Yellow if there are still some violations
                            state = 'Yellow';
                        }
                    } else if (state === 'Red') {
                        if (violationsCount === 0) {
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Загрузка...</td></tr>';
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
                                <td style="color:#FF3B30; font-weight:bold;">${r.cost} ₽</td>
                            </tr>`;
                        }
                    });
                    if (mHtml === '') mHtml = '<tr><td colspan="5" style="text-align:center; color:#888;">Ручных штрафов нет</td></tr>';
                    manualTbody.innerHTML = mHtml;
                }
                if (Object.keys(results).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Нет данных</td></tr>';
                    return;
                }
                const currentMonth = dayjs().format('MM / YYYY');
                let html = '';
                const zoneBadge = {
                    'Green': '<span style="color:#34C759; background:rgba(52,199,89,0.15); padding:4px 10px; border-radius:6px; font-weight:800; font-size:12px;">🟢 ЗЕЛЕНАЯ</span>',
                    'Yellow': '<span style="color:#FF9F0A; background:rgba(255,159,10,0.15); padding:4px 10px; border-radius:6px; font-weight:800; font-size:12px;">🟡 ЖЕЛТАЯ</span>',
                    'Red': '<span style="color:#FF3B30; background:rgba(255,59,48,0.15); padding:4px 10px; border-radius:6px; font-weight:800; font-size:12px;">🔴 КРАСНАЯ</span>'
                };
                for (const m in results) {
                    const data = results[m];
                    html += `<tr>
                        <td>${currentMonth}</td>
                        <td style="font-weight:700">${m}</td>
                        <td>${zoneBadge[data.state]}</td>
                        <td><strong style="color:white; font-size: 15px;">${data.weekViolations}</strong></td>
                        <td style="color:#FF3B30; font-weight:700; font-size: 15px;">${data.monthFines} ₽</td>
                    </tr>`;
                }
                tbody.innerHTML = html;
            } catch(e) {
                console.error(e);
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#FF3B30">Ошибка загрузки данных или скрипта.</td></tr>';
            }
        }

        // ===================================
        // MANUAL FINE MODULE
        // ===================================
        window.updateManualFineAmount = function() {
            const v = document.getElementById('mf-violation').value;
            const costInput = document.getElementById('mf-cost');
            if (GLOBAL_HANDBOOK[v] !== undefined) {
                costInput.value = GLOBAL_HANDBOOK[v];
            } else {
                costInput.value = '';
            }
        };

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
            sel.innerHTML = '<option value="">Выберите мастера</option>';
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
            btn.textContent = 'Сохранение...';

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
                    showToast('Ручной штраф успешно добавлен!', "success");
                    document.getElementById('manual-fine-form').reset();
                    closeManualFineModal();
                    if (document.getElementById('fines-modal').classList.contains('active')) {
                        renderFinesTable();
                    }
                    if (window.SALARY_MODE_MANAGER || document.getElementById('salary-modal').classList.contains('active')) {
                        renderSalaryTable();
                    }
                } else {
                    showToast('Ошибка при сохранении ручного штрафа', "error");
                }
            } catch (err) {
                console.error(err);
                showToast('Ошибка сети', "error");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Начислить штраф';
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
    return { base: 5000, percent: 40, loc: 'Неизв' };
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
                if (vString.includes('опоздал') || (r.notes||'').toLowerCase().includes('опоздани')) {
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
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;"><div class="spinner" style="margin: 0 auto 10px auto;"></div>Загружаем смены и штрафы...</td></tr>';
    
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">Нет данных или мастер не выбран</td></tr>';
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
            
            const safeId = mName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-А-Яа-я]/g, '');
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
                    Выход ${conf.base}₽<br>${conf.percent}%
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222;">
                    <div style="position:relative; display:inline-block;">
                        <input type="number" id="rev-${safeId}" value="${prevRev}" placeholder="Укажите выручку" 
                               style="width:110px; padding:8px 30px 8px 8px; background:#111; color:#fff; border:1px solid #444; border-radius:8px;" 
                               oninput="window.updateRowMath('${safeId}', '${mName}', ${conf.base}, ${conf.percent}, ${shifts.shiftsCount}, ${shifts.hours}, ${fines})">
                    </div>
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; font-size:12px;">
                    Смен: ${shifts.shiftsCount}<br>Часов: ${shifts.hours}
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #222; color:#FF3B30; font-weight:600;">
                    -${fines} ₽
                </td>
                <td id="res-${safeId}" style="padding: 12px 10px; border-bottom: 1px solid #222; font-size: 17px; font-weight: 800; text-align: right; color:#34C759;">
                    0 ₽
                </td>
            `;
            tbody.appendChild(tr);
            window.updateRowMath(safeId, mName, conf.base, conf.percent, shifts.shiftsCount, shifts.hours, fines);
        });
        console.log("[SALARY] Calculation complete.");
    } catch(err) {
        console.error("[SALARY] Error:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#FF3B30;">Ошибка при загрузке: ' + err.message + '</td></tr>';
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
        resEl.innerHTML = (earnings).toLocaleString() + ' ₽';
        if (percentagePay > basePay) {
            resEl.innerHTML += '<br><span style="font-size:10px; color:#888;">(процент)</span>';
        } else {
            resEl.innerHTML += '<br><span style="font-size:10px; color:#888;">(выход)</span>';
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
                <td colspan="5" style="padding: 15px; text-align: right; color: #fff;">ИТОГО К ВЫПЛАТЕ:</td>
                <td style="padding: 15px; text-align: right; color: #34C759; font-size: 18px;">${total.toLocaleString()} ₽</td>
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
    
    btn.innerText = 'Загрузка...';
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
                statusText.innerText = 'Фото загружено в ' + timeStr;
                btn.innerText = 'Обновить фото';
                btn.disabled = false;
            }
        } catch (err) {
            console.error('Upload failed:', err);
            statusText.innerText = 'Ошибка загрузки';
            btn.innerText = 'Сделать фото';
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

    const rusDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
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

        let val = 'выходной';
        let bg = 'rgba(255,255,255,0.05)';
        let border = '1px solid rgba(255,255,255,0.1)';
        
        if (masterData) {
            val = masterData.text || (masterData.startTime ? `С ${masterData.startTime.split(':')[0]} до 22` : 'С 10 до 22');
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
    btn.innerHTML = '<svg style="animation: spin 1s linear infinite; margin-right:8px; display:inline-block; vertical-align:middle;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> Считаю...';
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

window.fetchRealtimeSalary = async function() {
    const start = document.getElementById('salary-date-start').value;
    const end = document.getElementById('salary-date-end').value;
    if (!start || !end) { showToast("Выберите даты!", "success"); return; }
    
    const btn = document.getElementById('salary-fetch-btn');
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:12px; height:12px; border-width:2px; display:inline-block; margin-right:8px; vertical-align:middle;"></span> Загружаем...';
    
    try {
        const res = await fetch('/api/fetch_salary', {
            method: 'POST',
            body: JSON.stringify({ start: start.split('-').reverse().join('.'), end: end.split('-').reverse().join('.') })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        console.log("[SALARY REALTIME] Data received:", data);
        
        // Inject into dashboardData to allow auto-fill to pick it up
        if (!window.dashboardData) window.dashboardData = {};
        window.dashboardData.salaryWeekly = {
            start: start.split('-').reverse().join('.'),
            end: end.split('-').reverse().join('.'),
            revenue: data.revenue,
            workDays: data.workDays
        };
        
        // Clear manual cache to force re-fill
        window.SALARIES_CACHE = {}; 
        
        await window.renderSalaryTable();
        showToast("Данные успешно загружены из El-Kassa!", "success");
    } catch(e) {
        console.error("Fetch Error:", e);
        showToast("Ошибка выгрузки: " + e.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
};

// --- MANAGER AUDIT MODULE ---
window.openManagerModal = function() {
    document.getElementById('manager-modal').classList.add('active');
    
    const locSelect = document.getElementById('manager-location');
    if (locSelect) {
        locSelect.innerHTML = '<option value="">Выберите салон...</option>';
        if (typeof ADAPTER !== 'undefined') {
            Object.keys(ADAPTER).forEach(loc => {
                locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
            });
        } else if (typeof LOCATIONS !== 'undefined') {
            LOCATIONS.forEach(loc => {
                locSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
            });
        }
    }
    
    const container = document.getElementById('manager-fields-container');
    let html = '';
    
    // ZONES (AI CHECK)
    const zones = [
        { id: 'reklama', title: 'Наружная реклама', desc: 'Реклама исправна и чистая.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Реклама' },
        { id: 'forma', title: 'Мастера в форме', desc: 'Чистая форма, закрытая обувь.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Мастера' },
        { id: 'kreslo', title: 'Кресло развернуто ко входу', desc: 'Кресло направлено ко входу, есть пеньюар.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Кресло' },
        { id: 'tv', title: 'Телевизор', desc: 'Телевизор включен и работает.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Телевизор' },
        { id: 'shkaf', title: 'Шкафы', desc: 'На шкафах нет волос и личных вещей.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Шкафы' },
        { id: 'moyka', title: 'Мойка', desc: 'Раковина чистая, нет тряпок на виду.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Мойка' }
    ];

    html += '<h3 style="font-size: 18px; margin: 0 0 15px 0;">Шаг 1: Фото-проверка ИИ</h3>';
    html += zones.map(zone => `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; margin-bottom: 20px;">
            <div style="padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="font-size: 16px; margin: 0; color: #fff;">${zone.title}</h3>
                    <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">${zone.desc}</p>
                </div>
            </div>
            <div style="display: flex; flex-direction: column;">
                <div style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="background: #000; padding: 8px; text-align: center; font-size: 11px; color: var(--accent); font-weight: bold; text-transform: uppercase;">Эталон</div>
                    <img src="${zone.img}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
                </div>
                <div style="flex: 1; position: relative; background: #161616;">
                    <div style="background: rgba(0,0,0,0.5); padding: 8px; text-align: center; font-size: 11px; color: #fff; font-weight: bold; text-transform: uppercase;">Текущее состояние (Факт)</div>
                    <div style="display:flex; align-items:center; justify-content:center; min-height: 200px; padding: 20px; position:relative;">
                        <div id="btn-camera-${zone.id}" onclick="openCamera('${zone.id}')" 
                             style="cursor: pointer; background: rgba(255,255,255,0.05); border: 1px dashed var(--accent); border-radius: 12px; padding: 25px; width: 100%; text-align: center; color: var(--accent); font-size: 14px; font-weight: bold; transition: all 0.2s;">
                            📷 Сделать фото факта<br>
                            <span style="font-weight: 400; font-size: 12px; opacity: 0.7; color: #fff; display:block; margin-top:5px;">Строго через камеру (Live)</span>
                        </div>
                        
                        <img id="preview-${zone.id}" style="width:100%; height:200px; object-fit:cover; display:none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        
                        <button type="button" id="retake-${zone.id}" onclick="openCamera('${zone.id}')" 
                                style="display:none; position:absolute; bottom:15px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; border:1px solid #444; padding:8px 16px; border-radius:8px; font-size:12px; cursor:pointer;">
                            🔄 Переснять
                        </button>
                    </div>
                </div>
            </div>
            <div style="padding: 12px; background: rgba(52, 199, 89, 0.05); color: #34C759; font-size: 12px; text-align: center;">
                Вы уверены, что факт идентичен эталону? Если отправить фото с бардаком, ИИ вернет проверку.
            </div>
        </div>
    `).join('');

    // STANDARD CHECKLIST
    if (typeof MANAGER_CHECK_FIELDS !== 'undefined') {
        html += `
        <style>
            .ios-segmented-control {
                display: flex; gap: 8px; margin-bottom: 15px; background: rgba(0,0,0,0.4); padding: 5px; border-radius: 12px;
            }
            .ios-radio {
                flex: 1; text-align: center; cursor: pointer; position: relative;
            }
            .ios-radio input[type="radio"] { display: none; }
            .ios-radio-inner {
                padding: 12px 6px; font-size: 13px; font-weight: 700; border-radius: 10px; transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); color: var(--text-muted); border: 1px solid transparent;
            }
            .ios-radio input[type="radio"]:checked + .ios-radio-inner {
                box-shadow: 0 4px 10px rgba(0,0,0,0.3); transform: scale(1.02); background: #333; color: #fff;
            }
            .ios-radio input[type="radio"][value="yes"]:checked + .ios-radio-inner {
                background: rgba(52, 199, 89, 0.15); color: #34C759 !important; border: 1px solid rgba(52, 199, 89, 0.4);
            }
            .ios-radio input[type="radio"][value="no"]:checked + .ios-radio-inner {
                background: rgba(255, 69, 58, 0.15); color: #FF453A !important; border: 1px solid rgba(255, 69, 58, 0.4);
            }
            .manager-check-field {
                background: rgba(255,255,255,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px; transition: transform 0.2s, background 0.2s;
            }
            .manager-check-field:active { transform: scale(0.98); }
        </style>
        `;
        html += '<h3 style="font-size: 18px; margin: 30px 0 15px 0;">Шаг 2: Чек-лист</h3>';
        MANAGER_CHECK_FIELDS.forEach(f => {
            html += `
                <div class="form-field manager-check-field">
                    <label style="font-size: 14px; margin-bottom: 15px; display: block; font-weight: 500; line-height: 1.4;">${f.id}. ${f.label}</label>
                    <div class="ios-segmented-control">
                        <label class="ios-radio">
                            <input type="radio" name="check_${f.id}" value="yes" required>
                            <div class="ios-radio-inner">✅ Норма</div>
                        </label>
                        <label class="ios-radio">
                            <input type="radio" name="check_${f.id}" value="no">
                            <div class="ios-radio-inner">❌ Нарушение</div>
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: start;">
                        <input type="text" id="comment_${f.id}" placeholder="Комментарий..." required style="flex: 1; border-radius: 12px; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 14px; outline: none; transition: border 0.3s;" onfocus="this.style.border='1px solid var(--accent)'" onblur="this.style.border='1px solid rgba(255,255,255,0.1)'">
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
};

window.closeManagerModal = function() {
    document.getElementById('manager-modal').classList.remove('active');
};

window.openCamera = async function(zoneId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("ОШИБКА: Ваш браузер не поддерживает прямую работу с камерой. Открывать из галереи запрещено.", "success");
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
    closeBtn.innerText = 'Отмена';
    closeBtn.style.padding = '15px 30px'; closeBtn.style.fontSize = '16px'; closeBtn.style.borderRadius = '50px'; closeBtn.style.background = '#333'; closeBtn.style.color = '#fff'; closeBtn.style.border = 'none'; closeBtn.style.cursor = 'pointer';

    const snapBtn = document.createElement('button');
    snapBtn.innerText = '📸 Сделать фото';
    snapBtn.style.padding = '15px 30px'; snapBtn.style.fontSize = '16px'; snapBtn.style.borderRadius = '50px'; snapBtn.style.background = 'var(--accent)'; snapBtn.style.color = '#000'; snapBtn.style.border = 'none'; snapBtn.style.fontWeight = 'bold'; snapBtn.style.cursor = 'pointer';

    controls.appendChild(closeBtn); controls.appendChild(snapBtn);
    overlay.appendChild(video); overlay.appendChild(controls);
    document.body.appendChild(overlay);

    let activeStream = null;
    try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = activeStream;
    } catch(err) {
        showToast("Нет доступа к камере. Зайдите в Настройки браузера -> Разрешения -> Камера -> Разрешить.", "success");
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
    btn.innerHTML = 'Нейросеть проверяет и сохраняет данные... ⏳';
    btn.disabled = true;

    try {
        const checkData = {
            location: document.getElementById('manager-location').value,
            date: new Date().toISOString().split('T')[0],
            items: [],
            visionResults: []
        };

        // 1. Check AI Zones
        const zones = ['reception', 'workstation', 'coffee', 'facade'];
        for (const zone of zones) {
            const preview = document.getElementById('preview-' + zone);
            if (preview && preview.src && preview.src.startsWith('data:image')) {
                const res = await fetch('/api/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zoneId: zone, images: [preview.src] })
                });
                if (!res.ok) {
                    const errPayload = await res.json();
                    throw new Error(errPayload.error || 'Server error');
                }
                const data = await res.json();
                checkData.visionResults.push({ zone, data });
            }
        }
        
        if (checkData.visionResults.length === 0) {
            throw new Error("Нет фотографий факта для проверки. Сделайте минимум одно AI-фото.");
        }

        const failed = checkData.visionResults.filter(r => r.data && r.data.approved === false);
        if (failed.length > 0) {
            const errText = failed.map(f => `❌ Ракурс "${f.zone}": ${f.data.comment}`).join('\n\n');
            showToast("⚠️ ИИ-Аудитор отклонил проверку из-за нарушения стандартов!\n\n" + errText + "\n\nПожалуйста, наведите порядок и переснимите отклоненные фото!", "success");
            throw new Error("AI Validation Failed");
        }

        // 2. Iterate Checklist Items
        if (typeof fileToBase64 === 'undefined') {
            window.fileToBase64 = async function(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            }
        }

        if (typeof MANAGER_CHECK_FIELDS !== 'undefined') {
            for (const f of MANAGER_CHECK_FIELDS) {
                const radios = document.getElementsByName(`check_${f.id}`);
                let statusVal = '';
                radios.forEach(r => { if(r.checked) statusVal = r.value; });
                
                const commentVal = document.getElementById(`comment_${f.id}`).value;
                const fileInput = document.getElementById(`photo_${f.id}`);
                
                let photoUrl = null;
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    const base64 = await fileToBase64(fileInput.files[0]);
                    const upRes = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64 })
                    });
                    if (upRes.ok) {
                        const upData = await upRes.json();
                        photoUrl = upData.url;
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
        }

        // 3. Save Master Data
        checkData.status = 'approved_by_ai';
        const postRes = await fetch('/api/manager_checks', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(checkData)
        });
        
        if (!postRes.ok) throw new Error("Не удалось сохранить инспекцию на сервере");

        showToast("✅ Инспекция успешно пройдена и сохранена! ИИ подтвердил идеальную чистоту и классический чек-лист сохранен.", "success");
        document.getElementById('manager-form').reset();
        closeManagerModal();
        
    } catch(err) {
        if (err.message !== "AI Validation Failed") {
            console.error(err);
            showToast("Ошибка: " + err.message, "error");
        }
    } finally {
        btn.innerHTML = 'Отправить проверку';
        btn.disabled = false;
    }
};




        /* SETTINGS MENU */
        function toggleSettingsMenu() {
            const menu = document.getElementById('settings-menu');
            if (menu.style.display === 'none' || !menu.style.display) {
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }
        }
        // Close menu on outside click
        window.onclick = function(event) {
            if (!event.target.matches('.btn-refresh') && !event.target.closest('.settings-dropdown')) {
                const menu = document.getElementById('settings-menu');
                if (menu) menu.style.display = 'none';
            }
        }



// ==== HANDBOOK SETTINGS MODAL ====
window.openHandbookConfigModal = function() {
    document.getElementById('handbook-config-modal').classList.add('active');
    renderHandbookEditor();
};

window.closeHandbookConfigModal = function() {
    document.getElementById('handbook-config-modal').classList.remove('active');
};

window.renderHandbookEditor = function() {
    const container = document.getElementById('handbook-config-list');
    if (!container) return;
    
    let html = '';
    // Ensure GLOBAL_HANDBOOK is populated
    const hb = window.GLOBAL_HANDBOOK || {};
    
    // Auto-seed missing ones for convenience based on what is commonly used
    const commonKeys = [
        "Опоздание", "Невыход", "Воровство", "Грязное место", "Без формы", 
        "Разговор на нац. языке", "Отказ клиенту", "Жалоба", "Поломка",
        "Про акцию не сказал", "Телефон при клиенте", "Неоплаченная стрижка",
        "Не показал зеркало заднего вида", "Не обработал инструмент", "Другое"
    ];
    
    commonKeys.forEach(k => {
        if (hb[k] === undefined) hb[k] = 0;
    });
    
    for (const [key, val] of Object.entries(hb)) {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding:10px 15px; border-radius:10px; border: 1px solid rgba(255,255,255,0.05); margin-bottom:10px;">
                <span class="handbook-key" style="font-size:15px; font-weight:500;">${key}</span>
                <div style="display:flex; align-items:center;">
                    <input type="number" class="handbook-val-input" data-key="${key}" value="${val}" style="width: 80px; background: rgba(255,255,255,0.1); border:none; color:white; padding:8px; border-radius:6px; font-weight:bold; outline:none; text-align:right;">
                    <span style="color:var(--text-muted); margin-left:8px; margin-right:15px; font-size:14px;">₽</span>
                    <button onclick="deleteHandbookItem('${key}')" title="Удалить" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }
    
    // Add "Add new penalty" row
    html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03); padding:10px 15px; border-radius:10px; border: 1px dashed rgba(255,255,255,0.2); margin-top:10px;">
            <input type="text" id="new-handbook-key" placeholder="Новое нарушение" style="flex:1; background:transparent; border:none; color:white; outline:none; font-size:14px;">
            <div style="display:flex; align-items:center; margin-left: 10px;">
                <input type="number" id="new-handbook-val" placeholder="0" style="width: 70px; background: rgba(255,255,255,0.1); border:none; color:white; padding:8px; border-radius:6px; font-weight:bold; outline:none; text-align:right;">
                <span style="color:var(--text-muted); margin-left:8px; font-size:14px;">₽</span>
            </div>
        </div>
    `;
    container.innerHTML = html;
};

window.deleteHandbookItem = async function(key) {
    if(!confirm("Удалить нарушение '" + key + "'?")) return;
    delete window.GLOBAL_HANDBOOK[key];
    await window.saveHandbookConfig(true); // pass true to render immediately without closing
};

window.saveHandbookConfig = async function(keepOpen = false) {
    const inputs = document.querySelectorAll('.handbook-val-input');
    const newHb = {};
    
    // Keep existing items from inputs
    inputs.forEach(inp => {
        const key = inp.getAttribute('data-key'); // Use actual extracted key
        if (window.GLOBAL_HANDBOOK.hasOwnProperty(key)) { // check deleted
            const val = parseInt(inp.value) || 0;
            newHb[key] = val;
        }
    });
    
    // Check if there is a new item
    const newKeyInp = document.getElementById('new-handbook-key');
    const newValInp = document.getElementById('new-handbook-val');
    if (newKeyInp && newKeyInp.value.trim() !== '') {
        const nKey = newKeyInp.value.trim();
        const nVal = parseInt(newValInp.value) || 0;
        newHb[nKey] = nVal;
        
        // Add to global directly so we remember it
        window.GLOBAL_HANDBOOK[nKey] = nVal;
    }
    
    // To handle deletion, if it's missing from inputs but present in GLOBAL_HANDBOOK, it probably was deleted.
    const finalHb = {};
    for (const key of Object.keys(window.GLOBAL_HANDBOOK)) {
        if (newHb[key] !== undefined) finalHb[key] = newHb[key];
        else finalHb[key] = window.GLOBAL_HANDBOOK[key];
    }
    
    // Save to server
    try {
        const res = await fetch('/api/handbook', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalHb)
        });
        
        if (res.ok) {
            window.GLOBAL_HANDBOOK = finalHb;
            if(!keepOpen) {
                 if(window.showToast) window.showToast('Справочник штрафов сохранен!');
                 closeHandbookConfigModal();
            } else {
                 renderHandbookEditor();
            }
            if(window.renderSalary) window.renderSalary(window.SALARIES_CACHE, window.LAST_SCHEDULE);
        } else {
            throw new Error('Server error');
        }
    } catch(e) {
        if(window.showToast) window.showToast('Ошибка сохранения: ' + e.message, 'error');
        console.error(e);
    }
};


window.renderSettingsSchedule = function() {
    const container = document.getElementById('settings-schedule-container');
    if (!container) return;
    
    // We already have window.USER.schedule if backend provided it, wait...
    // Let's refetch it just in case
    if (!window.USER) return container.innerHTML = 'Сначала войдите в систему';
    
    // Create next 14 days
    const today = dayjs();
    let mySchedule = window.USER.schedule || [];
    let htmlStr = '';
    
    for (let i = 0; i < 14; i++) {
        const d = today.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        const dateDisp = d.format('DD.MM (dd)');
        const isChecked = mySchedule.includes(dateStr) ? 'class="sched-btn active" style="background:#007AFF;border-color:#007AFF;color:#fff;"' : 'class="sched-btn" style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#aaa;"';
        
        htmlStr += `
            <div data-date="${dateStr}" ${isChecked} onclick="toggleScheduleDate(this)" 
                style="padding: 10px 15px; border-radius: 8px; border: 1px solid; cursor: pointer; transition: 0.2s;">
                ${dateDisp}
            </div>
        `;
    }
    
    container.innerHTML = htmlStr;
};

window.toggleScheduleDate = function(el) {
    if (el.classList.contains('active')) {
        el.classList.remove('active');
        el.style.background = 'rgba(255,255,255,0.05)';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        el.style.color = '#aaa';
    } else {
        el.classList.add('active');
        el.style.background = '#007AFF';
        el.style.borderColor = '#007AFF';
        el.style.color = '#fff';
    }
};

window.saveMySchedule = async function() {
    if (!window.USER) return showToast('Ошибка: нет пользователя', 'error');
    
    const container = document.getElementById('settings-schedule-container');
    const activeDivs = container.querySelectorAll('.sched-btn.active');
    const dates = Array.from(activeDivs).map(d => d.getAttribute('data-date'));
    
    try {
        const res = await fetch('/api/me/schedule?tg_id=' + window.USER.id, {
            method: 'POST',
            body: JSON.stringify({ schedule: dates })
        });
        if (res.ok) {
            showToast('График успешно сохранен!', 'success');
            window.USER.schedule = dates;
        } else {
            showToast('Ошибка при сохранении', 'error');
        }
    } catch(err) {
        showToast('Ошибка сети', 'error');
    }
};

// Hook into switchTab
const origSwitchTabForSettings = window.switchTab;
window.switchTab = function(tabId, el) {
    if (origSwitchTabForSettings) origSwitchTabForSettings(tabId, el);
    if (tabId === 'settings') {
        window.renderSettingsSchedule();
    }
};

// Also display tab-settings only to auth'd users who need it
const settingsTabBtn = document.getElementById('tab-settings');
if (settingsTabBtn) {
    // Hidden by default, unhide in appInit
    settingsTabBtn.style.display = 'none';
}
