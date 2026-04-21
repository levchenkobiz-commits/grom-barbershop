const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

// Use arguments to send custom message
const args = process.argv.slice(2);
const msgText = args[0] || "Готово!";
const message_id = args[1] ? parseInt(args[1]) : Date.now(); // Optional ID link

async function send() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        const data = JSON.stringify({ message_id, response: msgText, timestamp: Date.now() }, null, 2);
        await ssh.execCommand(`echo '${data.replace(/'/g, "'\\''")}' > /root/grom-dashboard/outbox.json`);
        console.log('✅ Duplicated to Dashboard.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
send();
