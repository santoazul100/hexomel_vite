import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { authenticateToken, isAdmin } from "./middleware/auth.js";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
let db;

// Initialize Database
initDB().then((database) => {
  db = database;
  console.log("SQLite Database connected and initialized.");
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
  const { firstName, lastName, email, password, phone } = req.body;

  try {
    // Check if user exists
    const row = await db.get("SELECT * FROM cliente WHERE Email = ?", [email]);
    if (row) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const fullName = `${firstName} ${lastName}`;

    // Insert user
    const result = await db.run(
      "INSERT INTO cliente (Nome, Email, Senha) VALUES (?, ?, ?)",
      [`${firstName} ${lastName}`.trim(), email, hashedPassword],
    );

    // Auto-login: Get the new user
    const user = await db.get("SELECT * FROM cliente WHERE id = ?", [
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
        picture: user.Picture,
        role: user.UserType,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating user" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.get("SELECT * FROM cliente WHERE Email = ?", [email]);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
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
        role: user.UserType,
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
    const { email, name, picture } = payload;
    console.log("Google Login Payload:", { email, name, picture });

    let user = await db.get("SELECT * FROM cliente WHERE Email = ?", [email]);
    if (!user) {
      const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
      const result = await db.run(
        "INSERT INTO cliente (Nome, Email, Senha, Picture) VALUES (?, ?, ?, ?)",
        [name, email, randomPass, picture],
      );
      user = await db.get("SELECT * FROM cliente WHERE id = ?", [
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
        role: user.UserType,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

// Get all products (Public view)
app.get("/api/products", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM produto ORDER BY ID_Produto DESC");
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
    const { nome, preco, stock, idCategoria, descricao, imagem, tags } =
      req.body;
    try {
      const result = await db.run(
        "INSERT INTO produto (Nome, Preco, Stock, ID_Categoria, Descricao, Imagem, Tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [nome, preco, stock, idCategoria, descricao, imagem, tags],
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
    const { nome, preco, stock, idCategoria, descricao, imagem, tags } =
      req.body;
    try {
      await db.run(
        "UPDATE produto SET Nome = ?, Preco = ?, Stock = ?, ID_Categoria = ?, Descricao = ?, Imagem = ?, Tags = ? WHERE ID_Produto = ?",
        [nome, preco, stock, idCategoria, descricao, imagem, tags, id],
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
      `SELECT ic.*, p.Nome, p.Preco, p.Stock 
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

// Create reusable transporter object using the default SMTP transport
// For development, we use Ethereal.email
let transporter;

async function initMailer() {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();

  // Create transporter object using the default SMTP transport
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  console.log("Mailer initialized with Ethereal:", testAccount.user);
}
initMailer().catch(console.error);

// Checkout Route
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  try {
    // 1. Get Cart
    const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
      req.user.id,
    ]);
    if (!cart) return res.status(400).json({ error: "Cart not found" });

    const items = await db.all(
      `SELECT ic.*, p.Nome, p.Preco 
       FROM item_carrinho ic 
       JOIN produto p ON ic.ID_Produto = p.ID_Produto 
       WHERE ic.ID_Carrinho = ?`,
      [cart.ID_Carrinho],
    );

    if (items.length === 0)
      return res.status(400).json({ error: "Cart is empty" });

    // 2. Calculate Total
    const total = items.reduce(
      (sum, item) => sum + item.Preco * item.Quantidade,
      0,
    );

    // 3. Create Order
    const result = await db.run(
      "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status) VALUES (?, ?, ?, 'Pago')",
      [req.user.id, new Date().toISOString(), total],
    );
    const orderId = result.lastID;

    // 4. Move items to Order Items (if a table existed, but we'll simplified transaction)
    // In a real app we would have item_encomenda. For now we just track the order.

    // 5. Clear Cart
    await db.run("DELETE FROM item_carrinho WHERE ID_Carrinho = ?", [
      cart.ID_Carrinho,
    ]);

    // 6. Send Email
    const user = await db.get(
      "SELECT Email, Nome FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (transporter) {
      const info = await transporter.sendMail({
        from: '"Hexomel 🐝" <loja@hexomel.pt>', // sender address
        to: user.Email, // list of receivers
        subject: `Confirmação de Encomenda #${orderId}`, // Subject line
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #f4b400;">Obrigado pela sua encomenda, ${user.Nome}!</h1>
            <p>A sua encomenda <strong>#${orderId}</strong> foi confirmada.</p>
            <h3>Resumo:</h3>
            <ul>
              ${items.map((i) => `<li>${i.Nome} x${i.Quantidade} - ${(i.Preco * i.Quantidade).toFixed(2)}€</li>`).join("")}
            </ul>
            <p><strong>Total: ${total.toFixed(2)}€</strong></p>
            <p>Obrigado por escolher o Hexomel!</p>
          </div>
        `,
      });
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    res.json({ message: "Checkout successful", orderId });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Checkout failed" });
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

// Checkout
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  try {
    const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
      req.user.id,
    ]);
    if (!cart) return res.status(400).json({ error: "Cart is empty" });

    const items = await db.all(
      `SELECT ic.*, p.Preco FROM item_carrinho ic 
       JOIN produto p ON ic.ID_Produto = p.ID_Produto 
       WHERE ic.ID_Carrinho = ?`,
      [cart.ID_Carrinho],
    );

    if (items.length === 0)
      return res.status(400).json({ error: "Cart is empty" });

    const total = items.reduce(
      (sum, item) => sum + item.Preco * item.Quantidade,
      0,
    );

    const orderResult = await db.run(
      "INSERT INTO encomenda (ID_Cliente, Total) VALUES (?, ?)",
      [req.user.id, total],
    );
    const orderId = orderResult.lastID;

    for (const item of items) {
      await db.run(
        "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
        [orderId, item.ID_Produto, item.Quantidade, item.Preco],
      );
      await db.run(
        "UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?",
        [item.Quantidade, item.ID_Produto],
      );
    }

    await db.run("DELETE FROM item_carrinho WHERE ID_Carrinho = ?", [
      cart.ID_Carrinho,
    ]);
    res.json({ message: "Order placed successfully!", orderId });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: "Checkout failed" });
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
      "SELECT ID_Cliente, Nome, Email, Telefone, Picture, Data_Resgistro, UserType FROM cliente WHERE ID_Cliente = ?",
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
      picture: user.Picture,
      role: user.UserType,
      dateRegistered: user.Data_Resgistro,
      orders,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    // Basic validation
    if (!name || !email) {
      return res.status(400).json({ error: "Name and Email are required" });
    }

    // Check if email is already taken by another user
    const existing = await db.all(
      "SELECT ID_Cliente FROM cliente WHERE Email = ? AND ID_Cliente != ?",
      [email, req.user.id],
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    await db.run(
      "UPDATE cliente SET Nome = ?, Email = ?, Telefone = ? WHERE ID_Cliente = ?",
      [name, email, phone || null, req.user.id],
    );

    res.json({ message: "Profile updated successfully" });
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
    // Note: ON DELETE CASCADE in schema handles related tables (cart, favorites, etc.)
    await db.run("DELETE FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
