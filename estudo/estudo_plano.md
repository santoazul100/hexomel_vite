# Plano de Estudo e Documentação

## 1. Tecnologias Utilizadas
- **Frontend**: Vite + Vanilla JavaScript (ES6+), Vanilla CSS (Design System centralizado em `modern.css`)
- **Backend**: Node.js + Express
- **Base de Dados**: MySQL (Driver `mysql2`) gerida via **MySQL Workbench**
- **Segurança**: JWT, bcryptjs, Google Auth (OAuth 2.0)

## 2. Gestão de Dados
O sistema utiliza uma base de dados MySQL para armazenar toda a informação do site.

### Por que não usamos SQLite ou phpMyAdmin?
- **MySQL vs SQLite**: O MySQL foi escolhido pela sua robustez, suporte a chaves estrangeiras complexas e melhor tratamento de acessos concorrentes.
- **MySQL Workbench**: É a ferramenta padrão para gerir a base de dados. Evitamos o uso do WAMP/phpMyAdmin para manter o ambiente de desenvolvimento mais limpo e profissional, utilizando o Workbench para modelação e execução de queries SQL.

## 3. Estrutura da Base de Dados
Tabelas principais:
- `cliente`: Armazena utilizadores (Clientes, Apicultores, Admins).
- `produto`: Catálogo de mel e derivados.
- `encomenda`: Registos de compras.
- `categoria`: Categorização dos produtos.
- `workshop`: Eventos organizados por apicultores.

## 4. Localização dos Dados
- **Dados Estruturados**: MySQL (`hexomel`)
- **Imagens/Ficheiros**: `frontend/public/uploads/` (o caminho é guardado no MySQL)
- **Estilos Premium**: `frontend/src/styles/modern.css` (centraliza a identidade visual)

## 5. Skeleton Loaders (Placeholders de Carregamento)
O projeto implementa um sistema de **skeleton loaders** — placeholders animados que aparecem enquanto os dados carregam da API, melhorando a experiência do utilizador.

### O que são?
São "silhuetas" do conteúdo final (blocos cinzentos com animação shimmer) que indicam ao utilizador que a página está a carregar, em vez de mostrar uma página em branco.

### Ficheiros criados:
- `frontend/src/styles/skeleton.css` — Estilos e animações (shimmer, pulse, fade-in)
- `frontend/src/skeleton.js` — Módulo JS com componentes reutilizáveis

### Componentes disponíveis:
| Componente | Uso |
|---|---|
| `Skeleton.productGrid(n)` | Grelha de n cards de produto |
| `Skeleton.communityList(n)` | Lista de n posts da comunidade |
| `Skeleton.genericGrid(n)` | Grelha genérica (workshops, etc.) |
| `Skeleton.stateError(msg, id)` | Estado de erro com botão retry |
| `Skeleton.stateEmpty(msg, icon)` | Estado sem resultados |

### Páginas integradas:
- **Loja** (`shop.js`) — produtos
- **Comunidade** (`comunidade.js`) — perguntas Q&A
- **Workshops** (`workshops.js`) — cards de workshops
- **Apicultor** (`apicultor.js`) — produtos e workshops do apicultor

> 📖 Documentação completa: ver `estudo/SKELETON_LOADERS_ESTUDO.md`

## 6. Sistema de Tradução (i18n — Internacionalização)
O projeto implementa um sistema de **tradução PT ↔ EN** que permite ao utilizador alternar entre Português e Inglês em todas as páginas públicas do site.

### O que é i18n?
i18n (abreviação de "internationalization", 18 letras entre o "i" e o "n") é o processo de preparar um software para suportar múltiplos idiomas sem alterar o código-fonte.

### Como funciona?
O sistema utiliza **atributos HTML `data-i18n`** para marcar elementos traduzíveis. Um módulo JavaScript centralizado contém o dicionário de traduções e aplica-as dinamicamente.

#### Fluxo:
1. O utilizador clica no botão 🇵🇹/🇬🇧 na navbar
2. O JS percorre todos os elementos com `data-i18n="chave"` 
3. Substitui o `textContent` com a tradução correspondente
4. A escolha é guardada em `localStorage('hexomel-lang')`
5. Ao recarregar, o idioma guardado é aplicado automaticamente

### Ficheiros criados:
- `frontend/src/i18n.js` — Módulo JS com dicionário de ~200 chaves PT/EN e lógica de tradução
- `frontend/src/styles/i18n.css` — Estilos do botão de troca de idioma

### Tipos de atributos:
| Atributo | Uso | Exemplo |
|---|---|---|
| `data-i18n="chave"` | Traduz o `textContent` | `<h1 data-i18n="home.title">` |
| `data-i18n-ph="chave"` | Traduz o `placeholder` | `<input data-i18n-ph="shop.search">` |
| `data-i18n-html="chave"` | Traduz o `innerHTML` (preserva ícones) | `<a data-i18n-html="about.title">` |

### Páginas traduzidas:
- Todas as páginas públicas: index, shop, about, contact, workshops, curiosidades, aprender, comunidade
- A navbar e o footer são traduzidos globalmente em todas as páginas
- Páginas internas (admin, profile, dashboard) **não** são traduzidas

> 📖 Documentação técnica completa: ver `estudo/DOCUMENTACAO_I18N.md`

## 7. Notas Importantes
- O código do backend utiliza um adaptador no ficheiro `db.js` para facilitar a manipulação do MySQL, mantendo uma sintaxe simples e eficiente.
- Todas as passwords são encriptadas antes de serem guardadas.
