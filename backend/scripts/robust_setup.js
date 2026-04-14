import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { backendRoot, getServerDbConfig } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupRobust = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(
      getServerDbConfig({ multipleStatements: true }),
    );

    console.log("Connected to MySQL server.");

    // Clean start
    await connection.query("DROP DATABASE IF EXISTS `hexomel`;");
    await connection.query("CREATE DATABASE `hexomel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    await connection.query("USE `hexomel`;");
    console.log("Clean 'hexomel' database created.");

    const sqlPath = path.join(backendRoot, "hexomel_mysql.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Split statements (simple split by semicolon)
    const statements = sqlContent
      .split(/;(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/) // Better split regex for semicolons
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`Executing ${statements.length} sql statements...`);

    for (const [index, stmt] of statements.entries()) {
      try {
        await connection.query(stmt);
        // console.log(`[OK] Statement ${index + 1}`);
      } catch (err) {
        console.error(`[FAIL] Statement ${index + 1}:`);
        console.error(stmt.substring(0, 100) + "...");
        console.error(`Error: ${err.message}`);
        // Consider if we should stop or continue
      }
    }

    console.log("\nSetup complete. Checking tables...");
    const [tables] = await connection.query("SHOW TABLES");
    console.table(tables);

    await connection.end();
    console.log("Robust setup finished.");
  } catch (error) {
    console.error("CRITICAL ERROR during robust setup:", error);
    if (connection) await connection.end();
  }
};

setupRobust();
