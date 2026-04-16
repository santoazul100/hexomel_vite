import bcrypt from "bcryptjs";
import { db, initDB } from "../config/db.js";

async function createDemoUser() {
    try {
        await initDB();
        
        const email = "demo@hexomel.pt";
        const password = "password123";
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Remove existing if any
        await db.run("DELETE FROM cliente WHERE Email = ?", [email]);
        
        // Insert with Checkout_Verified = 1
        await db.run(
            "INSERT INTO cliente (Nome, Email, Senha, UserType, Checkout_Verified, Is_Verified) VALUES (?, ?, ?, ?, ?, ?)",
            ["Utilizador Demo", email, hashedPassword, "client", 1, 1]
        );
        
        console.log(`Demo user created: ${email} / ${password}`);
        process.exit(0);
    } catch (error) {
        console.error("Failed to create demo user:", error);
        process.exit(1);
    }
}

createDemoUser();
