import mysql from "mysql2/promise";
import { getDbConfig } from "./env.js";

let pool;

const ensurePool = () => {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initDB() first.");
  }
  return pool;
};

export const initDB = async () => {
  if (!pool) {
    pool = mysql.createPool({
      ...getDbConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  }

  // Test the connection
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("MySQL Database connected successfully.");
  } catch (error) {
    console.error("MySQL connection error:", error);
    throw error;
  }

  // Return the database object
  return db;
};

// Database wrapper around mysql2 pool
export const db = {
  get: async (sql, params = []) => {
    const [rows] = await ensurePool().execute(sql, params);
    return rows[0] || null;
  },

  all: async (sql, params = []) => {
    const [rows] = await ensurePool().execute(sql, params);
    return rows;
  },

  run: async (sql, params = []) => {
    const [result] = await ensurePool().execute(sql, params);
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
      await ensurePool().query(statement);
    }
  },

  transaction: async (callback) => {
    const pool = ensurePool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const trxDb = {
        get: async (sql, params = []) => {
          const [rows] = await conn.execute(sql, params);
          return rows[0] || null;
        },
        all: async (sql, params = []) => {
          const [rows] = await conn.execute(sql, params);
          return rows;
        },
        run: async (sql, params = []) => {
          const [result] = await conn.execute(sql, params);
          return { lastID: result.insertId, changes: result.affectedRows };
        }
      };
      const result = await callback(trxDb);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

export const getPool = () => pool;
export const getDB = () => db;
