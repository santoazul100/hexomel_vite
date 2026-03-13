# Funcionalidades do Hexomel

Este documento detalha todas as funcionalidades implementadas no projeto Hexomel, abrangendo as capacidades dos utilizadores, a gestão administrativa e os metadados dos produtos.

---

## 🍯 1. Funcionalidades Gerais do Site

- **Premium Filter System**: Catálogo com filtros dinâmicos por categorias, origens, vendedores e preço (range dinâmico).
- **Carrinho de Compras**: Gestão persistente de produtos através de `localStorage` e integração com a base de dados.
- **BeeAnimator**: Sistema de animação procedimental de abelhas que interagem com o rato (Efeito Parallax Inverso).
- **Design System Premium**: Interface minimalista com paleta "Golden & White", tipografia sofisticada e sistema de estilos centralizado (`modern.css`).
- **Autenticação**: Sistema de login e registo seguro, incluindo suporte para **Google OAuth**.

---

## 👥 2. Papéis de Utilizador e Permissões

### 👤 Cliente (Visitor/Client)
- **Navegação**: Consulta de produtos, apicultores e workshops.
- **Perfil**: Gestão de dados pessoais, biografia e foto de perfil.
- **Carrinho e Favoritos**: Adicionar produtos ao carrinho ou à lista de desejos.
- **Encomendas**: Realizar compras e consultar o histórico/estado das encomendas.
- **Avaliações**: Sistema de feedback com comentários e notas (1-5 estrelas) em produtos comprados.
- **Histórico de Encomendas**: Visualização do estado e detalhes de compras passadas.
- **Pedido de Upgrade**: Possibilidade de solicitar o estatuto de Administrador enviando descrição e documento comprovativo.

### 🐝 Apicultor (Apicultor)
*Inclui todas as permissões de Cliente, acrescidas de:*
- **Gestão de Produtos**: Registo de produtos via interface premium (2 colunas) com:
    - **Image Preview**: Visualização imediata da foto antes do upload.
    - **Tag Management**: Sistema intuitivo de etiquetas (Novo, Artesanal, etc.).
    - **Dynamic Origins**: Seleção da origem geográfica do produto.
- **Workshops**: Criar e gerir workshops (título, descrição, data, preço, vagas).
- **Bio Profissional**: Espaço dedicado para apresentar a sua história e métodos de produção.

### 🛡️ Administrador (Admin)
*Acesso total ao Painel Administrativo (`admin.html`):*
- **Dashboard de Analítica**: Gráficos dinâmicos (Chart.js) para receita de 30 dias, distribuição por categoria, pedidos por status, produtos top-venda, vendas por apicultor e crescimento de utilizadores.
- **KPIs em Tempo Real**: Faturação total e Valor Médio de Encomenda (AOV).
- **Gestão de Categorias e Origens**: Controlo total sobre a organização do catálogo.
- **Controlo de Utilizadores**: Promover utilizadores (Admin/Apicultor) ou remover contas.
- **Gestão de Encomendas**: Interface visual premium com badges de estado e botões de ação estilizados.
- **Gestão de Upgrades**: Painel de análise de documentos com sistema de aprovação/rejeição instantânea.

---

## 🗂️ 3. Metadados e Organização

### Categorias (Exemplos)
*Sistema dinâmico onde o admin pode adicionar qualquer tipo:*
- Mel de Urze
- Mel de Eucalipto
- Mel de Rosmaninho
- Mel Multifloral

### Origens (Exemplos)
*Rastreabilidade geográfica do produto:*
- Serra da Estrela
- Alentejo Central
- Trás-os-Montes
- Algarve (Serra do Caldeirão)
- Açores (Mel de Incenso)

### Tags (Categorização Extra)
- Novo / Artesanal / Premium / Destaque / Pronto a Enviar

---

## 💻 4. Arquitetura Técnica (Resumo)

- **Backend**: Node.js com Express e JWT para autenticação.
- **Base de Dados**: MySQL (Relacional) com tabelas para clientes, produtos, categorias, origens, encomendas, favoritos, avaliações e pedidos de upgrade.
- **Frontend**: Vanilla JS (Vite) focado em performance e animações fluidas.
