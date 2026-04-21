const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/onclick="calculateSalaries\(\)"/g, 'onclick="openSalaryModal(true)"');
html = html.replace(/onclick="openHandbookManagerModal\(\)"/g, 'onclick="openHandbookConfigModal()"');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed html mappings');
