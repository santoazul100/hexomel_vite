import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "c:/escola/pap/code/hexomel_vite/backend/.env" });

const diagnose = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "hexomel",
    });

    console.log("Connected to hexomel database.");
    
    const [tables] = await connection.query("SHOW TABLES");
    console.log("Existing Tables:");
    console.table(tables);

    const tablesToVerify = ['cliente', 'categoria', 'origem', 'produto', 'carrinho', 'item_carrinho', 'encomenda', 'item_encomenda', 'favoritos', 'avaliacao', 'workshop'];
    const existingTableNames = tables.map(t => Object.values(t)[0]);
    
    console.log("\nVerification Status:");
    tablesToVerify.forEach(t => {
        const exists = existingTableNames.includes(t);
        console.log(`${t}: ${exists ? "OK ✅" : "MISSING ❌"}`);
    });

    await connection.end();
  } catch (error) {
    console.error("DIAGNOSTIC FAILED:", error);
  }
};

diagnose();
