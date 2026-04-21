const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function run() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        console.log('Force removing lock and running salary sync...');
        await ssh.execCommand('rm -f scraping_lock', { cwd: '/root/grom-dashboard' });
        const result = await ssh.execCommand('node agent.js --single --module=salary', { cwd: '/root/grom-dashboard' });
        console.log('STDOUT: ' + result.stdout);
        console.log('STDERR: ' + result.stderr);
        ssh.dispose();
    } catch(e) {
        console.error(e);
    }
}
run();
