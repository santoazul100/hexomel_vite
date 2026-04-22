# Funcionalidades do Hexomel (Status: Atualizado Abr/2026)

Este documento detalha todas as funcionalidades implementadas no projeto Hexomel, abrangendo as capacidades dos utilizadores, a gestão administrativa e os metadados dos produtos.

---

## 🍯 1. Funcionalidades Gerais do Site

- **✅ BeeAnimator (Premium UX)**: Sistema de animação procedimental de abelhas. Utiliza matemática trigonométrica para simular voo dinâmico com **Efeito Parallax Inverso** (interação com o rato).
- **✅ Design System Premium**: Interface minimalista com a paleta "Golden & White". Focado em Vanilla CSS (moderno) com tipografia sofisticada e componentes reutilizáveis.
- **✅ Premium Filter System**: Catálogo com filtros dinâmicos cruzados por categorias, origens geográficas, vendedores e preço.
- **✅ Native SPA Experience (View Transitions API)**: Implementação de arquitetura nativa avançada para navegação sem "flickers" visuais. As páginas trocam entre si com um *smooth cross-fade* e injeção síncrona do estado de autenticação (Pre-load Cache), providenciando uma experiência Premium ao estilo App mobile em ambiente Vanilla JS.
- **✅ Carrinho de Compras**: Gestão persistente de produtos através de `localStorage` com sincronização automática e lógica de stock em tempo real.
- **✅ Autenticação Multi-fator**: Sistema de login/registo seguro com hashing (bcrypt), tokens JWT e integração Nativa com **Google OAuth**.
- **✅ Segurança 2FA de Checkout**: Proteção obrigatória para concluir encomendas. Exige a verificação da sessão através de um código de uso único (OTP) temporizado enviado por Email (SMTP Real ou Ethereal Dev Mode). O estado de verificação é armazenado permanentemente após a validação.
- **✅ Sistema de Analytics (Behavioral Logging)**: Monitorização silenciosa e não-bloqueante de interações:
    - Page Views (rastreio de navegação).
    - Product Views (análise de interesse).
    - Add to Cart events (intenção de compra).
    - Checkout Funnel steps (deteção de abandono).
- **✅ Sistema de Notificações Toast**: Feedback visual premium para interações (Sucesso, Erro, Aviso) com animações dinâmicas.
- **✅ Premium Animated Checkout**: Interface de pagamentos final com layout de duas fases, escondendo detalhes redundantes e unificando a experiência no Focus Panel lateral. O sumário de encomenda possui uma animação avançada de centrar e expandir com revelação sequencial de informação e redirecionamento final seguro.
- **✅ Dynamic Local Image Mocking**: Sistema de fallback backend nativo de deteção do `localhost`, que previne falhas no Stripe Dashboard usando placeholders visuais dinâmicos da "Placehold.co" adaptados à cor da marca e ao nome do produto para os desenvolvedores, enviando os caminhos originais em Produção.


---

## 👥 2. Papéis de Utilizador e Permissões

### 👤 Cliente (Visitor/Client)
- **Perfil Personalizado**: Gestão de dados, avatar (upload base64), biografia e segurança (mudança de password).
- **Lista de Favoritos**: Sistema de desejos com persistência na base de dados.
- **Histórico de Encomendas**: Visualização detalhada de compras passadas, incluindo estado de pagamento e envio.
- **Detalhes de Encomenda**: Modal premium com visualização de itens comprados, quantidades e preços unitários.
- **Pedido de Upgrade**: Solicitação para se tornar Apicultor através do envio de documentos e justificação.

### 🐝 Apicultor (Partner)
*Inclui todas as permissões de Cliente, acrescidas de:*
- **Gestão de Produtos**: Interface de registo de mel e derivados com preview de imagem e tags.
- **Dashboard de Vendas**: Métricas simplificadas sobre os seus produtos e workshops.
- **Workshops**: Criação de eventos de apicultura com gestão de vagas e datas.
- **✅ Sistema de Reservas**: Receção e processamento de inscrições de clientes em workshops.
- **Bio Profissional**: Espaço para apresentação da quinta e métodos de produção.


### 🛡️ Administrador (Full Control)
*Acesso ao Content Management System (CMS) customizado:*
- **Dashboard de Analítica Avançada**: 6 gráficos dinâmicos (Chart.js) para suporte à decisão:
    1.  **Receita 30d**: Evolução diária da faturação.
    2.  **Distribuição Core**: Vendas por categoria de mel.
    3.  **Estado das Encomendas**: Funil de processamento (Pendente, Pago, Enviado).
    4.  **Crescimento de Rede**: Novos utilizadores nos últimos 12 meses.
    5.  **Top Products**: Ranking de produtos por receita gerada.
    6.  **Performance de Parceiros**: Vendas divididas por apicultor.
- **KPIs em Tempo Real**: Faturação total, AOV (Average Order Value), total de utilizadores e interações globais.
- **Gestão de Upgrades (Document Viewer)**: Analisador de documentos PDF/Imagem integrado para aprovação de novos apicultores.
- **Moderação Global**: Edição e eliminação de produtos, utilizadores, categorias e origens.

---

## 🗂️ 3. Metadados e Organização

- **Categorias Dinâmicas**: Mel de Urze, Eucalipto, Rosmaninho, Multifloral, etc.
- **Origens Geográficas**: Rastreio por regiões (Serra da Estrela, Alentejo, Açores, etc.).
- **Sistema de Tags**: Categorização rápida (Premium, Novo, Promoção, Artesanal).

---

## 💻 4. Arquitetura Técnica

- **Backend**: Node.js v18+, Express, JWT, Multer (uploads), Nodemailer.
- **Base de Dados**: MySQL Relacional (Esquema robusto com Constraints e Indexes).
- **Frontend**: Vanilla JavaScript (ES6+), Vite, Chart.js, SweetAlert2.
- **Segurança**: Middleware de validação de papéis, proteção de rotas API e sanitização de inputs.

