import { db, initDB } from "./config/db.js";

async function migrate() {
    try {
        await initDB();
        console.log("Checking if Morada column exists...");

        // Check if column exists (MySQL)
        const columns = await db.all("SHOW COLUMNS FROM cliente LIKE 'Morada'");

        if (columns.length === 0) {
            console.log("Adding Morada column to cliente table...");
            await db.run("ALTER TABLE cliente ADD COLUMN Morada TEXT DEFAULT NULL AFTER Telefone");
            console.log("Migration successful!");
        } else {
            console.log("Morada column already exists.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
