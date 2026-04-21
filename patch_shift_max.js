const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

js = js.replace('if (shifts.shiftsCount === 0 && fetchedWorkDays > 0) {', 
               'if (fetchedWorkDays > shifts.shiftsCount) {');

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log("Updated mainscript.js to use Math.max for shifts from sales vs schedule.");
