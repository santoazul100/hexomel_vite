import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: "c:/escola/pap/code/hexomel_vite/backend/.env" });

const verify = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "hexomel",
    });

    const [products] = await connection.query("SELECT COUNT(*) as count FROM produto");
    const [categories] = await connection.query("SELECT COUNT(*) as count FROM categoria");
    const [origins] = await connection.query("SELECT COUNT(*) as count FROM origem");
    const [reviews] = await connection.query("SELECT COUNT(*) as count FROM avaliacao");

    console.log("--- Database Verification ---");
    console.log(`Products: ${products[0].count}`);
    console.log(`Categories: ${categories[0].count}`);
    console.log(`Origins: ${origins[0].count}`);
    console.log(`Reviews: ${reviews[0].count}`);
    console.log("-----------------------------");

    await connection.end();
  } catch (error) {
    console.error("Verification failed:", error);
  }
};

verify();
