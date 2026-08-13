(function () {
  'use strict';

  const root = document.getElementById('preview-root');
  const allowedRoles = new Set(['owner', 'manager', 'ovn']);
  const metricOrder = ['revenue', 'returnRate', 'cycle', 'appointments', 'occupancy', 'ovnQuality', 'reaction'];

  const copy = {
    ru: {
      preview: 'Концепт аналитики', loginTitle: 'Вход в аналитику', loginCopy: 'Используйте рабочую учётную запись менеджера или ОВН.', login: 'Логин', password: 'Пароль', enter: 'Войти', enterBusy: 'Вход...', required: 'Введите логин и пароль', denied: 'Этот preview доступен менеджеру и ОВН', connection: 'Не удалось загрузить данные',
      workspace: 'Кабинет управления', main: 'Основное', analytics: 'Аналитика', ovn: 'ОВН', lates: 'Опоздания', schedule: 'Расписание', management: 'Управление', masters: 'Мастера', settings: 'Настройки', currentScreen: 'Редизайн только этой вкладки', owner: 'Владелец', manager: 'Менеджер', ovnRole: 'ОВН',
      live: 'Рабочие данные', title: 'Аналитика', intro: 'Состояние сети, клиенты и операционное качество в одном контуре. Все значения получены из действующих источников кабинета.', updated: 'Обновлено', refresh: 'Обновить данные', logout: 'Выйти',
      revenue: 'Рост квартала', returnRate: 'Возвращаемость', cycle: 'Цикл визита', appointments: 'Онлайн-запись', occupancy: 'Заполняемость', ovnQuality: 'Качество сервиса ОВН', reaction: 'Среднее время реакции',
      current: 'Текущий', previous: 'Предыдущий', cohort: 'Когорта', median: 'Медиана между визитами', services: 'Доля услуг', checks: 'Без замечаний', checksShort: 'чистых проверок', workingDay: 'чеков на рабочий день', noData: 'Нет данных',
      dynamics: 'Динамика показателя', history: 'Фактические месяцы из истории', comparison: 'Сравнение периодов', signals: 'Операционные сигналы', violators: 'Мастера с нарушениями', violations: 'Частые нарушения', reacted: 'Реакций учтено', quality: 'Качество ОВН',
      breakdown: 'Детализация', breakdownCopy: 'Нажмите на объект, чтобы увидеть мастеров', method: 'Как считается показатель', object: 'Объект', value: 'Значение', trend: 'Статус', stable: 'По данным периода', mastersNone: 'Нет детализации по мастерам', historyNone: 'Для этого показателя история пока не накоплена', source: 'Источники: действующие API кабинета, журнал ОВН и сохранённая история аналитики. Данные preview не редактируются.', loading: 'Загружаю актуальные данные',
      methodRevenue: 'Выручка с первого дня текущего квартала до вчерашнего дня в сравнении с тем же интервалом прошлого квартала.', methodReturn: 'Доля новых клиентов зрелой когорты, которые вернулись в течение 60 дней после первого визита.', methodCycle: 'Медиана дней между двумя визитами одного клиента за последние 90 дней.', methodAppointments: 'Доля услуг, записанных через онлайн-виджет, от общего числа услуг за текущий месяц до вчерашнего дня.', methodOccupancy: 'Среднее число чеков на мастера в рабочий день. Учитываются дни, в которых больше двух чеков.', methodOvn: 'Доля проверок ОВН без замечаний за текущий календарный месяц до вчерашнего дня. Опоздания исключены.', methodReaction: 'Среднее рабочее время от создания нарушения ОВН до реакции менеджера за текущий календарный месяц.',
      min: 'мин', hour: 'ч', day: 'д', rub: '₽', from: 'из'
    },
    uz: {
      preview: 'Analitika konsepti', loginTitle: 'Analitikaga kirish', loginCopy: 'Menejer yoki OVN xodimining ish hisobidan foydalaning.', login: 'Login', password: 'Parol', enter: 'Kirish', enterBusy: 'Kirilmoqda...', required: 'Login va parolni kiriting', denied: 'Bu preview menejer va OVN uchun mavjud', connection: 'Ma’lumotlarni yuklab bo‘lmadi',
      workspace: 'Boshqaruv kabineti', main: 'Asosiy', analytics: 'Analitika', ovn: 'OVN', lates: 'Kechikishlar', schedule: 'Jadval', management: 'Boshqaruv', masters: 'Ustalar', settings: 'Sozlamalar', currentScreen: 'Faqat shu bo‘limning yangi dizayni', owner: 'Egasi', manager: 'Menejer', ovnRole: 'OVN',
      live: 'Ishchi ma’lumotlar', title: 'Analitika', intro: 'Tarmoq holati, mijozlar va operatsion sifat bitta ekranda. Barcha qiymatlar kabinetning amaldagi manbalaridan olingan.', updated: 'Yangilandi', refresh: 'Ma’lumotlarni yangilash', logout: 'Chiqish',
      revenue: 'Chorak o‘sishi', returnRate: 'Qaytish darajasi', cycle: 'Tashriflar oralig‘i', appointments: 'Onlayn yozilish', occupancy: 'Bandlik', ovnQuality: 'OVN xizmat sifati', reaction: 'O‘rtacha javob vaqti',
      current: 'Joriy', previous: 'Oldingi', cohort: 'Kogorta', median: 'Tashriflar orasidagi mediana', services: 'Xizmatlar ulushi', checks: 'Kamchiliksiz', checksShort: 'toza tekshiruv', workingDay: 'ish kuniga cheklar', noData: 'Ma’lumot yo‘q',
      dynamics: 'Ko‘rsatkich dinamikasi', history: 'Tarixdagi haqiqiy oylar', comparison: 'Davrlarni taqqoslash', signals: 'Operatsion signallar', violators: 'Qoidabuzarligi bor ustalar', violations: 'Ko‘p uchraydigan qoidabuzarliklar', reacted: 'Hisobga olingan javoblar', quality: 'OVN sifati',
      breakdown: 'Tafsilotlar', breakdownCopy: 'Ustalarni ko‘rish uchun obyektni bosing', method: 'Ko‘rsatkich qanday hisoblanadi', object: 'Obyekt', value: 'Qiymat', trend: 'Holat', stable: 'Davr ma’lumotlari bo‘yicha', mastersNone: 'Ustalar bo‘yicha tafsilot yo‘q', historyNone: 'Bu ko‘rsatkich bo‘yicha tarix hali yig‘ilmagan', source: 'Manbalar: kabinetning amaldagi API’lari, OVN jurnali va saqlangan analitika tarixi. Preview ma’lumotlarni o‘zgartirmaydi.', loading: 'Dolzarb ma’lumotlar yuklanmoqda',
      methodRevenue: 'Joriy chorakning birinchi kunidan kechagi kungacha tushum, oldingi chorakning shu oralig‘i bilan taqqoslanadi.', methodReturn: 'Birinchi tashrifdan keyin 60 kun ichida qaytgan yetilgan kogortadagi yangi mijozlar ulushi.', methodCycle: 'So‘nggi 90 kunda bir mijozning ikki tashrifi orasidagi kunlar medianasi.', methodAppointments: 'Joriy oy boshidan kechagi kungacha onlayn vidjet orqali yozilgan xizmatlarning barcha xizmatlardagi ulushi.', methodOccupancy: 'Ustaning bir ish kunidagi o‘rtacha cheklar soni. Ikki chekdan ko‘p bo‘lgan kunlar hisobga olinadi.', methodOvn: 'Joriy kalendar oy boshidan kechagi kungacha kamchiliksiz OVN tekshiruvlari ulushi. Kechikishlar chiqarib tashlanadi.', methodReaction: 'Joriy kalendar oyida OVN qoidabuzarligi yaratilgan vaqtdan menejer javobigacha bo‘lgan o‘rtacha ish vaqti.',
      min: 'daq', hour: 'soat', day: 'kun', rub: '₽', from: 'dan'
    },
    tg: {
      preview: 'Консепсияи таҳлил', loginTitle: 'Воридшавӣ ба таҳлил', loginCopy: 'Аз ҳисоби кории менеҷер ё корманди ОВН истифода баред.', login: 'Логин', password: 'Рамз', enter: 'Ворид шудан', enterBusy: 'Воридшавӣ...', required: 'Логин ва рамзро ворид кунед', denied: 'Ин preview барои менеҷер ва ОВН дастрас аст', connection: 'Боркунии маълумот муяссар нашуд',
      workspace: 'Кабинети идоракунӣ', main: 'Асосӣ', analytics: 'Таҳлил', ovn: 'ОВН', lates: 'Дермониҳо', schedule: 'Ҷадвал', management: 'Идоракунӣ', masters: 'Устоҳо', settings: 'Танзимот', currentScreen: 'Тарҳи нав танҳо барои ҳамин бахш', owner: 'Соҳиб', manager: 'Менеҷер', ovnRole: 'ОВН',
      live: 'Маълумоти корӣ', title: 'Таҳлил', intro: 'Вазъи шабака, муштариён ва сифати амалиётӣ дар як экран. Ҳамаи қиматҳо аз манбаъҳои амалкунандаи кабинет гирифта шудаанд.', updated: 'Навсозӣ шуд', refresh: 'Навсозии маълумот', logout: 'Баромадан',
      revenue: 'Рушди семоҳа', returnRate: 'Бозгашти муштариён', cycle: 'Фосилаи боздид', appointments: 'Сабти онлайн', occupancy: 'Сарборӣ', ovnQuality: 'Сифати хизматрасонии ОВН', reaction: 'Вақти миёнаи вокуниш',
      current: 'Ҷорӣ', previous: 'Қаблӣ', cohort: 'Когорта', median: 'Медианаи байни боздидҳо', services: 'Ҳиссаи хизматҳо', checks: 'Бе эрод', checksShort: 'санҷиши тоза', workingDay: 'чек дар рӯзи корӣ', noData: 'Маълумот нест',
      dynamics: 'Динамикаи нишондиҳанда', history: 'Моҳҳои воқеӣ аз таърих', comparison: 'Муқоисаи давраҳо', signals: 'Сигналҳои амалиётӣ', violators: 'Устоҳои дорои қоидавайронкунӣ', violations: 'Қоидавайронкуниҳои маъмул', reacted: 'Вокунишҳои ҳисобшуда', quality: 'Сифати ОВН',
      breakdown: 'Тафсилот', breakdownCopy: 'Барои дидани устоҳо объектро пахш кунед', method: 'Нишондиҳанда чӣ гуна ҳисоб мешавад', object: 'Объект', value: 'Қимат', trend: 'Ҳолат', stable: 'Аз рӯйи маълумоти давра', mastersNone: 'Тафсилоти устоҳо нест', historyNone: 'Барои ин нишондиҳанда ҳоло таърих ҷамъ нашудааст', source: 'Манбаъҳо: API-и амалкунандаи кабинет, журнали ОВН ва таърихи захирашудаи таҳлил. Preview маълумотро тағйир намедиҳад.', loading: 'Маълумоти ҷорӣ бор мешавад',
      methodRevenue: 'Даромад аз рӯзи аввали семоҳаи ҷорӣ то дирӯз бо ҳамин фосилаи семоҳаи гузашта муқоиса мешавад.', methodReturn: 'Ҳиссаи муштариёни нави когортаи баркамол, ки дар давоми 60 рӯз пас аз боздиди аввал баргаштаанд.', methodCycle: 'Медианаи рӯзҳо байни ду боздиди як муштарӣ дар 90 рӯзи охир.', methodAppointments: 'Ҳиссаи хизматҳое, ки аз аввали моҳи ҷорӣ то дирӯз тавассути виджети онлайн сабт шудаанд.', methodOccupancy: 'Шумораи миёнаи чекҳои усто дар як рӯзи корӣ. Рӯзҳои дорои зиёда аз ду чек ҳисоб мешаванд.', methodOvn: 'Ҳиссаи санҷишҳои ОВН бе эрод аз аввали моҳи ҷорӣ то дирӯз. Дермониҳо хориҷ карда мешаванд.', methodReaction: 'Вақти миёнаи корӣ аз сабти қоидавайронкунии ОВН то вокуниши менеҷер дар моҳи ҷорӣ.',
      min: 'дақ', hour: 'соат', day: 'рӯз', rub: '₽', from: 'аз'
    },
    ky: {
      preview: 'Аналитика концепциясы', loginTitle: 'Аналитикага кирүү', loginCopy: 'Менеджердин же ОВН кызматкеринин иш аккаунтун колдонуңуз.', login: 'Логин', password: 'Сырсөз', enter: 'Кирүү', enterBusy: 'Кирүүдө...', required: 'Логин менен сырсөздү киргизиңиз', denied: 'Бул preview менеджер жана ОВН үчүн жеткиликтүү', connection: 'Маалыматтарды жүктөө мүмкүн болгон жок',
      workspace: 'Башкаруу кабинети', main: 'Негизги', analytics: 'Аналитика', ovn: 'ОВН', lates: 'Кечигүүлөр', schedule: 'График', management: 'Башкаруу', masters: 'Усталар', settings: 'Жөндөөлөр', currentScreen: 'Жаңы дизайн ушул бөлүм үчүн гана', owner: 'Ээси', manager: 'Менеджер', ovnRole: 'ОВН',
      live: 'Иш маалыматтары', title: 'Аналитика', intro: 'Тармактын абалы, кардарлар жана операциялык сапат бир экранда. Бардык көрсөткүчтөр кабинеттин учурдагы булактарынан алынат.', updated: 'Жаңыртылды', refresh: 'Маалыматтарды жаңыртуу', logout: 'Чыгуу',
      revenue: 'Чейректик өсүш', returnRate: 'Кардарлардын кайтуусу', cycle: 'Келүүлөр аралыгы', appointments: 'Онлайн жазылуу', occupancy: 'Толуктук', ovnQuality: 'ОВН тейлөө сапаты', reaction: 'Орточо жооп берүү убактысы',
      current: 'Учурдагы', previous: 'Мурунку', cohort: 'Когорта', median: 'Келүүлөрдүн ортосундагы медиана', services: 'Кызматтардын үлүшү', checks: 'Эскертүүсүз', checksShort: 'таза текшерүү', workingDay: 'иш күнүнө чек', noData: 'Маалымат жок',
      dynamics: 'Көрсөткүчтүн динамикасы', history: 'Тарыхтагы анык айлар', comparison: 'Мезгилдерди салыштыруу', signals: 'Операциялык сигналдар', violators: 'Эреже бузган усталар', violations: 'Көп кездешкен эреже бузуулар', reacted: 'Эсептелген жооптор', quality: 'ОВН сапаты',
      breakdown: 'Деталдаштыруу', breakdownCopy: 'Усталарды көрүү үчүн объектти басыңыз', method: 'Көрсөткүч кантип эсептелет', object: 'Объект', value: 'Маани', trend: 'Абалы', stable: 'Мезгилдин маалыматы боюнча', mastersNone: 'Усталар боюнча деталдар жок', historyNone: 'Бул көрсөткүч боюнча тарых азырынча топтоло элек', source: 'Булактар: кабинеттин учурдагы API’лери, ОВН журналы жана сакталган аналитика тарыхы. Preview маалыматтарды өзгөртпөйт.', loading: 'Учурдагы маалыматтар жүктөлүүдө',
      methodRevenue: 'Учурдагы чейректин биринчи күнүнөн кечээге чейинки киреше мурунку чейректин ошол эле аралыгы менен салыштырылат.', methodReturn: 'Биринчи келгенден кийин 60 күндүн ичинде кайтып келген жетилген когортадагы жаңы кардарлардын үлүшү.', methodCycle: 'Акыркы 90 күндө бир кардардын эки келүүсүнүн ортосундагы күндөрдүн медианасы.', methodAppointments: 'Учурдагы айдын башынан кечээге чейин онлайн виджет аркылуу жазылган кызматтардын жалпы кызматтардагы үлүшү.', methodOccupancy: 'Устанын бир иш күнүндөгү чектеринин орточо саны. Экиден көп чек болгон күндөр эсептелет.', methodOvn: 'Учурдагы календардык айдын башынан кечээге чейин эскертүүсүз өткөн ОВН текшерүүлөрүнүн үлүшү. Кечигүүлөр эсептен чыгарылат.', methodReaction: 'Учурдагы календардык айда ОВН эреже бузуусу түзүлгөндөн менеджер жооп бергенге чейинки орточо иш убактысы.',
      min: 'мүн', hour: 'саат', day: 'күн', rub: '₽', from: 'ичинен'
    }
  };

  const state = {
    user: null,
    locale: 'ru',
    selected: 'revenue',
    data: null,
    ovn: [],
    history: null,
    managerSchedule: [],
    derived: null,
    loading: false,
    error: ''
  };

  if (!copy[state.locale]) state.locale = 'ru';

  function t(key) {
    return (copy[state.locale] && copy[state.locale][key]) || copy.ru[key] || key;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function restoreUser() {
    try {
      const raw = localStorage.getItem('grome_user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      const key = user && (user.key || user.tg_id || user.id || localStorage.getItem('tg_id'));
      if (!key) return null;
      user.key = String(key);
      localStorage.setItem('grome_user', JSON.stringify(user));
      return user;
    } catch (error) {
      localStorage.removeItem('grome_user');
      return null;
    }
  }

  function roleLabel(role) {
    if (role === 'owner') return t('owner');
    if (role === 'manager') return t('manager');
    return t('ovnRole');
  }

  function renderAuth(message) {
    document.documentElement.lang = state.locale === 'uz' ? 'uz' : state.locale === 'tg' ? 'tg' : state.locale === 'ky' ? 'ky' : 'ru';
    root.innerHTML = `
      <main class="auth-view">
        <section class="auth-card" aria-labelledby="auth-title">
          <div class="auth-brand"><span class="brand-mark">G</span><div><div class="brand-wordmark">GROME</div><p class="eyebrow">${esc(t('preview'))}</p></div></div>
          <h1 id="auth-title">${esc(t('loginTitle'))}</h1>
          <p class="auth-copy">${esc(t('loginCopy'))}</p>
          <form id="preview-login-form">
            <label class="field"><span>${esc(t('login'))}</span><input id="preview-login" autocomplete="username" required></label>
            <label class="field"><span>${esc(t('password'))}</span><input id="preview-password" type="password" autocomplete="current-password" required></label>
            <button class="primary-btn" id="preview-login-btn" type="submit">${esc(t('enter'))}</button>
            <p class="form-error" id="preview-login-error" role="alert">${esc(message || '')}</p>
          </form>
        </section>
      </main>`;

    document.getElementById('preview-login-form').addEventListener('submit', handleLogin);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const login = document.getElementById('preview-login').value.trim();
    const password = document.getElementById('preview-password').value.trim();
    const errorEl = document.getElementById('preview-login-error');
    const button = document.getElementById('preview-login-btn');
    if (!login || !password) {
      errorEl.textContent = t('required');
      return;
    }
    button.disabled = true;
    button.textContent = t('enterBusy');
    errorEl.textContent = '';
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.error) throw new Error(payload.error || t('connection'));
      if (payload.user && payload.user.role === 'master') {
        const master = { ...payload.user, key: payload.key };
        localStorage.setItem('grome_user', JSON.stringify(master));
        window.location.replace('/master-mobile-current.html');
        return;
      }
      if (!payload.user || !allowedRoles.has(payload.user.role)) throw new Error(t('denied'));
      state.user = { ...payload.user, key: payload.key };
      localStorage.setItem('grome_user', JSON.stringify(state.user));
      await loadDashboard();
    } catch (error) {
      errorEl.textContent = error.message || t('connection');
      button.disabled = false;
      button.textContent = t('enter');
    }
  }

  function logout() {
    localStorage.removeItem('grome_user');
    localStorage.removeItem('tg_id');
    state.user = null;
    state.data = null;
    state.ovn = [];
    state.history = null;
    state.derived = null;
    renderAuth();
  }

  async function api(path) {
    const response = await fetch(path, { headers: { 'X-User-Key': state.user.key } });
    if (response.status === 401 || response.status === 403) {
      const error = new Error(response.status === 401 ? t('denied') : t('connection'));
      error.status = response.status;
      throw error;
    }
    if (!response.ok) throw new Error(t('connection'));
    return response.json();
  }

  async function optionalApi(path) {
    try { return await api(path); } catch (error) { return null; }
  }

  function isLate(report) {
    if (!report) return false;
    const text = [report.violation, report.notes, report.forceMajeureType]
      .map(value => String(value || '').toLowerCase()).join(' ');
    return Boolean(
      report.schedTime || report.isForceMajeure || report.forceMajeureType ||
      text.includes('мастер опоздал') || text.includes('опоздан') || text.includes('не вышел') ||
      text.includes('невыход') || text.includes('форс')
    );
  }

  function isAnalyticsExcluded(report) {
    const barber = String((report && report.barber) || '').trim().toLocaleLowerCase('ru-RU');
    return !!(report && (
      report.excludeFromAnalytics === true ||
      report.subjectType === 'trainee' ||
      barber === 'стажёр'
    ));
  }

  function isClean(report) {
    const text = String((report && report.violation) || '').toLowerCase();
    return !text || text.includes('нет') || text.includes('✅');
  }

  function endOfYesterday() {
    return dayjs().subtract(1, 'day').endOf('day');
  }

  function buildOvnMetric(reports) {
    const branches = ['Алексеевская', 'Партизанская', 'Рязанский', 'Сокол', 'Текстильщики'];
    const branchData = Object.fromEntries(branches.map(name => [name, { total: 0, ok: 0, masters: {} }]));
    const month = dayjs().format('YYYY-MM');
    const cutoff = endOfYesterday();
    const rows = reports.filter(report => !isLate(report) && !isAnalyticsExcluded(report)).filter(report => {
      const reportDate = dayjs(report.date || report.createdAt);
      return reportDate.isValid() && reportDate.format('YYYY-MM') === month && !reportDate.isAfter(cutoff);
    });
    let passed = 0;
    rows.forEach(report => {
      const ok = isClean(report);
      if (ok) passed += 1;
      const rawLocation = String(report.location || '');
      const location = rawLocation.toLowerCase().startsWith('рязан') ? 'Рязанский' : rawLocation;
      const branch = branchData[location];
      if (!branch) return;
      branch.total += 1;
      if (ok) branch.ok += 1;
      const name = report.barber || 'Неизвестно';
      if (!branch.masters[name]) branch.masters[name] = { total: 0, ok: 0 };
      branch.masters[name].total += 1;
      if (ok) branch.masters[name].ok += 1;
    });
    const drilldown = branches.map(name => {
      const branch = branchData[name];
      const value = branch.total ? Math.round(branch.ok / branch.total * 100) : 0;
      return {
        name,
        value: `${value}% (${branch.ok}/${branch.total})`,
        trend: value >= 80 ? 'up' : 'down',
        masters: Object.entries(branch.masters).sort((a, b) => a[0].localeCompare(b[0], 'ru')).map(([master, item]) => ({
          name: master,
          v: `${item.total ? Math.round(item.ok / item.total * 100) : 0}% (${item.ok} ${t('from')} ${item.total})`
        }))
      };
    });
    return {
      value: rows.length ? Math.round(passed / rows.length * 100) : 0,
      passed,
      total: rows.length,
      period: `${dayjs().startOf('month').format('DD.MM')}-${dayjs().subtract(1, 'day').format('DD.MM')}`,
      drilldown,
      rows
    };
  }

  function getManagerWorkDays() {
    const days = new Set();
    (state.managerSchedule || []).forEach(item => {
      if (item && item.name === 'Игорь' && item.status === 'work' && item.date) days.add(item.date);
    });
    return days;
  }

  function reactionWorkingMs(report, workDays) {
    const createdMs = new Date(report.createdAt).getTime();
    const reactionMs = new Date(report.reactionAt).getTime();
    if (!Number.isFinite(createdMs) || !Number.isFinite(reactionMs)) return 0;
    if (!workDays.size) return Math.max(0, reactionMs - createdMs);
    const startHour = 10;
    const endHour = 18;
    const createdMsk = dayjs(report.createdAt).add(3, 'hour');
    const dateKey = createdMsk.format('YYYY-MM-DD');
    let effectiveStart = createdMs;
    if (workDays.has(dateKey) && createdMsk.hour() < startHour) {
      effectiveStart = dayjs(dateKey).hour(startHour).subtract(3, 'hour').valueOf();
    } else if (!workDays.has(dateKey) || createdMsk.hour() >= endHour) {
      let next = createdMsk.add(1, 'day').startOf('day');
      for (let index = 0; index < 60; index += 1) {
        const nextKey = next.format('YYYY-MM-DD');
        if (workDays.has(nextKey)) {
          effectiveStart = dayjs(nextKey).hour(startHour).subtract(3, 'hour').valueOf();
          break;
        }
        next = next.add(1, 'day');
      }
    }
    let total = 0;
    let cursor = dayjs(effectiveStart).add(3, 'hour');
    const end = dayjs(reactionMs).add(3, 'hour');
    while (cursor.isBefore(end)) {
      const key = cursor.format('YYYY-MM-DD');
      if (workDays.has(key)) {
        const workStart = dayjs(key).hour(startHour);
        const workEnd = dayjs(key).hour(endHour);
        const segmentStart = cursor.isAfter(workStart) ? cursor : workStart;
        const segmentEnd = end.isBefore(workEnd) ? end : workEnd;
        if (segmentEnd.isAfter(segmentStart)) total += segmentEnd.diff(segmentStart);
      }
      cursor = cursor.add(1, 'day').startOf('day');
    }
    return Math.max(0, total);
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return t('noData');
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const gap = state.locale === 'ru' ? '' : ' ';
    return hours > 0 ? `${hours}${gap}${t('hour')} ${minutes}${gap}${t('min')}` : `${minutes}${gap}${t('min')}`;
  }

  function buildReactionMetric(reports) {
    const month = dayjs().format('YYYY-MM');
    const workDays = getManagerWorkDays();
    const rows = reports.filter(report => !isLate(report) && !isAnalyticsExcluded(report) && report.reactionAt && report.createdAt && !isClean(report))
      .filter(report => dayjs(report.createdAt).format('YYYY-MM') === month)
      .map(report => ({ ...report, duration: reactionWorkingMs(report, workDays) }))
      .filter(report => Number.isFinite(report.duration) && report.duration >= 0);
    const average = rows.length ? rows.reduce((sum, report) => sum + report.duration, 0) / rows.length : 0;
    const groups = {};
    rows.forEach(report => {
      const manager = report.reactionBy || t('manager');
      if (!groups[manager]) groups[manager] = [];
      groups[manager].push(report);
    });
    const drilldown = Object.entries(groups).map(([manager, items]) => {
      const avg = items.reduce((sum, item) => sum + item.duration, 0) / items.length;
      const byBranch = {};
      items.forEach(item => {
        const branch = item.location || 'Неизвестно';
        if (!byBranch[branch]) byBranch[branch] = [];
        byBranch[branch].push(item.duration);
      });
      return {
        name: manager,
        value: `${formatDuration(avg)} (${items.length})`,
        trend: 'stable',
        masters: Object.entries(byBranch).map(([branch, values]) => ({
          name: branch,
          v: `${formatDuration(values.reduce((a, b) => a + b, 0) / values.length)} (${values.length})`
        }))
      };
    });
    return { value: formatDuration(average), average, count: rows.length, drilldown, rows };
  }

  function buildTops(ovnMetric) {
    const violations = ovnMetric.rows.filter(report => !isClean(report));
    function topBy(key) {
      const counts = {};
      violations.forEach(report => {
        const name = String(report[key] || '').trim();
        if (name) counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
    }
    return { violators: topBy('barber'), violations: topBy('violation') };
  }

  function derive() {
    const ovnQuality = buildOvnMetric(state.ovn || []);
    const reaction = buildReactionMetric(state.ovn || []);
    return { ovnQuality, reaction, tops: buildTops(ovnQuality) };
  }

  function renderLoading() {
    root.innerHTML = `<main class="loading-shell"><div><div class="loading-mark"></div>${esc(t('loading'))}</div></main>`;
  }

  async function loadDashboard() {
    if (!state.user || !allowedRoles.has(state.user.role)) {
      renderAuth(state.user ? t('denied') : '');
      return;
    }
    state.loading = true;
    state.error = '';
    renderLoading();
    try {
      const managementRole = state.user.role === 'owner' || state.user.role === 'manager';
      const [data, ovn, history, managerSchedule] = await Promise.all([
        api('/api/data'),
        api('/api/ovn?video_only=1&analytics_only=1'),
        managementRole ? optionalApi('/api/analytics-history') : Promise.resolve(null),
        managementRole ? optionalApi('/api/manager-schedule') : Promise.resolve(null)
      ]);
      state.data = data;
      state.ovn = Array.isArray(ovn) ? ovn : [];
      state.history = history;
      state.managerSchedule = Array.isArray(managerSchedule) ? managerSchedule : [];
      state.derived = derive();
      renderDashboard();
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem('grome_user');
        state.user = null;
        renderAuth(t('denied'));
      } else {
        state.error = error.message || t('connection');
        renderDashboard();
      }
    } finally {
      state.loading = false;
    }
  }

  function money(value) {
    return `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ${t('rub')}`;
  }

  function localizeDataText(value) {
    const source = String(value == null ? '' : value);
    if (state.locale === 'ru') return source;
    const cohort = source.match(/(\d+)\s+из\s+(\d+)\s+новых/i);
    if (cohort) {
      if (state.locale === 'uz') return `${cohort[2]} yangi mijozdan ${cohort[1]} tasi`;
      if (state.locale === 'tg') return `${cohort[1]} аз ${cohort[2]} муштарии нав`;
      return `${cohort[2]} жаңы кардардын ичинен ${cohort[1]}`;
    }
    return source
      .replace(/нет данных/gi, t('noData'))
      .replace(/малая база/gi, state.locale === 'uz' ? 'kichik baza' : state.locale === 'tg' ? 'заминаи хурд' : 'аз маалымат')
      .replace(/(\d+)\s+из\s+(\d+)/gi, '$1/$2')
      .replace(/онлайн/gi, state.locale === 'uz' ? 'onlayn' : 'онлайн');
  }

  function metricValue(id) {
    const data = state.data || {};
    if (id === 'revenue') {
      const value = Number(data.revenue && data.revenue.growth) || 0;
      return `${value >= 0 ? '+' : ''}${value}%`;
    }
    if (id === 'returnRate') return `${Number(data.returnRate && data.returnRate.value) || 0}%`;
    if (id === 'cycle') return `${Number(data.cycle && data.cycle.value) || 0}${state.locale === 'ru' ? '' : ' '}${t('day')}`;
    if (id === 'appointments') return `${Number(data.appointments && data.appointments.percentage) || 0}%`;
    if (id === 'occupancy') return String((data.occupancy && data.occupancy.value) || 0);
    if (id === 'ovnQuality') return `${state.derived.ovnQuality.value}%`;
    return state.derived.reaction.value;
  }

  function metricNote(id) {
    const data = state.data || {};
    if (id === 'revenue') return (data.revenue && data.revenue.period) || '';
    if (id === 'returnRate') {
      const first = data.returnRate && data.returnRate.drilldown && data.returnRate.drilldown[0];
      return `${t('cohort')} ${(data.returnRate && data.returnRate.period) || ''}${first && first.value ? ` · ${localizeDataText(first.value)}` : ''}`;
    }
    if (id === 'cycle') return `${t('median')} · ${(data.cycle && data.cycle.period) || ''}`;
    if (id === 'appointments') return `${t('services')} · ${(data.appointments && data.appointments.period) || ''}`;
    if (id === 'occupancy') return `${t('workingDay')} · ${(data.occupancy && data.occupancy.period) || ''}`;
    if (id === 'ovnQuality') return `${state.derived.ovnQuality.passed} ${t('from')} ${state.derived.ovnQuality.total} · ${state.derived.ovnQuality.period}`;
    return `${state.derived.reaction.count} · ${t('reacted')}`;
  }

  function metricMethod(id) {
    return t({ revenue: 'methodRevenue', returnRate: 'methodReturn', cycle: 'methodCycle', appointments: 'methodAppointments', occupancy: 'methodOccupancy', ovnQuality: 'methodOvn', reaction: 'methodReaction' }[id]);
  }

  function revenueComparison() {
    const revenue = state.data.revenue || {};
    const current = Number(revenue.current) || 0;
    const previous = Number(revenue.previous) || 0;
    const max = Math.max(current, previous, 1);
    return `<div class="comparison-bars">
      <div class="comparison-row current"><span>${esc(t('current'))}</span><span class="comparison-track"><span class="comparison-fill" style="width:${Math.round(current / max * 100)}%"></span></span><b>${esc(money(current))}</b></div>
      <div class="comparison-row"><span>${esc(t('previous'))}</span><span class="comparison-track"><span class="comparison-fill" style="width:${Math.round(previous / max * 100)}%"></span></span><b>${esc(money(previous))}</b></div>
    </div>`;
  }

  function metricCards() {
    return metricOrder.map(id => {
      const active = state.selected === id;
      return `<button class="metric-card${id === 'revenue' ? ' primary' : ''}${active ? ' is-active' : ''}" type="button" data-metric="${id}" aria-pressed="${active}">
        <span class="metric-label">${esc(t(id))}</span>
        <span><strong class="metric-value">${esc(metricValue(id))}</strong><span class="metric-note">${esc(metricNote(id))}</span>${id === 'revenue' ? revenueComparison() : ''}</span>
      </button>`;
    }).join('');
  }

  function historyMonths(id) {
    if (id === 'revenue') {
      const revenue = state.data.revenue || {};
      return [
        { label: t('previous'), value: Number(revenue.previous) || 0, display: money(revenue.previous) },
        { label: t('current'), value: Number(revenue.current) || 0, display: money(revenue.current) }
      ];
    }
    const historyKey = id === 'ovnQuality' ? 'ovnQuality' : id;
    const metric = state.history && state.history.metrics && state.history.metrics[historyKey];
    const months = metric && Array.isArray(metric.months) ? metric.months.map(item => {
      const rawValue = id === 'appointments' ? item.percentage : item.value;
      const value = Number(rawValue) || 0;
      const suffix = id === 'cycle' ? `${state.locale === 'ru' ? '' : ' '}${t('day')}` : id === 'occupancy' ? '' : '%';
      return { key: item.key, label: item.label || item.key, value, display: `${value}${suffix}` };
    }) : [];
    if (id === 'ovnQuality') {
      const currentKey = dayjs().format('YYYY-MM');
      if (!months.some(item => item.key === currentKey)) months.push({ key: currentKey, label: dayjs().format('MM.YY'), value: state.derived.ovnQuality.value, display: `${state.derived.ovnQuality.value}%` });
    }
    return months.slice(-12);
  }

  function historyChart() {
    const months = historyMonths(state.selected);
    if (!months.length) return `<div class="empty-chart">${esc(t('historyNone'))}</div>`;
    const values = months.map(item => Number(item.value) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, max * .12, 1);
    return `<div class="history-chart" role="img" aria-label="${esc(t('dynamics'))}">${months.map(item => {
      const height = 18 + ((Number(item.value) || 0) - min) / range * 82;
      const shortLabel = item.key && /^\d{4}-\d{2}$/.test(item.key)
        ? `${item.key.slice(5, 7)}.${item.key.slice(2, 4)}`
        : String(item.label || '').slice(0, 8);
      return `<div class="history-column" title="${esc(shortLabel)}: ${esc(item.display)}"><strong>${esc(item.display)}</strong><span class="history-bar-wrap"><span class="history-bar" style="height:${Math.max(3, Math.min(100, height))}%"></span></span><span>${esc(shortLabel)}</span></div>`;
    }).join('')}</div>`;
  }

  function signalRows(items, empty) {
    if (!items.length) return `<div class="signal-row"><span>${esc(empty)}</span><strong>0</strong></div>`;
    return items.map((item, index) => `<div class="signal-row"><span><b class="signal-rank">${index + 1}</b> · ${esc(item.name)}</span><strong>${item.count}</strong></div>`).join('');
  }

  function signalsPanel() {
    const tops = state.derived.tops;
    return `<aside class="panel signal-panel">
      <div class="panel-head"><div><p class="eyebrow">${esc(t('signals'))}</p><h3>${esc(t('violators'))}</h3></div></div>
      <div class="signal-body">${signalRows(tops.violators, t('noData'))}</div>
      <div class="panel-head"><div><h3>${esc(t('violations'))}</h3></div></div>
      <div class="signal-body">${signalRows(tops.violations, t('noData'))}
        <div class="signal-row"><span>${esc(t('quality'))}</span><strong>${state.derived.ovnQuality.value}%</strong></div>
        <div class="signal-row"><span>${esc(t('reaction'))}</span><strong>${esc(state.derived.reaction.value)}</strong></div>
      </div>
    </aside>`;
  }

  function selectedDrilldown() {
    if (state.selected === 'ovnQuality' || state.selected === 'reaction') return state.derived[state.selected].drilldown || [];
    const metric = state.data && state.data[state.selected];
    return metric && Array.isArray(metric.drilldown) ? metric.drilldown : [];
  }

  function breakdownTable() {
    const rows = selectedDrilldown();
    if (!rows.length) return `<div class="empty-chart">${esc(t('noData'))}</div>`;
    const body = rows.map((row, rowIndex) => {
      const masters = Array.isArray(row.masters) ? row.masters : [];
      const masterRows = masters.length ? masters.map(master => `<tr class="master-row" data-parent="branch-${rowIndex}"><td>${esc(master.name)}</td><td>${esc(localizeDataText(master.v || master.value || t('noData')))}</td><td></td></tr>`).join('') : `<tr class="master-row" data-parent="branch-${rowIndex}"><td>${esc(t('mastersNone'))}</td><td></td><td></td></tr>`;
      return `<tr><td><button class="branch-toggle" type="button" data-branch="branch-${rowIndex}" aria-expanded="false">${esc(row.name || t('object'))}</button></td><td>${esc(localizeDataText(row.value || row.v || t('noData')))}</td><td>${esc(t('stable'))}</td></tr>${masterRows}`;
    }).join('');
    return `<div class="table-wrap"><table class="breakdown-table"><thead><tr><th>${esc(t('object'))}</th><th>${esc(t('value'))}</th><th>${esc(t('trend'))}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function navMarkup() {
    const items = [
      ['analytics', true], ['ovn', false], ['lates', false], ['schedule', false]
    ];
    return items.map(([label, active]) => `<span class="nav-item${active ? ' active' : ''}"${active ? ' aria-current="page"' : ' aria-disabled="true"'}>${esc(t(label))}</span>`).join('');
  }

  function renderDashboard() {
    if (!state.user || !state.data || !state.derived) {
      renderAuth(state.error || '');
      return;
    }
    document.documentElement.lang = state.locale === 'uz' ? 'uz' : state.locale === 'tg' ? 'tg' : state.locale === 'ky' ? 'ky' : 'ru';
    const lastUpdate = state.data.lastUpdate || dayjs().format('HH:mm DD.MM.YYYY');
    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-brand"><span class="brand-mark">G</span><div><div class="brand-wordmark">GROME</div><small>${esc(t('workspace'))}</small></div></div>
          <p class="nav-label">${esc(t('main'))}</p><nav class="side-nav" aria-label="${esc(t('main'))}">${navMarkup()}</nav>
          <p class="nav-label">${esc(t('management'))}</p><nav class="side-nav"><span class="nav-item" aria-disabled="true">${esc(t('masters'))}</span><span class="nav-item" aria-disabled="true">${esc(t('settings'))}</span></nav>
          <div class="sidebar-foot"><strong>${esc(state.user.name)}</strong><span>${esc(roleLabel(state.user.role))}</span></div>
        </aside>
        <div class="main-shell">
          <header class="topbar">
            <div class="mobile-brand"><span class="brand-mark">G</span><div><div class="brand-wordmark">GROME</div><small>${esc(t('analytics'))}</small></div></div>
            <div class="topbar-copy"><strong>${esc(t('analytics'))}</strong><span>${esc(t('currentScreen'))}</span></div>
            <div class="topbar-actions">
              <button class="quiet-btn" id="refresh-text" type="button">${esc(t('refresh'))}</button>
              <button class="icon-btn" id="refresh-icon" type="button" aria-label="${esc(t('refresh'))}" title="${esc(t('refresh'))}"><span class="refresh-glyph"></span></button>
              <button class="icon-btn" id="logout-btn" type="button" aria-label="${esc(t('logout'))}" title="${esc(t('logout'))}"><span class="logout-glyph"></span></button>
            </div>
          </header>
          <main class="content">
            ${state.error ? `<div class="error-banner" role="alert">${esc(state.error)}</div>` : ''}
            <section class="page-intro"><div><p class="eyebrow">${esc(t('live'))}</p><h1>${esc(t('title'))}</h1><p>${esc(t('intro'))}</p></div><div class="freshness${state.error ? ' is-error' : ''}"><span class="freshness-dot"></span><span>${esc(t('updated'))} ${esc(lastUpdate)}</span></div></section>
            <section class="metric-grid" aria-label="${esc(t('analytics'))}">${metricCards()}</section>
            <section class="analysis-grid">
              <div class="panel"><div class="panel-head"><div><p class="eyebrow">${esc(t(state.selected))}</p><h2>${esc(state.selected === 'revenue' ? t('comparison') : t('dynamics'))}</h2><p class="panel-caption">${esc(t('history'))}</p></div><details class="metric-method"><summary>${esc(t('method'))}</summary><p>${esc(metricMethod(state.selected))}</p></details></div>${historyChart()}</div>
              ${signalsPanel()}
            </section>
            <section class="panel breakdown-panel"><div class="panel-head"><div><p class="eyebrow">${esc(t(state.selected))}</p><h2>${esc(t('breakdown'))}</h2><p class="panel-caption">${esc(t('breakdownCopy'))}</p></div></div>${breakdownTable()}</section>
            <p class="source-note">${esc(t('source'))}</p>
          </main>
        </div>
      </div>`;
    bindDashboard();
  }

  function bindDashboard() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('refresh-text').addEventListener('click', loadDashboard);
    document.getElementById('refresh-icon').addEventListener('click', loadDashboard);
    document.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => {
      state.selected = button.dataset.metric;
      renderDashboard();
    }));
    document.querySelectorAll('[data-branch]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.branch;
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      document.querySelectorAll(`[data-parent="${id}"]`).forEach(row => row.classList.toggle('is-open', open));
    }));
  }

  state.user = restoreUser();
  if (state.user && state.user.role === 'master') {
    window.location.replace('/master-mobile-current.html');
  } else if (state.user && allowedRoles.has(state.user.role)) {
    loadDashboard();
  } else {
    renderAuth();
  }
})();
