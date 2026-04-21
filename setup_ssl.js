const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const ip = '217.198.12.156';
const password = 's-SzxVq6GBLHWh';

const setupScript = `
apt-get update
# Install nginx and certbot without prompting
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx

# Configure Nginx for proxying to 8080
cat << 'EOF' > /etc/nginx/sites-available/app.grome.pro
server {
    listen 80;
    server_name app.grome.pro;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Link site if not exist
ln -sf /etc/nginx/sites-available/app.grome.pro /etc/nginx/sites-enabled/
# Remove default to avoid conflicts
rm -f /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx

# Run certbot automatically 
certbot --nginx -d app.grome.pro --non-interactive --agree-tos -m it@grome.pro --redirect
systemctl restart nginx
`;

async function run() {
    try {
        await ssh.connect({
            host: ip,
            username: 'root',
            password: password,
        });

        console.log("Setting up Nginx and Certbot...");
        const result = await ssh.execCommand(setupScript);
        console.log('STDOUT: ' + result.stdout);
        console.log('STDERR: ' + result.stderr);
        console.log("Successfully ran setup script.");
    } catch(err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
run();
