const fs = require('fs');
let hw = fs.readFileSync('mainscript.js', 'utf8');

const repStr = `const saveBtn = document.querySelector('#schedule-section .btn-submit');
                if (saveBtn) saveBtn.style.display = 'none';
                const hintEl = document.getElementById('schedule-hint-text');
                if (hintEl) hintEl.style.display = 'none';`;

let mod = hw.replace(/const saveBtn = document\.querySelector\('#schedule-section \.btn-submit'\);\s*if \(saveBtn\) saveBtn\.style\.display = 'none';/, repStr);

if (mod !== hw) {
    fs.writeFileSync('mainscript.js', mod, 'utf8');
    console.log('mainscript updated');
} else {
    console.log('regex replace failed');
}
