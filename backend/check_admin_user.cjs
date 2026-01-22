const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

db.get("SELECT * FROM cliente WHERE Email = 'admin@hexomel.pt'", (err, row) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Admin user details:", row);
  db.close();
});
