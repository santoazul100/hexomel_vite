import { initDB, db } from "./config/db.js";

const runTest = async () => {
  try {
    await initDB();
    console.log("Connected using config/db.js");

    const tablesToCheck = ['origem', 'carrinho', 'favoritos'];
    for (const table of tablesToCheck) {
      try {
        const rows = await db.all(`SELECT * FROM ${table} LIMIT 1`);
        console.log(`Table ${table}: FOUND ✅ (${rows.length} rows)`);
      } catch (e) {
        console.log(`Table ${table}: NOT FOUND ❌ - Error: ${e.message}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
};

runTest();
