import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const checkSchema = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "hexomel",
    });

    const [rows] = await connection.query("DESCRIBE cliente");
    console.log("Columns in cliente table:");
    rows.forEach(row => console.log(`- ${row.Field} (${row.Type})`));

    const [users] = await connection.query("SELECT Email, UserType, Senha FROM cliente WHERE UserType = 'admin' OR Email = 'rodrigo@hexomel.pt'");
    console.log("\nAdmin users found:");
    users.forEach(u => console.log(`- ${u.Email} [${u.UserType}] Hash excerpt: ${u.Senha.substring(0, 10)}...`));

    await connection.end();
  } catch (err) {
    console.error("Error:", err);
  }
};

checkSchema();
