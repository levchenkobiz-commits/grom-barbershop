const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
// Find the main <script> block (the last one)
const scriptBlocks = [];
let searchFrom = 0;
while (true) {
    const start = html.indexOf('<script>', searchFrom);
    if (start === -1) break;
    const end = html.indexOf('</script>', start);
    scriptBlocks.push({ start, end, code: html.slice(start + 8, end) });
    searchFrom = end + 1;
}
console.log('Total <script> blocks found:', scriptBlocks.length);
scriptBlocks.forEach((b, i) => {
    const lines = b.code.split('\n').length;
    console.log(`Block ${i}: ${lines} lines`);
});
// Save the largest block
const main = scriptBlocks.sort((a,b) => b.code.length - a.code.length)[0];
fs.writeFileSync('mainscript.js', main.code);
console.log('Saved main block, lines:', main.code.split('\n').length);
