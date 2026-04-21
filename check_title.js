const fs = require('fs');
const html = fs.readFileSync('yc_debug.html', 'utf8');
const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1] : 'none');
const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/gi);
console.log('H1:', h1Match ? h1Match : 'none');
const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500);
console.log('Text:', bodyText);
