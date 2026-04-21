const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '217.198.12.156',
            username: 'root',
            password: 's-SzxVq6GBLHWh'
        });

        const r = await ssh.execCommand('grep "Настройки" /root/grom-dashboard/index.html');
        console.log('Is "Настройки" in index.html?', r.stdout ? 'YES' : 'NO');
        
        const r2 = await ssh.execCommand('pm2 list');
        console.log('PM2 Status:\n', r2.stdout);

        const r3 = await ssh.execCommand('pm2 info grom-server');
        console.log('Grom Server Path:\n', r3.stdout);
        
    } catch(err) {
        console.error(err);
    } finally {
        ssh.dispose();
    }
}
check();
