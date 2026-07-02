import mysql from "mysql2/promise";
import { getDbConfig } from "./config/env.js";

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
  });

  try {
    const [rows] = await connection.execute("SELECT * FROM reserva_workshop WHERE Status = 'Pendente'");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
main();
