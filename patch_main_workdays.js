const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

const oldLogic = `const shifts = window.getShiftsAndHours(mName, startD, endD, schedRes);
            const fines = window.getFinesInPeriod(mName, startD, endD, ovnRes);`;

const newLogic = `let shifts = window.getShiftsAndHours(mName, startD, endD, schedRes);
            const fines = window.getFinesInPeriod(mName, startD, endD, ovnRes);`;

js = js.replace(oldLogic, newLogic);

const oldAutoFill = `const fetchedRev = sw.revenue[elkassaName];
                    if (fetchedRev !== undefined && (prevRev === "" || prevRev === "0" || prevRev === 0)) {
                        prevRev = String(fetchedRev);
                        if(!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
                        window.SALARIES_CACHE[safeId] = prevRev;
                    }
                }`;

const newAutoFill = `const fetchedRev = sw.revenue[elkassaName];
                    if (fetchedRev !== undefined && (prevRev === "" || prevRev === "0" || prevRev === 0)) {
                        prevRev = String(fetchedRev);
                        if(!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
                        window.SALARIES_CACHE[safeId] = prevRev;
                    }
                    
                    // NEW: If shifts in schedule are 0, use workDays from Sales List
                    const fetchedWorkDays = sw.workDays ? (sw.workDays[elkassaName] || 0) : 0;
                    if (shifts.shiftsCount === 0 && fetchedWorkDays > 0) {
                        shifts.shiftsCount = fetchedWorkDays;
                        shifts.hours = fetchedWorkDays * 12; 
                    }
                }`;

js = js.replace(oldAutoFill, newAutoFill);

fs.writeFileSync('mainscript.js', js, 'utf8');
console.log("Updated mainscript.js to use work days from sales if schedule is empty.");
