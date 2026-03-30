import { initDB, db } from './backend/config/db.js';

async function checkDuplicates() {
  try {
    await initDB();
    console.log("Checking for duplicate emails...");
    const rows = await db.all("SELECT Email, COUNT(*) as count FROM cliente GROUP BY Email HAVING count > 1");
    if (rows.length > 0) {
      console.log("Duplicate emails found:", rows);
    } else {
      console.log("No duplicate emails found in DB.");
    }
    
    // Check if Email column is really Unique
    const indexes = await db.all("SHOW INDEX FROM cliente WHERE Column_name = 'Email'");
    console.log("Indexes for Email:", indexes);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkDuplicates();
