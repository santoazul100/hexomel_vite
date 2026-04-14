import mysql from "mysql2/promise";
import { getDbConfig } from "../config/env.js";

const check = async () => {
  try {
    const connection = await mysql.createConnection(getDbConfig());

    console.log("MySQL Database connected successfully.");
    
    console.log("\nTables in database:");
    const [tables] = await connection.query("SHOW TABLES");
    tables.forEach(row => console.log("- " + Object.values(row)[0]));

    console.log("\nColumns in 'produto' table:");
    const [columns] = await connection.query("DESCRIBE produto");
    columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));

    await connection.end();
  } catch (error) {
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error("ERROR: Database 'hexomel' does not exist.");
    } else {
      console.error("Connection error:", error.message);
    }
  }
};

check();
