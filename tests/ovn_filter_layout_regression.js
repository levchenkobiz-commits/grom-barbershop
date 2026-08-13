const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/manager-cabinet.css'), 'utf8');

assert(!html.includes('ovn-filter-toolbar-styles'), 'legacy inline OVN toolbar CSS must stay deleted');
assert(html.indexOf('Журнал видеоконтроля') < html.indexOf('id="ovn-history-filters"'), 'journal heading must precede its filters');
assert(html.indexOf('id="ovn-history-filters"') < html.indexOf('id="ovn-history-start"'), 'date range must stay inside the journal filter toolbar');
assert(/#ovn-section \.ovn-date-controls\s*\{[\s\S]*?grid-row: 1;/.test(css), 'date range must remain the first mobile toolbar row');

console.log('ovn filter layout regression: ok');
