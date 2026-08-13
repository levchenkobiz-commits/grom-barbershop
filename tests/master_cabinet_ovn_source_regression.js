const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync(require.resolve('../public/js/master-mobile-current.js'), 'utf8');
const page = fs.readFileSync(require.resolve('../master-mobile-current.html'), 'utf8');

// The personal counter, journal and service-quality card must have a server
// classified OVN-only feed.  Fines retain the complete report stream because
// lateness is financially relevant but not a service-quality violation.
assert.match(source, /ovnChecks:\s*\[\]/);
assert.match(source, /json\(`\/api\/ovn\?\$\{previewQuery\(\)\}video_only=1&v=\$\{stamp\}`\)/);
assert.match(source, /const ownOvnChecks = state\.ovnChecks\.filter/);
assert.match(source, /currentMonthViolations\(ownOvnChecks\)/);
assert.match(source, /renderQuality\(ownOvnChecks\)/);
assert.match(source, /getFines\(master, ownReports\)/);
assert.match(source, /function currentCalendarMonthPeriod\(\)/);
assert.match(source, /const period = currentCalendarMonthPeriod\(\)/);
assert.match(source, /function currentCalendarWeekPeriod\(\)[\s\S]*startOf\('isoWeek'\)/);
const finesFunction = source.match(/function getFines\(master, reports\) \{([\s\S]*?)\n  \}/);
assert(finesFunction, 'master fines function is absent');
assert.match(finesFunction[1], /const period = currentCalendarWeekPeriod\(\)/);
assert.doesNotMatch(source, /monthPeriod\(/);
assert.match(source, /function parseSourceUpdatedAt\(value\)/);
assert.match(source, /renderReturnRate\(returnRate == null \|\| returnRate === '' \? null/);
assert.match(source, /value == null \|\| value === '' \? 'Нет данных'/);
assert.match(source, /function renderPunctuality\(metric\)/);
assert.match(source, /renderPunctuality\(state\.data && state\.data\.punctualityRate\)/);
assert.match(source, /DATA_REFRESH_INTERVAL_MS = 60 \* 1000/);
assert.match(source, /cache: 'no-store'/);
assert.doesNotMatch(source, /100\s*-\s*(?:personal|value|late)/);
assert.match(source, /window\.I18N\.setUser\(user\.key\)/);
assert.match(page, /public\/js\/i18n\.js\?v=20260813-punctuality-v1/);
assert.match(page, /id="punctuality-value"/);
assert.match(page, /--threshold:85/);
assert.match(page, /Сумма штрафов \(нед\)/);
assert.match(page, /master-mobile-current\.js\?v=20260813-manager-preview-v1/);
assert.match(page, /id="preview-back-btn"/);
assert.match(source, /if \(!state\.preview\) await renderSalary\(\)/);

console.log('master cabinet OVN source regression: passed');
