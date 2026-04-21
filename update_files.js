const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function update() {
    try {
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
        });

        console.log('Uploading updated files...');
        
        // Upload agent.js
        await ssh.putFile(path.join(__dirname, 'agent.js'), '/root/grom-dashboard/agent.js');
        // Upload mainscript.js
        await ssh.putFile(path.join(__dirname, 'mainscript.js'), '/root/grom-dashboard/mainscript.js');
        // Upload elkassa_scraper.js
        await ssh.putFile(path.join(__dirname, 'elkassa_scraper.js'), '/root/grom-dashboard/elkassa_scraper.js');
        // Upload index.html
        await ssh.putFile(path.join(__dirname, 'index.html'), '/root/grom-dashboard/index.html');
        // Upload server.js
        await ssh.putFile(path.join(__dirname, 'server.js'), '/root/grom-dashboard/server.js');
        // Upload adapter.js
        await ssh.putFile(path.join(__dirname, 'adapter.js'), '/root/grom-dashboard/adapter.js');
        // Upload telegram_bot.js
        await ssh.putFile(path.join(__dirname, 'telegram_bot.js'), '/root/grom-dashboard/telegram_bot.js');
        // Upload logo_v2.png (just in case it's missing)
        try { await ssh.putFile(path.join(__dirname, 'logo_v2.png'), '/root/grom-dashboard/logo_v2.png'); } catch(e) {}
        
        console.log('Restarting processes via PM2...');
        await ssh.execCommand('pm2 restart all');
        
        console.log('✅ Update complete! Triggering new sync...');
        // Optional: trigger immediately
        await ssh.execCommand('node agent.js --single', { cwd: '/root/grom-dashboard' });
        
        console.log('✅ Done!');

    } catch(err) {
        console.error('Update Failed:', err);
    } finally {
        ssh.dispose();
    }
}

update();
