const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    await ssh.connect({ host: '217.198.12.156', username: 'root', password: 's-SzxVq6GBLHWh' });
    console.log('--- ERROR LOGS ---');
    const res = await ssh.execCommand('pm2 logs grom-server --lines 10 --nostream');
    console.log(res.stdout + res.stderr);
    ssh.dispose();
})();
