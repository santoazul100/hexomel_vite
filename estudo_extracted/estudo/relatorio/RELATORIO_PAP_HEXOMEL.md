# Relatório de Prova de Aptidão Profissional (PAP)
## Hexomel — Plataforma de E-commerce de Mel Português

---

> **Aluno:** Rodrigo Silva  
> **Curso:** Técnico de Gestão e Programação de Sistemas Informáticos  
> **Ano Letivo:** 2025 / 2026  
> **Data:** Maio de 2026  

---

## Índice

1. [Introdução e Motivação](#1-introdução-e-motivação)
2. [Visão Geral do Projeto](#2-visão-geral-do-projeto)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Tecnologias Utilizadas](#4-tecnologias-utilizadas)
5. [Base de Dados — Evolução e Comparação](#5-base-de-dados--evolução-e-comparação)
6. [Funcionalidades Implementadas](#6-funcionalidades-implementadas)
7. [Sistema de Checkout e Pagamentos](#7-sistema-de-checkout-e-pagamentos)
8. [Segurança e Autenticação](#8-segurança-e-autenticação)
9. [Interface e Experiência do Utilizador](#9-interface-e-experiência-do-utilizador)
10. [Comunidade Q&A](#10-comunidade-qa)
11. [Sistema de Analytics](#11-sistema-de-analytics)
12. [Responsividade](#12-responsividade)
13. [Referências e Webgrafia](#13-referências-e-webgrafia)

---

## 1. Introdução e Motivação

O presente relatório documenta o desenvolvimento do projeto **Hexomel**, uma plataforma de comércio eletrónico dedicada à venda de mel português artesanal, criada no âmbito da Prova de Aptidão Profissional (PAP).

A ideia surgiu da necessidade de criar uma solução digital moderna e profissional para os produtores de mel (apicultores) em Portugal, permitindo-lhes comercializar os seus produtos de forma direta e transparente ao consumidor final.

A apicultura é uma atividade ancestral com grande tradição em Portugal. Contudo, muitos apicultores ainda não possuem presença digital adequada. O Hexomel pretende resolver essa lacuna, criando uma ponte digital entre produtores e consumidores com uma experiência de utilizador de excelência.

### Objetivos do Projeto

- Desenvolver uma plataforma web completa e funcional do zero;
- Aplicar conhecimentos de programação web (HTML, CSS, JavaScript, Node.js, MySQL);
- Implementar boas práticas de segurança informática (JWT, bcrypt, 2FA);
- Criar uma experiência de utilizador (UX) de qualidade profissional;
- Demonstrar capacidade de gestão e modelação de bases de dados relacionais.

---

## 2. Visão Geral do Projeto

O **Hexomel** é uma plataforma de e-commerce desenvolvida com foco em **performance**, **design minimalista** e **interatividade dinâmica**. O projeto apresenta três tipos de utilizadores com permissões diferenciadas:

| Perfil | Descrição | Acesso Principal |
|--------|-----------|-----------------|
| 👤 **Cliente** | Comprador registado | Loja, perfil, encomendas, favoritos |
| 🐝 **Apicultor** | Produtor parceiro | Dashboard de vendas, produtos, workshops |
| 🛡️ **Administrador** | Gestor da plataforma | CMS completo, analytics, gestão global |

### Páginas Públicas do Site

| Página | Descrição |
|--------|-----------|
| **Homepage** | Apresentação da marca, produtos em destaque |
| **Loja** | Catálogo com filtros avançados por categoria, origem e preço |
| **Sobre Nós** | História e valores da marca |
| **Curiosidades** | Visualização 3D de tipos de mel com Three.js |
| **Workshops** | Eventos presenciais organizados pelos apicultores |
| **Comunidade** | Fórum Q&A entre clientes e apicultores |
| **Contacto** | Formulário de contacto |

---

## 3. Arquitetura do Sistema

O Hexomel segue uma arquitetura de **três camadas** (Three-Tier Architecture), separando claramente a camada de apresentação, a lógica de negócio e os dados.

![Arquitetura do Sistema Hexomel](./assets_relatorio/arquitetura_sistema.png)

### Comunicação Entre Camadas

O frontend comunica com o backend através de uma **API RESTful** utilizando o protocolo HTTP/HTTPS. A autenticação é feita por **tokens JWT** (JSON Web Tokens), garantindo que cada pedido ao servidor é verificado de forma segura e stateless.

```
[Browser/Frontend]
        ↕  Fetch API (JSON)
[Backend Node.js/Express — API REST]
        ↕  mysql2 Driver
[Base de Dados MySQL]
```

### SPA Híbrida com View Transitions API

Em vez de utilizar um framework pesado como React ou Vue, o Hexomel implementa uma **arquitetura SPA Híbrida nativa**:

- `View Transitions API` (`<meta name="view-transition" content="same-origin">`) para transições suaves entre páginas;
- `pre-load.js` com sistema de cache para eliminar flickering (cintilação) na navegação;
- Resultado: uma experiência de navegação fluida sem dependências de frameworks externos.

---

## 4. Tecnologias Utilizadas

### Stack Tecnológico Completo

| Camada | Tecnologia | Versão | Função |
|--------|------------|--------|--------|
| **Frontend** | HTML5 | — | Estrutura das páginas |
| **Frontend** | CSS3 / Vanilla CSS | — | Estilização (design system em `modern.css`) |
| **Frontend** | JavaScript ES6+ | — | Lógica do lado do cliente |
| **Frontend** | Vite | 5.x | Bundler e servidor de desenvolvimento |
| **Frontend** | Chart.js | 4.x | Gráficos interativos no dashboard |
| **Frontend** | Three.js | r165 | Visualização 3D do mel na página Curiosidades |
| **Frontend** | SweetAlert2 | 11.x | Caixas de diálogo interativas |
| **Backend** | Node.js | 18+ | Servidor e lógica de negócio |
| **Backend** | Express.js | 4.x | Framework para API REST |
| **Backend** | mysql2 | — | Driver de ligação ao MySQL |
| **Backend** | JWT (jsonwebtoken) | — | Autenticação segura |
| **Backend** | bcryptjs | — | Hashing de passwords |
| **Backend** | Multer | — | Upload de ficheiros (imagens) |
| **Backend** | Nodemailer | — | Envio de emails (SMTP) |
| **Backend** | Stripe SDK | — | Integração de pagamentos |
| **Base de Dados** | MySQL 8.0 | 8.0 | SGBD relacional |
| **BD - Gestão** | MySQL Workbench | 8.0 | Modelação e administração da BD |
| **Externo** | Google OAuth 2.0 | — | Login social com Google |
| **Externo** | Stripe | — | Processamento de pagamentos online |
| **Externo** | Gmail SMTP | — | Envio de emails transacionais |
| **Externo** | Ngrok | — | Túnel seguro para testes com Stripe |

### Justificação das Escolhas Tecnológicas

**Porquê Vanilla JavaScript e não React/Vue?**
A escolha de JavaScript puro foi intencional: demonstra um conhecimento profundo dos fundamentos da linguagem sem depender de abstrações. O resultado é um bundle mais leve e um desempenho superior.

**Porquê MySQL e não SQLite?**
O MySQL com motor InnoDB suporta transações ACID, chaves estrangeiras complexas e acessos concorrentes, sendo o mais indicado para uma plataforma de e-commerce real.

**Porquê MySQL Workbench e não phpMyAdmin/WAMP?**
O Workbench é a ferramenta padrão da indústria para gestão MySQL, permitindo modelação visual, execução de queries e administração profissional sem depender de pilhas de software adicionais.

---

## 5. Base de Dados — Evolução e Comparação

Esta secção apresenta a evolução da base de dados ao longo do desenvolvimento do projeto, comparando a estrutura inicial (versão de protótipo) com a estrutura final e completa implementada.

### 5.1 Visão Geral da Evolução

| Aspeto | Versão Inicial (v1.0) | Versão Final (v2.0) |
|--------|-----------------------|----------------------|
| **Nº de Tabelas** | 5 | 15 |
| **Relações (FK)** | 3 | 18 |
| **Motor** | InnoDB | InnoDB |
| **Charset** | utf8 | utf8mb4 (suporta emojis) |
| **Gestão de stock** | Não | Sim (campo `Stock`) |
| **Sistema de avaliações** | Não | Sim |
| **Carrinho persistente (BD)** | Não | Sim |
| **Favoritos** | Não | Sim |
| **Analytics comportamental** | Não | Sim |
| **Comunidade Q&A** | Não | Sim |
| **Pedidos de upgrade** | Não | Sim |
| **Rastreabilidade geográfica** | Não | Sim (tabela `origem`) |
| **Histórico de preços unitários** | Não | Sim (`item_encomenda`) |

---

### 5.2 Versão Inicial da Base de Dados (v1.0)

Na fase inicial de prototipagem, a base de dados era simples e focada apenas nas funcionalidades essenciais de um e-commerce básico.

![Diagrama da Base de Dados — Versão Inicial](./assets_relatorio/db_schema_old.png)

#### Tabelas da Versão Inicial

| Tabela | Campos Principais | Função |
|--------|-------------------|--------|
| `cliente` | ID, Nome, Email, Senha, UserType | Utilizadores do sistema |
| `produto` | ID, Nome, Preco, ID_Apicultor | Catálogo de produtos |
| `encomenda` | ID, ID_Cliente, Total, Status | Registo de compras |
| `categoria` | ID, Nome | Classificação de produtos |
| `workshop` | ID, Titulo, Data, Vagas | Eventos dos apicultores |

#### Limitações da Versão Inicial

- ❌ A tabela `encomenda` não registava os produtos individuais de cada compra;
- ❌ Não havia rastreabilidade geográfica dos produtos (origem);
- ❌ O carrinho não era persistido na base de dados (apenas `localStorage`);
- ❌ Não havia sistema de avaliações ou favoritos;
- ❌ Charset `utf8` não suportava caracteres especiais e emojis;
- ❌ Faltavam índices de performance nas colunas mais consultadas;
- ❌ Nenhum sistema de analytics ou monitorização de comportamento.

---

### 5.3 Versão Final da Base de Dados (v2.0)

A versão final representa um esquema relacional robusto e completo, resultado de múltiplas iterações e migrações incrementais durante o desenvolvimento.

![Diagrama da Base de Dados — Versão Final](./assets_relatorio/db_schema_new.png)

#### Tabelas da Versão Final — Descrição Detalhada

| Tabela | Campos Chave | Função | Nova? |
|--------|-------------|--------|-------|
| `cliente` | ID, Nome, Email, Username, Senha, Picture, Morada, Telefone, UserType, Bio | Gestão completa de utilizadores (Cliente, Apicultor, Admin) | 🔄 Melhorada |
| `categoria` | ID, Nome | Classificação de produtos (Urze, Eucalipto, etc.) | 🔄 Melhorada |
| `origem` | ID, Nome | Rastreabilidade geográfica (Serra da Estrela, Alentejo…) | 🆕 Nova |
| `produto` | ID, Nome, Preco, Stock, ID_Categoria, ID_Origem, ID_Apicultor, Descricao, Imagem, Tags, Status | Catálogo completo com metadados ricos | 🔄 Melhorada |
| `carrinho` | ID, ID_Cliente, Data_Criacao | Carrinho persistente associado ao utilizador | 🆕 Nova |
| `item_carrinho` | ID, ID_Carrinho, ID_Produto, Quantidade | Itens dentro de um carrinho | 🆕 Nova |
| `encomenda` | ID, ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone | Cabeçalho de cada venda | 🔄 Melhorada |
| `item_encomenda` | ID, ID_Encomenda, ID_Produto, Quantidade, Preco_Unitario | Linha de detalhe de cada encomenda com preço histórico | 🆕 Nova |
| `favoritos` | ID, ID_Cliente, ID_Produto | Lista de desejos por utilizador | 🆕 Nova |
| `avaliacao` | ID, ID_Produto, ID_Cliente, Nota (1-5), Comentario | Sistema de reviews com estrelas | 🆕 Nova |
| `workshop` | ID, Titulo, Descricao, Data, Preco, Vagas, Imagem, Status, ID_Apicultor | Eventos com gestão de vagas e aprovação | 🔄 Melhorada |
| `upgrade_requests` | ID, ID_Cliente, Descricao, Documento, Status, Data_Pedido | Pedidos de promoção a Apicultor com documentos | 🆕 Nova |
| `interacao` | ID, ID_Cliente, Tipo, Pagina, Dados (JSON), Data_Interacao | Registo analítico comportamental (page views, cliques, etc.) | 🆕 Nova |
| `pergunta_comunidade` | ID, ID_Cliente, Texto, Votos, Data_Criacao | Perguntas do fórum Q&A | 🆕 Nova |
| `resposta_comunidade` | ID, ID_Pergunta, ID_Cliente, Texto, Votos, Melhor_Resposta | Respostas do fórum, com flag de melhor resposta | 🆕 Nova |

---

### 5.4 Comparação Técnica Detalhada: Tabela `cliente`

A tabela `cliente` foi a que sofreu maior evolução, passando de um registo simples para um perfil de utilizador completo.

| Campo | v1.0 (Inicial) | v2.0 (Final) | Descrição da Alteração |
|-------|----------------|--------------|------------------------|
| `ID_Cliente` | ✅ INT PK | ✅ INT PK | Sem alteração |
| `Nome` | ✅ VARCHAR(100) | ✅ VARCHAR(120) | Tamanho aumentado |
| `Email` | ✅ VARCHAR(100) UNIQUE | ✅ VARCHAR(120) UNIQUE | Tamanho aumentado |
| `Senha` | ✅ VARCHAR(255) | ✅ VARCHAR(255) | Sem alteração (bcrypt) |
| `UserType` | ✅ VARCHAR(20) | ✅ VARCHAR(20) DEFAULT 'client' | Adicionado default |
| `Username` | ❌ Não existia | 🆕 VARCHAR(60) | Login por identificador |
| `Picture` | ❌ Não existia | 🆕 TEXT | Avatar (base64 ou URL) |
| `Morada` | ❌ Não existia | 🆕 TEXT | Auto-preenchimento no checkout |
| `Telefone` | ❌ Não existia | 🆕 VARCHAR(30) | Auto-preenchimento no checkout |
| `Bio` | ❌ Não existia | 🆕 TEXT | Apresentação pessoal |
| `Data_Registro` | ❌ Não existia | 🆕 TIMESTAMP | Registo automático da data |

---

### 5.5 Comparação Técnica Detalhada: Tabela `encomenda`

| Campo | v1.0 (Inicial) | v2.0 (Final) | Descrição da Alteração |
|-------|----------------|--------------|------------------------|
| `ID_Encomenda` | ✅ INT PK | ✅ INT PK | Sem alteração |
| `ID_Cliente` | ✅ INT FK | ✅ INT FK + CASCADE | Adicionado ON DELETE CASCADE |
| `Total` | ✅ DECIMAL(10,2) | ✅ DECIMAL(10,2) | Sem alteração |
| `Status` | ✅ VARCHAR(20) | ✅ VARCHAR(50) DEFAULT 'Pendente' | Mais estados possíveis |
| `Data_Encomenda` | ❌ Não existia | 🆕 TIMESTAMP | Registo automático |
| `Morada` | ❌ Não existia | 🆕 TEXT | Morada de entrega |
| `Telefone` | ❌ Não existia | 🆕 VARCHAR(30) | Contacto de entrega |
| `item_encomenda` | ❌ Não existia | 🆕 Tabela separada | Histórico de produtos e preços |

> **Nota técnica:** A tabela `item_encomenda` resolve um problema crítico da v1.0: se o preço de um produto fosse alterado depois de uma compra, o histórico financeiro ficava corrompido. Na v2.0, o campo `Preco_Unitario` regista o preço exato no momento da compra.

---

### 5.6 Novas Tabelas da v2.0: Justificação

#### Tabela `interacao` — Analytics Comportamental
```sql
CREATE TABLE interacao (
  ID_Interacao INT AUTO_INCREMENT PRIMARY KEY,
  ID_Cliente   INT DEFAULT NULL,  -- NULL se anónimo
  Tipo         VARCHAR(50) NOT NULL,  -- 'page_view', 'add_to_cart', etc.
  Pagina       VARCHAR(150),
  Dados        JSON DEFAULT NULL,    -- Metadados flexíveis
  Data_Interacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
Esta tabela é única no projeto: utiliza o tipo de dados **JSON nativo do MySQL 8.0** para guardar metadados variáveis (ex: `{"productId": 5, "searchText": "mel urze"}`), sem necessidade de colunas fixas para cada tipo de evento.

#### Tabela `upgrade_requests` — Fluxo de Aprovação
Implementa um fluxo de negócio completo: um cliente comum pode submeter documentos comprovativos da sua atividade apícola, e o administrador aprova ou rejeita o pedido. O campo `Documento` guarda o caminho do ficheiro PDF ou imagem enviado.

#### Tabelas `pergunta_comunidade` + `resposta_comunidade` — Fórum Q&A
Adicionadas através de **migração automática** (`add_community_tables.js`), demonstrando uma arquitetura de base de dados evolutiva e versionada. A flag `Melhor_Resposta` (BOOLEAN) permite ao autor da pergunta destacar a resposta definitiva, semelhante ao Stack Overflow.

---

### 5.7 Diagrama de Relações (Chaves Estrangeiras) — v2.0

```
cliente ─────┬──── produto (ID_Apicultor)
             ├──── encomenda (ID_Cliente)
             ├──── carrinho (ID_Cliente)
             ├──── favoritos (ID_Cliente)
             ├──── avaliacao (ID_Cliente)
             ├──── workshop (ID_Apicultor)
             ├──── upgrade_requests (ID_Cliente)
             ├──── interacao (ID_Cliente)
             ├──── pergunta_comunidade (ID_Cliente)
             └──── resposta_comunidade (ID_Cliente)

produto ─────┬──── item_carrinho (ID_Produto)
             ├──── item_encomenda (ID_Produto)
             ├──── favoritos (ID_Produto)
             ├──── avaliacao (ID_Produto)
             ├──── categoria (ID_Categoria)
             └──── origem (ID_Origem)

encomenda ───└──── item_encomenda (ID_Encomenda)
carrinho ────└──── item_carrinho (ID_Carrinho)
pergunta ────└──── resposta_comunidade (ID_Pergunta)
```

Todas as chaves estrangeiras utilizam `ON DELETE CASCADE`, garantindo integridade referencial: ao eliminar um cliente, todos os seus dados associados são removidos automaticamente.

---

## 6. Funcionalidades Implementadas

### 6.1 Funcionalidades do Cliente

| Funcionalidade | Descrição | Tecnologia |
|----------------|-----------|------------|
| **Registo e Login** | Sistema seguro com bcrypt + JWT | Node.js, MySQL |
| **Login Google** | Autenticação via OAuth 2.0 | Google Identity |
| **Perfil Personalizado** | Avatar, biografia, morada, password | Multer, MySQL |
| **Loja com Filtros** | Filtros por categoria, origem, preço, apicultor | Fetch API, MySQL |
| **Carrinho Persistente** | Sincronizado entre localStorage e BD | MySQL, JS |
| **Lista de Favoritos** | Produtos guardados para mais tarde | MySQL |
| **Checkout em 2 Passos** | Morada → Pagamento | Stripe, JS |
| **Verificação 2FA** | Código OTP por email antes do pagamento | Nodemailer |
| **Histórico de Encomendas** | Com estados visuais e recibo em PDF | MySQL, HTML |
| **Pedido de Upgrade** | Submissão de documentos para ser Apicultor | Multer, MySQL |

### 6.2 Funcionalidades do Apicultor

| Funcionalidade | Descrição |
|----------------|-----------|
| **Dashboard Próprio** | Métricas de vendas, produtos e workshops |
| **Gestão de Produtos** | Adicionar/editar mel com preview de imagem e tags |
| **Criação de Workshops** | Eventos com vagas, datas e preços |
| **Sistema de Reservas** | Gestão de inscrições em workshops |
| **Bio Profissional** | Página de apresentação da quinta |

### 6.3 Funcionalidades do Administrador

| Funcionalidade | Descrição |
|----------------|-----------|
| **Dashboard Analítico** | 6 gráficos Chart.js com dados reais |
| **KPIs em Tempo Real** | Faturação, AOV, utilizadores, interações |
| **Moderação Global** | Editar/eliminar qualquer produto, utilizador ou conteúdo |
| **Aprovação de Apicultores** | Document Viewer integrado para PDF/Imagem |
| **Gestão de Categorias** | Criação e eliminação de categorias e origens |
| **Analytics Comportamental** | Funil de conversão e eventos de utilizador |

---

## 7. Sistema de Checkout e Pagamentos

O processo de checkout foi desenhado para ser **seguro**, **intuitivo** e **resiliente a erros**.

### Fluxo de Compra

```
1. Utilizador adiciona produtos ao Carrinho
        ↓
2. Clica em "Finalizar Compra"
        ↓
3. Sistema verifica sessão 2FA (OTP via Email)
        ↓
4. Etapa 1: Preenche dados de envio (Morada, Telefone)
        ↓
5. Etapa 2: Escolhe método de pagamento (Cartão/MB Way)
        ↓
6. Clica "Pagar" → Carrinho é esvaziado atomicamente (DB + Local)
        ↓
7. Redireciona para Stripe Checkout (Cartão) ou instrução MB Way
        ↓
8. Stripe confirma pagamento → Estado muda para "Pago"
        ↓
9. Email de confirmação enviado com recibo HTML
```

### Integração com Stripe

O backend implementa deteção inteligente do ambiente:

| Ambiente | Comportamento |
|----------|--------------|
| **Desenvolvimento (localhost)** | Usa Ngrok tunnel para expor imagens ao Stripe |
| **Sem túnel público** | Dynamic Image Mocking com placeholders Unsplash temáticos |
| **Produção** | URL público direto com imagens reais |

---

## 8. Segurança e Autenticação

### Camadas de Segurança Implementadas

| Camada | Tecnologia | Descrição |
|--------|------------|-----------|
| **Hashing de Passwords** | bcryptjs (salt rounds: 10) | Passwords nunca guardadas em texto claro |
| **Autenticação Stateless** | JWT (tokens com expiração) | Token validado em cada pedido à API |
| **Autorização por Perfil** | Middleware Express | Rotas protegidas por `role` (client/apicultor/admin) |
| **2FA no Checkout** | OTP por email (Nodemailer) | Código único e temporizado para confirmar compra |
| **Login Social** | Google OAuth 2.0 | Delegação de autenticação a serviço confiável |
| **Sanitização de Inputs** | Escape HTML no frontend | Prevenção de ataques XSS na comunidade Q&A |
| **Moderação de Conteúdo** | API PurgoMalum + dicionário local | Filtragem automática de linguagem imprópria |

### Proteção das Rotas API

Todas as rotas sensíveis verificam o token JWT via middleware antes de executar qualquer operação na base de dados:

```javascript
// Exemplo de middleware de proteção
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = decoded;
    next();
  });
};
```

---

## 9. Interface e Experiência do Utilizador

### Design System — `modern.css`

Todo o projeto utiliza um sistema de design centralizado em `modern.css`, garantindo consistência visual em todas as páginas. O design baseia-se numa paleta **Golden & White** com acentos em verde floresta.

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--primary` | `#c8a04a` (Dourado) | Botões principais, destaques |
| `--bg-dark` | `#1a1a2e` | Fundo principal (dark mode) |
| `--text-light` | `#f0ebe1` | Texto sobre fundo escuro |
| `--accent-green` | `#2d5a27` | Verde floresta para badges de apicultor |

### Funcionalidades de UX

#### BeeAnimator
Sistema de animação procedural que gera abelhas dinâmicas na interface. Utiliza matemática trigonométrica para simular voo realista com **efeito parallax** — as abelhas reagem ao movimento do rato do utilizador.

#### Skeleton Loaders
Em vez de spinners tradicionais, o projeto implementa **skeleton loaders**: silhuetas animadas do conteúdo que aparecem enquanto os dados carregam da API.

| Componente Skeleton | Página Utilizada |
|--------------------|-----------------|
| `Skeleton.productGrid(n)` | Loja de produtos |
| `Skeleton.communityList(n)` | Comunidade Q&A |
| `Skeleton.genericGrid(n)` | Workshops |
| `Skeleton.stateError(msg)` | Qualquer página com erro |
| `Skeleton.stateEmpty(msg)` | Qualquer página sem resultados |

A animação **shimmer** (brilho que percorre da esquerda para a direita) cria a sensação de movimento e indica ao utilizador que o carregamento está em progresso:

```css
@keyframes skeleton-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

#### Visualização 3D do Mel (Three.js)
A página de Curiosidades apresenta um frasco de mel renderizado em 3D com materiais físicos realistas (`MeshPhysicalMaterial`). Um slider permite alternar entre 5 tipos de mel:

| Tipo de Mel | Cor | Transparência |
|-------------|-----|---------------|
| Alfazema | Amarelo pálido | Alta (cristalina) |
| Laranjeira | Âmbar claro | Média-alta |
| Multiflora | Âmbar dourado | Média |
| Eucalipto | Âmbar escuro | Média-baixa |
| Urze | Castanho escuro | Baixa (quase opaco) |

#### Sistema de Tradução (i18n)
O projeto suporta **português e inglês** em todas as páginas públicas, através de um sistema de internacionalização personalizado:

```
[Botão 🇵🇹/🇬🇧] → JS percorre elementos data-i18n → Substitui texto → Guarda em localStorage
```

---

## 10. Comunidade Q&A

O sistema de comunidade foi inspirado em plataformas como o Stack Overflow e o Reddit, permitindo a interação entre clientes e apicultores.

### Estrutura do Fórum

- Clientes submetem **perguntas**;
- Apicultores e outros clientes respondem;
- Sistema de **upvotes** para perguntas e respostas;
- Flag **"Melhor Resposta"** para destacar a solução definitiva;
- **Moderação automática** com API PurgoMalum + fallback local;
- **Eliminação segura**: apenas o autor ou um admin pode eliminar conteúdo.

### Destaque Visual para Apicultores

As respostas de apicultores são visualmente diferenciadas com:
- Fundo com classe CSS `qa-answer-beekeeper`;
- Badge **"Apicultor Verificado"** com cores da marca;
- Prioridade de exibição no topo das respostas.

---

## 11. Sistema de Analytics

O dashboard de administração integra um sistema completo de analytics com dados reais da base de dados.

### KPIs em Tempo Real

| Indicador | Descrição |
|-----------|-----------|
| **Faturação Total** | Soma de todas as encomendas pagas |
| **AOV** | Average Order Value (valor médio por encomenda) |
| **Total de Utilizadores** | Clientes + Apicultores registados |
| **Interações Globais** | Eventos registados na tabela `interacao` |

### Gráficos Chart.js

| Gráfico | Tipo | Dados |
|---------|------|-------|
| Receita 30 dias | Linha | Faturação diária |
| Distribuição por Categoria | Donut | Vendas por tipo de mel |
| Estado das Encomendas | Barras | Pendente / Pago / Enviado |
| Crescimento de Utilizadores | Linha | Novos utilizadores por mês (12 meses) |
| Top Produtos | Barras horizontais | Produtos por receita gerada |
| Performance de Parceiros | Barras | Vendas por apicultor |

---

## 12. Responsividade

Em maio de 2026, foi realizada uma atualização global de responsividade para garantir uma experiência consistente em todos os dispositivos.

### Breakpoints Suportados

| Largura | Dispositivo |
|---------|-------------|
| 320px | Smartphones pequenos (iPhone SE) |
| 375px | Smartphones standard |
| 768px | Tablets |
| 1024px | Portáteis |
| 1440px | Desktops largos |

### Componentes Melhorados

| Componente | Melhoria Aplicada |
|------------|------------------|
| **Navbar** | Collapse estável e legível em mobile |
| **Sidebar Admin** | Toggle sensível ao viewport; fecha ao mudar de secção |
| **Checkout** | Substituição de grelhas fixas por classes CSS responsivas |
| **Perfil** | Eliminação de larguras máximas fixas em mobile |
| **Gráficos** | Alturas seguras em resoluções pequenas |
| **Heroes** | Redução de espaço vazio excessivo em mobile |

---

## 13. Referências e Webgrafia

### Referências Bibliográficas

1. von Frisch, K. (1967). *The Dance Language and Orientation of Bees*. Harvard University Press.
2. Mandal, M. D., & Mandal, S. (2011). Honey: its medicinal property and antibacterial activity. *Asian Pacific Journal of Tropical Biomedicine*, 1(2), 154–160.
3. Al-Waili, N. S. (2004). Natural honey lowers plasma glucose, C-reactive protein, homocysteine, and blood lipids. *Journal of Medicinal Food*, 7(1), 100–107.
4. FAO (2018). *Why bees matter*. Food and Agriculture Organization of the United Nations.

### Webgrafia Técnica

| # | Recurso | URL | Tipo |
|---|---------|-----|------|
| 1 | MDN Web Docs | https://developer.mozilla.org | Documentação oficial Web |
| 2 | Node.js Docs | https://nodejs.org/docs | Documentação backend |
| 3 | Express.js | https://expressjs.com | Framework backend |
| 4 | MySQL Docs | https://dev.mysql.com/doc | Documentação BD |
| 5 | Chart.js | https://www.chartjs.org | Biblioteca gráficos |
| 6 | Three.js | https://threejs.org | Motor 3D |
| 7 | Stripe Docs | https://stripe.com/docs | Integração pagamentos |
| 8 | JWT.io | https://jwt.io | JSON Web Tokens |
| 9 | SweetAlert2 | https://sweetalert2.github.io | Biblioteca modais |
| 10 | Vite.js | https://vitejs.dev | Bundler frontend |
| 11 | Google Identity | https://developers.google.com/identity | OAuth 2.0 |
| 12 | FNAP | https://fnap.pt | Federação Nacional Apicultores PT |
| 13 | National Geographic | https://nationalgeographic.com | Curiosidades científicas |
| 14 | Nodemailer | https://nodemailer.com | Envio de emails |
| 15 | PurgoMalum API | https://www.purgomalum.com | Moderação de conteúdo |

---

*Relatório elaborado para a Prova de Aptidão Profissional — Hexomel | Ano Letivo 2025/2026*
