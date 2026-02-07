# Plano de Estudo e Registo de Progresso - Hexomel

> [!IMPORTANT] > **Nota de Desenvolvimento:** Precisamos de adicionar funcionalidades para registar as interações no site e as ações dos utilizadores. (We need to add functionalities to register site interactions and user actions.)

---

## 🚀 Histórico de Implementação

Este documento serve para acompanhar a evolução técnica do projeto Hexomel. Abaixo estão listadas as principais melhorias e funcionalidades implementadas até à data:

### 1. Profissionalização da Marca e Logo

- **Simplificação do Logótipo**: Removida a abelha do logótipo da barra de navegação para um visual mais elegante e focado em texto, seguindo uma estética de marca premium.
- **Design de Interface (UI)**: Cores ajustadas para tons de mel dourado e creme, com tipografia moderna (Playfair Display e Inter).

### 2. Sistema de Animação de Abelhas (BeeAnimator)

- **Interatividade Baseada em Paralaxe Inversa**: As abelhas movem-se suavemente na direção oposta ao rato, criando uma sensação de profundidade.
- **Oscilação Orgânica (Idle)**: Quando o rato está parado, as abelhas mantêm um movimento de flutuação e rotação suave para parecerem vivas.
- **População Aumentada**: Densidade de abelhas aumentada em todas as páginas para criar um ambiente dinâmico e envolvente.

### 3. Experiência de Utilizador e Navegação

- **Estrutura de Páginas Unificada**: Home, Loja, Sobre e Contacto integradas com o mesmo sistema de design e animações.
- **Cursor Personalizado**: Implementação de um cursor temático de abelha em elementos interativos.

### 4. Documentação Académica

- **PROJETO.md**: Criação de um ficheiro técnico detalhado com os objetivos do projeto, tecnologias utilizadas e arquitetura do código para fins de estudo.

### 5. Novo Dashboard e Redesign Administrativo (Colgaia Style)

- **Interface de Alta Fidelidade**: Implementação do design inspirado no projeto "Colgaia", com sidebar moderna, cartões de estatísticas e cores Eco-Green.
- **Fluxo de Login Otimizado**: Autenticação unificada com redirecionamento imediato para `admin.html` para perfis administrativos.
- **Rastreio de Faturação**: Implementada lógica de cálculo de receita no dashboard baseada em transações pagas/enviadas.
- **UX Responsiva**: Sidebar oculta em mobile, substituída por uma barra de navegação inferior intuitiva.

---

## 🛠️ Próximos Passos (Planeamento)

1. **[ ] Registo de Interações**: Implementar um sistema de log (backend ou local) para monitorizar cliques e movimentos importantes dos utilizadores.
2. **[ ] Refinamento da Loja**: Melhorar a filtragem de produtos e a experiência do carrinho de compras.
3. **[ ] Otimização de Performance**: Garantir que o grande número de animações não impacta o carregamento em dispositivos móveis.
