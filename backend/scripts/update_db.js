import mysql from "mysql2/promise";
import { getDbConfig } from "../config/env.js";

const update = async () => {
  try {
    const connection = await mysql.createConnection(
      getDbConfig({ database: "hexomel" }),
    );

    console.log("Connected to hexomel database.");
    
    // Check if column exists
    const [columns] = await connection.query("SHOW COLUMNS FROM `produto` LIKE 'Status'");
    
    if (columns.length === 0) {
      console.log("Adding 'Status' column to 'produto' table...");
      await connection.query("ALTER TABLE `produto` ADD COLUMN `Status` varchar(20) DEFAULT 'Aprovado' AFTER `Tags`");
      console.log("Column 'Status' added successfully.");
      
      // Update any existing products that might have null status
      await connection.query("UPDATE `produto` SET `Status` = 'Aprovado' WHERE `Status` IS NULL");
    } else {
      console.log("Column 'Status' already exists in 'produto' table.");
    }

    await connection.end();
  } catch (error) {
    console.error("UPDATE FAILED:", error);
  }
};

update();
