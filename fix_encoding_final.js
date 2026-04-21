const fs = require('fs');
const files = ['index.html', 'mainscript.js'];
files.forEach(f => {
    let s = fs.readFileSync(f, 'utf8');
    // Ensure "Рассчитать" is correct in index.html
    if (f === 'index.html') {
        s = s.replace(/<button class="btn-submit" id="salary-calc-btn" onclick="startSalaryCalc\(\)"[^>]*>[\s\S]*?<\/button>/, 
            '<button class="btn-submit" id="salary-calc-btn" onclick="startSalaryCalc()" style="padding: 10px 20px; border-radius: 12px; font-size: 14px;">Рассчитать</button>');
    }
    fs.writeFileSync(f, s, 'utf8');
});
console.log("Fixed encodings and button text.");
