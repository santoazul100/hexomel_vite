-- Seed Data for Hexomel
USE `hexomel`;

-- Clear existing data safely
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `avaliacao`;
TRUNCATE TABLE `favoritos`;
TRUNCATE TABLE `item_encomenda`;
TRUNCATE TABLE `encomenda`;
TRUNCATE TABLE `item_carrinho`;
TRUNCATE TABLE `carrinho`;
TRUNCATE TABLE `produto`;
TRUNCATE TABLE `categoria`;
TRUNCATE TABLE `origem`;
TRUNCATE TABLE `cliente`;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed Clients (Admins, Beekeepers, and regular Clients)
INSERT INTO `cliente` (`ID_Cliente`, `Nome`, `Email`, `Senha`, `UserType`, `Data_Resgistro`) VALUES
(1, 'Rodrigo Silva', 'rodrigo@hexomel.pt', '$2a$10$abcdefghijklmnopqrstuv', 'admin', '2026-01-01 10:00:00'),
(2, 'Maria Abelha', 'maria@exemplo.com', '$2a$10$abcdefghijklmnopqrstuv', 'client', '2026-01-15 11:30:00'),
(3, 'João Produtor', 'joao@mel.pt', '$2a$10$abcdefghijklmnopqrstuv', 'apicultor', '2026-02-01 09:00:00'),
(4, 'Ana Mel', 'ana@beehive.pt', '$2a$10$abcdefghijklmnopqrstuv', 'apicultor', '2026-02-10 14:20:00'),
(5, 'Carlos Favo', 'carlos@nectar.pt', '$2a$10$abcdefghijklmnopqrstuv', 'client', '2026-03-01 16:45:00'),
(6, 'Sofia Doce', 'sofia@honey.pt', '$2a$10$abcdefghijklmnopqrstuv', 'client', '2026-03-05 10:10:00'),
(7, 'Miguel Zunido', 'miguel@bee.pt', '$2a$10$abcdefghijklmnopqrstuv', 'client', '2026-03-10 12:00:00');

-- Seed Categories
INSERT INTO `categoria` (`ID_Categoria`, `Nome`) VALUES
(1, 'Méls'), (2, 'Derivados'), (3, 'Acessórios'), (4, 'Equipamento Apícola'), (5, 'Edições Limitadas');

-- Seed Origins
INSERT INTO `origem` (`ID_Origem`, `Nome`) VALUES
(1, 'Serra da Estrela'), (2, 'Alentejo'), (3, 'Trás-os-Montes'), (4, 'Ribatejo'), (5, 'Algarve');

-- Seed Products (Linked to Beekeepers: ID_Apicultor)
INSERT INTO `produto` (`ID_Produto`, `Nome`, `Preco`, `Stock`, `ID_Categoria`, `ID_Origem`, `ID_Apicultor`, `Descricao`, `Imagem`, `Tags`) VALUES
(1, 'Mel de Rosmaninho Premium', 13.50, 50, 1, 1, 3, 'Mel suave e aromático colhido nas encostas da Serra da Estrela.', '/images/wildflower.png', 'organic,premium,flower'),
(2, 'Mel de Eucalipto Puro', 12.00, 30, 1, 2, 4, 'Mel com traços balsâmicos e sabor intenso.', '/images/acacia.png', 'puro,natural,eucalipto'),
(3, 'Mel de Urze da Serra', 15.50, 40, 1, 3, 3, 'Sabor forte e persistente com notas florais profundas.', '/images/lavender.png', 'mountain,raw,wild'),
(4, 'Pólen de Abelha Natural', 8.50, 25, 2, 4, 4, 'Superalimento rico em proteínas e vitaminas.', '/images/bee.png', 'superfood,protein,natural'),
(5, 'Própolis Gotas Reais', 10.00, 20, 2, 1, 3, 'Antibiótico natural produzido pelas abelhas.', '/images/bee.png', 'health,propolis,bio'),
(6, 'Mel com Favo de Ouro', 18.00, 15, 1, 5, 4, 'Mel virgem diretamente dentro do favo de cera natural.', '/images/wildflower.png', 'favo,vintage,gold');

-- Seed Orders (encomenda)
-- Dates relative to March 12, 2026
INSERT INTO `encomenda` (`ID_Encomenda`, `ID_Cliente`, `Total`, `Status`, `Data_Encomenda`) VALUES
(1, 2, 27.00, 'Entregue', '2026-02-15 10:00:00'),
(2, 5, 24.00, 'Pago', '2026-03-01 14:30:00'),
(3, 6, 15.50, 'Enviado', '2026-03-05 09:15:00'),
(4, 7, 40.50, 'Pendente', '2026-03-10 16:45:00'),
(5, 2, 18.00, 'Entregue', '2026-03-11 11:20:00'),
(6, 5, 12.00, 'Pago', '2026-03-11 15:00:00'),
(7, 6, 45.00, 'Entregue', '2026-03-12 08:30:00');

-- Seed Order Items
INSERT INTO `item_encomenda` (`ID_Encomenda`, `ID_Produto`, `Quantidade`, `Preco_Unitario`) VALUES
(1, 1, 2, 13.50),
(2, 2, 2, 12.00),
(3, 3, 1, 15.50),
(4, 1, 1, 13.50), (4, 4, 2, 8.50), (4, 5, 1, 10.00),
(5, 6, 1, 18.00),
(6, 2, 1, 12.00),
(7, 1, 2, 13.50), (7, 6, 1, 18.00);

-- Seed Reviews
INSERT INTO `avaliacao` (`ID_Produto`, `ID_Cliente`, `Nota`, `Comentario`) VALUES
(1, 2, 5, 'O melhor mel de rosmaninho que já provei!'),
(3, 5, 5, 'Sabor muito intenso e puro.'),
(6, 6, 5, 'Adoro comer o favo, é uma experiência única.');
