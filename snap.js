const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('.tabs-container {', '.tabs-container {\n            scroll-snap-type: x mandatory;');
html = html.replace('.tab-btn {', '.tab-btn {\n            scroll-snap-align: start;');

fs.writeFileSync('index.html', html, 'utf8');
