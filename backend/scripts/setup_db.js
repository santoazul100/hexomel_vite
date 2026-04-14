import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { backendRoot, getServerDbConfig } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDB = async () => {
  try {
    // 1. Connect to MySQL Server (without database selected first, to create it if needed)
    const connection = await mysql.createConnection(
      getServerDbConfig({ multipleStatements: true }),
    );

    console.log("Connected to MySQL server.");

    // 2. Drop and Recreate Database for a clean start
    console.log("Re-creating database hexomel...");
    await connection.query("DROP DATABASE IF EXISTS `hexomel`;");
    await connection.query("CREATE DATABASE `hexomel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    await connection.query("USE `hexomel`;");

    // 3. Read SQL file
    const sqlPath = path.join(backendRoot, "hexomel_mysql.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // 3. Execute SQL
    console.log("Executing SQL schema...");
    // We Use the connection already opened with multipleStatements: true
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
