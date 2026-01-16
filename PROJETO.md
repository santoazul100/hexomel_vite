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

---

## 3. Arquitetura Técnica

- **`src/beeAnimation.js`**: Motor de animação procedural responsável pela geração dinâmica e lógica de movimento das abelhas.
- **`src/main.js`**: Lógica central da aplicação e gestão de estado da UI.
- **`src/styles/index.css`**: Centralização de tokens de design e estilos responsivos.

---

## 🛠️ Próximos Passos

1. **Registo de Interações**: Implementar sistema de log para monitorizar cliques e comportamento do utilizador.
2. **Otimização de Performance**: Refinar o motor de renderização para dispositivos de baixo desempenho.
3. **Expansão do Carrinho**: Adicionar checkout funcional e validações de stock.

---

**Objetivo Académico**: Explorar a harmonia entre design visual e interatividade técnica através de animação algorítmica.
