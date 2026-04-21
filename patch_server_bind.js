const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace('.listen(port, () =>', '.listen(port, "0.0.0.0", () =>');
fs.writeFileSync('server.js', s);
console.log("Updated server to listen on 0.0.0.0");
