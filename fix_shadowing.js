const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

// I will find and remove ANY existing startSalaryCalc and renderSalaryTable to avoid duplicates
// Then append clean versions at the end.

const cleaned = js.replace(/window\.startSalaryCalc =[\s\S]*?\};/g, '')
                  .replace(/window\.renderSalaryTable =[\s\S]*?async function\(\) \{[\s\S]*?\n\};/g, ''); // Simple attempt

// Actually, I'll just append what I want at the VERY end and ensure it's not shadowed.
// To stop shadowing, I'll delete the OLD entries if I can find them reliably.

// Better: use a unique name internally and map it to window.
const finalBlock = `
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
`;

// Append to file after removing any other window.startSalaryCalc definitions to be safe
const finalJs = js.split('window.startSalaryCalc =')[0] + finalBlock;

fs.writeFileSync('mainscript.js', finalJs, 'utf8');
console.log("Applied clean startSalaryCalc wrapper.");
