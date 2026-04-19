import bcrypt from "bcryptjs";
import { db, initDB } from "../config/db.js";

async function createAdminUser() {
    try {
        await initDB();
        
        const email = "admin@hexomel.pt";
        const password = "admin123";
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Remove existing if any
        await db.run("DELETE FROM cliente WHERE Email = ?", [email]);
        
        // Insert Admin
        await db.run(
            "INSERT INTO cliente (Nome, Email, Senha, UserType, Checkout_Verified, Is_Verified) VALUES (?, ?, ?, ?, ?, ?)",
            ["Administrador", email, hashedPassword, "admin", 1, 1]
        );
        
        console.log(`Admin user created: ${email} / ${password}`);
        process.exit(0);
    } catch (error) {
        console.error("Failed to create admin user:", error);
        process.exit(1);
    }
}

createAdminUser();
