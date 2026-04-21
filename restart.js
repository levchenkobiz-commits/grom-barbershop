const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
    await ssh.connect({ host: '217.198.12.156', username:'root', password:'s-SzxVq6GBLHWh' });
    const res = await ssh.execCommand('pm2 restart all');
    console.log(res.stdout);
    ssh.dispose();
})();
