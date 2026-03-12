const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

db.serialize(() => {
  db.run("ALTER TABLE produto ADD COLUMN Tags TEXT", (err) => {
    if (err) {
      console.error("Error adding Tags column:", err.message);
    } else {
      console.log("Successfully added Tags column to 'produto' table.");
    }
  });

  db.all("PRAGMA table_info(produto)", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Updated columns in 'produto' table:");
    rows.forEach((row) => console.log(`- ${row.name} (${row.type})`));
    db.close();
  });
});
