const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(/document\.getElementById\(target \+ \'-section\'\)\.classList\.add\(\'active\'\);/, `document.getElementById(target + '-section').classList.add('active');
            if (target === 'master-cabinet' && typeof window.loadMasterSchedule === 'function') {
                setTimeout(window.loadMasterSchedule, 100);
            }`);

fs.writeFileSync('mainscript.js', js);
console.log("Patched switchTab to call loadMasterSchedule!");
