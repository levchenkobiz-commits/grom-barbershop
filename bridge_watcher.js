const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

let lastSeenId = 0;

async function watch() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        
        while(true) {
            try {
                const result = await ssh.execCommand('cat /root/grom-dashboard/inbox.json');
                if (result.stdout) {
                    const data = JSON.parse(result.stdout);
                    if (data.message_id !== lastSeenId) {
                        console.log('\n--- NEW DASHBOARD MESSAGE ---');
                        console.log(`[ID ${data.message_id}] Nikita: ${data.prompt}`);
                        console.log('-----------------------------\n');
                        lastSeenId = data.message_id;
                    }
                }
            } catch (e) {
                // Silently wait if file is busy or corrupted
            }
            await new Promise(r => setTimeout(r, 5000));
        }
    } catch (err) {
        console.error('Watcher Error:', err);
        process.exit(1);
    }
}
watch();
