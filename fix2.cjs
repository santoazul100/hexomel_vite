const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
c = c.replace(/\\n/g, '\n').replace(/\\'/g, "'");
fs.writeFileSync('backend/server.js', c, 'utf8');
console.log('Unescaped successfully');
