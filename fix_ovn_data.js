const fs = require('fs');
const fn = 'ovn_reports.json';
let data = JSON.parse(fs.readFileSync(fn, 'utf8'));
let changed = false;

data.forEach(r => {
    // If it has 'master' instead of 'barber', fix it
    if (r.master) {
        r.barber = r.master;
        delete r.master;
        changed = true;
    }
    if (r.price !== undefined) {
        r.cost = r.price;
        delete r.price;
        changed = true;
    }
    if (r.receipt !== undefined) {
        r.match = r.receipt;
        delete r.receipt;
        changed = true;
    }
    if (r.race !== undefined) {
        r.nation = r.race;
        delete r.race;
        changed = true;
    }
});

if (changed) {
    fs.writeFileSync(fn, JSON.stringify(data, null, 2));
    console.log("Cleaned ovn_reports.json data!");
} else {
    console.log("No data needed cleaning.");
}
