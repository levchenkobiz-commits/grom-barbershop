const fs = require('fs');
let content = fs.readFileSync('mainscript.js', 'utf8');

// Ensure correct regex for safeId (no double backslashes)
content = content.replace(/const safeId = mName\.replace\(\/\\s\+\/g, \'-\'\)\.replace\(\/\[\^a-zA-Z0-9-А-Яа-я\]\/g, \'\'\);/g, "const safeId = mName.replace(/\\s+/g, '-').replace(/[^a-zA-Z0-9-А-Яа-я]/g, '');");

// Ensure renderSalaryTable is robust and logs errors
const oldBlock = `window.renderSalaryTable = async function() {`;
const newBlock = `window.renderSalaryTable = async function() {
    console.log("renderSalaryTable triggered");
    try {`;
content = content.replace(oldBlock, newBlock);

// Close the try block at the end of the function
// The function ends with: }); };
content = content.replace(/\}\);\s*\};/g, "}); } catch(err) { console.error('renderSalaryTable Error:', err); alert('Ошибка расчета: ' + err.message); } };");

fs.writeFileSync('mainscript.js', content);
console.log("Robustified and added error catching to mainscript.js");
