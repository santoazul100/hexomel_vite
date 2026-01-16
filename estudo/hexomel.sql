-- phpMyAdmin SQL Dump
-- version 4.7.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: 06-Jan-2026 às 08:37
-- Versão do servidor: 5.7.19
-- PHP Version: 7.0.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hexomel`
--

-- --------------------------------------------------------

--
-- Estrutura da tabela `avaliacao`
--

DROP TABLE IF EXISTS `avaliacao`;
CREATE TABLE IF NOT EXISTS `avaliacao` (
  `ID_Avaliacao` int(10) NOT NULL,
  `ID_Produto` int(10) NOT NULL,
  `ID_Cliente` int(10) NOT NULL,
  `Nota` varchar(120) NOT NULL,
  `Cometario` varchar(120) NOT NULL,
  `Data_Avaliacao` date NOT NULL,
  PRIMARY KEY (`ID_Avaliacao`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `carrinho`
--

DROP TABLE IF EXISTS `carrinho`;
CREATE TABLE IF NOT EXISTS `carrinho` (
  `ID_Carrinho` int(10) NOT NULL,
  `ID_Cliente` int(10) NOT NULL,
  `Data_Criacao` date NOT NULL,
  PRIMARY KEY (`ID_Carrinho`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `cliente`
--

DROP TABLE IF EXISTS `cliente`;
CREATE TABLE IF NOT EXISTS `cliente` (
  `ID_Cliente` int(10) NOT NULL,
  `Nome` varchar(120) NOT NULL,
  `Email` varchar(120) NOT NULL,
  `Senha` varchar(255) NOT NULL,
  `Telefone` int(9) NOT NULL,
  `Data_Resgistro` date NOT NULL,
  PRIMARY KEY (`ID_Cliente`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `encomenda`
--

DROP TABLE IF EXISTS `encomenda`;
CREATE TABLE IF NOT EXISTS `encomenda` (
  `ID_Encomeda` int(10) NOT NULL,
  `ID_Cliente` int(10) NOT NULL,
  `Data_Encomenda` date NOT NULL,
  `Valor_Total` decimal(10,0) NOT NULL,
  `Estado` varchar(50) NOT NULL,
  PRIMARY KEY (`ID_Encomeda`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `item_carrinho`
--

DROP TABLE IF EXISTS `item_carrinho`;
CREATE TABLE IF NOT EXISTS `item_carrinho` (
  `ID_itemCarrinho` int(10) NOT NULL,
  `ID_Carrinho` int(10) NOT NULL,
  `ID_Produto` int(10) NOT NULL,
  `Quantidade` int(30) NOT NULL,
  PRIMARY KEY (`ID_itemCarrinho`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `item_encomenda`
--

DROP TABLE IF EXISTS `item_encomenda`;
CREATE TABLE IF NOT EXISTS `item_encomenda` (
  `ID_itemEncomenda` int(10) NOT NULL,
  `ID_Encomenda` int(10) NOT NULL,
  `ID_Produto` int(10) NOT NULL,
  `Quantidade` int(30) NOT NULL,
  PRIMARY KEY (`ID_itemEncomenda`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `morada`
--

DROP TABLE IF EXISTS `morada`;
CREATE TABLE IF NOT EXISTS `morada` (
  `ID_Morada` int(10) NOT NULL,
  `ID_Cliente` int(10) NOT NULL,
  `morada` varchar(120) NOT NULL,
  PRIMARY KEY (`ID_Morada`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estrutura da tabela `produto`
--

DROP TABLE IF EXISTS `produto`;
CREATE TABLE IF NOT EXISTS `produto` (
  `ID_Produto` int(10) NOT NULL,
  `Nome` varchar(120) NOT NULL,
  `Preco` decimal(10,2) NOT NULL,
  `Stock` int(30) NOT NULL,
  `ID_Categoria` int(10) NOT NULL,
  PRIMARY KEY (`ID_Produto`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
