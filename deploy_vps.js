const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const path = require('path');

const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function deploy() {
    try {
        console.log('Connecting to SSH...');
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
            readyTimeout: 20000,
        });

        console.log('Connected! Setting up OS dependencies...');
        
        // Node / Ubuntu Setup
        await ssh.execCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | bash -');
        const setupResult = await ssh.execCommand('apt-get install -y nodejs unzip htop');
        console.log('NodeJS Install:', setupResult.stdout);
        
        console.log('Preparing remote folder...');
        await ssh.execCommand('mkdir -p /root/grom-dashboard');
        
        console.log('Uploading deploy.zip...');
        await ssh.putFile(path.join(__dirname, 'deploy.zip'), '/root/deploy.zip');
        
        console.log('Extracting and configuring project...');
        await ssh.execCommand('unzip -o /root/deploy.zip -d /root/grom-dashboard');
        
        console.log('Installing NPM packages on server (this might take a few minutes)...');
        const npmInstall = await ssh.execCommand('npm install', { cwd: '/root/grom-dashboard' });
        console.log('NPM output:', npmInstall.stdout);
        if(npmInstall.stderr) console.error('NPM error:', npmInstall.stderr);

        console.log('Installing Playwright OS Dependencies (Downloading browsers)...');
        const pwDeps = await ssh.execCommand('npx playwright install --with-deps chromium', { cwd: '/root/grom-dashboard' });
        console.log('Playwright deps:', pwDeps.stdout);

        console.log('Installing PM2 Process Manager globally...');
        await ssh.execCommand('npm install -g pm2');

        console.log('Starting / Restarting processes via PM2...');
        await ssh.execCommand('pm2 start server.js --name "grom-server"', { cwd: '/root/grom-dashboard' });
        await ssh.execCommand('pm2 start agent.js --name "grom-agent"', { cwd: '/root/grom-dashboard' });
        await ssh.execCommand('pm2 start telegram_bot.js --name "grom-tg"', { cwd: '/root/grom-dashboard' });
        await ssh.execCommand('pm2 restart all', { cwd: '/root/grom-dashboard' });
        await ssh.execCommand('pm2 save');
        await ssh.execCommand('pm2 startup');
        
        // Allow port 3000
        await ssh.execCommand('ufw allow 3000');
        
        console.log('✅ Deployment fully complete!');

    } catch(err) {
        console.error('Deployment Failed:', err);
    } finally {
        ssh.dispose();
    }
}

deploy();
