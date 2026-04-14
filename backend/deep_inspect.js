import mysql from "mysql2/promise";
import { getServerDbConfig } from "./config/env.js";

const inspect = async () => {
  try {
    const connection = await mysql.createConnection(getServerDbConfig());

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
