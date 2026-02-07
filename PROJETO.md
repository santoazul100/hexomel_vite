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

### 🛒 Funcionalidades

- **Loja Interativa**: Catálogo dinâmico com gestão de carrinho via `localStorage`.
- **Navegação Consistente**: Cabeçalho e rodapé unificados em todas as páginas (Home, Shop, About, Contact).
- **Modal de Autenticação Avançado**:
  - Layout otimizado com switcher de conta e botão de fechar alinhados no topo.
  - Campos de password com controlo de visibilidade (visto/oculto) e link de recuperação.
- **Dashboard Administrativo (Colgaia Style)**:
  - **Redirecionamento Automático**: Admins são levados diretamente para o painel `admin.html` após o login.
  - **Interface de Grelha Moderna**: Sidebar fixa de 260px com sistema de navegação por secções.
  - **Métricas de Faturação**: Cálculo automático de receita total com base no estado das encomendas.
  - **Modo Mobile**: Transformação automática das tabelas e menu inferior sticky para telemóveis.

---

## 3. Arquitetura Técnica

- **`frontend/src/beeAnimation.js`**: Motor de animação procedural responsável pela geração dinâmica e lógica de movimento das abelhas.
- **`frontend/src/main.js`**: Lógica central da aplicação e gestão de estado da UI.
- **`frontend/src/styles/index.css`**: Centralização de tokens de design e estilos responsivos.

---

## 🛠️ Próximos Passos

1. **Registo de Interações**: Implementar sistema de log para monitorizar cliques e comportamento do utilizador.
2. **Otimização de Performance**: Refinar o motor de renderização para dispositivos de baixo desempenho.
3. **Expansão do Carrinho**: Adicionar checkout funcional e validações de stock.

---

**Objetivo Académico**: Explorar a harmonia entre design visual e interatividade técnica através de animação algorítmica.
