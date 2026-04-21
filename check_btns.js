const fs = require('fs');
const html = fs.readFileSync('yc_debug.html', 'utf8');
const btns = html.match(/<button[^>]*>.*?<\/button>/gi) || [];
btns.forEach(x => {
    let clean = x.replace(/<svg.*?>.*?<\/svg>/g, '[SVG]');
    console.log(clean.substring(0, 200));
});
