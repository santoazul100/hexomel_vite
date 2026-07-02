import { db, initDB } from './config/db.js';

async function test() {
    await initDB();
    const rows = await db.all("SELECT * FROM cliente WHERE Email = 'rodrigofcosta.silva@gmail.com'");
    if (rows.length > 0) {
        console.log("Cliente:", rows[0].ID_Cliente, rows[0].Nome);
        const reqs = await db.all("SELECT * FROM upgrade_requests WHERE ID_Cliente = ?", [rows[0].ID_Cliente]);
        console.log("Requests:", reqs);
    } else {
        console.log("User not found");
    }
    process.exit(0);
}
test();
