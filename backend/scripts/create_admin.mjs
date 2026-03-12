import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hexomel",
});

const email = "admin@hexomel.pt";
const password = "admin123";

const hash = await bcrypt.hash(password, 10);

// Upsert admin user
const [rows] = await pool.execute("SELECT * FROM cliente WHERE Email = ?", [
  email,
]);

if (rows.length > 0) {
  await pool.execute(
    "UPDATE cliente SET Senha = ?, UserType = 'admin', Nome = 'Admin Hexomel' WHERE Email = ?",
    [hash, email],
  );
  console.log(`✅ Admin user updated: ${email} / ${password}`);
} else {
  await pool.execute(
    "INSERT INTO cliente (Nome, Email, Senha, UserType) VALUES (?, ?, ?, 'admin')",
    ["Admin Hexomel", email, hash],
  );
  console.log(`✅ Admin user created: ${email} / ${password}`);
}

await pool.end();
