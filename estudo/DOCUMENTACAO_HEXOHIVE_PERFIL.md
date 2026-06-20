# 🐝 Documentação Técnica: Perfis Detalhados e Privacidade no HexoHive

Este documento descreve a arquitetura, o fluxo de dados e os detalhes de implementação da funcionalidade de **Perfis Públicos Detalhados** dos membros na plataforma social **HexoHive** da Hexomel.

---

## 📌 1. Visão Geral

A funcionalidade expande o diretório de rede social (`rede-social.html`), permitindo que qualquer utilizador autenticado ou visitante visualize informações ricas sobre outros membros através de um **painel interativo modal (Premium)**. O painel está dividido em três áreas (abas):

1.  **Atividade & Reviews**:
    *   **Avaliações de Compras**: Mostra produtos comprados anteriormente que o utilizador avaliou (com nota de 1 a 5 estrelas e comentários).
    *   **Histórico de Workshops**: Lista de workshops ministrados pelo utilizador (se for Apicultor) ou workshops em que participou (Clientes e Apicultores).
2.  **Produtos** (Exclusivo para **Apicultores**):
    *   Apresenta uma grelha premium de produtos ativos do apicultor com stock em tempo real, preço e link rápido de redirecionamento para o carrinho de compras na Loja.
3.  **Favoritos** (Condicional à **Privacidade**):
    *   Lista de produtos favoritados pelo utilizador, visível apenas se este permitir partilhá-los nas definições do seu perfil.

---

## 💾 2. Estrutura da Base de Dados

Para suportar o controlo de privacidade dos favoritos, foi efetuada uma alteração ao esquema da base de dados no ficheiro `backend/hexomel_mysql.sql`:

```sql
ALTER TABLE cliente ADD COLUMN Favoritos_Publicos BOOLEAN DEFAULT FALSE;
```

*   **`Favoritos_Publicos`**: Um valor booleano (`0` ou `1`) na tabela `cliente` que indica se a lista de favoritos do utilizador deve ser exposta a terceiros na HexoHive.
*   **Migração Automática**: Implementada no arranque do servidor (`backend/server.js`) para garantir compatibilidade retroativa:
    ```javascript
    await db.run("ALTER TABLE cliente ADD COLUMN Favoritos_Publicos BOOLEAN DEFAULT FALSE").catch(() => {});
    ```

---

## 🌐 3. Endpoints da API (Backend)

### A. Obter e Atualizar Privacidade do Próprio Utilizador
Os endpoints de gestão de perfil foram estendidos para ler e gravar a flag de privacidade:

*   **`GET /api/user/profile`**: Retorna os detalhes do utilizador autenticado, incluindo `favoritesPublic`.
*   **`PUT /api/user/profile`**: Permite ao utilizador atualizar o estado de `favoritesPublic`.

### B. Endpoint Público de Perfil Detalhado
*   **`GET /api/members/:id/profile`**:
    Retorna toda a informação pública agregada de um membro específico.

**Estrutura de Resposta (JSON):**
```json
{
  "member": {
    "id": 12,
    "name": "Rodrigo Silva",
    "picture": "/uploads/avatar.jpg",
    "bio": "Produtor de mel biológico na Serra da Estrela.",
    "role": "apicultor",
    "favoritesPublic": true
  },
  "products": [
    { "id": 1, "name": "Mel de Urze", "price": 8.50, "stock": 15, "image": "/uploads/product1.jpg", "description": "Mel encorpado..." }
  ],
  "hostedWorkshops": [
    { "id": 3, "title": "Introdução à Apicultura Dinâmica", "date": "2026-07-15T10:00:00.000Z", "price": 25.00, "image": "/uploads/ws1.jpg" }
  ],
  "reviews": [
    { "id": 4, "rating": 5, "comment": "Excelente qualidade!", "date": "2026-06-01T14:30:00.000Z", "productId": 2, "productName": "Mel de Eucalipto", "productImage": "/uploads/product2.jpg" }
  ],
  "favorites": [
    { "id": 2, "name": "Mel de Eucalipto", "price": 7.90, "image": "/uploads/product2.jpg" }
  ],
  "attendedWorkshops": [
    { "id": 1, "title": "Voo das Abelhas e Polinização", "date": "2026-05-10T09:00:00.000Z", "image": "/uploads/ws2.jpg" }
  ]
}
```

---

## 🎨 4. Interface e Experiência do Utilizador (UX/UI)

### A. Modificações na Página de Definições (`profile.html`)
Adicionado um seletor visual na secção de edição do perfil:
*   **Campo**: `Tornar Favoritos Públicos na HexoHive` (Checkbox estilizada de alternância rápida).
*   **Persistência**: Gravação instantânea no clique em "Guardar Alterações".

### B. Elementos do Modal de Perfil Detalhado (`rede-social.html`)
O modal `#memberProfileModal` usa uma estética premium com:
*   **Cabeçalho Gradiente**: Transição visual suave entre o amarelo mel (`#f4b400`) e o verde floresta oficial (`#1a4d2e`).
*   **Foto flutuante**: Avatar arredondado com moldura branca em relevo de 100x100px.
*   **Emblemas dinâmicos**: Badges de cores distintas para identificar o papel do utilizador (Cliente, Apicultor, Admin).
*   **Sistema de Abas (Instagram Style)**: Abas limpas com animações ao passar o rato (`.nav-tabs-premium` e `.btn-item-profile`).
*   **Skeleton Loading**: Ecrã de carregamento suave com spinners enquanto os dados são obtidos da API.

### C. Grelhas de Produtos e Favoritos
Os cartões de produtos apresentados dentro das abas do modal possuem:
*   **Indicador de Stock**: Badges automáticos de `Em Stock` ou `Sem Stock`.
*   **Redirecionamento Inteligente**: Botão de carrinho que pesquisa o produto na loja e permite adicioná-lo instantaneamente.
*   **Responsividade**: Adaptação para grelhas de 2 colunas em telemóveis e 3 colunas em ecrãs maiores.

---

## 🔒 5. Políticas de Privacidade e Regras de Negócio

1.  **Exposição de Compras**: Por razões de privacidade (RGPD), as compras antigas de um cliente **não são listadas diretamente**. Em vez disso, o sistema apresenta os produtos que o cliente comprou **e avaliou**. Isto protege a privacidade do cliente ao mesmo tempo que cumpre o requisito de mostrar avaliações de compras anteriores.
2.  **Lista de Favoritos**: A aba de favoritos só é injetada e mostrada se a flag `Favoritos_Publicos` for verdadeira (`1`). Caso contrário, a aba permanece invisível no DOM para outros membros.
3.  **Botão de Mensagem Directa**: Se o perfil aberto pertencer ao próprio utilizador que está a visualizar, o botão "Enviar Mensagem" no rodapé do modal é ocultado automaticamente.
