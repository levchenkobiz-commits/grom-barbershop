/**
 * routes/paths.js
 * Единый источник всех путей к файлам данных на сервере.
 * Импортируй отсюда — не хардкодь пути в роутах.
 */

const path = require('path');
const fs   = require('fs');

// Allows isolated regression fixtures without affecting the production default.
const ROOT = process.env.GROME_DATA_ROOT
  ? path.resolve(process.env.GROME_DATA_ROOT)
  : path.join(__dirname, '..');

const PATHS = {
  data:           path.join(ROOT, 'data.json'),
  analyticsHistory: path.join(ROOT, 'analytics_history.json'),
  ovn:            path.join(ROOT, 'ovn_reports.json'),
  // WARNING: protected master-schedule database. See SCHEDULE_LOCK.md and AGENTS.md.
  schedule:       path.join(ROOT, 'schedule.json'),
  mockDb:         path.join(ROOT, 'mock_db.json'),
  masterLates:    path.join(ROOT, 'master_lates.json'),
  managerChecks:  path.join(ROOT, 'manager_checks.json'),
  technicalTasks: path.join(ROOT, 'technical_tasks.json'),
  autosendNotifications: path.join(ROOT, 'autosend_notifications.json'),
  masterOnboarding: path.join(ROOT, 'master_onboarding.json'),
  handbook:       path.join(ROOT, 'handbook.json'),
  roles:          path.join(ROOT, 'roles.json'),
  syncStatus:     path.join(ROOT, 'sync_status.json'),
  uploadsDir:     path.join(ROOT, 'manager_uploads'),
  masterPhotosDir: path.join(ROOT, 'master_photos'),
  pendingPhotos:  path.join(ROOT, 'pending_photos.json'),
  adapterOut:     path.join(ROOT, 'adapter.js'),
};

// Создаём папки при старте (один раз)
if (!fs.existsSync(PATHS.uploadsDir)) {
  fs.mkdirSync(PATHS.uploadsDir, { recursive: true });
}
if (!fs.existsSync(PATHS.masterPhotosDir)) {
  fs.mkdirSync(PATHS.masterPhotosDir, { recursive: true });
}
if (!fs.existsSync(PATHS.pendingPhotos)) {
  fs.writeFileSync(PATHS.pendingPhotos, '[]');
}

module.exports = PATHS;
