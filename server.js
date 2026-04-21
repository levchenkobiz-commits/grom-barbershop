const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const REPO_PATH = path.join(__dirname, 'ovn_reports.json');
const SCHED_PATH = path.join(__dirname, 'schedule.json');
const MOCK_DB = path.join(__dirname, 'mock_db.json');
const MASTER_LATES = path.join(__dirname, 'master_lates.json');
const MANAGER_CHECKS_PATH = path.join(__dirname, 'manager_checks.json');
const HANDBOOK_PATH = path.join(__dirname, 'handbook.json');

const UPLOADS_DIR = path.join(__dirname, 'manager_uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (pathname === '/api/sync' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
          let modArg = '';
          try {
              const parsed = JSON.parse(body || '{}');
              if (parsed.module) modArg = ' --module=' + parsed.module;
          } catch(e) {}
          
          fs.writeFileSync(path.join(__dirname, 'sync_status.json'), JSON.stringify({ isSyncing: true }));
          const { exec } = require('child_process');
          exec(`node agent.js --single${modArg}`, (error) => {
              fs.writeFileSync(path.join(__dirname, 'sync_status.json'), JSON.stringify({ isSyncing: false }));
              if (error) console.error(`exec error: ${error}`);
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: 'started' }));
      });
      return;
  }
  if (pathname === '/api/sync_status' && req.method === 'GET') {
      let status = { isSyncing: false };
      try { status = JSON.parse(fs.readFileSync(path.join(__dirname, 'sync_status.json'))); } catch(e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(status));
  }

  if (pathname === '/api/ovn' && req.method === 'GET') {
    if (!fs.existsSync(REPO_PATH)) fs.writeFileSync(REPO_PATH, '[]');
    const reports = fs.readFileSync(REPO_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(reports);
  }

  if (pathname === '/api/ovn' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const report = JSON.parse(body);
            report.id = Date.now();
            report.createdAt = new Date().toISOString();
            
            if (!fs.existsSync(REPO_PATH)) fs.writeFileSync(REPO_PATH, '[]');
            let reports = JSON.parse(fs.readFileSync(REPO_PATH, 'utf-8'));
            
            // If it's an attendance check (has schedTime), prevent duplicates for the same day/barber/loc
            if (report.schedTime) {
                reports = reports.filter(r => !(r.date === report.date && r.barber === report.barber && r.location === report.location && r.schedTime));
            }
            
            reports.unshift(report);
            fs.writeFileSync(REPO_PATH, JSON.stringify(reports, null, 2));
            
            console.log(`Saved report: ${report.location} - ${report.barber} (${report.violation})`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', id: report.id }));
        } catch (e) {
            console.error('Error saving OVN report:', e);
            res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
    return;
  }

  if (pathname === '/api/ovn' && req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const updateData = JSON.parse(body);
            if (!updateData.id || !updateData.editorName) {
                res.writeHead(400); res.end(JSON.stringify({ error: 'Missing id or editorName' }));
                return;
            }
            if (!fs.existsSync(REPO_PATH)) fs.writeFileSync(REPO_PATH, '[]');
            let reports = JSON.parse(fs.readFileSync(REPO_PATH, 'utf-8'));
            
            let updated = false;
            let alreadyEdited = false;

            for (let i = 0; i < reports.length; i++) {
                if (String(reports[i].id) === String(updateData.id)) {
                    if (reports[i].editedBy) {
                      alreadyEdited = true;
                      break;
                    }
                    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    // Update all other fields if provided
                    if (updateData.location) reports[i].location = updateData.location;
                    if (updateData.barber) reports[i].barber = updateData.barber;
                    if (updateData.date) reports[i].date = updateData.date;
                    if (updateData.time) reports[i].time = updateData.time;
                    if (updateData.cost !== undefined) reports[i].cost = updateData.cost;
                    if (updateData.match) reports[i].match = updateData.match;
                    if (updateData.violation) reports[i].violation = updateData.violation;
                    if (updateData.nation) reports[i].nation = updateData.nation;
                    
                    reports[i].notes = (updateData.notes || "").trim() + ` (отредактировано ${time} ${updateData.editorName})`;
                    reports[i].editedBy = updateData.editorName;
                    reports[i].editedAt = new Date().toISOString();
                    updated = true;
                    break;
                }
            }
            
            if (alreadyEdited) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Entry can only be edited once' }));
                return;
            }

            if (updated) {
                fs.writeFileSync(REPO_PATH, JSON.stringify(reports, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (e) {
            console.error('Error updating OVN report:', e);
            res.writeHead(500); res.end(JSON.stringify({ error: 'Server error' }));
        }
    });
    return;
  }

  if (pathname === '/api/fetch_salary' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const { start, end } = JSON.parse(body);
            if (!start || !end) {
                res.writeHead(400); res.end(JSON.stringify({ error: 'Missing start or end' }));
                return;
            }
            const scraper = require('./elkassa_scraper');
            const data = await scraper.fetchSalaryData(start, end);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (e) {
            console.error('Error fetching on-demand salary:', e);
            res.writeHead(500); res.end(JSON.stringify({ error: 'Scraper error: ' + e.message }));
        }
    });
    return;
  }

  if (pathname === '/api/schedule' && req.method === 'GET') {
    if (!fs.existsSync(SCHED_PATH)) fs.writeFileSync(SCHED_PATH, '[]');
    const sched = fs.readFileSync(SCHED_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(sched);
  }

  if (pathname === '/api/schedule' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const entry = JSON.parse(body);
            let data = [];
            if (fs.existsSync(SCHED_PATH)) {
                try { data = JSON.parse(fs.readFileSync(SCHED_PATH, 'utf-8')); } catch(e){}
            }
            
            if (Array.isArray(entry)) {
                entry.forEach(e => {
                    data = data.filter(s => !(s.date === e.date && s.location === e.location));
                    if (e.masters && e.masters.length > 0) data.push(e);
                });
            } else {
                data = data.filter(s => !(s.date === entry.date && s.location === entry.location));
                if (entry.masters && entry.masters.length > 0) data.push(entry);
            }
            
            fs.writeFileSync(SCHED_PATH, JSON.stringify(data, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success' }));
        } catch (e) {
            res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (!data.base64) throw new Error('No base64 data');
            const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, "");
            const filename = `photo_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
            fs.writeFileSync(path.join(UPLOADS_DIR, filename), base64Data, 'base64');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ url: `/manager_uploads/${filename}` }));
        } catch(e) {
            console.error(e);
            res.writeHead(500);
            return res.end(JSON.stringify({ error: e.message }));
        }
    });
    return;
  }

  if (pathname === '/api/manager_checks' && req.method === 'GET') {
    if (!fs.existsSync(MANAGER_CHECKS_PATH)) fs.writeFileSync(MANAGER_CHECKS_PATH, '[]');
    const checks = fs.readFileSync(MANAGER_CHECKS_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(checks);
  }

  if (pathname === '/api/manager_checks' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const check = JSON.parse(body);
            check.id = Date.now();
            check.createdAt = new Date().toISOString();
            
            if (!fs.existsSync(MANAGER_CHECKS_PATH)) fs.writeFileSync(MANAGER_CHECKS_PATH, '[]');
            let checks = JSON.parse(fs.readFileSync(MANAGER_CHECKS_PATH, 'utf-8'));
            
            checks.unshift(check); // prepend new check
            fs.writeFileSync(MANAGER_CHECKS_PATH, JSON.stringify(checks, null, 2));
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'success', id: check.id }));
        } catch(e) {
            console.error('Check save error', e);
            res.writeHead(500);
            return res.end(JSON.stringify({ error: 'Save failed' }));
        }
    });
    return;
  }

  if (pathname === '/api/handbook' && req.method === 'GET') {
    const defaultHandbook = {
        "Опоздание": 300,
        "Невыход": 5000,
        "Воровство": 5000,
        "Грязное место": 500,
        "Без формы": 500,
        "Отказ клиенту": 1000,
        "Разговор на нац. языке": 500,
        "Жалоба": 1000,
        "Поломка": 0,
        "Другое": 0
    };
    if (!fs.existsSync(HANDBOOK_PATH)) {
        fs.writeFileSync(HANDBOOK_PATH, JSON.stringify(defaultHandbook, null, 2));
    }
    const hb = fs.readFileSync(HANDBOOK_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(hb);
  }

  if (pathname === '/api/handbook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const hb = JSON.parse(body);
            fs.writeFileSync(HANDBOOK_PATH, JSON.stringify(hb, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'success' }));
        } catch(e) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
    return;
  }

  if (pathname === '/api/vision' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const { images, zoneId } = data;
            
            const fetchClient = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
            const OPENAI_API_KEY = "sk-viwZET4irKbhBSTEQ2n9D1j49Nw1FfkK";
            
            let zoneRule = "Оцени общий порядок.";
            switch (zoneId) {
                case 'reklama': zoneRule = 'Проверь, что наружная реклама попала в кадр, выглядит целой и чистой.'; break;
                case 'forma': zoneRule = 'Проверь, что мастера, видимые в кадре, одеты в фирменную униформу и в закрытую обувь.'; break;
                case 'kreslo': zoneRule = 'Проверь, что барберское кресло опущено, выровнено, развёрнуто лицом ко входу (а не к зеркалу), и на нём находится сложенный пеньюар.'; break;
                case 'tv': zoneRule = 'Проверь, что телевизор в зале включен и на нём транслируется контент (не черный выключенный экран).'; break;
                case 'shkaf': zoneRule = 'Проверь шкафы и полки: на них не должно быть видимых волос и раскиданных личных вещей персонала (сумок, курток и т.д.).'; break;
                case 'moyka': zoneRule = 'Проверь зону мойки головы: раковина прозрачная/сухая, на ней и вокруг неё не висят/не валяются тряпки, полотенца или инструменты.'; break;
            }
            
            const payload = {
                model: "gpt-4o-mini", // fast model
                messages: [
                    {
                        role: "system",
                        content: `Ты — непреклонный ИИ-аудитор барбершопа. Оцениваешь фотографию от менеджера. Твоя главная конкретная задача: ${zoneRule} Если базовое правило нарушено, фото размытое, или в кадре видимый ужасный бардак (волосы комками, рассыпан мусор) - бракуй фото. Отвечай строго JSON-объектом: {"approved": boolean, "comment": "Почему не одобрено или похвала, если всё супер"}.`
                    },
                    {
                        role: "user",
                        content: images.map(img => ({ type: "image_url", image_url: { url: img } }))
                    }
                ],
                max_tokens: 300,
                response_format: { type: "json_object" }
            };
            
            const response = await fetchClient("https://api.proxyapi.ru/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify(payload)
            });
            const resultMsg = await response.json();
            
            let resultData;
            if (resultMsg.choices && resultMsg.choices[0]) {
               resultData = JSON.parse(resultMsg.choices[0].message.content);
            } else if (resultMsg.error) {
               throw new Error(resultMsg.error.message);
            } else {
               throw new Error(JSON.stringify(resultMsg));
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(resultData));
        } catch(e) {
            console.error('Vision API error:', e);
            res.writeHead(500);
            return res.end(JSON.stringify({ error: e.message || 'Vision check failed' }));
        }
    });
    return;
  }

  if (pathname === '/api/adapter' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const rawAdapter = JSON.parse(body);
            const fileContent = `/**
 * Grome Adapter (Registry)
 * Единый источник правки для всех идентификаторов:
 * Дашборд (Короткие имена) <==> El.Kassa (Терминалы, Имена) <==> YClients (Company ID, Staff ID)
 */

const ADAPTER = ${JSON.stringify(rawAdapter, null, 4)};

/** API АДАПТЕРА ДЛЯ ПРИЛОЖЕНИЯ */

// 1. Получить короткое имя мастера для дашборда из грязного имени элкассы
function getDashNameByElkassa(elkassaName, branchName = null) {
    if (!elkassaName) return "Неизвестный";
    
    // Ищем точное совпадение
    for (const [loc, config] of Object.entries(ADAPTER)) {
        if (branchName && loc !== branchName) continue;
        for (const master of config.masters) {
            if (master.el_kassa.some(name => elkassaName.toLowerCase().includes(name.toLowerCase()))) {
                return master.dash;
            }
        }
    }
    // Если не найдено, возвращаем как есть, но обрезаем
    return elkassaName.split(' ')[0];
}

// 2. Получить YClients ID мастера по имени из дашборда
function getYclientsId(dashName, branchName) {
    if (!ADAPTER[branchName]) return null;
    const master = ADAPTER[branchName].masters.find(m => m.dash === dashName);
    return master ? master.yclients_id : null;
}

// Получить имя дашборда по имени YClients
function getDashNameByYclients(ycName, branchName = null) {
    if (!ycName) return "Неизвестный";
    for (const [loc, config] of Object.entries(ADAPTER)) {
        if (branchName && loc !== branchName) continue;
        for (const master of config.masters) {
            // YClients format differs, check if string partially matches dash or el_kassa names
            const namesToCheck = [master.dash, ...(master.el_kassa || [])];
            if (namesToCheck.some(n => ycName.toLowerCase().includes(n.toLowerCase()))) {
                return master.dash;
            }
        }
    }
    return ycName.split(' ')[0];
}

// 3. Получить Терминал Эл.Кассы
function getTerminalId(branchName) {
    if (!ADAPTER[branchName]) return null;
    return ADAPTER[branchName].el_kassa_terminal;
}

// 4. Получить Company ID YClients
function getYclientsCompanyId(branchName) {
    if (!ADAPTER[branchName]) return null;
    return ADAPTER[branchName].yclients_company_id;
}

// Для использования в Node.js (agent.js, сервер)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ADAPTER,
        getDashNameByElkassa,
        getYclientsId,
        getTerminalId,
        getYclientsCompanyId,
        getDashNameByYclients
    };
}
`;
            fs.writeFileSync(path.join(__dirname, 'adapter.js'), fileContent, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success' }));
        } catch (e) {
            console.error('Error saving adapter:', e);
            res.writeHead(400); res.end(JSON.stringify({ error: 'Failed' }));
        }
    });
    return;
  }



  
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

    if (pathname === '/api/me' && req.method === 'GET') {
      const tg_id = parsedUrl.searchParams.get('tg_id');
      const roledb = path.join(__dirname, 'roles.json');
      if (fs.existsSync(roledb)) {
          const roles = JSON.parse(fs.readFileSync(roledb, 'utf-8'));
          if (roles[tg_id]) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(roles[tg_id]));
          }
      }
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not authorized' }));
  }

  if (pathname.startsWith('/manager_uploads/')) {
    const fn = path.basename(pathname);
    const p = path.join(UPLOADS_DIR, fn);
    if (fs.existsSync(p)) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        fs.createReadStream(p).pipe(res);
        return;
    }
  }

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname.substring(1));
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else if (error.code === 'EISDIR') {
        res.writeHead(403);
        res.end('Directory listing not allowed');
      } else {
        res.writeHead(500);
        res.end('Internal server error: ' + error.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content, 'utf-8');
    }
  });
}).listen(port);

console.log(`GROME Dashboard server running at http://localhost:${port}/`);

