import mysql from "mysql2/promise";
import { getDbConfig } from "./config/env.js";

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
  });

  try {
    const [result] = await connection.execute("DELETE FROM reserva_workshop WHERE Status = 'Pendente' AND ID_Encomenda IS NULL");
    console.log(`Deleted ${result.affectedRows} orphaned reservations.`);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
main();
