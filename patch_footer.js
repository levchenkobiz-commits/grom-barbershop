const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('<tbody id="salary-table-body"></tbody>', '<tbody id="salary-table-body"></tbody><tfoot id="salary-table-footer"></tfoot>');

fs.writeFileSync('index.html', html);
console.log("Added tfoot to salary table in index.html");
