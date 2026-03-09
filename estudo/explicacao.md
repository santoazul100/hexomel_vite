# Arquitetura e Estrutura do Projeto Hexomel

Este documento serve como guia e estudo para entender o funcionamento do código base do projeto **Hexomel**, uma plataforma de e-commerce focada na venda de mel, derivados e agora, equipamentos para apicultura.

## 1. Visão Global

O projeto está dividido em duas partes principais:

- **Frontend** (Interface do Utilizador): Feito em HTML, CSS (com recurso a metodologias modernas) e JavaScript (Vanilla JS sem frameworks pesados).
- **Backend** (Lógica de Servidor e API): Construído em Node.js usando o framework Express, e comunica com uma Base de Dados para gerir utilizadores, produtos, encomendas, etc.

## 2. Base de Dados (MySQL / SGBD)

O Sistema de Gestão de Bases de Dados (SGBD) utilizado é o **MySQL**.
O script de criação da base de dados encontra-se em `backend/hexomel_mysql.sql` e inclui as seguintes tabelas principais:

- `cliente`: Armazena os dados dos utilizadores. Possui o campo `UserType` que distingue clientes normais de administradores (`admin`) ou vendedores (`apicultor`).
- `categoria`: Define os tipos de produtos (`Méls`, `Derivados`, `Acessórios`, `Equipamento Apícola`).
- `produto`: Guarda a informação dos produtos (nome, preço, stock) e ligações como `ID_Categoria` e `ID_Apicultor` (para produtos específicos de um apicultor).
- Outras tabelas importantes: `carrinho`, `encomenda`, `avaliacao`, etc.

## 3. Backend (Node.js & Express)

O código central do servidor encontra-se no ficheiro `backend/server.js`.
Aqui são definidas as rotas e os conectores.

### Funcionalidades Chave:

- **Configuração da DB**: A ligação é gerida de forma abstraída (no `backend/config/db.js`), suportando um _connection pool_ em MySQL através do pacote `mysql2`.
- **Autenticação (Auth)**:
  - Os processos de registo e login verificam e inserem os utilizadores na tabela `cliente`.
  - É utilizado `bcryptjs` para encriptar as senhas e guardá-las com segurança.
  - É emitido um **JWT (JSON Web Token)** após o login bem-sucedido. Este token é providenciado ao frontend e utilizado em todas as ações subsequentes que requeiram permissões, sendo validado pelos _middlewares_ (`autenticateToken`, `isAdmin`).
- **Endpoints (API)**:
  - Estão expostas rotas para obter produtos (`GET /api/products`), criar/editar no caso de admins (`POST /api/admin/products`), processar encomendas, adicionar itens ao carrinho, entre outras.

## 4. Frontend (HTML + JavaScript)

A pasta principal de front-facing é a `frontend/`.

- **Ficheiros HTML**: As vistas são páginas estáticas (`index.html`, `shop.html`, `login.html`, `register.html`).
- **CSS (`frontend/src/styles/`)**: Gere toda a componente visual com folhas de estilos especializadas por zona.
- **JavaScript (`frontend/src/`)**:
  - Comunica com o backend via a `Fetch API`.
  - Usa o `localStorage` do browser para armazenar o JWT gerado no login, mantendo assim o estado da sessão do utilizador e enviando-o no Header de `Authorization: Bearer <token>` nas chamadas.
  - Implementa lógicas de gestão de estado (ex: `cart.js` para gerir o carrinho de compras no cliente antes de submeter a encomenda).

## 5. Fluxo de Registo de um "Apicultor"

Recentemente implementado:

1. Um utilizador visita o frontend (`register.html`) e escolhe o seu tipo de perfil na interface: _Cliente_ ou _Apicultor_.
2. O JavaScript colhe essa tag (`userType = 'apicultor'`) e envia os dados no _body_ do pedido `POST /api/auth/register`.
3. O Backend valida os dados, encripta a _password_, e guarda-o na base de dados com a role correspondente no atributo `UserType`.
4. Após entrar (login), se o utilizador for apicultor, ele terá (se assim definido na interface e API) permissões ou lógicas especiais para carregar ou gerir produtos que contenham o seu `ID_Cliente` como `ID_Apicultor` na tabela `produto`.
