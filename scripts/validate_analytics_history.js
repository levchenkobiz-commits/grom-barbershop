const fs = require('fs');
const path = require('path');

const historyPath = process.env.GROME_HISTORY_PATH || path.join(__dirname, '..', 'analytics_history.json');
const requiredMetrics = ['returnRate', 'cycle', 'appointments', 'occupancy', 'ovnQuality', 'latenessRate'];
const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
const problems = [];

if (!Array.isArray(history.months) || history.months.length !== 12) {
    problems.push(`ожидалось 12 месяцев, получено ${history.months?.length ?? 0}`);
}
if (new Set(history.months || []).size !== (history.months || []).length) {
    problems.push('список месяцев содержит дубликаты');
}

for (const key of requiredMetrics) {
    const months = history.metrics?.[key]?.months;
    if (!Array.isArray(months) || months.length !== 12) {
        problems.push(`${key}: ожидалось 12 значений, получено ${months?.length ?? 0}`);
        continue;
    }
    const keys = months.map(item => item.key);
    if (keys.join(',') !== history.months.join(',')) {
        problems.push(`${key}: месяцы не совпадают с общим списком`);
    }
}

for (const item of history.metrics?.latenessRate?.months || []) {
    if (item.noData) continue;
    if (!Number.isInteger(item.late) || !Number.isInteger(item.total) || item.late < 0 || item.total <= 0 || item.late > item.total) {
        problems.push(`latenessRate ${item.key}: некорректные счётчики`);
        continue;
    }
    const expected = Number((item.late / item.total * 100).toFixed(1));
    if (item.value !== expected) problems.push(`latenessRate ${item.key}: ${item.value} != ${expected}`);
}

for (const item of history.metrics?.appointments?.months || []) {
    if (!Number.isInteger(item.onlineRecords) || item.onlineRecords < 0 || !Number.isInteger(item.totalServices) || item.totalServices < 0) {
        problems.push(`appointments ${item.key}: некорректные счётчики`);
        continue;
    }
    const expected = item.totalServices > 0
        ? Number((item.onlineRecords / item.totalServices * 100).toFixed(1))
        : 0;
    if (item.percentage !== expected) problems.push(`appointments ${item.key}: ${item.percentage} != ${expected}`);
}

for (const item of history.metrics?.cycle?.months || []) {
    if (item.windowDays !== 120 || item.minVisitsPerClient !== 3 || item.aggregation !== 'median') {
        problems.push(`cycle ${item.key}: нарушен контракт 120 дней / 3+ визита / медиана`);
    }
    if (!Number.isFinite(item.value) || !Number.isInteger(item.sampleSize) || item.sampleSize < 0 || !Number.isInteger(item.eligibleCustomers) || item.eligibleCustomers < 0) {
        problems.push(`cycle ${item.key}: некорректное значение или размер выборки`);
    }
}

if (process.argv.includes('--expect-previous-month')) {
    const now = new Date();
    const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const expected = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!history.months?.includes(expected)) problems.push(`нет завершённого месяца ${expected}`);
}

if (problems.length) {
    console.error(`[history] validation failed: ${problems.join('; ')}`);
    process.exit(1);
}
console.log(`[history] validation passed: 12 months, ${requiredMetrics.length} metrics`);
