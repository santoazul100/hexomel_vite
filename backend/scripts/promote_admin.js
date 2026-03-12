import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promoteAdmin = async () => {
  const dbPath = path.join(__dirname, "database.db");
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  const email = "admin@hexomel.pt";
  const pass = "admin123";

  const user = await db.get("SELECT * FROM cliente WHERE Email = ?", [email]);

  if (user) {
    await db.run("UPDATE cliente SET UserType = 'admin' WHERE Email = ?", [
      email,
    ]);
    console.log(`User ${email} promoted to admin.`);
  } else {
    const hashedPassword = await bcrypt.hash(pass, 10);
    await db.run(
      "INSERT INTO cliente (Nome, Email, Senha, UserType) VALUES (?, ?, ?, ?)",
      ["Admin Hexomel", email, hashedPassword, "admin"],
    );
    console.log(`Default admin created: ${email} / ${pass}`);
  }

  await db.close();
};

promoteAdmin();
