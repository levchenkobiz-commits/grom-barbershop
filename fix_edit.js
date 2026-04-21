const fs = require('fs');

// --- index.html ---
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
    '<h2 style="font-size: 24px; font-weight: 800;">Новая проверка ОВН</h2>',
    '<h2 id="ovn-modal-title" style="font-size: 24px; font-weight: 800;">Новая проверка ОВН</h2>'
);
fs.writeFileSync('index.html', html);

// --- mainscript.js ---
let js = fs.readFileSync('mainscript.js', 'utf8');

// 1. openOVNModal
js = js.replace(
    'window.openOVNModal = function() {',
    `window.CURRENT_EDIT_OVN_ID = null;
    window.openOVNModal = function() {
        const title = document.getElementById('ovn-modal-title');
        if (title) title.innerText = "Новая проверка ОВН";
        document.getElementById('ovn-form').reset();` // Added reset just in case
);

// 2. submitOVN
let submitLogic = `
        window.submitOVN = async function(e) {
            e.preventDefault();
            const btn = e.target.querySelector('.btn-submit');
            btn.disabled = true;
            btn.innerText = 'Сохранение...';
            try {
                const report = {
                    location: document.getElementById('ovn-location').value,
                    master: document.getElementById('ovn-barber').value,
                    date: document.getElementById('ovn-date').value,
                    time: document.getElementById('ovn-time').value,
                    price: parseFloat(document.getElementById('ovn-cost').value) || 0,
                    receipt: document.getElementById('ovn-match').value,
                    race: document.getElementById('ovn-nation').value,
                    violation: Array.from(document.querySelectorAll('.ovn-violation-select'))
                                    .map(s => s.value)
                                    .filter(v => v !== '') // not empty
                                    .join(', '),
                    notes: document.getElementById('ovn-notes').value
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
                    const errPayload = await res.json().catch(()=>({}));
                    throw new Error(errPayload.error || 'Ошибка сервера ' + res.status);
                }

                alert('Успешно сохранено!');
                closeOVNModal();
                loadOVNHistory();
            } catch(err) {
                console.error(err);
                alert("Ошибка: " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Сохранить';
            }
        };`;

const submitStart = js.indexOf('window.submitOVN = async function(e) {');
if (submitStart === -1) throw new Error("submitOVN not found");
const submitEnd = js.indexOf('};', submitStart) + 2;
js = js.substring(0, submitStart) + submitLogic.trim() + js.substring(submitEnd);

// 3. triggerEditOVN
let editLogic = `
        window.triggerEditOVN = async function(id) {
            const report = window.lastOvnVideoRes.find(r => r.id == id);
            if (!report) return alert("Не удалось найти запись");

            window.CURRENT_EDIT_OVN_ID = id;

            // Pre-fill the form
            document.getElementById('ovn-location').value = report.location;
            window.updateMastersDropdown(); 
            
            setTimeout(() => {
                document.getElementById('ovn-barber').value = report.master;
                if (!document.getElementById('ovn-barber').value) {
                    // Fallback if master not found in list
                    const opt = document.createElement('option');
                    opt.value = report.master;
                    opt.innerText = report.master;
                    document.getElementById('ovn-barber').appendChild(opt);
                    document.getElementById('ovn-barber').value = report.master;
                }
                
                // Format date correctly if it's stored weirdly? Usually it's YYYY-MM-DD
                let dateVal = report.date || '';
                // Check if it's DD.MM.YYYY
                if (dateVal.includes('.')) {
                   const parts = dateVal.split('.');
                   if (parts.length === 3) dateVal = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
                }
                document.getElementById('ovn-date').value = dateVal;
                
                document.getElementById('ovn-time').value = report.time || '';
                document.getElementById('ovn-cost').value = report.price !== undefined ? report.price : '';
                
                const receiptMatch = (report.receipt || '').toLowerCase().includes('да') ? 'да' : 'нет';
                document.getElementById('ovn-match').value = receiptMatch;
                
                document.getElementById('ovn-nation').value = report.race || report.ethnicity || 'Русский';
                
                // Violations
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
                
                let cleanNotes = report.notes ? report.notes.replace(/ \\(отредактировано.*\\)/, '') : '';
                document.getElementById('ovn-notes').value = cleanNotes;
                
                const titleEl = document.getElementById('ovn-modal-title');
                if (titleEl) titleEl.innerText = "Редактирование проверки ОВН";
                
                const modal = document.getElementById('ovn-modal');
                modal.style.display = 'flex';
                modal.offsetHeight;
                modal.classList.add('active');
            }, 50);
        };`;

const editStart = js.indexOf('window.triggerEditOVN = async function');
if (editStart === -1) throw new Error("triggerEditOVN not found");
const editEnd = js.indexOf('};', editStart) + 2;
js = js.substring(0, editStart) + editLogic.trim() + js.substring(editEnd);

fs.writeFileSync('mainscript.js', js);
console.log("Success");
