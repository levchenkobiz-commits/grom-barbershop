// FINANCIAL UI — salary/fines/zones are protected by /root/grom-dashboard/AGENTS.md.
(function() {
  'use strict';

  const state = {
    user: null,
    data: null,
    ovn: [],
    // Service metrics must never infer their set from the mixed OVN/fines
    // stream.  This is supplied by the server's authoritative video_only
    // classification; the complete stream remains necessary for fines.
    ovnChecks: [],
    schedule: [],
    scheduleStart: dayjs().startOf('isoWeek'),
    loading: false,
    preview: false,
  };

  const $ = id => document.getElementById(id);
  const money = value => `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;
  const DATA_REFRESH_INTERVAL_MS = 60 * 1000;
  let dataRefreshSequence = 0;
  let dataRefreshTimer = null;

  function previewMasterFromUrl() {
    return String(new URLSearchParams(window.location.search).get('master') || '').trim();
  }

  function previewQuery() {
    const master = state.preview && state.user && state.user.name;
    return master ? `master=${encodeURIComponent(master)}&` : '';
  }

  function restoreUser() {
    try {
      const raw = localStorage.getItem('grome_user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      const key = user && (user.key || user.tg_id || user.id || localStorage.getItem('tg_id'));
      if (!key) return null;
      const requestedMaster = previewMasterFromUrl();
      if (requestedMaster && ['owner', 'manager'].includes(user.role)) {
        return { ...user, key: String(key), name: requestedMaster, role: 'master', preview: true };
      }
      if (user.role !== 'master') return null;
      user.key = String(key);
      localStorage.setItem('grome_user', JSON.stringify(user));
      return user;
    } catch (error) {
      localStorage.removeItem('grome_user');
      return null;
    }
  }

  function moveLanguageSwitcher(target) {
    const switcher = document.getElementById('grome-language-switcher');
    if (!switcher) return;
    if (target === 'app' && $('language-slot')) $('language-slot').appendChild(switcher);
    else document.body.appendChild(switcher);
  }

  function goToUnifiedLogin() {
    window.location.replace('/');
  }

  function showApp(user) {
    state.user = user;
    state.preview = user.preview === true;
    window.USER = user;
    window.CURRENT_MASTER = user.name || '';
    if (window.I18N) window.I18N.setUser(user.key);
    $('app-view').hidden = false;
    $('master-name').textContent = user.name || 'Кабинет мастера';
    const previewBack = $('preview-back-btn');
    if (previewBack) previewBack.hidden = !state.preview;
    const salaryCard = $('salary-card');
    if (salaryCard) salaryCard.hidden = state.preview;
    moveLanguageSwitcher('app');
  }

  function handleLogout() {
    if (state.preview) {
      window.location.replace('/#manager');
      return;
    }
    localStorage.removeItem('grome_user');
    localStorage.removeItem('tg_id');
    goToUnifiedLogin();
  }

  function clearSensitiveView() {
    state.data = null;
    state.ovn = [];
    state.ovnChecks = [];
    state.schedule = [];
    $('master-name').textContent = 'Кабинет мастера';
    $('last-updated').textContent = 'Обновляю данные';
    $('zone-label').textContent = 'Загрузка';
    $('salary-value').textContent = 'Считаю...';
    $('salary-sub').textContent = 'По завершённым дням';
    $('occupancy-value').textContent = '0 ч/д';
    $('ovn-value').textContent = '0%';
    $('ovn-sub').textContent = 'Текущий календарный месяц';
    $('rr-value').textContent = '0%';
    $('online-value').textContent = '0%';
    $('punctuality-value').textContent = 'Нет данных';
    $('week-violations').textContent = '0';
    $('fines-value').textContent = '0 ₽';
    ['occupancy-progress', 'ovn-progress', 'online-progress', 'punctuality-progress'].forEach(id => {
      const progress = $(id);
      progress.style.setProperty('--progress', 0);
      progress.classList.remove('is-reached');
      progress.setAttribute('aria-valuenow', '0');
    });
    $('schedule-period').textContent = '7 дней';
    $('schedule-list').replaceChildren();
    $('period-label').textContent = 'неделя';
    $('violations-list').replaceChildren();
    $('master-week-salary').textContent = '';
    $('master-week-salary-sub').textContent = '';
  }

  async function json(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error((payload && payload.error) || `Ошибка сервера ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function canonicalName(name) {
    return typeof window.getAdapterMasterCanonical === 'function'
      ? (window.getAdapterMasterCanonical(name) || '')
      : '';
  }

  function sameMaster(left, right) {
    const a = canonicalName(left).toLowerCase();
    const b = canonicalName(right).toLowerCase();
    return !!a && !!b && a === b;
  }

  function currentCalendarMonthPeriod() {
    const now = dayjs();
    return { start: now.startOf('month'), end: now };
  }

  // Сумма штрафов в сводке должна совпадать с недельной зарплатной
  // детализацией: текущая календарная неделя, с понедельника по сейчас.
  function currentCalendarWeekPeriod() {
    const now = dayjs();
    return { start: now.startOf('isoWeek'), end: now };
  }

  function monthLabel(date) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const value = date || dayjs();
    return `${months[value.month()]} ${value.year()}`;
  }

  function reportDate(report) {
    const value = dayjs(report && (report.date || report.createdAt));
    return value.isValid() ? value : null;
  }

  function isViolation(report) {
    const text = String((report && report.violation) || '').toLowerCase();
    if (!text || text.includes('замечаний нет') || text.includes('✅')) return false;
    if (typeof window.isZoneExcludedViolation === 'function' ? window.isZoneExcludedViolation(text) : (text.includes('опоздал') || text.includes('отказ клиенту'))) return false;
    if (report && report.isManualFine) return false;
    return true;
  }

  function currentMonthViolations(reports) {
    const period = currentCalendarMonthPeriod();
    return (reports || [])
      .filter(isViolation)
      .filter(report => {
        const date = reportDate(report);
        return date && !date.isBefore(period.start, 'day') && !date.isAfter(period.end, 'day');
      })
      .sort((a, b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
  }

  function getPersonalMetric(metric) {
    if (!metric) return null;
    if (Object.prototype.hasOwnProperty.call(metric, 'personalValue')) return metric.personalValue;
    const row = metric.drilldown && metric.drilldown[0] && metric.drilldown[0].masters && metric.drilldown[0].masters[0];
    return row ? row.v : null;
  }

  function numericValue(value) {
    const match = String(value == null ? '' : value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function formatOne(value) {
    return (Number(value) || 0).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function parseSourceUpdatedAt(value) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s+(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const [, hours, minutes, day, month, year] = match;
    const parsed = dayjs(`${year}-${month}-${day} ${hours.padStart(2, '0')}:${minutes}`, 'YYYY-MM-DD HH:mm', true);
    return parsed.isValid() ? parsed : null;
  }

  function cleanRub(value) {
    return String(value || '').replace(/\s*₽\s*₽/g, ' ₽').trim();
  }

  function setLoading(loading) {
    state.loading = loading;
    $('schedule-apply').disabled = loading;
  }

  function renderLastUpdated() {
    const sourceTime = parseSourceUpdatedAt(state.data && state.data.lastUpdate) || dayjs(state.data && state.data.lastUpdate);
    const updated = sourceTime.isValid() ? sourceTime : dayjs();
    $('last-updated').textContent = `Обновлено: ${updated.format('HH:mm DD.MM.YYYY')}`;
  }

  // Only dashboard metrics are refreshed here: salary, fines and schedule have
  // their own controlled refresh paths.  A request sequence prevents an older
  // response from replacing newer OVN-derived data after a slow connection.
  async function refreshDataMetrics() {
    if (!state.user || state.loading || document.hidden) return;
    const sequence = ++dataRefreshSequence;
    try {
      const freshData = await json(`/api/data?${previewQuery()}v=${Date.now()}`, { cache: 'no-store' });
      if (sequence !== dataRefreshSequence || !state.user) return;
      state.data = freshData || {};
      renderDataMetrics();
      renderLastUpdated();
      if (window.I18N) window.I18N.translate($('punctuality-card'));
    } catch (_) {
      // Keep the last verified value visible. The initial load has the full
      // error state; a transient background refresh must not erase it.
    }
  }

  async function loadDashboard() {
    if (state.loading) return;
    setLoading(true);

    try {
      if (window.HANDBOOK_READY) await window.HANDBOOK_READY;
      const stamp = Date.now();
      const results = await Promise.allSettled([
        json(`/api/data?${previewQuery()}v=${stamp}`),
        json(`/api/ovn?${previewQuery()}v=${stamp}`),
        json(`/api/ovn?${previewQuery()}video_only=1&v=${stamp}`),
        json(`/api/schedule?${previewQuery()}v=${stamp}`),
      ]);

      if (results[0].status === 'rejected') throw results[0].reason;
      state.data = results[0].value || {};
      state.ovn = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
      state.ovnChecks = results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [];
      state.schedule = results[3].status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [];

      renderAll();
      if (!state.preview) await renderSalary();
      renderLastUpdated();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('grome_user');
        goToUnifiedLogin();
        return;
      }
      renderError(error);
    } finally {
      setLoading(false);
    }
  }

  function renderAll() {
    const master = (state.user && state.user.name) || '';
    const ownReports = state.ovn.filter(report => sameMaster(master, report.barber));
    const ownOvnChecks = state.ovnChecks.filter(report => sameMaster(master, report.barber));
    const violations = currentMonthViolations(ownOvnChecks);
    const fines = getFines(master, ownReports);

    renderZone(fines.state || 'Green');
    renderDataMetrics();
    renderQuality(ownOvnChecks);
    renderFines(fines, violations.length);
    renderSchedule();
    renderJournal(violations);
    if (window.I18N) window.I18N.translate(document);
  }

  function renderDataMetrics() {
    const occupancy = getPersonalMetric(state.data && state.data.occupancy);
    const returnRate = getPersonalMetric(state.data && state.data.returnRate);
    const appointments = getPersonalMetric(state.data && state.data.appointments);
    renderOccupancy(occupancy == null || occupancy === '' ? null : numericValue(occupancy));
    renderReturnRate(returnRate == null || returnRate === '' ? null : numericValue(returnRate));
    renderOnline(appointments == null || appointments === '' ? null : numericValue(appointments));
    renderPunctuality(state.data && state.data.punctualityRate);
  }

  function getFines(master, reports) {
    const fallback = { state: 'Green', monthFines: 0 };
    if (typeof window.calculateFines !== 'function') return fallback;
    const period = currentCalendarWeekPeriod();
    const calculated = window.calculateFines(reports || [], {
      start: period.start.format('YYYY-MM-DD'),
      end: period.end.format('YYYY-MM-DD'),
    });
    return calculated[canonicalName(master)] || calculated[master] || fallback;
  }

  function renderZone(zoneName) {
    const zones = {
      Green: { label: 'Зелёная', color: '#41d672' },
      Yellow: { label: 'Жёлтая', color: '#ffbf3d' },
      Red: { label: 'Красная', color: '#ff5a4f' },
    };
    const zone = zones[zoneName] || zones.Green;
    $('zone-card').style.setProperty('--zone-color', zone.color);
    $('zone-card').style.setProperty('--zone-progress', 100);
    $('zone-dot').style.background = zone.color;
    $('zone-dot').style.boxShadow = `0 0 0 8px ${hexToRgba(zone.color, .15)}`;
    $('zone-label').textContent = zone.label;
  }

  function renderOccupancy(value) {
    if (value == null) {
      $('occupancy-value').textContent = 'Нет данных';
      $('occupancy-progress').style.setProperty('--progress', 0);
      $('occupancy-progress').classList.remove('is-reached');
      $('occupancy-progress').setAttribute('aria-valuenow', '0');
      return;
    }
    const normalized = Math.max(0, Number(value) || 0);
    const progressValue = Math.min(100, (normalized / 18) * 100);
    const progress = $('occupancy-progress');
    $('occupancy-value').textContent = `${formatOne(normalized)} ч/д`;
    progress.style.setProperty('--progress', progressValue);
    progress.classList.toggle('is-reached', normalized >= 16);
    progress.setAttribute('aria-valuenow', String(normalized));
    progress.setAttribute('aria-label', `Заполняемость смены ${formatOne(normalized)} ч/д`);
  }

  function renderReturnRate(value) {
    $('rr-value').textContent = value == null || value === '' ? 'Нет данных' : `${formatOne(value)}%`;
  }

  function renderOnline(value) {
    if (value == null) {
      $('online-value').textContent = 'Нет данных';
      $('online-progress').style.setProperty('--progress', 0);
      $('online-progress').classList.remove('is-reached');
      $('online-progress').setAttribute('aria-valuenow', '0');
      return;
    }
    const normalized = Math.max(0, Math.min(100, Number(value) || 0));
    const progress = $('online-progress');
    $('online-value').textContent = `${formatOne(normalized).replace(',0', '')}%`;
    progress.style.setProperty('--progress', normalized);
    progress.classList.toggle('is-reached', normalized >= 30);
    progress.setAttribute('aria-valuenow', String(normalized));
    progress.setAttribute('aria-label', `Онлайн-запись ${formatOne(normalized).replace(',0', '')}%`);
  }

  // The browser deliberately does not calculate this value.  The API returns
  // the inverse of the canonical OVN lateness metric with its exact counts.
  function renderPunctuality(metric) {
    const personal = metric && metric.personal;
    const value = Number(personal && personal.value);
    const total = Number(personal && personal.total);
    const late = Number(personal && personal.late);
    const valid = personal && personal.noData !== true
      && Number.isFinite(value) && value >= 0 && value <= 100
      && Number.isFinite(total) && total > 0
      && Number.isFinite(late) && late >= 0 && late <= total;
    const progress = $('punctuality-progress');
    if (!valid) {
      $('punctuality-value').textContent = window.I18N ? window.I18N.t('Нет данных') : 'Нет данных';
      progress.style.setProperty('--progress', 0);
      progress.classList.remove('is-reached');
      progress.setAttribute('aria-valuenow', '0');
      progress.setAttribute('aria-valuetext', window.I18N ? window.I18N.t('Нет данных') : 'Нет данных');
      return;
    }
    const normalized = Number(value.toFixed(1));
    $('punctuality-value').textContent = `${formatOne(normalized)}%`;
    progress.style.setProperty('--progress', normalized);
    progress.classList.toggle('is-reached', normalized >= 85);
    progress.setAttribute('aria-valuenow', String(normalized));
    progress.setAttribute('aria-valuetext', `${formatOne(normalized)}%`);
    progress.setAttribute('aria-label', `Без опозданий ${formatOne(normalized)}%`);
  }

  function renderQuality(reports) {
    const period = currentCalendarMonthPeriod();
    const monthly = (reports || []).filter(report => {
      const date = reportDate(report);
      return date && !date.isBefore(period.start, 'day') && !date.isAfter(period.end, 'day');
    });
    const passed = monthly.filter(report => {
      const text = String(report.violation || '').toLowerCase();
      return !text || text.includes('замечаний нет') || text.includes('✅');
    }).length;
    const value = monthly.length ? Math.round((passed / monthly.length) * 100) : 0;
    const progress = $('ovn-progress');
    $('ovn-value').textContent = `${value}%`;
    $('ovn-sub').textContent = monthly.length
      ? `${monthLabel()} · ${passed} из ${monthly.length} проверок`
      : `${monthLabel()} · нет проверок`;
    progress.style.setProperty('--progress', value);
    progress.classList.toggle('is-reached', value >= 80);
    progress.setAttribute('aria-valuenow', String(value));
    progress.setAttribute('aria-label', `Качество сервиса ОВН ${value}%`);
  }

  function renderFines(fines, violationCount) {
    $('week-violations').textContent = String(violationCount || 0);
    $('fines-value').textContent = money(fines.monthFines || 0);
    const period = currentCalendarMonthPeriod();
    $('period-label').textContent = monthLabel(period.start);
  }

  async function renderSalary() {
    if (typeof window.updateMasterWeeklySalary !== 'function') {
      $('salary-value').textContent = 'Нет данных';
      $('salary-sub').textContent = 'Расчёт недоступен';
      return;
    }
    try {
      window.CURRENT_MASTER = state.user.name || '';
      const payload = await window.updateMasterWeeklySalary({ preferCache: true });
      const value = payload && payload.valueText ? payload.valueText : $('master-week-salary').textContent;
      const sub = payload && payload.subText ? payload.subText : $('master-week-salary-sub').textContent;
      $('salary-value').textContent = cleanRub(value || '0 ₽');
      $('salary-sub').textContent = cleanRub(sub || 'По завершённым дням');
      renderSalaryDetails(payload);
    } catch (error) {
      $('salary-value').textContent = 'Нет данных';
      $('salary-sub').textContent = 'Не удалось обновить расчёт';
      renderSalaryDetails(null);
    }
  }

  // ── Детализация ЗП по дням (раскрывается по клику) ──
  function renderSalaryDetails(payload) {
    const toggle = $('salary-details-toggle');
    const details = $('salary-details');
    if (!toggle || !details) return;

    const days = payload && Array.isArray(payload.days) ? payload.days : [];
    if (!days.length) {
      toggle.hidden = true;
      details.hidden = true;
      details.innerHTML = '';
      return;
    }

    // Сводка: выручка, выход, процент, штрафы, переработка, замена
    const p = payload || {};
    const summaryHtml = `
      <div class="salary-summary">
        <div class="salary-summary-cell"><span class="lbl">Смен</span><span class="val">${p.shiftsCount || days.length}</span></div>
        <div class="salary-summary-cell"><span class="lbl">Часов</span><span class="val">${Math.round(p.hours || 0)}</span></div>
        <div class="salary-summary-cell"><span class="lbl">Выручка</span><span class="val">${(p.revenue || 0).toLocaleString('ru-RU')} ₽</span></div>
        <div class="salary-summary-cell"><span class="lbl">Выход</span><span class="val">${(p.basePay || 0).toLocaleString('ru-RU')} ₽</span></div>
        <div class="salary-summary-cell"><span class="lbl">Процент ${p.usePercent ? '✓' : ''}</span><span class="val">${(p.percentPay || 0).toLocaleString('ru-RU')} ₽</span></div>
        <div class="salary-summary-cell"><span class="lbl">Штрафы</span><span class="val ${p.fines ? 'neg' : ''}">-${(p.fines || 0).toLocaleString('ru-RU')} ₽</span></div>
        ${(p.overtime || 0) > 0 ? `<div class="salary-summary-cell"><span class="lbl">Переработка</span><span class="val">+${(p.overtime || 0).toLocaleString('ru-RU')} ₽</span></div>` : ''}
        ${(p.replacementBonus || 0) > 0 ? `<div class="salary-summary-cell"><span class="lbl">Замена</span><span class="val">+${(p.replacementBonus || 0).toLocaleString('ru-RU')} ₽</span></div>` : ''}
        <div class="salary-summary-cell"><span class="lbl">Зона · основание</span><span class="val" style="color:${p.fineZone === 'Red' ? '#ff5a4f' : (p.fineZone === 'Yellow' ? '#ff9f0a' : '#41d672')}">${p.fineZone === 'Red' ? '🔴 Красная' : (p.fineZone === 'Yellow' ? '🟡 Жёлтая' : '🟢 Зелёная')} · ${Number(p.fineZoneBasisViolations) || 0}</span></div>
      </div>`;

    const daysHtml = days.map(day => {
      const typeTag = day.type === 'percent'
        ? '<span class="salary-day-tag tag-percent">процент</span>'
        : '<span class="salary-day-tag tag-base">выход</span>';
      const repTag = day.isReplacement
        ? '<span class="salary-day-tag tag-replacement">замена</span>'
        : '';
      const notes = [];
      if (day.hours > 12) notes.push(`переработка +${Math.round(day.hours - 12)}ч`);
      if (day.isReplacement) notes.push(`+${day.replacement}₽ за салон`);
      const noteHtml = notes.length ? `<span class="salary-day-note">${notes.join(' · ')}</span>` : '';
      // Штрафы за день (только если есть)
      const fineHtml = (day.fines && day.fines > 0)
        ? `<span class="salary-day-note" style="color:#ff5a4f">штраф -${day.fines.toLocaleString('ru-RU')}₽${day.fineDetails ? ': ' + day.fineDetails.map(f => f.violation).join(', ') : ''}</span>`
        : '';
      return `
        <div class="salary-day">
          <div class="salary-day-date">
            <b>${day.dateLabel}</b>
            ${day.weekday}
          </div>
          <div class="salary-day-meta">
            ${typeTag}${repTag}
            <b>${day.revenue.toLocaleString('ru-RU')} ₽</b> выручка
            <br>${Math.round(day.hours)}ч · вых. ${day.basePay.toLocaleString('ru-RU')}₽ · % ${day.percentPay.toLocaleString('ru-RU')}₽
            ${noteHtml}
            ${fineHtml}
          </div>
          <div class="salary-day-amount">${day.amount.toLocaleString('ru-RU')} ₽</div>
        </div>`;
    }).join('');

    // Итог считается по общему недельному принципу: max(недельный_выход, недельный_процент)
    // + overtime + замена - штрафы. Это НЕ сумма по дням (дни показывают по-дневной max).
    const earnings = Math.round(p.earnings || 0);
    const daysSum = days.reduce((s, d) => s + (d.amount || 0), 0);
    const noteMismatch = Math.abs(daysSum - earnings) > 1
      ? `<div class="salary-total-note">Сумма по дням (${daysSum.toLocaleString('ru-RU')} ₽) может отличаться от итога: зарплата за неделю считается по бо́льшему из недельных показателей — выход ${Math.round(p.basePay||0).toLocaleString('ru-RU')} ₽ или процент ${Math.round(p.percentPay||0).toLocaleString('ru-RU')} ₽.</div>`
      : '';

    const totalHtml = `
      <div class="salary-total-row">
        <span class="label">Итого к выплате</span>
        <span class="value">${earnings.toLocaleString('ru-RU')} ₽</span>
      </div>
      ${noteMismatch}`;

    details.innerHTML = summaryHtml + daysHtml + totalHtml;
    details.hidden = false;
    toggle.hidden = false;
  }

  function toggleSalaryDetails() {
    const toggle = $('salary-details-toggle');
    const details = $('salary-details');
    if (!toggle || !details || toggle.hidden) return;
    const isOpen = details.classList.toggle('is-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.querySelector('.toggle-label').textContent = isOpen ? 'Скрыть детализацию' : 'Детализация по дням';
  }

  function renderSchedule() {
    const list = $('schedule-list');
    const start = state.scheduleStart.startOf('day');
    const rows = [];
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    for (let index = 0; index < 7; index += 1) {
      const date = start.add(index, 'day');
      const key = date.format('YYYY-MM-DD');
      const matches = [];

      state.schedule.forEach(entry => {
        if (!entry || entry.date !== key || !Array.isArray(entry.masters)) return;
        entry.masters.forEach(item => {
          if (!item || !sameMaster(state.user.name, item.name)) return;
          matches.push({ item, location: entry.location || item.location || '' });
        });
      });

      let tone = 'off';
      let shift = 'Выходной';
      let location = '';
      if (matches.length > 1) {
        tone = 'error';
        shift = 'Конфликт смен';
        location = matches.map(match => match.location).filter(Boolean).join(', ');
      } else if (matches.length === 1) {
        const match = matches[0];
        const raw = String(match.item.text || '').trim();
        if (!isOffDay(raw)) {
          tone = 'work';
          shift = formatShift(raw, match.item.start_time);
          location = match.location;
          if (/замена/i.test(raw)) tone = 'replacement';
        }
      }

      rows.push(`
        <article class="schedule-row ${tone}">
          <div class="schedule-date"><span>${days[date.day()]}</span><strong>${date.format('DD.MM')}</strong></div>
          <div class="schedule-shift"><strong>${escapeHtml(shift)}</strong>${location ? `<span>${escapeHtml(location)}</span>` : ''}</div>
        </article>`);
    }

    $('schedule-period').textContent = `${start.format('DD.MM')} - ${start.add(6, 'day').format('DD.MM')}`;
    list.innerHTML = rows.join('');
  }

  function isOffDay(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return !normalized || normalized === 'выходной' || normalized === 'вых' || normalized === 'ыходной';
  }

  function formatShift(text, startTime) {
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

  function renderJournal(items) {
    const list = $('violations-list');
    if (!items.length) {
      list.innerHTML = '<div class="empty-journal"><strong>Нарушений нет</strong><p class="muted">За текущую неделю замечаний не найдено</p></div>';
      return;
    }
    list.innerHTML = items.map(item => {
      const date = reportDate(item);
      const notes = item.notes ? `<p class="muted">${escapeHtml(item.notes)}</p>` : '';
      return `
        <article class="violation-item">
          <div class="violation-meta"><span>${date ? date.format('DD.MM') : 'без даты'}</span><span>${escapeHtml(item.location || 'Филиал')}</span></div>
          <strong>${escapeHtml(String(item.violation || 'Нарушение'))}</strong>
          ${notes}
        </article>`;
    }).join('');
  }

  function renderError(error) {
    $('last-updated').textContent = 'Не удалось обновить данные';
    $('violations-list').innerHTML = `<div class="empty-journal"><strong>Ошибка загрузки</strong><p class="muted">${escapeHtml(error.message || 'Попробуйте обновить страницу')}</p></div>`;
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
    const value = String(hex).replace('#', '');
    const number = parseInt(value, 16);
    return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
  }

  function setupNavigation() {
    const buttons = Array.from(document.querySelectorAll('.bottom-item[data-scroll]'));
    const sections = buttons
      .map(button => document.querySelector(button.dataset.scroll))
      .filter(Boolean);

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const target = document.querySelector(button.dataset.scroll);
        if (!target) return;
        buttons.forEach(item => item.classList.toggle('active', item === button));
        const top = target.getBoundingClientRect().top + window.scrollY - 18;
        window.scrollTo({ top, behavior: 'auto' });
      });
    });

    $('bottom-top').addEventListener('click', () => {
      buttons.forEach((button, index) => button.classList.toggle('active', index === 0));
      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        buttons.forEach(button => button.classList.toggle('active', button.dataset.scroll === `#${visible.target.id}`));
      }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, .2, .5] });
      sections.forEach(section => observer.observe(section));
    }
  }

  function setupEvents() {
    $('logout-btn').addEventListener('click', handleLogout);
    $('preview-back-btn')?.addEventListener('click', handleLogout);
    const salaryToggle = $('salary-details-toggle');
    if (salaryToggle) salaryToggle.addEventListener('click', toggleSalaryDetails);
    $('schedule-apply').addEventListener('click', () => {
      const value = dayjs($('schedule-start').value);
      if (!value.isValid()) return;
      state.scheduleStart = value.startOf('day');
      renderSchedule();
      if (window.I18N) window.I18N.translate($('schedule-section'));
    });
    document.addEventListener('grome:languagechange', () => {
      if (state.user) {
        moveLanguageSwitcher('app');
        renderPunctuality(state.data && state.data.punctualityRate);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshDataMetrics();
    });
    window.addEventListener('focus', refreshDataMetrics);
    window.addEventListener('pagehide', () => {
      if (dataRefreshTimer) window.clearInterval(dataRefreshTimer);
    }, { once: true });
    dataRefreshTimer = window.setInterval(refreshDataMetrics, DATA_REFRESH_INTERVAL_MS);
    setupNavigation();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = restoreUser();
    if (!user) return goToUnifiedLogin();
    setupEvents();
    $('schedule-start').value = state.scheduleStart.format('YYYY-MM-DD');
    showApp(user);
    await loadDashboard();
    requestAnimationFrame(() => moveLanguageSwitcher('app'));
  });
})();
