const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Find the bad block
code = code.replace(
    /\\`Ты — непреклонный ИИ-аудитор барбершопа(.*?)}\.\\`/g,
    '`Ты — непреклонный ИИ-аудитор барбершопа$1}.`'
);

code = code.replace(
    '\\${zoneRule}',
    '${zoneRule}'
);

fs.writeFileSync('server.js', code);
console.log('Fixed syntax');
