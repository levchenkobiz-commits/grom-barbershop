const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

let lastSeenId = 0;

async function waitForMsg() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        
        // Find existing ID first
        const check = await ssh.execCommand('cat /root/grom-dashboard/inbox.json');
        try {
           const history = JSON.parse(check.stdout || '[]');
           const last = Array.isArray(history) ? history[history.length - 1] : history;
           if (last) lastSeenId = last.message_id;
        } catch(e) {}

        console.log('--- AUTO-WATCHER (QUEUE) ACTIVE: WAITING... ---');

        const startTime = Date.now();
        while(Date.now() - startTime < 600000) { 
            try {
                const result = await ssh.execCommand('cat /root/grom-dashboard/inbox.json');
                if (result.stdout) {
                    const history = JSON.parse(result.stdout);
                    const data = Array.isArray(history) ? history[history.length - 1] : history;
                    if (data && data.message_id !== lastSeenId) {
                        console.log(`NEW MESSAGE DETECTED: ${data.prompt}`);
                        process.exit(0);
                    }
                }
            } catch (e) {}
            await new Promise(r => setTimeout(r, 2000));
        }
        process.exit(1);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    } finally {
        ssh.dispose();
    }
}
waitForMsg();
