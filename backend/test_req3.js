import { db, initDB } from './config/db.js';

async function test() {
    await initDB();
    const clients = await db.all("SELECT ID_Cliente, Nome, Email, Username FROM cliente");
    console.log("Clientes:", clients);
    
    const reservations = await db.all("SELECT * FROM reserva_workshop");
    console.log("All Reservas:", reservations);
    process.exit(0);
}
test();
