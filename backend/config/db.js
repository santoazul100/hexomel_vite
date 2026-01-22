import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export const initDB = async () => {
  try {
    const dbPath = path.join(__dirname, "../database.db");
    const sqlPath = path.join(__dirname, "../hexomel.db.sql");

    const dbExists = fs.existsSync(dbPath);

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Initialize schema if first time
    if (!dbExists) {
      console.log("Initializing SQLite schema...");
      const sql = fs.readFileSync(sqlPath, "utf8");
      await db.exec(sql);
      console.log("Schema initialized.");
    }

    console.log("SQLite Database connected successfully.");
    return db;
  } catch (error) {
    console.error("SQLite connection error:", error);
    throw error;
  }
};

export const getPool = () => db; // Renamed compatibility export
export const getDB = () => db;
