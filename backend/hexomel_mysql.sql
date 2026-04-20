-- MySQL Database Schema for Hexomel
-- Full schema with InnoDB engine, utf8mb4 charset

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Create Database
CREATE DATABASE IF NOT EXISTS `hexomel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hexomel`;

-- --------------------------------------------------------

-- Table: cliente
CREATE TABLE IF NOT EXISTS `cliente` (
  `ID_Cliente` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  `Email` varchar(120) NOT NULL,
  `Username` varchar(60) DEFAULT NULL,
  `Senha` varchar(255) NOT NULL,
  `Picture` TEXT,
  `Morada` TEXT DEFAULT NULL,
  `Telefone` varchar(30) DEFAULT NULL,
  `UserType` varchar(20) DEFAULT 'client',
  `Bio` TEXT DEFAULT NULL,
  `Data_Resgistro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Cliente`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: categoria
CREATE TABLE IF NOT EXISTS `categoria` (
  `ID_Categoria` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  PRIMARY KEY (`ID_Categoria`),
  UNIQUE KEY `Nome` (`Nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: origem
CREATE TABLE IF NOT EXISTS `origem` (
  `ID_Origem` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  PRIMARY KEY (`ID_Origem`),
  UNIQUE KEY `Nome` (`Nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: produto
CREATE TABLE IF NOT EXISTS `produto` (
  `ID_Produto` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  `Preco` decimal(10,2) NOT NULL,
  `Stock` int(30) NOT NULL,
  `ID_Categoria` int(10) DEFAULT NULL,
  `ID_Origem` int(10) DEFAULT NULL,
  `ID_Apicultor` int(10) DEFAULT NULL,
  `Descricao` TEXT,
  `Imagem` VARCHAR(255) DEFAULT NULL,
  `Tags` TEXT,
  `Status` varchar(20) DEFAULT 'Aprovado',
  PRIMARY KEY (`ID_Produto`),
  KEY `ID_Apicultor` (`ID_Apicultor`),
  KEY `ID_Origem` (`ID_Origem`),
  KEY `idx_status` (`Status`),
  CONSTRAINT `fk_produto_apicultor` FOREIGN KEY (`ID_Apicultor`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE SET NULL,
  CONSTRAINT `fk_produto_origem` FOREIGN KEY (`ID_Origem`) REFERENCES `origem` (`ID_Origem`) ON DELETE SET NULL,
  CONSTRAINT `fk_produto_categoria` FOREIGN KEY (`ID_Categoria`) REFERENCES `categoria` (`ID_Categoria`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: carrinho
CREATE TABLE IF NOT EXISTS `carrinho` (
  `ID_Carrinho` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `Data_Criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Carrinho`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_carrinho_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: item_carrinho
CREATE TABLE IF NOT EXISTS `item_carrinho` (
  `ID_itemCarrinho` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Carrinho` int(10) NOT NULL,
  `ID_Produto` int(10) NOT NULL,
  `Quantidade` int(30) NOT NULL,
  PRIMARY KEY (`ID_itemCarrinho`),
  KEY `ID_Carrinho` (`ID_Carrinho`),
  KEY `ID_Produto` (`ID_Produto`),
  CONSTRAINT `fk_itemcarrinho_carrinho` FOREIGN KEY (`ID_Carrinho`) REFERENCES `carrinho` (`ID_Carrinho`) ON DELETE CASCADE,
  CONSTRAINT `fk_itemcarrinho_produto` FOREIGN KEY (`ID_Produto`) REFERENCES `produto` (`ID_Produto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: encomenda
CREATE TABLE IF NOT EXISTS `encomenda` (
  `ID_Encomenda` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `Data_Encomenda` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `Total` decimal(10,2) NOT NULL,
  `Status` varchar(50) DEFAULT 'Pendente',
  `Morada` TEXT,
  `Telefone` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`ID_Encomenda`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_encomenda_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: item_encomenda
CREATE TABLE IF NOT EXISTS `item_encomenda` (
  `ID_ItemEncomenda` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Encomenda` int(10) NOT NULL,
  `ID_Produto` int(10) NOT NULL,
  `Quantidade` int(30) NOT NULL,
  `Preco_Unitario` decimal(10,2) NOT NULL,
  PRIMARY KEY (`ID_ItemEncomenda`),
  KEY `ID_Encomenda` (`ID_Encomenda`),
  KEY `ID_Produto` (`ID_Produto`),
  CONSTRAINT `fk_itemencomenda_encomenda` FOREIGN KEY (`ID_Encomenda`) REFERENCES `encomenda` (`ID_Encomenda`) ON DELETE CASCADE,
  CONSTRAINT `fk_itemencomenda_produto` FOREIGN KEY (`ID_Produto`) REFERENCES `produto` (`ID_Produto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: favoritos
CREATE TABLE IF NOT EXISTS `favoritos` (
  `ID_Favorito` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `ID_Produto` int(10) NOT NULL,
  PRIMARY KEY (`ID_Favorito`),
  UNIQUE KEY `unique_favorito` (`ID_Cliente`, `ID_Produto`),
  KEY `ID_Cliente` (`ID_Cliente`),
  KEY `ID_Produto` (`ID_Produto`),
  CONSTRAINT `fk_favoritos_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE,
  CONSTRAINT `fk_favoritos_produto` FOREIGN KEY (`ID_Produto`) REFERENCES `produto` (`ID_Produto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: avaliacao (reviews)
CREATE TABLE IF NOT EXISTS `avaliacao` (
  `ID_Avaliacao` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Produto` int(10) NOT NULL,
  `ID_Cliente` int(10) NOT NULL,
  `Nota` tinyint(1) NOT NULL CHECK (`Nota` >= 1 AND `Nota` <= 5),
  `Comentario` varchar(500) DEFAULT NULL,
  `Data_Avaliacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Avaliacao`),
  KEY `ID_Produto` (`ID_Produto`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_avaliacao_produto` FOREIGN KEY (`ID_Produto`) REFERENCES `produto` (`ID_Produto`) ON DELETE CASCADE,
  CONSTRAINT `fk_avaliacao_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: workshop
CREATE TABLE IF NOT EXISTS `workshop` (
  `ID_Workshop` int(10) NOT NULL AUTO_INCREMENT,
  `Titulo` varchar(150) NOT NULL,
  `Descricao` text NOT NULL,
  `Data_Realizacao` datetime NOT NULL,
  `Preco` decimal(10,2) NOT NULL,
  `Vagas` int(11) NOT NULL,
  `Imagem` varchar(255) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'Pendente',
  `ID_Apicultor` int(10) NOT NULL,
  `Data_Criacao` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`ID_Workshop`),
  KEY `ID_Apicultor` (`ID_Apicultor`),
  CONSTRAINT `fk_workshop_apicultor` FOREIGN KEY (`ID_Apicultor`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table: upgrade_requests
CREATE TABLE IF NOT EXISTS `upgrade_requests` (
  `ID_Request` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `Descricao` TEXT NOT NULL,
  `Documento` varchar(255) NOT NULL,
  `Status` varchar(20) DEFAULT 'Pendente', -- Pendente, Aprovado, Rejeitado
  `Data_Pedido` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `Data_Processamento` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`ID_Request`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_upgrade_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- --------------------------------------------------------

-- Table: interacao (Analytics & Behavioral Tracking)
CREATE TABLE IF NOT EXISTS `interacao` (
  `ID_Interacao` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) DEFAULT NULL, -- NULL if anonymous
  `Tipo` varchar(50) NOT NULL,       -- page_view, click, search, add_to_cart, etc.
  `Pagina` varchar(150) DEFAULT NULL,
  `Dados` JSON DEFAULT NULL,         -- Extra metadata (productId, searchText, etc.)
  `Data_Interacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Interacao`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_interacao_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
