const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PATHS = require('../routes/paths');
const ovn = require('../routes/ovn');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grome-ovn-analytics-'));
const fixturePath = path.join(tempDir, 'ovn_reports.json');
const originalPath = PATHS.ovn;

function callEndpoint() {
  let status = 0;
  let headers = {};
  let body = '';
  const res = {
    writeHead(code, nextHeaders) { status = code; headers = nextHeaders || {}; },
    end(value) { body = String(value || ''); },
  };
  ovn.handleGetAnalytics({}, res, new URL('http://localhost/api/ovn/analytics?month=2026-08'));
  return { status, headers, payload: JSON.parse(body) };
}

try {
  PATHS.ovn = fixturePath;
  const reports = [
    { createdAt: '2026-08-06T10:00:00Z', barber: 'Мухамад', location: 'Рязанский', violation: 'Не обработал инструмент, Не показал зеркало заднего вида' },
    { createdAt: '2026-08-06T11:00:00Z', barber: 'Мухамад', location: 'Рязанский', violation: 'Замечаний нет' },
    { createdAt: '2026-08-06T12:00:00Z', barber: 'Олимжон Х.', location: 'Рязанский', violation: 'Про акцию не сказал', isForceMajeure: true },
  ];
  fs.writeFileSync(fixturePath, JSON.stringify(reports));

  const first = callEndpoint();
  assert.equal(first.status, 200);
  assert.match(first.headers['Cache-Control'], /no-store/);
  assert.equal(first.payload.source, 'ovn_reports');
  assert.equal(first.payload.totalReports, 1);
  assert.equal(first.payload.totalViolations, 2);
  assert.deepEqual(first.payload.violators, [{ name: 'Мухамад', count: 2 }]);

  reports.push({ createdAt: '2026-08-07T10:00:00Z', barber: 'Мухамад', location: 'Рязанский', violation: 'Не обработал инструмент' });
  fs.writeFileSync(fixturePath, JSON.stringify(reports));
  const second = callEndpoint();
  assert.equal(second.payload.totalViolations, 3, 'endpoint must reread OVN source on every request');
  assert.deepEqual(second.payload.violations[0], { name: 'Не обработал инструмент', count: 2 });
} finally {
  PATHS.ovn = originalPath;
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('ovn analytics endpoint regression: ok');
