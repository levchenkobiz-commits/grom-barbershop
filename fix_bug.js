const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(
    /for \(const raw of violations\) \{\s*const v = \(raw \|\| ''\)\.toLowerCase\(\);\s*const n = \(nRaw \|\| ''\)\.toLowerCase\(\);/,
    "for (const raw of violations) {\n                const v = (raw || '').toLowerCase();\n                const n = (nRaw || '').toLowerCase();\n                if (v.includes('\u043F\u0440\u043E\u0431\u0438\u0442')) return true;"
);

let tgt = "for (const raw of violations) {\\n                  if (v.includes('\\u043F\\u0440\\u043E\\u0431\\u0438\\u0442')) return true;";
if (js.includes(tgt)) {
   js = js.replace(tgt, "for (const raw of violations) {");
}

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log('Fixed exactly');
