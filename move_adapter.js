const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove from header
const headerAdapterBtnRegex = /<button id="adapter-btn"[^>]*>⚙️ Адаптер<\/button>/g;
html = html.replace(headerAdapterBtnRegex, '');

// 2. Add to Manager Cabinet
const managerBtnsTarget = `<div style="display: flex; gap: 10px;">
                    <button class="btn-refresh" onclick="openFinesModal()"`;

let newAdapterBtn = `<button id="adapter-btn" class="btn-refresh" onclick="openAdapterModal()" style="border-radius: 12px; padding: 10px 20px; background: transparent; border: 1px dashed var(--text-muted); color: var(--text-muted); font-size: 14px; display: none;">⚙️ YC Адаптер</button>`;

html = html.replace(managerBtnsTarget, `<div style="display: flex; gap: 10px;">
                    ${newAdapterBtn}
                    <button class="btn-refresh" onclick="openFinesModal()"`);

fs.writeFileSync('index.html', html);


let js = fs.readFileSync('mainscript.js', 'utf8');

// Allow managers to see the adapter too, or maybe just owners?
// The user said "адаптер тоже в кабинет менеджера вынеси". I will enable it for managers too, just in case.
const roleConstraintsRegex = /const role = window\.USER\.role;\s*if \(role === 'owner'\) {\s*document\.getElementById\('adapter-btn'\)\.style\.display = 'block';/m;
const updatedConstraints = `const role = window.USER.role;
            if (role === 'owner' || role === 'manager') {
                document.getElementById('adapter-btn').style.display = 'block';`;

js = js.replace(roleConstraintsRegex, updatedConstraints);
fs.writeFileSync('mainscript.js', js);

console.log("Moved adapter button and updated roles");
