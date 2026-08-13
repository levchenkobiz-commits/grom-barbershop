const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const localRoot = process.cwd();
const root = process.env.GROME_DASHBOARD_ROOT
  || (fs.existsSync(path.join(localRoot, 'public/js/permissions.js'))
    ? localRoot
    : path.join(localRoot, '.work-salary-access'));
const isSnapshot = fs.existsSync(path.join(root, 'permissions.js'));
const read = relative => fs.readFileSync(
  path.join(root, isSnapshot ? path.basename(relative) : relative),
  'utf8'
);
const permissions = read('public/js/permissions.js');
const ui = read('public/js/ui.js');
const page = read('index.html');
const auth = read('routes/auth.js');
const context = {
  localStorage: { getItem() { return null; } },
  fetch() {},
  location: { origin: 'https://app.grome.pro' },
};
context.window = context;
vm.createContext(context);
vm.runInContext(permissions, context);

assert.strictEqual(context.PERM.roleHas('owner', 'salaryCalculation'), true);
assert.strictEqual(context.PERM.roleHas('maintenance', 'salaryCalculation'), true);
assert.strictEqual(context.PERM.roleHas('manager', 'salaryCalculation'), false);
assert.match(page, /id="salary-calculation-btn"[\s\S]*?openSalaryModal\(true\)/);
assert.match(ui, /salaryCalculationButton[\s\S]*?PERM\.can\('salaryCalculation'\)/);
assert.match(ui, /\['salary',[\s\S]*?'salaryCalculation'\]/);
assert.match(auth, /'POST \/api\/fetch_salary':\s*\['owner', 'maintenance'\]/);
assert.match(auth, /'POST \/api\/elkassa\/salary':\s*\['owner', 'maintenance', 'master'\]/);

console.log('salary access regression: passed');
