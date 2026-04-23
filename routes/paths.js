/**
 * routes/paths.js
 * Единый источник всех путей к файлам данных на сервере.
 * Импортируй отсюда — не хардкодь пути в роутах.
 */

const path = require('path');
const fs   = require('fs');

const ROOT = path.join(__dirname, '..');

const PATHS = {
  ovn:            path.join(ROOT, 'ovn_reports.json'),
  schedule:       path.join(ROOT, 'schedule.json'),
  mockDb:         path.join(ROOT, 'mock_db.json'),
  masterLates:    path.join(ROOT, 'master_lates.json'),
  managerChecks:  path.join(ROOT, 'manager_checks.json'),
  handbook:       path.join(ROOT, 'handbook.json'),
  roles:          path.join(ROOT, 'roles.json'),
  syncStatus:     path.join(ROOT, 'sync_status.json'),
  uploadsDir:     path.join(ROOT, 'manager_uploads'),
  adapterOut:     path.join(ROOT, 'adapter.js'),
};

// Создаём папку для загрузок при старте (один раз)
if (!fs.existsSync(PATHS.uploadsDir)) {
  fs.mkdirSync(PATHS.uploadsDir, { recursive: true });
}

module.exports = PATHS;
