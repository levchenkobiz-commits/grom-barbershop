const fs = require('fs');
let content = fs.readFileSync('mainscript.js', 'utf8');

// I will find the floating code block and remove it.
// It seems to start with "window.SALARIES_CACHE[safeId] = revInput.value; // Store string explicitly including blank" 
// and end with "};" at line 2111.

const startMarker = 'window.SALARIES_CACHE[safeId] = revInput.value; // Store string explicitly including blank';
const startIndex = content.indexOf(startMarker);

if (startIndex !== -1) {
    // Find the next }; after this marker
    const endIndex = content.indexOf('};', startIndex) + 2;
    const problematicBlock = content.substring(startIndex, endIndex);
    console.log("Removing problematic block starting at", startIndex);
    content = content.replace(problematicBlock, '');
}

fs.writeFileSync('mainscript.js', content);
console.log("Cleaned up mainscript.js syntax");
