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
            { local: 'index.html',              remote: 'index.html' },
            { local: 'mainscript.js',           remote: 'mainscript.js' },
            { local: 'server.js',               remote: 'server.js' },
            { local: 'handbook.json',           remote: 'handbook.json' },
            { local: 'schedule.json',           remote: 'schedule.json' },
            // All route files
            { local: 'routes/router.js',        remote: 'routes/router.js' },
            { local: 'routes/schedule.js',      remote: 'routes/schedule.js' },
            { local: 'routes/adapter.js',       remote: 'routes/adapter.js' },
            { local: 'routes/handbook.js',      remote: 'routes/handbook.js' },
            { local: 'routes/manager.js',       remote: 'routes/manager.js' },
            { local: 'routes/ovn.js',           remote: 'routes/ovn.js' },
            { local: 'routes/paths.js',         remote: 'routes/paths.js' },
            { local: 'routes/salary.js',        remote: 'routes/salary.js' },
            { local: 'routes/sync.js',          remote: 'routes/sync.js' },
            { local: 'routes/uploads.js',       remote: 'routes/uploads.js' },
            // Public JS
            { local: 'public/js/lates.js',      remote: 'public/js/lates.js' },
            { local: 'public/js/manager.js',    remote: 'public/js/manager.js' },
            { local: 'public/js/fines.js',      remote: 'public/js/fines.js' },
            { local: 'public/js/config.js',     remote: 'public/js/config.js' },
            { local: 'public/js/ui.js',         remote: 'public/js/ui.js' },
            { local: 'public/js/app.js',        remote: 'public/js/app.js' },
        ];

        for (const f of filesToUpload) {
            console.log(`Uploading ${f.local}...`);
            await ssh.putFile(path.join(__dirname, f.local), `/root/grom-dashboard/${f.remote}`);
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
