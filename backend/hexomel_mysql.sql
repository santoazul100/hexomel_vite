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
  `Senha` varchar(255) NOT NULL,
  `Telefone` varchar(20) DEFAULT NULL,
  `Picture` TEXT,
  `UserType` varchar(20) DEFAULT 'client',
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

INSERT IGNORE INTO `categoria` (`ID_Categoria`, `Nome`) VALUES
(1, 'Méls'),
(2, 'Derivados'),
(3, 'Acessórios');

-- --------------------------------------------------------

-- Table: produto
CREATE TABLE IF NOT EXISTS `produto` (
  `ID_Produto` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  `Preco` decimal(10,2) NOT NULL,
  `Stock` int(30) NOT NULL,
  `ID_Categoria` int(10) DEFAULT NULL,
  `Descricao` TEXT,
  `Imagem` VARCHAR(255) DEFAULT NULL,
  `Tags` TEXT,
  PRIMARY KEY (`ID_Produto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `produto` (`Nome`, `Preco`, `Stock`, `ID_Categoria`, `Descricao`, `Imagem`) VALUES
('Mel de Rosmaninho Premium', 13.50, 50, 1, 'Mel suave e aromático colhido nas encostas da Serra da Estrela.', '/images/wildflower.png'),
('Mel de Eucalipto Puro', 12.00, 30, 1, 'Mel com traços balsâmicos e sabor intenso.', '/images/acacia.png'),
('Mel de Urze da Serra', 15.50, 40, 1, 'Sabor forte e persistente com notas florais profundas.', '/images/lavender.png'),
('Pólen de Abelha Natural', 8.50, 25, 2, 'Superalimento rico em proteínas e vitaminas.', '/images/bee.png'),
('Própolis Gotas Reais', 10.00, 20, 2, 'Antibiótico natural produzido pelas abelhas.', '/images/bee.png'),
('Mel com Favo de Ouro', 18.00, 15, 1, 'Mel virgem diretamente dentro do favo de cera natural.', '/images/wildflower.png'),
('Mel de Castanheiro Intenso', 14.50, 35, 1, 'Mel escuro e pouco doce, com um toque amadeirado.', '/images/acacia.png'),
('Wildflower Blossom', 11.00, 60, 1, 'Uma mistura vibrante de pólens e néctares.', '/images/wildflower.png');

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
