const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The exact strings
html = html.replace('<table id="manager-table">', '<table id="manager-table" class="journal-table">');
html = html.replace('<table id="ovn-today-table">', '<table id="ovn-today-table" class="journal-table">');
html = html.replace('<table id="ovn-table">', '<table id="ovn-table" class="journal-table">');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Tables fixed!');
