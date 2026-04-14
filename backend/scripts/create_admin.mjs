import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { getDbConfig } from "../config/env.js";

const pool = await mysql.createPool({
  ...getDbConfig(),
});

const email = "admin";
const password = "admin";

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
