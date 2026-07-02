import mysql from "mysql2/promise";
import { getDbConfig } from "./config/env.js";

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
  });

  try {
    await connection.execute("UPDATE encomenda SET Status = 'Pago' WHERE ID_Encomenda = 13");
    await connection.execute("UPDATE reserva_workshop SET Status = 'Pago' WHERE ID_Encomenda = 13");
    console.log("Updated encomenda 13 and its reservations to Pago!");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
main();
