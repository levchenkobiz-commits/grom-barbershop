# 🧠 Grome Project — Память

## Что существует в проекте

### 📊 Дашборд (app.grome.pro)
- **Сервер**: VPS `217.198.12.156:8080`, Node.js + PM2
- **Файлы**: `/root/grom-dashboard/` на VPS, локально `C:\Users\Nikita\.gemini\antigravity\scratch\grom-dashboard\`
- **Деплой**: `node deploy.js` или `node upload_mainscript.js`

### 🤖 Telegram Bot (@grometeam_bot)
- **Файл**: `telegram_bot.js`
- **Токен**: в файле (строка 6)
- **Роли**: owner, manager, master, ovn, guest
- **Команды**: `/start`, `/setrole ID role`, кнопки «Получить отчет» / «Войти в дашборд»

### 📱 Telegram Mini App для клиентов
- **Сделано в ChatGPT** (не в Antigravity!) — код нужно перенести сюда
- **Функционал по скриншоту**: Запись, AI Ассистент, Мои Бонусы, Филиалы
- **Бот**: @grometeam_bot
- **TODO**: получить код от ChatGPT и разместить на VPS

### 🌐 Сайт (grome.pro)
- **Репо**: GitHub Pages (grom-barbershop)
- **Файлы**: `C:\Users\Nikita\.gemini\antigravity\scratch\grom-barbershop\`
- **HTTPS**: включен (Enforce HTTPS в GitHub Settings)

---

## Роли сотрудников (roles.json)
- `filinngay` → Ксения, роль `ovn` (видеомониторинг)
- Owner Telegram ID: `476578323`

---

## Ключевые параметры
- **YClients**: используется для онлайн-записи и данных о услугах
- **El.Kassa**: используется для данных о выручке
- **Return Rate (RR)**: считается по 90-дневной когорте
- **OVN норма**: 35 проверок в день
- **Manager норма**: 3 проверки в день

---

## История задач

### Апрель 2026
- ✅ Исправлен баг кодировки `index.html` (mojibake)
- ✅ Настроен Claude Code через OpenRouter прокси
- ✅ Добавлена Ксения в `roles.json` с ролью OVN
- ✅ Редизайн аналитической вкладки (тёмный премиум стиль)
- ✅ Исправлен черный экран на дашборде (BOM в mainscript.js)
- ✅ Добавлен favicon и логотип на сайт grome.pro
- ✅ Исправлена надпись "ВРЕМЯ ЗАПИСАТЬСЯ" на сайте
- 🔲 Telegram Mini App для клиентов — код потерян (был в ChatGPT)
- 🔲 Исправить sendReport() — сейчас шлёт только владельцу
