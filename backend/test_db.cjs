const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/escola/pap/code/hexomel_vite/backend/database.sqlite');
db.all("SELECT ID_Cliente, Nome, Email FROM cliente WHERE Email = 'rodrigofcosta.silva@gmail.com' OR Nome LIKE '%Silva%';", [], (err, rows) => {
    console.log(rows);
});
