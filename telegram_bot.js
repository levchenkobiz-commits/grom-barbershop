const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const token = '8264809973:AAGI-YhU8LItlRULVgTfk44y30pTR85Vft4';
const chatId = '476578323'; // Owner ID
const bot = new TelegramBot(token, { polling: true });

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
        if (username && roles[lowerUsername]) {
            preassignedRole = roles[lowerUsername].role || 'ovn';
            roles[msg.from.id] = {
                role: preassignedRole,
                username: username,
                name: roles[lowerUsername].name || `${namePart} (@${username})`
            };
            // Remove the temporary username key now that we locked in the numeric ID
            delete roles[lowerUsername];
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
    // Collect all owners/admins to notify
    let roles = {};
    if (fs.existsSync(ROLES_PATH)) roles = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8'));
    
    // Who to notify: the hardcoded owner and any 'owner' role
    const notifyIds = new Set([chatId]);
    Object.keys(roles).forEach(uid => {
        if (roles[uid].role === 'owner') notifyIds.add(uid);
    });

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
    const opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{text: '📈 Получить свежий отчет'}],
                [{text: '🖥 Войти в дашборд'}]
            ],
            resize_keyboard: true,
            persistent: true
        })
    };
    bot.sendMessage(msg.chat.id, "Привет! Вы подключены к системе Grome Analytics.\nВаш Telegram ID: " + msg.from.id + "\n\n<i>Ваш ID теперь зарегистрирован в базе. Дождитесь выдачи нужных прав (если у вас их еще нет).</i>", Object.assign(opts, {parse_mode: 'HTML'}));
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
    if (msg.text === '🖥 Войти в дашборд') {
        registerUser(msg);
        const loginUrl = `https://app.grome.pro/?tg_id=${msg.from.id}`;
        bot.sendMessage(msg.chat.id, `Ваша персональная ссылка для авторизации:\n\n${loginUrl}\n\n<i>Ссылка привязана к вашему Telegram ID. Передавать её другим бессмысленно — бот фиксирует именно вас.</i>`, {parse_mode: 'HTML'});
    }
});

console.log('Telegram bot service started...');
