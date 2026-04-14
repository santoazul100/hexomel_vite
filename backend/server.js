import express from "express";
import cors from "cors";
import "./config/env.js";
import { initDB, db } from "./config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { authenticateToken, isAdmin } from "./middleware/auth.js";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "placeholder" 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================================
// EMAIL TRANSPORTER (Nodemailer)
// ============================================================
let mailTransporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  mailTransporter.verify()
    .then(() => console.log("📧 Email transporter ready."))
    .catch((err) => console.warn("⚠️ Email transporter failed:", err.message));
} else {
  console.log("⚠️ SMTP_USER/SMTP_PASS not set — emails disabled (dev mode).");
}

// Generate Receipt HTML (used for email and download)
function generateReceiptHTML(order, items, customerName, customerEmail) {
  const orderDate = new Date(order.Data_Encomenda || order.date).toLocaleDateString("pt-PT", {
    year: "numeric", month: "long", day: "numeric",
  });
  const subtotal = items.reduce((sum, i) => sum + i.Preco_Unitario * i.Quantidade, 0);
  const total = parseFloat(order.Total || order.total);
  const shipping = total - subtotal;

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:15px 10px; border-bottom:1px solid #edf2f7;">
        <div style="font-weight:700; color:#1a4d2e; font-size:0.95rem;">${i.Nome}</div>
        <div style="font-size:0.8rem; color:#718096; margin-top:2px;">Mel Premium Hexomel</div>
      </td>
      <td style="padding:15px 10px; border-bottom:1px solid #edf2f7; text-align:center; color:#2d3748;">${i.Quantidade}</td>
      <td style="padding:15px 10px; border-bottom:1px solid #edf2f7; text-align:right; color:#2d3748;">€${parseFloat(i.Preco_Unitario).toFixed(2)}</td>
      <td style="padding:15px 10px; border-bottom:1px solid #edf2f7; text-align:right; font-weight:700; color:#1a4d2e;">€${(i.Preco_Unitario * i.Quantidade).toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo Hexomel #${order.ID_Encomenda || order.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    body { margin:0; padding:0; font-family:'Outfit',sans-serif; background:#f4f7f6; color:#2d3748; }
    .container { max-width:700px; margin:40px auto; background:#fff; border-radius:24px; overflow:hidden; box-shadow:0 20px 50px rgba(26,77,46,0.12); position:relative; }
    .header { background:linear-gradient(135deg,#1a4d2e 0%,#143d24 100%); padding:50px 40px; text-align:center; color:#fff; position:relative; }
    .header::after { content:''; position:absolute; bottom:0; left:0; width:100%; height:5px; background:linear-gradient(to right, #f4b400, #c9b037); }
    .header h1 { font-size:2.2rem; font-weight:700; margin:0 0 10px; letter-spacing:-1px; }
    .header p { opacity:0.8; font-size:1.1rem; margin:0; font-weight:300; }
    .badge-status { display:inline-block; background:rgba(244,180,0,0.2); color:#f4b400; padding:6px 18px; border-radius:50px; font-weight:700; font-size:0.75rem; margin-top:20px; border:1px solid rgba(244,180,0,0.3); letter-spacing:1px; text-transform:uppercase; }
    .content { padding:50px 40px; }
    .info-section { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:40px; }
    .info-card { background:#fcfdfc; padding:20px; border-radius:18px; border:1px solid #eef2f0; }
    .info-card .label { font-size:0.7rem; color:#a0aec0; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:8px; }
    .info-card .value { font-size:1rem; font-weight:600; color:#1a4d2e; }
    table { width:100%; border-collapse:collapse; margin-bottom:30px; }
    thead th { text-align:left; padding:15px 10px; font-size:0.75rem; text-transform:uppercase; color:#718096; border-bottom:2px solid #edf2f7; }
    .totals-box { background:#fcfdfc; border-radius:18px; padding:25px; border:1px solid #eef2f0; margin-left:auto; width:100%; max-width:300px; }
    .total-row { display:flex; justify-content:space-between; padding:8px 0; font-size:0.95rem; }
    .total-row.grand-total { border-top:1px solid #edf2f7; margin-top:15px; padding-top:15px; font-size:1.25rem; font-weight:700; color:#1a4d2e; }
    .footer { padding:40px; background:#fcfdfc; border-top:1px solid #edf2f7; text-align:center; }
    .footer p { font-size:0.85rem; color:#718096; margin:4px 0; }
    .footer .thank-you { font-weight:700; color:#1a4d2e; font-size:1.1rem; margin-bottom:12px; }
    @media print { body { background:#fff; } .container { box-shadow:none; margin:0; width:100%; } .footer { margin-top:30px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐝 Hexomel</h1>
      <p>Mel das Terras Portuguesas</p>
      <div class="badge-status">Recibo Digital Confirmado</div>
    </div>
    <div class="content">
      <div class="info-section">
        <div class="info-card">
          <div class="label">Encomenda</div>
          <div class="value">#${order.ID_Encomenda || order.id}</div>
        </div>
        <div class="info-card">
          <div class="label">Data de Emissão</div>
          <div class="value">${orderDate}</div>
        </div>
      </div>
      <div class="info-section">
        <div class="info-card">
          <div class="label">Cliente</div>
          <div class="value">${customerName}</div>
        </div>
        <div class="info-card">
          <div class="label">Método</div>
          <div class="value">Pagamento Seguro (Stripe)</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th style="text-align:center">Qtd</th>
            <th style="text-align:right">Preço</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>€${subtotal.toFixed(2)}</span></div>
        ${shipping > 0.05 ? `<div class="total-row"><span>Portes</span><span>€${shipping.toFixed(2)}</span></div>` : ""}
        <div class="total-row grand-total"><span>Total</span><span>€${total.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="footer">
      <p class="thank-you">Obrigado pela preferência!</p>
      <p>Este documento serve como prova de compra digital.</p>
      <p>Dúvidas? Contacte-nos em <a href="mailto:suporte@hexomel.pt" style="color:#f4b400;text-decoration:none;">suporte@hexomel.pt</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Send Receipt Email
async function sendReceiptEmail(orderId) {
  if (!mailTransporter) {
    console.log(`📧 Email skipped (no SMTP) for order #${orderId}`);
    return;
  }
  try {
    const order = await db.get("SELECT * FROM encomenda WHERE ID_Encomenda = ?", [orderId]);
    if (!order) return;

    const customer = await db.get("SELECT Nome, Email FROM cliente WHERE ID_Cliente = ?", [order.ID_Cliente]);
    if (!customer || !customer.Email) return;

    const items = await db.all(
      `SELECT ie.*, p.Nome FROM item_encomenda ie JOIN produto p ON ie.ID_Produto = p.ID_Produto WHERE ie.ID_Encomenda = ?`,
      [orderId]
    );

    const html = generateReceiptHTML(order, items, customer.Nome, customer.Email);

    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || "Hexomel <noreply@hexomel.pt>",
      to: customer.Email,
      subject: `🍯 Recibo da Encomenda #${orderId} — Hexomel`,
      html,
    });
    console.log(`📧 Receipt email sent for order #${orderId} to ${customer.Email}`);
  } catch (err) {
    console.error(`📧 Failed to send receipt email for order #${orderId}:`, err.message);
  }
}
// Initialize Database
initDB()
  .then(async () => {
    console.log("MySQL Database connected and initialized.");

    try {
      // Auto-migration for new features (ignores errors if exist)
      await db
        .run("ALTER TABLE cliente ADD COLUMN Bio TEXT DEFAULT NULL")
        .catch(() => console.log("Bio col already exists"));

      await db
        .run("ALTER TABLE cliente ADD COLUMN Username VARCHAR(60) DEFAULT NULL")
        .catch(() => console.log("Username col already exists"));

      await db
        .run(
          `
            CREATE TABLE IF NOT EXISTS workshop (
                ID_Workshop int(10) NOT NULL AUTO_INCREMENT,
                Titulo varchar(150) NOT NULL,
                Descricao text NOT NULL,
                Data_Realizacao datetime NOT NULL,
                Preco decimal(10,2) NOT NULL,
                Vagas int(11) NOT NULL,
                Imagem varchar(255) DEFAULT NULL,
                Status varchar(20) DEFAULT 'Pendente',
                ID_Apicultor int(10) NOT NULL,
                Data_Criacao timestamp DEFAULT current_timestamp(),
                PRIMARY KEY (ID_Workshop),
                KEY ID_Apicultor (ID_Apicultor),
                CONSTRAINT fk_workshop_apicultor FOREIGN KEY (ID_Apicultor) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `,
        )
        .catch(() => console.log("Workshop table creation handled"));

      await db
        .run("ALTER TABLE workshop ADD COLUMN Status VARCHAR(20) DEFAULT 'Pendente'")
        .catch(() => console.log("Workshop Status col already exists"));

      await db
        .run(
          `
            CREATE TABLE IF NOT EXISTS upgrade_requests (
                ID_Request int(10) NOT NULL AUTO_INCREMENT,
                ID_Cliente int(10) NOT NULL,
                Descricao TEXT NOT NULL,
                Documento varchar(255) NOT NULL,
                Status varchar(20) DEFAULT 'Pendente',
                Data_Pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                Data_Processamento TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (ID_Request),
                KEY ID_Cliente (ID_Cliente),
                CONSTRAINT fk_upgrade_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `,
        )
        .catch(() => console.log("Upgrade requests table creation handled"));

      await db
        .run(
          `
            CREATE TABLE IF NOT EXISTS interacao (
                ID_Interacao bigint(20) NOT NULL AUTO_INCREMENT,
                ID_Cliente int(10) DEFAULT NULL,
                Tipo varchar(50) NOT NULL,
                Pagina varchar(100) DEFAULT NULL,
                Dados JSON DEFAULT NULL,
                Data_Interacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ID_Interacao),
                KEY idx_cliente (ID_Cliente),
                KEY idx_tipo (Tipo),
                KEY idx_data (Data_Interacao),
                CONSTRAINT fk_interacao_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `,
        )
        .catch(() => console.log("interacao table already exists"));

      console.log("Auto-migrations completed.");
    } catch (err) {
      console.log("Migration warning:", err);
    }

    // Start Server ONLY after DB is ready
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Stop the other backend instance or change PORT in backend/.env.`,
        );
      } else {
        console.error("Server startup error:", error);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save to frontend public folder so Vite serves it
    const uploadPath = path.join(__dirname, "../frontend/public/uploads");
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Unique filename: timestamp + original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Upload Endpoint
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Return path relative to public folder (accessible via web)
  const relativePath = `/uploads/${req.file.filename}`;
  res.json({ path: relativePath });
});

// Basic health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Hexomel API is running" });
});

// AUTH ROUTES
// Register
app.post("/api/auth/register", async (req, res) => {
  let { firstName, lastName, email, username, password } = req.body;

  if (!email || !password || !firstName || !lastName || !username) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  email = email.toLowerCase().trim();
  username = username.trim();

  try {
    // Check if user exists by email OR username
    const row = await db.get("SELECT * FROM cliente WHERE Email = ? OR (Username IS NOT NULL AND Username = ?)", [email, username]);
    if (row) {
      const field = row.Email.toLowerCase() === email ? "Email" : "Nome de utilizador";
      return res.status(400).json({ error: `${field} já está em uso.` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const fullName = `${firstName} ${lastName}`.trim();

    // Insert user with Username (defaults to client)
    const result = await db.run(
      "INSERT INTO cliente (Nome, Email, Username, Senha, UserType) VALUES (?, ?, ?, ?, ?)",
      [
        fullName,
        email,
        username,
        hashedPassword,
        "client",
      ],
    );

    // Auto-login: Get the new user
    const user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [
      result.lastID,
    ]);

    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        username: user.Username,
        picture: user.Picture,
        UserType: user.UserType,
        role: user.UserType, // Standardized
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating user" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  // Accept either `identifier` (new) or legacy `email` field
  let identifier = req.body.identifier || req.body.email;
  const { password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/username e password são obrigatórios" });
  }

  identifier = identifier.toLowerCase().trim();

  try {
    // Try to find user by email OR username
    let user = await db.get("SELECT * FROM cliente WHERE Email = ? OR Username = ?", [identifier, identifier]);
    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );
    res.json({
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        UserType: user.UserType || "client",
        role: user.UserType || "client", // Standardized
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Google Auth
app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase().trim();
    const { name, picture } = payload;
    console.log("Google Login Payload:", { email, name, picture });

    let user = await db.get("SELECT * FROM cliente WHERE Email = ?", [email]);
    if (!user) {
      const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await db.run(
        "INSERT INTO cliente (Nome, Email, Senha, Picture) VALUES (?, ?, ?, ?)",
        [name, email, randomPass, picture],
      );
      user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [
        result.lastID,
      ]);
    } else if (!user.Picture && picture) {
      // Sync picture if it was missing
      await db.run("UPDATE cliente SET Picture = ? WHERE ID_Cliente = ?", [
        picture,
        user.ID_Cliente,
      ]);
      user.Picture = picture;
    }

    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );
    res.json({
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        UserType: user.UserType || "client",
        role: user.UserType || "client", // Standardized
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

// Get all categories (Public view)
app.get("/api/categories", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM categoria");
    res.json(rows);
  } catch (error) {
    console.error("Categories fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Create category (Admin view)
app.post(
  "/api/admin/categories",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "Nome da categoria é obrigatório" });
    }
    try {
      const result = await db.run("INSERT INTO categoria (Nome) VALUES (?)", [
        nome,
      ]);
      const newCategory = await db.get(
        "SELECT * FROM categoria WHERE ID_Categoria = ?",
        [result.lastID],
      );
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Get all origins (Public view)
app.get("/api/origins", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM origem ORDER BY Nome ASC");
    res.json(rows);
  } catch (error) {
    console.error("Origins fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Create origin (Admin view)
app.post("/api/admin/origins", authenticateToken, isAdmin, async (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    return res.status(400).json({ error: "Nome da origem é obrigatório" });
  }
  try {
    const result = await db.run("INSERT INTO origem (Nome) VALUES (?)", [nome]);
    const newOrigin = await db.get("SELECT * FROM origem WHERE ID_Origem = ?", [
      result.lastID,
    ]);
    res.status(201).json(newOrigin);
  } catch (error) {
    console.error("Create origin error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Update origin (Admin view)
app.put(
  "/api/admin/origins/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "Nome da origem é obrigatório" });
    }
    try {
      await db.run("UPDATE origem SET Nome = ? WHERE ID_Origem = ?", [
        nome,
        id,
      ]);
      const updatedOrigin = await db.get(
        "SELECT * FROM origem WHERE ID_Origem = ?",
        [id],
      );
      res.json(updatedOrigin);
    } catch (error) {
      console.error("Update origin error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Delete origin (Admin view)
app.delete(
  "/api/admin/origins/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM origem WHERE ID_Origem = ?", [id]);
      res.json({ message: "Origin deleted successfully" });
    } catch (error) {
      console.error("Delete origin error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Update category (Admin view)
app.put(
  "/api/admin/categories/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    if (!nome) {
      return res.status(400).json({ error: "Nome da categoria é obrigatório" });
    }
    try {
      await db.run("UPDATE categoria SET Nome = ? WHERE ID_Categoria = ?", [
        nome,
        id,
      ]);
      const updatedCategory = await db.get(
        "SELECT * FROM categoria WHERE ID_Categoria = ?",
        [id],
      );
      res.json(updatedCategory);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Delete category (Admin view)
app.delete(
  "/api/admin/categories/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM categoria WHERE ID_Categoria = ?", [id]);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Get all products (Public view)
app.get("/api/products", async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT p.*, 
      COALESCE(AVG(a.Nota), 0) as Rating, 
      COUNT(a.ID_Avaliacao) as ReviewCount,
      c.Nome as ApicultorNome
      FROM produto p
      LEFT JOIN avaliacao a ON p.ID_Produto = a.ID_Produto
      LEFT JOIN cliente c ON p.ID_Apicultor = c.ID_Cliente
      WHERE p.Status = 'Aprovado' OR p.Status IS NULL
      GROUP BY p.ID_Produto
      ORDER BY p.ID_Produto DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Products fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// ADMIN PRODUCT CRUD
// Get all products (Admin view)
app.get("/api/admin/products", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM produto ORDER BY ID_Produto DESC");
    res.json(rows);
  } catch (error) {
    console.error("Admin products fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Create product
app.post(
  "/api/admin/products",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const {
      nome,
      preco,
      stock,
      idCategoria,
      idOrigem,
      descricao,
      imagem,
      tags,
    } = req.body;
    try {
      const result = await db.run(
        "INSERT INTO produto (Nome, Preco, Stock, ID_Categoria, ID_Origem, Descricao, Imagem, Tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [nome, preco, stock, idCategoria, idOrigem, descricao, imagem, tags],
      );
      const newProduct = await db.get(
        "SELECT * FROM produto WHERE ID_Produto = ?",
        [result.lastID],
      );
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Update product
app.put(
  "/api/admin/products/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const {
      nome,
      preco,
      stock,
      idCategoria,
      idOrigem,
      descricao,
      imagem,
      tags,
    } = req.body;
    try {
      await db.run(
        "UPDATE produto SET Nome = ?, Preco = ?, Stock = ?, ID_Categoria = ?, ID_Origem = ?, Descricao = ?, Imagem = ?, Tags = ? WHERE ID_Produto = ?",
        [
          nome,
          preco,
          stock,
          idCategoria,
          idOrigem,
          descricao,
          imagem,
          tags,
          id,
        ],
      );
      const updatedProduct = await db.get(
        "SELECT * FROM produto WHERE ID_Produto = ?",
        [id],
      );
      res.json(updatedProduct);
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Update product status (Admin only)
app.patch(
  "/api/admin/products/:id/status",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["Aprovado", "Pendente", "Rejeitado"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    
    try {
      await db.run("UPDATE produto SET Status = ? WHERE ID_Produto = ?", [
        status,
        id,
      ]);
      res.json({ message: "Product status updated successfully", status });
    } catch (error) {
      console.error("Update product status error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// APICULTOR PRODUCT CREATION
app.post("/api/apicultor/products", authenticateToken, async (req, res) => {
  // Determine if the user has the Apicultor role
  if (req.user.role !== "apicultor" && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Apicultor role required." });
  }

  const { nome, preco, stock, idCategoria, idOrigem, descricao, imagem, tags } =
    req.body;

  try {
    const initialStatus = req.user.role === "admin" ? "Aprovado" : "Pendente";
    const result = await db.run(
      "INSERT INTO produto (Nome, Preco, Stock, ID_Categoria, ID_Origem, Descricao, Imagem, Tags, ID_Apicultor, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        nome,
        preco,
        stock,
        idCategoria,
        idOrigem || null,
        descricao,
        imagem,
        tags || null,
        req.user.id,
        initialStatus,
      ],
    );
    const newProduct = await db.get(
      "SELECT * FROM produto WHERE ID_Produto = ?",
      [result.lastID],
    );
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Create apicultor product error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR PROFILE & WORKSHOPS
app.patch("/api/apicultor/bio", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });
  const { bio } = req.body;
  try {
    await db.run("UPDATE cliente SET Bio = ? WHERE ID_Cliente = ?", [
      bio,
      req.user.id,
    ]);
    res.json({ message: "Bio updated successfully" });
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/apicultor/workshops", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });
  const { titulo, descricao, data_realizacao, preco, vagas, imagem } = req.body;
  try {
    const result = await db.run(
      "INSERT INTO workshop (Titulo, Descricao, Data_Realizacao, Preco, Vagas, Imagem, Status, ID_Apicultor) VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?)",
      [titulo, descricao, data_realizacao, preco, vagas, imagem, req.user.id],
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Reserve Workshop
app.post("/api/workshops/:id/reserve", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const workshop = await db.get("SELECT * FROM workshop WHERE ID_Workshop = ?", [id]);
    if (!workshop) return res.status(404).json({ error: "Workshop não encontrado." });
    
    if (workshop.Vagas <= 0) {
      return res.status(400).json({ error: "Este workshop já não tem vagas disponíveis." });
    }

    const existing = await db.get("SELECT * FROM reserva_workshop WHERE ID_Workshop = ? AND ID_Cliente = ?", [id, req.user.id]);
    if (existing) {
      return res.status(400).json({ error: "Já tens uma reserva para este workshop." });
    }

    await db.run("INSERT INTO reserva_workshop (ID_Workshop, ID_Cliente) VALUES (?, ?)", [id, req.user.id]);
    await db.run("UPDATE workshop SET Vagas = Vagas - 1 WHERE ID_Workshop = ?", [id]);

    res.json({ ok: true, message: "Reserva efetuada com sucesso!" });
  } catch (error) {
    console.error("Workshop reserve error:", error);
    res.status(500).json({ error: "Erro na base de dados." });
  }
});

// APICULTOR — Edit own product
app.patch("/api/apicultor/products/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });

  const { id } = req.params;
  const { nome, preco, stock, idCategoria, idOrigem, descricao, tags, imagem } = req.body;

  try {
    // Verify ownership
    const existing = await db.get("SELECT * FROM produto WHERE ID_Produto = ? AND ID_Apicultor = ?", [id, req.user.id]);
    if (!existing && req.user.role !== "admin")
      return res.status(404).json({ error: "Product not found or access denied." });

    // Reset to Pendente when apicultor edits (needs re-approval)
    const newStatus = req.user.role === "admin" ? existing?.Status : "Pendente";

    await db.run(
      "UPDATE produto SET Nome = ?, Preco = ?, Stock = ?, ID_Categoria = ?, ID_Origem = ?, Descricao = ?, Tags = ?, Imagem = ?, Status = ? WHERE ID_Produto = ?",
      [nome, preco, stock, idCategoria, idOrigem || null, descricao, tags || null, imagem || existing?.Imagem, newStatus, id],
    );
    const updated = await db.get("SELECT * FROM produto WHERE ID_Produto = ?", [id]);
    res.json(updated);
  } catch (err) {
    console.error("Apicultor patch product error:", err);
        res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR — Delete own product
app.delete("/api/apicultor/products/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });

  const { id } = req.params;
  try {
    const existing = await db.get("SELECT * FROM produto WHERE ID_Produto = ? AND ID_Apicultor = ?", [id, req.user.id]);
    if (!existing && req.user.role !== "admin")
      return res.status(404).json({ error: "Product not found or access denied." });

    await db.run("DELETE FROM produto WHERE ID_Produto = ?", [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Apicultor delete product error:", err);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR — Edit own workshop
app.patch("/api/apicultor/workshops/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });

  const { id } = req.params;
  const { titulo, descricao, data_realizacao, preco, vagas, imagem } = req.body;

  try {
    const existing = await db.get("SELECT * FROM workshop WHERE ID_Workshop = ? AND ID_Apicultor = ?", [id, req.user.id]);
    if (!existing && req.user.role !== "admin")
      return res.status(404).json({ error: "Workshop not found or access denied." });

    await db.run(
      "UPDATE workshop SET Titulo = ?, Descricao = ?, Data_Realizacao = ?, Preco = ?, Vagas = ?, Imagem = ?, Status = 'Pendente' WHERE ID_Workshop = ?",
      [titulo, descricao, data_realizacao, preco, vagas, imagem || existing?.Imagem, id],
    );
    const updated = await db.get("SELECT * FROM workshop WHERE ID_Workshop = ?", [id]);
    res.json(updated);
  } catch (err) {
    console.error("Apicultor patch workshop error:", err);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR — Delete own workshop
app.delete("/api/apicultor/workshops/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });

  const { id } = req.params;
  try {
    const existing = await db.get("SELECT * FROM workshop WHERE ID_Workshop = ? AND ID_Apicultor = ?", [id, req.user.id]);
    if (!existing && req.user.role !== "admin")
      return res.status(404).json({ error: "Workshop not found or access denied." });

    await db.run("DELETE FROM workshop WHERE ID_Workshop = ?", [id]);
    res.json({ message: "Workshop deleted successfully" });
  } catch (err) {
    console.error("Apicultor delete workshop error:", err);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR — Get own sales/orders
app.get("/api/apicultor/orders", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });

  try {
    const rows = await db.all(`
      SELECT DISTINCT e.*, c.Nome as ClienteNome 
      FROM encomenda e
      JOIN cliente c ON e.ID_Cliente = c.ID_Cliente
      JOIN item_encomenda ie ON e.ID_Encomenda = ie.ID_Encomenda
      JOIN produto p ON ie.ID_Produto = p.ID_Produto
      WHERE p.ID_Apicultor = ?
      ORDER BY e.Data_Encomenda DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error("Apicultor orders fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/apicultor/stats", authenticateToken, async (req, res) => {
  if (req.user.role !== "apicultor" && req.user.role !== "admin")
    return res.status(403).json({ error: "Access denied." });
  
  const apicultorId = req.user.id;
  
  try {
    // Basic Counts
    const productsCount = await db.get("SELECT COUNT(*) as count FROM produto WHERE ID_Apicultor = ?", [apicultorId]);
    const workshopsCount = await db.get("SELECT COUNT(*) as count FROM workshop WHERE ID_Apicultor = ?", [apicultorId]);
    const pendingProducts = await db.get("SELECT COUNT(*) as count FROM produto WHERE ID_Apicultor = ? AND Status = 'Pendente'", [apicultorId]);
    
    // Total Earnings from Orders
    const earnings = await db.get(`
      SELECT SUM(ie.Quantidade * ie.Preco_Unitario) as total 
      FROM item_encomenda ie
      JOIN produto p ON ie.ID_Produto = p.ID_Produto
      WHERE p.ID_Apicultor = ?
    `, [apicultorId]);

    // Categories Distribution
    const categories = await db.all(`
      SELECT c.Nome as category, COUNT(p.ID_Produto) as count 
      FROM produto p
      JOIN categoria c ON p.ID_Categoria = c.ID_Categoria
      WHERE p.ID_Apicultor = ?
      GROUP BY c.Nome
    `, [apicultorId]);

    // Status Distribution
    const statuses = await db.all(`
      SELECT Status, COUNT(*) as count 
      FROM produto 
      WHERE ID_Apicultor = ?
      GROUP BY Status
    `, [apicultorId]);

    res.json({
      summary: {
        products: productsCount.count,
        workshops: workshopsCount.count,
        pendingProducts: pendingProducts.count,
        totalEarnings: earnings.total || 0
      },
      categories,
      statuses
    });
  } catch (err) {
    console.error("Apicultor stats error:", err);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.patch("/api/user/profile/role", authenticateToken, async (req, res) => {
  const { userType } = req.body;
  if (!["client", "apicultor"].includes(userType)) {
    return res.status(400).json({ error: "Invalid role." });
  }

  try {
    await db.run("UPDATE cliente SET UserType = ? WHERE ID_Cliente = ?", [
      userType,
      req.user.id,
    ]);

    // Re-generate token with new role
    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, UserType as role FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    const token = jwt.sign(user, SECRET_KEY, { expiresIn: "24h" });
    res.json({ message: "Role updated successfully", user, token });
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// PUBLIC APICULTOR ENDPOINTS
app.get("/api/apicultores/:id", async (req, res) => {
  try {
    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Picture as picture, Bio as bio FROM cliente WHERE ID_Cliente = ? AND UserType = 'apicultor'",
      [req.params.id],
    );
    if (!user) return res.status(404).json({ error: "Apicultor not found" });
    res.json(user);
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/apicultores/:id/products", async (req, res) => {
  try {
    const products = await db.all(
      "SELECT * FROM produto WHERE ID_Apicultor = ?",
      [req.params.id],
    );
    res.json(products);
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/apicultores/:id/workshops", async (req, res) => {
  try {
    const workshops = await db.all(
      "SELECT * FROM workshop WHERE ID_Apicultor = ? ORDER BY Data_Realizacao ASC",
      [req.params.id],
    );
    res.json(workshops);
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/workshops", async (req, res) => {
  try {
    const workshops = await db.all(
      "SELECT w.*, c.Nome as ApicultorNome FROM workshop w JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente WHERE w.Status = 'Aprovado' ORDER BY w.Data_Realizacao ASC",
    );
    res.json(workshops);
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ADMIN WORKSHOPS MANAGEMENT
app.get("/api/admin/workshops", authenticateToken, isAdmin, async (req, res) => {
  try {
    const workshops = await db.all(
      "SELECT w.*, c.Nome as ApicultorNome FROM workshop w JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente ORDER BY w.ID_Workshop DESC",
    );
    res.json(workshops);
  } catch (error) {
    console.error("Admin workshops fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.patch(
  "/api/admin/workshops/:id/status",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["Aprovado", "Pendente", "Rejeitado"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    
    try {
      await db.run("UPDATE workshop SET Status = ? WHERE ID_Workshop = ?", [
        status,
        id,
      ]);
      res.json({ message: "Workshop status updated successfully", status });
    } catch (error) {
      console.error("Update workshop status error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// ADMIN USER MANAGEMENT
// Get all users (Admin view)
app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, UserType, Data_Resgistro FROM cliente ORDER BY ID_Cliente DESC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Admin users fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete/Block user
app.delete(
  "/api/admin/users/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own admin account" });
      }
      await db.run("DELETE FROM cliente WHERE ID_Cliente = ?", [id]);
      res.json({ message: "User removed successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Update user role (Admin view)
app.patch(
  "/api/admin/users/:id/role",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { userType } = req.body;
    try {
      if (parseInt(id) === req.user.id && userType !== "admin") {
        return res
          .status(400)
          .json({ error: "Cannot downgrade your own admin account." });
      }

      // Make sure we only accept valid types
      const validTypes = ["admin", "client", "apicultor"];
      if (!validTypes.includes(userType)) {
        return res.status(400).json({ error: "Invalid role specified." });
      }

      await db.run("UPDATE cliente SET UserType = ? WHERE ID_Cliente = ?", [
        userType,
        id,
      ]);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Update own user role (Profile view)
app.patch("/api/user/profile/role", authenticateToken, async (req, res) => {
  const { userType } = req.body;

  try {
    // Only allow downgrading from 'apicultor' to 'client'
    // Users cannot upgrade themselves to 'apicultor' or 'admin' without a request
    if (req.user.role === "client" && userType === "apicultor") {
      return res
        .status(403)
        .json({ error: "Upgrade to Apicultor requires a verification request." });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res
        .status(400)
        .json({ error: "Invalid role target." });
    }

    if (req.user.role === userType) {
      return res.status(400).json({ error: "User already has this role." });
    }

    // Do not allow admins to change their own role here
    if (req.user.role === "admin") {
      return res
        .status(400)
        .json({ error: "Admins cannot change their role here." });
    }

    await db.run("UPDATE cliente SET UserType = ? WHERE ID_Cliente = ?", [
      userType,
      req.user.id,
    ]);

    // Generate new token with updated role
    const token = jwt.sign(
      { id: req.user.id, role: userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Role updated successfully",
      token,
      newRole: userType,
    });
  } catch (error) {
    console.error("Profile role update error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ADMIN ORDER MANAGEMENT
// Get all orders (Admin view)
app.get("/api/admin/orders", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT e.*, c.Nome as ClienteNome 
      FROM encomenda e
      JOIN cliente c ON e.ID_Cliente = c.ID_Cliente
      ORDER BY e.Data_Encomenda DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Admin orders fetch error:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update order status
app.patch(
  "/api/admin/orders/:id/status",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await db.run("UPDATE encomenda SET Status = ? WHERE ID_Encomenda = ?", [
        status,
        id,
      ]);
      res.json({ message: "Order status updated" });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Delete product (keeping existing)
app.delete(
  "/api/admin/products/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db.run("DELETE FROM produto WHERE ID_Produto = ?", [id]);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// CART ROUTES
// Get user cart
app.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
      req.user.id,
    ]);
    if (!cart) return res.json([]);

    const items = await db.all(
      `SELECT ic.*, p.Nome, p.Preco, p.Stock, p.Imagem
       FROM item_carrinho ic 
       JOIN produto p ON ic.ID_Produto = p.ID_Produto 
       WHERE ic.ID_Carrinho = ?`,
      [cart.ID_Carrinho],
    );
    res.json(items);
  } catch (error) {
    console.error("Cart fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add to cart
app.post("/api/cart/add", authenticateToken, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    // 1. Ensure cart exists
    let cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
      req.user.id,
    ]);
    let cartId;

    if (!cart) {
      const result = await db.run(
        "INSERT INTO carrinho (ID_Cliente) VALUES (?)",
        [req.user.id],
      );
      cartId = result.lastID;
    } else {
      cartId = cart.ID_Carrinho;
    }

    // 2. Add or update item
    const existing = await db.get(
      "SELECT * FROM item_carrinho WHERE ID_Carrinho = ? AND ID_Produto = ?",
      [cartId, productId],
    );

    if (existing) {
      await db.run(
        "UPDATE item_carrinho SET Quantidade = Quantidade + ? WHERE ID_itemCarrinho = ?",
        [quantity || 1, existing.ID_itemCarrinho],
      );
    } else {
      await db.run(
        "INSERT INTO item_carrinho (ID_Carrinho, ID_Produto, Quantidade) VALUES (?, ?, ?)",
        [cartId, productId, quantity || 1],
      );
    }

    res.json({ message: "Item added to cart" });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update cart item quantity
app.post("/api/cart/update", authenticateToken, async (req, res) => {
  const { itemId, quantity } = req.body;
  try {
    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }
    await db.run(
      "UPDATE item_carrinho SET Quantidade = ? WHERE ID_itemCarrinho = ?",
      [quantity, itemId],
    );
    res.json({ message: "Cart updated" });
  } catch (error) {
    console.error("Cart update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Email Configuration (Nodemailer)
// Moved import to top

// Email Configuration
let transporter;

async function initMailer() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("Mailer initialized with real SMTP credentials.");
    return;
  }

  const allowEthereal =
    (process.env.ENABLE_ETHEREAL_MAIL || "").toLowerCase() === "true";

  if (!allowEthereal) {
    transporter = null;
    console.log(
      "Mailer disabled. Define SMTP_USER/SMTP_PASS or set ENABLE_ETHEREAL_MAIL=true to use Ethereal.",
    );
    return;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Mailer initialized with Ethereal:", testAccount.user);
  } catch (error) {
    transporter = null;
    console.warn("Mailer disabled because Ethereal setup failed:", error.message);
  }
}
initMailer().catch(console.error);

// Stripe Checkout Session Creation
app.post("/api/checkout/create-session", authenticateToken, async (req, res) => {
  const { address, phone, nome, apelido, shippingCost } = req.body;
  const fullName = [nome, apelido].filter(Boolean).join(" ").trim();

  try {
    // 1. Get Cart Items
    const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [req.user.id]);
    if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

    const items = await db.all(
      `SELECT ic.*, p.Nome, p.Preco 
       FROM item_carrinho ic 
       JOIN produto p ON ic.ID_Produto = p.ID_Produto 
       WHERE ic.ID_Carrinho = ?`,
      [cart.ID_Carrinho],
    );

    if (items.length === 0) return res.status(400).json({ error: "Carrinho vazio" });

    // 2. Calculate Total
    const subtotal = items.reduce((sum, item) => sum + item.Preco * item.Quantidade, 0);
    const total = subtotal + (shippingCost || 0);

    // 3. Create Order (Pendente)
    const result = await db.run(
      "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone) VALUES (?, ?, ?, 'Pendente', ?, ?)",
      [req.user.id, new Date().toISOString(), total, address, phone],
    );
    const orderId = result.lastID;

    // 4. Save items to Order Items
    for (const item of items) {
      await db.run(
        "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
        [orderId, item.ID_Produto, item.Quantidade, item.Preco],
      );
    }

    // 5. MOCK MODE LOGIC
    if (!stripe) {
      console.log("⚠️ STRIPE_SECRET_KEY missing. Entering MOCK MODE.");
      
      // In mock mode, we assume immediate success for demonstration
      await db.run("UPDATE encomenda SET Status = 'Pago' WHERE ID_Encomenda = ?", [orderId]);
      
      // Update Stock (Simulated)
      for (const item of items) {
        await db.run("UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?", [item.Quantidade, item.ID_Produto]);
      }

      // Clear Cart
      await db.run("DELETE FROM item_carrinho WHERE ID_Carrinho = ?", [cart.ID_Carrinho]);

      // Send Receipt Email (async, non-blocking)
      sendReceiptEmail(orderId);

      return res.json({ 
        url: `/success.html?orderId=${orderId}&mock=true`,
        isMock: true 
      });
    }

    // 6. REAL STRIPE SESSION
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.Nome,
        },
        unit_amount: Math.round(item.Preco * 100), // Stripe uses cents
      },
      quantity: item.Quantidade,
    }));

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Envio (CTT Expresso)' },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
      cancel_url: `${req.headers.origin}/cancel.html`,
      metadata: { orderId: orderId.toString() },
      customer_email: (await db.get("SELECT Email FROM cliente WHERE ID_Cliente = ?", [req.user.id])).Email,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "Falha ao criar sessão de pagamento" });
  }
});

// Stripe Webhook (Placeholder)
app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Manual trigger if no secret (not recommended for production)
      event = req.body;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata.orderId;

      await db.run("UPDATE encomenda SET Status = 'Pago' WHERE ID_Encomenda = ?", [orderId]);
      console.log(`✅ Order #${orderId} marked as PAID via Webhook.`);

      // Send Receipt Email after real payment
      sendReceiptEmail(orderId);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Checkout Route (Legacy/Manual for MBWay or fallback)
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  const { address, phone, nome, apelido } = req.body;
  const fullName = [nome, apelido].filter(Boolean).join(" ").trim();

  try {
    // ... [existing logic for manual checkout] ...
0).json({ error: "Checkout failed" });
  }
});

// Remove item from cart
app.delete("/api/cart/remove/:itemId", authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  try {
    await db.run("DELETE FROM item_carrinho WHERE ID_itemCarrinho = ?", [
      itemId,
    ]);
    res.json({ message: "Item removed" });
  } catch (error) {
    console.error("Cart remove error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Example route: Get all clients
app.get("/api/clients", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM cliente");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching clients:", error);
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// FAVORITES ROUTES
app.get("/api/favorites", authenticateToken, async (req, res) => {
  try {
    const favorites = await db.all(
      `SELECT p.* FROM favoritos f
       JOIN produto p ON f.ID_Produto = p.ID_Produto
       WHERE f.ID_Cliente = ?`,
      [req.user.id],
    );
    res.json(favorites);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  try {
    const existing = await db.get(
      "SELECT * FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
      [req.user.id, productId],
    );
    if (existing) {
      return res.status(400).json({ error: "Product already in favorites" });
    }

    await db.run(
      "INSERT INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ message: "Added to favorites" });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete(
  "/api/favorites/remove/:productId",
  authenticateToken,
  async (req, res) => {
    const { productId } = req.params;
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, productId],
      );
      res.json({ message: "Removed from favorites" });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// USER PROFILE ROUTES
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      "SELECT ID_Cliente, Nome, Email, Telefone, Morada, Picture, Data_Resgistro, UserType, Bio FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({
      id: user.ID_Cliente,
      name: user.Nome,
      email: user.Email,
      phone: user.Telefone,
      address: user.Morada,
      picture: user.Picture,
      role: user.UserType,
      bio: user.Bio,
      dateRegistered: user.Data_Resgistro,
      orders,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Order Items
app.get(
  "/api/user/orders/:orderId/items",
  authenticateToken,
  async (req, res) => {
    const { orderId } = req.params;
    try {
      // Verify order belongs to user
      const order = await db.get(
        "SELECT ID_Encomenda FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
        [orderId, req.user.id],
      );

      if (!order) {
        return res.status(404).json({ error: "Encomenda não encontrada" });
      }

      const items = await db.all(
        `SELECT ie.*, p.Nome, p.Imagem, p.ID_Produto 
       FROM item_encomenda ie 
       JOIN produto p ON ie.ID_Produto = p.ID_Produto 
       WHERE ie.ID_Encomenda = ?`,
        [orderId],
      );

      res.json(items);
    } catch (error) {
      console.error("Fetch order items error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /api/user/orders/:orderId/receipt — Download receipt as HTML
app.get("/api/user/orders/:orderId/receipt", authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await db.get(
      "SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
      [orderId, req.user.id],
    );
    if (!order) return res.status(404).json({ error: "Encomenda não encontrada" });

    const customer = await db.get("SELECT Nome, Email FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    const items = await db.all(
      `SELECT ie.*, p.Nome FROM item_encomenda ie JOIN produto p ON ie.ID_Produto = p.ID_Produto WHERE ie.ID_Encomenda = ?`,
      [orderId],
    );

    const html = generateReceiptHTML(order, items, customer.Nome, customer.Email);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Receipt generate error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/orders/:orderId/resend-receipt — Resend receipt email
app.post("/api/user/orders/:orderId/resend-receipt", authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await db.get(
      "SELECT ID_Encomenda FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
      [orderId, req.user.id],
    );
    if (!order) return res.status(404).json({ error: "Encomenda não encontrada" });

    if (!mailTransporter) {
      return res.status(503).json({ error: "Serviço de email não configurado." });
    }

    await sendReceiptEmail(orderId);
    res.json({ ok: true, message: "Recibo enviado para o teu email!" });
  } catch (error) {
    console.error("Resend receipt error:", error);
    res.status(500).json({ error: "Falha ao reenviar recibo" });
  }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const currentUser = await db.get(
      "SELECT ID_Cliente, Nome, Email, Telefone, Morada, Picture, UserType, Bio, Data_Resgistro FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const nextName =
      typeof name === "string" && name.trim() ? name.trim() : currentUser.Nome;
    const nextEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : currentUser.Email;
    const nextPhone =
      phone !== undefined ? (phone || null) : currentUser.Telefone;
    const nextAddress =
      address !== undefined ? (address || null) : currentUser.Morada;

    if (!nextName || !nextEmail) {
      return res.status(400).json({ error: "Name and Email are required" });
    }

    // Check if email is already taken by another user
    const existing = await db.all(
      "SELECT ID_Cliente FROM cliente WHERE Email = ? AND ID_Cliente != ?",
      [nextEmail, req.user.id],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    await db.run(
      "UPDATE cliente SET Nome = ?, Email = ?, Telefone = ?, Morada = ? WHERE ID_Cliente = ?",
      [nextName, nextEmail, nextPhone, nextAddress, req.user.id],
    );

    res.json({
      message: "Profile updated successfully",
      user: {
        id: currentUser.ID_Cliente,
        name: nextName,
        email: nextEmail,
        phone: nextPhone,
        address: nextAddress,
        picture: currentUser.Picture,
        role: currentUser.UserType,
        bio: currentUser.Bio,
        dateRegistered: currentUser.Data_Resgistro,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update Profile Picture
app.put("/api/user/profile/picture", authenticateToken, async (req, res) => {
  try {
    const { picture } = req.body;

    if (!picture) {
      return res.status(400).json({ error: "Picture data is required" });
    }

    // Validate base64 image format
    if (!picture.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image format" });
    }

    await db.run("UPDATE cliente SET Picture = ? WHERE ID_Cliente = ?", [
      picture,
      req.user.id,
    ]);

    res.json({ message: "Profile picture updated successfully", picture });
  } catch (error) {
    console.error("Picture update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update password
app.put("/api/user/profile/password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    const isMatch = await bcrypt.compare(currentPassword, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashedPassword,
      req.user.id,
    ]);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete account
app.delete("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    if (userRole === "admin") {
      return res.status(400).json({
        error: "Cannot delete an admin account through clinical profile.",
      });
    }

    // Note: ON DELETE CASCADE in schema handles related tables (cart, favorites, etc.)
    await db.run("DELETE FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ADMIN ANALYTICS
app.get("/api/admin/analytics", authenticateToken, isAdmin, async (req, res) => {
  try {
    // 1. Sales last 30 days
    const sales30d = await db.all(`
      SELECT DATE(Data_Encomenda) as date, SUM(Total) as revenue, COUNT(ID_Encomenda) as count
      FROM encomenda
      WHERE Status IN ('Pago', 'Enviado', 'Entregue')
      AND Data_Encomenda >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(Data_Encomenda)
      ORDER BY date ASC
    `);

    // 2. Product distribution by category
    const distribution = await db.all(`
      SELECT c.Nome as category, COUNT(p.ID_Produto) as count
      FROM categoria c
      LEFT JOIN produto p ON c.ID_Categoria = p.ID_Categoria
      GROUP BY c.ID_Categoria
    `);

    // 3. Orders by Status
    const ordersByStatus = await db.all(`
      SELECT Status as status, COUNT(ID_Encomenda) as count
      FROM encomenda
      GROUP BY Status
    `);

    // 4. Top Selling Products (Top 10 by revenue)
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

    // 5. Sales by Beekeeper
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

    // 6. Users Growth (Last 12 months)
    const usersGrowth = await db.all(`
      SELECT DATE_FORMAT(Data_Resgistro, '%Y-%m') as month, COUNT(ID_Cliente) as count
      FROM cliente
      WHERE Data_Resgistro >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    // 7. Overall Stats
    const stats = await db.get(`
      SELECT 
        SUM(CASE WHEN Status IN ('Pago', 'Enviado', 'Entregue') THEN Total ELSE 0 END) as totalRevenue,
        COUNT(ID_Encomenda) as totalOrders,
        (SELECT COUNT(*) FROM cliente) as totalUsers,
        (SELECT COUNT(*) FROM produto) as totalProducts
      FROM encomenda
    `);

    const totalRevenue = parseFloat(stats.totalRevenue || 0);
    const totalOrders = stats.totalOrders || 0;
    const aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00";

    res.json({
      sales30d,
      distribution,
      ordersByStatus,
      topProducts,
      salesByBeekeeper,
      usersGrowth,
      stats: {
        ...stats,
        totalRevenue: totalRevenue.toFixed(2),
        avgOrderValue: aov
      }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// UPGRADE REQUESTS
// Submit upgrade request
app.post(
  "/api/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const { descricao } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: "Document is required" });
      }
      if (!descricao) {
        return res.status(400).json({ error: "Description is required" });
      }

      const relativePath = `/uploads/${req.file.filename}`;

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento) VALUES (?, ?, ?)",
        [req.user.id, descricao, relativePath],
      );

      res.status(201).json({ message: "Upgrade request submitted successfully" });
    } catch (error) {
      console.error("Upgrade request submission error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Get all upgrade requests (Admin view)
app.get(
  "/api/admin/upgrade-requests",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const rows = await db.all(`
      SELECT ur.*, c.Nome as ClienteNome, c.Email as ClienteEmail
      FROM upgrade_requests ur
      JOIN cliente c ON ur.ID_Cliente = c.ID_Cliente
      ORDER BY ur.Data_Pedido DESC
    `);
      res.json(rows);
    } catch (error) {
      console.error("Admin upgrade requests fetch error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Process upgrade request (Approve/Reject)
app.put(
  "/api/admin/upgrade-requests/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Aprovado' or 'Rejeitado'

    if (status !== "Aprovado" && status !== "Rejeitado") {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const request = await db.get(
        "SELECT * FROM upgrade_requests WHERE ID_Request = ?",
        [id],
      );
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      await db.run(
        "UPDATE upgrade_requests SET Status = ?, Data_Processamento = CURRENT_TIMESTAMP WHERE ID_Request = ?",
        [status, id],
      );

      if (status === "Aprovado") {
        await db.run("UPDATE cliente SET UserType = 'apicultor' WHERE ID_Cliente = ?", [
          request.ID_Cliente,
        ]);
      }

      res.json({ message: `Request ${status.toLowerCase()} successfully` });
    } catch (error) {
      console.error("Process upgrade request error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Check if current user has a pending request
app.get("/api/user/upgrade-request-status", authenticateToken, async (req, res) => {
  try {
    const request = await db.get(
      "SELECT Status FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
      [req.user.id],
    );
    res.json(request || { Status: "Nenhum" });
  } catch (error) {
        res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'");
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get reviews for a product
app.get("/api/products/:id/reviews", async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await db.all(
      `SELECT a.*, c.Nome as ClienteNome, c.Picture as ClienteFoto 
       FROM avaliacao a
       JOIN cliente c ON a.ID_Cliente = c.ID_Cliente
       WHERE a.ID_Produto = ?
       ORDER BY a.Data_Avaliacao DESC`,
      [id],
    );
    res.json(reviews);
  } catch (error) {
    console.error("Reviews fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add a review
app.post("/api/products/:id/reviews", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating (1-5)" });
  }

  try {
    // Check if user already reviewed this product
    const existing = await db.get(
      "SELECT * FROM avaliacao WHERE ID_Cliente = ? AND ID_Produto = ?",
      [req.user.id, id],
    );

    if (existing) {
      // Update existing review
      await db.run(
        "UPDATE avaliacao SET Nota = ?, Comentario = ?, Data_Avaliacao = CURRENT_TIMESTAMP WHERE ID_Avaliacao = ?",
        [rating, comment, existing.ID_Avaliacao],
      );
      return res.json({ message: "Review updated" });
    }

    await db.run(
      "INSERT INTO avaliacao (ID_Produto, ID_Cliente, Nota, Comentario) VALUES (?, ?, ?, ?)",
      [id, req.user.id, rating, comment],
    );
    res.json({ message: "Review added successfully" });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================================
// INTERACTION LOGGING
// ============================================================

// POST /api/logs/interaction — Record a user interaction event
app.post("/api/logs/interaction", async (req, res) => {
  const { tipo, pagina, dados } = req.body;
  if (!tipo) return res.status(400).json({ error: "Tipo é obrigatório" });

  // Optionally extract user id from token (if logged in)
  let clienteId = null;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      clienteId = decoded.id || null;
    } catch {
      // Anonymous interaction — that's fine
    }
  }

  try {
    await db.run(
      "INSERT INTO interacao (ID_Cliente, Tipo, Pagina, Dados) VALUES (?, ?, ?, ?)",
      [clienteId, tipo, pagina || null, dados ? JSON.stringify(dados) : null],
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Log interaction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/analytics/interactions — Interaction overview for Admin
app.get("/api/admin/analytics/interactions", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Events by type (last 30 days)
    const byType = await db.all(`
      SELECT Tipo as tipo, COUNT(*) as count
      FROM interacao
      WHERE Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY Tipo
      ORDER BY count DESC
    `);

    // Events by page (last 30 days)
    const byPage = await db.all(`
      SELECT Pagina as pagina, COUNT(*) as count
      FROM interacao
      WHERE Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND Pagina IS NOT NULL
      GROUP BY Pagina
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top viewed products (product_view events)
    const topViewed = await db.all(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.productName')) as nome,
             JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.productId')) as id,
             COUNT(*) as views
      FROM interacao
      WHERE Tipo = 'product_view'
        AND Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY id, nome
      ORDER BY views DESC
      LIMIT 10
    `);

    // Top add-to-cart products
    const topCart = await db.all(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.productName')) as nome,
             JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.productId')) as id,
             COUNT(*) as adds
      FROM interacao
      WHERE Tipo = 'add_to_cart'
        AND Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY id, nome
      ORDER BY adds DESC
      LIMIT 10
    `);

    // Events per day (last 14 days)
    const perDay = await db.all(`
      SELECT DATE(Data_Interacao) as dia, COUNT(*) as total
      FROM interacao
      WHERE Data_Interacao >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY dia
      ORDER BY dia ASC
    `);

    // Total events
    const totals = await db.get(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN ID_Cliente IS NOT NULL THEN 1 ELSE 0 END) as logged_in,
             SUM(CASE WHEN ID_Cliente IS NULL THEN 1 ELSE 0 END) as anonymous
      FROM interacao
      WHERE Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Top search queries
    const topSearches = await db.all(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.term')) as termo,
             COUNT(*) as count
      FROM interacao
      WHERE Tipo = 'search'
        AND Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND Dados IS NOT NULL
      GROUP BY termo
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top clicked elements
    const topClicks = await db.all(`
      SELECT JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.label')) as label,
             JSON_UNQUOTE(JSON_EXTRACT(Dados, '$.element')) as element,
             COUNT(*) as clicks
      FROM interacao
      WHERE Tipo = 'click'
        AND Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY label, element
      ORDER BY clicks DESC
      LIMIT 15
    `);

    res.json({ byType, byPage, topViewed, topCart, perDay, totals, topSearches, topClicks });
  } catch (error) {
    console.error("Interactions analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
