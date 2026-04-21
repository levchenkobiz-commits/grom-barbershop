const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(/if \(matchM\.el_kassa\.includes\(ek\)\) elkassaName = ek;/, `if (matchM.el_kassa.includes(ek) || matchM.el_kassa.some(ak => ek.includes(ak))) elkassaName = ek;`);

fs.writeFileSync('mainscript.js', js);
console.log("Patched adapter matching!");
