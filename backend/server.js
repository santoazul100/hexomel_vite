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

// ============================================================
// SLUG UTILITIES
// ============================================================
function slugify(text) {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric
    .replace(/[\s_]+/g, "-") // Spaces/underscores to hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

async function generateUniqueSlug(baseSlug, existingId = null) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const query = existingId
      ? "SELECT ID_Produto FROM produto WHERE Slug = ? AND ID_Produto != ?"
      : "SELECT ID_Produto FROM produto WHERE Slug = ?";
    const params = existingId ? [slug, existingId] : [slug];
    const existing = await db.get(query, params);
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

const configuredGoogleClientId =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "change-me"
    ? process.env.GOOGLE_CLIENT_ID
    : null;
const stripe =
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "placeholder"
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
let mailTransporterError = null;

async function initMailTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    mailTransporterError = "SMTP_USER/SMTP_PASS missing.";
    console.warn("⚠️ Mailer disabled: SMTP_USER/SMTP_PASS missing.");
    return;
  }

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
    console.log(`📧 Email transporter ready for ${process.env.SMTP_USER}.`);
    mailTransporterError = null;
  } catch (error) {
    mailTransporter = null;
    mailTransporterError = error.message;
    console.warn("⚠️ Email transporter failed:", error.message);
  }
}
initMailTransporter().catch(console.error);

// Generate Receipt HTML (used for email and download)
function generateReceiptHTML(
  order,
  items,
  customerName,
  customerEmail,
  logoSrc = "cid:logo",
) {
  const orderDate = new Date(
    order.Data_Encomenda || order.date,
  ).toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const subtotal = items.reduce(
    (sum, i) => sum + i.Preco_Unitario * i.Quantidade,
    0,
  );
  const total = parseFloat(order.Total || order.total);
  const shipping = total - subtotal;

  const itemRows = items
    .map(
      (i) => `
    <tr>
      <td style="padding:15px; border-bottom:1px solid #edf2f7; font-family: sans-serif;">
        <div style="font-weight:bold; color:#1a4d2e; font-size:16px;">${i.Nome}</div>
        <div style="font-size:12px; color:#718096; margin-top:4px;"><span style="color:#b45309; font-weight:bold;">Apicultor:</span> ${i.ApicultorNome || "Hexomel"} &bull; Qtd: ${i.Quantidade} &bull; €${parseFloat(i.Preco_Unitario).toFixed(2)}/un</div>
      </td>
      <td style="padding:15px; border-bottom:1px solid #edf2f7; text-align:right; font-family: sans-serif; font-weight:bold; color:#1a4d2e; font-size:16px;">
        €${(i.Preco_Unitario * i.Quantidade).toFixed(2)}
      </td>
    </tr>
  `,
    )
    .join("");

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
                      ${
                        shipping > 0.05
                          ? `<tr>
                        <td style="padding:5px 0; font-size:14px; color:#4a5568;">Portes</td>
                        <td style="padding:5px 0; font-size:14px; color:#4a5568; text-align:right;">€${shipping.toFixed(2)}</td>
                      </tr>`
                          : ""
                      }
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
    const order = await db.get(
      "SELECT * FROM encomenda WHERE ID_Encomenda = ?",
      [orderId],
    );
    if (!order) return;

    const customer = await db.get(
      "SELECT Nome, Email FROM cliente WHERE ID_Cliente = ?",
      [order.ID_Cliente],
    );
    if (!customer || !customer.Email) return;

    const items = await db.all(
      `SELECT ie.*, p.Nome FROM item_encomenda ie JOIN produto p ON ie.ID_Produto = p.ID_Produto WHERE ie.ID_Encomenda = ?`,
      [orderId],
    );

    const html = generateReceiptHTML(
      order,
      items,
      customer.Nome,
      customer.Email,
    );

    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
      to: customer.Email,
      subject: `🍯 Recibo da Encomenda #${orderId} — Hexomel`,
      html,
      attachments: [
        {
          filename: "logo_hexomel.webp",
          path: "../frontend/public/images/logo_hexomel.webp",
          cid: "logo", // referenced in the HTML as src="cid:logo"
        },
      ],
    });
    console.log(
      `📧 Receipt email sent for order #${orderId} to ${customer.Email}`,
    );
  } catch (err) {
    console.error(
      `📧 Failed to send receipt email for order #${orderId}:`,
      err.message,
    );
  }
}
async function syncCustomerCheckoutDetails(
  customerId,
  { nome, apelido, address, phone },
) {
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
    await db.run("UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?", [
      item.Quantidade,
      item.ID_Produto,
    ]);
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

  const publicBaseUrl = (
    process.env.CHECKOUT_PUBLIC_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    origin
  ).replace(/\/$/, ""); // Remove trailing slash if present

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith("/")
    ? assetPath
    : `/${assetPath}`;
  return `${publicBaseUrl}${normalizedPath}`;
}

function isLocalCheckoutUrl(value) {
  if (!value) {
    return true;
  }

  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    );
  } catch {
    return true;
  }
}

function normalizeProductNameForImage(productName) {
  return (productName || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCheckoutProductImages(origin, imagePath, productName, productId) {
  const publicBaseUrl =
    process.env.CHECKOUT_PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL;
  const nameLower = (productName || "").toLowerCase();

  console.log(
    `[Stripe Debug] Resolving images for: "${productName}" (ID: ${productId})`,
  );
  console.log(
    `[Stripe Debug] Config: BaseUrl=${publicBaseUrl}, Origin=${origin}`,
  );

  // 1. Resolve absolute URL if we have a public base URL
  const buildUrl = (baseUrl, path) => {
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  };

  // 2. Determine if we are in Localhost mode
  const isLocalhost =
    !origin ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    (publicBaseUrl &&
      (publicBaseUrl.includes("localhost") ||
        publicBaseUrl.includes("127.0.0.1")));

  if (isLocalhost) {
    console.log(
      `[Stripe Debug] Localhost detected. Stripe cannot access local files. Using public placeholders...`,
    );

    let placeholderUrl = "";
    if (nameLower.includes("mel")) {
      placeholderUrl =
        "https://images.unsplash.com/photo-1471943311424-646960669fba?q=80&w=600";
    } else if (nameLower.includes("favo")) {
      placeholderUrl =
        "https://images.unsplash.com/photo-1558583082-409143c794ca?q=80&w=600";
    } else if (nameLower.includes("polen") || nameLower.includes("pólen")) {
      placeholderUrl =
        "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=600";
    } else if (
      nameLower.includes("prop") ||
      nameLower.includes("próp") ||
      nameLower.includes("cera")
    ) {
      placeholderUrl =
        "https://images.unsplash.com/photo-1610424564335-9774d008d56c?q=80&w=600";
    } else {
      const encodedName = encodeURIComponent(productName || "Hexomel").replace(
        /%20/g,
        "+",
      );
      placeholderUrl = `https://placehold.co/600x600/1a4d2e/ffffff/png?text=${encodedName}`;
    }

    console.log(`[Stripe Debug] Generated Placeholder: ${placeholderUrl}`);
    return [placeholderUrl];
  }

  // 3. In Production or with Ngrok
  let finalPath = imagePath || `/images/logo_hexomel.webp`;
  const absoluteUrl = buildUrl(publicBaseUrl || origin, finalPath);

  console.log(`[Stripe Debug] Using absolute URL: ${absoluteUrl}`);
  return [absoluteUrl];
}

function getStripeCheckoutProductImages(
  origin,
  imagePath,
  productName,
  productId,
) {
  const configuredPublicBaseUrl =
    process.env.CHECKOUT_PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL;
  const checkoutBaseUrl = configuredPublicBaseUrl || origin;

  console.log(
    `[Stripe Debug] Resolving public image for: "${productName}" (ID: ${productId})`,
  );
  console.log(
    `[Stripe Debug] Config: BaseUrl=${configuredPublicBaseUrl}, Origin=${origin}`,
  );

  if (
    imagePath &&
    /^https?:\/\//i.test(imagePath) &&
    !isLocalCheckoutUrl(imagePath)
  ) {
    console.log(`[Stripe Debug] Using product absolute URL: ${imagePath}`);
    return [imagePath];
  }

  if (imagePath && checkoutBaseUrl && !isLocalCheckoutUrl(checkoutBaseUrl)) {
    const absoluteUrl = new URL(
      imagePath.replace(/\\/g, "/"),
      `${checkoutBaseUrl.replace(/\/$/, "")}/`,
    ).toString();

    console.log(`[Stripe Debug] Using product public URL: ${absoluteUrl}`);
    return [absoluteUrl];
  }

  const placeholderUrl =
    "https://placehold.co/600x600/e5e7eb/374151.png?font=montserrat&text=IMG";

  console.log(
    "[Stripe Debug] Public URL not available. Using public placeholder image.",
  );
  return [placeholderUrl];
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
      .run(
        "ALTER TABLE cliente ADD COLUMN Verification_Token VARCHAR(255) DEFAULT NULL",
      )
      .catch(() => console.log("Verification_Token col already exists"));

    await db
      .run(
        "ALTER TABLE cliente ADD COLUMN Checkout_OTP VARCHAR(10) DEFAULT NULL",
      )
      .catch(() => console.log("Checkout_OTP col already exists"));

    await db
      .run(
        "ALTER TABLE cliente ADD COLUMN Checkout_OTP_Expires DATETIME DEFAULT NULL",
      )
      .catch(() => console.log("Checkout_OTP_Expires col already exists"));

    await db
      .run(
        "ALTER TABLE cliente ADD COLUMN Checkout_Verified BOOLEAN DEFAULT FALSE",
      )
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
      .run(
        "ALTER TABLE workshop ADD COLUMN Status VARCHAR(20) DEFAULT 'Pendente'",
      )
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
    await db
      .run(
        "ALTER TABLE encomenda ADD COLUMN Custo_Envio DECIMAL(10,2) DEFAULT 0",
      )
      .catch(() => {});
    await db
      .run(
        "ALTER TABLE encomenda ADD COLUMN Tipo_Envio VARCHAR(50) DEFAULT 'ctt'",
      )
      .catch(() => {});
    await db
      .run("ALTER TABLE encomenda ADD COLUMN Nome VARCHAR(120) DEFAULT NULL")
      .catch(() => {});
    await db
      .run("ALTER TABLE encomenda ADD COLUMN Apelido VARCHAR(120) DEFAULT NULL")
      .catch(() => {});

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

    // SEO Slugs: Add Slug column to produto
    await db
      .run("ALTER TABLE produto ADD COLUMN Slug VARCHAR(200) DEFAULT NULL")
      .catch(() => console.log("Slug col already exists"));
    await db
      .run("ALTER TABLE produto ADD UNIQUE INDEX uk_slug (Slug)")
      .catch(() => console.log("Slug unique index already exists"));

    // SEO Slugs: Create site_slugs table
    await db
      .run(
        `
        CREATE TABLE IF NOT EXISTS site_slugs (
          ID_Slug int(10) NOT NULL AUTO_INCREMENT,
          Pagina VARCHAR(60) NOT NULL,
          Slug VARCHAR(200) NOT NULL,
          Titulo_SEO VARCHAR(200) DEFAULT NULL,
          Descricao_SEO TEXT DEFAULT NULL,
          PRIMARY KEY (ID_Slug),
          UNIQUE KEY uk_pagina (Pagina),
          UNIQUE KEY uk_page_slug (Slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("site_slugs table creation handled"));

    // Seed default site slugs if empty
    const slugCount = await db
      .get("SELECT COUNT(*) as c FROM site_slugs")
      .catch(() => ({ c: 1 }));
    if (slugCount && slugCount.c === 0) {
      const defaults = [
        [
          "inicio",
          "inicio",
          "Hexomel — Mel Artesanal Premium",
          "Mel 100% natural da Serra da Estrela. Produção artesanal com tradição desde 1984.",
        ],
        [
          "loja",
          "loja",
          "Loja — Hexomel",
          "Descubra a nossa seleção de méis artesanais, pólen, própolis e outros produtos da colmeia.",
        ],
        [
          "sobre",
          "sobre-nos",
          "Sobre Nós — Hexomel",
          "Conheça a história da Hexomel e a nossa paixão pela apicultura tradicional.",
        ],
        [
          "contactos",
          "contactos",
          "Contactos — Hexomel",
          "Entre em contacto connosco. Estamos na Serra da Estrela, Portugal.",
        ],
        [
          "workshops",
          "workshops",
          "Workshops — Hexomel",
          "Participe nas nossas experiências de apicultura e workshops.",
        ],
        [
          "curiosidades",
          "curiosidades",
          "Curiosidades — Hexomel",
          "Descubra factos curiosos sobre mel, abelhas e apicultura.",
        ],
        [
          "comunidade",
          "comunidade",
          "Comunidade — Hexomel",
          "Junte-se à comunidade Hexomel. Perguntas, respostas e partilha.",
        ],
        [
          "apicultores",
          "apicultores",
          "Apicultores — Hexomel",
          "Conheça os nossos apicultores parceiros e os seus produtos.",
        ],
      ];
      for (const [pagina, slug, titulo, desc] of defaults) {
        await db
          .run(
            "INSERT IGNORE INTO site_slugs (Pagina, Slug, Titulo_SEO, Descricao_SEO) VALUES (?, ?, ?, ?)",
            [pagina, slug, titulo, desc],
          )
          .catch(() => {});
      }
    }

    // Backfill slugs for existing products that don't have one
    const productsWithoutSlug = await db
      .all(
        "SELECT ID_Produto, Nome FROM produto WHERE Slug IS NULL OR Slug = ''",
      )
      .catch(() => []);
    for (const p of productsWithoutSlug) {
      const baseSlug = slugify(p.Nome);
      if (baseSlug) {
        const uniqueSlug = await generateUniqueSlug(baseSlug, p.ID_Produto);
        await db
          .run("UPDATE produto SET Slug = ? WHERE ID_Produto = ?", [
            uniqueSlug,
            p.ID_Produto,
          ])
          .catch(() => {});
      }
    }

    // Site Settings (key-value store for admin preferences)
    await db
      .run(
        `
        CREATE TABLE IF NOT EXISTS site_settings (
          setting_key VARCHAR(100) NOT NULL,
          setting_value TEXT,
          PRIMARY KEY (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("site_settings table creation handled"));

    // Quiz Tables
    await db
      .run(
        `
        CREATE TABLE IF NOT EXISTS quiz_pergunta (
          ID_Pergunta int(10) NOT NULL AUTO_INCREMENT,
          Pergunta TEXT NOT NULL,
          Opcao1 VARCHAR(255) NOT NULL,
          Opcao2 VARCHAR(255) NOT NULL,
          Opcao3 VARCHAR(255) NOT NULL,
          Opcao4 VARCHAR(255) NOT NULL,
          Resposta_Correta INT NOT NULL,
          Explicacao TEXT NOT NULL,
          Data_Criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ID_Pergunta)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("quiz_pergunta table creation handled"));

    await db
      .run(
        `
        CREATE TABLE IF NOT EXISTS quiz_score (
          ID_Score int(10) NOT NULL AUTO_INCREMENT,
          ID_Cliente int(10) NOT NULL,
          Score INT NOT NULL,
          Max_Score INT NOT NULL,
          Data_Score TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ID_Score),
          KEY ID_Cliente (ID_Cliente),
          CONSTRAINT fk_quiz_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("quiz_score table creation handled"));

    // Seed default quiz questions if empty
    const quizCount = await db
      .get("SELECT COUNT(*) as c FROM quiz_pergunta")
      .catch(() => ({ c: 1 }));
    if (quizCount && quizCount.c === 0) {
      const defaultQuestions = [
        [
          "Quantas flores uma abelha visita para produzir 1 kg de mel?",
          "500 mil",
          "2 a 4 milhões",
          "100 mil",
          "10 milhões",
          1,
          "Para produzir 1 kg de mel, as abelhas visitam entre 2 a 4 milhões de flores!",
        ],
        [
          "Quanto tempo vive uma abelha operária no verão?",
          "1 ano",
          "6 meses",
          "Cerca de 45 dias",
          "2 semanas",
          2,
          "Uma abelha operária vive cerca de 45 dias no verão, trabalhando incansavelmente.",
        ],
        [
          "Quantos ovos pode a abelha rainha pôr por dia?",
          "100",
          "500",
          "1.000",
          "Até 3.000",
          3,
          "A rainha pode pôr até 3.000 ovos por dia — quase um a cada 30 segundos!",
        ],
        [
          "O mel puro tem prazo de validade?",
          "Sim, 2 anos",
          "Sim, 5 anos",
          "Não, nunca expira",
          "Depende da flor",
          2,
          "O mel puro nunca expira! Potes de mel com 3.000 anos foram encontrados intactos em tumbas egípcias.",
        ],
        [
          "Que percentagem das plantas com flor depende das abelhas para polinização?",
          "20%",
          "50%",
          "80%",
          "95%",
          2,
          "As abelhas são responsáveis pela polinização de cerca de 80% das plantas com flor.",
        ],
        [
          "Quem recebeu o Prémio Nobel pela descoberta da 'dança das abelhas'?",
          "Charles Darwin",
          "Karl von Frisch",
          "Albert Einstein",
          "Gregor Mendel",
          1,
          "Karl von Frisch recebeu o Nobel de Fisiologia/Medicina em 1973 pela descoberta da dança das abelhas.",
        ],
        [
          "O que indica a cristalização do mel?",
          "Mel estragado",
          "Mel com açúcar adicionado",
          "Pureza e qualidade",
          "Mel de fraca qualidade",
          2,
          "A cristalização é um processo natural e forte indicador de que o mel é puro e de qualidade.",
        ],
        [
          "Quantas asas tem uma abelha?",
          "2",
          "4",
          "6",
          "8",
          1,
          "As abelhas têm 4 asas que podem bater até 200 vezes por segundo!",
        ],
      ];
      for (const q of defaultQuestions) {
        await db
          .run(
            "INSERT INTO quiz_pergunta (Pergunta, Opcao1, Opcao2, Opcao3, Opcao4, Resposta_Correta, Explicacao) VALUES (?, ?, ?, ?, ?, ?, ?)",
            q,
          )
          .catch(() => {});
      }
    }

    // --- Módulo Menu Dinâmico ---
    await db
      .run(
        `
      CREATE TABLE IF NOT EXISTS menu_nav (
        ID_Menu int(10) NOT NULL AUTO_INCREMENT,
        Label varchar(100) NOT NULL,
        Link varchar(255) NOT NULL,
        Ordenacao int(10) DEFAULT 0,
        Ativo boolean DEFAULT TRUE,
        Abrir_Nova_Aba boolean DEFAULT FALSE,
        ID_Parent int(10) DEFAULT NULL,
        PRIMARY KEY (ID_Menu),
        CONSTRAINT fk_menu_parent FOREIGN KEY (ID_Parent) REFERENCES menu_nav (ID_Menu) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
      )
      .catch((err) => console.error("Error creating menu_nav table:", err));

    await db.run("ALTER TABLE menu_nav ADD COLUMN ID_Parent INT DEFAULT NULL").catch(() => {});

    const menuCount = await db
      .get("SELECT COUNT(*) as c FROM menu_nav")
      .catch(() => ({ c: 1 }));
    if (menuCount && menuCount.c === 0) {
      const defaultMenus = [
        [1, "Início", "index.html", 1, 1, null],
        [2, "Produtos", "shop.html", 2, 1, null],
        [3, "Workshops", "workshops.html", 3, 1, null],
        [4, "Descobrir", "#", 4, 1, null],
        [5, "Curiosidades", "curiosidades.html", 1, 1, 4],
        [6, "Aprender", "aprender.html", 2, 1, 4],
        [7, "Comunidade", "comunidade.html", 3, 1, 4],
        [8, "Sobre Nós", "about.html", 5, 1, null],
        [9, "Contactos", "contact.html", 6, 1, null]
      ];
      for (const m of defaultMenus) {
        await db.run(
          "INSERT INTO menu_nav (ID_Menu, Label, Link, Ordenacao, Ativo, ID_Parent) VALUES (?, ?, ?, ?, ?, ?)",
          m
        ).catch(() => {});
      }
    }

    // Garantir migração de dados para a estrutura de dropdown (se o utilizador tiver dados antigos)
    try {
      const descMenu = await db.get("SELECT ID_Menu FROM menu_nav WHERE Label = 'Descobrir' OR Label = 'descobrir'");
      let parentId;
      if (!descMenu) {
        const insertRes = await db.run(
          "INSERT INTO menu_nav (Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba, ID_Parent) VALUES (?, ?, ?, ?, ?, ?)",
          ["Descobrir", "#", 4, 1, 0, null]
        );
        parentId = insertRes.lastID;
        console.log(`Created 'Descobrir' menu with ID: ${parentId}`);
      } else {
        parentId = descMenu.ID_Menu;
      }

      await db.run(
        "UPDATE menu_nav SET ID_Parent = ?, Ordenacao = 1 WHERE Label = 'Curiosidades' AND ID_Parent IS NULL",
        [parentId]
      );
      await db.run(
        "UPDATE menu_nav SET ID_Parent = ?, Ordenacao = 2 WHERE Label = 'Aprender' AND ID_Parent IS NULL",
        [parentId]
      );
      await db.run(
        "UPDATE menu_nav SET ID_Parent = ?, Ordenacao = 3 WHERE Label = 'Comunidade' AND ID_Parent IS NULL",
        [parentId]
      );
    } catch (migError) {
      console.error("Error running menu data migration:", migError);
    }

    const menuRows = await db.all("SELECT ID_Menu, Ordenacao FROM menu_nav ORDER BY Ordenacao ASC, ID_Menu ASC").catch(() => []);
    for (let index = 0; index < menuRows.length; index++) {
      const normalizedOrder = index + 1;
      if (Number(menuRows[index].Ordenacao) !== normalizedOrder) {
        await db
          .run("UPDATE menu_nav SET Ordenacao = ? WHERE ID_Menu = ?", [
            normalizedOrder,
            menuRows[index].ID_Menu,
          ])
          .catch(() => {});
      }
    }

    // --- Módulo Recuperação de Senha ---
    await db
      .run(
        `
      CREATE TABLE IF NOT EXISTS password_recovery (
        ID_Recovery int(10) NOT NULL AUTO_INCREMENT,
        ID_Cliente int(10) NOT NULL,
        Token varchar(255) NOT NULL,
        Expires_At datetime NOT NULL,
        Used boolean DEFAULT FALSE,
        Created_At timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ID_Recovery),
        UNIQUE KEY uk_recovery_token (Token),
        CONSTRAINT fk_recovery_cliente FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
      )
      .catch((err) =>
        console.error("Error creating password_recovery table:", err),
      );

    // --- Módulo CMS Geral ---
    await db
      .run(
        `
      CREATE TABLE IF NOT EXISTS cms_content (
        ID_Content int(10) NOT NULL AUTO_INCREMENT,
        Page_Key varchar(50) NOT NULL,
        Block_Key varchar(100) NOT NULL,
        Type varchar(20) DEFAULT 'text',
        Content_Value text NOT NULL,
        PRIMARY KEY (ID_Content),
        UNIQUE KEY uk_page_block (Page_Key, Block_Key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
      )
      .catch((err) => console.error("Error creating cms_content table:", err));

    const cmsCount = await db
      .get("SELECT COUNT(*) as c FROM cms_content")
      .catch(() => ({ c: 1 }));
    if (cmsCount && cmsCount.c === 0) {
      const defaultCMS = [
        ["home", "hero_title", "text", "Mel Artesanal Premium"],
        [
          "home",
          "hero_subtitle",
          "text",
          "O melhor mel natural do Alentejo e da Serra da Estrela, produzido com tradição, amor e pureza desde 1984. Descubra sabores autênticos diretamente das nossas colmeias.",
        ],
        ["home", "featured_title", "text", "Os Nossos Méis Destaque"],
        [
          "home",
          "featured_subtitle",
          "text",
          "Colhidos artesanalmente, preservando todas as propriedades nutritivas e medicinais da flor à colmeia.",
        ],
        ["about", "hero_title", "text", "A Nossa História"],
        [
          "about",
          "hero_subtitle",
          "text",
          "Compromisso com a natureza, com as abelhas e com a excelência do mel tradicional português.",
        ],
        [
          "about",
          "legacy_text",
          "text",
          "Desde 1984 que a família Hexomel se dedica à preservação da apicultura tradicional na Serra da Estrela e no Alentejo. O que começou com apenas três colmeias familiares cresceu para um ecossistema sustentável que apoia a biodiversidade local e promove práticas apícolas éticas.",
        ],
      ];
      for (const c of defaultCMS) {
        await db
          .run(
            "INSERT INTO cms_content (Page_Key, Block_Key, Type, Content_Value) VALUES (?, ?, ?, ?)",
            c,
          )
          .catch(() => {});
      }
    }

    // Seed default placeholder style if not exists
    await db
      .run(
        "INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES ('placeholder_style', 'skeleton')",
      )
      .catch(() => {});

    // Seed default interactions for analytics if empty
    const interacaoCount = await db
      .get("SELECT COUNT(*) as c FROM interacao")
      .catch(() => ({ c: 1 }));
    if (interacaoCount && interacaoCount.c === 0) {
      console.log("Seeding realistic sample interactions for analytics...");
      const pages = [
        "index.html",
        "shop.html",
        "about.html",
        "contact.html",
        "aprender.html",
        "curiosidades.html",
      ];
      const searchTerms = [
        "mel de urze",
        "mel silvestre",
        "propólis",
        "mel com favo",
        "pólen abelha",
        "colmeia",
        "apicultura",
      ];
      const clickLabels = [
        "Adicionar ao Carrinho",
        "Comprar Agora",
        "Saber Mais",
        "Ver Receita de Mel",
        "Subscrever Newsletter",
        "Falar Connosco",
      ];
      const clickElements = ["button", "button", "a", "a", "button", "a"];

      // Get some products to reference realistically
      const dbProducts = await db
        .all("SELECT ID_Produto, Nome FROM produto LIMIT 5")
        .catch(() => []);
      const sampleProducts =
        dbProducts.length > 0
          ? dbProducts
          : [
              { ID_Produto: 1, Nome: "Mel de Rosmaninho Premium" },
              { ID_Produto: 2, Nome: "Mel de Urze Puro" },
              { ID_Produto: 3, Nome: "Pólen Silvestre" },
              { ID_Produto: 4, Nome: "Própolis Spray Bio" },
            ];

      // Get some clients to reference realistically
      const dbClients = await db
        .all("SELECT ID_Cliente FROM cliente LIMIT 5")
        .catch(() => []);
      const sampleClients = dbClients.map((c) => c.ID_Cliente);

      // Seed 200 interactions distributed over the last 14 days
      for (let i = 0; i < 200; i++) {
        const daysAgo = Math.floor(Math.random() * 15);
        const hoursAgo = Math.floor(Math.random() * 24);
        const minsAgo = Math.floor(Math.random() * 60);

        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(date.getHours() - hoursAgo);
        date.setMinutes(date.getMinutes() - minsAgo);
        const formattedDate = date.toISOString().slice(0, 19).replace("T", " ");

        const isLogged = Math.random() > 0.4;
        const clientId =
          isLogged && sampleClients.length > 0
            ? sampleClients[Math.floor(Math.random() * sampleClients.length)]
            : null;

        let tipo = "page_view";
        const rand = Math.random();
        if (rand > 0.85) tipo = "add_to_cart";
        else if (rand > 0.7) tipo = "click";
        else if (rand > 0.6) tipo = "search";
        else if (rand > 0.35) tipo = "product_view";

        const pagina = pages[Math.floor(Math.random() * pages.length)];
        let dados = {};

        if (tipo === "product_view" || tipo === "add_to_cart") {
          const prod =
            sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
          dados = { productId: prod.ID_Produto, productName: prod.Nome };
        } else if (tipo === "search") {
          dados = {
            term: searchTerms[Math.floor(Math.random() * searchTerms.length)],
          };
        } else if (tipo === "click") {
          const idx = Math.floor(Math.random() * clickLabels.length);
          dados = { label: clickLabels[idx], element: clickElements[idx] };
        } else {
          dados = { pagina };
        }

        await db
          .run(
            "INSERT INTO interacao (ID_Cliente, Tipo, Pagina, Dados, Data_Interacao) VALUES (?, ?, ?, ?, ?)",
            [clientId, tipo, pagina, JSON.stringify(dados), formattedDate],
          )
          .catch((err) => console.error("Seed row error:", err));
      }
      console.log("Analytics seeded successfully!");
    }

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
const urlencodedBodyParser = express.urlencoded({
  limit: "10mb",
  extended: true,
});

app.use(compression());
app.use(cors());

// Serve static files from frontend/public/uploads
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../frontend/public/uploads")),
);

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
const healthCheckHandler = (req, res) => {
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
};

const sendServerError = (res, error, fallback = "Database error") => {
  res.status(500).json({
    error: fallback,
    ...(isDevelopment ? { detail: error.message, code: error.code } : {}),
  });
};

app.get("/health", healthCheckHandler);
app.get("/api/health", healthCheckHandler);

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

// ============================================================
// DYNAMIC MENU ENDPOINTS
// ============================================================

const DEFAULT_MENU_ITEMS = [
  {
    ID_Menu: 1,
    Label: "Início",
    Link: "index.html",
    Ordenacao: 1,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 2,
    Label: "Produtos",
    Link: "shop.html",
    Ordenacao: 2,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 3,
    Label: "Workshops",
    Link: "workshops.html",
    Ordenacao: 3,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 4,
    Label: "Descobrir",
    Link: "#",
    Ordenacao: 4,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 5,
    Label: "Curiosidades",
    Link: "curiosidades.html",
    Ordenacao: 1,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 6,
    Label: "Aprender",
    Link: "aprender.html",
    Ordenacao: 2,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 7,
    Label: "Comunidade",
    Link: "comunidade.html",
    Ordenacao: 3,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 8,
    Label: "Sobre Nós",
    Link: "about.html",
    Ordenacao: 5,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 9,
    Label: "Contactos",
    Link: "contact.html",
    Ordenacao: 6,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
];

async function reorderMenuItem(menuId, requestedPosition) {
  const rows = await db.all(
    "SELECT ID_Menu FROM menu_nav WHERE ID_Menu <> ? ORDER BY Ordenacao ASC, ID_Menu ASC",
    [menuId],
  );
  const ids = rows.map((row) => row.ID_Menu);
  const position = Math.max(
    1,
    Math.min(Number(requestedPosition) || ids.length + 1, ids.length + 1),
  );

  ids.splice(position - 1, 0, Number(menuId));

  for (let index = 0; index < ids.length; index++) {
    await db.run("UPDATE menu_nav SET Ordenacao = ? WHERE ID_Menu = ?", [
      index + 1,
      ids[index],
    ]);
  }
}

async function normalizeMenuOrder() {
  const rows = await db.all(
    "SELECT ID_Menu FROM menu_nav ORDER BY Ordenacao ASC, ID_Menu ASC",
  );
  for (let index = 0; index < rows.length; index++) {
    await db.run("UPDATE menu_nav SET Ordenacao = ? WHERE ID_Menu = ?", [
      index + 1,
      rows[index].ID_Menu,
    ]);
  }
}

// Get active menu items (Public)
app.get("/api/menu", async (req, res) => {
  try {
    const menus = await db.all(
      "SELECT * FROM menu_nav WHERE Ativo = 1 ORDER BY Ordenacao ASC",
    );
    res.json(menus && menus.length > 0 ? menus : DEFAULT_MENU_ITEMS);
  } catch (error) {
    console.error("Error fetching menus:", error);
    res.json(DEFAULT_MENU_ITEMS);
  }
});

// Get all menu items (Admin)
app.get("/api/admin/menu", authenticateToken, isAdmin, async (req, res) => {
  try {
    const menus = await db.all("SELECT * FROM menu_nav ORDER BY Ordenacao ASC");
    res.json(menus);
  } catch (error) {
    console.error("Error fetching admin menus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a menu item (Admin)
app.post("/api/admin/menu", authenticateToken, isAdmin, async (req, res) => {
  const { Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba, ID_Parent } = req.body;
  if (!Label || (!Link && Link !== "")) {
    return res.status(400).json({ error: "Label and Link are required" });
  }

  const parent = ID_Parent ? parseInt(ID_Parent, 10) : null;

  try {
    if (!parent) {
      const topCount = await db.get("SELECT COUNT(*) as c FROM menu_nav WHERE ID_Parent IS NULL");
      if (topCount && topCount.c >= 8) {
        return res.status(400).json({ error: "Limite máximo de 8 menus principais atingido. Por favor, remova ou edite um existente." });
      }
    }

    const result = await db.run(
      "INSERT INTO menu_nav (Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba, ID_Parent) VALUES (?, ?, ?, ?, ?, ?)",
      [Label, Link, Ordenacao || 0, Ativo !== false ? 1 : 0, Abrir_Nova_Aba ? 1 : 0, parent]
    );
    await reorderMenuItem(result.lastID, Ordenacao);
    res
      .status(201)
      .json({ id: result.lastID, message: "Menu item created successfully" });
  } catch (error) {
    console.error("Error adding menu item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a menu item (Admin)
app.put("/api/admin/menu/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba, ID_Parent } = req.body;
  if (!Label || (!Link && Link !== "")) {
    return res.status(400).json({ error: "Label and Link are required" });
  }

  const parent = ID_Parent ? parseInt(ID_Parent, 10) : null;

  try {
    if (!parent) {
      const topCount = await db.get("SELECT COUNT(*) as c FROM menu_nav WHERE ID_Parent IS NULL AND ID_Menu != ?", [id]);
      if (topCount && topCount.c >= 8) {
        return res.status(400).json({ error: "Limite máximo de 8 menus principais atingido." });
      }
    }

    const result = await db.run(
      "UPDATE menu_nav SET Label = ?, Link = ?, Ativo = ?, Abrir_Nova_Aba = ?, ID_Parent = ? WHERE ID_Menu = ?",
      [Label, Link, Ativo ? 1 : 0, Abrir_Nova_Aba ? 1 : 0, parent, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    await reorderMenuItem(id, Ordenacao);
    res.json({ message: "Menu item updated successfully" });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a menu item (Admin)
app.delete(
  "/api/admin/menu/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.run("DELETE FROM menu_nav WHERE ID_Menu = ?", [
        id,
      ]);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      await normalizeMenuOrder();
      res.json({ message: "Menu item deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ============================================================
// PASSWORD RECOVERY ENDPOINTS
// ============================================================

// Request password recovery link (Public)
app.post("/api/auth/forgot-password", async (req, res) => {
  const { identity } = req.body; // Can be email or username
  if (!identity) {
    return res
      .status(400)
      .json({ error: "Email ou nome de utilizador é obrigatório." });
  }

  try {
    const client = await db.get(
      "SELECT * FROM cliente WHERE Email = ? OR Username = ?",
      [identity, identity],
    );

    // Always return 200 to avoid user enumeration
    const genericResponse = {
      message:
        "Se o email introduzido estiver registado, receberá um link de recuperação em breve.",
    };

    if (!client) {
      return res.json(genericResponse);
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Store token in database
    await db.run(
      "INSERT INTO password_recovery (ID_Cliente, Token, Expires_At) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))",
      [client.ID_Cliente, token],
    );

    const resetLink = `${req.headers.origin || "http://localhost:5173"}/recuperar.html?token=${token}`;

    if (mailTransporter) {
      try {
        await mailTransporter.sendMail({
          from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
          to: client.Email,
          subject: "🍯 Recuperação de Palavra-passe — Hexomel",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8f5e9; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2d5f3f; margin-bottom: 5px;">Recuperação de Palavra-passe</h2>
                <p style="color: #666; font-size: 14px;">Hexomel — Excelência em Mel Artesanal</p>
              </div>
              <p>Olá, <strong>${client.Nome}</strong>,</p>
              <p>Recebemos um pedido para redefinir a palavra-passe da sua conta Hexomel. Se não efetuou este pedido, por favor ignore este email.</p>
              <p>Para escolher uma nova palavra-passe, clique no botão abaixo dentro de 5 minutos:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #2d5f3f; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Palavra-passe</a>
              </div>
              <p style="font-size: 12px; color: #999; line-height: 1.5;">Se o botão não funcionar, copie e cole o seguinte link no seu navegador:<br>
              <a href="${resetLink}" style="color: #2d5f3f;">${resetLink}</a></p>
              <hr style="border: 0; border-top: 1px solid #e8f5e9; margin: 20px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">&copy; 2026 Hexomel. Todos os direitos reservados.</p>
            </div>
          `,
        });
      } catch (mailError) {
        console.error("Failed to send recovery email:", mailError.message);
      }
    } else {
      console.warn("Nodemailer not configured. Link only logged in console.");
    }
    // Always return the same generic response to avoid user enumeration
    return res.json(genericResponse);
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Redefine password using token (Public)
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res
      .status(400)
      .json({ error: "Token e nova password são obrigatórios." });
  }

  try {
    const recovery = await db.get(
      "SELECT * FROM password_recovery WHERE Token = ?",
      [token],
    );
    if (!recovery) {
      return res
        .status(400)
        .json({
          error: "Token de recuperação inválido. Por favor peça um novo link.",
        });
    }

    if (Number(recovery.Used) === 1) {
      return res
        .status(400)
        .json({
          error:
            "Este link de recuperação já foi utilizado. Por favor peça um novo link.",
        });
    }

    const expiryCheck = await db.get("SELECT ? > NOW() AS valid", [
      recovery.Expires_At,
    ]);
    if (!expiryCheck || Number(expiryCheck.valid) !== 1) {
      return res
        .status(400)
        .json({
          error: "O token de recuperação expirou. Por favor peça um novo link.",
        });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashedPassword,
      recovery.ID_Cliente,
    ]);

    // Mark token as used
    const usedResult = await db.run(
      "UPDATE password_recovery SET Used = 1 WHERE ID_Recovery = ? AND Used = 0",
      [recovery.ID_Recovery],
    );
    if (usedResult.changes === 0) {
      return res
        .status(400)
        .json({
          error:
            "Este link de recuperação já foi utilizado. Por favor peça um novo link.",
        });
    }

    res.json({
      message:
        "Palavra-passe redefinida com sucesso! Pode agora iniciar sessão com a sua nova password.",
    });
  } catch (error) {
    console.error("Error in reset-password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// CMS ENDPOINTS (CONTENT MANAGEMENT SYSTEM)
// ============================================================

// Get all CMS content blocks (Public)
app.get("/api/cms", async (req, res) => {
  try {
    const contents = await db.all("SELECT * FROM cms_content");
    res.json(contents);
  } catch (error) {
    console.error("Error fetching CMS contents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get CMS content blocks for a specific page (Public)
app.get("/api/cms/:pageKey", async (req, res) => {
  const { pageKey } = req.params;
  try {
    const contents = await db.all(
      "SELECT * FROM cms_content WHERE Page_Key = ?",
      [pageKey],
    );
    res.json(contents);
  } catch (error) {
    console.error(`Error fetching CMS contents for page ${pageKey}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create/Update a CMS block (Admin only)
app.put("/api/admin/cms", authenticateToken, isAdmin, async (req, res) => {
  const { Page_Key, Block_Key, Type, Content_Value } = req.body;
  if (!Page_Key || !Block_Key || Content_Value === undefined) {
    return res
      .status(400)
      .json({ error: "Page_Key, Block_Key, and Content_Value are required" });
  }
  try {
    await db.run(
      `INSERT INTO cms_content (Page_Key, Block_Key, Type, Content_Value) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE Content_Value = ?, Type = ?`,
      [
        Page_Key,
        Block_Key,
        Type || "text",
        Content_Value,
        Content_Value,
        Type || "text",
      ],
    );
    res.json({ message: "CMS block saved successfully" });
  } catch (error) {
    console.error("Error saving CMS block:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/admin/cms", authenticateToken, isAdmin, async (req, res) => {
  const { Page_Key, Block_Key, Type, Content_Value } = req.body;
  if (!Page_Key || !Block_Key || Content_Value === undefined) {
    return res
      .status(400)
      .json({ error: "Page_Key, Block_Key e Content_Value são obrigatórios." });
  }

  try {
    const result = await db.run(
      `INSERT INTO cms_content (Page_Key, Block_Key, Type, Content_Value)
       VALUES (?, ?, ?, ?)`,
      [Page_Key, Block_Key, Type || "text", Content_Value],
    );
    res
      .status(201)
      .json({ id: result.lastID, message: "Bloco CMS criado com sucesso." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Já existe um bloco com essa página e chave." });
    }
    console.error("Error creating CMS block:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete(
  "/api/admin/cms/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const result = await db.run(
        "DELETE FROM cms_content WHERE ID_Content = ?",
        [req.params.id],
      );
      if (result.changes === 0) {
        return res.status(404).json({ error: "Bloco CMS não encontrado." });
      }
      res.json({ message: "Bloco CMS eliminado com sucesso." });
    } catch (error) {
      console.error("Error deleting CMS block:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// AUTH ROUTES
// Register
app.post("/api/auth/register", async (req, res) => {
  let { firstName, lastName, email, username, password } = req.body;

  if (!email || !password || !firstName || !username) {
    return res
      .status(400)
      .json({ error: "Nome, username, email e password são obrigatórios." });
  }

  email = email.toLowerCase().trim();
  username = username.trim();

  try {
    // Check if user exists by email OR username
    const row = await db.get(
      "SELECT * FROM cliente WHERE Email = ? OR (Username IS NOT NULL AND Username = ?)",
      [email, username],
    );
    if (row) {
      const field =
        row.Email.toLowerCase() === email ? "Email" : "Nome de utilizador";
      return res.status(400).json({ error: `${field} já está em uso.` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const fullName = `${firstName} ${lastName}`.trim();

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Insert user with verification token and Is_Verified = false
    const result = await db.run(
      "INSERT INTO cliente (Nome, Email, Username, Senha, UserType, Is_Verified, Verification_Token) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        fullName,
        email,
        username,
        hashedPassword,
        "client",
        false, // Needs verification
        verificationToken,
      ],
    );

    // Send Verification Email
    if (mailTransporter) {
      const frontendUrl =
        process.env.FRONTEND_URL ||
        req.get("origin") ||
        `${req.protocol}://${req.get("host")}`;
      const verifyUrl = `${frontendUrl}/verify-email.html?token=${verificationToken}`;

      try {
        await mailTransporter.sendMail({
          from: process.env.SMTP_FROM || `Hexomel <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Confirme o seu email — Hexomel",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eef2f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #1a4d2e; padding: 20px; text-align: center;">
                <h1 style="color: #f4b400; margin: 0;">Bem-vindo à Hexomel!</h1>
              </div>
              <div style="padding: 30px; background-color: #ffffff;">
                <p>Olá <strong>${fullName}</strong>,</p>
                <p>Obrigado por te registares na Hexomel. Para ativares a tua conta e começares a explorar o melhor mel de Portugal, por favor confirma o teu endereço de email clicando no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyUrl}" style="background-color: #1a4d2e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verificar a minha conta</a>
                </div>
                <p style="font-size: 0.9em; color: #718096; word-break: break-all;">${verifyUrl}</p>
              </div>
              <div style="background-color: #fcfdfc; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7;">
                Se não criaste uma conta na Hexomel, podes ignorar este email.
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Verification email failed to send:", emailErr);
        // We still created the user, but they might need a resend option later
      }
    }

    res.status(201).json({
      message:
        "Conta criada com sucesso! Por favor, verifica o teu email para ativares a conta.",
      requiresVerification: true,
      user: {
        id: result.lastID,
        name: fullName,
        email,
        UserType: "client",
      },
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
    return res
      .status(400)
      .json({ error: "Email/username e password são obrigatórios" });
  }

  identifier = identifier.toLowerCase().trim();

  try {
    let user = await db.get(
      "SELECT * FROM cliente WHERE Email = ? OR Username = ?",
      [identifier, identifier],
    );
    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    if (!user.Is_Verified) {
      return res.status(403).json({
        error: "Conta não verificada",
        message: "Por favor, verifique o seu email para ativar a sua conta.",
        unverified: true,
      });
    }

    const token = jwt.sign(
      {
        id: user.ID_Cliente,
        role: user.UserType,
        checkoutVerified: Boolean(user.Checkout_Verified),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
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
    const user = await db.get(
      "SELECT * FROM cliente WHERE Verification_Token = ?",
      [token],
    );
    if (!user) {
      return res
        .status(400)
        .json({ error: "Token de verificação inválido ou expirado." });
    }

    await db.run(
      "UPDATE cliente SET Is_Verified = 1, Verification_Token = NULL WHERE ID_Cliente = ?",
      [user.ID_Cliente],
    );

    res.json({ message: "Email verificado com sucesso!" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Checkout 2FA - Generate
app.post(
  "/api/auth/checkout-2fa/generate",
  authenticateToken,
  async (req, res) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      const expiresDate = new Date(Date.now() + 10 * 1000 * 60); // 10 minutes from now

      await db.run(
        "UPDATE cliente SET Checkout_OTP = ?, Checkout_OTP_Expires = ? WHERE ID_Cliente = ?",
        [otp, expiresDate, req.user.id],
      );

      const user = await db.get(
        "SELECT Email, Nome FROM cliente WHERE ID_Cliente = ?",
        [req.user.id],
      );

      if (mailTransporter) {
        try {
          await mailTransporter.sendMail({
            from:
              process.env.SMTP_FROM ||
              `Hexomel Segurança <${process.env.SMTP_USER || "noreply@hexomel.pt"}>`,
            to: user.Email,
            subject: "O seu código de verificação para Checkout — Hexomel",
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 40px auto; padding: 40px; border-radius: 20px; background: #ffffff; border: 1px solid #f0f0f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #1a4d2e; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;">
                  <span style="font-size: 30px; line-height: 60px;">🐝</span>
                </div>
                <h1 style="color: #1a4d2e; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Hexomel</h1>
                <p style="color: #f4b400; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0 0; font-weight: 700;">Segurança de Checkout</p>
              </div>
              
              <div style="background: #fcfdfd; border-radius: 16px; padding: 30px; border: 1px dashed #e0e0e0; text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1a4d2e; font-size: 18px; margin-top: 0; margin-bottom: 20px; font-weight: 600;">O teu código de verificação</h2>
                <div style="background: #ffffff; display: inline-block; padding: 15px 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
                  <span style="font-family: 'Monaco', 'Consolas', monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #1a4d2e;">${otp}</span>
                </div>
                <p style="color: #718096; font-size: 14px; margin-top: 20px;">Este código expira em <strong>10 minutos</strong>.</p>
              </div>
              
              <div style="text-align: center; color: #4a5568; font-size: 15px; line-height: 1.6;">
                <p>Olá <strong>${user.Nome || "Cliente"}</strong>,</p>
                <p>Para concluir a tua encomenda com segurança, introduz o código acima na página de verificação.</p>
              </div>
              
              <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #f0f0f0; text-align: center; color: #a0aec0; font-size: 12px;">
                <p>Se não solicitaste este código, podes ignorar este email com segurança.</p>
                <p style="margin-top: 15px; color: #1a4d2e; font-weight: 600; font-size: 14px;">Equipa Hexomel 🐝</p>
              </div>
            </div>
          `,
          });
        } catch (emailErr) {
          console.error("2FA Email fail:", emailErr);
          return res.status(500).json({
            error: "Falha ao enviar o email de verificação.",
            details: emailErr.message,
          });
        }
      } else {
        console.log(
          `⚠️ Email disabled or failed. OTP para ${user.Email} é ${otp}`,
        );
        if (mailTransporterError) {
          return res.status(503).json({
            error: "O serviço de email está temporariamente indisponível.",
            details:
              "Erro na configuração SMTP. Por favor, contacte o suporte.",
            debug:
              process.env.NODE_ENV === "development"
                ? mailTransporterError
                : undefined,
          });
        }
      }

      res.json({ message: "Código enviado com sucesso para o seu email." });
    } catch (error) {
      console.error("Generate 2FA error:", error);
      res.status(500).json({ error: "Erro interno ao gerar o código 2FA." });
    }
  },
);

// Checkout 2FA - Verify
app.post(
  "/api/auth/checkout-2fa/verify",
  authenticateToken,
  async (req, res) => {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: "O código é obrigatório." });
    }

    try {
      const user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [
        req.user.id,
      ]);

      if (!user) {
        return res.status(400).json({ error: "Utilizador não encontrado." });
      }

      console.log(
        `2FA Verify: stored=${user.Checkout_OTP}, received=${otp}, expires=${user.Checkout_OTP_Expires}`,
      );

      if (
        !user.Checkout_OTP ||
        String(user.Checkout_OTP).trim() !== String(otp).trim()
      ) {
        return res.status(400).json({ error: "Código incorreto." });
      }

      // Compare dates - MySQL DATETIME is returned as a Date object by mysql2
      const expiresAt = new Date(user.Checkout_OTP_Expires);
      const now = new Date();
      console.log(
        `2FA Expiry check: now=${now.toISOString()}, expires=${expiresAt.toISOString()}`,
      );
      if (now > expiresAt) {
        return res
          .status(400)
          .json({ error: "Código expirado. Peça um novo." });
      }

      // Success -> Clear OTP and set as verified
      await db.run(
        "UPDATE cliente SET Checkout_OTP = NULL, Checkout_OTP_Expires = NULL, Checkout_Verified = 1 WHERE ID_Cliente = ?",
        [req.user.id],
      );

      // Issue updated token
      const token = jwt.sign(
        { id: user.ID_Cliente, role: user.UserType, checkoutVerified: true },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
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
          checkoutVerified: true,
        },
      });
    } catch (error) {
      console.error("Verify 2FA error:", error);
      res.status(500).json({ error: "Erro na verificação." });
    }
  },
);

// Google Auth
app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!googleClient || !configuredGoogleClientId) {
      return res
        .status(503)
        .json({ error: "Google authentication is not configured" });
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
      {
        id: user.ID_Cliente,
        role: user.UserType,
        checkoutVerified: Boolean(user.Checkout_Verified),
      },
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
    return res
      .status(400)
      .json({ error: "Nome, email e mensagem são obrigatórios." });
  }

  if (!mailTransporter) {
    console.warn("⚠️ Contact form submitted but mailer is disabled.");
    return res
      .status(503)
      .json({
        error:
          "O serviço de email está temporariamente indisponível. Por favor, tente mais tarde.",
      });
  }

  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
      to: process.env.SMTP_USER
        ? process.env.SMTP_USER.replace("@", "+contacto@")
        : "hexomelpap+contacto@gmail.com", // Force to Inbox using alias
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

    res.json({
      message:
        "Mensagem enviada com sucesso! Entraremos em contacto brevemente.",
    });
  } catch (error) {
    console.error("Contact form email error:", error);
    res
      .status(500)
      .json({
        error:
          "Erro ao enviar a mensagem. Por favor, tente novamente mais tarde.",
      });
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
      p.Slug,
      COALESCE(AVG(a.Nota), 0) as Rating, 
      COUNT(a.ID_Avaliacao) as ReviewCount,
      c.Nome as ApicultorNome,
      c.Picture as ApicultorFoto,
      c.Bio as ApicultorBio,
      cat.Nome as CategoriaNome,
      o.Nome as OrigemNome
      FROM produto p
      LEFT JOIN avaliacao a ON p.ID_Produto = a.ID_Produto
      LEFT JOIN cliente c ON p.ID_Apicultor = c.ID_Cliente
      LEFT JOIN categoria cat ON p.ID_Categoria = cat.ID_Categoria
      LEFT JOIN origem o ON p.ID_Origem = o.ID_Origem
      WHERE p.Status = 'Aprovado' OR p.Status IS NULL
      GROUP BY p.ID_Produto
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
    sendServerError(res, error);
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
      const slug = await generateUniqueSlug(slugify(nome));
      const result = await db.run(
        "INSERT INTO produto (Nome, Preco, Stock, ID_Categoria, ID_Origem, Descricao, Imagem, Tags, Slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          nome,
          preco,
          stock,
          idCategoria,
          idOrigem,
          descricao,
          imagem,
          tags,
          slug,
        ],
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
      tags,
      imagem,
    } = req.body;
    try {
      await db.run(
        "UPDATE produto SET Nome = ?, Preco = ?, Stock = ?, ID_Categoria = ?, ID_Origem = ?, Descricao = ?, Tags = ?, Imagem = ?, Status = ? WHERE ID_Produto = ?",
        [
          nome,
          preco,
          stock,
          idCategoria,
          idOrigem,
          descricao,
          tags,
          imagem,
          "Aprovado",
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
    const slug = await generateUniqueSlug(slugify(nome));
    const result = await db.run(
      "INSERT INTO produto (Nome, Preco, Stock, ID_Categoria, ID_Origem, Descricao, Imagem, Tags, ID_Apicultor, Status, Slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        slug,
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
  const finalImage =
    imagem && imagem.trim() !== "" ? imagem : defaultWorkshopImage;
  try {
    const result = await db.run(
      "INSERT INTO workshop (Titulo, Descricao, Data_Realizacao, Preco, Vagas, Imagem, Status, ID_Apicultor) VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?)",
      [
        titulo,
        descricao,
        data_realizacao,
        preco,
        vagas,
        finalImage,
        req.user.id,
      ],
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
    const workshop = await db.get(
      "SELECT * FROM workshop WHERE ID_Workshop = ?",
      [id],
    );
    if (!workshop)
      return res.status(404).json({ error: "Workshop não encontrado." });

    if (workshop.Vagas <= 0) {
      return res
        .status(400)
        .json({ error: "Este workshop já não tem vagas disponíveis." });
    }

    const existing = await db.get(
      "SELECT * FROM reserva_workshop WHERE ID_Workshop = ? AND ID_Cliente = ?",
      [id, req.user.id],
    );
    if (existing) {
      return res
        .status(400)
        .json({ error: "Já tens uma reserva para este workshop." });
    }

    await db.run(
      "INSERT INTO reserva_workshop (ID_Workshop, ID_Cliente) VALUES (?, ?)",
      [id, req.user.id],
    );
    await db.run(
      "UPDATE workshop SET Vagas = Vagas - 1 WHERE ID_Workshop = ?",
      [id],
    );

    res.json({ ok: true, message: "Reserva efetuada com sucesso!" });
  } catch (error) {
    console.error("Workshop reserve error:", error);
    res.status(500).json({ error: "Erro na base de dados." });
  }
});

// APICULTOR — Edit own product
app.patch(
  "/api/apicultor/products/:id",
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== "apicultor" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied." });

    const { id } = req.params;
    const {
      nome,
      preco,
      stock,
      idCategoria,
      idOrigem,
      descricao,
      tags,
      imagem,
    } = req.body;

    try {
      // Verify ownership
      const existing = await db.get(
        "SELECT * FROM produto WHERE ID_Produto = ? AND ID_Apicultor = ?",
        [id, req.user.id],
      );
      if (!existing && req.user.role !== "admin")
        return res
          .status(404)
          .json({ error: "Product not found or access denied." });

      // Reset to Pendente when apicultor edits (needs re-approval)
      const newStatus =
        req.user.role === "admin" ? existing?.Status : "Pendente";

      await db.run(
        "UPDATE produto SET Nome = ?, Preco = ?, Stock = ?, ID_Categoria = ?, ID_Origem = ?, Descricao = ?, Tags = ?, Imagem = ?, Status = ? WHERE ID_Produto = ?",
        [
          nome,
          preco,
          stock,
          idCategoria,
          idOrigem || null,
          descricao,
          tags || null,
          imagem || existing?.Imagem,
          newStatus,
          id,
        ],
      );
      const updated = await db.get(
        "SELECT * FROM produto WHERE ID_Produto = ?",
        [id],
      );
      res.json(updated);
    } catch (err) {
      console.error("Apicultor patch product error:", err);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// APICULTOR — Delete own product
app.delete(
  "/api/apicultor/products/:id",
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== "apicultor" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied." });

    const { id } = req.params;
    try {
      const existing = await db.get(
        "SELECT * FROM produto WHERE ID_Produto = ? AND ID_Apicultor = ?",
        [id, req.user.id],
      );
      if (!existing && req.user.role !== "admin")
        return res
          .status(404)
          .json({ error: "Product not found or access denied." });

      await db.run("DELETE FROM produto WHERE ID_Produto = ?", [id]);
      res.json({ message: "Product deleted successfully" });
    } catch (err) {
      console.error("Apicultor delete product error:", err);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR — Edit own workshop
app.patch(
  "/api/apicultor/workshops/:id",
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== "apicultor" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied." });

    const { id } = req.params;
    const { titulo, descricao, data_realizacao, preco, vagas, imagem } =
      req.body;

    try {
      const existing = await db.get(
        "SELECT * FROM workshop WHERE ID_Workshop = ? AND ID_Apicultor = ?",
        [id, req.user.id],
      );
      if (!existing && req.user.role !== "admin")
        return res
          .status(404)
          .json({ error: "Workshop not found or access denied." });

      await db.run(
        "UPDATE workshop SET Titulo = ?, Descricao = ?, Data_Realizacao = ?, Preco = ?, Vagas = ?, Imagem = ?, Status = 'Pendente' WHERE ID_Workshop = ?",
        [
          titulo,
          descricao,
          data_realizacao,
          preco,
          vagas,
          imagem || existing?.Imagem,
          id,
        ],
      );
      const updated = await db.get(
        "SELECT * FROM workshop WHERE ID_Workshop = ?",
        [id],
      );
      res.json(updated);
    } catch (err) {
      console.error("Apicultor patch workshop error:", err);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// APICULTOR — Delete own workshop
app.delete(
  "/api/apicultor/workshops/:id",
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== "apicultor" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied." });

    const { id } = req.params;
    try {
      const existing = await db.get(
        "SELECT * FROM workshop WHERE ID_Workshop = ? AND ID_Apicultor = ?",
        [id, req.user.id],
      );
      if (!existing && req.user.role !== "admin")
        return res
          .status(404)
          .json({ error: "Workshop not found or access denied." });

      await db.run("DELETE FROM workshop WHERE ID_Workshop = ?", [id]);
      res.json({ message: "Workshop deleted successfully" });
    } catch (err) {
      console.error("Apicultor delete workshop error:", err);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    const rows = await db.all(
      `
      SELECT DISTINCT e.*, c.Nome as ClienteNome 
      FROM encomenda e
      JOIN cliente c ON e.ID_Cliente = c.ID_Cliente
      JOIN item_encomenda ie ON e.ID_Encomenda = ie.ID_Encomenda
      JOIN produto p ON ie.ID_Produto = p.ID_Produto
      WHERE p.ID_Apicultor = ?
      ORDER BY e.Data_Encomenda DESC
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Apicultor orders fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    const productsCount = await db.get(
      "SELECT COUNT(*) as count FROM produto WHERE ID_Apicultor = ?",
      [apicultorId],
    );
    const workshopsCount = await db.get(
      "SELECT COUNT(*) as count FROM workshop WHERE ID_Apicultor = ?",
      [apicultorId],
    );
    const pendingProducts = await db.get(
      "SELECT COUNT(*) as count FROM produto WHERE ID_Apicultor = ? AND Status = 'Pendente'",
      [apicultorId],
    );

    // Total Earnings from Orders
    const earnings = await db.get(
      `
      SELECT SUM(ie.Quantidade * ie.Preco_Unitario) as total 
      FROM item_encomenda ie
      JOIN produto p ON ie.ID_Produto = p.ID_Produto
      WHERE p.ID_Apicultor = ?
    `,
      [apicultorId],
    );

    // Categories Distribution
    const categories = await db.all(
      `
      SELECT c.Nome as category, COUNT(p.ID_Produto) as count 
      FROM produto p
      JOIN categoria c ON p.ID_Categoria = c.ID_Categoria
      WHERE p.ID_Apicultor = ?
      GROUP BY c.Nome
    `,
      [apicultorId],
    );

    // Status Distribution
    const statuses = await db.all(
      `
      SELECT Status, COUNT(*) as count 
      FROM produto 
      WHERE ID_Apicultor = ?
      GROUP BY Status
    `,
      [apicultorId],
    );

    res.json({
      summary: {
        products: productsCount.count,
        workshops: workshopsCount.count,
        pendingProducts: pendingProducts.count,
        totalEarnings: earnings.total || 0,
      },
      categories,
      statuses,
    });
  } catch (err) {
    console.error("Apicultor stats error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    if (!workshop)
      return res.status(404).json({ error: "Workshop não encontrado." });
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
    if (!reservation)
      return res.status(404).json({ error: "Reserva não encontrada." });

    await db.run("DELETE FROM reserva_workshop WHERE ID_Reserva = ?", [
      req.params.id,
    ]);
    await db.run(
      "UPDATE workshop SET Vagas = Vagas + 1 WHERE ID_Workshop = ?",
      [reservation.ID_Workshop],
    );
    res.json({ message: "Reserva cancelada com sucesso." });
  } catch (err) {
    console.error("Cancel reservation error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
    res.json(rows);
  } catch (error) {
    console.error("Fetch beekeepers error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ADMIN WORKSHOPS MANAGEMENT
app.get(
  "/api/admin/workshops",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const workshops = await db.all(
        "SELECT w.*, c.Nome as ApicultorNome FROM workshop w JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente ORDER BY w.ID_Workshop DESC",
      );
      res.json(workshops);
    } catch (error) {
      console.error("Admin workshops fetch error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
    sendServerError(res, error);
  }
});

app.post("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
  let { name, email, username, password, userType } = req.body;

  if (!name || !email || !username || !password) {
    return res
      .status(400)
      .json({ error: "Nome, email, username e password são obrigatórios." });
  }

  email = email.toLowerCase().trim();
  username = username.trim();
  userType = userType || "client";

  const validTypes = ["admin", "client", "apicultor"];
  if (!validTypes.includes(userType)) {
    return res.status(400).json({ error: "Tipo de utilizador inválido." });
  }

  try {
    const existing = await db.get(
      "SELECT ID_Cliente FROM cliente WHERE Email = ? OR Username = ?",
      [email, username],
    );
    if (existing) {
      return res
        .status(409)
        .json({ error: "Email ou username já está em utilização." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.run(
      "INSERT INTO cliente (Nome, Email, Username, Senha, UserType, Is_Verified, Verification_Token) VALUES (?, ?, ?, ?, ?, 1, NULL)",
      [name.trim(), email, username, hashed, userType],
    );

    res.status(201).json({
      id: result.lastID,
      message: "Utilizador criado com sucesso.",
    });
  } catch (error) {
    console.error("Admin create user error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// ADMIN ANALYTICS & DASHBOARD
// -----------------------------------------------------------------------------
app.get(
  "/api/admin/analytics",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      // Basic Stats
      const totalRev = await db.get(
        "SELECT SUM(Total) as val FROM encomenda WHERE Status != 'Cancelada'",
      );
      const avgOrder = await db.get(
        "SELECT AVG(Total) as val FROM encomenda WHERE Status != 'Cancelada'",
      );

      // Distribution (Categories)
      const distribution = await db.all(`
      SELECT c.Nome as category, COUNT(p.ID_Produto) as count 
      FROM produto p 
      JOIN categoria c ON p.ID_Categoria = c.ID_Categoria 
      GROUP BY c.ID_Categoria
    `);

      // Orders By Status
      const ordersByStatus = await db.all(
        "SELECT Status as status, COUNT(*) as count FROM encomenda GROUP BY Status",
      );

      // Top Products
      const topProducts = await db.all(`
      SELECT p.Nome as name, SUM(i.Quantidade) as quantity, SUM(i.Quantidade * i.Preco_Unitario) as revenue 
      FROM item_encomenda i 
      JOIN produto p ON i.ID_Produto = p.ID_Produto 
      GROUP BY p.ID_Produto 
      ORDER BY quantity DESC LIMIT 5
    `);

      // Sales by Beekeeper
      const salesByBeekeeper = await db.all(`
      SELECT c.Nome as name, SUM(i.Quantidade * i.Preco_Unitario) as revenue 
      FROM item_encomenda i 
      JOIN produto p ON i.ID_Produto = p.ID_Produto 
      JOIN cliente c ON p.ID_Apicultor = c.ID_Cliente 
      GROUP BY c.ID_Cliente 
      ORDER BY revenue DESC LIMIT 5
    `);

      // Users Growth (Dummy/Simple grouping)
      const usersGrowth = await db.all(`
      SELECT DATE_FORMAT(Data_Resgistro, '%Y-%m') as month, COUNT(*) as count 
      FROM cliente 
      GROUP BY month 
      ORDER BY month DESC LIMIT 6
    `);

      // Sales 30d (Simplified)
      const sales30d = await db.all(`
      SELECT DATE(Data_Encomenda) as date, SUM(Total) as revenue 
      FROM encomenda 
      WHERE Status != 'Cancelada' AND Data_Encomenda >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY date 
      ORDER BY date ASC
    `);

      res.json({
        stats: {
          totalRevenue: totalRev.val ? parseFloat(totalRev.val).toFixed(2) : 0,
          avgOrderValue: avgOrder.val ? parseFloat(avgOrder.val).toFixed(2) : 0,
        },
        sales30d: sales30d || [],
        distribution: distribution || [],
        ordersByStatus: ordersByStatus || [],
        topProducts: topProducts || [],
        salesByBeekeeper: salesByBeekeeper || [],
        usersGrowth: usersGrowth.reverse() || [],
      });
    } catch (error) {
      console.error("Admin analytics error:", error);
      sendServerError(res, error);
    }
  },
);

app.get(
  "/api/admin/analytics/interactions",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const rows = await db.all(`
      SELECT ID_Cliente, Tipo, Pagina, Dados, Data_Interacao 
      FROM interacao 
      WHERE Data_Interacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY Data_Interacao DESC
    `);

      // Aggregate in Javascript
      const totals = { total: 0, logged_in: 0, anonymous: 0 };
      const typeCounts = {};
      const pageCounts = {};
      const dayCounts = {};
      const productViews = {};
      const productCarts = {};
      const searchTerms = {};
      const clickCounts = {};

      for (const r of rows) {
        totals.total++;
        if (r.ID_Cliente) {
          totals.logged_in++;
        } else {
          totals.anonymous++;
        }

        const tipo = r.Tipo;
        typeCounts[tipo] = (typeCounts[tipo] || 0) + 1;

        const pagina = r.Pagina || "index.html";
        pageCounts[pagina] = (pageCounts[pagina] || 0) + 1;

        // Day format: YYYY-MM-DD
        const date = new Date(r.Data_Interacao);
        const day = date.toISOString().split("T")[0];
        dayCounts[day] = (dayCounts[day] || 0) + 1;

        // Parse JSON Dados
        let dados = {};
        if (r.Dados) {
          try {
            dados = typeof r.Dados === "string" ? JSON.parse(r.Dados) : r.Dados;
          } catch (e) {
            // ignore
          }
        }

        if (tipo === "product_view") {
          const prodId = dados.productId;
          const prodName = dados.productName || `Produto #${prodId}`;
          if (prodId) {
            if (!productViews[prodId]) {
              productViews[prodId] = { id: prodId, nome: prodName, views: 0 };
            }
            productViews[prodId].views++;
          }
        } else if (tipo === "add_to_cart") {
          const prodId = dados.productId;
          const prodName = dados.productName || `Produto #${prodId}`;
          if (prodId) {
            if (!productCarts[prodId]) {
              productCarts[prodId] = { id: prodId, nome: prodName, adds: 0 };
            }
            productCarts[prodId].adds++;
          }
        } else if (tipo === "search") {
          const term = dados.term;
          if (term) {
            const lowerTerm = term.trim().toLowerCase();
            searchTerms[lowerTerm] = (searchTerms[lowerTerm] || 0) + 1;
          }
        } else if (tipo === "click") {
          const label = dados.label || "Elemento sem texto";
          const element = dados.element || "element";
          const key = `${label}||${element}`;
          if (!clickCounts[key]) {
            clickCounts[key] = { label, element, clicks: 0 };
          }
          clickCounts[key].clicks++;
        }
      }

      // Convert objects to sorted arrays
      const byType = Object.entries(typeCounts).map(([tipo, count]) => ({
        tipo,
        count,
      }));
      const byPage = Object.entries(pageCounts)
        .map(([pagina, count]) => ({ pagina, count }))
        .sort((a, b) => b.count - a.count);

      // perDay: last 7 or 30 days
      // Sort perDay ascending by date
      const perDay = Object.entries(dayCounts)
        .map(([dia, total]) => ({ dia, total }))
        .sort((a, b) => a.dia.localeCompare(b.dia));

      const topViewed = Object.values(productViews)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);
      const topCart = Object.values(productCarts)
        .sort((a, b) => b.adds - a.adds)
        .slice(0, 5);

      const topSearches = Object.entries(searchTerms)
        .map(([termo, count]) => ({ termo, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const topClicks = Object.values(clickCounts)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      res.json({
        totals,
        byType,
        byPage,
        topViewed,
        topCart,
        perDay,
        topSearches,
        topClicks,
      });
    } catch (error) {
      console.error("Interactions aggregate error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// ADMIN UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/admin/upgrade-requests",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const rows = await db.all(`
      SELECT u.ID_Request, u.Descricao, u.Documento, u.Status, u.Data_Pedido, u.Data_Processamento, 
             c.Nome as ClienteNome, c.Email as ClienteEmail
      FROM upgrade_requests u
      JOIN cliente c ON u.ID_Cliente = c.ID_Cliente
      ORDER BY u.Data_Pedido DESC
    `);
      res.json(rows);
    } catch (error) {
      console.error("Upgrade requests fetch error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

app.put(
  "/api/admin/upgrade-requests/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { status } = req.body; // 'Aprovado' ou 'Rejeitado'
      if (!["Aprovado", "Rejeitado"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const { id } = req.params;

      // Update the request
      await db.run(
        "UPDATE upgrade_requests SET Status = ?, Data_Processamento = CURRENT_TIMESTAMP WHERE ID_Request = ?",
        [status, id],
      );

      // If approved, update user role
      if (status === "Aprovado") {
        const request = await db.get(
          "SELECT ID_Cliente FROM upgrade_requests WHERE ID_Request = ?",
          [id],
        );
        if (request) {
          await db.run(
            "UPDATE cliente SET UserType = 'apicultor' WHERE ID_Cliente = ?",
            [request.ID_Cliente],
          );
        }
      }

      res.json({ success: true, message: "Pedido processado com sucesso" });
    } catch (error) {
      console.error("Upgrade process error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Public list of beekeepers
app.get("/api/apicultores", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing product ID" });
  try {
    await db.run(
      "INSERT IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
      [req.user.id, productId],
    );
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Favorites add error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete(
  "/api/user/favorites/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      await db.run(
        "DELETE FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
        [req.user.id, req.params.id],
      );
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      console.error("Favorites remove error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// -----------------------------------------------------------------------------
// UPGRADE REQUESTS
// -----------------------------------------------------------------------------
app.get(
  "/api/user/upgrade-request-status",
  authenticateToken,
  async (req, res) => {
    try {
      const reqInfo = await db.get(
        "SELECT Status as status, Descricao as message FROM upgrade_requests WHERE ID_Cliente = ? ORDER BY Data_Pedido DESC LIMIT 1",
        [req.user.id],
      );
      if (!reqInfo) {
        return res.json({ status: "none" });
      }
      res.json(reqInfo);
    } catch (error) {
      console.error("Upgrade status error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  },
);

app.post(
  "/api/user/upgrade-request",
  authenticateToken,
  upload.single("document"),
  async (req, res) => {
    try {
      const descricao = req.body.descricao || "N/A";
      const docPath = req.file ? req.file.path : "N/A";

      const existing = await db.get(
        "SELECT ID_Request FROM upgrade_requests WHERE ID_Cliente = ? AND Status = 'Pendente'",
        [req.user.id],
      );
      if (existing)
        return res.status(400).json({ error: "Já tens um pedido pendente." });

      await db.run(
        "INSERT INTO upgrade_requests (ID_Cliente, Descricao, Documento, Status) VALUES (?, ?, ?, ?)",
        [req.user.id, descricao, docPath, "Pendente"],
      );

      res.json({ message: "Pedido enviado com sucesso" });
    } catch (error) {
      console.error("Upgrade request error:", error);
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
        .json({
          error: "Upgrade to Apicultor requires a verification request.",
        });
    }

    if (userType !== "client" && userType !== "apicultor") {
      return res.status(400).json({ error: "Invalid role target." });
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
    const rows = await db.all(
      "SELECT ID_Cliente, Nome, Email, Picture, Bio FROM cliente WHERE UserType = 'apicultor'",
    );
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({ ...user, checkoutVerified: !!user.checkoutVerified, orders });
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
    if (name !== undefined) {
      updates.push("Nome = ?");
      params.push(name);
    }
    if (email !== undefined) {
      updates.push("Email = ?");
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push("Telefone = ?");
      params.push(phone);
    }
    if (address !== undefined) {
      updates.push("Morada = ?");
      params.push(address);
    }
    if (bio !== undefined) {
      updates.push("Bio = ?");
      params.push(bio);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
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
    const user = await db.get(
      "SELECT Senha FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.Senha);
    if (!valid)
      return res.status(400).json({ error: "Palavra-passe atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE cliente SET Senha = ? WHERE ID_Cliente = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ message: "Palavra-passe alterada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// FAVORITOS
// -----------------------------------------------------------------------------
app.get("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT p.ID_Produto, p.Nome, p.Preco, p.Imagem, p.Slug 
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      WHERE f.ID_Cliente = ?
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (error) {
    console.error("Favorites fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/user/favorites/add", authenticateToken, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "Missing