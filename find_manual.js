const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function findManual() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        const res = await ssh.execCommand('cat /root/grom-dashboard/ovn_reports.json');
        const allReports = JSON.parse(res.stdout);
        const manuals = allReports.filter(r => r.isManualFine && r.barber.includes('Шохназар'));
        console.log(manuals);
    } catch(err) { console.error(err); } finally { ssh.dispose(); }
}
findManual();
