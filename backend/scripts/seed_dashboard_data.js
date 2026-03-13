import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const seedDashboardData = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "hexomel",
      multipleStatements: true,
    });

    console.log("Connected to MySQL for dashboard seeding.");

    // Clear existing orders to avoid messy charts during tests
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
    await connection.query("TRUNCATE TABLE item_encomenda;");
    await connection.query("TRUNCATE TABLE encomenda;");
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

    const statuses = ['Pago', 'Enviado', 'Entregue', 'Pendente', 'Cancelado'];
    const clients = [2, 5, 6, 7]; // Existing client IDs from seed_test_data.sql
    const products = [
      { id: 1, price: 13.50 },
      { id: 2, price: 12.00 },
      { id: 3, price: 15.50 },
      { id: 4, price: 8.50 },
      { id: 5, price: 10.00 },
      { id: 6, price: 18.00 }
    ];

    console.log("Generating 30 days of orders...");

    const now = new Date();
    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(now);
      orderDate.setDate(now.getDate() - daysAgo);
      orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const clientId = clients[Math.floor(Math.random() * clients.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Randomly pick 1-3 products
      const numItems = Math.floor(Math.random() * 3) + 1;
      let total = 0;
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        total += prod.price * qty;
        items.push({ id: prod.id, qty, price: prod.price });
      }

      const [orderResult] = await connection.execute(
        "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone) VALUES (?, ?, ?, ?, ?, ?)",
        [clientId, orderDate.toISOString().slice(0, 19).replace('T', ' '), total, status, "Rua do Mel, nº 123", "912345678"]
      );

      const orderId = orderResult.insertId;

      for (const item of items) {
        await connection.execute(
          "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
          [orderId, item.id, item.qty, item.price]
        );
      }
    }

    console.log("Dashboard analytics data seeded successfully!");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding dashboard data:", error);
    process.exit(1);
  }
};

seedDashboardData();
