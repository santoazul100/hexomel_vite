import path from "path";
import { fileURLToPath } from "url";
import "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initDB, db } from "./config/db.js";

const testAnalytics = async () => {
  try {
    await initDB();
    console.log("--- Analytics Data Verification ---");

    // 1. Check Sales last 30 days
    const sales30d = await db.all(`
      SELECT DATE(Data_Encomenda) as date, SUM(Total) as revenue, COUNT(ID_Encomenda) as count
      FROM encomenda
      WHERE Status IN ('Pago', 'Enviado', 'Entregue')
      AND Data_Encomenda >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(Data_Encomenda)
      ORDER BY date ASC
    `);
    console.log("Sales (30d):", sales30d.length, "days found");

    // 2. Orders by Status
    const ordersByStatus = await db.all(`
      SELECT Status as status, COUNT(ID_Encomenda) as count
      FROM encomenda
      GROUP BY Status
    `);
    console.log("Orders by Status:", JSON.stringify(ordersByStatus));

    // 3. Top Products
    const topProducts = await db.all(`
      SELECT p.Nome as name, SUM(ie.Quantidade * ie.Preco_Unitario) as revenue
      FROM item_encomenda ie
      JOIN produto p ON ie.ID_Produto = p.ID_Produto
      JOIN encomenda e ON ie.ID_Encomenda = e.ID_Encomenda
      WHERE e.Status IN ('Pago', 'Enviado', 'Entregue')
      GROUP BY p.ID_Produto
      ORDER BY revenue DESC
      LIMIT 10
    `);
    console.log("Top Products:", topProducts.length, "items found");
    if (topProducts.length > 0) console.log("Top Product:", topProducts[0].name, "-", topProducts[0].revenue + "€");

    // 4. Sales by Beekeeper
    const salesByBeekeeper = await db.all(`
      SELECT c.Nome as name, SUM(ie.Quantidade * ie.Preco_Unitario) as revenue
      FROM item_encomenda ie
      JOIN produto p ON ie.ID_Produto = p.ID_Produto
      JOIN cliente c ON p.ID_Apicultor = c.ID_Cliente
      JOIN encomenda e ON ie.ID_Encomenda = e.ID_Encomenda
      WHERE e.Status IN ('Pago', 'Enviado', 'Entregue')
      AND c.UserType = 'apicultor'
      GROUP BY c.ID_Cliente
      ORDER BY revenue DESC
    `);
    console.log("Sales by Beekeeper:", salesByBeekeeper.length, "beekeepers found");

    // 5. Overall Stats
    const stats = await db.get(`
      SELECT 
        SUM(CASE WHEN Status IN ('Pago', 'Enviado', 'Entregue') THEN Total ELSE 0 END) as totalRevenue,
        COUNT(ID_Encomenda) as totalOrders
      FROM encomenda
    `);
    const totalRevenue = parseFloat(stats.totalRevenue || 0);
    const totalOrders = stats.totalOrders || 0;
    const aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00";
    
    console.log("Stats - Revenue:", totalRevenue, "Orders:", totalOrders, "AOV:", aov);

    console.log("--- End of Verification ---");
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
};

testAnalytics();
