const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
let scriptStart = -1, scriptEnd = -1;
lines.forEach((l, i) => {
    if(l.trim() === '<script>') scriptStart = i;
    if(l.trim() === '</script>' && scriptStart !== -1) scriptEnd = i;
});
if(scriptStart !== -1 && scriptEnd !== -1) {
    const newLines = [...lines.slice(0, scriptStart), '    <script src="mainscript.js"></script>', ...lines.slice(scriptEnd + 1)];
    fs.writeFileSync('index.html', newLines.join('\n'));
    console.log('Replaced inline script from ' + scriptStart + ' to ' + scriptEnd + ' with mainscript.js!');
} else {
    console.log('Script bounds not what expected:', scriptStart, scriptEnd);
}
