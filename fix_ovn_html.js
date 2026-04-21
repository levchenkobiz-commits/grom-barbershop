const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove 'Совпадение чека'
html = html.replace(/<div class="form-field">\s*<label>Совпадение чека<\/label>[\s\S]*?<\/select>\s*<\/div>/, '');

// 2. Add specific option
html = html.replace('<option value="Неоплаченная стрижка">💸 Неоплаченная стрижка</option>', 
'<option value="Неоплаченная стрижка">💸 Неоплаченная стрижка</option>\n                            <option value="Пробиты не все услуги">🧾 Пробиты не все услуги</option>');

// 3. Add onchange handler to select
html = html.replace('<select id="ovn-violation" required>', '<select id="ovn-violation" required onchange="handleOvnViolationChange()">');

// 4. Add the hidden input right below the select's parent div
html = html.replace(/(<select id="ovn-violation"[\s\S]*?<\/select>\s*<\/div>)/, `$1
                    <div id="unpaid-sum-container" class="form-field" style="grid-column: 1 / -1; display: none;">
                        <label>Сумма непробитых услуг (₽)</label>
                        <input type="number" id="ovn-unpaid-sum" placeholder="Например: 500" min="0">
                    </div>`);

fs.writeFileSync('index.html', html, 'utf8');
console.log('done index html');
