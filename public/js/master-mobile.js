// FINANCIAL UI — salary/fines/zones are protected by /root/grom-dashboard/AGENTS.md.
(function() {
  'use strict';

  const state = {
    data: null,
    ovn: [],
    schedule: [],
    scheduleError: '',
    loading: false,
    user: null,
    activeSection: '#summary-section'
  };

  const $ = (id) => document.getElementById(id);
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;

  function restoreUser() {
    try {
      const raw = localStorage.getItem('grome_user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      const key = user && (user.key || user.tg_id || user.id || localStorage.getItem('tg_id'));
      if (!key) return null;
      user.key = String(key);
      localStorage.setItem('grome_user', JSON.stringify(user));
      window.USER = user;
      window.CURRENT_MASTER = user.name || '';
      return user;
    } catch(e) {
      localStorage.removeItem('grome_user');
      return null;
    }
  }

  function showLogin() {
    $('login-view').hidden = false;
    $('app-view').hidden = true;
  }

  function showApp(user) {
    state.user = user;
    window.USER = user;
    window.CURRENT_MASTER = user.name || '';
    $('login-view').hidden = true;
    $('app-view').hidden = false;
    $('master-name').textContent = user.name || 'Кабинет мастера';
  }

  async function handleLogin() {
    const loginEl = $('login-input');
    const passEl = $('password-input');
    const errEl = $('login-error');
    const btnEl = $('login-btn');
    const login = (loginEl.value || '').trim();
    const password = (passEl.value || '').trim();

    if (!login || !password) {
      errEl.textContent = 'Введите логин и пароль';
      return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Входим...';
    errEl.textContent = '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || 'Неверный логин или пароль');

      const user = { ...data.user, key: data.key };
      localStorage.setItem('grome_user', JSON.stringify(user));
      showApp(user);
      await loadDashboard();
    } catch(e) {
      errEl.textContent = e.message || 'Ошибка входа';
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Войти';
    }
  }

  function canonicalName(name) {
    if (typeof window.getAdapterMasterCanonical === 'function') {
      const found = window.getAdapterMasterCanonical(name);
      if (found) return found;
    }
    return String(name || '').trim();
  }

  function sameMaster(a, b) {
    const left = canonicalName(a);
    const right = canonicalName(b);
    return !!left && !!right && left === right;
  }

  function getAdapterRecord(name) {
    const adapter = (typeof ADAPTER !== 'undefined') ? ADAPTER : (window.ADAPTER || null);
    if (!adapter) return null;
    for (const [location, branch] of Object.entries(adapter || {})) {
      for (const master of (branch.masters || [])) {
        const aliases = [master.dash, ...(master.el_kassa || [])];
        if (aliases.some(alias => sameMaster(name, alias))) {
          return { ...master, location };
        }
      }
    }
    return null;
  }

  function weekPeriod() {
    const start = dayjs().startOf('isoWeek');
    const yesterday = dayjs().subtract(1, 'day');
    const end = yesterday.isBefore(start, 'day') ? dayjs() : yesterday;
    return { start, end };
  }

  function reportDate(report) {
    const d = dayjs(report && (report.date || report.createdAt));
    return d.isValid() ? d : null;
  }

  function isOvnViolation(report) {
    const text = String((report && report.violation) || '').toLowerCase();
    if (!text) return false;
    if (text.includes('замечаний нет') || text.includes('✅')) return false;
    if (typeof window.isZoneExcludedViolation === 'function' ? window.isZoneExcludedViolation(text) : (text.includes('опоздал') || text.includes('отказ клиенту'))) return false;
    if (report && report.isManualFine) return false;
    return true;
  }

  function weeklyViolationsFor(masterName, reports) {
    const period = weekPeriod();
    return (reports || [])
      .filter(r => sameMaster(masterName, r.barber))
      .filter(isOvnViolation)
      .filter(r => {
        const d = reportDate(r);
        return d && !d.isBefore(period.start, 'day') && !d.isAfter(period.end, 'day');
      })
      .sort((a, b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
  }

  async function json(url, options) {
    const res = await fetch(url, options);
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error((payload && payload.error) || `Ошибка ${res.status}`);
    return payload;
  }

  async function loadDashboard() {
    if (state.loading) return;
    state.loading = true;
    setLoading(true);

    try {
      const stamp = Date.now();
      const [data, ovn, scheduleResult] = await Promise.all([
        json(`/data.json?v=${stamp}`),
        json(`/api/ovn?v=${stamp}`).catch(() => []),
        json(`/api/schedule?v=${stamp}`)
          .then(value => ({ value }))
          .catch(error => ({ error }))
      ]);
      state.data = data || {};
      state.ovn = Array.isArray(ovn) ? ovn : [];
      state.schedule = scheduleResult && Array.isArray(scheduleResult.value) ? scheduleResult.value : [];
      state.scheduleError = scheduleResult && scheduleResult.error
        ? (scheduleResult.error.message || 'Не удалось загрузить график')
        : '';
      renderAll();
      await renderSalary();
    } catch(e) {
      renderError(e);
    } finally {
      setLoading(false);
      state.loading = false;
    }
  }

  function setLoading(isLoading) {
    const btns = [$('refresh-btn')].filter(Boolean);
    btns.forEach(btn => {
      btn.disabled = isLoading;
      btn.style.opacity = isLoading ? '.62' : '';
    });
    if (isLoading) {
      $('salary-value').textContent = 'Считаю...';
      $('salary-sub').textContent = 'Обновляю данные';
    }
  }

  function renderError(error) {
    $('violations-list').innerHTML = `
      <div class="violation-item">
        <div class="violation-meta"><span>Ошибка</span><span>данные</span></div>
        <strong>${escapeHtml(error.message || 'Не удалось загрузить кабинет')}</strong>
        <p class="muted">Попробуйте обновить экран.</p>
      </div>
    `;
  }

  function renderAll() {
    const master = (state.user && state.user.name) || window.CURRENT_MASTER || '';
    const data = state.data || {};
    const ovn = state.ovn || [];
    const adapter = getAdapterRecord(master);
    const canonical = canonicalName(master);

    const occ = getOccupancy(data, canonical);
    const rr = getReturnRate(data, canonical);
    const quality = getQuality(ovn, canonical);
    const weekly = weeklyViolationsFor(canonical, ovn);
    const fines = getFines(canonical, ovn);

    renderZone(fines, weekly.length);
    renderOccupancy(occ);
    renderReturnRate(rr);
    renderQuality(quality);
    renderFines(fines, weekly.length);
    renderSchedule(state.schedule, canonical, state.scheduleError);
    renderJournal(weekly);

    if (adapter && adapter.location) {
      $('zone-hint').textContent = `${adapter.location}, период ${periodLabel()}`;
    } else {
      $('zone-hint').textContent = `Период ${periodLabel()}`;
    }
  }

  function getOccupancy(data, master) {
    const list = data && data.occupancy && data.occupancy.drilldown && data.occupancy.drilldown[0]
      ? data.occupancy.drilldown[0].masters || []
      : [];
    const item = list.find(m => sameMaster(master, m.name));
    const value = item ? parseFloat(String(item.v).replace(',', '.')) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  function getReturnRate(data, master) {
    const list = data && data.returnRate && data.returnRate.drilldown && data.returnRate.drilldown[0]
      ? data.returnRate.drilldown[0].masters || []
      : [];
    const item = list.find(m => sameMaster(master, m.name));
    if (!item) return { percent: 0, detail: 'Личная возвращаемость клиентов' };
    const raw = String(item.v || '0');
    const percent = parseFloat(raw.replace(',', '.')) || 0;
    const match = raw.match(/\(([^)]+)\)/);
    const ratio = match ? String(match[1]).match(/(\d+)\s*\/\s*(\d+)/) : null;
    return {
      percent,
      returned: ratio ? Number(ratio[1]) : 0,
      total: ratio ? Number(ratio[2]) : 0,
      detail: match ? `${match[1]} вернувшихся` : 'Личная возвращаемость клиентов'
    };
  }

  function getQuality(ovn, master) {
    const checks = (ovn || []).filter(r => sameMaster(master, r.barber));
    if (!checks.length) return { value: 0, passed: 0, total: 0 };
    const passed = checks.filter(r => {
      const v = String(r.violation || '').toLowerCase();
      return !v || v.includes('замечаний нет') || v.includes('✅');
    }).length;
    return { value: Math.round((passed / checks.length) * 100), passed, total: checks.length };
  }

  function getFines(master, ovn) {
    const period = weekPeriod();
    if (typeof window.calculateFines !== 'function') {
      return { state: 'Green', weekViolations: 0, monthFines: 0, details: [] };
    }
    const all = window.calculateFines(ovn || [], {
      start: period.start.format('YYYY-MM-DD'),
      end: period.end.format('YYYY-MM-DD')
    });
    return all[master] || { state: 'Green', weekViolations: 0, monthFines: 0, details: [] };
  }

  async function renderSalary() {
    const master = (state.user && state.user.name) || '';
    window.CURRENT_MASTER = master;

    if (typeof window.updateMasterWeeklySalary !== 'function') {
      $('salary-value').textContent = 'Нет данных';
      $('salary-sub').textContent = 'Расчёт недоступен';
      return;
    }

    try {
      const payload = await window.updateMasterWeeklySalary({ preferCache: true });
      const value = payload && payload.valueText ? payload.valueText : $('master-week-salary').textContent;
      const sub = payload && payload.subText ? payload.subText : $('master-week-salary-sub').textContent;
      $('salary-value').textContent = cleanRub(value || '0 ₽');
      $('salary-sub').textContent = cleanRub(sub || 'По завершённым дням');
      $('salary-pill').textContent = payload && payload.cachedAt ? 'кэш' : 'актуально';
      renderSalaryBars(payload);
    } catch(e) {
      $('salary-value').textContent = 'Нет данных';
      $('salary-sub').textContent = 'Не удалось обновить расчёт';
      $('salary-pill').textContent = 'ошибка';
      renderSalaryBars(null);
    }
  }

  function renderZone(fines, weeklyCount) {
    const stateName = fines && fines.state ? fines.state : 'Green';
    const zone = {
      Green: { label: 'Зелёная', color: '#41d672', progress: 86 },
      Yellow: { label: 'Жёлтая', color: '#ffbf3d', progress: 62 },
      Red: { label: 'Красная', color: '#ff5a4f', progress: 38 }
    }[stateName] || { label: 'Зелёная', color: '#41d672', progress: 86 };

    const card = $('zone-card');
    card.style.setProperty('--zone-color', zone.color);
    card.style.setProperty('--zone-progress', zone.progress);
    $('zone-dot').style.background = zone.color;
    $('zone-dot').style.boxShadow = `0 0 0 8px ${hexToRgba(zone.color, .15)}`;
    $('zone-label').textContent = zone.label;
    $('zone-count').textContent = weeklyCount;
  }

  function renderOccupancy(value) {
    const normalized = Math.max(0, Number(value) || 0);
    const target = 18;
    const percent = Math.min(100, (normalized / target) * 100);
    const roundedPercent = Math.round(percent);
    const progress = $('occupancy-progress');

    $('occupancy-value').textContent = `${formatOne(normalized)} ч/д`;
    progress.style.setProperty('--progress', percent);
    progress.classList.toggle('is-reached', normalized >= 16);
    progress.setAttribute('aria-valuenow', String(normalized));
    progress.setAttribute(
      'aria-label',
      `Заполняемость ${formatOne(normalized)} ч/д, ${roundedPercent}% от ориентира 18 ч/д`
    );
  }

  function renderReturnRate(rr) {
    const value = Number(rr.percent) || 0;
    $('rr-value').textContent = `${formatOne(value)}%`;
  }

  function renderQuality(quality) {
    const value = Math.max(0, Math.min(100, Number(quality.value) || 0));
    const progress = $('ovn-progress');
    $('ovn-value').textContent = `${value}%`;
    $('ovn-sub').textContent = quality.total ? `${quality.passed} из ${quality.total} проверок` : 'Нет проверок';
    progress.style.setProperty('--progress', value);
    progress.classList.toggle('is-reached', value >= 80);
    progress.setAttribute('aria-valuenow', String(value));
    progress.setAttribute('aria-label', `Качество сервиса ОВН ${value}%`);
  }

  function renderFines(fines, weeklyCount) {
    $('week-violations').textContent = String(weeklyCount || 0);
    $('fines-value').textContent = money((fines && fines.monthFines) || 0);
    $('period-label').textContent = periodLabel();
  }

  function renderSchedule(schedule, master, errorMessage) {
    const list = $('schedule-list');
    if (!list) return;

    if (errorMessage) {
      list.innerHTML = `
        <div class="schedule-message error">
          <strong>График недоступен</strong>
          <span>${escapeHtml(errorMessage)}</span>
        </div>
      `;
      return;
    }

    const start = dayjs().startOf('day');
    const rusDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const rows = [];

    for (let index = 0; index < 7; index += 1) {
      const date = start.add(index, 'day');
      const dateKey = date.format('YYYY-MM-DD');
      const matches = [];

      (schedule || []).forEach(entry => {
        if (!entry || entry.date !== dateKey || !Array.isArray(entry.masters)) return;
        entry.masters.forEach(item => {
          if (item && sameMaster(master, item.name)) {
            matches.push({ item, location: String(entry.location || '').trim() });
          }
        });
      });

      let tone = 'off';
      let shift = 'Выходной';
      let location = '';
      let note = index === 0 ? 'Сегодня' : rusDays[date.day()];

      if (matches.length > 1) {
        tone = 'error';
        shift = 'Две смены';
        location = 'Проверьте график у менеджера';
      } else if (matches.length === 1) {
        const match = matches[0];
        const raw = String(match.item.text || '').trim();
        if (raw && !isScheduleOffDay(raw)) {
          tone = 'work';
          shift = formatScheduleShift(raw, match.item.startTime);
          location = match.location;
          if (match.item.isReplacement || /замена/i.test(raw)) note = `${note}, замена`;
        }
      }

      rows.push(`
        <article class="schedule-row ${tone}" data-schedule-date="${dateKey}">
          <div class="schedule-date">
            <strong>${date.format('DD')}</strong>
            <span>${escapeHtml(note)}</span>
          </div>
          <div class="schedule-shift">
            <strong>${escapeHtml(shift)}</strong>
            ${location ? `<span>${escapeHtml(location)}</span>` : '<span>Нет смены</span>'}
          </div>
        </article>
      `);
    }

    $('schedule-period').textContent = `${start.format('DD.MM')} - ${start.add(6, 'day').format('DD.MM')}`;
    list.innerHTML = rows.join('');
  }

  function isScheduleOffDay(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === 'выходной' || normalized === 'вых' || normalized === 'ыходной';
  }

  function formatScheduleShift(text, startTime) {
    const normalized = String(text || '').replace(/\s*\(ЗАМЕНА\)\s*/ig, '').trim();
    const match = normalized.match(/(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:до|-)\s*(\d{1,2})(?::(\d{2}))?/i);
    if (match) {
      const from = `${match[1].padStart(2, '0')}:${match[2] || '00'}`;
      const to = `${match[3].padStart(2, '0')}:${match[4] || '00'}`;
      return `${from} - ${to}`;
    }
    if (startTime) return `${String(startTime).slice(0, 5)} - смена`;
    return normalized || 'Рабочая смена';
  }

  function renderSalaryBars(payload) {
    const box = document.querySelector('.money-wave');
    if (!box) return;

    if (!payload) {
      box.classList.add('is-data-bars');
      box.innerHTML = `
        <div class="salary-bar-item">
          <span class="salary-bar-fill" style="height:10%"></span>
          <small>нет данных</small>
        </div>
      `;
      return;
    }

    const revenue = Math.max(0, Number(payload.revenue) || 0);
    const earnings = Math.max(0, Number(payload.earnings) || 0);
    const fines = Math.max(0, Number(payload.fines) || 0);
    const max = Math.max(1, revenue, earnings, fines);
    const items = [
      { label: 'выручка', value: revenue, tone: 'accent' },
      { label: 'к выплате', value: earnings, tone: 'success' },
      { label: 'штрафы', value: fines, tone: 'warn' }
    ];

    box.classList.add('is-data-bars');
    box.innerHTML = items.map((item, index) => {
      const h = Math.max(item.value > 0 ? 8 : 3, (item.value / max) * 100);
      return `
        <div class="salary-bar-item ${item.tone}" title="${item.label}: ${money(item.value)}">
          <span class="salary-bar-fill" style="height:${h}%; animation-delay:${index * 70}ms"></span>
          <small>${item.label}</small>
        </div>
      `;
    }).join('');
  }

  function renderJournal(items) {
    if (!items.length) {
      $('violations-list').innerHTML = `
        <div class="empty-state">
          <div>
            <div class="empty-medal">✓</div>
            <strong>Чемпион!</strong>
            <p class="muted">Ни единого нарушения на этой неделе</p>
          </div>
        </div>
      `;
      return;
    }

    $('violations-list').innerHTML = items.map(item => {
      const d = reportDate(item);
      const date = d ? d.format('DD.MM') : 'без даты';
      const violation = escapeHtml(String(item.violation || 'Нарушение'));
      const location = escapeHtml(item.location || 'Филиал');
      const notes = item.notes ? `<p class="muted">${escapeHtml(item.notes)}</p>` : '';
      return `
        <article class="violation-item">
          <div class="violation-meta"><span>${date}</span><span>${location}</span></div>
          <strong>${violation}</strong>
          ${notes}
        </article>
      `;
    }).join('');
  }

  function periodLabel() {
    const period = weekPeriod();
    return `${period.start.format('DD.MM')} - ${period.end.format('DD.MM')}`;
  }

  function formatOne(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: Number.isInteger(num) ? 0 : 1 });
  }

  function cleanRub(text) {
    return String(text || '').replace(/₽|в‚Ѕ/g, '₽').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || '').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(x => x + x).join('') : clean;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function setupInteractions() {
    $('login-btn').addEventListener('click', handleLogin);
    $('password-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') handleLogin();
    });
    $('login-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') handleLogin();
    });
    $('refresh-btn').addEventListener('click', loadDashboard);
    $('bottom-top').addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      setActiveSection('#summary-section');
    });

    document.querySelectorAll('[data-scroll]').forEach(control => {
      control.addEventListener('click', () => {
        const target = control.getAttribute('data-scroll');
        const el = document.querySelector(target);
        if (el) {
          const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82);
          window.scrollTo(0, top);
        }
        setActiveSection(target);
      });
    });

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      if (visible && visible.target.id) setActiveSection(`#${visible.target.id}`);
    }, { rootMargin: '-12% 0px -78% 0px', threshold: 0 });

    ['summary-section', 'quality-section', 'schedule-section', 'violations-section'].forEach(id => {
      const el = $(id);
      if (el) observer.observe(el);
    });
  }

  function setActiveSection(target) {
    state.activeSection = target;
    document.querySelectorAll('.segment, .bottom-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-scroll') === target);
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function init() {
    setupInteractions();
    const user = restoreUser();
    if (!user) {
      showLogin();
      return;
    }
    showApp(user);
    await loadDashboard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
