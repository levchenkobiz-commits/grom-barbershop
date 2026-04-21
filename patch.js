const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

// 1. Setup the handler in global context
const handler = `
        window.handleOvnViolationChange = function() {
            const selectEl = document.getElementById('ovn-violation');
            const sumContainer = document.getElementById('unpaid-sum-container');
            const sumInput = document.getElementById('ovn-unpaid-sum');
            if(!selectEl || !sumContainer) return;
            
            let hasUnpaid = false;
            // The value is exactly what we injected in HTML
            const tgt = '\u041F\u0440\u043E\u0431\u0438\u0442\u044B \u043D\u0435 \u0432\u0441\u0435 \u0443\u0441\u043B\u0443\u0433\u0438';
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
`;
if (!js.includes('handleOvnViolationChange')) {
    js = js.replace('window.submitOVN = async function', handler + '\n        window.submitOVN = async function');
}

// 2. Remove ovn-match failure and inject notes modifier for unpaid sum
let target1 = "match: document.getElementById('ovn-match').value,";
if (js.includes(target1)) {
    js = js.replace(target1, "match: '', // Match field deprecated");
}

let target2 = "notes: document.getElementById('ovn-notes').value";
if (js.includes(target2)) {
    js = js.replace(
        target2,
        `notes: (function(){
                        let text = (document.getElementById('ovn-notes') ? document.getElementById('ovn-notes').value : '') || '';
                        let unpaidInput = document.getElementById('ovn-unpaid-sum');
                        let selects = Array.from(document.querySelectorAll('.ovn-violation-select')).map(s => s.value);
                        let single = document.getElementById('ovn-violation');
                        if (single) {
                            if (single.multiple) Array.from(single.selectedOptions).forEach(o=>selects.push(o.value));
                            else selects.push(single.value);
                        }
                        if (unpaidInput && unpaidInput.value && selects.some(v => v && v.includes('\u041F\u0440\u043E\u0431\u0438\u0442\u044B \u043D\u0435 \u0432\u0441\u0435 \u0443\u0441\u043B\u0443\u0433\u0438'))) {
                            text += ' (\u0421\u0443\u043C\u043C\u0430 \u043D\u0435\u043F\u0440\u043E\u0431\u0438\u0442\u044B\u0445 \u0443\u0441\u043B\u0443\u0433: ' + unpaidInput.value + ')';
                        }
                        return text;
                    })()`
    );
}


// 3. For the penalty engine:
// getViolationFine injection (append after the first loop over GLOBAL_HANDBOOK)
const fineLogic = `
                // Inject parse logic for "Пробиты не все услуги" penalty
                if (v.includes('\u043F\u0440\u043E\u0431\u0438\u0442\u044B \u043D\u0435 \u0432\u0441\u0435 \u0443\u0441\u043B\u0443\u0433\u0438')) {
                    const matchRegex = /\u0421\u0443\u043C\u043C\u0430 \u043D\u0435\u043F\u0440\u043E\u0431\u0438\u0442\u044B\u0445 \u0443\u0441\u043B\u0443\u0433: (\\d+)/;
                    const m = n.match(matchRegex) || v.match(matchRegex);
                    if (m) currentFine = parseInt(m[1], 10);
                }
`;

js = js.replace('// fallback/special logic for variants', fineLogic + '\n                // fallback/special logic for variants');

// isMandatoryFine logic injection
const isMandatoryLogic = `if (v.includes('\u043F\u0440\u043E\u0431\u0438\u0442')) return true;\n                  `;
js = js.replace('for (const raw of violations) {', 'for (const raw of violations) {\n                  ' + isMandatoryLogic);

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log('patched');
