import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupFinal = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      multipleStatements: true,
    });

    console.log("Connected to MySQL server.");

    // Clean start
    await connection.query("DROP DATABASE IF EXISTS `hexomel`;");
    await connection.query("CREATE DATABASE `hexomel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    await connection.query("USE `hexomel`;");
    console.log("Clean 'hexomel' database created.");

    const sqlPath = path.join(__dirname, "..", "hexomel_mysql.sql");
    let sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Robust splitting:
    // 1. Remove comments
    sqlContent = sqlContent.replace(/\/\*[\s\S]*?\*\/|--.*?\n/g, "");
    
    // 2. Split by semicolon that is NOT followed by a quote or backtick inside a string
    // This is hard with regex, so we'll do a simple character loop
    const statements = [];
    let currentLine = "";
    let inString = false;
    let quoteChar = "";

    for (let i = 0; i < sqlContent.length; i++) {
        const char = sqlContent[i];
        if ((char === "'" || char === '"' || char === "`") && sqlContent[i-1] !== "\\") {
            if (!inString) {
                inString = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inString = false;
            }
        }
        
        if (char === ";" && !inString) {
            statements.push(currentLine.trim());
            currentLine = "";
        } else {
            currentLine += char;
        }
    }
    if (currentLine.trim()) statements.push(currentLine.trim());

    console.log(`Executing ${statements.length} sql statements...`);

    for (const [index, stmt] of statements.entries()) {
      if (!stmt) continue;
      try {
        await connection.query(stmt);
      } catch (err) {
        console.error(`[FAIL] Stmt ${index + 1}: ${err.message}`);
        console.error("SQL: " + stmt.substring(0, 50) + "...");
      }
    }

    console.log("\nSetup complete. Checking tables...");
    const [tables] = await connection.query("SHOW TABLES");
    console.table(tables);

    await connection.end();
    console.log("Final setup finished.");
  } catch (error) {
    console.error("CRITICAL ERROR during final setup:", error);
    if (connection) await connection.end();
  }
};

setupFinal();
