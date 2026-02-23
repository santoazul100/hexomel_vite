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

    // Run migrations (ensure tables exist even if DB was already created)
    await db
      .exec(
        `
      CREATE TABLE IF NOT EXISTS categoria (
        ID_Categoria INTEGER PRIMARY KEY AUTOINCREMENT,
        Nome TEXT NOT NULL UNIQUE
      );
      INSERT OR IGNORE INTO categoria (ID_Categoria, Nome) VALUES (1, 'Méls');
      INSERT OR IGNORE INTO categoria (ID_Categoria, Nome) VALUES (2, 'Derivados');
      INSERT OR IGNORE INTO categoria (ID_Categoria, Nome) VALUES (3, 'Acessórios');

      -- Migration for encomenda table
      ALTER TABLE encomenda ADD COLUMN Morada TEXT;
      ALTER TABLE encomenda ADD COLUMN Telefone TEXT;
    `,
      )
      .catch((err) => {
        // Ignore errors if columns already exist
        if (
          !err.message.includes("duplicate column name") &&
          !err.message.includes("already exists")
        ) {
          console.warn("Migration warning:", err.message);
        }
      });

    console.log("SQLite Database connected successfully.");
    return db;
  } catch (error) {
    console.error("SQLite connection error:", error);
    throw error;
  }
};

export const getPool = () => db; // Renamed compatibility export
export const getDB = () => db;
