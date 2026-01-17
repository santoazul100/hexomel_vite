import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Open SQLite database file
export const initDB = async () => {
  const db = await open({
    filename: path.join(__dirname, "../database.db"),
    driver: sqlite3.Database,
  });

  // Create tables if they don't exist (based on hexomel.sql)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cliente (
      ID_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
      Nome TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      Senha TEXT NOT NULL,
      Telefone INTEGER,
      Picture TEXT,
      Level INTEGER DEFAULT 1,
      Pontos INTEGER DEFAULT 0,
      XP INTEGER DEFAULT 0,
      Badges TEXT DEFAULT '[]',
      Data_Resgistro DATE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produto (
      ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT,
      Nome TEXT NOT NULL,
      Preco DECIMAL(10,2) NOT NULL,
      Stock INTEGER NOT NULL,
      ID_Categoria INTEGER
    );

    CREATE TABLE IF NOT EXISTS carrinho (
      ID_Carrinho INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Cliente INTEGER NOT NULL,
      Data_Criacao DATE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Cliente) REFERENCES cliente(ID_Cliente)
    );

    CREATE TABLE IF NOT EXISTS item_carrinho (
      ID_itemCarrinho INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Carrinho INTEGER NOT NULL,
      ID_Produto INTEGER NOT NULL,
      Quantidade INTEGER NOT NULL,
      FOREIGN KEY (ID_Carrinho) REFERENCES carrinho(ID_Carrinho),
      FOREIGN KEY (ID_Produto) REFERENCES produto(ID_Produto)
    );

    CREATE TABLE IF NOT EXISTS encomenda (
      ID_Encomenda INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Cliente INTEGER NOT NULL,
      Total DECIMAL(10,2) NOT NULL,
      Status TEXT DEFAULT 'Pendente',
      Data_Encomenda DATE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Cliente) REFERENCES cliente(ID_Cliente)
    );

    CREATE TABLE IF NOT EXISTS item_encomenda (
      ID_ItemEncomenda INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Encomenda INTEGER NOT NULL,
      ID_Produto INTEGER NOT NULL,
      Quantidade INTEGER NOT NULL,
      Preco_Unitario DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (ID_Encomenda) REFERENCES encomenda(ID_Encomenda),
      FOREIGN KEY (ID_Produto) REFERENCES produto(ID_Produto)
    );
  `);

  // Migration: Add new columns if they don't exist
  const tableInfo = await db.all("PRAGMA table_info(cliente)");
  const columns = tableInfo.map((c) => c.name);

  if (!columns.includes("Picture"))
    await db.exec("ALTER TABLE cliente ADD COLUMN Picture TEXT");
  if (!columns.includes("Level"))
    await db.exec("ALTER TABLE cliente ADD COLUMN Level INTEGER DEFAULT 1");
  if (!columns.includes("Pontos"))
    await db.exec("ALTER TABLE cliente ADD COLUMN Pontos INTEGER DEFAULT 0");
  if (!columns.includes("XP"))
    await db.exec("ALTER TABLE cliente ADD COLUMN XP INTEGER DEFAULT 0");
  if (!columns.includes("Badges"))
    await db.exec("ALTER TABLE cliente ADD COLUMN Badges TEXT DEFAULT '[]'");

  // Insert initial products if empty
  const products = await db.all("SELECT * FROM produto");
  if (products.length === 0) {
    await db.exec(`
      INSERT INTO produto (Nome, Preco, Stock, ID_Categoria) VALUES 
      ('Wildflower Honey', 12.50, 50, 1),
      ('Acacia Honey', 14.00, 30, 2),
      ('Lavender Honey', 15.50, 40, 3);
    `);
  }

  return db;
};
