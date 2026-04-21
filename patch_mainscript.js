const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

// 1. In openSalaryModal, start calculations for previous week if it's Monday 02:00 or later 
let replacement1 = `
window.openSalaryModal = function(isManager) {
    window.SALARY_MODE_MANAGER = isManager;
    document.getElementById('salary-modal').classList.add('active');
    
    const today = dayjs();
    let start, end;
    if (today.day() === 1) { // If Monday
        start = today.subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD');
        end = today.subtract(1, 'week').endOf('isoWeek').format('YYYY-MM-DD');
    } else {
        start = today.startOf('isoWeek').format('YYYY-MM-DD');
        end = today.endOf('isoWeek').format('YYYY-MM-DD');
    }
    
    document.getElementById('salary-date-start').value = start;
    document.getElementById('salary-date-end').value = end;
    
    renderSalaryTable();
};
`;

js = js.replace(/window\.openSalaryModal \= function\(isManager\) \{[\s\S]*?renderSalaryTable\(\);\s*\};/, replacement1);

// 2. In renderSalaryTable, fetch the parsed JSON from window.dashboardData and inject it into prevRev
let replacement2 = `
        const safeId = mName.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9-А-Яа-я]/g, '');
        
        let prevRev = window.SALARIES_CACHE ? (window.SALARIES_CACHE[safeId] || "") : "";
        
        if (window.dashboardData && window.dashboardData.salaryWeekly) {
            const sw = window.dashboardData.salaryWeekly;
            const swStart = dayjs(sw.start, "DD.MM.YYYY").format('YYYY-MM-DD');
            const swEnd = dayjs(sw.end, "DD.MM.YYYY").format('YYYY-MM-DD');
            if (swStart === startD && swEnd === endD) {
                // Auto-fill from parsed elkassa! Match exact master or partial match
                let elkassaName = mName;
                if (typeof ADAPTER !== "undefined") {
                     for (const loc in ADAPTER) {
                         const matchM = ADAPTER[loc].masters.find(x => x.dash === mName);
                         if (matchM && matchM.el_kassa) {
                             // find match in sw.revenue
                             Object.keys(sw.revenue).forEach(ek => {
                                 if (matchM.el_kassa.includes(ek)) elkassaName = ek;
                             });
                         }
                     }
                }
                const fetchedRev = sw.revenue[elkassaName];
                if (fetchedRev !== undefined && prevRev === "") {
                    prevRev = String(fetchedRev);
                    if(!window.SALARIES_CACHE) window.SALARIES_CACHE = {};
                    window.SALARIES_CACHE[safeId] = prevRev;
                }
            }
        }
        
        tr.innerHTML = \`
`;

js = js.replace(/const safeId = mName\.replace\([\s\S]*?tr\.innerHTML = `/m, replacement2);

fs.writeFileSync('mainscript.js', js);
console.log("mainscript.js patched for auto salary load!");
