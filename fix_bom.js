const fs = require('fs');
const files = ['schedule.json', 'data.json', 'ovn_reports.json', 'sync_status.json'];
files.forEach(f => {
    if (fs.existsSync(f)) {
        let b = fs.readFileSync(f);
        if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
            console.log("Removing BOM from", f);
            fs.writeFileSync(f, b.slice(3));
        }
    }
});
