const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

async function fetch() {
    try {
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
        });

        // Search for all occurrences of "Шохназар Д." in the file on server
        const res = await ssh.execCommand('grep -C 5 "Шохназар Д." /root/grom-dashboard/ovn_reports.json');
        console.log(res.stdout);

    } catch(err) {
        console.error('Fetch Failed:', err);
    } finally {
        ssh.dispose();
    }
}

fetch();
