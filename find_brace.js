const fs = require('fs');
const code = fs.readFileSync('mainscript.js', 'utf8');
const lines = code.split('\n');

let depth = 0;
let maxDepth = 0;
let inString = false;
let stringChar = '';
let inTemplate = 0;
let i = 0;

// Simple brace counter that skips strings  
const stack = []; // {depth, line}
for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (ch === '{') depth++;
        if (ch === '}') depth--;
    }
    if (depth > 0) {
        // track when depth increases
    }
}
console.log('Final depth:', depth);

// Now find where it goes above and never comes back
depth = 0;
let lastOpen = [];
for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let prevDepth = depth;
    for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (ch === '{') { depth++; lastOpen.push(li+1); }
        if (ch === '}') { depth--; lastOpen.pop(); }
    }
}
console.log('Unclosed opens at lines:', lastOpen.slice(0,10));
