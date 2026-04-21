const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

// Update updateRowMath to handle totals
const oldUpdate = /window\.updateRowMath = function\([\s\S]*?\};/;
const newUpdate = `
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
        footer.innerHTML = \`
            <tr style="background: rgba(52, 199, 89, 0.1); font-weight: 800;">
                <td colspan="5" style="padding: 15px; text-align: right; color: #fff;">ИТОГО К ВЫПЛАТЕ:</td>
                <td style="padding: 15px; text-align: right; color: #34C759; font-size: 18px;">\${total.toLocaleString()} ₽</td>
            </tr>
        \`;
    }
};
`;

js = js.replace(oldUpdate, newUpdate);
fs.writeFileSync('mainscript.js', js);
console.log("Updated updateRowMath and added Grand Total logic.");
