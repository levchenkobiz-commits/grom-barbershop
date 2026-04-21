const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace(/document\.getElementById\('lates-audit-date'\)\.value/g, "dayjs().format('YYYY-MM-DD')");

fs.writeFileSync('mainscript.js', js);
console.log("Fixed save");
