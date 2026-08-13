# GROME Dashboard

Аналитический дашборд для сети барбершопов GROME.

## Быстрый старт (новый компьютер)

```bash
git clone https://github.com/YOUR_USERNAME/grom-dashboard.git
cd grom-dashboard
npm install
```

Создай `roles.json` (не хранится в git — содержит Telegram ID):
```json
{
  "manager_test": { "role": "manager", "name": "Manager Test" },
  "777777777":    { "role": "master",  "name": "Шохназар Д.", "location": "Алексеевская" }
}
```

Запуск локально:
```bash
node server.js
# http://localhost:8080/?tg_id=manager_test
```

## Деплой на VPS

Релиз выполняет только GitHub Actions после попадания commit в `master`.
Не копируй файлы на VPS вручную и не запускай локальные скрипты деплоя: workflow
разворачивает точный SHA, проверяет дрейф production-кода и сохраняет версию релиза.
Правила для Codex Desktop и CLI — в [AGENTS.md](AGENTS.md), краткая передача
контекста между сессиями — в [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Структура

```
grom-dashboard/
├── server.js           # HTTP-сервер (Node.js, без фреймворков)
├── adapter.js          # Маппинг мастеров: El.Kassa ↔ YClients ↔ Дашборд
├── index.html          # SPA — всё в одном HTML файле
├── routes/             # Backend API-роуты
│   ├── router.js       # Маршрутизатор
│   ├── ovn.js          # ОВН (видеоконтроль)
│   ├── schedule.js     # Расписание + /api/me
│   ├── salary.js       # Зарплата
│   ├── handbook.js     # Справочник штрафов
│   ├── sync.js         # Синхронизация El.Kassa/YClients
│   └── ...
├── public/js/          # Фронтенд (модули)
│   ├── config.js       # Глобальные переменные, BARBER_ROSTER
│   ├── ui.js           # Toast, switchTab, роли
│   ├── analytics.js    # Аналитика, кабинет мастера
│   ├── ovn.js          # ОВН форма и журнал
│   ├── lates.js        # Опоздания
│   ├── schedule.js     # Расписание (грид)
│   ├── fines.js        # Штрафы и справочник
│   ├── salary.js       # Расчёт зарплаты
│   ├── manager.js      # Кабинет менеджера
│   └── app.js          # Точка входа, авторизация
└── handbook.json       # Суммы штрафов (редактируется через UI)
```

## Роли пользователей

| Роль | Доступ |
|------|--------|
| `owner` / `manager` | Все вкладки, расчёт зарплаты, штрафы |
| `ovn` | ОВН, Опоздания, Расписание |
| `master` | Только Кабинет мастера |

## Сервер (app.grome.pro)

- VPS: `217.198.12.156`
- Путь: `/root/grom-dashboard`
- PM2: `pm2 list` / `pm2 restart grom-dashboard`
- Nginx → порт 8080
