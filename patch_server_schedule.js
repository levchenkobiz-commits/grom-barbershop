const fs = require('fs');

let serverStr = fs.readFileSync('server.js', 'utf8');

const scheduleApi = `
    if (pathname === '/api/me/schedule' && req.method === 'POST') {
        const tg_id = parsedUrl.searchParams.get('tg_id');
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const roledb = path.join(__dirname, 'roles.json');
            if (fs.existsSync(roledb)) {
                let roles = JSON.parse(fs.readFileSync(roledb, 'utf-8'));
                if (roles[tg_id]) {
                    try {
                        const parsed = JSON.parse(body);
                        roles[tg_id].schedule = parsed.schedule || [];
                        fs.writeFileSync(roledb, JSON.stringify(roles, null, 2));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ status: 'success' }));
                    } catch(e) {}
                }
            }
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Not authorized' }));
        });
        return;
    }
`;

if (!serverStr.includes('/api/me/schedule')) {
    serverStr = serverStr.replace(
        "if (pathname === '/api/me' && req.method === 'GET') {",
        scheduleApi + "\n    if (pathname === '/api/me' && req.method === 'GET') {"
    );
    fs.writeFileSync('server.js', serverStr, 'utf8');
    console.log('Saved scheduling API endpoint!');
} else {
    console.log('API already present');
}
