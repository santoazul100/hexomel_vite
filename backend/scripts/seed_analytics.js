import mysql from "mysql2/promise";
import dotenv from "dotenv";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedAnalytics = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: "hexomel",
      multipleStatements: true,
    });

    console.log("Connected to MySQL for analytics seeding.");

    // 1. Clear existing orders to avoid duplicates/confusion if needed
    // We'll just add new ones to top up
    
    const now = new Date();
    const orders = [];
    const orderItems = [];
    
    // Get some products to link to
    const [products] = await connection.query("SELECT ID_Produto, Preco, ID_Apicultor FROM produto");
    const [clients] = await connection.query("SELECT ID_Cliente FROM cliente WHERE UserType = 'client'");

    if (products.length === 0 || clients.length === 0) {
      console.error("Please run db:seed first to have products and clients.");
      process.exit(1);
    }

    console.log(`Found ${products.length} products and ${clients.length} clients.`);

    // Generate orders for the last 30 days
    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(now);
      date.setDate(now.getDate() - daysAgo);
      const dateString = date.toISOString().slice(0, 19).replace('T', ' ');

      const client = clients[Math.floor(Math.random() * clients.length)];
      const statusOptions = ['Pago', 'Enviado', 'Entregue', 'Pendente', 'Cancelado'];
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      
      // Random products for this order
      const numItems = Math.floor(Math.random() * 3) + 1;
      let total = 0;
      const currentOrderItems = [];

      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        total += product.Preco * qty;
        currentOrderItems.push({
          idProduto: product.ID_Produto,
          qty,
          price: product.Preco
        });
      }

      const [orderResult] = await connection.query(
        "INSERT INTO encomenda (ID_Cliente, Total, Status, Data_Encomenda, Morada, Telefone) VALUES (?, ?, ?, ?, ?, ?)",
        [client.ID_Cliente, total, status, dateString, 'Rua de Teste, 123', '912345678']
      );

      const orderId = orderResult.insertId;
      for (const item of currentOrderItems) {
        await connection.query(
          "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
          [orderId, item.idProduto, item.qty, item.price]
        );
      }
    }

    console.log("Successfully seeded 40 random orders for the last 30 days.");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding analytics:", error);
    process.exit(1);
  }
};

seedAnalytics();
