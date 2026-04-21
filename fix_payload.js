const fs = require('fs');

// ==== 1. Fix mainscript.js (submitOVN payload keys) ====
let ms = fs.readFileSync('mainscript.js', 'utf8');

ms = ms.replace(
    /master: document.getElementById\('ovn-barber'\).value,/,
    "barber: document.getElementById('ovn-barber').value,"
);
ms = ms.replace(
    /price: parseFloat\(document.getElementById\('ovn-cost'\).value\) \|\| 0,/,
    "cost: parseFloat(document.getElementById('ovn-cost').value) || 0,"
);
ms = ms.replace(
    /receipt: document.getElementById\('ovn-match'\).value,/,
    "match: document.getElementById('ovn-match').value,"
);
ms = ms.replace(
    /race: document.getElementById\('ovn-nation'\).value,/,
    "nation: document.getElementById('ovn-nation').value,"
);

fs.writeFileSync('mainscript.js', ms);

// ==== 2. Fix server.js (PUT handler keys) ====
let sv = fs.readFileSync('server.js', 'utf8');

sv = sv.replace(/if \(updateData.master\) reports\[i\].master = updateData.master;/g, "if (updateData.barber) reports[i].barber = updateData.barber;");
sv = sv.replace(/if \(updateData.price !== undefined\) reports\[i\].price = updateData.price;/g, "if (updateData.cost !== undefined) reports[i].cost = updateData.cost;");
sv = sv.replace(/if \(updateData.receipt\) reports\[i\].receipt = updateData.receipt;/g, "if (updateData.match) reports[i].match = updateData.match;");
sv = sv.replace(/if \(updateData.race\) reports\[i\].race = updateData.race;/g, "if (updateData.nation) reports[i].nation = updateData.nation;");

fs.writeFileSync('server.js', sv);

console.log('Fixed property names in JS files');
