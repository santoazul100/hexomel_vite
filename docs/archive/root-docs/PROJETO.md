# PROJETO: Hexomel - Premium Portuguese Honey

> [!IMPORTANT] > **Nota de Desenvolvimento:** Precisamos de adicionar funcionalidades para registar as interações no site e as ações dos utilizadores. (We need to add functionalities to register site interactions and user actions.)

---

## 1. Visão Geral

O projeto **Hexomel** é um website premium de comércio eletrónico de mel português, desenvolvido para demonstrar competências avançadas em UI/UX, animação procedural e arquitetura de sistemas web sem frameworks.

---

## 2. Histórico de Implementação (Progresso)

### 🏷️ Marca e Identidade

- **Profissionalização do Logo**: Simplificação do logótipo para uma estética minimalista e premium.
- **Design System**: Paleta "Golden & White" com tipografia _Playfair Display_ e _Inter_.

### 🐝 Sistema de Animação de Abelhas (BeeAnimator)

- **Geração Dinâmica**: O sistema cria automaticamente 6-8 abelhas por página em posições aleatórias.
- **Regra de Orientação**:
  - Lado Esquerdo: Abelhas viradas para o centro (normal).
  - Lado Direito: Abelhas viradas para o centro (invertido).
- **Movimento Parallax Inverso**: Resposta suave ao movimento do rato para uma sensação de profundidade.

### 🛒 Funcionalidades Avançadas

- **Loja Interativa**: Catálogo dinâmico com gestão de carrinho via `localStorage` e integração com Backend.
- **Histórico de Compras Premium**:
  - **Timeline de Estado**: Progresso visual da encomenda com animações de pulsação (Pendente -> Pago -> Enviado -> Entregue).
  - **Recibos Digitais**: Geração de faturas simuladas em HTML/PDF com design premium.
  - **Repetir Pedido (Reorder)**: Funcionalidade de um clique para re-adicionar itens ao carrinho com validação de stock.
- **Área de Apicultor (Especializada)**:
  - **Fluxo de Upgrade**: Sistema de pedidos de upgrade com submissão de comprovativos.
  - **Gestão de Produtos**: Dashboard para apicultores registarem os seus próprios lotes de mel.
- **Registo de Interações & Analytics**:
  - **Auditoria Silenciosa**: Registo automático de cliques, acessos a páginas e interações críticas (ex: adicionar ao carrinho).
  - **Painel Administrativo**: Visualização de interações via gráficos dinâmicos (Chart.js) para análise de comportamento.
- **Sistema de Gestão de Workshops**: Lógica de reserva de vagas e controlo de lotação em eventos de apicultura.
- **Sistema de Notificações Premium**: Notificações _Toast_ não intrusivas para feedback instantâneo de ações do utilizador.


---

## 3. Arquitetura Técnica

- **MySQL**: Base de dados relacional gerida via **MySQL Workbench** para suporte robusto a transações e chaves estrangeiras.
- **Estrutura de Dados**: Tabelas especializadas para `interacao`, `upgrade_requests` e `encomenda`.
- **`frontend/src/beeAnimation.js`**: Motor de animação procedural responsável pela geração dinâmica e lógica de movimento das abelhas.
- **`backend/server.js`**: API REST centralizada com autenticação JWT e integração Stripe.

---

1.  **Conectividade em Tempo Real**: Explorar WebSockets para atualizações de stock dinâmicas.
2.  **Otimização de SEO**: Melhorar metadados e estrutura semântica para indexação.
3.  **Refatoração de Código**: Continuar a consolidar rotas e padronizar esquemas de dados.


---

**Objetivo Académico**: Explorar a harmonia entre design visual e interatividade técnica através de animação algorítmica e sistemas de gestão robustos.
