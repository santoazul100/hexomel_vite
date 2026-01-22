const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

// Insert 2 dummy orders for user ID 1 (Admin) or finding a user
db.serialize(() => {
  db.get("SELECT ID_Cliente FROM cliente LIMIT 1", (err, client) => {
    if (err || !client) {
      console.error("No client found to assign orders to.");
      return;
    }

    const stmt = db.prepare(
      "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status) VALUES (?, ?, ?, ?)",
    );

    // Order 1
    stmt.run(client.ID_Cliente, new Date().toISOString(), 25.5, "Pendente");

    // Order 2
    stmt.run(
      client.ID_Cliente,
      new Date(Date.now() - 86400000).toISOString(),
      42.0,
      "Pago",
    );

    stmt.finalize();
    console.log("Created 2 fake orders for client ID", client.ID_Cliente);
  });
});
