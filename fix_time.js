const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(/function submitCustomTime\(\) \{[\s\S]*?closeCustomTimeModal\(\);\s*\}/, `function submitCustomTime() {
            const from = document.getElementById('custom-time-from').value;
            const to = document.getElementById('custom-time-to').value;
            applyTime('\\u0421 ' + from + ' \\u0434\\u043E ' + to);
            closeCustomTimeModal();
        }`);

fs.writeFileSync('mainscript.js', js, 'utf8');
