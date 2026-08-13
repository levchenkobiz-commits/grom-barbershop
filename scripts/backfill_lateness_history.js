'use strict';
const fs = require('fs');
const path = require('path');
const { calculateLatenessMetric } = require('../routes/lateness_metric');

const root = path.join(__dirname, '..');
const historyPath = process.env.GROME_HISTORY_PATH || path.join(root, 'analytics_history.json');
const reportsPath = process.env.GROME_OVN_REPORTS_PATH || path.join(root, 'ovn_reports.json');
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
const monthNames = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
history.metrics.latenessRate = { title: 'Процент опозданий', months: history.months.map(key => {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${key}-${String(lastDay).padStart(2, '0')}`;
  const metric = calculateLatenessMetric(reports, `${key}-01`, end);
  return {
    key,
    label: `${monthNames[month - 1]} ${year}`,
    ...metric,
    period: `01.${String(month).padStart(2, '0')}–${String(lastDay).padStart(2, '0')}.${String(month).padStart(2, '0')}`,
    cardValue: metric.noData ? 'нет данных' : `${metric.value}%`,
    cardDetail: metric.noData ? 'Проверки прихода отсутствуют' : `${metric.late} из ${metric.total} проверок с опозданием`,
    source: 'ovn_reports.json: time vs schedTime',
  };
}) };
history.generatedAt = new Date().toISOString();
const temp = `${historyPath}.tmp-${process.pid}`;
fs.writeFileSync(temp, JSON.stringify(history, null, 2));
fs.renameSync(temp, historyPath);
console.log(`[lateness-history] updated ${history.metrics.latenessRate.months.length} months`);
