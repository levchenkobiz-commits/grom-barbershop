const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function diagnose() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        
        console.log('--- VPS STATUS (PM2) ---');
        const status = await ssh.execCommand('pm2 jlist');
        try {
            const list = JSON.parse(status.stdout);
            list.forEach(p => console.log(`${p.name}: [${p.pm2_env.status}] CPU: ${p.monit.cpu}% MEM: ${(p.monit.memory/1024/1024).toFixed(1)}MB`));
        } catch(e) { console.log('Wait for PM2 start...'); }

        console.log('\n--- INBOX (USER PROMPTS) ---');
        const inbox = await ssh.execCommand('cat /root/grom-dashboard/inbox.json');
        console.log(inbox.stdout || 'Empty');

        console.log('\n--- OUTBOX (AI ANSWERS) ---');
        const outbox = await ssh.execCommand('cat /root/grom-dashboard/outbox.json');
        console.log(outbox.stdout || 'Empty');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
diagnose();
