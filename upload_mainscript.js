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
        console.log('Uploading mainscript.js...');
        await ssh.putFile(path.join(__dirname, 'mainscript.js'), '/root/grom-dashboard/mainscript.js');
        console.log('✅ Upload complete!');
    } catch(err) {
        console.error('Update Failed:', err);
    } finally {
        ssh.dispose();
    }
}
update();
