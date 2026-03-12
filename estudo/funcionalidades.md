# Funcionalidades do Hexomel

Este documento detalha todas as funcionalidades implementadas no projeto Hexomel, abrangendo as capacidades dos utilizadores, a gestão administrativa e os metadados dos produtos.

---

## 🍯 1. Funcionalidades Gerais do Site

- **Loja Interativa**: Catálogo de produtos com sistema de filtragem e pesquisa.
- **Carrinho de Compras**: Gestão persistente de produtos através de `localStorage` e integração com a base de dados.
- **BeeAnimator**: Sistema de animação procedimental de abelhas que interagem com o rato (Efeito Parallax Inverso).
- **Design System Premium**: Interface minimalista com paleta "Golden & White" e tipografia sofisticada.
- **Autenticação**: Sistema de login e registo seguro, incluindo suporte para **Google OAuth**.

---

## 👥 2. Papéis de Utilizador e Permissões

### 👤 Cliente (Visitor/Client)
- **Navegação**: Consulta de produtos, apicultores e workshops.
- **Perfil**: Gestão de dados pessoais, biografia e foto de perfil.
- **Carrinho e Favoritos**: Adicionar produtos ao carrinho ou à lista de desejos.
- **Encomendas**: Realizar compras e consultar o histórico/estado das encomendas.
- **Avaliações**: Deixar comentários e notas (1-5 estrelas) nos produtos adquiridos.

### 🐝 Apicultor (Apicultor)
*Inclui todas as permissões de Cliente, acrescidas de:*
- **Gestão de Produtos**: Criar e editar os seus próprios produtos de mel.
- **Workshops**: Criar e gerir workshops (título, descrição, data, preço, vagas).
- **Bio Profissional**: Espaço dedicado para apresentar a sua história e métodos de produção.

### 🛡️ Administrador (Admin)
*Acesso total ao Painel Administrativo (`admin.html`):*
- **Dashboard de Métricas**: Visualização de faturação total e volume de vendas.
- **Gestão de Categorias**: Criar, editar e eliminar categorias de produtos.
- **Gestão de Origens**: Gerir as localizações geográficas dos méis.
- **Controlo de Utilizadores**: Promover utilizadores a Admin/Apicultor ou remover contas.
- **Gestão de Produtos e Stock**: Supervisão total de todo o catálogo do site.
- **Gestão de Encomendas**: Alterar o estado das encomendas (Pendente, Enviado, Concluído, etc.).

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

---

## 💻 4. Arquitetura Técnica (Resumo)

- **Backend**: Node.js com Express e JWT para autenticação.
- **Base de Dados**: MySQL (Relacional) com tabelas para clientes, produtos, categorias, origens, encomendas, favoritos e avaliações.
- **Frontend**: Vanilla JS (Vite) focado em performance e animações fluidas.
