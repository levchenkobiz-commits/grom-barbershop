const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function run() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        const result = await ssh.execCommand('cat data.json', { cwd: '/root/grom-dashboard' });
        const data = JSON.parse(result.stdout);
        console.log('salaryWeekly:', JSON.stringify(data.salaryWeekly, null, 2));
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
