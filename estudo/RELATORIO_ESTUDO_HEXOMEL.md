# Relatório Técnico e de Estudo: Projeto Hexomel

Este documento consolida toda a informação técnica, arquitetural e de base de dados do projeto Hexomel, preparado para a Prova de Aptidão Profissional (PAP).

---

## 1. Visão Geral do Projeto
O **Hexomel** é uma plataforma de e-commerce para mel português, desenvolvida com foco em performance, design minimalista e interatividade dinâmica.

### Tecnologias Core:
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (JS Puro) e Vite.
- **Backend**: Node.js com framework Express.
- **Base de Dados**: MySQL Community Server 8.0.
- **Gestão de BD**: MySQL Workbench.

---

## 2. Arquitetura do Sistema
O projeto segue uma estrutura de **Single Page Application (SPA) logic** no frontend com uma **API RESTful** no backend.

- **Comunicação e SPA Híbrida**: O frontend comunica com o servidor via `Fetch API`, utilizando tokens **JWT** para autenticação segura. Incorporamos suportes avançados de **Native View Transitions API** (`<meta name="view-transition" content="same-origin">`) misturados com caching ultrarrápido (`pre-load.js`) para simular uma navegação Single Page Application, garantindo fade-ins limpos e eliminando cintilações (flickering) sem depender de pesados frameworks extra.
- **Integração de Email**: Backend configurado com **Nodemailer** para suporte a envio de emails reais via SMTP (ex: Gmail) ou Fallback para Ethereal em modo de desenvolvimento, essencial para recuperação e validação.
- **Segurança e 2FA**: As passwords são protegidas com `bcryptjs` (hashing) e os acessos são validados por middlewares no servidor para perfis Cliente, Apicultor e Admin. Adicionalmente, foi implementado um **Módulo 2FA Obrigatório** verificado por email para assegurar as transações do Carrinho de Compras, elevando a segurança da plataforma contra roubo de sessões. O estado validado da conta é armazenado persistentemente usando flags em Base de Dados.
- **Assets**: Imagens de produtos e perfis são geridas via `multer` no backend e armazenadas em `frontend/public/uploads/`.
- **UI Consistency**: Implementação de um sistema de design centralizado em `modern.css`, garantindo que componentes (tabelas, badges, botões e modais) sejam idênticos em toda a plataforma.

---

## 3. Base de Dados (SGBD: MySQL)

### Justificação Técnica
- **Robustez**: O MySQL com o motor **InnoDB** garante a integridade dos dados através de Transações ACID e Foreign Keys.
- **Escalabilidade**: Preparado para lidar com múltiplos utilizadores e grandes volumes de produtos.
- **Padrão Profissional**: O uso do MySQL Workbench demonstra um domínio de ferramentas padrão da indústria.

### Estrutura (Tabelas Principais)
1. **`cliente`**: Gere perfis de Clientes, Apicultores e Administradores.
2. **`produto`**: Catálogo com associações a Apicultores e Categorias.
3. **`encomenda`**: Registo de vendas com cálculo automático de faturação.
4. **`workshop`**: Eventos dinâmicos organizados pelos apicultores.
5. **`avaliacao`**: Sistema de feedback com notas de 1 a 5 estrelas.
6. **`upgrade_requests`**: Registo e controlo de pedidos de privilégios de Apicultor, com suporte a armazenamento de provas documentais.
7. **`origem`**: Metadados geográficos para rastreabilidade do mel.
8. **`interacao`**: Registo analítico de eventos para monitorização comportamental de utilizadores.

---

## 4. Guia de Gestão (MySQL Workbench)
Para gerir o projeto de forma profissional, utilizamos exclusivamente o **MySQL Workbench**:
1. **Ligação**: Ligar ao `localhost` usando o utilizador `root`.
2. **Visualização**: No painel "Schemas", a base de dados `hexomel` contém toda a estrutura.
3. **Setup**: Em caso de necessidade de reset, o comando `npm run db:setup` na pasta `backend` re-inicializa toda a estrutura automaticamente.

---

## 5. Funcionalidades de Design (Bee System)
- **BeeAnimator**: Um sistema de animação procedural que gera abelhas dinâmicas que reagem ao rato (Parallax) e mudam de orientação dependendo da posição no ecrã, criando uma experiência viva.

---

## 6. Credenciais de Teste (Admin)
- **Login/Email**: `admin`
- **Password**: `admin`
*(Utilizador de teste com acesso total ao Dashboard corporativo. Nota: O sistema suporta login por email ou identificador simplificado).*

---

## 7. Filosofia de Design e UX
O Hexomel diferencia-se pela sua **Interface**, que utiliza:
- **Tabelas Modernas**: Com sistema de iniciais em avatares e ações flutuantes.
- **Micro-interações**: Feedback visual imediato em formulários e dashboards.
- **UX Unificada**: O portal do Apicultor utiliza a mesma linguagem visual de alta qualidade do Painel de Administração.
- **Analytics Avançado**: Dashboard com integração total do `Chart.js`, processando dados reais de vendas, crescimento de utilizadores, produtividade de apicultores, e um painel avançado de **Interações Comportamentais** (eventos, cliques e funil).
- **Robustez de Visualização**: Sistema de visualização de documentos (Upgrade System) com tratamento de erros avançado, gestão de classes dinâmicas para loaders e suporte cross-browser para PDF e Imagens.
- **Área de Cliente**: Painel de perfil interativo abrangente com histórico de encomendas detalhado e acompanhamento visual do estado de cada compra.

- **Integração Backend/Frontend Stripe**: Para a componente de pagamentos online (Checkout Stripe), foi desenvolvido um backend inteligente que reconhece se o ambiente é local (localhost/desenvolvimento) ou de produção. 
    - **Suporte Ngrok**: Introduzimos suporte nativo para **Túneis Ngrok** através da variável `CHECKOUT_PUBLIC_BASE_URL`. Esta solução permite expor o servidor local à internet de forma segura, possibilitando que o Stripe Checkout aceda às imagens reais dos produtos armazenadas no teu computador durante a fase de testes.
    - **Fallback Inteligente**: Em caso de ausência de um túnel público, o sistema utiliza um algoritmo de **Dynamic Stripe Asset Mocking** com placeholders temáticos de alta qualidade (Unsplash) personalizados com a paleta Hexomel.
- **Checkout Flow & Cart Sync**: O processo de finalização de encomenda no Hexomel abandona esquemas tradicionais confusos por um formato de 2 Passos guiados. A encomenda "Pendente" só é gerada no momento da finalização para manter a base de dados limpa. O sistema implementa **Esvaziamento Atómico do Carrinho** (Local e DB) no momento do clique, garantindo uma transição fluída e profissional para o portal de pagamentos.

---

## 8. Experiência 3D Interativa e Origem do Mel
A página de Curiosidades eleva a interatividade através de um sistema de **Visualização de Mel Dinâmico**.
- **Motor 3D**: Utiliza `Three.js` para renderizar um frasco fotorrealista com materiais físicos (`MeshPhysicalMaterial`).
- **Simulador de Origem Botânica**: Implementação de um slider que permite ao utilizador alternar entre 5 tipos de mel (Alfazema, Laranjeira, Multiflora, Eucalipto e Urze).
- **Física de Materiais**: O sistema não muda apenas a cor; ele recalcula a **Transmissão**, **Distância de Atenuação** e **Cor de Absorção** em tempo real. Méis mais escuros (como Urze) tornam-se quase opacos e densos, enquanto méis claros (Alfazema) apresentam transparência cristalina, educando o utilizador sobre como a origem floral impacta a densidade e cor do produto.

---

## 9. Secção Aprender, Gamificação e CMS Educativo
A página **Aprender** (`aprender.html`) e o seu motor associado (`src/aprender.js`) oferecem uma experiência pedagógica gamificada de alta fidelidade para os utilizadores, totalmente controlável pelo administrador:
- **Factos 3D (Reveal Cards)**: Implementação de cartões dinâmicos 3D que rodam ao clique do utilizador, contendo curiosidades interessantes. A rotação utiliza CSS 3D (`preserve-3d` e `backface-visibility: hidden`) para evitar oscilações visuais e garantir estabilidade cross-browser.
- **Glossário Apícola**: Um diretório de termos com barra de pesquisa textual instantânea e filtros por categorias estruturadas, geridos de forma assíncrona com fallback local caso a API esteja indisponível.
- **Quiz Interativo com Teclado e Animações**: O quiz apresenta dots de progresso inteligentes, atalhos rápidos de teclado (teclas `1`-`4` para selecionar respostas, `Enter`/`Space` para avançar), um medidor circular animado em SVG que se desenha dinamicamente no ecrã de resultados, e atribuição de patamares apícolas temáticos de acordo com os resultados (ex: *Mestre Apicultor*, *Apicultor Experiente*, *Zangão Esforçado*, *Abelha Aprendiz*).
- **Tabela de Liderança (Leaderboard)**: Exibição permanente do Top 5 global das melhores pontuações do quiz (ligada por chave estrangeira à tabela `cliente`), com badges premium (Coroa de Ouro, Prata, Bronze) e exibição do recorde pessoal do utilizador autenticado em tempo real.
- **CMS Administrativo Dedicado**: O painel de administração fornece controlo CRUD completo (Create, Read, Update, Delete) sobre os factos educativos da página e termos do glossário, permitindo que a equipa de moderação atualize o conteúdo didático do website a partir do painel.

---

## 10. Documentação Técnica Adicional
Para detalhes profundos sobre implementações específicas, consulte os ficheiros de estudo:
- [Implementação de Checkout e Emails](file:///c:/escola/PAP/codigo/hexomel/estudo/DETALHES_TECNICOS_COMPRAS_EMAIL.md): Detalha a lógica de encomendas, integração com SMTP do Google (App Passwords) e geração de recibos CID.
- [Funcionalidades Globais](file:///c:/escola/PAP/codigo/hexomel/estudo/funcionalidades.md): Lista completa de capacidades do sistema.

---
*Este relatório foi gerido e compactado para servir de base à documentação final da PAP.*
