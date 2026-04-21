const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');
const path = require('path');

const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function updateScript() {
    try {
        console.log('Connecting to VPS...');
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
            readyTimeout: 20000,
        });

        console.log('Connected! Uploading mainscript.js...');
        const localFile = path.join(__dirname, 'mainscript.js');
        await ssh.putFile(localFile, '/root/grom-dashboard/mainscript.js');
        
        console.log('Restarting server via PM2 to ensure cache clears...');
        await ssh.execCommand('pm2 restart grom-server', { cwd: '/root/grom-dashboard' });

        console.log('✅ Remote mainscript.js updated! Master tab is now hidden for managers.');
    } catch(err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}

updateScript();
