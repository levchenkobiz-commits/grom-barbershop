const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function run() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        const result = await ssh.execCommand('pm2 logs agent --lines 20 --nostream', { cwd: '/root/grom-dashboard' });
        console.log('LOGS: ' + result.stdout + result.stderr);
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
