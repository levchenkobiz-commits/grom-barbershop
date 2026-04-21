const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldBtn = /<button class="btn-submit" onclick="let t=this\.innerHTML;[\s\S]*?<\/button>/;
const newBtn = `
<button class="btn-submit" id="salary-calc-btn" onclick="startSalaryCalc()" style="padding: 10px 20px; border-radius: 12px; font-size: 14px;">
    Рассчитать
</button>`;

html = html.replace(oldBtn, newBtn);

// Also add startSalaryCalc to mainscript.js
fs.writeFileSync('index.html', html);
console.log("Updated index.html button to call startSalaryCalc");
