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
import crypto from "crypto";
import compression from "compression";


const configuredGoogleClientId =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== "change-me"
    ? process.env.GOOGLE_CLIENT_ID
    : null;
const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "placeholder" 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    }) 
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const googleClient = configuredGoogleClientId
  ? new OAuth2Client(configuredGoogleClientId)
  : null;
const isDevelopment = process.env.NODE_ENV !== "production";

let databaseReady = false;
let databaseStartupError = null;
let serverStarted = false;

const describeDatabaseStartupError = (error) => {
  if (!error) {
    return "Database unavailable.";
  }

  if (error.code === "ER_ACCESS_DENIED_ERROR") {
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "3306";
    const user = process.env.DB_USER || "root";
    const passwordHint = process.env.DB_PASSWORD
      ? "with a configured password"
      : "without a configured password";

    return `MySQL rejected ${user}@${host}:${port} ${passwordHint}. Update DB_USER/DB_PASSWORD in backend/.env and restart the backend.`;
  }

  if (error.code === "ER_BAD_DB_ERROR") {
    const dbName = process.env.DB_NAME || "hexomel";
    return `Database "${dbName}" does not exist. Run "npm run db:setup --prefix backend" after fixing the MySQL credentials, then restart the backend.`;
  }

  if (error.code === "ECONNREFUSED") {
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "3306";
    return `MySQL is not accepting connections on ${host}:${port}. Start MySQL and restart the backend.`;
  }

  return error.message || "Database unavailable.";
};

const startServer = () => {
  if (serverStarted) {
    return;
  }

  serverStarted = true;

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
};

// ============================================================
// EMAIL TRANSPORTER (Nodemailer)
// ============================================================
let mailTransporter = null;
async function initMailTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: String(process.env.SMTP_PORT || "587") === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await mailTransporter.verify();
      console.log("📧 Email transporter ready.");
    } catch (error) {
      mailTransporter = null;
      console.warn("⚠️ Email transporter failed:", error.message);
    }
    return;
  }

  const allowEthereal =
    (process.env.ENABLE_ETHEREAL_MAIL || "").toLowerCase() === "true";

  if (!allowEthereal) {
    console.log("⚠️ SMTP_USER/SMTP_PASS not set — emails disabled (dev mode).");
    return;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    mailTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Mailer initialized with Ethereal:", testAccount.user);
  } catch (error) {
    mailTransporter = null;
    console.warn("⚠️ Mailer disabled because Ethereal setup failed:", error.message);
  }
}
initMailTransporter().catch(console.error);

// Generate Receipt HTML (used for email and download)
function generateReceiptHTML(order, items, customerName, customerEmail, logoSrc = "cid:logo") {
  const orderDate = new Date(order.Data_Encomenda || order.date).toLocaleDateString("pt-PT", {
    year: "numeric", month: "long", day: "numeric",
  });
  const subtotal = items.reduce((sum, i) => sum + i.Preco_Unitario * i.Quantidade, 0);
  const total = parseFloat(order.Total || order.total);
  const shipping = total - subtotal;

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:15px; border-bottom:1px solid #edf2f7; font-family: sans-serif;">
        <div style="font-weight:bold; color:#1a4d2e; font-size:16px;">${i.Nome}</div>
        <div style="font-size:12px; color:#718096; margin-top:4px;"><span style="color:#b45309; font-weight:bold;">Apicultor:</span> ${i.ApicultorNome || 'Hexomel'} &bull; Qtd: ${i.Quantidade} &bull; €${parseFloat(i.Preco_Unitario).toFixed(2)}/un</div>
      </td>
      <td style="padding:15px; border-bottom:1px solid #edf2f7; text-align:right; font-family: sans-serif; font-weight:bold; color:#1a4d2e; font-size:16px;">
        €${(i.Preco_Unitario * i.Quantidade).toFixed(2)}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Recibo Hexomel #${order.ID_Encomenda || order.id}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7f6; font-family: Arial, sans-serif; color:#2d3748;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f7f6; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; max-width:600px; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(26,77,46,0.05); border: 1px solid #eef2f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1a4d2e; padding:40px 20px; text-align:center; color:#ffffff; border-bottom: 4px solid #f4b400;">
              <div style="margin:0; font-size:28px; font-weight:bold; letter-spacing:-0.5px;">
                <img src="${logoSrc}" alt="Hexomel" style="height:60px; vertical-align:middle; padding-bottom: 5px;">
              </div>
              <p style="margin:8px 0 0; font-size:16px; color:#e2e8f0;">Comprovativo da Encomenda #${order.ID_Encomenda || order.id}</p>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48%" valign="top" style="padding:15px; background-color:#fcfdfc; border-radius:12px; border:1px solid #eef2f0;">
                    <div style="font-size:11px; color:#a0aec0; text-transform:uppercase; letter-spacing:1px; font-weight:bold; margin-bottom:4px;">Nº da Encomenda</div>
                    <div style="font-size:16px; font-weight:bold; color:#1a4d2e;">#${order.ID_Encomenda || order.id}</div>
                    <div style="font-size:11px; color:#a0aec0; text-transform:uppercase; letter-spacing:1px; font-weight:bold; margin-top:15px; margin-bottom:4px;">Data de Emissão</div>
                    <div style="font-size:14px; color:#4a5568;">${orderDate}</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top" style="padding:15px; background-color:#fcfdfc; border-radius:12px; border:1px solid #eef2f0;">
                    <div style="font-size:11px; color:#a0aec0; text-transform:uppercase; letter-spacing:1px; font-weight:bold; margin-bottom:4px;">Cliente</div>
                    <div style="font-size:16px; font-weight:bold; color:#1a4d2e;">${customerName}</div>
                    <div style="font-size:11px; color:#a0aec0; text-transform:uppercase; letter-spacing:1px; font-weight:bold; margin-top:15px; margin-bottom:4px;">Método</div>
                    <div style="font-size:14px; color:#4a5568;">Pagamento Seguro</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 20px 40px;">
              <h3 style="margin:0 0 15px; font-size:14px; color:#a0aec0; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #edf2f7; padding-bottom:10px;">Resumo da Encomenda</h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 10px 40px 40px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="40%"></td>
                  <td width="60%">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fcfdfc; border-radius:12px; border:1px solid #eef2f0; padding:20px;">
                      <tr>
                        <td style="padding:5px 0; font-size:14px; color:#4a5568;">Subtotal</td>
                        <td style="padding:5px 0; font-size:14px; color:#4a5568; text-align:right;">€${subtotal.toFixed(2)}</td>
                      </tr>
                      ${shipping > 0.05 ? `<tr>
                        <td style="padding:5px 0; font-size:14px; color:#4a5568;">Portes</td>
                        <td style="padding:5px 0; font-size:14px; color:#4a5568; text-align:right;">€${shipping.toFixed(2)}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:15px 0 0; font-size:18px; font-weight:bold; color:#1a4d2e; border-top:1px solid #edf2f7; margin-top:10px;">Total</td>
                        <td style="padding:15px 0 0; font-size:20px; font-weight:bold; color:#1a4d2e; text-align:right; border-top:1px solid #edf2f7; margin-top:10px;">€${total.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fcfdfc; padding:30px 40px; text-align:center; border-top:1px solid #edf2f7;">
              <p style="margin:0 0 10px; font-size:18px; font-weight:bold; color:#1a4d2e;">Muito obrigado pela preferência!</p>
              <p style="margin:0 0 5px; font-size:13px; color:#718096;">Este documento serve como comprovativo de pagamento da sua encomenda.</p>
              <p style="margin:0; font-size:13px; color:#718096;">Dúvidas? Contacte-nos em <a href="mailto:hexomelpap@gmail.com" style="color:#f4b400; font-weight:bold; text-decoration:none;">hexomelpap@gmail.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

    const info = await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
      to: customer.Email,
      subject: `🍯 Recibo da Encomenda #${orderId} — Hexomel`,
      html,
      attachments: [{
        filename: 'logo_hexomel.webp',
        path: '../frontend/public/images/logo_hexomel.webp',
        cid: 'logo' // referenced in the HTML as src="cid:logo"
      }]
    });
    console.log(`📧 Receipt email sent for order #${orderId} to ${customer.Email}`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`🔗 Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err) {
    console.error(`📧 Failed to send receipt email for order #${orderId}:`, err.message);
  }
}
async function syncCustomerCheckoutDetails(customerId, { nome, apelido, address, phone }) {
  const fullName = [nome, apelido].filter(Boolean).join(" ").trim();

  if (!fullName && !address && !phone) {
    return;
  }

  await db.run(
    "UPDATE cliente SET Nome = COALESCE(?, Nome), Morada = COALESCE(?, Morada), Telefone = COALESCE(?, Telefone) WHERE ID_Cliente = ?",
    [fullName || null, address || null, phone || null, customerId],
  );
}

async function fulfillPaidOrder(orderId) {
  const order = await db.get(
    "SELECT ID_Encomenda, ID_Cliente, Status FROM encomenda WHERE ID_Encomenda = ?",
    [orderId],
  );

  if (!order) {
    return { ok: false, reason: "ORDER_NOT_FOUND" };
  }

  if (order.Status === "Pago") {
    return { ok: true, alreadyPaid: true };
  }

  const items = await db.all(
    "SELECT ID_Produto, Quantidade FROM item_encomenda WHERE ID_Encomenda = ?",
    [orderId],
  );

  for (const item of items) {
    await db.run(
      "UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?",
      [item.Quantidade, item.ID_Produto],
    );
  }

  await db.run("UPDATE encomenda SET Status = 'Pago' WHERE ID_Encomenda = ?", [
    orderId,
  ]);

  await db.run(
    "DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)",
    [order.ID_Cliente],
  );

  await sendReceiptEmail(orderId);

  return { ok: true, alreadyPaid: false };
}

function buildAbsoluteAppUrl(origin, assetPath) {
  if (!origin || !assetPath) {
    return null;
  }

  const publicBaseUrl =
    process.env.CHECKOUT_PUBLIC_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    origin;

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return new URL(normalizedPath, `${publicBaseUrl}/`).toString();
}

function getCheckoutProductImages(origin, imagePath, productName) {
  const publicBaseUrl = process.env.CHECKOUT_PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL;
  
  // If we have an explicit public URL configured (e.g. Ngrok), use it even if we are developing on localhost
  if (publicBaseUrl && !publicBaseUrl.includes("localhost") && !publicBaseUrl.includes("127.0.0.1")) {
    const absoluteUrl = buildAbsoluteAppUrl(publicBaseUrl, imagePath);
    if (absoluteUrl) return [absoluteUrl];
  }

  const isLocalhost = !origin || origin.includes("localhost") || origin.includes("127.0.0.1");

  if (isLocalhost) {
    const nameLower = (productName || "").toLowerCase();
    
    // Use high-quality themed images for common honey products on localhost
    if (nameLower.includes("mel")) {
      return ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600"];
    } else if (nameLower.includes("polen") || nameLower.includes("pólen")) {
      return ["https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&q=80&w=600"];
    } else if (nameLower.includes("prop") || nameLower.includes("próp") || nameLower.includes("cera")) {
      return ["https://images.unsplash.com/photo-1610424564335-9774d008d56c?auto=format&fit=crop&q=80&w=600"];
    }

    const encodedName = encodeURIComponent(productName || "Hexomel").replace(/%20/g, "+");
    return [`https://placehold.co/600x600/1a4d2e/ffffff/png?text=${encodedName}`];
  }
  
  const absoluteUrl = buildAbsoluteAppUrl(origin, imagePath);
  return absoluteUrl ? [absoluteUrl] : [];
}

const runDatabaseMigrations = async () => {
  try {
    // Auto-migration for new features (ignores errors if exist)
    await db
      .run("ALTER TABLE cliente ADD COLUMN Bio TEXT DEFAULT NULL")
      .catch(() => console.log("Bio col already exists"));

    await db
      .run("ALTER TABLE cliente ADD COLUMN Username VARCHAR(60) DEFAULT NULL")
      .catch(() => console.log("Username col already exists"));

    await db
      .run("ALTER TABLE cliente ADD COLUMN Is_Verified BOOLEAN DEFAULT TRUE")
      .catch(() => console.log("Is_Verified col already exists"));

    await db
      .run("ALTER TABLE cliente ADD COLUMN Verification_Token VARCHAR(255) DEFAULT NULL")
      .catch(() => console.log("Verification_Token col already exists"));

    await db
      .run("ALTER TABLE cliente ADD COLUMN Checkout_OTP VARCHAR(10) DEFAULT NULL")
      .catch(() => console.log("Checkout_OTP col already exists"));

    await db
      .run("ALTER TABLE cliente ADD COLUMN Checkout_OTP_Expires DATETIME DEFAULT NULL")
      .catch(() => console.log("Checkout_OTP_Expires col already exists"));

    await db
      .run("ALTER TABLE cliente ADD COLUMN Checkout_Verified BOOLEAN DEFAULT FALSE")
      .catch(() => console.log("Checkout_Verified col already exists"));

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

    // New columns for Encomenda
    await db.run("ALTER TABLE encomenda ADD COLUMN Custo_Envio DECIMAL(10,2) DEFAULT 0").catch(() => {});
    await db.run("ALTER TABLE encomenda ADD COLUMN Tipo_Envio VARCHAR(50) DEFAULT 'ctt'").catch(() => {});
    await db.run("ALTER TABLE encomenda ADD COLUMN Nome VARCHAR(120) DEFAULT NULL").catch(() => {});
    await db.run("ALTER TABLE encomenda ADD COLUMN Apelido VARCHAR(120) DEFAULT NULL").catch(() => {});

    // Reserva Workshop table
    await db
      .run(
        `
          CREATE TABLE IF NOT EXISTS reserva_workshop (
              ID_Reserva int(10) NOT NULL AUTO_INCREMENT,
              ID_Workshop int(10) NOT NULL,
              ID_Cliente int(10) NOT NULL,
              Data_Reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (ID_Reserva),
              KEY ID_Workshop (ID_Workshop),
              KEY ID_Cliente (ID_Cliente),
              CONSTRAINT fk_reserva_workshop FOREIGN KEY (ID_Workshop) REFERENCES workshop (ID_Workshop) ON DELETE CASCADE,
              CONSTRAINT fk_reserva_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `,
      )
      .catch(() => console.log("reserva_workshop table creation handled"));

    // Community Q&A tables
    await db
      .run(
        `
          CREATE TABLE IF NOT EXISTS pergunta_comunidade (
              ID_Pergunta int(10) NOT NULL AUTO_INCREMENT,
              ID_Cliente int(10) NOT NULL,
              Texto TEXT NOT NULL,
              Votos int(10) DEFAULT 0,
              Data_Criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (ID_Pergunta),
              KEY ID_Cliente (ID_Cliente),
              CONSTRAINT fk_pergunta_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `,
      )
      .catch(() => console.log("pergunta_comunidade table creation handled"));

    await db
      .run(
        `
          CREATE TABLE IF NOT EXISTS resposta_comunidade (
              ID_Resposta int(10) NOT NULL AUTO_INCREMENT,
              ID_Pergunta int(10) NOT NULL,
              ID_Cliente int(10) NOT NULL,
              Texto TEXT NOT NULL,
              Votos int(10) DEFAULT 0,
              Melhor_Resposta BOOLEAN DEFAULT FALSE,
              Data_Criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (ID_Resposta),
              KEY ID_Pergunta (ID_Pergunta),
              KEY ID_Cliente (ID_Cliente),
              CONSTRAINT fk_resposta_pergunta FOREIGN KEY (ID_Pergunta) REFERENCES pergunta_comunidade (ID_Pergunta) ON DELETE CASCADE,
              CONSTRAINT fk_resposta_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `,
      )
      .catch(() => console.log("resposta_comunidade table creation handled"));

    console.log("Auto-migrations completed.");
  } catch (err) {
    console.log("Migration warning:", err);
  }
};

const initializeDatabase = async () => {
  try {
    await initDB();
    databaseReady = true;
    databaseStartupError = null;
    console.log("MySQL Database connected and initialized.");
    await runDatabaseMigrations();
  } catch (err) {
    databaseReady = false;
    databaseStartupError = err;
    console.error("Failed to initialize database:", err);
    console.error(describeDatabaseStartupError(err));

    if (!isDevelopment) {
      process.exit(1);
    }

    console.warn(
      "Backend is running in degraded mode. API routes that need MySQL will return 503 until the database configuration is fixed.",
    );
  }
};

const jsonBodyParser = express.json({ limit: "10mb" });
const urlencodedBodyParser = express.urlencoded({ limit: "10mb", extended: true });

app.use(compression());
app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/webhooks/stripe")) {
    return next();
  }

  return jsonBodyParser(req, res, next);
});
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/webhooks/stripe")) {
    return next();
  }

  return urlencodedBodyParser(req, res, next);
});

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
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "OK" : "DEGRADED",
    message: "Hexomel API is running",
    database: {
      ready: databaseReady,
      message: databaseReady
        ? "MySQL connected."
        : describeDatabaseStartupError(databaseStartupError),
    },
  });
});

app.get("/api/config/public", (req, res) => {
  res.json({
    googleClientId: configuredGoogleClientId,
  });
});

app.use((req, res, next) => {
  if (databaseReady || !req.path.startsWith("/api/")) {
    return next();
  }

  return res.status(503).json({
    error: "Database unavailable",
    message: describeDatabaseStartupError(databaseStartupError),
  });
});

// AUTH ROUTES
// Register
app.post("/api/auth/register", async (req, res) => {
  let { firstName, lastName, email, username, password } = req.body;

  if (!email || !password || !firstName || !username) {
    return res.status(400).json({ error: "Nome, username, email e password são obrigatórios." });
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

    // Insert user without verification
    const result = await db.run(
      "INSERT INTO cliente (Nome, Email, Username, Senha, UserType, Is_Verified) VALUES (?, ?, ?, ?, ?, ?)",
      [
        fullName,
        email,
        username,
        hashedPassword,
        "client",
        true
      ],
    );

    // Auto-login after registration
    const token = jwt.sign(
      { id: result.lastID, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(201).json({
      message: "Conta criada com sucesso.",
      token,
      user: {
        id: result.lastID,
        name: fullName,
        email,
        picture: null,
        UserType: "client",
        role: "client"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});


// Login
app.post("/api/auth/login", async (req, res) => {
  let identifier = req.body.identifier || req.body.email;
  const { password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/username e password são obrigatórios" });
  }

  identifier = identifier.toLowerCase().trim();

  try {
    let user = await db.get("SELECT * FROM cliente WHERE Email = ? OR Username = ?", [identifier, identifier]);
    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType, checkoutVerified: Boolean(user.Checkout_Verified) },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    res.json({
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        UserType: user.UserType || "client",
        role: user.UserType || "client",
        checkoutVerified: Boolean(user.Checkout_Verified),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// Verify Email
app.get("/api/auth/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Token não fornecido." });
  }

  try {
    const user = await db.get("SELECT * FROM cliente WHERE Verification_Token = ?", [token]);
    if (!user) {
      return res.status(400).json({ error: "Token de verificação inválido ou expirado." });
    }

    await db.run("UPDATE cliente SET Is_Verified = TRUE, Verification_Token = NULL WHERE ID_Cliente = ?", [user.ID_Cliente]);
    
    res.json({ message: "Email verificado com sucesso!" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});


// Checkout 2FA - Generate
app.post("/api/auth/checkout-2fa/generate", authenticateToken, async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expiresDate = new Date(Date.now() + 10 * 60 * 1000);
    // Format as local YYYY-MM-DD HH:MM:SS (MySQL DATETIME is timezone-naive, must match server local time)
    const pad = (n) => String(n).padStart(2, '0');
    const expires = `${expiresDate.getFullYear()}-${pad(expiresDate.getMonth()+1)}-${pad(expiresDate.getDate())} ${pad(expiresDate.getHours())}:${pad(expiresDate.getMinutes())}:${pad(expiresDate.getSeconds())}`;

    await db.run(
      "UPDATE cliente SET Checkout_OTP = ?, Checkout_OTP_Expires = ? WHERE ID_Cliente = ?",
      [otp, expires, req.user.id]
    );

    const user = await db.get("SELECT Email, Nome FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    
    if (mailTransporter) {
      try {
        const info = await mailTransporter.sendMail({
          from: process.env.SMTP_FROM || "Hexomel Segurança <noreply@hexomel.pt>",
          to: user.Email,
          subject: "O seu código de verificação para Checkout — Hexomel",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1a4d2e;">Código de Segurança</h2>
              <p>Olá ${user.Nome || 'Cliente'},</p>
              <p>O seu código de verificação para prosseguir com a encomenda é:</p>
              <h1 style="background: #f4f7f6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; color: #f4b400; border-radius: 8px;">${otp}</h1>
              <p>Este código é válido por 10 minutos. Se não pediu este código, por favor ignore este email.</p>
              <p style="color: #718096; font-size: 0.85em;">A equipa Hexomel</p>
            </div>
          `
        });
        if (nodemailer.getTestMessageUrl(info)) {
          console.log(`🔗 2FA Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
      } catch (emailErr) {
        console.error("2FA Email fail:", emailErr);
      }
    } else {
      console.log(`⚠️ Dev Mode: OTP para ${user.Email} é ${otp}`);
    }

    res.json({ message: "Código enviado com sucesso para o seu email." });
  } catch (error) {
    console.error("Generate 2FA error:", error);
    res.status(500).json({ error: "Erro interno ao gerar o código 2FA." });
  }
});

// Checkout 2FA - Verify
app.post("/api/auth/checkout-2fa/verify", authenticateToken, async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ error: "O código é obrigatório." });
  }

  try {
    const user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    
    if (!user) {
      return res.status(400).json({ error: "Utilizador não encontrado." });
    }

    console.log(`2FA Verify: stored=${user.Checkout_OTP}, received=${otp}, expires=${user.Checkout_OTP_Expires}`);

    if (!user.Checkout_OTP || String(user.Checkout_OTP).trim() !== String(otp).trim()) {
      return res.status(400).json({ error: "Código incorreto." });
    }

    // Compare dates - MySQL DATETIME is returned as a Date object by mysql2
    const expiresAt = new Date(user.Checkout_OTP_Expires);
    const now = new Date();
    console.log(`2FA Expiry check: now=${now.toISOString()}, expires=${expiresAt.toISOString()}`);
    if (now > expiresAt) {
      return res.status(400).json({ error: "Código expirado. Peça um novo." });
    }

    // Success -> Clear OTP and set as verified
    await db.run("UPDATE cliente SET Checkout_OTP = NULL, Checkout_OTP_Expires = NULL, Checkout_Verified = TRUE WHERE ID_Cliente = ?", [req.user.id]);

    // Issue updated token
    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType, checkoutVerified: true },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    res.json({
      message: "Verificação concluída com sucesso!",
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        role: user.UserType || "client",
        checkoutVerified: true
      }
    });

  } catch (error) {
    console.error("Verify 2FA error:", error);
    res.status(500).json({ error: "Erro na verificação." });
  }
});

// Google Auth
app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!googleClient || !configuredGoogleClientId) {
      return res.status(503).json({ error: "Google authentication is not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: configuredGoogleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase().trim();
    const { name, picture } = payload;
    console.log("Google Login Payload:", { email, name, picture });

    let user = await db.get("SELECT * FROM cliente WHERE Email = ?", [email]);
    if (!user) {
      const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await db.run(
        "INSERT INTO cliente (Nome, Email, Senha, Picture, UserType, Is_Verified, Verification_Token) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, email, randomPass, picture, "client", true, null],
      );
      user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [
        result.lastID,
      ]);
    } else {
      await db.run(
        `UPDATE cliente
         SET Picture = CASE WHEN (Picture IS NULL OR Picture = '') THEN ? ELSE Picture END,
             Is_Verified = TRUE,
             Verification_Token = NULL
         WHERE ID_Cliente = ?`,
        [picture || null, user.ID_Cliente],
      );
      user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [
        user.ID_Cliente,
      ]);
    }

    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType, checkoutVerified: Boolean(user.Checkout_Verified) },
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
        checkoutVerified: Boolean(user.Checkout_Verified),
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

// Contact Form Route
app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Nome, email e mensagem são obrigatórios." });
  }

  if (!mailTransporter) {
    console.warn("⚠️ Contact form submitted but mailer is disabled.");
    return res.status(503).json({ error: "O serviço de email está temporariamente indisponível. Por favor, tente mais tarde." });
  }

  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
      to: process.env.SMTP_USER ? process.env.SMTP_USER.replace("@", "+contacto@") : "hexomelpap+contacto@gmail.com", // Force to Inbox using alias
      replyTo: email, // Reply to the sender
      subject: `📧 Contacto: ${subject || "Nova Mensagem"} — Hexomel`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eef2f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background-color: #1a4d2e; padding: 30px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px; color: #f4b400;">Nova Mensagem de Contacto</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="margin-bottom: 20px;"><strong style="color: #1a4d2e;">De:</strong> ${name} &lt;${email}&gt;</p>
            <p style="margin-bottom: 20px;"><strong style="color: #1a4d2e;">Assunto:</strong> ${subject || "Sem assunto"}</p>
            <div style="background-color: #fcfdfc; padding: 20px; border-radius: 8px; border-left: 4px solid #f4b400; margin-top: 20px;">
              <p style="margin: 0; white-space: pre-wrap; line-height: 1.6; color: #2d3748;">${message}</p>
            </div>
          </div>
          <div style="background-color: #fcfdfc; padding: 20px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #edf2f7;">
            Este email foi gerado automaticamente pelo formulário de contacto da Hexomel.
          </div>
        </div>
      `,
    });

    res.json({ message: "Mensagem enviada com sucesso! Entraremos em contacto brevemente." });
  } catch (error) {
    console.error("Contact form email error:", error);
    res.status(500).json({ error: "Erro ao enviar a mensagem. Por favor, tente novamente mais tarde." });
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
  const defaultWorkshopImage = "/images/workshop_default.webp";
  const finalImage = imagem && imagem.trim() !== "" ? imagem : defaultWorkshopImage;
  try {
    const result = await db.run(
      "INSERT INTO workshop (Titulo, Descricao, Data_Realizacao, Preco, Vagas, Imagem, Status, ID_Apicultor) VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?)",
      [titulo, descricao, data_realizacao, preco, vagas, finalImage, req.user.id],
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
      "SELECT w.*, c.Nome as ApicultorNome, c.Picture as ApicultorFoto FROM workshop w JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente WHERE w.Status = 'Aprovado' ORDER BY w.Data_Realizacao ASC",
    );
    res.json(workshops);
  } catch (err) {
        res.status(500).json({ error: "Database error" });
  }
});

// Single workshop detail
app.get("/api/workshops/:id", async (req, res) => {
  try {
    const workshop = await db.get(
      "SELECT w.*, c.Nome as ApicultorNome, c.Picture as ApicultorFoto FROM workshop w JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente WHERE w.ID_Workshop = ? AND w.Status = 'Aprovado'",
      [req.params.id],
    );
    if (!workshop) return res.status(404).json({ error: "Workshop não encontrado." });
    res.json(workshop);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Client's own workshop reservations
app.get("/api/user/workshops", authenticateToken, async (req, res) => {
  try {
    const reservations = await db.all(
      `SELECT rw.*, w.Titulo, w.Descricao, w.Data_Realizacao, w.Preco, w.Vagas, w.Imagem, w.Status as WorkshopStatus,
              c.Nome as ApicultorNome
       FROM reserva_workshop rw
       JOIN workshop w ON rw.ID_Workshop = w.ID_Workshop
       JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente
       WHERE rw.ID_Cliente = ?
       ORDER BY w.Data_Realizacao ASC`,
      [req.user.id],
    );
    res.json(reservations);
  } catch (err) {
    console.error("User workshops fetch error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Cancel workshop reservation
app.delete("/api/user/workshops/:id", authenticateToken, async (req, res) => {
  try {
    const reservation = await db.get(
      "SELECT * FROM reserva_workshop WHERE ID_Reserva = ? AND ID_Cliente = ?",
      [req.params.id, req.user.id],
    );
    if (!reservation) return res.status(404).json({ error: "Reserva não encontrada." });

    await db.run("DELETE FROM reserva_workshop WHERE ID_Reserva = ?", [req.params.id]);
    await db.run("UPDATE workshop SET Vagas = Vagas + 1 WHERE ID_Workshop = ?", [reservation.ID_Workshop]);
    res.json({ message: "Reserva cancelada com sucesso." });
  } catch (err) {
    console.error("Cancel reservation error:", err);
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

// USER PROFILE ROUTES
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio FROM cliente WHERE ID_Cliente = ?",
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id]
    );

    // Provide default checkoutVerified = false since it's session based
    res.json({ ...user, checkoutVerified: false, orders });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, bio } = req.body;
    let updates = [];
    let params = [];
    if (name !== undefined) { updates.push("Nome = ?"); params.push(name); }
    if (email !== undefined) { updates.push("Email = ?"); params.push(email); }
    if (phone !== undefined) { updates.push("Telefone = ?"); params.push(phone); }
    if (address !== undefined) { updates.push("Morada = ?"); params.push(address); }
    if (bio !== undefined) { updates.push("Bio = ?"); params.push(bio); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(`UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`, params);

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio FROM cliente WHERE ID_Cliente = ?",
      [req.user.id]
    );

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/user/profile/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.get("SELECT Senha FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid) return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [hashed, req.user.id]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/user/upgrade-request-status", authenticateToken, async (req, res) => {
  try {
    const reqInfo = await db.get(
      "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
      [req.user.id]
    );
    if (!reqInfo) {
      return res.json({ status: "none" });
    }
    res.json(reqInfo);
  } catch (error) {
    console.error("Upgrade status error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/api/user/upgrade-request", authenticateToken, async (req, res) => {
  try {
    const { experience, motivation } = req.body;
    const description = `Experiência: ${experience}\nMotivação: ${motivation}`;
    
    const existing = await db.get("SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'", [req.user.id]);
    if (existing) return res.status(400).json({ error: "Já tens um pedido pendente." });

    await db.run("INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)", [
      req.user.id, description, "N/A", "Pendente"
    ]);

    res.json({ message: "Pedido enviado com sucesso" });
  } catch (error) {
    console.error("Upgrade request error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

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

// Get specific order details (Client view)
app.get("/api/user/orders/:id", authenticateToken, async (req, res) => {
  try {
    const order = await db.get(
      "SELECT ID_Encomenda, ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone, Nome, Apelido, Custo_Envio, Tipo_Envio FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
      [req.params.id, req.user.id]
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Fetch order details error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

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

// 7. Initialize Checkout Order (Draft/Pending)
app.post("/api/checkout/init", authenticateToken, async (req, res) => {
  const { address, phone, nome, apelido, shippingCost, shippingType, orderId } = req.body;

  try {
    let items = [];
    let subtotal = 0;

    if (orderId) {
      // If we have an orderId, we are updating an existing order
      const order = await db.get("SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?", [orderId, req.user.id]);
      if (!order) return res.status(404).json({ error: "Encomenda não encontrada" });
      
      // Get items from that order
      items = await db.all("SELECT * FROM item_encomenda WHERE ID_Encomenda = ?", [orderId]);
      subtotal = items.reduce((sum, item) => sum + item.Preco_Unitario * item.Quantidade, 0);
    } else {
      // If no orderId, we must have a cart
      const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [req.user.id]);
      if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

      items = await db.all(
        `SELECT ic.*, p.Preco 
         FROM item_carrinho ic 
         JOIN produto p ON ic.ID_Produto = p.ID_Produto 
         WHERE ic.ID_Carrinho = ?`,
        [cart.ID_Carrinho],
      );

      if (items.length === 0) return res.status(400).json({ error: "Carrinho vazio" });
      subtotal = items.reduce((sum, item) => sum + item.Preco * item.Quantidade, 0);
    }

    const total = subtotal + Number(shippingCost || 0);
    let currentOrderId = orderId;

    if (currentOrderId) {
      // Update existing draft
      await db.run(
        "UPDATE encomenda SET Total = ?, Morada = ?, Telefone = ?, Nome = ?, Apelido = ?, Custo_Envio = ?, Tipo_Envio = ?, Data_Encomenda = CURRENT_TIMESTAMP WHERE ID_Encomenda = ? AND ID_Cliente = ?",
        [total, address, phone, nome, apelido, shippingCost, shippingType, currentOrderId, req.user.id]
      );
      
      // If it was a cart checkout that became an orderId, we might not need to refresh items 
      // but usually we refresh them to match the cart if it's a "draft" being finalized.
      // HOWEVER, if the cart is EMPTY, we MUST NOT refresh items from cart.
      // Let's only refresh items if they came from the cart.
      if (!orderId) {
        await db.run("DELETE FROM item_encomenda WHERE ID_Encomenda = ?", [currentOrderId]);
        for (const item of items) {
          await db.run(
            "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
            [currentOrderId, item.ID_Produto, item.Quantidade, item.Preco],
          );
        }
      }
    } else {
      // Create new draft
      const result = await db.run(
        "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone, Nome, Apelido, Custo_Envio, Tipo_Envio) VALUES (?, CURRENT_TIMESTAMP, ?, 'Pendente', ?, ?, ?, ?, ?, ?)",
        [req.user.id, total, address, phone, nome, apelido, shippingCost, shippingType],
      );
      currentOrderId = result.lastID;

      // Save items
      for (const item of items) {
        await db.run(
          "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
          [currentOrderId, item.ID_Produto, item.Quantidade, item.Preco],
        );
      }
    }

    res.json({ orderId: currentOrderId });
  } catch (error) {
    console.error("Checkout init error:", error);
    res.status(500).json({ error: "Falha ao inicializar encomenda" });
  }
});

// Stripe Checkout Session Creation
app.post("/api/checkout/create-session", authenticateToken, async (req, res) => {
  const {
    address,
    phone,
    nome,
    apelido,
    shippingCost,
    shippingType,
    orderId,
    paymentType,
  } = req.body;

  try {
    let items = [];
    let subtotal = 0;
    let finalOrderId = orderId;
    const requestedPaymentType = paymentType === "mbway" ? "mb_way" : "card";

    if (finalOrderId) {
      // Validate existing order
      const order = await db.get("SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?", [finalOrderId, req.user.id]);
      if (!order) return res.status(404).json({ error: "Encomenda não encontrada" });

      items = await db.all(
        `SELECT ie.*, p.Nome, p.Imagem 
         FROM item_encomenda ie 
         JOIN produto p ON ie.ID_Produto = p.ID_Produto 
         WHERE ie.ID_Encomenda = ?`,
        [finalOrderId]
      );
      // Map properties to match expected format below
      items = items.map(it => ({ ...it, Preco: it.Preco_Unitario }));
      
      subtotal = items.reduce((sum, item) => sum + item.Preco * item.Quantidade, 0);
      const total = subtotal + Number(shippingCost || 0);

      // Update order details
      await db.run(
        "UPDATE encomenda SET Total = ?, Morada = ?, Telefone = ?, Nome = ?, Apelido = ?, Custo_Envio = ?, Tipo_Envio = ? WHERE ID_Encomenda = ?",
        [total, address, phone, nome, apelido, shippingCost, shippingType, finalOrderId]
      );
    } else {
      // Create from cart
      const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [req.user.id]);
      if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

      items = await db.all(
        `SELECT ic.*, p.Nome, p.Preco, p.Imagem 
         FROM item_carrinho ic 
         JOIN produto p ON ic.ID_Produto = p.ID_Produto 
         WHERE ic.ID_Carrinho = ?`,
        [cart.ID_Carrinho],
      );

      if (items.length === 0) return res.status(400).json({ error: "Carrinho vazio" });

      subtotal = items.reduce((sum, item) => sum + item.Preco * item.Quantidade, 0);
      const total = subtotal + Number(shippingCost || 0);

      const result = await db.run(
        "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone, Nome, Apelido, Custo_Envio, Tipo_Envio) VALUES (?, CURRENT_TIMESTAMP, ?, 'Pendente', ?, ?, ?, ?, ?, ?)",
        [req.user.id, total, address, phone, nome, apelido, shippingCost, shippingType],
      );
      finalOrderId = result.lastID;

      for (const item of items) {
        await db.run(
          "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
          [finalOrderId, item.ID_Produto, item.Quantidade, item.Preco],
        );
      }
    }
    
    // CLEAR CART: Clear the database cart when the order is created/finalized
    await db.run(
      "DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)",
      [req.user.id]
    );


    // 5. MOCK MODE LOGIC
    if (!stripe) {
      console.log("⚠️ STRIPE_SECRET_KEY missing. Entering MOCK MODE.");
      
      // Update Stock (Simulated)
      for (const item of items) {
        await db.run("UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?", [item.Quantidade, item.ID_Produto]);
      }

      // Clear Cart (if applicable)
      await db.run("DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)", [req.user.id]);

      await fulfillPaidOrder(finalOrderId);
      return res.json({ 
        url: `/success.html?orderId=${finalOrderId}&mock=true`,
        isMock: true 
      });
    }

    await syncCustomerCheckoutDetails(req.user.id, {
      nome,
      apelido,
      address,
      phone,
    });

    // 6. REAL STRIPE SESSION
    const lineItems = items.map(item => {
      const productImages = getCheckoutProductImages(req.headers.origin, item.Imagem, item.Nome);

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.Nome,
            ...(productImages.length > 0 ? { images: productImages } : {}),
          },
          unit_amount: Math.round(item.Preco * 100), // Stripe uses cents
        },
        quantity: item.Quantidade,
      };
    });

    if (Number(shippingCost || 0) > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Envio (CTT Expresso)' },
          unit_amount: Math.round(Number(shippingCost || 0) * 100),
        },
        quantity: 1,
      });
    }

    const customer = await db.get(
      "SELECT Email FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types:
        requestedPaymentType === "mb_way"
          ? ["mb_way", "card"]
          : ["card", "mb_way"],
      line_items: lineItems,
      mode: 'payment',
      locale: 'pt',
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&orderId=${finalOrderId}`,
      cancel_url: `${req.headers.origin}/cancel.html?orderId=${finalOrderId}`,
      metadata: {
        orderId: finalOrderId.toString(),
        paymentPreference: requestedPaymentType,
      },
      customer_email: customer?.Email || undefined,
    });

    res.json({ url: session.url });

  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "Falha ao criar sessão de pagamento" });
  }
});

app.get("/api/checkout/session-status", async (req, res) => {
  const sessionId = req.query.session_id;

  if (!stripe) {
    return res.status(400).json({ error: "Stripe nao configurado" });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "session_id em falta" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = Number(session.metadata?.orderId);

    if (!orderId) {
      return res.status(400).json({ error: "Sessao sem orderId valido" });
    }

    if (session.payment_status === "paid") {
      await fulfillPaidOrder(orderId);
    }

    res.json({
      orderId,
      paymentStatus: session.payment_status,
      status: session.status,
    });
  } catch (error) {
    console.error("Stripe session status error:", error);
    res.status(500).json({ error: "Falha ao validar sessao Stripe" });
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
      const payload = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);

      event = JSON.parse(payload);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId && session.payment_status === 'paid') {
        const result = await fulfillPaidOrder(orderId);
        console.log(
          `Order #${orderId} fulfilled via webhook (${result.alreadyPaid ? "already paid" : "new payment"}).`,
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Checkout Route (Legacy/Manual for MBWay or fallback)
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  if (!req.user.checkoutVerified) {
    return res.status(401).json({ error: "2FA_REQUIRED" });
  }

  const { address, phone, nome, apelido, shippingCost, shippingType, orderId } = req.body;

  try {
    let items = [];
    let subtotal = 0;
    let finalOrderId = orderId;

    if (finalOrderId) {
      // Validate existing order
      const order = await db.get("SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?", [finalOrderId, req.user.id]);
      if (!order) return res.status(404).json({ error: "Encomenda não encontrada" });

      items = await db.all("SELECT * FROM item_encomenda WHERE ID_Encomenda = ?", [finalOrderId]);
      // Use price from item_encomenda
      items = items.map(it => ({ ...it, Preco: it.Preco_Unitario }));
      subtotal = items.reduce((sum, item) => sum + item.Preco * item.Quantidade, 0);

      const total = subtotal + Number(shippingCost || 0);

      await db.run(
        "UPDATE encomenda SET Total = ?, Morada = ?, Telefone = ?, Nome = ?, Apelido = ?, Custo_Envio = ?, Tipo_Envio = ? WHERE ID_Encomenda = ?",
        [total, address, phone, nome, apelido, shippingCost, shippingType, finalOrderId]
      );
    } else {
      const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [req.user.id]);
      if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

      items = await db.all(
        `SELECT ic.*, p.Nome, p.Preco
         FROM item_carrinho ic
         JOIN produto p ON ic.ID_Produto = p.ID_Produto
         WHERE ic.ID_Carrinho = ?`,
        [cart.ID_Carrinho],
      );

      if (items.length === 0) return res.status(400).json({ error: "Carrinho vazio" });

      subtotal = items.reduce((sum, item) => sum + item.Preco * item.Quantidade, 0);
      const total = subtotal + Number(shippingCost || 0);

      const result = await db.run(
        "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone, Nome, Apelido, Custo_Envio, Tipo_Envio) VALUES (?, CURRENT_TIMESTAMP, ?, 'Pendente', ?, ?, ?, ?, ?, ?)",
        [req.user.id, total, address, phone, nome, apelido, shippingCost, shippingType],
      );
      finalOrderId = result.lastID;

      for (const item of items) {
        await db.run(
          "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
          [finalOrderId, item.ID_Produto, item.Quantidade, item.Preco],
        );
      }
    }

    await syncCustomerCheckoutDetails(req.user.id, {
      nome,
      apelido,
      address,
      phone,
    });

    for (const item of items) {
      await db.run(
        "UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?",
        [item.Quantidade, item.ID_Produto],
      );
    }

    await db.run("UPDATE encomenda SET Status = 'Pago' WHERE ID_Encomenda = ?", [
      finalOrderId,
    ]);

    // Clear cart for the user
    await db.run("DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)", [req.user.id]);

    res.json({ success: true, orderId: finalOrderId });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Erro ao processar encomenda" });
  }
});

// ============================================================
// COMMUNITY Q&A ROUTES
// ============================================================

// ============================================================
// MODERATION - Inline profanity filter
// ============================================================
const BAD_WORDS_LIST = [
  "nigger","nigga","faggot","fag","chink","spic","kike","retard","cunt",
  "fuck","shit","bitch","asshole","bastard","dick","cock","pussy","whore",
  "slut","motherfucker","crap","prick","twat",
  "merda","caralho","puta","foda","cona","fdp","porra","paneleiro",
  "cabrao","corno","carago","pila","picha","cuzinho","foder"
];
function censorText(text) {
  let result = text;
  for (const word of BAD_WORDS_LIST) {
    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    result = result.replace(regex, function(m) { return '*'.repeat(m.length); });
  }
  return result;
}
// Get all questions (with answers and author info), sorted by votes desc
app.get("/api/comunidade/perguntas", async (req, res) => {
  try {
    const perguntas = await db.all(`
      SELECT p.*, c.Nome AS AutorNome, c.Picture AS AutorPicture, c.UserType AS AutorTipo
      FROM pergunta_comunidade p
      JOIN cliente c ON p.ID_Cliente = c.ID_Cliente
      ORDER BY p.Votos DESC, p.Data_Criacao DESC
    `);

    for (const pergunta of perguntas) {
      pergunta.respostas = await db.all(`
        SELECT r.*, c.Nome AS AutorNome, c.Picture AS AutorPicture, c.UserType AS AutorTipo
        FROM resposta_comunidade r
        JOIN cliente c ON r.ID_Cliente = c.ID_Cliente
        WHERE r.ID_Pergunta = ?
        ORDER BY r.Melhor_Resposta DESC, r.Votos DESC, r.Data_Criacao ASC
      `, [pergunta.ID_Pergunta]);
    }

    res.json(perguntas);
  } catch (error) {
    console.error("Q&A fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Post a new question (authenticated)
app.post("/api/comunidade/perguntas", authenticateToken, async (req, res) => {
  const { texto } = req.body;
  if (!texto || texto.trim().length < 10) {
    return res.status(400).json({ error: "A pergunta deve ter pelo menos 10 caracteres." });
  }

  try {
    const safeText = censorText(texto.trim());
    const result = await db.run(
      "INSERT INTO pergunta_comunidade (ID_Cliente, Texto) VALUES (?, ?)",
      [req.user.id, safeText]
    );
    res.status(201).json({ id: result.lastID, message: "Pergunta publicada!" });
  } catch (error) {
    console.error("Q&A question create error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a question (admin or author)
app.delete("/api/comunidade/perguntas/:id", authenticateToken, async (req, res) => {
  try {
    const pergunta = await db.get("SELECT * FROM pergunta_comunidade WHERE ID_Pergunta = ?", [req.params.id]);
    if (!pergunta) return res.status(404).json({ error: "Pergunta não encontrada." });
    if (pergunta.ID_Cliente !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: "Sem permissão." });
    
    await db.run("DELETE FROM pergunta_comunidade WHERE ID_Pergunta = ?", [req.params.id]);
    res.json({ message: "Pergunta removida." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Post an answer to a question (authenticated)
app.post("/api/comunidade/perguntas/:id/respostas", authenticateToken, async (req, res) => {
  const { texto } = req.body;
  const perguntaId = req.params.id;

  if (!texto || texto.trim().length < 2) {
    return res.status(400).json({ error: "A resposta deve ter pelo menos 2 caracteres." });
  }

  try {
    const pergunta = await db.get("SELECT * FROM pergunta_comunidade WHERE ID_Pergunta = ?", [perguntaId]);
    if (!pergunta) {
      return res.status(404).json({ error: "Pergunta não encontrada." });
    }

    const safeText = censorText(texto.trim());
    const result = await db.run(
      "INSERT INTO resposta_comunidade (ID_Pergunta, ID_Cliente, Texto) VALUES (?, ?, ?)",
      [perguntaId, req.user.id, safeText]
    );
    res.status(201).json({ id: result.lastID, message: "Resposta publicada!" });
  } catch (error) {
    console.error("Q&A answer create error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Vote on a question
app.post("/api/comunidade/perguntas/:id/votar", authenticateToken, async (req, res) => {
  try {
    if (req.body && req.body.action === 'remove') {
      await db.run("UPDATE pergunta_comunidade SET Votos = GREATEST(0, Votos - 1) WHERE ID_Pergunta = ?", [req.params.id]);
      res.json({ message: "Voto removido!" });
    } else {
      await db.run("UPDATE pergunta_comunidade SET Votos = Votos + 1 WHERE ID_Pergunta = ?", [req.params.id]);
      res.json({ message: "Voto registado!" });
    }
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Vote on an answer
app.post("/api/comunidade/respostas/:id/votar", authenticateToken, async (req, res) => {
  try {
    if (req.body && req.body.action === 'remove') {
      await db.run("UPDATE resposta_comunidade SET Votos = GREATEST(0, Votos - 1) WHERE ID_Resposta = ?", [req.params.id]);
      res.json({ message: "Voto removido!" });
    } else {
      await db.run("UPDATE resposta_comunidade SET Votos = Votos + 1 WHERE ID_Resposta = ?", [req.params.id]);
      res.json({ message: "Voto registado!" });
    }
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Analytics mock route to prevent 404s in the console
app.post("/api/logs/interaction", (req, res) => {
  res.status(204).send();
});

startServer();

// ============================================================
// AUTOMATIC CLEANUP: Delete 'Pendente' orders older than 24h
// ============================================================
async function cleanupPendingOrders() {
  try {
    console.log("🧹 Running cleanup for expired pending orders...");
    const result = await db.run(`
      DELETE FROM encomenda 
      WHERE Status = 'Pendente' 
      AND Data_Encomenda < DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);
    if (result.changes > 0) {
      console.log(`✅ Cleaned up ${result.changes} expired orders.`);
    }
  } catch (error) {
    if (error.code !== "ECONNREFUSED" && error.message !== "Database pool not initialized. Call initDB() first.") {
        console.error("Cleanup error:", error);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupPendingOrders, 60 * 60 * 1000);
// Also run once on startup (with a small delay to ensure DB is ready)
setTimeout(cleanupPendingOrders, 10000);

initializeDatabase().catch((error) => {
  console.error("Unexpected database bootstrap error:", error);
});
