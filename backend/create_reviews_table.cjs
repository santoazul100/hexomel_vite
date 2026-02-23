const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

db.serialize(() => {
  const query = `
    CREATE TABLE IF NOT EXISTS avaliacao (
      ID_Avaliacao INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Produto INTEGER NOT NULL,
      ID_Cliente INTEGER NOT NULL,
      Nota INTEGER NOT NULL CHECK (Nota >= 1 AND Nota <= 5),
      Comentario TEXT,
      Data_Avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Produto) REFERENCES produto (ID_Produto) ON DELETE CASCADE,
      FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
    )
  `;

  db.run(query, (err) => {
    if (err) {
      console.error("Error creating 'avaliacao' table:", err.message);
    } else {
      console.log("Successfully created/verified 'avaliacao' table.");
    }
  });

  // Optional: Add some dummy reviews if table was empty (check count)
  db.get("SELECT count(*) as count FROM avaliacao", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      console.log("Seeding initial reviews...");
      const stmt = db.prepare(
        "INSERT INTO avaliacao (ID_Produto, ID_Cliente, Nota, Comentario) VALUES (?, ?, ?, ?)",
      );
      // Assuming product 1 and client 1 exist
      stmt.run(1, 1, 5, "Mel fantástico! O sabor é incrível.");
      stmt.run(1, 1, 4, "Muito bom, mas o envio demorou um pouco.");
      stmt.finalize();
    }
    db.close();
  });
});
