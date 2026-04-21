const fs = require('fs');

let botJs = fs.readFileSync('telegram_bot.js', 'utf8');

const newCron = `
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
            alertMessages.push(\`🎥 <b>\${u.user.name}</b> (Видеомониторинг) не выполнил(а) норму!\nСделано проверок: \${todayOvnCount} из 35\`);
        }
        if (u.user.role === 'manager' && todayMgrCount < 3) {
            alertMessages.push(\`👔 <b>\${u.user.name}</b> (Менеджер) не выполнил(а) норму проверок!\nСделано проверок: \${todayMgrCount} из 3\`);
        }
    });

    if (alertMessages.length > 0) {
        const text = "🚨 <b>Отчет по выполнению плана за день:</b>\\n\\n" + alertMessages.join('\\n\\n') + "\\n\\n<i>Сотрудники работали по своему графику, но проверки заполнены не до конца.</i>";
        
        notifyIds.forEach(id => {
            try {
                bot.sendMessage(id, text, { parse_mode: 'HTML' });
            } catch(e) { console.error(e); }
        });
    }
});
`;

if (!botJs.includes('50 23 * * *')) {
    botJs = botJs.replace(/cron\.schedule\('0 6 \* \* \*'[\s\S]*?\}\);/, match => match + '\n' + newCron);
    fs.writeFileSync('telegram_bot.js', botJs, 'utf8');
    console.log('Bot patched!');
} else {
    console.log('Bot already patched');
}
