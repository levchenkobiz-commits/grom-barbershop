const fs = require('fs');

let optionsStrFrom = '';
let optionsStrTo = '';

for(let i = 6; i <= 23; i++) {
    const val = i.toString().padStart(2, '0');
    const selFrom = (val === '10') ? ' selected' : '';
    optionsStrFrom += `                        <option value="${val}"${selFrom}>${val}:00</option>\n`;
    
    const selTo = (val === '22') ? ' selected' : '';
    optionsStrTo += `                        <option value="${val}"${selTo}>${val}:00</option>\n`;
}

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/<select id="custom-time-from"[^>]*>[\s\S]*?<\/select>/, `<select id="custom-time-from" style="width: 100%;">\n${optionsStrFrom}                    </select>`);

html = html.replace(/<select id="custom-time-to"[^>]*>[\s\S]*?<\/select>/, `<select id="custom-time-to" style="width: 100%;">\n${optionsStrTo}                    </select>`);

fs.writeFileSync('index.html', html, 'utf8');
