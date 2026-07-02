import { db, initDB } from './config/db.js';

async function test() {
    await initDB();
    const rows = await db.all(`
        SELECT r.ID_Reserva, w.Titulo, w.Imagem 
        FROM reserva_workshop r
        JOIN workshop w ON r.ID_Workshop = w.ID_Workshop
        WHERE r.ID_Cliente = 14
    `);
    console.log("Reservas:", rows);
    process.exit(0);
}
test();
