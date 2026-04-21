const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function updateRole() {
    try {
        console.log('Connecting to VPS...');
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
            readyTimeout: 20000,
        });

        console.log('Connected! Reading roles.json...');
        const result = await ssh.execCommand('cat /root/grom-dashboard/roles.json');
        
        let roles = {};
        if (result.stdout) {
            roles = JSON.parse(result.stdout);
        } else {
            console.log('roles.json was empty or missing.');
        }

        // Change Nikita's role to 'manager'
        if (roles["476578323"]) {
            roles["476578323"].role = "manager";
        } else {
            roles["476578323"] = {
                role: "manager",
                name: "Nikita (Manager)"
            };
        }

        const newRolesJson = JSON.stringify(roles, null, 4);
        console.log('Writing back updated roles.json...');
        
        // Escape quotes to echo into file correctly in bash
        const escapedJson = newRolesJson.replace(/'/g, "'\\''");
        await ssh.execCommand(`echo '${escapedJson}' > /root/grom-dashboard/roles.json`);
        
        console.log('Restarting server via PM2...');
        await ssh.execCommand('pm2 restart grom-server', { cwd: '/root/grom-dashboard' });

        console.log('✅ Remote roles.json updated! Nikita is now a manager on VPS.');
    } catch(err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}

updateRole();
