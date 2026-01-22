const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

db.all("SELECT * FROM encomenda", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`Found ${rows.length} orders.`);
  rows.forEach((r) => console.log(r));
  db.close();
});
