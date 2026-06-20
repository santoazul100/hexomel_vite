import mysql from "mysql2/promise";
import "./config/env.js";
import { getDbConfig } from "./config/env.js";

async function main() {
  const config = getDbConfig();
  const connection = await mysql.createConnection({
    ...config,
    charset: "utf8mb4",
  });

  try {
    console.log("Starting DB Menu migration...");

    // 1. Find Discover menu ID
    const [discoverRows] = await connection.execute(
      "SELECT ID_Menu FROM menu_nav WHERE Label = 'Descobrir' OR Label = 'Discover'"
    );
    
    if (discoverRows.length === 0) {
      console.error("Could not find 'Descobrir' menu item!");
      return;
    }

    const discoverId = discoverRows[0].ID_Menu;
    console.log(`Found 'Descobrir' menu item with ID: ${discoverId}`);

    // 2. Move and rename Rede Social to HexoHive
    const [socialUpdate] = await connection.execute(
      "UPDATE menu_nav SET Label = 'HexoHive', ID_Parent = ?, Link = 'rede-social.html' WHERE Link = 'rede-social.html' OR Label = 'Rede Social'",
      [discoverId]
    );
    console.log(`Updated Rede Social menu item: ${socialUpdate.affectedRows} rows affected`);

    // 3. Add or update 'Mensagens' menu item
    const [messagesRows] = await connection.execute(
      "SELECT ID_Menu FROM menu_nav WHERE Link = 'profile.html?tab=messages'"
    );

    if (messagesRows.length === 0) {
      // Find max ordering
      const [orderRows] = await connection.execute(
        "SELECT MAX(Ordenacao) as m FROM menu_nav WHERE ID_Parent = ?",
        [discoverId]
      );
      const nextOrder = (orderRows[0].m || 0) + 1;
      
      const [messagesInsert] = await connection.execute(
        "INSERT INTO menu_nav (Label, Link, Ordenacao, Ativo, ID_Parent) VALUES ('Mensagens', 'profile.html?tab=messages', ?, 1, ?)",
        [nextOrder, discoverId]
      );
      console.log(`Inserted Mensagens menu item with ID: ${messagesInsert.insertId}`);
    } else {
      const [messagesUpdate] = await connection.execute(
        "UPDATE menu_nav SET Label = 'Mensagens', ID_Parent = ? WHERE Link = 'profile.html?tab=messages'",
        [discoverId]
      );
      console.log(`Updated existing Mensagens menu item: ${messagesUpdate.affectedRows} rows affected`);
    }

    // 4. Verify results
    const [resultRows] = await connection.execute(
      "SELECT * FROM menu_nav ORDER BY Ordenacao ASC"
    );
    console.log("\nUPDATED menu_nav:");
    console.log(resultRows);

  } catch (err) {
    console.error("Error running migration:", err);
  } finally {
    await connection.end();
  }
}

main();
