const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const adapterBtn = `<button id="adapter-btn" class="btn-refresh" onclick="openAdapterModal()" style="border-radius: 12px; padding: 10px 20px; background: transparent; border: 1px dashed var(--text-muted); color: var(--text-muted); font-size: 14px; display: none;">⚙️ YC Адаптер</button>\n                    `;

html = html.replace(/<button class="btn-refresh" onclick="openFinesModal\(\)"/g, adapterBtn + '<button class="btn-refresh" onclick="openFinesModal()"');

fs.writeFileSync('index.html', html);
console.log('Adapter injected!');
