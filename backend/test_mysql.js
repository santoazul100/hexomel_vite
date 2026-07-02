import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pap_db",
  });

  try {
    const [rows] = await connection.execute("SHOW TABLES;");
    console.log(rows);
  } catch (error) {
    console.error("error:", error);
  } finally {
    await connection.end();
  }
}
check();
