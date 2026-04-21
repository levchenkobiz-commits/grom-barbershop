const fs = require('fs');
const html = fs.readFileSync('yc_debug.html', 'utf8');
const inputs = html.match(/<input[^>]+>/g) || [];
inputs.forEach(x => {
    if(!x.includes('hidden') && !x.includes('checkbox')) {
        console.log(x.substring(0, 200));
    }
});
