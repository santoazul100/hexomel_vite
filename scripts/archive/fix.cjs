const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
const startStr = 'async function cleanupPendingOrders() {';
const start = c.indexOf(startStr);
if (start > -1) {
  const replacement = `async function cleanupPendingOrders() {
  try {
    console.log("🧹 Running cleanup for expired pending orders...");
    const result = await db.run(\`DELETE FROM encomenda WHERE Status = 'Pendente' AND Data_Encomenda < DATE_SUB(NOW(), INTERVAL 1 DAY)\`);
    if (result.changes > 0) {
      console.log(\`✅ Cleaned up \${result.changes} expired orders.\`);
    }
  } catch (error) {
    if (error.code !== "ECONNREFUSED" && error.message !== "Database pool not initialized. Call initDB() first.") {
        console.error("Cleanup error:", error);
    }
  }
}`;
  const endStr = 'setInterval(cleanupPendingOrders, 60 * 60 * 1000);';
  const end = c.indexOf(endStr);
  if (end > -1) {
    c = c.substring(0, start) + replacement + '\n\n// Run cleanup every hour\n' + c.substring(end);
    fs.writeFileSync('backend/server.js', c, 'utf8');
    console.log('Fixed successfully.');
  } else {
    console.log('End not found');
  }
} else {
  console.log('Start not found');
}
