const fs = require('fs');
const assert = require('assert');
const { canonicalMasterName, adapterMasterNames, getMasterAliases, matchesMaster } = require(`${process.cwd()}/routes/master_scope`);

const roles = JSON.parse(fs.readFileSync('roles.json', 'utf8'));
const findUser = (role, name) => Object.entries(roles).find(([, user]) => user.role === role && (!name || user.name === name));
const request = (path, key, options = {}) => fetch(`http://127.0.0.1:8080${path}`, {
  ...options,
  headers: { ...(options.headers || {}), ...(key ? { 'X-User-Key': key } : {}) },
});

(async () => {
  const unauth = await request('/api/elkassa/salary', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.strictEqual(unauth.status, 401);

  for (const role of ['owner', 'maintenance', 'master']) {
    const entry = role === 'master' ? findUser(role, 'Мухамаджон С.') : findUser(role);
    assert(entry, `missing ${role}`);
    const response = await request('/api/elkassa/salary', entry[0], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.strictEqual(response.status, 400, `${role} salary access`);
  }

  const manager = findUser('manager', 'Игорь');
  const managerSalaryDenied = await request('/api/elkassa/salary', manager[0], {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.strictEqual(managerSalaryDenied.status, 403, 'manager salary access must be denied');
  const managerOvn = await request('/api/ovn', manager[0]);
  const managerReports = await managerOvn.json();
  const roster = adapterMasterNames();
  const activeRawReports = JSON.parse(fs.readFileSync('ovn_reports.json', 'utf8')).filter(report => canonicalMasterName(report.barber, report.location) || canonicalMasterName(report.barber));
  assert.strictEqual(managerReports.length, activeRawReports.length);
  assert(managerReports.every(report => roster.has(report.barber)));

  const scheduleResponse = await request('/api/schedule', manager[0]);
  const schedule = await scheduleResponse.json();
  assert(schedule.flatMap(day => day.masters || []).every(shift => roster.has(shift.name)));

  const dataResponse = await request('/api/data', manager[0]);
  const dashboardData = await dataResponse.json();
  for (const metricName of ['revenue', 'returnRate', 'cycle', 'appointments', 'occupancy']) {
    const rows = dashboardData[metricName]?.drilldown?.[0]?.masters || [];
    assert(rows.every(row => roster.has(row.name)), `${metricName}: non-adapter master leaked`);
  }

  const master = findUser('master', 'Мухамаджон С.');
  const masterDataResponse = await request('/api/data', master[0]);
  assert.strictEqual(masterDataResponse.status, 200);
  assert.match(masterDataResponse.headers.get('cache-control') || '', /no-store/);
  const masterData = await masterDataResponse.json();
  const personalPunctuality = masterData.punctualityRate?.personal;
  const masterLateness = dashboardData.latenessRate?.drilldown?.[1]?.masters
    ?.find(row => row.name === 'Мухамаджон С.');
  assert(personalPunctuality, 'master punctuality metric is absent');
  assert(masterLateness, 'analytics lateness source row is absent');
  assert.strictEqual(personalPunctuality.sourceValue, masterLateness.value);
  assert.strictEqual(personalPunctuality.late, masterLateness.late);
  assert.strictEqual(personalPunctuality.total, masterLateness.total);
  assert.strictEqual(personalPunctuality.value, masterLateness.noData ? null : Number((100 - masterLateness.value).toFixed(1)));
  const masterScheduleResponse = await request('/api/schedule', master[0]);
  assert.strictEqual(masterScheduleResponse.status, 200);
  const masterSchedule = await masterScheduleResponse.json();
  const expectedMasterSchedule = schedule.map(day => ({
    ...day,
    masters: (day.masters || []).filter(shift => matchesMaster(shift.name, getMasterAliases('Мухамаджон С.'))),
  })).filter(day => day.masters.length > 0);
  assert.deepStrictEqual(masterSchedule, expectedMasterSchedule, 'master schedule leaked another master');
  assert(masterSchedule.flatMap(day => day.masters).every(shift => matchesMaster(shift.name, getMasterAliases('Мухамаджон С.'))));
  const masterOvn = await request('/api/ovn', master[0]);
  const masterReports = await masterOvn.json();
  const aliases = getMasterAliases('Мухамаджон С.');
  assert(masterReports.length > 0);
  assert(masterReports.every(report => matchesMaster(report.barber, aliases)));
  const managerOwnReports = managerReports.filter(report => matchesMaster(report.barber, aliases));
  assert.deepStrictEqual(
    masterReports.map(report => String(report.id)).sort(),
    managerOwnReports.map(report => String(report.id)).sort(),
    'manager and master cabinets received different OVN sources'
  );

  const salaryPeriod = JSON.stringify({ start: '03.08.2026', end: '08.08.2026' });
  const maintenance = findUser('maintenance', 'Кирилл');
  const maintenanceSalaryResponse = await request('/api/elkassa/salary', maintenance[0], {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: salaryPeriod,
  });
  assert.strictEqual(maintenanceSalaryResponse.status, 200);
  const maintenanceSalary = await maintenanceSalaryResponse.json();
  assert(Object.keys(maintenanceSalary.revenue || {}).every(name => roster.has(name)));

  const salaryResponse = await request('/api/elkassa/salary', master[0], {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: salaryPeriod,
  });
  assert.strictEqual(salaryResponse.status, 200);
  const salary = await salaryResponse.json();
  assert.deepStrictEqual(Object.keys(salary.revenue), ['Мухамаджон С.']);
  assert.strictEqual(salary.revenue['Мухамаджон С.'], 40600);
  assert(!Object.prototype.hasOwnProperty.call(salary.revenue, 'Мухамад'));
  assert.deepStrictEqual(salary.terminalSetsByDay['Мухамаджон С.']['03.08.2026'], ['25307']);

  for (const field of ['revenue', 'daily', 'dailyCounts', 'terminalsByDay', 'terminalSetsByDay']) {
    assert.deepStrictEqual(
      salary[field]['Мухамаджон С.'],
      maintenanceSalary[field]['Мухамаджон С.'],
      `${field}: maintenance and master salary sources differ`
    );
  }

  console.log(JSON.stringify({ ok: true, salaryProtected: true, managerSalaryDenied: true, maintenanceSalaryAuthorized: true, masterOvnScoped: true, managerOvnComplete: true, masterScheduleScoped: true, punctualityMatchesOvnAnalytics: true, exactMasterRevenue: 40600, terminalSets: true, managerMasterOvnEqual: true, maintenanceMasterSalarySourceEqual: true, ovnAdapterOnly: true, scheduleAdapterOnly: true, analyticsAdapterOnly: true, salaryAdapterOnly: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
