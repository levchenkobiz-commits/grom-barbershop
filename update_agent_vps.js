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

        console.log('Connected! Uploading agent.js...');
        const localFile = path.join(__dirname, 'agent.js');
        await ssh.putFile(localFile, '/root/grom-dashboard/agent.js');
        
        console.log('Restarting agent loop via PM2...');
        await ssh.execCommand('pm2 restart grom-agent', { cwd: '/root/grom-dashboard' });

        console.log('✅ Remote agent.js updated! Return Rate logic is now fixed on production.');
    } catch(err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}

updateScript();
