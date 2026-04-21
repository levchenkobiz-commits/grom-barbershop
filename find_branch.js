const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, 'companies.json');
let content = fs.readFileSync(companiesPath, 'utf16le');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
const data = JSON.parse(content);
const list = data.data || [];

console.log('Available titles:', list.map(c => c.title));
