import { initDB, db } from "../config/db.js";

async function check() {
  try {
    await initDB();
    const rows = await db.all("SELECT * FROM site_slugs");
    console.log("CURRENT SITE SLUGS:");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

check();
