const fs = require('fs');

const STATE_PATH = '/root/grome-miniapp/comeback_bonus_state.json';

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function loadRows() {
  try {
    if (!fs.existsSync(STATE_PATH)) return [];
    return Object.values(JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) || {});
  } catch (error) { return []; }
}

function handleGet(req, res, parsedUrl) {
  if (req.authUser?.role !== 'owner') {
    return sendJson(res, 403, { error: 'Раздел доступен только собственнику' });
  }
  const params = parsedUrl.searchParams;
  const from = params.get('from') ? new Date(`${params.get('from')}T00:00:00+03:00`).getTime() : 0;
  const to = params.get('to') ? new Date(`${params.get('to')}T23:59:59+03:00`).getTime() : Infinity;
  const status = params.get('status') || '';
  const branch = params.get('branch') || '';
  const master = params.get('master') || '';
  const rows = loadRows()
    .filter(entry => {
      const granted = new Date(entry.grantedAt || 0).getTime();
      if (granted < from || granted > to) return false;
      if (status && entry.status !== status) return false;
      if (branch && ![entry.lastBranch, entry.returnBranch].includes(branch)) return false;
      if (master && ![entry.lastMaster, entry.returnMaster].includes(master)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.grantedAt || 0) - new Date(a.grantedAt || 0));
  const treatmentRows = rows.filter(row => row.experimentGroup !== 'control' && !String(row.status || '').startsWith('control_'));
  const controlRows = rows.filter(row => row.experimentGroup === 'control' || String(row.status || '').startsWith('control_'));
  const granted = treatmentRows.length;
  const returned = treatmentRows.filter(row => row.status === 'kept_after_visit').length;
  const expired = treatmentRows.filter(row => row.status === 'expired').length;
  const active = treatmentRows.filter(row => row.status === 'active').length;
  const revenue = treatmentRows.reduce((sum, row) => sum + Number(row.returnRevenue || 0), 0);
  const conversion = granted ? Math.round(returned / granted * 1000) / 10 : 0;
  const controlTotal = controlRows.length;
  const controlReturned = controlRows.filter(row => row.status === 'control_returned').length;
  const controlConversion = controlTotal ? Math.round(controlReturned / controlTotal * 1000) / 10 : 0;
  const incrementalLiftPp = Math.round((conversion - controlConversion) * 10) / 10;
  sendJson(res, 200, {
    success: true,
    metrics: { granted, returned, expired, active, conversion, revenue, controlTotal, controlReturned, controlConversion, incrementalLiftPp },
    rows,
  });
}

module.exports = { handleGet };
