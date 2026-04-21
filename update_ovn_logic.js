const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

// 1. Add global `handleOvnViolationChange` function so the dropdown toggles the hidden input
if (!js.includes('handleOvnViolationChange')) {
    const handler = `
        window.handleOvnViolationChange = function() {
            const selectEl = document.getElementById('ovn-violation');
            const sumContainer = document.getElementById('unpaid-sum-container');
            const sumInput = document.getElementById('ovn-unpaid-sum');
            
            // Allow checking multi-select or single select
            let hasUnpaid = false;
            
            if (selectEl.multiple) {
                const opts = Array.from(selectEl.selectedOptions);
                hasUnpaid = opts.some(opt => opt.value === 'Пробиты не все услуги');
            } else {
                hasUnpaid = selectEl.value === 'Пробиты не все услуги';
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
`;
    // Insert into the script wherever convenient. I will put it right before `window.submitOVN = async function(e)`
    js = js.replace(/window\.submitOVN = async function\(e\) \{/, handler + '\n        window.submitOVN = async function(e) {');
}

// 2. Modify `submitOVN` to capture `ovn-unpaid` and inject it into the report logic.
// There is an `ovn-match` extraction there we might need to purge to prevent crashes, and we append the unpaid sum.
// Let's replace the whole `submitOVN` method safely.
js = js.replace(/window\.submitOVN = async function\(e\) \{[\s\S]*?finally \{\s*btn\.disabled = false;\s*btn\.innerText = '.*?';\s*\}\s*\};/,
`window.submitOVN = async function(e) {
            e.preventDefault();
            const btn = e.target.querySelector('.btn-submit');
            btn.disabled = true;
            btn.innerText = 'Сохранение...';
            try {
                let violationText = '';
                const selects = document.querySelectorAll('.ovn-violation-select');
                if (selects.length > 0) {
                    violationText = Array.from(selects)
                        .map(s => s.value)
                        .filter(v => v !== '')
                        .join(', ');
                } else {
                    const single = document.getElementById('ovn-violation');
                    if (single) {
                        if (single.multiple) {
                            violationText = Array.from(single.selectedOptions).map(opt => opt.value).join(', ');
                        } else {
                            violationText = single.value;
                        }
                    }
                }
                
                let notesText = document.getElementById('ovn-notes') ? document.getElementById('ovn-notes').value : '';
                const unpaidInput = document.getElementById('ovn-unpaid-sum');
                if (unpaidInput && unpaidInput.value && violationText.includes('Пробиты не все услуги')) {
                    notesText += \` (Сумма непробитых услуг: \${unpaidInput.value})\`;
                }

                const report = {
                    location: document.getElementById('ovn-location').value,
                    barber: document.getElementById('ovn-barber').value,
                    date: document.getElementById('ovn-date').value,
                    time: document.getElementById('ovn-time').value,
                    cost: parseFloat(document.getElementById('ovn-cost').value) || 0,
                    nation: document.getElementById('ovn-nation') ? document.getElementById('ovn-nation').value : '',
                    violation: violationText,
                    notes: notesText
                };

                let curMethod = 'POST';
                if (window.CURRENT_EDIT_OVN_ID) {
                    curMethod = 'PUT';
                    report.id = window.CURRENT_EDIT_OVN_ID;
                    report.editorName = window.USER ? window.USER.name : 'Менеджер';
                }

                const res = await fetch('/api/ovn', { 
                    method: curMethod, 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify(report)
                });

                if (!res.ok) {
                    throw new Error('Ошибка сервера ' + res.status);
                }

                showToast('Проверка сохранена!', "success");
                closeOVNModal();
                loadOVNHistory();
            } catch(err) {
                console.error(err);
                showToast("Ошибка: " + err.message, "error");
            } finally {
                btn.disabled = false;
                btn.innerText = 'Сохранить';
            }
        };`);


// 3. Modify `getViolationFine` to extract the custom fine and `isMandatoryFine` to flag it.
// Get getViolationFine body
js = js.replace(/if \(currentFine === 0\) \{[\s\S]*?else if \(v\.includes\('.*???????'??'.*?\).*?\}\s*}/, 
`if (currentFine === 0) {
                     if (v.includes('\u043E\u043F\u043E\u0437\u0434\u0430') || n.includes('\u043E\u043F\u043E\u0437\u0434\u0430\u043D')) currentFine = GLOBAL_HANDBOOK["\u041E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435"] || 300;
                     else if (v.includes('\u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435') || v.includes('\u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435')) currentFine = GLOBAL_HANDBOOK["\u041D\u0435\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043D\u0430\u044F \u0441\u0442\u0440\u0438\u0436\u043A\u0430"] || 5000;
                     else if (v.includes('\u043D\u0430\u0446\u0438\u043E\u043D') || v.includes('\u044F\u0437\u044B\u043A')) currentFine = GLOBAL_HANDBOOK["\u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440 \u043D\u0430 \u043D\u0430\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u043C \u044F\u0437\u044B\u043A\u0435"] || 5000;
                     else if (v.includes('\u043F\u0440\u043E\u0431\u0438\u0442\u044B \u043D\u0435 \u0432\u0441\u0435 \u0443\u0441\u043B\u0443\u0433\u0438')) {
                         const matchRegex = /Сумма непробитых услуг: (\\d+)/;
                         const m = n.match(matchRegex) || v.match(matchRegex);
                         if (m) currentFine = parseInt(m[1], 10);
                     }
                }`);

js = js.replace(/if \(v\.includes\('.*???>ؐ???'.*?\) \|\| v\.includes\('.*?'???>'.*?\)\) return true;/, 
`if (v.includes('\u043D\u0435\u043E\u043F\u043B\u0430\u0447\u0435') || v.includes('\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D')) return true;
                  if (v.includes('\u043F\u0440\u043E\u0431\u0438\u0442')) return true;`);


fs.writeFileSync('mainscript.js', js, 'utf8');
