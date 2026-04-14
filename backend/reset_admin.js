import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { getDbConfig } from "./config/env.js";

const ADMIN_EMAIL = "admin";
const ADMIN_PASSWORD = "admin";

const resetAdmin = async () => {
  const connection = await mysql.createConnection(
    getDbConfig({ database: "hexomel" }),
  );

  const hash = await bcrypt.hash("admin", 10);

  // 1. Try to find any existing admin
  const [admins] = await connection.execute(
    "SELECT * FROM `cliente` WHERE `UserType` = 'admin' OR `Email` = ?",
    [ADMIN_EMAIL]
  );

  if (admins.length > 0) {
    // Update the first admin found
    const adminId = admins[0].ID_Cliente;
    await connection.execute(
      "UPDATE `cliente` SET `Senha` = ?, `Nome` = ?, `Email` = ?, `UserType` = 'admin' WHERE `ID_Cliente` = ?",
      [hash, "Admin", ADMIN_EMAIL, adminId]
    );
    console.log("✅ Admin updated successfully!");
  } else {
    // Create new admin
    await connection.execute(
      "INSERT INTO `cliente` (`Nome`, `Email`, `Senha`, `UserType`) VALUES (?, ?, ?, ?)",
      ["Admin", ADMIN_EMAIL, hash, "admin"]
    );
    console.log("✅ New admin created successfully!");
  }

  console.log(`   User/Email: admin / ${ADMIN_EMAIL}`);
  console.log(`   Password:   admin`);

  await connection.end();
  process.exit(0);
};

resetAdmin().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
