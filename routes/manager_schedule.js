/**
 * routes/manager_schedule.js
 * Хранит расписание управляющих (Кирилл, Игорь, Ксения).
 * Данные: [{ date, name, status }] в manager_schedule.json
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'manager_schedule.json');
const MANAGER_NAMES = new Set(['Кирилл', 'Игорь', 'Ксения']);

function normalizeName(value) {
    return String(value || '').replace(/\([^)]*\)/g, '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function isOwnManagerRow(authName, scheduleName) {
    const auth = normalizeName(authName);
    const row = normalizeName(scheduleName);
    return !!auth && !!row && (auth === row || auth.startsWith(row + ' ') || row.startsWith(auth + ' '));
}

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

exports.handlePatch = async function(req, res) {
    try {
        const payload = await readBody(req);
        const date = payload && payload.date;
        const name = payload && payload.name;
        const status = payload && payload.status;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !MANAGER_NAMES.has(name) || !['work', 'off'].includes(status)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Expected { date, name, status }' }));
            return;
        }
        const ownScheduleOnly = req.authUser && (
            req.authUser.role === 'maintenance' || req.authUser.key === 'ksenia'
        );
        if (ownScheduleOnly && !isOwnManagerRow(req.authUser.name, name)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Можно изменять только собственные дни' }));
            return;
        }

        const data = readData().filter(item => !(item.date === date && item.name === name));
        if (status === 'work') data.push({ date, name, status });
        data.sort((a, b) => (a.date + a.name).localeCompare(b.date + b.name));
        writeData(data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: data.length, data }));
    } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
    }
};

exports.isOwnManagerRow = isOwnManagerRow;
