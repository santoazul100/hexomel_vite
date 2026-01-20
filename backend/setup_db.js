import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDB = async () => {
  try {
    // 1. Connect to MySQL Server (without database selected first, to create it if needed)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true, // Important for running the SQL file
    });

    console.log("Connected to MySQL server.");

    // 2. Read SQL file
    const sqlPath = path.join(__dirname, "hexomel_mysql.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // 3. Execute SQL
    console.log("Executing SQL schema...");
    await connection.query(sql);

    console.log("Database initialized successfully!");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
};

initDB();
