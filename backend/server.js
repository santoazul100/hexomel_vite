import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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
      console.log("Auto-migrations completed.");
    } catch (err) {
      console.log("Migration warning:", err);
    }

    // Start Server ONLY after DB is ready
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
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
  const { firstName, lastName, email, password, phone, userType } = req.body;

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
    const definedUserType = userType === "apicultor" ? "apicultor" : "client";

    // Insert user
    const result = await db.run(
      "INSERT INTO cliente (Nome, Email, Senha, UserType) VALUES (?, ?, ?, ?)",
      [
        `${firstName} ${lastName}`.trim(),
        email,
        hashedPassword,
        definedUserType,
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
  // Accept either `identifier` (new) or legacy `email` field
  const identifier = req.body.identifier || req.body.email;
  const { password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/username e password são obrigatórios" });
  }

  try {
    // Try to find user by email
    let user = await db.get("SELECT * FROM cliente WHERE Email = ?", [identifier]);
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
        role: user.UserType || user.usertype || "client",
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
        role: user.UserType || user.usertype || "client",
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
      "INSERT INTO workshop (Titulo, Descricao, Data_Realizacao, Preco, Vagas, Imagem, ID_Apicultor) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [titulo, descricao, data_realizacao, preco, vagas, imagem, req.user.id],
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
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

app.get("/api/workshops", async (req, res) => {
  try {
    const workshops = await db.all(
      "SELECT w.*, c.Nome as ApicultorNome FROM workshop w JOIN cliente c ON w.ID_Apicultor = c.ID_Cliente ORDER BY w.Data_Realizacao ASC",
    );
    res.json(workshops);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

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
  } else {
    // Fallback to ethereal.email if no credentials are provided
    let testAccount = await nodemailer.createTestAccount();
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
  }
}
initMailer().catch(console.error);

// Checkout Route
app.post("/api/cart/checkout", authenticateToken, async (req, res) => {
  const { address, phone, nome, apelido } = req.body;
  const fullName = [nome, apelido].filter(Boolean).join(" ").trim();

  try {
    // 1. Get Cart
    const cart = await db.get("SELECT * FROM carrinho WHERE ID_Cliente = ?", [
      req.user.id,
    ]);
    if (!cart) return res.status(400).json({ error: "Carrinho vazio" });

    const items = await db.all(
      `SELECT ic.*, p.Nome, p.Preco 
       FROM item_carrinho ic 
       JOIN produto p ON ic.ID_Produto = p.ID_Produto 
       WHERE ic.ID_Carrinho = ?`,
      [cart.ID_Carrinho],
    );

    if (items.length === 0)
      return res.status(400).json({ error: "Carrinho vazio" });

    // 2. Calculate Total
    const total = items.reduce(
      (sum, item) => sum + item.Preco * item.Quantidade,
      0,
    );

    // 3. Create Order
    const result = await db.run(
      "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone) VALUES (?, ?, ?, 'Pendente', ?, ?)",
      [req.user.id, new Date().toISOString(), total, address, phone],
    );

    // 3b. Sync to Profile (Update user name, address, phone if provided)
    if (fullName || address || phone) {
      await db.run(
        "UPDATE cliente SET Nome = COALESCE(?, Nome), Morada = COALESCE(?, Morada), Telefone = COALESCE(?, Telefone) WHERE ID_Cliente = ?",
        [fullName || null, address, phone, req.user.id],
      );
    }

    const orderId = result.lastID;

    // 4. Move items to Order Items e update Stock
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

    // 5. Clear Cart
    await db.run("DELETE FROM item_carrinho WHERE ID_Carrinho = ?", [
      cart.ID_Carrinho,
    ]);

    // 6. Send Email
    const user = await db.get(
      "SELECT Email, Nome FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );

    if (transporter && user && user.Email) {
      const emailContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background: #f4b400; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Hexomel 🐝</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Obrigado pela sua encomenda, ${user.Nome}!</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6;">A sua encomenda <strong>#${orderId}</strong> foi confirmada e está a ser processada pela nossa colmeia.</p>
            
            <h3 style="border-bottom: 2px solid #f4b400; padding-bottom: 10px; margin-top: 30px;">Resumo da Encomenda</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="text-align: left; background: #fafafa;">
                  <th style="padding: 12px; border-bottom: 1px solid #eee;">Produto</th>
                  <th style="padding: 12px; border-bottom: 1px solid #eee;">Qtd</th>
                  <th style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (i) => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${i.Nome}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">${i.Quantidade}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${(i.Preco * i.Quantidade).toFixed(2)}€</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 20px 12px; font-weight: bold; font-size: 18px;">Total</td>
                  <td style="padding: 20px 12px; font-weight: bold; font-size: 18px; text-align: right; color: #f4b400;">${total.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            <div style="background: #fff9e6; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Informações de Entrega</h4>
              <p style="margin: 0; font-size: 14px;"><strong>Morada:</strong> ${address || "Não fornecida"}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Telefone:</strong> ${phone || "Não fornecido"}</p>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
              Se tiver alguma dúvida, responda a este email ou contacte-nos através do nosso site.
            </p>
          </div>
          <div style="background: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 12px; color: #999;">Hexomel - Produtos Apícolas de Qualidade Superior</p>
          </div>
        </div>
      `;

      // User Email
      transporter
        .sendMail({
          from: '"Hexomel 🐝" <loja@hexomel.pt>',
          to: user.Email,
          subject: `Confirmação de Encomenda #${orderId} - Hexomel`,
          html: emailContent,
        })
        .then((info) => {
          console.log("Customer email sent: %s", info.messageId);
          console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        })
        .catch((err) => console.error("Customer email failed:", err));

      // Admin Email Notification
      transporter
        .sendMail({
          from: '"Hexomel System" <system@hexomel.pt>',
          to: "admin@hexomel.pt", // In a real app, this would be a config variable
          subject: `Nova Encomenda Recebida! #${orderId}`,
          html: `
          <h1>Nova Encomenda #${orderId}</h1>
          <p><strong>Cliente:</strong> ${user.Nome} (${user.Email})</p>
          <p><strong>Total:</strong> ${total.toFixed(2)}€</p>
          <p><strong>Morada:</strong> ${address}</p>
          <p><strong>Telefone:</strong> ${phone}</p>
          <hr>
          <p>Ver detalhes no painel de administração.</p>
        `,
        })
        .catch((err) => console.error("Admin notification failed:", err));
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

app.put("/api/user/profile", authenticateToken, async (req, res) => {
  const { name, email, phone, address } = req.body;
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
      "UPDATE cliente SET Nome = ?, Email = ?, Telefone = ?, Morada = ? WHERE ID_Cliente = ?",
      [name, email, phone || null, address || null, req.user.id],
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
