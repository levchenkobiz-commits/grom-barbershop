/* Regression coverage for the canonical technical-task + AutoSend flow. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grom-autosend-tech-'));
process.env.GROME_DATA_ROOT = root;
process.env.AUTOSEND_ROOT = root;

const tech = require('../routes/technical_tasks');
const autosend = require('../autosend_reminders');

function read(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')); }
  catch (_) { return fallback; }
}
function write(name, value) {
  fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2));
}
function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
class FakeBot {
  constructor() { this.messages = []; this.answers = []; this.edits = []; }
  async sendMessage(chatId, text, options) { this.messages.push({ chatId: String(chatId), text, options }); return { message_id: this.messages.length }; }
  async answerCallbackQuery(id, options) { this.answers.push({ id, options }); }
  async editMessageReplyMarkup(markup, options) { this.edits.push({ markup, options }); }
}

async function main() {
  const now = new Date();
  const today = tech.moscowDate(now);
  write('roles.json', {
    '100': { role: 'owner', name: 'Владелец' },
    '200': { role: 'maintenance', name: 'Кирилл' },
  });
  write('manager_schedule.json', [{ name: 'Кирилл', date: today, status: 'work' }]);
  write('manager_checks.json', []);
  write('autosend_notifications.json', []);
  write('autosend_state.json', { delivered: {} });
  write('technical_tasks.json', [
    { id: 'new', title: 'Новая задача', salon: 'Тест', status: 'Новая задача', archived: false, createdAt: now.toISOString(), notificationVersion: 0 },
    { id: 'old', title: 'Старая задача', salon: 'Тест', status: 'В работе', archived: false, createdAt: now.toISOString(), workStartedAt: now.toISOString(), nextOverdueReminderAt: addDays(today, -1) },
    { id: 'tg', title: 'Задача из Telegram', salon: 'Тест', status: 'Новая задача', archived: false, createdAt: now.toISOString(), notificationVersion: 0 },
  ]);

  const bot = new FakeBot();
  await autosend.runTechnicalAutomation(bot, now, { skipSync: true });
  assert(bot.messages.some(item => item.chatId === '200' && /Новая техническая задача/.test(item.text)), 'new task reaches Kirill on a workday');
  assert(bot.messages.some(item => item.chatId === '200' && /не закрыта более 3 дней/.test(item.text)), 'overdue task reaches Kirill');
  assert(bot.messages.some(item => item.chatId === '100' && /не закрыта более 3 дней/.test(item.text)), 'overdue task reaches owner');

  tech.performTaskAction('new', 'status', { status: 'В работе', actor: 'Кирилл', now });
  await autosend.runTechnicalAutomation(bot, now, { skipSync: true });
  assert(bot.messages.some(item => item.chatId === '100' && /Кирилл взял задачу в работу/.test(item.text)), 'status change is duplicated to owner');

  const sample = { id: 'sample', status: 'В работе', archived: false };
  assert.throws(() => tech.applyTaskAction(sample, 'defer', { today, date: addDays(today, 1), comment: '' }), /комментарий/, 'defer without comment is rejected centrally');
  tech.applyTaskAction(sample, 'defer', { today, date: addDays(today, 2), comment: 'Ждём деталь', actor: 'Кирилл', now });
  assert.strictEqual(sample.status, 'Новая задача');
  assert.strictEqual(sample.deferComment, 'Ждём деталь');
  const inWork = { id: 'in-work', status: 'В работе', archived: false };
  tech.applyTaskAction(inWork, 'still_working', { today, actor: 'Кирилл', now });
  assert.strictEqual(inWork.nextOverdueReminderAt, addDays(today, 3), '«Ещё в работе» moves the next reminder by three calendar days');

  await autosend.handleTechnicalCallback(bot, {
    id: 'defer', data: 'tech:defer:tg', from: { id: 200 }, message: { chat: { id: 200 }, message_id: 1 },
  });
  const future = addDays(today, 2).split('-').reverse().join('.');
  await autosend.handleTechnicalMessage(bot, { from: { id: 200 }, text: `${future} Ожидаем поставку` });
  const telegramTask = read('technical_tasks.json', []).find(task => task.id === 'tg');
  assert.strictEqual(telegramTask.deferComment, 'Ожидаем поставку', 'Telegram comment is stored in the canonical task');
  assert.strictEqual(telegramTask.deferredUntil, addDays(today, 2));

  const weekendBot = new FakeBot();
  write('manager_schedule.json', []);
  write('technical_tasks.json', [{ id: 'weekend', title: 'Без рабочего дня', salon: 'Тест', status: 'Новая задача', archived: false, notificationVersion: 0 }]);
  await autosend.runTechnicalAutomation(weekendBot, now, { skipSync: true });
  assert.strictEqual(weekendBot.messages.filter(item => item.chatId === '200').length, 0, 'Kirill gets no task messages outside workdays');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('autosend_technical_tasks_regression: OK');
}

main().catch(error => {
  console.error(error.stack || error.message);
  try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  process.exit(1);
});
