const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

// Mock functions from mainscript.js
function getViolationFine(vName, notesRaw) {
    const v = (vName || '').toLowerCase();
    const n = (notesRaw || '').toLowerCase();
    let currentFine = 300; 

    if (v.includes('опоздал') || n.includes('опоздани')) {
        let minutes = 0;
        const match = n.match(/на\s+(\d+)\s+мин/);
        if (match) minutes = parseInt(match[1]);
        if (minutes >= 30) currentFine = 1000;
        else if (minutes >= 20) currentFine = 500;
        else if (minutes >= 10) currentFine = 300;
        else currentFine = 300;
    } else if (v.includes('воровство')) {
        currentFine = 5000;
    } else if (v.includes('неоплаченная') || v.includes('терминал')) {
        currentFine = 5000;
    } else if (v.includes('не выход') || v.includes('невыход')) {
        currentFine = 5000;
    } else if (v.includes('отказ')) {
        currentFine = 1000;
    } else if (v.includes('нац. языке') || v.includes('национальн')) {
        currentFine = 500;
    } else if (v.includes('без формы')) {
        currentFine = 500;
    } else if (v.includes('грязное')) {
        currentFine = 500;
    } else if (v.includes('инструмент')) {
        currentFine = 300;
    } else if (v.includes('зеркало')) {
        currentFine = 300;
    } else if (v.includes('замечаний нет') || v.includes('✅')) {
        currentFine = 0;
    }
    return currentFine;
}

function isMandatoryFine(vStr, notes) {
    const v = (vStr || '').toLowerCase();
    const n = (notes || '').toLowerCase();
    if (v.includes('опоздал') || n.includes('опоздани') || v.includes('воровство') || v.includes('невыход') || v.includes('не выход') || v.includes('отказ') || v.includes('неоплаченная') || v.includes('терминал')) {
        return true;
    }
    return false;
}

async function runAudit() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        const res = await ssh.execCommand('cat /root/grom-dashboard/ovn_reports.json');
        const allReports = JSON.parse(res.stdout);
        const mReports = allReports.filter(r => r.barber === 'Шохназар Д.').sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        let state = 'Green';
        let currentMonthFines = 0;
        let auditLog = [];

        // Group by week
        const weeks = {};
        mReports.forEach(r => {
            const d = new Date(r.createdAt); 
            // Simple week id (not accurate but good for audit)
            const wId = Math.floor(d.getTime() / (7*24*3600*1000));
            if (!weeks[wId]) weeks[wId] = [];
            weeks[wId].push(r);
        });

        Object.keys(weeks).forEach(wId => {
            const weekReports = weeks[wId];
            let violationsCount = 0;
            let weekViolationsList = [];
            let lateCount = 0;
            let zoneFine = 0;

            weekReports.forEach(r => {
                const vList = Array.isArray(r.violation) ? r.violation : (r.violation ? String(r.violation).split(',').map(v => v.trim()) : []);
                vList.forEach(vName => {
                    if (!vName) return;
                    const fine = getViolationFine(vName, r.notes);
                    const isMandatory = isMandatoryFine(vName, r.notes);
                    
                    if (fine > 0 || isMandatory) violationsCount++;

                    if (isMandatory) {
                        let finalFine = fine;
                        if (vName.toLowerCase().includes('опоздал')) {
                            lateCount++;
                            if (lateCount >= 2) finalFine *= 2;
                        }
                        currentMonthFines += finalFine;
                        auditLog.push(`[MANDATORY] ${vName}: ${finalFine} P (Total: ${currentMonthFines})`);
                    } else if (fine > 0) {
                        weekViolationsList.push({ type: vName, fine });
                    }
                });
            });

            // Zone calculation
            if (state === 'Green') {
                if (violationsCount >= 14) {
                    state = 'Red';
                    weekViolationsList.forEach(v => { zoneFine += v.fine; auditLog.push(`[ZONE RED] ${v.type}: ${v.fine} P (Total: ${currentMonthFines + zoneFine})`); });
                } else if (violationsCount > 9) {
                    state = 'Yellow';
                    // ... yellow logic
                }
            } else if (state === 'Red') {
                weekViolationsList.forEach(v => { zoneFine += v.fine; auditLog.push(`[ZONE RED CONTINUED] ${v.type}: ${v.fine} P (Total: ${currentMonthFines + zoneFine})`); });
            }
            currentMonthFines += zoneFine;
        });

        console.log('--- FINAL AUDIT LOG ---');
        console.log(auditLog.join('\n'));
        console.log('Final Fine:', currentMonthFines);

    } catch(err) { console.error(err); } finally { ssh.dispose(); }
}
runAudit();
