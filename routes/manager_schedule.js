/**
 * routes/manager_schedule.js
 * Хранит расписание управляющих (Кирилл, Игорь, Ксения).
 * Данные: [{ date, name, status }] в manager_schedule.json
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'manager_schedule.json');

function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch(e) {}
    return [];
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
        });
        req.on('error', reject);
    });
}

exports.handleGet = function(req, res) {
    const data = readData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};

exports.handlePost = async function(req, res) {
    try {
        const payload = await readBody(req);
        if (!Array.isArray(payload)) {
            res.writeHead(400); res.end(JSON.stringify({ error: 'Expected array' }));
            return;
        }
        // payload: [{ date, name, status }]
        const valid = payload.filter(item =>
            item.date && item.name && item.status
        );
        writeData(valid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: valid.length }));
    } catch(e) {
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
};
