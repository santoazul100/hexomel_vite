import { db, initDB } from './config/db.js';

async function test() {
    await initDB();
    const rows = await db.all("SELECT ID_Workshop, Titulo, Imagem FROM workshop WHERE ID_Workshop = 3");
    console.log("Workshop:", rows);
    process.exit(0);
}
test();
