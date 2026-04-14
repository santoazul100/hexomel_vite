const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

async function checkAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "hexomel",
    });

    const [rows] = await connection.execute(
      "SELECT * FROM cliente WHERE UserType = 'admin' OR Email = ?",
      ["admin"],
    );
    console.log("Admin user details:", rows[0] || "Not found");
    
    await connection.end();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkAdmin();
