const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function findAndDelete() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        
        console.log('Searching VPS root and home for *бензин*...');
        const check = await ssh.execCommand('find /root -name "*бензин*"');
        if (check.stdout) {
            console.log('Found on VPS:', check.stdout);
            // I will NOT delete yet, just showing finding for now to the user!
        } else {
            console.log('Not found on VPS.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
findAndDelete();
