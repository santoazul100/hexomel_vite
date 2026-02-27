import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool;

export const initDB = async () => {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hexomel",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });

  // Test the connection
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("MySQL Database connected successfully.");
  } catch (error) {
    console.error("MySQL connection error:", error);
    throw error;
  }

  // Return a sqlite-compatible wrapper so server.js needs no changes
  return db;
};

// SQLite-compatible wrapper around mysql2 pool
export const db = {
  /**
   * Fetch a single row. Equivalent to sqlite's db.get()
   */
  get: async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  /**
   * Fetch all rows. Equivalent to sqlite's db.all()
   */
  all: async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Run a statement (INSERT/UPDATE/DELETE). Equivalent to sqlite's db.run()
   * Returns { lastID, changes } to stay compatible with existing server.js code.
   */
  run: async (sql, params = []) => {
    const [result] = await pool.execute(sql, params);
    return { lastID: result.insertId, changes: result.affectedRows };
  },

  /**
   * Execute raw SQL (used for schema migrations).
   * mysql2 doesn't support multiple statements in execute(), so we split on semicolons.
   */
  exec: async (sql) => {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      await pool.query(statement);
    }
  },
};

export const getPool = () => pool;
export const getDB = () => db;
