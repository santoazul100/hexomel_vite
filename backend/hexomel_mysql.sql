-- MySQL Database Schema for Hexomel
-- Optimized version with InnoDB engine and AUTO_INCREMENT

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Create Database
DROP DATABASE IF EXISTS `hexomel`;
CREATE DATABASE `hexomel` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hexomel`;

-- --------------------------------------------------------

-- Table structure for table `cliente`
DROP TABLE IF EXISTS `cliente`;
CREATE TABLE `cliente` (
  `ID_Cliente` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  `Email` varchar(120) NOT NULL,
  `Senha` varchar(255) NOT NULL,
  `Telefone` int(9) DEFAULT NULL,
  `Picture` TEXT,
  `Data_Resgistro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Cliente`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `produto`
DROP TABLE IF EXISTS `produto`;
CREATE TABLE `produto` (
  `ID_Produto` int(10) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(120) NOT NULL,
  `Preco` decimal(10,2) NOT NULL,
  `Stock` int(30) NOT NULL,
  `ID_Categoria` int(10) DEFAULT NULL,
  `Descricao` TEXT,
  `Imagem` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`ID_Produto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert demo products
INSERT INTO `produto` (`Nome`, `Preco`, `Stock`, `ID_Categoria`, `Descricao`) VALUES
('Mel de Rosmaninho Premium', 13.50, 50, 1, 'Mel suave e aromático colhido nas encostas da Serra da Estrela. Ideal para o pequeno-almoço.'),
('Mel de Eucalipto Puro', 12.00, 30, 1, 'Mel com traços balsâmicos e sabor intenso. Excelente para as vias respiratórias.'),
('Mel de Urze da Serra', 15.50, 40, 1, 'Sabor forte e persistente com notas florais profundas. Um clássico da apicultura portuguesa.'),
('Pólen de Abelha Natural', 8.50, 25, 2, 'Superalimento rico em proteínas e vitaminas. Reforce o seu sistema imunitário.'),
('Própolis Gotas Reais', 10.00, 20, 2, 'Antibiótico natural produzido pelas abelhas. Proteção pura para o seu dia-a-dia.'),
('Mel com Favo de Ouro', 18.00, 15, 1, 'A experiência mais pura: mel virgem diretamente dentro do favo de cera natural.'),
('Mel de Castanheiro Intenso', 14.50, 35, 1, 'Mel escuro e pouco doce, com um toque amadeirado. Perfeito para acompanhar queijos.'),
('Wildflower Blossom', 11.00, 60, 1, 'Uma mistura vibrante de pólens e néctares de flores silvestres. Doçura equilibrada.');

-- --------------------------------------------------------

-- Table structure for table `carrinho`
DROP TABLE IF EXISTS `carrinho`;
CREATE TABLE `carrinho` (
  `ID_Carrinho` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `Data_Criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Carrinho`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_carrinho_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `item_carrinho`
DROP TABLE IF EXISTS `item_carrinho`;
CREATE TABLE `item_carrinho` (
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

-- Table structure for table `encomenda`
DROP TABLE IF EXISTS `encomenda`;
CREATE TABLE `encomenda` (
  `ID_Encomenda` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `Data_Encomenda` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `Total` decimal(10,2) NOT NULL,
  `Status` varchar(50) DEFAULT 'Pendente',
  PRIMARY KEY (`ID_Encomenda`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_encomenda_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `item_encomenda`
DROP TABLE IF EXISTS `item_encomenda`;
CREATE TABLE `item_encomenda` (
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

-- Table structure for table `morada`
DROP TABLE IF EXISTS `morada`;
CREATE TABLE `morada` (
  `ID_Morada` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Cliente` int(10) NOT NULL,
  `Morada` varchar(120) NOT NULL,
  PRIMARY KEY (`ID_Morada`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_morada_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `avaliacao`
DROP TABLE IF EXISTS `avaliacao`;
CREATE TABLE `avaliacao` (
  `ID_Avaliacao` int(10) NOT NULL AUTO_INCREMENT,
  `ID_Produto` int(10) NOT NULL,
  `ID_Cliente` int(10) NOT NULL,
  `Nota` int(1) NOT NULL CHECK (`Nota` >= 1 AND `Nota` <= 5),
  `Comentario` varchar(500) DEFAULT NULL,
  `Data_Avaliacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Avaliacao`),
  KEY `ID_Produto` (`ID_Produto`),
  KEY `ID_Cliente` (`ID_Cliente`),
  CONSTRAINT `fk_avaliacao_produto` FOREIGN KEY (`ID_Produto`) REFERENCES `produto` (`ID_Produto`) ON DELETE CASCADE,
  CONSTRAINT `fk_avaliacao_cliente` FOREIGN KEY (`ID_Cliente`) REFERENCES `cliente` (`ID_Cliente`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `favoritos`
DROP TABLE IF EXISTS `favoritos`;
CREATE TABLE `favoritos` (
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

COMMIT;
