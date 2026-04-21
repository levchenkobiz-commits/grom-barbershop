const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Change button text to indicate action
html = html.replace(/onclick="renderSalaryTable\(\)"/g, 'onclick="this.innerText=\'Загрузка...\'; renderSalaryTable().finally(() => { this.innerText=\'Рассчитать\'; })"');

fs.writeFileSync('index.html', html);
console.log("Improved Salary Button UX");
