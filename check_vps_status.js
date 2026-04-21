const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function checkStatus() {
    try {
        console.log('Connecting to SSH...');
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
            readyTimeout: 20000,
        });

        console.log('\n--- Project Search ---');
        const findProj = await ssh.execCommand('find / -name "grom-dashboard" -type d -not -path "*/node_modules/*" 2>/dev/null');
        console.log('Found locations:', findProj.stdout || 'NONE found.');

        console.log('\n--- Node/NPM/PM2 Search ---');
        const nodeV = await ssh.execCommand('node -v');
        const npmV = await ssh.execCommand('npm -v');
        const pm2V = await ssh.execCommand('pm2 -v');
        console.log(`Node: ${nodeV.stdout || 'N/A'} | NPM: ${npmV.stdout || 'N/A'} | PM2: ${pm2V.stdout || 'N/A'}`);

        console.log('\n--- Running Processes ---');
        const psResult = await ssh.execCommand('ps aux | grep -E "node|pm2" | grep -v grep');
        console.log(psResult.stdout || 'No node/pm2 processes found.');

    } catch (err) {
        console.error('Connection Failed:', err.message);
    } finally {
        ssh.dispose();
    }
}

checkStatus();
