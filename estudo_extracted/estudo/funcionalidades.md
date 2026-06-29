# Funcionalidades do Hexomel (Status: Atualizado Abr/2026)

Este documento detalha todas as funcionalidades implementadas no projeto Hexomel, abrangendo as capacidades dos utilizadores, a gestão administrativa e os metadados dos produtos.

---

## 🍯 1. Funcionalidades Gerais do Site

- **✅ BeeAnimator (UX)**: Sistema de animação procedimental de abelhas. Utiliza matemática trigonométrica para simular voo dinâmico com **Efeito Parallax Inverso** (interação com o rato).
- **✅ Design System**: Interface minimalista com a paleta "Golden & White". Focado em Vanilla CSS (moderno) com tipografia sofisticada e componentes reutilizáveis.
- **✅ Filter System**: Catálogo com filtros dinâmicos cruzados por categorias, origens geográficas, vendedores e preço.
- **✅ Native SPA Experience (View Transitions API)**: Implementação de arquitetura nativa avançada para navegação sem "flickers" visuais. As páginas trocam entre si com um *smooth cross-fade* e injeção síncrona do estado de autenticação (Pre-load Cache), providenciando uma experiência ao estilo App mobile em ambiente Vanilla JS.
- **✅ Carrinho de Compras**: Gestão persistente de produtos através de `localStorage` com sincronização automática e lógica de stock em tempo real.
- **✅ Autenticação Multi-fator**: Sistema de login/registo seguro com hashing (bcrypt), tokens JWT e integração Nativa com **Google OAuth**.
- **✅ Segurança 2FA de Checkout**: Proteção obrigatória para concluir encomendas. Exige a verificação da sessão através de um código de uso único (OTP) temporizado enviado por Email (SMTP Real ou Ethereal Dev Mode). O estado de verificação é armazenado permanentemente após a validação.
- **✅ Sistema de Analytics (Behavioral Logging)**: Monitorização silenciosa e não-bloqueante de interações:
    - Page Views (rastreio de navegação).
    - Product Views (análise de interesse).
    - Add to Cart events (intenção de compra).
    - Checkout Funnel steps (deteção de abandono).
- **✅ Sistema de Notificações Toast**: Feedback visual para interações (Sucesso, Erro, Aviso) com animações dinâmicas.
- **✅ Checkout Funnel & Sync**: A encomenda "Pendente" só é inicializada no clique final para evitar rascunhos abandonados. Implementa o **Esvaziamento Atómico do Carrinho** (DB e Local) na transição.
- **✅ Ngrok Tunneling Support**: Sistema que permite usar o **Ngrok** (via `CHECKOUT_PUBLIC_BASE_URL`) para que o Stripe Checkout consiga carregar imagens reais diretamente do seu `localhost` durante o desenvolvimento.
- **✅ Dynamic Image Mocking**: Fallback automático para placeholders temáticos do Unsplash (Mel, Pólen) caso não seja detetado um túnel público no ambiente local.
- **✅ Rede Social & Mensagens Privadas (Chat)**: Chat em tempo real (polling automático) integrado na página de rede social HexoHive, permitindo comunicação direta e privada em estilo Instagram. Inclui:
    - **Diretório Público de Membros**: Página pública dedicada (`rede-social.html`) onde qualquer utilizador pode procurar e filtrar todos os membros da plataforma (Clientes, Apicultores e Administradores) e interagir.
    - **Perfis Públicos Detalhados (Modal Premium)**: Clique nos membros para abrir um painel detalhado com três secções (Atividade & Reviews, Produtos, Favoritos).
    - **Design Overhaul & Coesão Visual**: O diretório público apresenta cartões com um design clean, elegante e minimalista, perfeitamente integrados com o rodapé oficial do site principal (`footer-premium`).
    - **Robustez de Imagem (Error Resiliency)**: Se uma foto de perfil falhar no carregamento ou for inexistente, o browser comuta instantaneamente para a imagem padrão da abelha da Hexomel (`/images/default-user.png`), garantindo um aspeto natural e uniforme em toda a plataforma.
    - **Correção de Biografias**: Se o utilizador não tiver biografia, é apresentado "Sem biografia disponível." em itálico com opacidade reduzida, evitando textos artificiais ou repetidos no diretório.
    - **Censura Automática**: Filtro automático de profanidades no backend para mensagens privadas.
    - **Sistema de Bloqueios**: Os utilizadores podem bloquear e desbloquear contactos diretamente no chat, nos perfis ou no diretório de rede social. O bloqueio impede o envio de mensagens privadas.
    - **Sistema de Denúncias (Reports)**: Permite denunciar comportamentos inadequados de outros utilizadores diretamente na comunidade (Q&A), no chat ou no diretório de membros.
- **✅ Secção Aprender & Gamificação (Quiz, Glossário e Tabela de Liderança)**: Área educativa interativa composta por:
    - **Factos Reveláveis (Cartões 3D)**: Cartões interativos que rodam ao clique com transições 3D realistas, apresentando factos interessantes sobre abelhas e mel.
    - **Glossário Apícola Interativo**: Dicionário de termos apícolas com pesquisa inteligente em tempo real e filtros rápidos por categorias de termos.
    - **Quiz Gamificado**: Teste interativo com dots de progresso inteligentes, atalhos de teclado (teclas 1-4, Enter), medidor de pontuação circular animado em SVG e classificação por patamares apícolas (ex: "Mestre Apicultor", "Zangão Esforçado").
    - **Tabela de Liderança (Leaderboard)**: Top 5 de pontuações de todos os utilizadores globalmente com badges premium (Coroa de Ouro, Prata, Bronze), subtítulos dinâmicos baseados no patamar de pontuação, e exibição do recorde pessoal do utilizador autenticado em tempo real.

---

## 👥 2. Papéis de Utilizador e Permissões

### 👤 Cliente (Visitor/Client)
- **Perfil Personalizado**: Gestão de dados, avatar (upload base64), biografia e segurança (mudança de password).
- **Lista de Favoritos & Privacidade**: Sistema de desejos com persistência na base de dados, com opção de tornar a lista pública ou privada para outros membros da HexoHive.
- **Histórico de Encomendas**: Visualização detalhada de compras passadas, incluindo estado de pagamento e envio.
- **Detalhes de Encomenda**: Modal com visualização de itens comprados, quantidades e preços unitários.
- **Pedido de Upgrade**: Solicitação para se tornar Apicultor através do envio de documentos e justificação.
- **Rede Social & Mensagens**: Enviar mensagens privadas, bloquear utilizadores indesejados, denunciar infrações, e visualizar perfis públicos detalhados com histórico de avaliações/atividades de outros membros.

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
- **Moderação Global & Educativa (CMS)**: Edição, eliminação e criação de produtos, utilizadores, categorias, origens, **factos educativos e termos do glossário da secção Aprender**.
- **✅ Painel de Moderação Social**: Área dedicada a gerir reports e visualizar bloqueios efetuados. Permite resolver denúncias, privar utilizadores infratores de postar ou enviar mensagens (`Restrito_Postar`), ou apagar permanentemente as contas.

---

## 🗂️ 3. Metadados e Organização

- **Categorias Dinâmicas**: Mel de Urze, Eucalipto, Rosmaninho, Multifloral, etc.
- **Origens Geográficas**: Rastreio por regiões (Serra da Estrela, Alentejo, Açores, etc.).
- **Sistema de Tags**: Categorização rápida (Novo, Promoção, Artesanal).

---

## 💻 4. Arquitetura Técnica

- **Backend**: Node.js v18+, Express, JWT, Multer (uploads), Nodemailer.
- **Base de Dados**: MySQL Relacional (Esquema robusto com Constraints e Indexes).
- **Frontend**: Vanilla JavaScript (ES6+), Vite, Chart.js, SweetAlert2.
- **Segurança**: Middleware de validação de papéis, proteção de rotas API e sanitização de inputs.

