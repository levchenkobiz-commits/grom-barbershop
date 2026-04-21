const fs = require('fs');
let s = fs.readFileSync('agent.js', 'utf8');

// Update row extraction to include dates
s = s.replace(/return \{\s*master: cells\[2\] \? cells\[2\]\.innerText\.trim\(\) : null,\s*realized: cells\[4\] \? parseFloat\(cells\[4\]\.innerText\.replace\(\/\[\^0-9\.\]\/g, \'\'\)\) \|\| 0 : 0\s*\};/g, 
            "return { master: cells[2] ? cells[2].innerText.trim() : null, realized: cells[4] ? parseFloat(cells[4].innerText.replace(/[^0-9.]/g, '')) || 0 : 0, date: cells[1] ? cells[1].innerText.trim() : null };");

// Update aggregation to count unique dates
const oldAgg = `for (let r of rowsData) {
                    if (r.master) {
                        masterTotals[r.master] = (masterTotals[r.master] || 0) + r.realized;
                    }
                }`;
const newAgg = `if (!global.masterDates) global.masterDates = {};
                for (let r of rowsData) {
                    if (r.master) {
                        masterTotals[r.master] = (masterTotals[r.master] || 0) + r.realized;
                        // Count unique days
                        if (r.date) {
                            const dateOnly = r.date.split(' ')[0]; // Extract YYYY-MM-DD or DD.MM.YYYY
                            if (!global.masterDates[r.master]) global.masterDates[r.master] = new Set();
                            global.masterDates[r.master].add(dateOnly);
                        }
                    }
                }`;

s = s.replace(oldAgg, newAgg);

// Update final salaryWeekly object to include workDays
const oldFinal = `salaryWeekly = {
                start: lastMon,
                end: lastSun,
                calcDate: dayjs().format('DD.MM.YYYY HH:mm'),
                revenue: masterTotals
            };`;
const newFinal = `const workDays = {};
            for (const m in global.masterDates) { workDays[m] = global.masterDates[m].size; }
            salaryWeekly = {
                start: lastMon,
                end: lastSun,
                calcDate: dayjs().format('DD.MM.YYYY HH:mm'),
                revenue: masterTotals,
                workDays: workDays
            };`;

s = s.replace(oldFinal, newFinal);

fs.writeFileSync('agent.js', s);
console.log("Updated agent.js to track work days from sales list.");
