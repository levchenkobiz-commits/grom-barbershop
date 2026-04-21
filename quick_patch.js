const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function patch() {
    try {
        console.log('Connecting to VPS...');
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
        });

        console.log('Uploading code and data files...');
        await ssh.putFile(path.join(__dirname, 'server.js'), '/root/grom-dashboard/server.js');
        await ssh.putFile(path.join(__dirname, 'index.html'), '/root/grom-dashboard/index.html');
        await ssh.putFile(path.join(__dirname, 'agent.js'), '/root/grom-dashboard/agent.js');
        await ssh.putFile(path.join(__dirname, 'data.json'), '/root/grom-dashboard/data.json');

        console.log('Restarting grom-server and grom-agent via PM2...');
        await ssh.execCommand('pm2 restart grom-server', { cwd: '/root/grom-dashboard' });
        await ssh.execCommand('pm2 restart grom-agent', { cwd: '/root/grom-dashboard' });

        console.log('✅ Patch and Data updated successfully!');
    } catch (err) {
        console.error('❌ Patch failed:', err);
    } finally {
        ssh.dispose();
    }
}

patch();
