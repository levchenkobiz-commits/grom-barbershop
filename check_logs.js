const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function run() {
    try {
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
        });

        const result = await ssh.execCommand('grep -i -A 10 -B 2 "vision" ~/.pm2/logs/*out*.log | tail -n 50');
        console.log('STDOUT:\n' + result.stdout);
        console.log('STDERR:\n' + result.stderr);
    } catch(err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
run();
