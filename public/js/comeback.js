(function() {
  'use strict';
  const STATUS = { active: ['Ожидаем', '#FFCC00'], kept_after_visit: ['Вернулся', '#34C759'], expired: ['Истёк', '#FF3B30'], control_active: ['Контроль: ожидаем', '#8E8E93'], control_returned: ['Контроль: вернулся', '#64D2FF'], control_expired: ['Контроль: не вернулся', '#8E8E93'] };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const date = value => value ? new Date(value).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) : '—';
  const money = value => `${Number(value || 0).toLocaleString('ru-RU')}₽`;
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  function fillOptions(id, values, current) {
    const el = document.getElementById(id); if (!el) return;
    const label = id.includes('branch') ? 'Все филиалы' : 'Все мастера';
    el.innerHTML = `<option value="">${label}</option>` + values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
    el.value = current || '';
  }

  window.loadComeback = async function() {
    const from = document.getElementById('comeback-from')?.value || '';
    const to = document.getElementById('comeback-to')?.value || '';
    const status = document.getElementById('comeback-status')?.value || '';
    const branch = document.getElementById('comeback-branch')?.value || '';
    const master = document.getElementById('comeback-master')?.value || '';
    const params = new URLSearchParams({ from, to, status, branch, master });
    try {
      const response = await fetch(`/api/comeback?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить данные');
      const metrics = data.metrics || {};
      set('comeback-granted', metrics.granted || 0);
      set('comeback-returned', metrics.returned || 0);
      set('comeback-conversion', `${metrics.conversion || 0}%`);
      set('comeback-progress', `${metrics.active || 0} / ${metrics.expired || 0}`);
      set('comeback-revenue', money(metrics.revenue));
      set('comeback-control', `${metrics.controlConversion || 0}%`);
      set('comeback-control-subtext', `${metrics.controlTotal || 0} клиентов`);
      set('comeback-lift', `${Number(metrics.incrementalLiftPp || 0) >= 0 ? '+' : ''}${metrics.incrementalLiftPp || 0} п.п.`);
      const rows = data.rows || [];
      fillOptions('comeback-branch', [...new Set(rows.flatMap(row => [row.lastBranch, row.returnBranch]).filter(Boolean))].sort(), branch);
      fillOptions('comeback-master', [...new Set(rows.flatMap(row => [row.lastMaster, row.returnMaster]).filter(Boolean))].sort(), master);
      const body = document.getElementById('comeback-body');
      const empty = document.getElementById('comeback-empty');
      if (!rows.length) {
        body.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';
      body.innerHTML = rows.map(row => {
        const state = STATUS[row.status] || [row.status || '—', '#999'];
        return `<tr>
          <td data-label="ТЕЛЕФОН">${esc(row.phone || '—')}</td>
          <td data-label="ПРИОРИТЕТ">${row.predictionPriorityScore == null ? '—' : `${Math.round(Number(row.predictionPriorityScore))}/100`}</td>
          <td data-label="НАЧИСЛЕНО">${date(row.grantedAt)}</td>
          <td data-label="СРОК">${date(row.expiresAt)}</td>
          <td data-label="СТАТУС"><span class="comeback-status" style="color:${state[1]}">${state[0]}</span></td>
          <td data-label="ФИЛИАЛ">${esc(row.returnBranch || row.lastBranch || '—')}</td>
          <td data-label="МАСТЕР">${esc(row.returnMaster || row.lastMaster || '—')}</td>
          <td data-label="ВОЗВРАТ">${date(row.returnedAt)}</td>
          <td data-label="ВЫРУЧКА">${row.returnedAt ? money(row.returnRevenue) : '—'}</td>
        </tr>`;
      }).join('');
    } catch (error) {
      console.error('[Comeback]', error);
      window.showToast?.(error.message, 'error');
    }
  };

  function init() {
    const to = document.getElementById('comeback-to'); if (!to) return;
    const now = new Date(); const from = new Date(now.getTime() - 90 * 86400000);
    to.value = now.toISOString().slice(0, 10);
    document.getElementById('comeback-from').value = from.toISOString().slice(0, 10);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
