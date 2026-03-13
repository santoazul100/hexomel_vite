import { db, initDB } from "../config/db.js";

async function addMissingColumns() {
    try {
        await initDB();
        console.log("Checking for missing columns in 'cliente' table...");

        const columns = await db.all("SHOW COLUMNS FROM cliente");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('Telefone')) {
            console.log("Adding 'Telefone' column...");
            await db.run("ALTER TABLE cliente ADD COLUMN Telefone VARCHAR(30) DEFAULT NULL AFTER Email");
        } else {
            console.log("'Telefone' column already exists.");
        }

        if (!columnNames.includes('Morada')) {
            console.log("Adding 'Morada' column...");
            // If Telefone was just added, we want Morada after it if possible, otherwise just add it
            const currentColumns = await db.all("SHOW COLUMNS FROM cliente");
            const currentNames = currentColumns.map(c => c.Field);
            const afterColumn = currentNames.includes('Telefone') ? 'AFTER Telefone' : 'AFTER Email';
            
            await db.run(`ALTER TABLE cliente ADD COLUMN Morada TEXT DEFAULT NULL ${afterColumn}`);
        } else {
            console.log("'Morada' column already exists.");
        }

        console.log("Migration check complete.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

addMissingColumns();
