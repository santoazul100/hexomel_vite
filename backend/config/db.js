import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool;

export const initDB = async () => {
  try {
    // Create connection pool
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "hexomel",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log("MySQL Database connected successfully.");
    connection.release();

    return pool;
  } catch (error) {
    console.error("MySQL connection error:", error);
    throw error;
  }
};

export const getPool = () => pool;
