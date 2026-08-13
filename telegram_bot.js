const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const cron = require('node-cron');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { execFile } = require('child_process');
const { startAutoSendReminders } = require('./autosend_reminders');

const token = '8264809973:AAGI-YhU8LItlRULVgTfk44y30pTR85Vft4';
const chatId = '476578323'; // Owner ID
// Xray exposes the managed Telegram route locally on 10808.
const telegramAgent = new SocksProxyAgent(process.env.TELEGRAM_PROXY || 'socks5h://127.0.0.1:10808');
const bot = new TelegramBot(token, {
    polling: false,
    request: { agent: telegramAgent, timeout: 20000 }
});

const rawSendMessage = bot.sendMessage.bind(bot);
bot.sendMessage = async function resilientSendMessage(...args) {
    let lastError;
    for (let attempt = 1; attempt <= 6; attempt++) {
        try {
            return await rawSendMessage(...args);
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, Math.min(10000, attempt * 1500)));
        }
    }
    throw lastError;
};

let pollingErrors = 0;
let lastWarpReconnect = 0;
bot.on('polling_error', error => {
    pollingErrors++;
    console.error('[Telegram] polling error:', error.message);
    const now = Date.now();
    if (pollingErrors >= 3 && now - lastWarpReconnect > 60000) {
        lastWarpReconnect = now;
        pollingErrors = 0;
        execFile('warp-cli', ['--accept-tos', 'connect'], () => {});
    }
});
bot.on('message', () => { pollingErrors = 0; });

const WEBHOOK_PORT = Number(process.env.TELEGRAM_WEBHOOK_PORT || 8091);
const WEBHOOK_PATH = '/telegram-bot-updates';
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || `https://app.grome.pro${WEBHOOK_PATH}`;
const WEBHOOK_SECRET_PATH = path.join(__dirname, 'telegram_webhook_secret.txt');

function webhookSecret() {
    try {
        const current = fs.readFileSync(WEBHOOK_SECRET_PATH, 'utf8').trim();
        if (current) return current;
    } catch (_) {}
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(WEBHOOK_SECRET_PATH, `${secret}\n`, { mode: 0o600 });
    return secret;
}

function startTelegramWebhook() {
    const secret = webhookSecret();
    const webhookServer = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== WEBHOOK_PATH || req.headers['x-telegram-bot-api-secret-token'] !== secret) {
            res.writeHead(403); return res.end();
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) req.destroy();
        });
        req.on('end', () => {
            try { bot.processUpdate(JSON.parse(body)); res.writeHead(200); res.end('ok'); }
            catch (_) { res.writeHead(400); res.end('bad update'); }
        });
    });
    webhookServer.listen(WEBHOOK_PORT, '127.0.0.1', async () => {
        try {
            await bot.setWebHook(WEBHOOK_URL, { secret_token: secret, allowed_updates: ['message', 'callback_query', 'chat_member'] });
            console.log('Telegram webhook is active');
        } catch (error) {
            console.error('[Telegram] webhook setup error:', error.message);
        }
    });
    webhookServer.on('error', error => console.error('[Telegram] webhook server error:', error.message));
}

const dataPath = path.join(__dirname, 'data.json');
const ROLES_PATH = path.join(__dirname, 'roles.json');

function registerUser(msg) {
    if (!fs.existsSync(ROLES_PATH)) fs.writeFileSync(ROLES_PATH, '{}');
    let roles = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8'));
    
    if (!roles[msg.from.id]) {
        const username = msg.from.username || '';
        const lowerUsername = username.toLowerCase();
        const namePart = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
        
        let preassignedRole = 'guest';
        
        // 1. Check if the owner pre-assigned a role via username (e.g. "filinngay")
        let preassignedKey = username && roles[lowerUsername] ? lowerUsername : '';
        if (!preassignedKey && /^игорь\b/i.test(namePart)) {
            preassignedKey = Object.keys(roles).find(key =>
                !/^\d+$/.test(key) &&
                roles[key] &&
                roles[key].role === 'manager' &&
                /^игорь\b/i.test(String(roles[key].name || ''))
            ) || '';
        }
        if (preassignedKey) {
            preassignedRole = roles[preassignedKey].role || 'ovn';
            roles[msg.from.id] = {
                role: preassignedRole,
                username: username,
                name: roles[preassignedKey].name || `${namePart} (@${username})`
            };
            // Remove the temporary username key now that we locked in the numeric ID
            delete roles[preassignedKey];
            fs.writeFileSync(ROLES_PATH, JSON.stringify(roles, null, 2));
            return; // Successful quiet auto-registration!
        }
        
        // 2. Otherwise default to guest and alert Owner
        roles[msg.from.id] = {
            role: 'guest',
            username: username,
            name: `${namePart} ${username ? '(@' + username + ')' : ''}`.trim()
        };
        fs.writeFileSync(ROLES_PATH, JSON.stringify(roles, null, 2));
        
        if (msg.from.id.toString() !== chatId) {
            bot.sendMessage(chatId, `🔔 <b>Новый пользователь!</b>\n\nИмя: ${roles[msg.from.id].name}\nTG ID: <code>${msg.from.id}</code>\nНик: @${username}\n\nДля выдачи доступа отправьте мне команду:\n<code>/setrole ${msg.from.id} ovn</code> (или manager/master/owner)`, {parse_mode: 'HTML'});
        }
    } else {
        // update username if it changed
        if (msg.from.username && roles[msg.from.id].username !== msg.from.username) {
            roles[msg.from.id].username = msg.from.username;
            fs.writeFileSync(ROLES_PATH, JSON.stringify(roles, null, 2));
        }
    }
}

function sendReport() {
    if (!fs.existsSync(dataPath)) {
        bot.sendMessage(chatId, "⚠️ Файл с данными пока не сформирован. Идет сбор данных...");
        return;
    }
    
    try {
        const result = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const message = `📊 <b>Grome Analytics (Сводка MTD/QTD)</b>
📅 Обновлено: ${result.lastUpdate}

📈 <b>Выручка (QTD):</b> ${result.revenue.current.toLocaleString()} ₽ <i>(Рост: ${result.revenue.growth >= 0 ? '+' : ''}${result.revenue.growth}%)</i>
📱 <b>Доля онл-записей (MTD):</b> ${result.appointments.percentage}%`;

        bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (e) {
        bot.sendMessage(chatId, "❌ Ошибка при чтении данных дашборда.");
        console.error(e);
    }
}

cron.schedule('0 6 * * *', () => {
    sendReport();
});

// Schedule checking for Manager and OVN working days
cron.schedule('50 23 * * *', () => {
    // Manager alerts go to managers. Owner is only a fallback until a manager binds Telegram.
    let roles = {};
    if (fs.existsSync(ROLES_PATH)) roles = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8'));
    
    // Who to notify: the hardcoded owner and any 'owner' role
    const notifyIds = new Set();
    Object.keys(roles).forEach(uid => {
        if (/^\d+$/.test(uid) && roles[uid].role === 'manager') notifyIds.add(uid);
    });
    if (notifyIds.size === 0) notifyIds.add(chatId);

    // Check today's date
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time ideally, but UTC works for now
    
    // Who is on schedule?
    const onSchedule = [];
    Object.keys(roles).forEach(uid => {
        if (roles[uid].schedule && roles[uid].schedule.includes(today)) {
            onSchedule.push({ id: uid, user: roles[uid] });
        }
    });

    if (onSchedule.length === 0) return; // No one working today according to schedule

    let alertMessages = [];

    // Check OVN reports for today
    let todayOvnCount = 0;
    const ovnPath = path.join(__dirname, 'ovn_reports.json');
    if (fs.existsSync(ovnPath)) {
        const ovns = JSON.parse(fs.readFileSync(ovnPath, 'utf-8'));
        todayOvnCount = ovns.filter(r => r.date === today || (r.createdAt && r.createdAt.startsWith(today))).length;
    }

    // Check Manager checks for today
    let todayMgrCount = 0;
    const mgrPath = path.join(__dirname, 'manager_checks.json');
    if (fs.existsSync(mgrPath)) {
        const mgrs = JSON.parse(fs.readFileSync(mgrPath, 'utf-8'));
        todayMgrCount = mgrs.filter(r => r.date === today || (r.createdAt && r.createdAt.startsWith(today))).length;
    }

    onSchedule.forEach(u => {
        if (u.user.role === 'ovn' && todayOvnCount < 35) {
            alertMessages.push(`🎥 <b>${u.user.name}</b> (Видеомониторинг) не выполнил(а) норму!
Сделано проверок: ${todayOvnCount} из 35`);
        }
        if (u.user.role === 'manager' && todayMgrCount < 3) {
            alertMessages.push(`👔 <b>${u.user.name}</b> (Менеджер) не выполнил(а) норму проверок!
Сделано проверок: ${todayMgrCount} из 3`);
        }
    });

    if (alertMessages.length > 0) {
        const text = "🚨 <b>Отчет по выполнению плана за день:</b>\n\n" + alertMessages.join('\n\n') + "\n\n<i>Сотрудники работали по своему графику, но проверки заполнены не до конца.</i>";
        
        notifyIds.forEach(id => {
            try {
                bot.sendMessage(id, text, { parse_mode: 'HTML' });
            } catch(e) { console.error(e); }
        });
    }
});


bot.onText(/\/start|\/report|\/login/, (msg) => {
    registerUser(msg);
    const webAppUrl = `https://app.grome.pro/?tg_id=${msg.from.id}`;

    // Reply keyboard внизу — для быстрого доступа
    const replyKeyboard = {
        keyboard: [
            [{ text: '🚀 Открыть дашборд', web_app: { url: webAppUrl } }],
            [{ text: '📈 Получить свежий отчет' }]
        ],
        resize_keyboard: true,
        persistent: true
    };

    // Inline-кнопка прямо в приветственном сообщении
    const inlineKeyboard = {
        inline_keyboard: [[
            { text: '🚀 Открыть дашборд', web_app: { url: webAppUrl } }
        ]]
    };

    bot.sendMessage(msg.chat.id,
        `👋 <b>Добро пожаловать в Grome Analytics!</b>\n\n` +
        `Ваш Telegram ID: <code>${msg.from.id}</code>\n\n` +
        `Нажмите кнопку ниже, чтобы открыть дашборд прямо здесь 👇`,
        {
            parse_mode: 'HTML',
            reply_markup: JSON.stringify(replyKeyboard)
        }
    );

    // Второе сообщение с inline-кнопкой (открывает Mini App)
    bot.sendMessage(msg.chat.id,
        `📊 <b>Ваш персональный дашборд готов</b>`,
        {
            parse_mode: 'HTML',
            reply_markup: JSON.stringify(inlineKeyboard)
        }
    );
});

bot.onText(/^\/setrole\s+(@?\w+|\d+)\s+(owner|manager|master|ovn|guest)$/, (msg, match) => {
    if (msg.from.id.toString() !== chatId) {
        return bot.sendMessage(msg.chat.id, "❌ У вас нет прав на эту команду!");
    }
    
    let targetId = match[1].replace('@', '');
    let newRole = match[2];
    
    let roles = {};
    if (fs.existsSync(ROLES_PATH)) roles = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8'));
    
    let foundId = null;
    if (roles[targetId]) {
        foundId = targetId;
    } else {
        // Try finding by username
        for (let uid in roles) {
            if (roles[uid].username && roles[uid].username.toLowerCase() === targetId.toLowerCase()) {
                foundId = uid;
                break;
            }
        }
    }
    
    if (!foundId) {
        return bot.sendMessage(chatId, `❌ Пользователь ${targetId} не найден в базе. Попросите его сначала нажать /start в боте!`);
    }
    
    roles[foundId].role = newRole;
    fs.writeFileSync(ROLES_PATH, JSON.stringify(roles, null, 2));
    
    bot.sendMessage(chatId, `✅ Пользователю <b>${roles[foundId].name}</b> успешно выдана роль <code>${newRole}</code>.`, {parse_mode: 'HTML'});
    bot.sendMessage(foundId, `🎉 <b>Вам выдали доступ!</b>\nТеперь вы можете зайти в дашборд с ролью <code>${newRole}</code>.`, {parse_mode: 'HTML'});
});

bot.on('message', (msg) => {
    if (msg.text === '📈 Получить свежий отчет') {
        sendReport();
    }
});

console.log('Telegram bot service started...');

// ===== НАПОМИНАНИЯ О ФОТО МАСТЕРОВ (каждые 24ч, до загрузки) =====
const PENDING_PHOTOS_PATH = path.join(__dirname, 'pending_photos.json');

function readPendingPhotos() {
    if (!fs.existsSync(PENDING_PHOTOS_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(PENDING_PHOTOS_PATH, 'utf-8')); }
    catch { return []; }
}
function writePendingPhotos(list) {
    fs.writeFileSync(PENDING_PHOTOS_PATH, JSON.stringify(list, null, 2));
}

// Запускаем каждый день в 10:00 МСК
cron.schedule('0 7 * * *', async () => {  // 07:00 UTC = 10:00 МСК
    const list = readPendingPhotos();
    if (list.length === 0) return;

    const now = Date.now();
    const updated = [];

    for (const item of list) {
        const lastNotify = item.lastNotify ? new Date(item.lastNotify).getTime() : 0;
        const hoursSince = (now - lastNotify) / 3600000;

        // Отправляем напоминание не чаще раза в 23ч
        if (hoursSince < 23) { updated.push(item); continue; }

        // Получаем ID всех менеджеров для уведомления
        let roles = {};
        if (fs.existsSync(ROLES_PATH)) roles = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf-8'));
        const managerIds = [];
        Object.keys(roles).forEach(uid => {
            if (/^\d+$/.test(uid) && roles[uid].role === 'manager') managerIds.push(uid);
        });
        if (managerIds.length === 0) managerIds.push(chatId);

        const text = `📸 <b>Напоминание: нужны фото мастера</b>\n\nМастер: <b>${item.masterName}</b>${item.location ? `\nФилиал: ${item.location}` : ''}\n\nПожалуйста, загрузите 2–3 фото работ с фейдом в дашборде.\n\n<i>Напоминание ${item.notified + 1}: отправляется ежедневно, пока фото не загружены.</i>`;

        const opts = {
            parse_mode: 'HTML',
            reply_markup: JSON.stringify({
                inline_keyboard: [[
                    { text: '✅ Фото загружены', callback_data: `photos_done:${item.masterName}` },
                    { text: '⏰ Напомни завтра', callback_data: `photos_later:${item.masterName}` }
                ]]
            })
        };

        const uniqueIds = [...new Set(managerIds)];
        for (const uid of uniqueIds) {
            try { await bot.sendMessage(uid, text, opts); } catch(e) { /* skip */ }
        }

        item.notified   = (item.notified || 0) + 1;
        item.lastNotify = new Date().toISOString();
        updated.push(item);
    }

    writePendingPhotos(updated);
});

// Обработчик inline-кнопок Telegram
bot.on('callback_query', async (query) => {
    const data = query.data || '';

    if (data.startsWith('photos_done:')) {
        const masterName = data.replace('photos_done:', '');
        const list = readPendingPhotos().filter(p => p.masterName !== masterName);
        writePendingPhotos(list);
        await bot.answerCallbackQuery(query.id, { text: '✅ Отлично! Мастер убран из очереди.' });
        await bot.editMessageText(`✅ Фото мастера <b>${masterName}</b> отмечены как загруженные.`, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML'
        });
    }

    if (data.startsWith('photos_later:')) {
        const masterName = data.replace('photos_later:', '');
        const list = readPendingPhotos();
        const item = list.find(p => p.masterName === masterName);
        if (item) {
            item.lastNotify = new Date().toISOString();
            item.deferCount = (item.deferCount || 0) + 1;
            writePendingPhotos(list);
        }
        await bot.sendMessage(chatId,
            `⏰ <b>Менеджер продлил отправку фото</b>\n\nМастер: <b>${masterName}</b>\n` +
            `Продление: ${(item && item.deferCount) || 1}`,
            { parse_mode: 'HTML' }
        );
        await bot.answerCallbackQuery(query.id, { text: 'Напомним завтра!' });
        // lastNotify уже обновлён — просто подтверждаем
        await bot.editMessageText(`⏰ Хорошо, напомним про фото мастера <b>${masterName}</b> завтра.`, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML'
        });
    }
});

// Technical tasks share their state with the dashboard; AutoSend only delivers
// actions against that canonical record.
startAutoSendReminders(bot);
startTelegramWebhook();
