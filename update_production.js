const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function update() {
    try {
        console.log('Connecting to Production VPS...');
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password
        });

        const filesToUpload = [
            'index.html',
            'mainscript.js',
            'server.js',
            'handbook.json'
        ];

        for (const file of filesToUpload) {
            console.log(`Uploading ${file}...`);
            await ssh.putFile(path.join(__dirname, file), `/root/grom-dashboard/${file}`);
        }

        console.log('Restarting grom-server via PM2...');
        await ssh.execCommand('pm2 restart grom-server');
        
        console.log('✅ Update successful!');
    } catch (err) {
        console.error('Update Failed:', err);
    } finally {
        ssh.dispose();
    }
}

update();
