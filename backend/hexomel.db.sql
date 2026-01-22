-- SQLite Database Schema for Hexomel

-- Clients Table
CREATE TABLE IF NOT EXISTS cliente (
  ID_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome TEXT NOT NULL,
  Email TEXT NOT NULL UNIQUE,
  Senha TEXT NOT NULL,
  Telefone INTEGER,
  Picture TEXT,
  UserType TEXT DEFAULT 'client',
  Data_Resgistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS produto (
  ID_Produto INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome TEXT NOT NULL,
  Preco DECIMAL(10,2) NOT NULL,
  Stock INTEGER NOT NULL,
  ID_Categoria INTEGER,
  Descricao TEXT,
  Imagem TEXT,
  Tags TEXT
);

-- Cart Table
CREATE TABLE IF NOT EXISTS carrinho (
  ID_Carrinho INTEGER PRIMARY KEY AUTOINCREMENT,
  ID_Cliente INTEGER NOT NULL,
  Data_Criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS item_carrinho (
  ID_itemCarrinho INTEGER PRIMARY KEY AUTOINCREMENT,
  ID_Carrinho INTEGER NOT NULL,
  ID_Produto INTEGER NOT NULL,
  Quantidade INTEGER NOT NULL,
  FOREIGN KEY (ID_Carrinho) REFERENCES carrinho (ID_Carrinho) ON DELETE CASCADE,
  FOREIGN KEY (ID_Produto) REFERENCES produto (ID_Produto) ON DELETE CASCADE
);

-- Orders Table
CREATE TABLE IF NOT EXISTS encomenda (
  ID_Encomenda INTEGER PRIMARY KEY AUTOINCREMENT,
  ID_Cliente INTEGER NOT NULL,
  Data_Encomenda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Total DECIMAL(10,2) NOT NULL,
  Status TEXT DEFAULT 'Pendente',
  FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS item_encomenda (
  ID_ItemEncomenda INTEGER PRIMARY KEY AUTOINCREMENT,
  ID_Encomenda INTEGER NOT NULL,
  ID_Produto INTEGER NOT NULL,
  Quantidade INTEGER NOT NULL,
  Preco_Unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (ID_Encomenda) REFERENCES encomenda (ID_Encomenda) ON DELETE CASCADE,
  FOREIGN KEY (ID_Produto) REFERENCES produto (ID_Produto) ON DELETE CASCADE
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS favoritos (
  ID_Favorito INTEGER PRIMARY KEY AUTOINCREMENT,
  ID_Cliente INTEGER NOT NULL,
  ID_Produto INTEGER NOT NULL,
  UNIQUE(ID_Cliente, ID_Produto),
  FOREIGN KEY (ID_Cliente) REFERENCES cliente (ID_Cliente) ON DELETE CASCADE,
  FOREIGN KEY (ID_Produto) REFERENCES produto (ID_Produto) ON DELETE CASCADE
);

-- Initial Products
INSERT OR IGNORE INTO produto (Nome, Preco, Stock, ID_Categoria, Descricao, Imagem) VALUES
('Mel de Rosmaninho Premium', 13.50, 50, 1, 'Mel suave e aromático colhido nas encostas da Serra da Estrela.', '/images/wildflower.png'),
('Mel de Eucalipto Puro', 12.00, 30, 1, 'Mel com traços balsâmicos e sabor intenso.', '/images/acacia.png'),
('Mel de Urze da Serra', 15.50, 40, 1, 'Sabor forte e persistente com notas florais profundas.', '/images/lavender.png'),
('Pólen de Abelha Natural', 8.50, 25, 2, 'Superalimento rico em proteínas e vitaminas.', '/images/bee.png'),
('Própolis Gotas Reais', 10.00, 20, 2, 'Antibiótico natural produzido pelas abelhas.', '/images/bee.png'),
('Mel com Favo de Ouro', 18.00, 15, 1, 'Mel virgem diretamente dentro do favo de cera natural.', '/images/wildflower.png'),
('Mel de Castanheiro Intenso', 14.50, 35, 1, 'Mel escuro e pouco doce, com um toque amadeirado.', '/images/acacia.png'),
('Wildflower Blossom', 11.00, 60, 1, 'Uma mistura vibrante de pólens e néctares.', '/images/wildflower.png');
