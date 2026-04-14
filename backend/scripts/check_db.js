import mysql from "mysql2/promise";
import { getDbConfig } from "../config/env.js";

const checkSchema = async () => {
  try {
    const connection = await mysql.createConnection(
      getDbConfig({ database: "hexomel" }),
    );

    const [rows] = await connection.query("DESCRIBE cliente");
    console.log("Columns in cliente table:");
    rows.forEach(row => console.log(`- ${row.Field} (${row.Type})`));

    const [users] = await connection.query("SELECT Email, UserType, Senha FROM cliente WHERE UserType = 'admin' OR Email = 'rodrigo@hexomel.pt'");
    console.log("\nAdmin users found:");
    users.forEach(u => console.log(`- ${u.Email} [${u.UserType}] Hash excerpt: ${u.Senha.substring(0, 10)}...`));

    await connection.end();
  } catch (err) {
    console.error("Error:", err);
  }
};

checkSchema();
