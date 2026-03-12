import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const inspect = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      // Don't specify database yet
    });

    const [dbInfo] = await connection.query("SELECT DATABASE(), VERSION(), @@port");
    console.log("--- Instance Info ---");
    console.log(dbInfo[0]);

    await connection.query("USE hexomel");
    const [tables] = await connection.query("SHOW TABLES");
    console.log("\n--- Tables in 'hexomel' ---");
    console.table(tables);

    for (const t of ['origem', 'carrinho', 'produto']) {
        try {
            const [cols] = await connection.query(`DESCRIBE ${t}`);
            console.log(`\nColumns for ${t}:`);
            console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
        } catch (e) {
            console.log(`\nError describing ${t}: ${e.message}`);
        }
    }

    await connection.end();
  } catch (error) {
    console.error("INSPECTION FAILED:", error);
  }
};

inspect();
