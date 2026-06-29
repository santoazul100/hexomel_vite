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

    await db
      .exec(
        `
        CREATE TABLE IF NOT EXISTS maintenance_complaints (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          message TEXT NOT NULL,
          section VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("maintenance_complaints table creation handled"));

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

    // Aprender page: Dynamic content tables
    await db
      .run(
        `
        CREATE TABLE IF NOT EXISTS aprender_facto (
          ID_Facto INT NOT NULL AUTO_INCREMENT,
          Titulo VARCHAR(255) NOT NULL,
          Icon_Frente VARCHAR(100) NOT NULL,
          Icon_Verso VARCHAR(100) NOT NULL,
          Conteudo_Verso TEXT NOT NULL,
          PRIMARY KEY (ID_Facto)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("aprender_facto table creation handled"));

    await db
      .run(
        `
        CREATE TABLE IF NOT EXISTS aprender_glossario (
          ID_Glossario INT NOT NULL AUTO_INCREMENT,
          Termo VARCHAR(255) NOT NULL,
          Definicao TEXT NOT NULL,
          Icon VARCHAR(100) NOT NULL,
          Categoria VARCHAR(50) NOT NULL,
          PRIMARY KEY (ID_Glossario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `,
      )
      .catch(() => console.log("aprender_glossario table creation handled"));

    // Seed default facts if empty
    const factsCount = await db
      .get("SELECT COUNT(*) as c FROM aprender_facto")
      .catch(() => ({ c: 1 }));
    if (factsCount && factsCount.c === 0) {
      const defaultFacts = [
        ["A Produção de uma Vida", "fas fa-spoon", "fas fa-hourglass-end", "Durante o seu ciclo natural, uma abelha obreira produz apenas <strong>uma fração de colher de chá</strong> de mel, evidenciando o valor de cada gota."],
        ["Conservação Milenar", "fas fa-calendar-alt", "fas fa-infinity", "Pela sua baixa humidade e acidez natural, o mel puro é dos únicos alimentos que <strong>nunca se estraga</strong>, mantendo-se inalterado por séculos."],
        ["A Dança das Abelhas", "fas fa-music", "fas fa-compass", "As abelhas comunicam a localização exata das flores através de uma <strong>coreografia complexa</strong>, um padrão de movimentos único na natureza."],
        ["O Processo de Cristalização", "fas fa-snowflake", "fas fa-fire", "A cristalização atesta a <strong>pureza e qualidade</strong> do mel cru. Para o devolver ao estado líquido original, basta aquecê-lo suavemente."],
        ["Engenharia Natural", "fas fa-cogs", "fas fa-tachometer-alt", "Equipadas com quatro asas, conseguem bater as asas até <strong>200 vezes por segundo</strong>, alcançando velocidades de voo surpreendentes."],
        ["Propriedades Terapêuticas", "fas fa-mortar-pestle", "fas fa-spa", "O mel natural possui <strong>propriedades antibacterianas</strong> e antioxidantes notáveis, sendo utilizado há milénios como aliado do bem-estar."]
      ];
      for (const f of defaultFacts) {
        await db.run("INSERT INTO aprender_facto (Titulo, Icon_Frente, Icon_Verso, Conteudo_Verso) VALUES (?, ?, ?, ?)", f);
      }
    }

    // Seed default glossary if empty
    const glossaryCount = await db
      .get("SELECT COUNT(*) as c FROM aprender_glossario")
      .catch(() => ({ c: 1 }));
    if (glossaryCount && glossaryCount.c === 0) {
      const defaultGlossary = [
        ["Néctar", "Líquido açucarado produzido pelas flores que as abelhas recolhem e transformam em mel.", "fas fa-droplet", "substance"],
        ["Própolis", "Substância resinosa recolhida pelas abelhas, usada para desinfetar e selar a colmeia.", "fas fa-shield-alt", "substance"],
        ["Geleia Real", "Alimento exclusivo da rainha, rico em proteínas e vitaminas. Permite que ela viva até 5 anos.", "fas fa-crown", "substance"],
        ["Polinização", "Transferência de pólen entre flores, essencial para a reprodução das plantas e formação de frutos.", "fas fa-seedling", "process"],
        ["Alvéolo", "Célula hexagonal de cera onde as abelhas armazenam mel, pólen ou criam as larvas.", "fas fa-th", "hive"],
        ["Fumigador", "Ferramenta do apicultor que produz fumo para acalmar as abelhas durante a inspeção.", "fas fa-smog", "equipment"]
      ];
      for (const g of defaultGlossary) {
        await db.run("INSERT INTO aprender_glossario (Termo, Definicao, Icon, Categoria) VALUES (?, ?, ?, ?)", g);
      }
    }

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
        PRIMARY KEY (ID_Menu)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
      )
      .catch((err) => console.error("Error creating menu_nav table:", err));

    await db.run("ALTER TABLE produto ADD COLUMN Em_Destaque tinyint(1) DEFAULT 0").catch(() => {});

    const menuCount = await db
      .get("SELECT COUNT(*) as c FROM menu_nav")
      .catch(() => ({ c: 1 }));
    if (menuCount && menuCount.c === 0) {
      const defaultMenus = [
        ["Início", "index.html", 1, 1],
        ["Produtos", "shop.html", 2, 1],
        ["Workshops", "workshops.html", 3, 1],
        ["Curiosidades", "curiosidades.html", 4, 1],
        ["Aprender", "aprender.html", 5, 1],
        ["Comunidade", "comunidade.html", 6, 1],
        ["Sobre Nós", "about.html", 7, 1],
        ["Contactos", "contact.html", 8, 1],
      ];
      for (const m of defaultMenus) {
        await db
          .run(
            "INSERT INTO menu_nav (Label, Link, Ordenacao, Ativo) VALUES (?, ?, ?, ?)",
            m,
          )
          .catch(() => {});
      }
    }

    const menuRows = await db
      .all(
        "SELECT ID_Menu, Ordenacao FROM menu_nav ORDER BY Ordenacao ASC, ID_Menu ASC",
      )
      .catch(() => []);
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
      ["contact", "hero_title", "text", "Fale Connosco"],
      [
        "contact",
        "hero_subtitle",
        "text",
        "Estamos aqui para esclarecer as suas dúvidas e ouvir as suas sugestões sobre o nosso mel artesanal.",
      ],
      ["shop", "hero_title", "text", "A Nossa Loja de Mel"],
      [
        "shop",
        "hero_subtitle",
        "text",
        "Explore a nossa seleção exclusiva de mel puro e artesanal, colhido diretamente das colmeias dos nossos apicultores certificados.",
      ],
      ["workshops", "hero_title", "text", "Workshops de Apicultura"],
      [
        "workshops",
        "hero_subtitle",
        "text",
        "Aprenda com apicultores experientes. Descubra os segredos do mel artesanal e participe em experiências únicas.",
      ],
      ["home", "hero_image", "image_url", "/images/hero.png"],
      ["about", "hero_image", "image_url", "/images/mel-jar-premium.png"],
    ];
    for (const c of defaultCMS) {
      await db
        .run(
          "INSERT IGNORE INTO cms_content (Page_Key, Block_Key, Type, Content_Value) VALUES (?, ?, ?, ?)",
          c,
        )
        .catch(() => {});
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

    // Custom migrations for Social Network, Messaging, and Privacy Toggles
    await db.run("ALTER TABLE cliente ADD COLUMN Restrito_Postar BOOLEAN DEFAULT FALSE").catch(() => {});
    await db.run("ALTER TABLE cliente ADD COLUMN Favoritos_Publicos BOOLEAN DEFAULT FALSE").catch(() => {});
    await db.run("ALTER TABLE cliente ADD COLUMN Encomendas_Publicas BOOLEAN DEFAULT FALSE").catch(() => {});
    await db.run("ALTER TABLE menu_nav ADD COLUMN ID_Parent INT(10) DEFAULT NULL").catch(() => {});
    await db.run("DELETE FROM menu_nav WHERE Link = 'rede-social.html' OR Link = 'profile.html?tab=messages'").catch(() => {});

    await db.run(`
      CREATE TABLE IF NOT EXISTS mensagem_privada (
        ID_Mensagem int(10) NOT NULL AUTO_INCREMENT,
        ID_Remetente int(10) NOT NULL,
        ID_Destinatario int(10) NOT NULL,
        Texto TEXT NOT NULL,
        Data_Envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        Lida BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (ID_Mensagem),
        KEY ID_Remetente (ID_Remetente),
        KEY ID_Destinatario (ID_Destinatario),
        CONSTRAINT fk_msg_remetente FOREIGN KEY (ID_Remetente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE,
        CONSTRAINT fk_msg_destinatario FOREIGN KEY (ID_Destinatario) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.log("mensagem_privada table creation handled", err));

    await db.run(`
      CREATE TABLE IF NOT EXISTS bloqueio (
        ID_Bloqueador int(10) NOT NULL,
        ID_Bloqueado int(10) NOT NULL,
        Data_Bloqueio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ID_Bloqueador, ID_Bloqueado),
        CONSTRAINT fk_block_bloqueador FOREIGN KEY (ID_Bloqueador) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE,
        CONSTRAINT fk_block_bloqueado FOREIGN KEY (ID_Bloqueado) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.log("bloqueio table creation handled", err));

    await db.run(`
      CREATE TABLE IF NOT EXISTS denuncia (
        ID_Denuncia int(10) NOT NULL AUTO_INCREMENT,
        ID_Denunciante int(10) NOT NULL,
        ID_Denunciado int(10) NOT NULL,
        Tipo_Item VARCHAR(50) NOT NULL,
        ID_Item int(10) DEFAULT NULL,
        Texto_Item TEXT DEFAULT NULL,
        Motivo TEXT DEFAULT NULL,
        Data_Denuncia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        Status VARCHAR(20) DEFAULT 'Pendente',
        PRIMARY KEY (ID_Denuncia),
        CONSTRAINT fk_denuncia_denunciante FOREIGN KEY (ID_Denunciante) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE,
        CONSTRAINT fk_denuncia_denunciado FOREIGN KEY (ID_Denunciado) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch((err) => console.log("denuncia table creation handled", err));

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
    await censorExistingContent().catch((err) => console.error("Censorship cleaning error:", err));
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
    Label: "Curiosidades",
    Link: "curiosidades.html",
    Ordenacao: 4,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 5,
    Label: "Aprender",
    Link: "aprender.html",
    Ordenacao: 5,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 6,
    Label: "Comunidade",
    Link: "comunidade.html",
    Ordenacao: 6,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 7,
    Label: "Sobre Nós",
    Link: "about.html",
    Ordenacao: 7,
    Ativo: 1,
    Abrir_Nova_Aba: 0,
  },
  {
    ID_Menu: 8,
    Label: "Contactos",
    Link: "contact.html",
    Ordenacao: 8,
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
  const { Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba } = req.body;
  if (!Label || !Link) {
    return res.status(400).json({ error: "Label and Link are required" });
  }
  try {
    const result = await db.run(
      "INSERT INTO menu_nav (Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba) VALUES (?, ?, ?, ?, ?)",
      [
        Label,
        Link,
        Ordenacao || 0,
        Ativo !== false ? 1 : 0,
        Abrir_Nova_Aba ? 1 : 0,
      ],
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
  const { Label, Link, Ordenacao, Ativo, Abrir_Nova_Aba } = req.body;
  if (!Label || !Link) {
    return res.status(400).json({ error: "Label and Link are required" });
  }
  try {
    const result = await db.run(
      "UPDATE menu_nav SET Label = ?, Link = ?, Ativo = ?, Abrir_Nova_Aba = ? WHERE ID_Menu = ?",
      [Label, Link, Ativo ? 1 : 0, Abrir_Nova_Aba ? 1 : 0, id],
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
                <p style="font-size: 0.9em; color: #718096;">Se o botão não funcionar, copia e cola o seguinte link no teu navegador:</p>
                <p style="font-size: 0.8em; color: #1a4d2e; word-break: break-all;">${verifyUrl}</p>
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

// Verify Admin Token & Role
app.get("/api/auth/verify-admin", authenticateToken, isAdmin, (req, res) => {
  res.json({ valid: true, user: req.user });
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
      const expiresDate = new Date(Date.now() + 90 * 1000); // 1 minute 30 seconds from now

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
                <p style="color: #718096; font-size: 14px; margin-top: 20px;">Este código expira em <strong>1 minuto e 30 segundos</strong>.</p>
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

// Global Logout (reset Checkout_Verified)
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    await db.run("UPDATE cliente SET Checkout_Verified = 0 WHERE ID_Cliente = ?", [req.user.id]);
    res.json({ message: "Sessão encerrada e estado de verificação limpo com sucesso." });
  } catch (error) {
    console.error("Logout DB error:", error);
    res.status(500).json({ error: "Erro ao atualizar a sessão na base de dados." });
  }
});

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
      c.Bio as ApicultorBio
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
    const rows = await db.all("SELECT p.*, c.Nome AS Nome_Categoria, o.Nome AS Nome_Origem FROM produto p LEFT JOIN categoria c ON p.ID_Categoria = c.ID_Categoria LEFT JOIN origem o ON p.ID_Origem = o.ID_Origem ORDER BY p.ID_Produto DESC");
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
      emDestaque,
    } = req.body;
    try {
      const slug = await generateUniqueSlug(slugify(nome));
      const result = await db.run(
        "INSERT INTO produto (Nome, Preco, Stock, ID_Categoria, ID_Origem, Descricao, Imagem, Tags, Slug, Em_Destaque) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
          emDestaque ? 1 : 0,
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
      imagem,
      tags,
      emDestaque,
    } = req.body;
    try {
      await db.run(
        "UPDATE produto SET Nome = ?, Preco = ?, Stock = ?, ID_Categoria = ?, ID_Origem = ?, Descricao = ?, Imagem = ?, Tags = ?, Em_Destaque = ? WHERE ID_Produto = ?",
        [
          nome,
          preco,
          stock,
          idCategoria,
          idOrigem,
          descricao,
          imagem,
          tags,
          emDestaque ? 1 : 0,
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

// Toggle product featured status (Admin only)
app.patch(
  "/api/admin/products/:id/featured",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { emDestaque } = req.body;
    try {
      await db.run("UPDATE produto SET Em_Destaque = ? WHERE ID_Produto = ?", [
        emDestaque ? 1 : 0,
        id,
      ]);
      res.json({
        message: "Product featured status updated successfully",
        emDestaque: emDestaque ? 1 : 0,
      });
    } catch (error) {
      console.error("Update product featured status error:", error);
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
      `SELECT p.*,
        p.Tags,
        COALESCE(AVG(a.Nota), 0) as Rating,
        COUNT(a.ID_Avaliacao) as ReviewCount,
        cat.Nome as CategoriaNome,
        o.Nome as OrigemNome
        FROM produto p
        LEFT JOIN avaliacao a ON p.ID_Produto = a.ID_Produto
        LEFT JOIN categoria cat ON p.ID_Categoria = cat.ID_Categoria
        LEFT JOIN origem o ON p.ID_Origem = o.ID_Origem
        WHERE p.ID_Apicultor = ? AND (p.Status = 'Aprovado' OR p.Status IS NULL)
        GROUP BY p.ID_Produto`,
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
      "SELECT w.*, c.Nome as ApicultorNome, c.Picture as ApicultorFoto FROM workshop w LEFT JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente WHERE w.Status = 'Aprovado' ORDER BY w.Data_Realizacao ASC",
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
      "SELECT w.*, c.Nome as ApicultorNome, c.Picture as ApicultorFoto FROM workshop w LEFT JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente WHERE w.ID_Workshop = ? AND w.Status = 'Aprovado'",
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
      "SELECT ID_Cliente, Nome, Username, Email, UserType, Data_Resgistro, Restrito_Postar, Checkout_Verified, Checkout_OTP, Checkout_OTP_Expires, Picture, Is_Verified FROM cliente WHERE LOWER(UserType) != 'admin' ORDER BY ID_Cliente DESC",
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

// ADMIN MODERATION ENDPOINTS
// Get all content reports/denuncias
app.get("/api/admin/reports", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        d.ID_Denuncia,
        d.ID_Denunciante,
        d.ID_Denunciado,
        d.Tipo_Item,
        d.ID_Item,
        d.Texto_Item,
        d.Motivo,
        d.Data_Denuncia,
        d.Status,
        c1.Nome AS DenuncianteNome,
        c1.Email AS DenuncianteEmail,
        c2.Nome AS DenunciadoNome,
        c2.Email AS DenunciadoEmail,
        c2.Restrito_Postar AS DenunciadoRestrito
      FROM denuncia d
      JOIN cliente c1 ON d.ID_Denunciante = c1.ID_Cliente
      JOIN cliente c2 ON d.ID_Denunciado = c2.ID_Cliente
      ORDER BY d.Data_Denuncia DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.status(500).json({ error: "Erro na base de dados ao procurar denúncias." });
  }
});

// Get all blocks/bloqueios
app.get("/api/admin/blocks", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        b.ID_Bloqueador,
        b.ID_Bloqueado,
        b.Data_Bloqueio,
        c1.Nome AS BloqueadorNome,
        c1.Email AS BloqueadorEmail,
        c2.Nome AS BloqueadoNome,
        c2.Email AS BloqueadoEmail
      FROM bloqueio b
      JOIN cliente c1 ON b.ID_Bloqueador = c1.ID_Cliente
      JOIN cliente c2 ON b.ID_Bloqueado = c2.ID_Cliente
      ORDER BY b.Data_Bloqueio DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Fetch blocks error:", error);
    res.status(500).json({ error: "Erro na base de dados ao procurar bloqueios." });
  }
});

// Resolve a report (Status = 'Resolvido')
app.post("/api/admin/reports/:id/resolve", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run(
      "UPDATE denuncia SET Status = 'Resolvido' WHERE ID_Denuncia = ?",
      [id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Denúncia não encontrada." });
    }
    res.json({ message: "Denúncia marcada como resolvida com sucesso." });
  } catch (error) {
    console.error("Resolve report error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Toggle post restriction for a user (Restrito_Postar)
app.post("/api/admin/users/:id/restrict", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const restrictVal = (body.restrict === true || body.restrict === 1 || body.restrict === "1" || body.restrict === "true" || body.Restrito_Postar === 1 || body.Restrito_Postar === "1" || body.Restrito_Postar === true) ? 1 : 0;
  try {
    const user = await db.get("SELECT Nome, Email FROM cliente WHERE ID_Cliente = ?", [id]);
    await db.run("UPDATE cliente SET Restrito_Postar = ? WHERE ID_Cliente = ?", [restrictVal, id]);

    if (user && user.Email) {
      if (restrictVal === 1) {
        // Send email when blocked (non-blocking async)
        mailTransporter.sendMail({
          from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
          to: user.Email,
          subject: "⚠️ Notificação de Moderação — Conta Restrita Hexomel",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #f4b400; padding-bottom: 15px;">
                <h2 style="color: #1a4d2e; margin: 0;">🍯 Hexomel</h2>
              </div>
              <h3 style="color: #d9534f;">Olá, ${user.Nome || 'Utilizador'}</h3>
              <p style="color: #333; line-height: 1.6;">
                Informamos que a sua conta Hexomel foi <strong>temporariamente restrita</strong> pela nossa equipa de administração e moderação.
              </p>
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>O que significa isto?</strong><br/>
                  Enquanto a restrição estiver ativa, não poderá publicar novos artigos ou enviar mensagens na comunidade do Hexomel. A navegação e compras na loja continuam disponíveis.
                </p>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Se considera que isto foi um engano ou deseja obter mais esclarecimentos, pode responder a este email para entrar em contacto com o nosso suporte.
              </p>
              <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                &copy; 2026 Hexomel — Mel Multifloral Artesanal. Todos os direitos reservados.
              </div>
            </div>
          `,
        }).then(() => {
          console.log(`📧 Restriction notification email sent to ${user.Email}`);
        }).catch((mailErr) => {
          console.error("📧 Failed to send restriction email:", mailErr.message);
        });
      } else {
        // Send email when unblocked (non-blocking async)
        mailTransporter.sendMail({
          from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
          to: user.Email,
          subject: "✅ Notificação de Moderação — Restrição Removida Hexomel",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a4d2e; padding-bottom: 15px;">
                <h2 style="color: #1a4d2e; margin: 0;">🍯 Hexomel</h2>
              </div>
              <h3 style="color: #1a4d2e;">Olá, ${user.Nome || 'Utilizador'}</h3>
              <p style="color: #333; line-height: 1.6;">
                Temos o prazer de informar que a restrição da sua conta Hexomel foi <strong>revertida</strong> pela nossa equipa.
              </p>
              <div style="background-color: #d1e7dd; border-left: 4px solid #198754; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #0f5132; font-size: 14px;">
                  <strong>Conta Totalmente Ativa</strong><br/>
                  Já pode voltar a publicar novos conteúdos e interagir com a comunidade Hexomel normalmente.
                </p>
              </div>
              <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                &copy; 2026 Hexomel — Mel Multifloral Artesanal. Todos os direitos reservados.
              </div>
            </div>
          `,
        }).then(() => {
          console.log(`📧 Unrestrict notification email sent to ${user.Email}`);
        }).catch((mailErr) => {
          console.error("📧 Failed to send unrestrict email:", mailErr.message);
        });
      }
    }

    res.json({ message: restrictVal === 1 ? "Utilizador restrito com sucesso." : "Restrição removida com sucesso." });
  } catch (error) {
    console.error("Restrict user error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Toggle verification status for a user (Is_Verified / Checkout_Verified)
app.patch("/api/admin/users/:id/verification", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const isVerified = body.isVerified !== undefined ? body.isVerified : body.Is_Verified;
  const checkoutVerified = body.checkoutVerified !== undefined ? body.checkoutVerified : body.Checkout_Verified;

  try {
    if (isVerified !== undefined) {
      const val = (isVerified === true || isVerified === 1 || isVerified === "1" || isVerified === "true") ? 1 : 0;
      await db.run("UPDATE cliente SET Is_Verified = ? WHERE ID_Cliente = ?", [val, id]);
    }
    if (checkoutVerified !== undefined) {
      const val = (checkoutVerified === true || checkoutVerified === 1 || checkoutVerified === "1" || checkoutVerified === "true") ? 1 : 0;
      if (val === 1) {
        await db.run("UPDATE cliente SET Checkout_Verified = 1, Checkout_OTP = NULL, Checkout_OTP_Expires = NULL WHERE ID_Cliente = ?", [id]);
      } else {
        await db.run("UPDATE cliente SET Checkout_Verified = 0, Checkout_OTP = NULL, Checkout_OTP_Expires = NULL WHERE ID_Cliente = ?", [id]);
      }
    }
    res.json({ message: "Estado de verificação atualizado com sucesso." });
  } catch (error) {
    console.error("Update verification error:", error);
    res.status(500).json({ error: "Database error: " + error.message });
  }
});

// Send custom email to user (Admin functionality)
app.post("/api/admin/send-user-email", authenticateToken, isAdmin, async (req, res) => {
  const { toEmail, toName, subject, message } = req.body;
  if (!toEmail || !subject || !message) {
    return res.status(400).json({ error: "Destinatário, assunto e mensagem são obrigatórios." });
  }

  try {
    if (!mailTransporter) {
      return res.status(503).json({ error: "Serviço de email não configurado no servidor." });
    }

    await mailTransporter.sendMail({
      from: process.env.SMTP_FROM || "Hexomel <hexomelpap@gmail.com>",
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #f4b400; padding-bottom: 15px;">
            <h2 style="color: #1a4d2e; margin: 0; font-size: 24px; font-weight: 700;">🐝 Hexomel</h2>
          </div>
          <h3 style="color: #1a4d2e; font-size: 18px; margin-top: 0;">Olá, ${toName || 'Utilizador'}</h3>
          <p style="color: #334155; line-height: 1.6; font-size: 15px; white-space: pre-wrap;">${message}</p>
          <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>Se necessitar de esclarecimentos adicionais, por favor responda a este email.</p>
            <p style="margin-top: 15px; color: #1a4d2e; font-weight: 600; font-size: 14px;">Equipa Hexomel</p>
          </div>
        </div>
      `,
    });

    console.log(`📧 Custom admin email sent successfully to ${toEmail}`);
    res.json({ message: "Email enviado com sucesso." });
  } catch (error) {
    console.error("Admin send email error:", error);
    res.status(500).json({ error: "Falha ao enviar o email: " + error.message });
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
      "SELECT ID_Cliente as id, Nome as name, Email as email, Username as username, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Checkout_Verified as checkoutVerified, Restrito_Postar as restrictedToPost, Favoritos_Publicos as favoritesPublic, Encomendas_Publicas as ordersPublic FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({
      ...user,
      checkoutVerified: !!user.checkoutVerified,
      restrictedToPost: !!user.restrictedToPost,
      favoritesPublic: !!user.favoritesPublic,
      ordersPublic: !!user.ordersPublic,
      orders
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, bio, favoritesPublic, ordersPublic } = req.body;
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
    if (favoritesPublic !== undefined) {
      updates.push("Favoritos_Publicos = ?");
      params.push(favoritesPublic ? 1 : 0);
    }
    if (ordersPublic !== undefined) {
      updates.push("Encomendas_Publicas = ?");
      params.push(ordersPublic ? 1 : 0);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.user.id);
    await db.run(
      `UPDATE cliente SET ${updates.join(", ")} WHERE ID_Cliente = ?`,
      params,
    );

    const user = await db.get(
      "SELECT ID_Cliente as id, Nome as name, Email as email, Picture as picture, Morada as address, Telefone as phone, UserType as role, Bio as bio, Is_Verified as isVerified, Favoritos_Publicos as favoritesPublic, Encomendas_Publicas as ordersPublic FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    res.json({
      message: "Profile updated successfully",
      user: {
        ...user,
        favoritesPublic: !!user.favoritesPublic,
        ordersPublic: !!user.ordersPublic
      }
    });
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
// MEMBERS & SOCIAL & BLOCKS & MESSAGES
// -----------------------------------------------------------------------------
app.get("/api/members", async (req, res) => {
  try {
    const rows = await db.all("SELECT ID_Cliente as id, Nome as name, Email as email, UserType as role, Picture as picture, Bio as bio, Restrito_Postar as restrictedToPost FROM cliente WHERE UserType != 'admin' ORDER BY Nome ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/members/:id/profile", async (req, res) => {
  const memberId = parseInt(req.params.id);
  try {
    const member = await db.get("SELECT ID_Cliente as id, Nome as name, Email as email, Picture as picture, Bio as bio, UserType as role, Checkout_Verified as checkoutVerified, Restrito_Postar as restrictedToPost, Favoritos_Publicos as favoritesPublic, Encomendas_Publicas as ordersPublic, Morada as address FROM cliente WHERE ID_Cliente = ?", [memberId]);
    if (!member || member.role === "admin") return res.status(404).json({ error: "Membro não encontrado." });

    let city = "Não definida";
    if (member.address) {
      const zipMatch = member.address.match(/\b\d{4}-\d{3}\b/);
      if (zipMatch) {
        city = member.address.substring(member.address.indexOf(zipMatch[0]) + zipMatch[0].length).trim();
      }
    }

    let products = [];
    let hostedWorkshops = [];
    if (member.role === "apicultor") {
      products = await db.all(`SELECT p.ID_Produto as id, p.Nome as name, p.Preco as price, p.Stock as stock, p.Imagem as image, p.Descricao as description, p.Slug as slug, p.Tags as tags,
        COALESCE(AVG(a.Nota), 0) as rating,
        COUNT(a.ID_Avaliacao) as reviewCount,
        cat.Nome as category,
        o.Nome as origin
        FROM produto p
        LEFT JOIN avaliacao a ON p.ID_Produto = a.ID_Produto
        LEFT JOIN categoria cat ON p.ID_Categoria = cat.ID_Categoria
        LEFT JOIN origem o ON p.ID_Origem = o.ID_Origem
        WHERE p.ID_Apicultor = ? AND (p.Status = 'Aprovado' OR p.Status IS NULL)
        GROUP BY p.ID_Produto`, [memberId]);
      hostedWorkshops = await db.all("SELECT ID_Workshop as id, Titulo as title, Data_Realizacao as date, Preco as price, Imagem as image FROM workshop WHERE ID_Apicultor = ? AND (Status = 'Aprovado' OR Status IS NULL) ORDER BY Data_Realizacao DESC", [memberId]);
    }

    const reviews = await db.all(`SELECT a.ID_Avaliacao as id, a.Nota as rating, a.Comentario as comment, a.Data_Avaliacao as date, p.ID_Produto as productId, p.Nome as productName, p.Imagem as productImage FROM avaliacao a JOIN produto p ON a.ID_Produto = p.ID_Produto WHERE a.ID_Cliente = ? ORDER BY a.Data_Avaliacao DESC`, [memberId]);

    const reviewsCensored = reviews.map(r => ({
      ...r,
      comment: r.comment ? censorText(r.comment) : r.comment
    }));

    let favorites = [];
    if (member.favoritesPublic) {
      favorites = await db.all(`SELECT p.ID_Produto as id, p.Nome as name, p.Preco as price, p.Imagem as image, p.Slug as slug, p.Tags as tags,
        COALESCE(AVG(a.Nota), 0) as rating,
        COUNT(a.ID_Avaliacao) as reviewCount,
        cat.Nome as category,
        o.Nome as origin
        FROM favoritos f
        JOIN produto p ON f.ID_Produto = p.ID_Produto
        LEFT JOIN avaliacao a ON p.ID_Produto = a.ID_Produto
        LEFT JOIN categoria cat ON p.ID_Categoria = cat.ID_Categoria
        LEFT JOIN origem o ON p.ID_Origem = o.ID_Origem
        WHERE f.ID_Cliente = ?
        GROUP BY p.ID_Produto`, [memberId]);
    }

    let orders = [];
    if (member.ordersPublic) {
      orders = await db.all("SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC", [memberId]);
    }

    res.json({
      member: { id: member.id, name: member.name, email: member.email, picture: member.picture, bio: member.bio, role: member.role, favoritesPublic: !!member.favoritesPublic, ordersPublic: !!member.ordersPublic, location: city },
      products, hostedWorkshops, reviews: reviewsCensored, favorites, orders
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/users/blocks", authenticateToken, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        c.ID_Cliente as id,
        c.Nome as name,
        c.Email as email,
        c.Picture as picture,
        c.UserType as role
      FROM bloqueio b
      JOIN cliente c ON b.ID_Bloqueado = c.ID_Cliente
      WHERE b.ID_Bloqueador = ?
    `, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error("Fetch user blocks error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await db.get("SELECT ID_Cliente as id, Nome as name, Picture as picture, UserType as role FROM cliente WHERE ID_Cliente = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/users/block/:id", authenticateToken, async (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.id);
  if (blockerId === blockedId) {
    return res.status(400).json({ error: "Não podes bloquear-te a ti mesmo." });
  }
  try {
    await db.run("INSERT OR IGNORE INTO bloqueio (ID_Bloqueador, ID_Bloqueado) VALUES (?, ?)", [blockerId, blockedId]);
    res.json({ message: "Utilizador bloqueado com sucesso." });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/users/unblock/:id", authenticateToken, async (req, res) => {
  const blockerId = req.user.id;
  const blockedId = parseInt(req.params.id);
  try {
    await db.run("DELETE FROM bloqueio WHERE ID_Bloqueador = ? AND ID_Bloqueado = ?", [blockerId, blockedId]);
    res.json({ message: "Utilizador desbloqueado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/reports/create", authenticateToken, async (req, res) => {
  const reporterId = req.user.id;
  const { reportedUserId, itemType, itemId, reason, itemText } = req.body;
  if (!reportedUserId || !itemType) {
    return res.status(400).json({ error: "Motivo e dados insuficientes." });
  }
  try {
    await db.run(
      "INSERT INTO denuncia (ID_Denunciante, ID_Denunciado, Tipo_Item, ID_Item, Texto_Item, Motivo) VALUES (?, ?, ?, ?, ?, ?)",
      [reporterId, reportedUserId, itemType, itemId || null, itemText || null, reason || null]
    );
    res.json({ message: "Denúncia registada com sucesso." });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/messages/conversations", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const partners = await db.all(`
      SELECT DISTINCT partnerId FROM (
        SELECT ID_Remetente as partnerId FROM mensagem_privada WHERE ID_Destinatario = ?
        UNION
        SELECT ID_Destinatario as partnerId FROM mensagem_privada WHERE ID_Remetente = ?
      ) as partners
    `, [userId, userId]);

    const conversations = [];
    for (const p of partners) {
      const partnerId = p.partnerId;
      const partnerInfo = await db.get("SELECT ID_Cliente as id, Nome as name, Picture as picture FROM cliente WHERE ID_Cliente = ?", [partnerId]);
      if (!partnerInfo) continue;

      const unread = await db.get("SELECT COUNT(*) as count FROM mensagem_privada WHERE ID_Remetente = ? AND ID_Destinatario = ? AND Lida = FALSE", [partnerId, userId]);
      const lastMsg = await db.get("SELECT Texto as text, Data_Envio as sentAt FROM mensagem_privada WHERE (ID_Remetente = ? AND ID_Destinatario = ?) OR (ID_Remetente = ? AND ID_Destinatario = ?) ORDER BY Data_Envio DESC LIMIT 1", [userId, partnerId, partnerId, userId]);

      conversations.push({
        partner: partnerInfo,
        unreadCount: unread ? unread.count : 0,
        lastMessage: lastMsg ? { text: lastMsg.text ? censorText(lastMsg.text) : null, sentAt: lastMsg.sentAt } : null
      });
    }

    // Sort conversations by last message sentAt DESC
    conversations.sort((a, b) => {
      const dateA = a.lastMessage ? new Date(a.lastMessage.sentAt) : new Date(0);
      const dateB = b.lastMessage ? new Date(b.lastMessage.sentAt) : new Date(0);
      return dateB - dateA;
    });

    res.json(conversations);
  } catch (error) {
    console.error("Conversations fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/messages/history/:partnerId", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const partnerId = parseInt(req.params.partnerId);
  try {
    const messages = await db.all(`
      SELECT ID_Remetente as senderId, ID_Destinatario as receiverId, Texto as text, Data_Envio as sentAt 
      FROM mensagem_privada 
      WHERE (ID_Remetente = ? AND ID_Destinatario = ?) OR (ID_Remetente = ? AND ID_Destinatario = ?) 
      ORDER BY Data_Envio ASC
    `, [userId, partnerId, partnerId, userId]);

    const censoredMessages = messages.map(m => ({
      ...m,
      text: m.text ? censorText(m.text) : m.text
    }));

    const blockedByMe = await db.get("SELECT 1 FROM bloqueio WHERE ID_Bloqueador = ? AND ID_Bloqueado = ?", [userId, partnerId]);
    const blockedMe = await db.get("SELECT 1 FROM bloqueio WHERE ID_Bloqueador = ? AND ID_Bloqueado = ?", [partnerId, userId]);

    res.json({
      messages: censoredMessages,
      blockedByMe: !!blockedByMe,
      blockedMe: !!blockedMe
    });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/messages/send", authenticateToken, async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, text } = req.body;
  if (!receiverId || !text) {
    return res.status(400).json({ error: "Receiver and text are required." });
  }
  try {
    // Check if sender is restricted
    const sender = await db.get("SELECT Restrito_Postar FROM cliente WHERE ID_Cliente = ?", [senderId]);
    if (sender && (sender.Restrito_Postar === 1 || sender.Restrito_Postar === true)) {
      return res.status(403).json({ error: "A tua conta está restrita." });
    }

    // Check block status
    const blockCheck = await db.get("SELECT 1 FROM bloqueio WHERE (ID_Bloqueador = ? AND ID_Bloqueado = ?) OR (ID_Bloqueador = ? AND ID_Bloqueado = ?)", [senderId, receiverId, receiverId, senderId]);
    if (blockCheck) {
      return res.status(403).json({ error: "Não podes enviar mensagens a este utilizador devido a um bloqueio." });
    }

    const safeText = censorText(text.trim());
    const result = await db.run("INSERT INTO mensagem_privada (ID_Remetente, ID_Destinatario, Texto) VALUES (?, ?, ?)", [senderId, receiverId, safeText]);
    res.status(201).json({ id: result.insertId, message: "Mensagem enviada." });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/messages/read/:partnerId", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const partnerId = parseInt(req.params.partnerId);
  try {
    await db.run("UPDATE mensagem_privada SET Lida = TRUE WHERE ID_Remetente = ? AND ID_Destinatario = ? AND Lida = FALSE", [partnerId, userId]);
    res.json({ message: "Mensagens marcadas como lidas." });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

// -----------------------------------------------------------------------------
// REVIEWS (AVALIAÇÕES)
// -----------------------------------------------------------------------------
app.get("/api/products/:id/reviews", async (req, res) => {
  const productId = parseInt(req.params.id);
  try {
    const rows = await db.all(`
      SELECT a.ID_Avaliacao, a.Nota, a.Comentario, a.Data_Avaliacao, a.ID_Cliente,
             c.Nome as ClienteNome, c.Picture as ClienteFoto
      FROM avaliacao a
      JOIN cliente c ON a.ID_Cliente = c.ID_Cliente
      WHERE a.ID_Produto = ?
      ORDER BY a.Data_Avaliacao DESC
    `, [productId]);
    const censoredRows = rows.map(r => ({
      ...r,
      Comentario: r.Comentario ? censorText(r.Comentario) : r.Comentario
    }));
    res.json(censoredRows);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/products/:id/reviews", authenticateToken, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Classificação inválida." });
  }
  try {
    const safeComment = comment ? censorText(comment.trim()) : null;
    const result = await db.run(
      "INSERT INTO avaliacao (Nota, Comentario, ID_Produto, ID_Cliente) VALUES (?, ?, ?, ?)",
      [rating, safeComment, productId, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: "Avaliação registada." });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/admin/reviews", authenticateToken, isAdmin, async (req, res) => {
  try {
    const reviews = await db.all(`
      SELECT 
        a.ID_Avaliacao, 
        a.Nota, 
        a.Comentario, 
        a.Data_Avaliacao, 
        a.ID_Produto,
        c.Nome as ClienteNome, 
        c.Picture as ClienteFoto, 
        c.Email as ClienteEmail,
        p.Nome as ProdutoNome
      FROM avaliacao a
      JOIN cliente c ON a.ID_Cliente = c.ID_Cliente
      JOIN produto p ON a.ID_Produto = p.ID_Produto
      ORDER BY a.Data_Avaliacao DESC
    `);
    const censoredReviews = reviews.map(r => ({
      ...r,
      Comentario: r.Comentario ? censorText(r.Comentario) : r.Comentario
    }));
    res.json(censoredReviews);
  } catch (error) {
    console.error("Fetch admin reviews error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/admin/reviews/:reviewId", authenticateToken, async (req, res) => {
  const reviewId = parseInt(req.params.reviewId);
  try {
    const review = await db.get("SELECT ID_Cliente FROM avaliacao WHERE ID_Avaliacao = ?", [reviewId]);
    if (!review) return res.status(404).json({ error: "Avaliação não encontrada." });

    if (req.user.id !== review.ID_Cliente && req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso negado." });
    }

    await db.run("DELETE FROM avaliacao WHERE ID_Avaliacao = ?", [reviewId]);
    res.json({ message: "Avaliação eliminada com sucesso." });
  } catch (error) {
    console.error("Delete review error:", error);
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
      SELECT p.ID_Produto as id, p.Nome as name, p.Preco as price, p.Imagem as image, p.Slug as slug, p.Tags as tags,
        COALESCE(AVG(a.Nota), 0) as rating,
        COUNT(a.ID_Avaliacao) as reviewCount,
        cat.Nome as category,
        o.Nome as origin
      FROM favoritos f
      JOIN produto p ON f.ID_Produto = p.ID_Produto
      LEFT JOIN avaliacao a ON p.ID_Produto = a.ID_Produto
      LEFT JOIN categoria cat ON p.ID_Categoria = cat.ID_Categoria
      LEFT JOIN origem o ON p.ID_Origem = o.ID_Origem
      WHERE f.ID_Cliente = ?
      GROUP BY p.ID_Produto
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
      "INSERT OR IGNORE INTO favoritos (ID_Cliente, ID_Produto) VALUES (?, ?)",
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
    sendServerError(res, error);
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
      [req.params.id, req.user.id],
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Fetch order details error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get order items
app.get("/api/user/orders/:id/items", authenticateToken, async (req, res) => {
  try {
    const items = await db.all(
      `SELECT ie.*, p.Nome, p.Imagem, a.Nome as ApicultorNome
       FROM item_encomenda ie 
       JOIN produto p ON ie.ID_Produto = p.ID_Produto 
       LEFT JOIN cliente a ON p.ID_Apicultor = a.ID_Cliente
       WHERE ie.ID_Encomenda = ?`,
      [req.params.id],
    );
    res.json(items);
  } catch (error) {
    console.error("Fetch order items error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get order receipt (HTML for print/download)
app.get("/api/user/orders/:id/receipt", authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await db.get(
      "SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
      [orderId, req.user.id],
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    const items = await db.all(
      `SELECT ie.*, p.Nome, a.Nome as ApicultorNome
       FROM item_encomenda ie 
       JOIN produto p ON ie.ID_Produto = p.ID_Produto 
       LEFT JOIN cliente a ON p.ID_Apicultor = a.ID_Cliente
       WHERE ie.ID_Encomenda = ?`,
      [orderId],
    );

    const customer = await db.get(
      "SELECT Nome, Email FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    // Use absolute URL for the logo so it loads correctly in the browser
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host;
    const logoUrl = `${protocol}://${host}/images/logo_hexomel.webp`;

    const html = generateReceiptHTML(
      order,
      items,
      customer.Nome,
      customer.Email,
      logoUrl,
      { autoPrint: true },
    );
    res.send(html);
  } catch (error) {
    console.error("Generate receipt error:", error);
    res.status(500).json({ error: "Failed to generate receipt" });
  }
});

// Resend order receipt (Send email notification)
app.post(
  "/api/user/orders/:id/resend-receipt",
  authenticateToken,
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await db.get(
        "SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
        [orderId, req.user.id],
      );
      if (!order)
        return res.status(404).json({ error: "Encomenda não encontrada" });

      if (!mailTransporter) {
        return res
          .status(503)
          .json({
            error:
              "O serviço de email está temporariamente indisponível. Por favor, tente mais tarde.",
          });
      }

      await sendReceiptEmail(orderId);
      res.json({ success: true, message: "Recibo enviado com sucesso." });
    } catch (error) {
      console.error("Resend receipt error:", error);
      res.status(500).json({ error: "Falha ao reenviar o recibo" });
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

    for (const item of items) {
      if (item.Quantidade > item.Stock) {
        await db.run(
          "UPDATE item_carrinho SET Quantidade = ? WHERE ID_itemCarrinho = ?",
          [item.Stock, item.ID_itemCarrinho]
        );
        item.Quantidade = item.Stock;
      }
    }

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
    const product = await db.get("SELECT Nome, Stock FROM produto WHERE ID_Produto = ?", [productId]);
    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

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

    const requestedQty = quantity || 1;
    const currentQtyInCart = existing ? existing.Quantidade : 0;
    const totalRequested = currentQtyInCart + requestedQty;

    if (totalRequested > product.Stock) {
      return res.status(400).json({ 
        error: `Apenas existem ${product.Stock} unidades disponíveis em stock para o produto "${product.Nome}".` 
      });
    }

    if (existing) {
      await db.run(
        "UPDATE item_carrinho SET Quantidade = Quantidade + ? WHERE ID_itemCarrinho = ?",
        [requestedQty, existing.ID_itemCarrinho],
      );
    } else {
      await db.run(
        "INSERT INTO item_carrinho (ID_Carrinho, ID_Produto, Quantidade) VALUES (?, ?, ?)",
        [cartId, productId, requestedQty],
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

    const item = await db.get(`
      SELECT ic.Quantidade, p.Nome, p.Stock 
      FROM item_carrinho ic 
      JOIN produto p ON ic.ID_Produto = p.ID_Produto 
      WHERE ic.ID_itemCarrinho = ?
    `, [itemId]);

    if (!item) {
      return res.status(404).json({ error: "Item do carrinho não encontrado" });
    }

    if (quantity > item.Stock && quantity >= item.Quantidade) {
      return res.status(400).json({ 
        error: `Apenas existem ${item.Stock} unidades disponíveis em stock para o produto "${item.Nome}".` 
      });
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

// Remove cart item
app.delete("/api/cart/remove/:itemId", authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  try {
    const cart = await db.get("SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?", [req.user.id]);
    if (!cart) {
      return res.status(400).json({ error: "Carrinho não encontrado" });
    }
    
    const item = await db.get("SELECT * FROM item_carrinho WHERE ID_itemCarrinho = ? AND ID_Carrinho = ?", [itemId, cart.ID_Carrinho]);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado no carrinho" });
    }

    await db.run("DELETE FROM item_carrinho WHERE ID_itemCarrinho = ?", [itemId]);
    res.json({ message: "Item removido com sucesso" });
  } catch (error) {
    console.error("Cart item remove error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 7. Initialize Checkout Order (Draft/Pending)
app.post("/api/checkout/init", authenticateToken, async (req, res) => {
  const { address, phone, nome, apelido, shippingCost, shippingType, orderId } =
    req.body;

  try {
    let items = [];
    let subtotal = 0;

    if (orderId) {
      // If we have an orderId, we are updating an existing order
      const order = await db.get(
        "SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
        [orderId, req.user.id],
      );
      if (!order)
        return res.status(404).json({ error: "Encomenda não encontrada" });

      // Get items from that order
      items = await db.all(
        "SELECT * FROM item_encomenda WHERE ID_Encomenda = ?",
        [orderId],
      );
      subtotal = items.reduce(
        (sum, item) => sum + item.Preco_Unitario * item.Quantidade,
        0,
      );
    } else {
      // If no orderId, we must have a cart
      const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
        req.user.id,
      ]);
      if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

      items = await db.all(
        `SELECT ic.*, p.Preco 
         FROM item_carrinho ic 
         JOIN produto p ON ic.ID_Produto = p.ID_Produto 
         WHERE ic.ID_Carrinho = ?`,
        [cart.ID_Carrinho],
      );

      if (items.length === 0)
        return res.status(400).json({ error: "Carrinho vazio" });
      subtotal = items.reduce(
        (sum, item) => sum + item.Preco * item.Quantidade,
        0,
      );
    }

    const total = subtotal + Number(shippingCost || 0);
    let currentOrderId = orderId;

    if (currentOrderId) {
      // Update existing draft
      await db.run(
        "UPDATE encomenda SET Total = ?, Morada = ?, Telefone = ?, Nome = ?, Apelido = ?, Custo_Envio = ?, Tipo_Envio = ?, Data_Encomenda = CURRENT_TIMESTAMP WHERE ID_Encomenda = ? AND ID_Cliente = ?",
        [
          total,
          address,
          phone,
          nome,
          apelido,
          shippingCost,
          shippingType,
          currentOrderId,
          req.user.id,
        ],
      );

      // If it was a cart checkout that became an orderId, we might not need to refresh items
      // but usually we refresh them to match the cart if it's a "draft" being finalized.
      // HOWEVER, if the cart is EMPTY, we MUST NOT refresh items from cart.
      // Let's only refresh items if they came from the cart.
      if (!orderId) {
        await db.run("DELETE FROM item_encomenda WHERE ID_Encomenda = ?", [
          currentOrderId,
        ]);
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
        [
          req.user.id,
          total,
          address,
          phone,
          nome,
          apelido,
          shippingCost,
          shippingType,
        ],
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
app.post(
  "/api/checkout/create-session",
  authenticateToken,
  async (req, res) => {
    console.log(`[Stripe Debug] Creating session for user ${req.user.id}`);
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
        console.log(`[Stripe Debug] Using existing order ${finalOrderId}`);
        // Validate existing order
        const order = await db.get(
          "SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
          [finalOrderId, req.user.id],
        );
        if (!order) {
          console.error(
            `[Stripe Debug] Order ${finalOrderId} not found for user ${req.user.id}`,
          );
          return res.status(404).json({ error: "Encomenda não encontrada" });
        }

        // Check if order is already paid
        if (order.Status === "Pago") {
          console.warn(`[Stripe Debug] Order ${finalOrderId} is already paid`);
          return res.status(400).json({ error: "Esta encomenda já foi paga." });
        }

        items = await db.all(
          `SELECT ie.*, p.Nome, p.Imagem, p.Stock 
         FROM item_encomenda ie 
         JOIN produto p ON ie.ID_Produto = p.ID_Produto 
         WHERE ie.ID_Encomenda = ?`,
          [finalOrderId],
        );
        // Map properties to match expected format below
        items = items.map((it) => ({ ...it, Preco: it.Preco_Unitario }));

        // Check stock availability
        for (const item of items) {
          if (item.Quantidade > item.Stock) {
            return res.status(400).json({
              error: `Stock insuficiente para o produto "${item.Nome}" (apenas ${item.Stock} disponíveis).`,
            });
          }
        }

        subtotal = items.reduce(
          (sum, item) => sum + item.Preco * item.Quantidade,
          0,
        );
        const total = subtotal + Number(shippingCost || 0);

        // Update order details
        await db.run(
          "UPDATE encomenda SET Total = ?, Morada = ?, Telefone = ?, Nome = ?, Apelido = ?, Custo_Envio = ?, Tipo_Envio = ? WHERE ID_Encomenda = ?",
          [
            total,
            address,
            phone,
            nome,
            apelido,
            shippingCost,
            shippingType,
            finalOrderId,
          ],
        );
      } else {
        console.log(`[Stripe Debug] Creating new order from cart`);
        // Create from cart
        const cart = await db.get(
          "SELECT * FROM carrinho WHERE ID_Cliente = ?",
          [req.user.id],
        );
        if (!cart) {
          console.error(
            `[Stripe Debug] Cart not found for user ${req.user.id}`,
          );
          return res.status(400).json({ error: "Carrinho vazio" });
        }

        items = await db.all(
          `SELECT ic.*, p.Nome, p.Preco, p.Imagem, p.Stock 
         FROM item_carrinho ic 
         JOIN produto p ON ic.ID_Produto = p.ID_Produto 
         WHERE ic.ID_Carrinho = ?`,
          [cart.ID_Carrinho],
        );

        if (items.length === 0) {
          console.error(`[Stripe Debug] Cart empty for user ${req.user.id}`);
          return res.status(400).json({ error: "Carrinho vazio" });
        }

        // Check stock availability
        for (const item of items) {
          if (item.Quantidade > item.Stock) {
            return res.status(400).json({
              error: `Stock insuficiente para o produto "${item.Nome}" (apenas ${item.Stock} disponíveis).`,
            });
          }
        }

        subtotal = items.reduce(
          (sum, item) => sum + item.Preco * item.Quantidade,
          0,
        );
        const total = subtotal + Number(shippingCost || 0);

        const result = await db.run(
          "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone, Nome, Apelido, Custo_Envio, Tipo_Envio) VALUES (?, CURRENT_TIMESTAMP, ?, 'Pendente', ?, ?, ?, ?, ?, ?)",
          [
            req.user.id,
            total,
            address,
            phone,
            nome,
            apelido,
            shippingCost,
            shippingType,
          ],
        );
        finalOrderId = result.lastID;
        console.log(`[Stripe Debug] Created order ${finalOrderId}`);

        for (const item of items) {
          await db.run(
            "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
            [finalOrderId, item.ID_Produto, item.Quantidade, item.Preco],
          );
        }
      }

      /* 
       REMOVED: Clear cart only on SUCCESSFUL payment in fulfillPaidOrder
       to allow retrying the checkout if canceled.
    */
      /*
    await db.run(
      "DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)",
      [req.user.id]
    );
    */

      // 5. MOCK MODE LOGIC
      if (!stripe) {
        console.log("⚠️ STRIPE_SECRET_KEY missing. Entering MOCK MODE.");

        // Clear Cart (if applicable)
        await db.run(
          "DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)",
          [req.user.id],
        );

        await fulfillPaidOrder(finalOrderId);
        return res.json({
          url: `/success.html?orderId=${finalOrderId}&mock=true`,
          isMock: true,
        });
      }

      await syncCustomerCheckoutDetails(req.user.id, {
        nome,
        apelido,
        address,
        phone,
      });

      // 6. REAL STRIPE SESSION
      const lineItems = items.map((item) => {
        const productImages = getStripeCheckoutProductImages(
          req.headers.origin,
          item.Imagem,
          item.Nome,
          item.ID_Produto,
        );
        return {
          price_data: {
            currency: "eur",
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
            currency: "eur",
            product_data: {
              name: "Envio (CTT Expresso)",
              images: [
                "https://placehold.co/600x600/fef3c7/92400e.png?font=montserrat&text=CTT",
              ],
            },
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
        mode: "payment",
        locale: "pt",
        submit_type: "pay",
        billing_address_collection: "auto",
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
      console.error("[Stripe Debug] Error creating session:", error);
      res.status(500).json({
        error: "Falha ao criar sessão de pagamento",
        details: error.message,
      });
    }
  },
);

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
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } else {
        const payload = Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body);

        event = JSON.parse(payload);
      }

      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (orderId && session.payment_status === "paid") {
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
  },
);

// Checkout Route (Legacy/Manual for MBWay or fallback)
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  if (!req.user.checkoutVerified) {
    return res.status(401).json({ error: "2FA_REQUIRED" });
  }

  const { address, phone, nome, apelido, shippingCost, shippingType, orderId } =
    req.body;

  try {
    let items = [];
    let subtotal = 0;
    let finalOrderId = orderId;

    if (finalOrderId) {
      // Validate existing order
      const order = await db.get(
        "SELECT * FROM encomenda WHERE ID_Encomenda = ? AND ID_Cliente = ?",
        [finalOrderId, req.user.id],
      );
      if (!order)
        return res.status(404).json({ error: "Encomenda não encontrada" });

      items = await db.all(
        `SELECT ie.*, p.Nome, p.Stock 
         FROM item_encomenda ie
         JOIN produto p ON ie.ID_Produto = p.ID_Produto
         WHERE ie.ID_Encomenda = ?`,
        [finalOrderId],
      );
      // Use price from item_encomenda
      items = items.map((it) => ({ ...it, Preco: it.Preco_Unitario }));
      subtotal = items.reduce(
        (sum, item) => sum + item.Preco * item.Quantidade,
        0,
      );

      const total = subtotal + Number(shippingCost || 0);

      await db.run(
        "UPDATE encomenda SET Total = ?, Morada = ?, Telefone = ?, Nome = ?, Apelido = ?, Custo_Envio = ?, Tipo_Envio = ? WHERE ID_Encomenda = ?",
        [
          total,
          address,
          phone,
          nome,
          apelido,
          shippingCost,
          shippingType,
          finalOrderId,
        ],
      );
    } else {
      const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
        req.user.id,
      ]);
      if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

      items = await db.all(
        `SELECT ic.*, p.Nome, p.Preco, p.Stock
         FROM item_carrinho ic
         JOIN produto p ON ic.ID_Produto = p.ID_Produto
         WHERE ic.ID_Carrinho = ?`,
        [cart.ID_Carrinho],
      );

      if (items.length === 0)
        return res.status(400).json({ error: "Carrinho vazio" });

      subtotal = items.reduce(
        (sum, item) => sum + item.Preco * item.Quantidade,
        0,
      );
      const total = subtotal + Number(shippingCost || 0);

      const result = await db.run(
        "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone, Nome, Apelido, Custo_Envio, Tipo_Envio) VALUES (?, CURRENT_TIMESTAMP, ?, 'Pendente', ?, ?, ?, ?, ?, ?)",
        [
          req.user.id,
          total,
          address,
          phone,
          nome,
          apelido,
          shippingCost,
          shippingType,
        ],
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

    // Check stock availability
    for (const item of items) {
      if (item.Quantidade > item.Stock) {
        return res.status(400).json({
          error: `Stock insuficiente para o produto "${item.Nome}" (apenas ${item.Stock} disponíveis).`,
        });
      }
    }

    for (const item of items) {
      await db.run(
        "UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?",
        [item.Quantidade, item.ID_Produto],
      );
    }

    await db.run(
      "UPDATE encomenda SET Status = 'Pago' WHERE ID_Encomenda = ?",
      [finalOrderId],
    );

    // Clear cart for the user
    await db.run(
      "DELETE FROM item_carrinho WHERE ID_Carrinho = (SELECT ID_Carrinho FROM carrinho WHERE ID_Cliente = ?)",
      [req.user.id],
    );

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
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "faggot",
  "faggots",
  "fag",
  "fags",
  "chink",
  "spic",
  "kike",
  "retard",
  "retards",
  "cunt",
  "cunts",
  "fuck",
  "fucking",
  "fucker",
  "fuckers",
  "shit",
  "shitty",
  "bitch",
  "bitches",
  "asshole",
  "assholes",
  "bastard",
  "bastards",
  "dick",
  "dicks",
  "cock",
  "pussy",
  "whore",
  "whores",
  "slut",
  "sluts",
  "motherfucker",
  "crap",
  "prick",
  "twat",
  "merda",
  "merdas",
  "caralho",
  "caralhos",
  "puta",
  "putas",
  "foda",
  "fodas",
  "cona",
  "conas",
  "fdp",
  "porra",
  "paneleiro",
  "cabrao",
  "corno",
  "carago",
  "pila",
  "picha",
  "cuzinho",
  "foder",
];
function censorText(text) {
  let result = text;
  for (const word of BAD_WORDS_LIST) {
    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp("\\b" + escaped + "s?\\b", "gi");
    result = result.replace(regex, function (m) {
      return "*".repeat(m.length);
    });
  }
  return result;
}

async function censorExistingContent() {
  try {
    // 1. Censor existing reviews
    const reviews = await db.all("SELECT ID_Avaliacao, Comentario FROM avaliacao WHERE Comentario IS NOT NULL");
    for (const review of reviews) {
      const original = review.Comentario;
      const censored = censorText(original);
      if (original !== censored) {
        await db.run("UPDATE avaliacao SET Comentario = ? WHERE ID_Avaliacao = ?", [censored, review.ID_Avaliacao]);
        console.log(`Censored existing review ID ${review.ID_Avaliacao} in database.`);
      }
    }

    // 2. Censor existing private messages
    const messages = await db.all("SELECT ID_Mensagem, Texto FROM mensagem_privada WHERE Texto IS NOT NULL");
    for (const msg of messages) {
      const original = msg.Texto;
      const censored = censorText(original);
      if (original !== censored) {
        await db.run("UPDATE mensagem_privada SET Texto = ? WHERE ID_Mensagem = ?", [censored, msg.ID_Mensagem]);
        console.log(`Censored existing message ID ${msg.ID_Mensagem} in database.`);
      }
    }

    // 3. Censor existing Q&A questions
    const questions = await db.all("SELECT ID_Pergunta, Texto FROM pergunta_comunidade WHERE Texto IS NOT NULL");
    for (const q of questions) {
      const original = q.Texto;
      const censored = censorText(original);
      if (original !== censored) {
        await db.run("UPDATE pergunta_comunidade SET Texto = ? WHERE ID_Pergunta = ?", [censored, q.ID_Pergunta]);
        console.log(`Censored existing question ID ${q.ID_Pergunta} in database.`);
      }
    }

    // 4. Censor existing Q&A answers
    const answers = await db.all("SELECT ID_Resposta, Texto FROM resposta_comunidade WHERE Texto IS NOT NULL");
    for (const a of answers) {
      const original = a.Texto;
      const censored = censorText(original);
      if (original !== censored) {
        await db.run("UPDATE resposta_comunidade SET Texto = ? WHERE ID_Resposta = ?", [censored, a.ID_Resposta]);
        console.log(`Censored existing answer ID ${a.ID_Resposta} in database.`);
      }
    }
    console.log("Censorship audit and cleaning completed on all user-generated content.");
  } catch (error) {
    console.error("Error running censorship audit:", error);
  }
}

// Get all questions (with answers and author info), sorted by votes desc
app.get("/api/comunidade/perguntas", async (req, res) => {
  try {
    const perguntas = await db.all(`
      SELECT p.*, COALESCE(NULLIF(c.Nome, ''), NULLIF(c.Username, ''), NULLIF(c.Email, ''), 'Utilizador') AS AutorNome, c.Picture AS AutorPicture, COALESCE(c.UserType, 'client') AS AutorTipo, c.Restrito_Postar AS AutorRestrito
      FROM pergunta_comunidade p
      LEFT JOIN cliente c ON p.ID_Cliente = c.ID_Cliente
      ORDER BY p.Votos DESC, p.Data_Criacao DESC
    `);

    for (const pergunta of perguntas) {
      pergunta.Texto = pergunta.Texto ? censorText(pergunta.Texto) : "";
      const respostas = await db.all(
        `
        SELECT r.*, COALESCE(NULLIF(c.Nome, ''), NULLIF(c.Username, ''), NULLIF(c.Email, ''), 'Utilizador') AS AutorNome, c.Picture AS AutorPicture, COALESCE(c.UserType, 'client') AS AutorTipo, c.Restrito_Postar AS AutorRestrito
        FROM resposta_comunidade r
        LEFT JOIN cliente c ON r.ID_Cliente = c.ID_Cliente
        WHERE r.ID_Pergunta = ?
        ORDER BY r.Melhor_Resposta DESC, r.Votos DESC, r.Data_Criacao ASC
      `,
        [pergunta.ID_Pergunta],
      );
      pergunta.respostas = respostas.map(r => ({
        ...r,
        Texto: r.Texto ? censorText(r.Texto) : ""
      }));
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
    return res
      .status(400)
      .json({ error: "A pergunta deve ter pelo menos 10 caracteres." });
  }

  try {
    // Check if user is restricted
    const user = await db.get("SELECT Restrito_Postar FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    if (user && (user.Restrito_Postar === 1 || user.Restrito_Postar === true)) {
      return res.status(403).json({ error: "A tua conta está restrita." });
    }

    const safeText = censorText(texto.trim());
    const result = await db.run(
      "INSERT INTO pergunta_comunidade (ID_Cliente, Texto) VALUES (?, ?)",
      [req.user.id, safeText],
    );
    res.status(201).json({ id: result.lastID, message: "Pergunta publicada!" });
  } catch (error) {
    console.error("Q&A question create error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a question (admin or author)
app.delete(
  "/api/comunidade/perguntas/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const pergunta = await db.get(
        "SELECT * FROM pergunta_comunidade WHERE ID_Pergunta = ?",
        [req.params.id],
      );
      if (!pergunta)
        return res.status(404).json({ error: "Pergunta não encontrada." });
      if (pergunta.ID_Cliente !== req.user.id && req.user.role !== "admin")
        return res.status(403).json({ error: "Sem permissão." });

      await db.run("DELETE FROM pergunta_comunidade WHERE ID_Pergunta = ?", [
        req.params.id,
      ]);
      res.json({ message: "Pergunta removida." });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Post an answer to a question (authenticated)
app.post(
  "/api/comunidade/perguntas/:id/respostas",
  authenticateToken,
  async (req, res) => {
    const { texto } = req.body;
    const perguntaId = req.params.id;

    if (!texto || texto.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "A resposta deve ter pelo menos 2 caracteres." });
    }

    try {
      // Check if user is restricted
      const user = await db.get("SELECT Restrito_Postar FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
      if (user && (user.Restrito_Postar === 1 || user.Restrito_Postar === true)) {
        return res.status(403).json({ error: "A tua conta está restrita." });
      }

      const pergunta = await db.get(
        "SELECT * FROM pergunta_comunidade WHERE ID_Pergunta = ?",
        [perguntaId],
      );
      if (!pergunta) {
        return res.status(404).json({ error: "Pergunta não encontrada." });
      }

      const safeText = censorText(texto.trim());
      const result = await db.run(
        "INSERT INTO resposta_comunidade (ID_Pergunta, ID_Cliente, Texto) VALUES (?, ?, ?)",
        [perguntaId, req.user.id, safeText],
      );
      res
        .status(201)
        .json({ id: result.lastID, message: "Resposta publicada!" });
    } catch (error) {
      console.error("Q&A answer create error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Vote on a question
app.post(
  "/api/comunidade/perguntas/:id/votar",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.body && req.body.action === "remove") {
        await db.run(
          "UPDATE pergunta_comunidade SET Votos = GREATEST(0, Votos - 1) WHERE ID_Pergunta = ?",
          [req.params.id],
        );
        res.json({ message: "Voto removido!" });
      } else {
        await db.run(
          "UPDATE pergunta_comunidade SET Votos = Votos + 1 WHERE ID_Pergunta = ?",
          [req.params.id],
        );
        res.json({ message: "Voto registado!" });
      }
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Vote on an answer
app.post(
  "/api/comunidade/respostas/:id/votar",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.body && req.body.action === "remove") {
        await db.run(
          "UPDATE resposta_comunidade SET Votos = GREATEST(0, Votos - 1) WHERE ID_Resposta = ?",
          [req.params.id],
        );
        res.json({ message: "Voto removido!" });
      } else {
        await db.run(
          "UPDATE resposta_comunidade SET Votos = Votos + 1 WHERE ID_Resposta = ?",
          [req.params.id],
        );
        res.json({ message: "Voto registado!" });
      }
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

app.post("/api/logs/interaction", async (req, res) => {
  try {
    const { tipo, pagina, dados } = req.body;
    let userId = null;

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Silently ignore token verification errors for analytics logs
      }
    }

    const dadosJson = dados ? JSON.stringify(dados) : null;

    await db.run(
      "INSERT INTO interacao (ID_Cliente, Tipo, Pagina, Dados) VALUES (?, ?, ?, ?)",
      [userId, tipo, pagina, dadosJson],
    );

    res.status(204).send();
  } catch (error) {
    console.error("Log interaction error:", error);
    res.status(204).send();
  }
});

// ============================================================
// SEO SLUG ROUTES
// ============================================================

// Get product by slug (public)
app.get("/api/products/by-slug/:slug", async (req, res) => {
  try {
    const row = await db.get(
      `
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
      WHERE p.Slug = ? AND (p.Status = 'Aprovado' OR p.Status IS NULL)
      GROUP BY p.ID_Produto
    `,
      [req.params.slug],
    );
    if (!row) return res.status(404).json({ error: "Produto não encontrado." });
    res.json(row);
  } catch (error) {
    console.error("Product by slug error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin: Edit slug of any product
app.patch(
  "/api/admin/products/:id/slug",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    let { slug } = req.body;
    if (!slug || !slug.trim()) {
      return res.status(400).json({ error: "O slug é obrigatório." });
    }
    slug = slugify(slug);
    if (!slug) {
      return res.status(400).json({ error: "Slug inválido." });
    }
    try {
      // Check uniqueness
      const existing = await db.get(
        "SELECT ID_Produto FROM produto WHERE Slug = ? AND ID_Produto != ?",
        [slug, id],
      );
      if (existing) {
        return res
          .status(409)
          .json({ error: "Este slug já está em uso por outro produto." });
      }
      await db.run("UPDATE produto SET Slug = ? WHERE ID_Produto = ?", [
        slug,
        id,
      ]);
      res.json({ message: "Slug atualizado com sucesso.", slug });
    } catch (error) {
      console.error("Admin update slug error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Apicultor: Edit slug of own product
app.patch(
  "/api/apicultor/products/:id/slug",
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== "apicultor" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied." });
    }
    const { id } = req.params;
    let { slug } = req.body;
    if (!slug || !slug.trim()) {
      return res.status(400).json({ error: "O slug é obrigatório." });
    }
    slug = slugify(slug);
    if (!slug) {
      return res.status(400).json({ error: "Slug inválido." });
    }
    try {
      // Verify ownership
      const product = await db.get(
        "SELECT * FROM produto WHERE ID_Produto = ? AND ID_Apicultor = ?",
        [id, req.user.id],
      );
      if (!product && req.user.role !== "admin") {
        return res
          .status(404)
          .json({ error: "Produto não encontrado ou acesso negado." });
      }
      // Check uniqueness
      const existing = await db.get(
        "SELECT ID_Produto FROM produto WHERE Slug = ? AND ID_Produto != ?",
        [slug, id],
      );
      if (existing) {
        return res
          .status(409)
          .json({ error: "Este slug já está em uso por outro produto." });
      }
      await db.run("UPDATE produto SET Slug = ? WHERE ID_Produto = ?", [
        slug,
        id,
      ]);
      res.json({ message: "Slug atualizado com sucesso.", slug });
    } catch (error) {
      console.error("Apicultor update slug error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Get all site slugs (public)
app.get("/api/site-slugs", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM site_slugs ORDER BY Pagina ASC");
    res.json(rows);
  } catch (error) {
    console.error("Site slugs fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin: Update site slugs
app.put(
  "/api/admin/site-slugs",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { slugs } = req.body;
    if (!Array.isArray(slugs)) {
      return res.status(400).json({ error: "Lista de slugs inválida." });
    }
    try {
      for (const item of slugs) {
        const cleanSlug = slugify(item.slug || item.Slug);
        if (!cleanSlug) continue;
        await db.run(
          "UPDATE site_slugs SET Slug = ?, Titulo_SEO = ?, Descricao_SEO = ? WHERE Pagina = ?",
          [
            cleanSlug,
            item.titulo_seo || item.Titulo_SEO || null,
            item.descricao_seo || item.Descricao_SEO || null,
            item.pagina || item.Pagina,
          ],
        );
      }
      res.json({ message: "Slugs do site atualizados com sucesso." });
    } catch (error) {
      console.error("Update site slugs error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Dynamic sitemap generation
app.get("/sitemap.xml", async (req, res) => {
  try {
    const [sitePages, products] = await Promise.all([
      db.all("SELECT Pagina, Slug FROM site_slugs"),
      db.all("SELECT Slug FROM produto WHERE Slug IS NOT NULL"),
    ]);

    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const date = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    sitePages.forEach((p) => {
      const publicPath = p.Pagina === "inicio" ? "" : p.Slug || p.Pagina;
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/${publicPath}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <priority>${p.Pagina === "inicio" ? "1.0" : "0.8"}</priority>\n`;
      xml += `  </url>\n`;
    });

    products.forEach((p) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/produto.html?slug=${p.Slug}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// ============================================================
// SITE SETTINGS (key-value store for admin preferences)
// ============================================================

// Public: Read all site settings
app.get("/api/site-settings", async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT setting_key, setting_value FROM site_settings",
    );
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    res.json(settings);
  } catch (error) {
    console.error("Site settings fetch error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin: Update site settings
app.put(
  "/api/admin/site-settings",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res
        .status(400)
        .json({
          error: "Formato inválido. Esperado: { settings: { key: value } }",
        });
    }

    try {
      for (const [key, value] of Object.entries(settings)) {
        await db.run(
          "INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [key, value],
        );
      }
      res.json({ message: "Definições atualizadas com sucesso." });
    } catch (error) {
      console.error("Update site settings error:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

// Helper: Check if maintenance mode is active (full or for specific section)
export async function isMaintenanceActive(section = "full") {
  try {
    const rows = await db.all("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'maintenance_%'");
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    if (settings.maintenance_full === "true" || settings.maintenance_mode === "true") return true;
    if (section && section !== "full" && settings[`maintenance_${section}`] === "true") return true;
    return false;
  } catch (err) {
    return false;
  }
}

// Middleware: Block request if maintenance active and not admin
export async function checkMaintenanceMode(req, res, next) {
  try {
    const active = await isMaintenanceActive();
    if (active) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && ((decoded.role && decoded.role.toLowerCase() === "admin") || (decoded.UserType && decoded.UserType.toLowerCase() === "admin"))) {
            return next();
          }
        } catch (e) {}
      }
      return res.status(503).json({
        error: "O sistema encontra-se em manutenção temporária. Por favor, tente novamente mais tarde.",
        maintenance: true
      });
    }
  } catch (e) {}
  next();
}

// Admin: Legacy toggle route (kept for compatibility)
app.post(
  "/api/admin/maintenance/toggle",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { active } = req.body;
    const val = active ? "true" : "false";
    try {
      await db.run(
        "INSERT INTO site_settings (setting_key, setting_value) VALUES ('maintenance_full', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [val]
      );
      await db.run(
        "INSERT INTO site_settings (setting_key, setting_value) VALUES ('maintenance_mode', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [val]
      );
      res.json({
        message: active ? "Modo de manutenção ativado!" : "Modo de manutenção desativado!",
        maintenance_mode: active
      });
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      res.status(500).json({ error: "Database error" });
    }
  }
);

// Admin: Update granular maintenance settings & trigger email broadcast if requested
app.post(
  "/api/admin/maintenance/update",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const {
      maintenance_full,
      maintenance_shop,
      maintenance_curiosidades,
      maintenance_aprender,
      maintenance_hexohive,
      maintenance_message,
      maintenance_end_time,
      maintenance_send_email,
      maintenance_show_popup,
      changed_sections // Array of section objects: { name: 'Compras/Loja', active: true/false }
    } = req.body;

    try {
      const settingsMap = {
        maintenance_full: String(!!maintenance_full),
        maintenance_mode: String(!!maintenance_full),
        maintenance_shop: String(!!maintenance_shop),
        maintenance_curiosidades: String(!!maintenance_curiosidades),
        maintenance_aprender: String(!!maintenance_aprender),
        maintenance_hexohive: String(!!maintenance_hexohive),
        maintenance_message: maintenance_message || "",
        maintenance_end_time: maintenance_end_time || "",
        maintenance_send_email: "true",
        maintenance_show_popup: "true"
      };

      for (const [key, value] of Object.entries(settingsMap)) {
        await db.run(
          "INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [key, value]
        );
      }

      let notifiedCount = 0;
      if (Array.isArray(changed_sections) && changed_sections.length > 0 && mailTransporter) {
        const users = await db.all("SELECT Email, Nome FROM cliente WHERE Email IS NOT NULL AND Email != ''");
        const nowFormatted = new Date().toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });

        for (const change of changed_sections) {
          const isActivated = change.active;
          const subject = isActivated
            ? `🛠️ Hexomel - Manutenção na área: ${change.name}`
            : `✅ Hexomel - Área Restaurada: ${change.name}`;

          const content = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
              <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 30px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🐝 Hexomel</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Comunicado do Modo de Manutenção</p>
              </div>
              <div style="padding: 30px 25px; color: #334155; line-height: 1.6;">
                <h2 style="color: ${isActivated ? '#d97706' : '#059669'}; font-size: 20px; margin-top: 0;">
                  ${isActivated ? '🛠️ Manutenção Temporária Ativada' : '✅ Funcionalidade Concluída e Restaurada'}
                </h2>
                <p>Estimado(a) utilizador(a),</p>
                <p>Informamos sobre o estado dos nossos serviços na plataforma Hexomel:</p>
                <div style="background-color: #f8fafc; border-left: 4px solid ${isActivated ? '#f59e0b' : '#10b981'}; padding: 15px 20px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Funcionalidade Afetada:</strong> ${change.name}</p>
                  <p style="margin: 4px 0;"><strong>Data e Hora de Início:</strong> ${nowFormatted}</p>
                  ${maintenance_end_time ? `<p style="margin: 4px 0;"><strong>Previsão de Conclusão:</strong> ${maintenance_end_time}</p>` : ''}
                  ${maintenance_message ? `<p style="margin: 4px 0;"><strong>Motivo / Nota:</strong> ${maintenance_message}</p>` : ''}
                </div>
                <p>${isActivated 
                  ? 'As nossas abelhas estão a trabalhar arduamente para efetuar melhorias. Será enviada uma nova comunicação assim que a manutenção estiver concluída e o acesso for restaurado.' 
                  : 'O acesso a esta funcionalidade foi totalmente restaurado e pode continuar a navegar normalmente. Agradecemos a sua paciência!'}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Com os melhores cumprimentos,<br><strong>Equipa Hexomel</strong> 🍯</p>
              </div>
            </div>
          `;

          for (const u of users) {
            try {
              await mailTransporter.sendMail({
                from: process.env.SMTP_FROM || '"Hexomel" <hexomelpap@gmail.com>',
                to: u.Email,
                subject: subject,
                html: content
              });
              notifiedCount++;
            } catch (err) {
              console.error(`Erro ao enviar email para ${u.Email}:`, err.message);
            }
          }
        }
      }

      try {
        await db.run("DELETE FROM site_settings WHERE setting_key = 'maintenance_expired_email_sent'");
      } catch(e){}

      res.json({
        message: "Configurações de manutenção atualizadas com sucesso!",
        notifiedCount
      });
    } catch (error) {
      console.error("Error updating maintenance settings:", error);
      res.status(500).json({ error: "Database error" });
    }
  }
);

// Triggered when countdown timer reaches zero
app.post("/api/maintenance/timer-expired", async (req, res) => {
  try {
    const rows = await db.all("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'maintenance_%'");
    const settings = {};
    for (const r of rows) settings[r.setting_key] = r.setting_value;

    if (settings.maintenance_expired_email_sent === "true") {
      return res.json({ message: "Email de expiração já enviado anteriormente." });
    }

    await db.run(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('maintenance_expired_email_sent', 'true') ON DUPLICATE KEY UPDATE setting_value = 'true'"
    );

    if (mailTransporter) {
      const admins = await db.all("SELECT Email, Nome FROM cliente WHERE UserType = 'admin'");
      const endTime = settings.maintenance_end_time || "o horário estipulado";

      for (const admin of admins) {
        if (!admin.Email) continue;
        try {
          await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"Hexomel" <hexomelpap@gmail.com>',
            to: admin.Email,
            subject: "⚠️ Hexomel - A previsão do tempo de manutenção terminou!",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fef3c7; border-radius: 16px; background-color: #ffffff;">
                <h2 style="color: #d97706;">⌛ Previsão de Manutenção Concluída</h2>
                <p>Olá <strong>${admin.Nome || 'Administrador'}</strong>,</p>
                <p>O tempo previsto para a manutenção no site (<strong>${endTime}</strong>) terminou.</p>
                <p>Deseja adicionar mais tempo de manutenção ou concluir e reabrir o acesso aos utilizadores?</p>
                <div style="margin: 25px 0; text-align: center;">
                  <a href="http://localhost:5173/admin.html" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: bold; display: inline-block;">Aceder ao Painel de Administração</a>
                </div>
              </div>
            `
          });
        } catch (e) {
          console.error("Error sending expired timer email to admin:", e);
        }
      }
    }
    res.json({ success: true, message: "Notificação de expiração enviada ao administrador." });
  } catch (err) {
    console.error("Timer expired API error:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Submit user complaint/contact during maintenance
app.post("/api/maintenance/complaints", async (req, res) => {
  const { user_name, user_email, message, section } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Mensagem é obrigatória." });
  }

  try {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS maintenance_complaints (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          message TEXT NOT NULL,
          section VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (tblErr) {
      console.error("Error creating maintenance_complaints table:", tblErr.message || tblErr);
    }

    // Apply censorship filtering to message
    const safeMessage = typeof censorText === "function" ? censorText(message.trim()) : message.trim();

    await db.run(
      "INSERT INTO maintenance_complaints (user_name, user_email, message, section) VALUES (?, ?, ?, ?)",
      [user_name || "Anónimo", user_email || "Não especificado", safeMessage, section || "Geral"]
    );

    if (mailTransporter) {
      const admins = await db.all("SELECT Email, Nome FROM cliente WHERE UserType = 'admin'");
      for (const admin of admins) {
        if (!admin.Email) continue;
        try {
          await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"Hexomel" <hexomelpap@gmail.com>',
            to: admin.Email,
            subject: `📬 Nova Reclamação/Mensagem de Manutenção (${section || 'Geral'})`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                <h2 style="color: #d97706;">📬 Nova Reclamação / Contacto de Utilizador</h2>
                <p><strong>Nome:</strong> ${user_name || 'Anónimo'}</p>
                <p><strong>Email:</strong> ${user_email || 'Não especificado'}</p>
                <p><strong>Secção Afetada:</strong> ${section || 'Geral'}</p>
                <div style="background: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 15px 0;">
                  <p style="margin: 0; color: #78350f;">${safeMessage}</p>
                </div>
              </div>
            `
          });
        } catch (e) {}
      }
    }

    res.json({ success: true, message: "Mensagem enviada ao administrador com sucesso!" });
  } catch (err) {
    console.error("Error saving complaint:", err.message || err);
    res.status(500).json({ error: "Erro ao registar mensagem no servidor. Detalhes: " + (err.message || err) });
  }
});

// Admin: Get complaints list
app.get("/api/admin/maintenance/complaints", authenticateToken, isAdmin, async (req, res) => {
  try {
    const complaints = await db.all("SELECT * FROM maintenance_complaints ORDER BY created_at DESC");
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: "Erro ao procurar reclamações." });
  }
});

// Admin: Delete a complaint
app.delete("/api/admin/maintenance/complaints/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.run("DELETE FROM maintenance_complaints WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Mensagem eliminada com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao eliminar mensagem." });
  }
});

// Admin: Block user from complaint
app.post("/api/admin/maintenance/block-user", authenticateToken, isAdmin, async (req, res) => {
  const { email, user_name } = req.body;
  try {
    let user = null;
    if (email && email !== "Não especificado" && email.trim() !== "" && email.includes("@")) {
      user = await db.get("SELECT ID_Cliente, Nome, Email FROM cliente WHERE Email = ?", [email.trim()]);
    }
    if (!user && user_name && user_name !== "Anónimo" && user_name !== "Utilizador") {
      const cleanName = user_name.replace(/^@/, "").trim();
      user = await db.get("SELECT ID_Cliente, Nome, Email FROM cliente WHERE Username = ? OR Nome = ?", [cleanName, cleanName]);
    }

    if (!user) {
      return res.status(404).json({ error: "Não foi possível encontrar a conta registada deste utilizador para bloquear." });
    }

    await db.run("UPDATE cliente SET Restrito_Postar = 1 WHERE ID_Cliente = ?", [user.ID_Cliente]);

    if (user.Email && mailTransporter) {
      mailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"Hexomel" <hexomelpap@gmail.com>',
        to: user.Email,
        subject: "⚠️ Notificação de Moderação — Conta Restrita Hexomel",
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #dc2626;">⚠️ Conta Restrita / Bloqueada</h2>
          <p>Olá <strong>${user.Nome || 'Utilizador'}</strong>,</p>
          <p>A sua conta foi <strong>bloqueada/restrita</strong> devido a linguagem inadequada ou comportamento impróprio detetado pela administração.</p>
        </div>`
      }).catch(() => {});
    }

    res.json({ success: true, message: `Utilizador ${user.Nome || user.Email} foi bloqueado com sucesso!` });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ error: "Erro ao bloquear utilizador no servidor." });
  }
});

// Admin: Reply to user complaint by email
app.post("/api/admin/maintenance/reply-complaint", authenticateToken, isAdmin, async (req, res) => {
  const { to_email, user_name, subject, message_body } = req.body;

  if (!to_email || !message_body || !message_body.trim()) {
    return res.status(400).json({ error: "Email de destino e mensagem são obrigatórios." });
  }

  try {
    if (mailTransporter) {
      await mailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"Hexomel" <hexomelpap@gmail.com>',
        to: to_email,
        subject: subject || "Hexomel - Resposta à sua mensagem",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #fef3c7; border-radius: 20px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #d97706; margin: 0;">Hexomel</h2>
              <span style="font-size: 0.85rem; color: #64748b;">Apoio ao Cliente & Manutenção</span>
            </div>
            <div style="background: #fffdfa; border: 1px solid #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 20px; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: #334155;">${message_body.trim()}</div>
            <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin: 0;">Este é um email de resposta enviado pela administração do Hexomel.</p>
          </div>
        `
      });
    }

    res.json({ success: true, message: "Email de resposta enviado com sucesso ao utilizador!" });
  } catch (err) {
    console.error("Error sending complaint reply email:", err);
    res.status(500).json({ error: "Erro ao enviar email de resposta." });
  }
});

// ============================================================
// QUIZ API ROUTES
// ============================================================

// Get all quiz questions
app.get("/api/quiz/perguntas", async (req, res) => {
  try {
    const questions = await db.all(
      "SELECT * FROM quiz_pergunta ORDER BY ID_Pergunta ASC",
    );
    res.json(questions);
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    res.status(500).json({ error: "Failed to fetch questions." });
  }
});

// Admin: Add a new quiz question
app.post(
  "/api/quiz/perguntas",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const {
      pergunta,
      opcao1,
      opcao2,
      opcao3,
      opcao4,
      resposta_correta,
      explicacao,
    } = req.body;
    if (
      !pergunta ||
      !opcao1 ||
      !opcao2 ||
      !opcao3 ||
      !opcao4 ||
      resposta_correta === undefined ||
      !explicacao
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
      const result = await db.run(
        "INSERT INTO quiz_pergunta (Pergunta, Opcao1, Opcao2, Opcao3, Opcao4, Resposta_Correta, Explicacao) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          pergunta,
          opcao1,
          opcao2,
          opcao3,
          opcao4,
          resposta_correta,
          explicacao,
        ],
      );
      res
        .status(201)
        .json({ message: "Question added successfully.", id: result.insertId });
    } catch (error) {
      console.error("Error adding question:", error);
      res.status(500).json({ error: "Failed to add question." });
    }
  },
);

// Admin: Update a quiz question
app.put(
  "/api/quiz/perguntas/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const {
      pergunta,
      opcao1,
      opcao2,
      opcao3,
      opcao4,
      resposta_correta,
      explicacao,
    } = req.body;
    if (
      !pergunta ||
      !opcao1 ||
      !opcao2 ||
      !opcao3 ||
      !opcao4 ||
      resposta_correta === undefined ||
      !explicacao
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    try {
      await db.run(
        "UPDATE quiz_pergunta SET Pergunta = ?, Opcao1 = ?, Opcao2 = ?, Opcao3 = ?, Opcao4 = ?, Resposta_Correta = ?, Explicacao = ? WHERE ID_Pergunta = ?",
        [
          pergunta,
          opcao1,
          opcao2,
          opcao3,
          opcao4,
          resposta_correta,
          explicacao,
          req.params.id,
        ],
      );
      res.json({ message: "Question updated successfully." });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "Failed to update question." });
    }
  },
);

// Admin: Delete a quiz question
app.delete(
  "/api/quiz/perguntas/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      await db.run("DELETE FROM quiz_pergunta WHERE ID_Pergunta = ?", [
        req.params.id,
      ]);
      res.json({ message: "Question deleted successfully." });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question." });
    }
  },
);

// Submit a quiz score
app.post("/api/quiz/score", authenticateToken, async (req, res) => {
  const { score, maxScore } = req.body;
  if (score === undefined || maxScore === undefined) {
    return res.status(400).json({ error: "Missing score data." });
  }

  try {
    await db.run(
      "INSERT INTO quiz_score (ID_Cliente, Score, Max_Score) VALUES (?, ?, ?)",
      [req.user.id, score, maxScore],
    );
    res.status(201).json({ message: "Score saved successfully." });
  } catch (error) {
    console.error("Error saving score:", error);
    res.status(500).json({ error: "Failed to save score." });
  }
});

// Get leaderboard
app.get("/api/quiz/leaderboard", async (req, res) => {
  try {
    // Get global top 5 scores
    const globalBestList = await db.all(`
      SELECT qs.Score, qs.Max_Score, c.Nome, c.Username 
      FROM quiz_score qs 
      JOIN cliente c ON qs.ID_Cliente = c.ID_Cliente 
      ORDER BY (qs.Score * 1.0 / qs.Max_Score) DESC, qs.Score DESC, qs.Data_Score ASC 
      LIMIT 5
    `);
    const globalBest = globalBestList[0] || null;

    let userBest = null;

    // Attempt to extract token manually if Authorization header is provided
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default_secret_key",
        );
        if (decoded && decoded.id) {
          userBest = await db.get(
            `
            SELECT Score, Max_Score 
            FROM quiz_score 
            WHERE ID_Cliente = ? 
            ORDER BY (Score * 1.0 / Max_Score) DESC, Score DESC 
            LIMIT 1
          `,
            [decoded.id],
          );
        }
      } catch (e) {
        // invalid token, ignore user best
      }
    }

    res.json({ globalBestList, globalBest, userBest });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard." });
  }
});

// ============================================================
// APRENDER PAGE DYNAMIC CONTENT API
// ============================================================

// Get all facts
app.get("/api/aprender/factos", async (req, res) => {
  try {
    const facts = await db.all("SELECT * FROM aprender_facto ORDER BY ID_Facto ASC");
    res.json(facts);
  } catch (error) {
    console.error("Error fetching facts:", error);
    res.status(500).json({ error: "Failed to fetch facts." });
  }
});

// Admin CRUD: Add new fact
app.post("/api/aprender/factos", authenticateToken, isAdmin, async (req, res) => {
  const { titulo, icon_frente, icon_verso, conteudo_verso } = req.body;
  if (!titulo || !icon_frente || !icon_verso || !conteudo_verso) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const result = await db.run(
      "INSERT INTO aprender_facto (Titulo, Icon_Frente, Icon_Verso, Conteudo_Verso) VALUES (?, ?, ?, ?)",
      [titulo, icon_frente, icon_verso, conteudo_verso]
    );
    res.status(201).json({ message: "Fact added successfully.", id: result.insertId });
  } catch (error) {
    console.error("Error adding fact:", error);
    res.status(500).json({ error: "Failed to add fact." });
  }
});

// Admin CRUD: Update fact
app.put("/api/aprender/factos/:id", authenticateToken, isAdmin, async (req, res) => {
  const { titulo, icon_frente, icon_verso, conteudo_verso } = req.body;
  if (!titulo || !icon_frente || !icon_verso || !conteudo_verso) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    await db.run(
      "UPDATE aprender_facto SET Titulo = ?, Icon_Frente = ?, Icon_Verso = ?, Conteudo_Verso = ? WHERE ID_Facto = ?",
      [titulo, icon_frente, icon_verso, conteudo_verso, req.params.id]
    );
    res.json({ message: "Fact updated successfully." });
  } catch (error) {
    console.error("Error updating fact:", error);
    res.status(500).json({ error: "Failed to update fact." });
  }
});

// Admin CRUD: Delete fact
app.delete("/api/aprender/factos/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.run("DELETE FROM aprender_facto WHERE ID_Facto = ?", [req.params.id]);
    res.json({ message: "Fact deleted successfully." });
  } catch (error) {
    console.error("Error deleting fact:", error);
    res.status(500).json({ error: "Failed to delete fact." });
  }
});

// Get all glossary terms
app.get("/api/aprender/glossario", async (req, res) => {
  try {
    const glossary = await db.all("SELECT * FROM aprender_glossario ORDER BY ID_Glossario ASC");
    res.json(glossary);
  } catch (error) {
    console.error("Error fetching glossary:", error);
    res.status(500).json({ error: "Failed to fetch glossary." });
  }
});

// Admin CRUD: Add new glossary term
app.post("/api/aprender/glossario", authenticateToken, isAdmin, async (req, res) => {
  const { termo, definicao, icon, categoria } = req.body;
  if (!termo || !definicao || !icon || !categoria) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const result = await db.run(
      "INSERT INTO aprender_glossario (Termo, Definicao, Icon, Categoria) VALUES (?, ?, ?, ?)",
      [termo, definicao, icon, categoria]
    );
    res.status(201).json({ message: "Glossary term added successfully.", id: result.insertId });
  } catch (error) {
    console.error("Error adding glossary term:", error);
    res.status(500).json({ error: "Failed to add glossary term." });
  }
});

// Admin CRUD: Update glossary term
app.put("/api/aprender/glossario/:id", authenticateToken, isAdmin, async (req, res) => {
  const { termo, definicao, icon, categoria } = req.body;
  if (!termo || !definicao || !icon || !categoria) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    await db.run(
      "UPDATE aprender_glossario SET Termo = ?, Definicao = ?, Icon = ?, Categoria = ? WHERE ID_Glossario = ?",
      [termo, definicao, icon, categoria, req.params.id]
    );
    res.json({ message: "Glossary term updated successfully." });
  } catch (error) {
    console.error("Error updating glossary term:", error);
    res.status(500).json({ error: "Failed to update glossary term." });
  }
});

// Admin CRUD: Delete glossary term
app.delete("/api/aprender/glossario/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.run("DELETE FROM aprender_glossario WHERE ID_Glossario = ?", [req.params.id]);
    res.json({ message: "Glossary term deleted successfully." });
  } catch (error) {
    console.error("Error deleting glossary term:", error);
    res.status(500).json({ error: "Failed to delete glossary term." });
  }
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
    if (
      error.code !== "ECONNREFUSED" &&
      error.message !== "Database pool not initialized. Call initDB() first."
    ) {
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
