const assert = require('assert');
const fs = require('fs');

const roles = JSON.parse(fs.readFileSync('roles.json', 'utf8'));
const manager = Object.entries(roles).find(([, user]) => user.role === 'manager');
assert(manager, 'manager account is required');

async function request(path) {
  return fetch(`http://127.0.0.1:8080${path}`, { headers: { 'X-User-Key': manager[0] } });
}

(async () => {
  const listResponse = await request('/api/master-preview/masters');
  assert.strictEqual(listResponse.status, 200);
  const list = await listResponse.json();
  assert(Array.isArray(list.masters) && list.masters.length > 0);
  assert(list.masters.every(master => master.name && Array.isArray(master.locations)));
  assert(list.masters.every(master => !Object.hasOwn(master, 'password') && !Object.hasOwn(master, 'login')));

  const target = list.masters[0].name;
  const encoded = encodeURIComponent(target);
  const [dataResponse, ovnResponse, scheduleResponse] = await Promise.all([
    request(`/api/data?master=${encoded}`),
    request(`/api/ovn?master=${encoded}`),
    request(`/api/schedule?master=${encoded}`),
  ]);
  assert.strictEqual(dataResponse.status, 200);
  assert.strictEqual(ovnResponse.status, 200);
  assert.strictEqual(scheduleResponse.status, 200);
  const data = await dataResponse.json();
  const ovn = await ovnResponse.json();
  const schedule = await scheduleResponse.json();
  assert(Object.hasOwn(data, 'occupancy') && Object.hasOwn(data, 'punctualityRate'));
  assert(ovn.every(report => report.barber === target));
  assert(schedule.flatMap(day => day.masters || []).every(shift => shift.name === target));

  const invalid = await request('/api/data?master=archived-master');
  assert.strictEqual(invalid.status, 403);
  console.log(JSON.stringify({ ok: true, canonicalListOnly: true, managerPreviewScoped: true, invalidMasterBlocked: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
