import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "hexomel",
      multipleStatements: true,
    });

    console.log("Connected to MySQL server for seeding.");

    const sqlPath = path.join(__dirname, "seed_test_data.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Executing seed scripts...");
    await connection.query(sql);

    console.log("Database seeded successfully!");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDB();
