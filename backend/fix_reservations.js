import mysql from "mysql2/promise";
import { getDbConfig } from "./config/env.js";

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
  });

  try {
    const [result] = await connection.execute(
      "UPDATE reserva_workshop rw JOIN encomenda e ON rw.ID_Encomenda = e.ID_Encomenda SET rw.Status = 'Pago' WHERE e.Status = 'Pago'"
    );
    console.log(`Updated ${result.affectedRows} reservations to Pago.`);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
main();
