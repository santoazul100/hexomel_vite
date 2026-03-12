import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAIL = "rodrigo@hexomel.pt";
const ADMIN_PASSWORD = "admin123";

const resetAdmin = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: "hexomel",
  });

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const [result] = await connection.execute(
    "UPDATE `cliente` SET `Senha` = ? WHERE `Email` = ?",
    [hash, ADMIN_EMAIL]
  );

  if (result.affectedRows === 0) {
    console.error("❌ Admin not found! Make sure the seed was run first.");
  } else {
    console.log("✅ Admin password reset successfully!");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  }

  await connection.end();
  process.exit(0);
};

resetAdmin().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
