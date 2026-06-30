/**
 * routes/salary.js
 * Маршрут: POST /api/fetch_salary
 *
 * Теперь использует прямой API El-Kassa (без Playwright-скрейпера).
 * Делегирует в elkassa.handleSalary.
 */

const elkassa = require('./elkassa');

function handlePost(req, res) {
  // Просто делегируем в новый API-модуль
  elkassa.handleSalary(req, res);
}

module.exports = { handlePost };
