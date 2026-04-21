const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(/for \(const raw of violations\) \{\s*if \(v\.includes\('[^']*'\)\) return true;\s*const v = \(raw \|\| ''\)\.toLowerCase\(\);\s*const n = \(nRaw \|\| ''\)\.toLowerCase\(\);/,
`for (const raw of violations) {
                const v = (raw || '').toLowerCase();
                const n = (nRaw || '').toLowerCase();
                if (v.includes('\u043F\u0440\u043E\u0431\u0438\u0442')) return true;`);

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log('Fixed');
