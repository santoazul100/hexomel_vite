import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { authenticateToken } from "./middleware/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
let db;

// Initialize Database
initDB().then((database) => {
  db = database;
  console.log("MySQL Database connected and initialized.");
});

app.use(cors());
app.use(express.json());

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
    const [rows] = await db.execute("SELECT * FROM cliente WHERE Email = ?", [
      email,
    ]);
    if (rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const fullName = `${firstName} ${lastName}`;

    // Insert user
    await db.execute(
      "INSERT INTO cliente (Nome, Email, Senha, Telefone) VALUES (?, ?, ?, ?)",
      [fullName, email, hashedPassword, phone || 0],
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute("SELECT * FROM cliente WHERE Email = ?", [
      email,
    ]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.ID_Cliente }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        level: user.Level || 1,
        pontos: user.Pontos || 0,
        xp: user.XP || 0,
        badges: JSON.parse(user.Badges || "[]"),
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

    let [rows] = await db.execute("SELECT * FROM cliente WHERE Email = ?", [
      email,
    ]);
    let user = rows[0];
    if (!user) {
      const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
      await db.execute(
        "INSERT INTO cliente (Nome, Email, Senha, Picture) VALUES (?, ?, ?, ?)",
        [name, email, randomPass, picture],
      );
      [rows] = await db.execute("SELECT * FROM cliente WHERE Email = ?", [
        email,
      ]);
      user = rows[0];
    } else if (!user.Picture && picture) {
      // Sync picture if it was missing
      await db.run("UPDATE cliente SET Picture = ? WHERE ID_Cliente = ?", [
        picture,
        user.ID_Cliente,
      ]);
      user.Picture = picture;
    }

    const token = jwt.sign({ id: user.ID_Cliente }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        level: user.Level || 1,
        pontos: user.Pontos || 0,
        xp: user.XP || 0,
        badges: JSON.parse(user.Badges || "[]"),
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

// Example route: Get all products
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM produto");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// CART ROUTES
// Get user cart
app.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    const [cartRows] = await db.execute(
      "SELECT * FROM carrinho WHERE ID_Cliente = ?",
      [req.user.id],
    );
    const cart = cartRows[0];
    if (!cart) return res.json([]);

    const [items] = await db.execute(
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
    const [cartRows] = await db.execute(
      "SELECT * FROM carrinho WHERE ID_Cliente = ?",
      [req.user.id],
    );
    let cart = cartRows[0];
    let cartId;

    if (!cart) {
      const [result] = await db.execute(
        "INSERT INTO carrinho (ID_Cliente) VALUES (?)",
        [req.user.id],
      );
      cartId = result.insertId;
    } else {
      cartId = cart.ID_Carrinho;
    }

    // 2. Add or update item
    const [existingRows] = await db.execute(
      "SELECT * FROM item_carrinho WHERE ID_Carrinho = ? AND ID_Produto = ?",
      [cartId, productId],
    );
    const existing = existingRows[0];

    if (existing) {
      await db.execute(
        "UPDATE item_carrinho SET Quantidade = Quantidade + ? WHERE ID_itemCarrinho = ?",
        [quantity || 1, existing.ID_itemCarrinho],
      );
    } else {
      await db.execute(
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
    await db.execute(
      "UPDATE item_carrinho SET Quantidade = ? WHERE ID_itemCarrinho = ?",
      [quantity, itemId],
    );
    res.json({ message: "Cart updated" });
  } catch (error) {
    console.error("Cart update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove item from cart
app.delete("/api/cart/remove/:itemId", authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  try {
    await db.execute("DELETE FROM item_carrinho WHERE ID_itemCarrinho = ?", [
      itemId,
    ]);
    res.json({ message: "Item removed" });
  } catch (error) {
    console.error("Cart remove error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Example route: Get all clients
app.get("/api/clients", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM cliente");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Checkout
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  try {
    const [cartRows] = await db.execute(
      "SELECT * FROM carrinho WHERE ID_Cliente = ?",
      [req.user.id],
    );
    const cart = cartRows[0];
    if (!cart) return res.status(400).json({ error: "Cart is empty" });

    const [items] = await db.execute(
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

    const [orderResult] = await db.execute(
      "INSERT INTO encomenda (ID_Cliente, Total) VALUES (?, ?)",
      [req.user.id, total],
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      await db.execute(
        "INSERT INTO item_encomenda (ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario) VALUES (?, ?, ?, ?)",
        [orderId, item.ID_Produto, item.Quantidade, item.Preco],
      );
      await db.execute(
        "UPDATE produto SET Stock = Stock - ? WHERE ID_Produto = ?",
        [item.Quantidade, item.ID_Produto],
      );
    }

    await db.execute("DELETE FROM item_carrinho WHERE ID_Carrinho = ?", [
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
    const [favorites] = await db.execute(
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
    const [existingRows] = await db.execute(
      "SELECT * FROM favoritos WHERE ID_Cliente = ? AND ID_Produto = ?",
      [req.user.id, productId],
    );
    if (existingRows.length > 0) {
      return res.status(400).json({ error: "Product already in favorites" });
    }

    await db.execute(
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
      await db.execute(
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

// USER PROFILE ROUTE
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const [userRows] = await db.execute(
      "SELECT Nome, Email, Picture, Level, Pontos, XP, Badges, Data_Resgistro FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const [orders] = await db.execute(
      "SELECT * FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({
      ...user,
      badges: JSON.parse(user.Badges || "[]"),
      orders,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
