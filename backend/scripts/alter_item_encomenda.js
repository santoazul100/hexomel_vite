import { initDB, db } from '../config/db.js';
import '../config/env.js';

async function run() {
  await initDB();
  try {
    await db.run("ALTER TABLE item_encomenda ADD COLUMN Status VARCHAR(50) NOT NULL DEFAULT 'Em processamento'");
    console.log("Column Status added to item_encomenda");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log("Column already exists");
    else console.error("Error adding column:", err);
  }
  process.exit();
}
run();
