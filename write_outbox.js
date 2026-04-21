const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

// Getting message_id from user's message
const message_id = 1775595189004; 
const response = "Да, я здесь! Вижу твои сообщения в реальном времени. Спрашивай, что нужно сделать! 🦾";

async function writeOutbox() {
    try {
        await ssh.connect({ host: ip, username: 'root', password: password });
        const data = JSON.stringify({ message_id, response, timestamp: Date.now() }, null, 2);
        await ssh.execCommand(`echo '${data.replace(/'/g, "'\\''")}' > /root/grom-dashboard/outbox.json`);
        console.log('Response sent to VPS outbox.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
writeOutbox();
