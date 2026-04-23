/**
 * public/js/salary.js (window.renderSalary alias)
 * =====================================================
 * Краткий файл-мост: выставляет window.renderSalary
 * как псевдоним renderSalaryTable для обратной совместимости
 * со старым кодом, который вызывал window.renderSalary().
 *
 * ВАЖНО: этот файл загружается ПОСЛЕ salary.js
 */
window.renderSalary = function(salaries, schedule) {
    // Если передан salaries-кэш (из legacy-кода), сохраняем
    if (salaries) window.SALARIES_CACHE = Object.assign(window.SALARIES_CACHE || {}, salaries);
    if (schedule) window.LAST_SCHEDULE  = schedule;
    // Перенаправляем в новую функцию
    if (typeof window.renderSalaryTable === 'function') window.renderSalaryTable();
};
