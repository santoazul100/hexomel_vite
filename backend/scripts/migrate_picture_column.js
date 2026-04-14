import mysql from "mysql2/promise";
import { getDbConfig } from "../config/env.js";

async function migrate() {
  console.log("Starting database migration...");

  try {
    const connection = await mysql.createConnection(getDbConfig());

    console.log("Connected to database.");

    // Alter table to support larger images (LONGTEXT holds up to 4GB)
    console.log("Modifying 'cliente' table 'Picture' column to LONGTEXT...");
    await connection.execute("ALTER TABLE cliente MODIFY Picture LONGTEXT");

    console.log(
      "Migration successful! 'Picture' column can now store large base64 images.",
    );
    await connection.end();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
