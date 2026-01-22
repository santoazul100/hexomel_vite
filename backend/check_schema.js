const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");

db.all("PRAGMA table_info(produto)", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Columns in 'produto' table:");
  rows.forEach((row) => console.log(`- ${row.name} (${row.type})`));
  db.close();
});
