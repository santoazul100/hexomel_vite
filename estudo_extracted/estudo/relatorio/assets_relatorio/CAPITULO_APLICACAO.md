# Capítulo 6 — A Aplicação: Desenvolvimento, Código e Processo

> Este capítulo descreve em detalhe o processo de desenvolvimento do Hexomel, explicando a estrutura do código, os módulos principais e as decisões técnicas tomadas durante a construção de cada funcionalidade.

---

## 6.1 Estrutura de Ficheiros do Projeto

O projeto está organizado em duas pastas principais dentro de `hexomel_vite/`:

```
hexomel_vite/
├── frontend/                  ← Tudo o que o utilizador vê
│   ├── index.html             ← Página inicial
│   ├── shop.html              ← Loja de produtos
│   ├── checkout.html          ← Processo de compra
│   ├── profile.html           ← Perfil do utilizador
│   ├── admin.html             ← Painel de administração
│   ├── dashboard-apicultor.html ← Painel do apicultor
│   ├── curiosidades.html      ← Página 3D do mel
│   ├── comunidade.html        ← Fórum Q&A
│   └── src/
│       ├── auth.js            ← Autenticação e sessão
│       ├── cart.js            ← Gestão do carrinho
│       ├── checkout.js        ← Processo de compra
│       ├── shop.js            ← Loja e filtros
│       ├── analytics.js       ← Sistema de analytics
│       ├── beeAnimation.js    ← Animação das abelhas
│       ├── api.js             ← Ligação ao backend
│       ├── skeleton.js        ← Placeholders de carregamento
│       ├── pre-load.js        ← Anti-flickering na navbar
│       ├── i18n.js            ← Sistema de tradução PT/EN
│       ├── toast.js           ← Sistema de notificações
│       ├── curiosidadesHero3d.js ← Visualização 3D Three.js
│       ├── admin.js           ← Dashboard de administração
│       ├── dashboard-apicultor.js ← Dashboard do apicultor
│       ├── comunidade.js      ← Fórum Q&A
│       └── styles/
│           ├── modern.css     ← Design system principal
│           ├── skeleton.css   ← Estilos dos loaders
│           └── ...            ← Estilos por página
│
└── backend/
    ├── server.js              ← Servidor Node.js/Express (ficheiro principal)
    ├── hexomel_mysql.sql      ← Esquema da base de dados
    ├── scripts/               ← Scripts de setup e migração
    └── .env                   ← Variáveis de ambiente (chaves secretas)
```

### Princípio de Organização

Cada página HTML tem um ficheiro JavaScript correspondente que carrega toda a lógica daquela página. Módulos partilhados (como `auth.js`, `cart.js`, `api.js`) são importados onde necessário através de `import` ES6.

---

## 6.2 Módulo `api.js` — A Base de Toda a Comunicação

O ficheiro `api.js` é o ponto central de comunicação com o backend. É o primeiro módulo a ser importado por quase todos os outros.

```javascript
// api.js — Configuração central da API
export const API_URL = "/api";

const RETRY_COUNT = 30;
const RETRY_DELAY_MS = 300;

let backendReady = false;
```

### `ensureBackendReady()` — Verificador de saúde do servidor

Este é um dos mecanismos mais inteligentes do projeto. Em vez de assumir que o servidor está sempre disponível, o frontend tenta ligar até 30 vezes (com 300ms de intervalo) antes de desistir:

```javascript
export const ensureBackendReady = async ({ retries = 30, delayMs = 300 } = {}) => {
  if (backendReady) return true;  // Cache: não verifica duas vezes

  // Tenta conectar ao endpoint /api/health
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        backendReady = true;
        return true;
      }
    } catch {}
    await sleep(delayMs);  // Espera 300ms antes de tentar de novo
  }
  return false;
};
```

**Porquê esta abordagem?** Durante o desenvolvimento, o servidor Node.js pode demorar alguns segundos a arrancar. Sem este mecanismo, os primeiros pedidos à API falhariam silenciosamente.

### `getPublicConfig()` — Configuração sem segredos

Para expor ao frontend informações como o `GOOGLE_CLIENT_ID` sem revelar chaves secretas, o servidor tem um endpoint `/api/config/public` que devolve apenas o que é seguro partilhar:

```javascript
export const getPublicConfig = async () => {
  if (publicConfigCache) return publicConfigCache; // Usa cache se já foi buscado
  const response = await fetch(`${API_URL}/config/public`);
  publicConfigCache = await response.json(); // { googleClientId: "..." }
  return publicConfigCache;
};
```

---

## 6.3 Módulo `pre-load.js` — Eliminar o Flickering da Navbar

Um dos problemas clássicos do desenvolvimento web é o **FOUC (Flash of Unstyled Content)**: o utilizador vê brevemente uma navbar sem o seu estado de login antes do JavaScript carregar.

O `pre-load.js` resolve isto usando um **MutationObserver** — um mecanismo nativo do browser que "observa" o DOM em tempo real:

```javascript
// pre-load.js — Executado ANTES de qualquer outro script
(function () {
  // 1. Lê o utilizador do localStorage (disponível ANTES do JS principal)
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user")); } catch (e) {}

  // 2. Observa o DOM enquanto ainda está a ser construído
  const observer = new MutationObserver((mutations, obs) => {
    const authSection = document.getElementById('authSection');
    if (authSection) {
      if (user) {
        // Injeta o avatar e nome imediatamente
        const firstName = user.name?.split(" ")[0] || "User";
        authSection.innerHTML = `<div>...avatar de ${firstName}...</div>`;
      } else {
        authSection.innerHTML = `<button>Entrar</button>`;
      }
      obs.disconnect(); // Para de observar — tarefa concluída
    }
  });

  // 3. Começa a observar o DOM logo no início
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
```

**Resultado:** A navbar mostra o estado correto (logado ou não) antes mesmo da página estar completamente carregada. Zero flickering.

---

## 6.4 Módulo `auth.js` — Autenticação Completa

O módulo de autenticação (`auth.js`) é responsável por tudo o que tem a ver com sessões: login, registo, logout e Google OAuth.

### Processo de Registo

```javascript
// Quando o utilizador submete o formulário de registo
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // 1. Valida se as passwords coincidem
  if (password !== confirmPassword) {
    return Swal.fire("Erro", "As passwords não coincidem", "error");
  }

  // 2. Envia os dados para o servidor via Fetch API
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    // 3. Guarda o token JWT e dados do utilizador no localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // 4. Redireciona para o perfil para completar dados
    window.location.href = "profile.html?tab=dados&welcome=1";
  }
});
```

### Processo de Login

O sistema suporta login por **email OU username** — o utilizador pode usar o identificador que preferir:

```javascript
loginForm.addEventListener("submit", async (e) => {
  const identifier = document.getElementById("login-email-v2").value; // email ou username
  const password = document.getElementById("login-password-v2").value;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),  // "identifier" pode ser email ou username
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redireciona consoante o perfil
    const role = data.user.role;
    if (role === "admin") {
      window.location.href = "/admin";  // Admins só acedem pelo login dedicado
    } else if (isProfileIncomplete) {
      window.location.href = "profile.html?tab=dados&welcome=1";
    } else {
      window.location.reload();
    }
  }
});
```

### Login com Google OAuth 2.0

A integração com o Google segue o fluxo padrão OAuth:

```javascript
// 1. Inicializa o SDK do Google com o Client ID
window.google.accounts.id.initialize({
  client_id: googleClientId,
  callback: handleGoogleCallback,  // Função chamada após o utilizador escolher a conta
});

// 2. Quando o Google responde com o token de identidade
const handleGoogleCallback = async (response) => {
  // 3. Envia o idToken ao backend para verificação
  const res = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: response.credential }),
  });
  // 4. Backend verifica com a API do Google e devolve JWT próprio
  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
};
```

### Gestão de Sessão Expirada

Quando um token JWT expira, o servidor responde com HTTP 401. O módulo `auth.js` trata isto elegantemente:

```javascript
export const handleSessionExpired = async (message) => {
  if (isHandlingSessionExpiry) return;  // Evita múltiplos alertas simultâneos
  isHandlingSessionExpiry = true;

  // Esconde o conteúdo para não mostrar dados protegidos
  const mainEl = document.querySelector("main");
  if (mainEl) mainEl.style.display = "none";

  clearSession();  // Remove token e user do localStorage
  updateNav(null);  // Atualiza navbar para estado "não logado"

  await Swal.fire({
    icon: "warning",
    title: "Sessão expirada",
    text: message,
    confirmButtonColor: "#f4b400",
  });

  window.location.href = "/";
};
```

### Construção dos Headers de Autenticação

Uma função utilitária que qualquer módulo pode usar para incluir o token JWT nos pedidos:

```javascript
export const buildAuthHeaders = (headers = {}) => {
  const token = getAuthToken();
  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;
};

// Exemplo de uso noutros módulos:
const res = await fetch("/api/user/profile", {
  headers: buildAuthHeaders({ "Content-Type": "application/json" })
});
```

---

## 6.5 Módulo `cart.js` — O Carrinho de Compras

O carrinho é implementado como uma **Classe ES6** chamada `CartManager`, que gere o estado tanto no frontend como na base de dados.

### Arquitetura do CartManager

```javascript
class CartManager {
  constructor() {
    this.items = [];   // Lista atual de produtos no carrinho
    this.init();       // Inicia automaticamente
  }

  async init() {
    this.createCartUI();      // Cria o sidebar HTML no DOM
    this.renderBadgeOnly();   // Mostra o contador da navbar imediatamente (sem esperar API)
    const backendAvailable = await ensureBackendReady();
    if (backendAvailable) {
      await this.syncWithBackend();  // Busca o carrinho guardado na BD
    }
    this.render();  // Renderiza os itens
  }
}
```

### Exibição Imediata do Badge

Antes mesmo de consultar a API, o badge da navbar é atualizado com os dados do `localStorage`:

```javascript
renderBadgeOnly() {
  const badge = document.getElementById("cart-badge");
  if (badge) {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const total = cart.reduce((sum, item) => sum + (item.Quantidade || 0), 0);
    badge.textContent = total;  // Atualizado instantaneamente
  }
}
```

### Sincronização com o Backend

Quando o utilizador está logado, o carrinho é sempre sincronizado com a base de dados:

```javascript
async syncWithBackend() {
  const token = localStorage.getItem("token");
  if (!token) return;  // Não sincroniza se não está logado

  const res = await fetch(`${API_URL}/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    this.items = await res.json();  // Substitui pelo estado da BD
  }
}
```

### Adicionar ao Carrinho com Verificação de Sessão

```javascript
async addItem(productId, quantity = 1) {
  const token = localStorage.getItem("token");

  // Se não está logado, mostra diálogo de login
  if (!token) {
    Swal.fire({
      title: "Iniciar Sessão",
      text: "Precisas de estar logado para adicionar produtos ao carrinho.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Entrar",
    }).then((result) => {
      if (result.isConfirmed) window.openAuthModal("login");
    });
    return;
  }

  // Envia o produto ao carrinho na BD
  const res = await fetch(`${API_URL}/cart/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });

  if (res.ok) {
    await this.syncWithBackend();  // Atualiza com a versão mais recente da BD
    this.render();
    this.toggle(true);  // Abre o sidebar do carrinho
  }
}
```

### Verificação 2FA antes do Checkout

Antes de redirecionar para o checkout, o sistema verifica se o utilizador já fez a verificação de segurança:

```javascript
async checkout() {
  if (this.items.length === 0) {
    return Swal.fire("O carrinho está vazio!", "", "info");
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Verifica se o utilizador fez a verificação 2FA desta sessão
  if (user.checkoutVerified !== true) {
    Swal.fire({
      title: "Verificação Necessária",
      text: "Por segurança, precisamos de confirmar a sua identidade.",
      icon: "warning",
      confirmButtonText: "Fazer Verificação",
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = "profile.html?tab=security";
      }
    });
    return;
  }

  // Só chega aqui se 2FA passou
  window.location.href = "checkout.html";
}
```

---

## 6.6 Módulo `shop.js` — A Loja com Filtros Avançados

A loja é o módulo mais complexo do frontend, com 1104 linhas de código. Implementa filtros cruzados em tempo real, pesquisa com sugestões, paginação e um sistema de modal de detalhes.

### Estado Global da Loja

```javascript
// Variáveis de estado — controlam o que está a ser mostrado
let products = [];          // Todos os produtos da API
let filteredProducts = [];  // Produtos após aplicar filtros
let categories = [];        // Categorias para os checkboxes
let origins = [];           // Origens geográficas para os checkboxes
let userFavorites = [];     // IDs dos favoritos do utilizador
let currentPage = 1;        // Página atual da paginação

// Configuração fácil de alterar
const SHOP_CONFIG = {
  productsPerPage: 9,
  maxSuggestions: 6,
  minSearchCharsForSuggestions: 2,
  searchAnalyticsDebounceMs: 1000,
  skeletonProductCount: 6,
};
```

### Carregamento Paralelo de Dados

Em vez de fazer os pedidos em sequência (um após o outro), todos os dados são pedidos em **paralelo** usando `Promise.all()`:

```javascript
async function fetchProducts() {
  const grid = document.getElementById("products-grid");

  // 1. Mostra os skeleton loaders enquanto carrega
  grid.innerHTML = Skeleton.productGrid(6);  // 6 cards placeholder animados

  try {
    // 2. Pede categorias, origens e produtos AO MESMO TEMPO
    const [catRes, oriRes, res] = await Promise.all([
      fetch(`${API_URL}/categories`),
      fetch(`${API_URL}/origins`),
      fetch(`${API_URL}/products`),
    ]);

    categories = await catRes.json();
    origins = await oriRes.json();

    // 3. Renderiza os filtros dinâmicos com os dados reais da BD
    renderCategoryFilters();
    renderOriginFilters();

    // 4. Normaliza os dados dos produtos
    const data = await res.json();
    products = data.map((p) => ({
      id: p.ID_Produto,
      name: p.Nome,
      price: Number(p.Preco),
      category: categories.find(c => c.ID_Categoria === p.ID_Categoria)?.Nome || "Sem Categoria",
      origin: origins.find(o => o.ID_Origem === p.ID_Origem)?.Nome || "N/A",
      tags: p.Tags ? p.Tags.split(",").map(t => t.trim()) : [],
      slug: p.Slug || null,
      // ...outros campos
    }));

    filteredProducts = [...products];
    renderProducts();

  } catch (error) {
    // 5. Se falhar, mostra estado de erro com botão de retry
    grid.innerHTML = Skeleton.stateError(
      'Não foi possível carregar os produtos.',
      'retry-products-btn'
    );
    Skeleton.onRetry('retry-products-btn', () => fetchProducts());
  }
}
```

### Lógica de Filtragem Cruzada

A função `applyFilters()` combina todos os filtros ativos ao mesmo tempo:

```javascript
function applyFilters() {
  // Lê todos os filtros ativos
  const selectedCatIds = Array.from(
    document.querySelectorAll(".category-filter-checkbox:checked")
  ).map(cb => Number(cb.getAttribute("data-cat-id")));

  const selectedOriIds = Array.from(
    document.querySelectorAll(".origin-filter-checkbox:checked")
  ).map(cb => Number(cb.getAttribute("data-ori-id")));

  const maxPrice = Number(document.getElementById("priceRange")?.value);
  const searchTerm = document.getElementById("product-search")?.value.toLowerCase().trim();

  // Aplica todos os filtros de uma vez
  filteredProducts = products.filter((p) => {
    const catMatch = selectedCatIds.length === 0 || selectedCatIds.includes(p.categoryId);
    const oriMatch = selectedOriIds.length === 0 || selectedOriIds.includes(p.originId);
    const priceMatch = p.price <= maxPrice;

    // Pesquisa em múltiplos campos simultaneamente
    const searchMatch = !searchTerm || (
      p.name.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.tags?.some(t => t.toLowerCase().includes(searchTerm)) ||
      p.origin?.toLowerCase().includes(searchTerm) ||
      p.category?.toLowerCase().includes(searchTerm) ||
      p.apicultorName?.toLowerCase().includes(searchTerm)
    );

    return catMatch && oriMatch && priceMatch && searchMatch;
  });

  // Analytics: regista pesquisas com mais de 3 caracteres (com debounce)
  if (searchTerm.length >= 3) {
    clearTimeout(window.searchLogTimeout);
    window.searchLogTimeout = setTimeout(() => {
      logInteraction("search", { term: searchTerm, resultsCount: filteredProducts.length });
    }, 1000);
  }

  currentPage = 1;
  renderProducts();
}
```

### Prevenção de XSS (Cross-Site Scripting)

Ao inserir dados dinâmicos no HTML, é crucial escapar caracteres especiais para evitar ataques XSS:

```javascript
function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Usado nas sugestões de pesquisa para garantir segurança
suggestionsBox.innerHTML = suggestions.map(value => `
  <button data-suggestion-value="${escapeHtml(value)}">
    <span>${escapeHtml(value)}</span>
  </button>
`).join("");
```

---

## 6.7 Módulo `checkout.js` — O Processo de Compra

O checkout é implementado como uma **Classe ES6** chamada `CheckoutManager` que gere um fluxo de 2 passos guiados.

### Inicialização e Verificações de Segurança

```javascript
class CheckoutManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 2;
    this.token = localStorage.getItem("token");
    this.init();
  }

  async init() {
    // 1. Redireciona se não está logado
    if (!this.token) {
      window.location.href = "login.html";
      return;
    }

    // 2. Carrega dados em paralelo (carrinho + perfil do utilizador)
    await Promise.all([cart.syncWithBackend(), this.fetchUserProfile()]);

    // 3. Verifica se o utilizador passou pela verificação 2FA
    if (this.userData?.checkoutVerified !== true) {
      Swal.fire({
        icon: "info",
        title: "Verificação Necessária",
        text: "Para tua segurança, precisamos de validar a tua sessão.",
      }).then(() => {
        window.location.href = "profile.html?tab=security";
      });
      return;
    }

    // 4. Redireciona para a loja se o carrinho estiver vazio
    if (cart.items.length === 0 && !this.currentOrderId) {
      window.location.href = "shop.html";
      return;
    }

    this.renderSummary();
    this.setupListeners();

    // 5. Regista o início do checkout no sistema de analytics
    logInteraction("checkout_start", {
      itemCount: cart.items.length,
      totalValue: cart.items.reduce((acc, item) => acc + item.Preco * item.Quantidade, 0)
    });
  }
}
```

### Transição entre Passos com View Transitions API

A transição entre o Passo 1 (Dados) e o Passo 2 (Pagamento) usa a **View Transitions API** nativa do browser para uma animação suave:

```javascript
async nextStep() {
  // Valida os campos obrigatórios do passo atual
  const inputs = document.querySelectorAll(`#step-content-${this.currentStep} input[required]`);
  let valid = true;
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.style.borderColor = "red";
      valid = false;
    }
  });
  if (!valid) {
    return Swal.fire("Campos Obrigatórios", "Preenche todos os campos.", "warning");
  }

  // Inicializa a encomenda no backend (cria registo "Pendente" na BD)
  const res = await fetch(`${API_URL}/checkout/init`, {
    method: "POST",
    headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ address, phone, shippingType, shippingCost }),
  });
  const data = await res.json();
  this.currentOrderId = data.orderId;  // Guarda o ID da encomenda

  // Limpa o carrinho local (a encomenda está agora na BD)
  cart.clear();

  // Transição animada para o passo seguinte
  this.currentStep++;
  if (document.startViewTransition) {
    document.startViewTransition(() => this.updateUI());  // Animação nativa
  } else {
    this.updateUI();  // Fallback para browsers sem suporte
  }
}
```

### Submissão Final — Redirecionar para o Stripe

```javascript
async handleFinalSubmit() {
  const btn = document.getElementById("final-submit-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A redirecionar...';

  const res = await fetch(`${API_URL}/checkout/create-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    },
    body: JSON.stringify({ address, phone, shippingCost, orderId: this.currentOrderId }),
  });

  const data = await res.json();

  if (res.ok && data.url) {
    // Redireciona para a página do Stripe Checkout
    window.location.href = data.url;
  } else {
    Swal.fire("Erro no Checkout", data.error, "error");
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
```

---

## 6.8 Módulo `analytics.js` — Monitorização Silenciosa

O sistema de analytics foi desenhado com um princípio fundamental: **nunca quebrar a aplicação**. Se o servidor de analytics falhar, o utilizador não deve notar nada.

```javascript
export async function logInteraction(tipo, dados = {}) {
  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) return;  // Sem backend, sem analytics — mas sem erro

    const token = localStorage.getItem("token");
    const pagina = window.location.pathname.split("/").pop() || "index.html";

    await fetch(`${API_URL}/logs/interaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),  // Anónimo se não logado
      },
      body: JSON.stringify({ tipo, pagina, dados }),
    });
  } catch {
    // Silently fail — analytics NUNCA pode quebrar a aplicação
  }
}
```

### Tipos de Eventos Registados

| Tipo de Evento | Quando é Chamado | Dados Extras |
|----------------|-----------------|--------------|
| `page_view` | Ao carregar qualquer página | `{ pagina }` |
| `product_view` | Ao abrir o modal de detalhes | `{ productId, productName }` |
| `add_to_cart` | Ao adicionar um produto | `{ productId, quantity }` |
| `search` | Após 1 segundo de inatividade na pesquisa | `{ term, resultsCount }` |
| `checkout_start` | Ao entrar na página de checkout | `{ itemCount, totalValue }` |
| `order_placed` | Após confirmar a encomenda | `{ orderId, total }` |
| `click` | Em qualquer botão ou link | `{ element, label, id, href }` |

### Rastreamento Automático de Cliques

```javascript
export function setupAutoTracking() {
  // Ouve TODOS os cliques na página
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, a, .track-click");
    if (!target) return;

    const label = target.innerText?.trim() || target.id || "unnamed";
    logInteraction("click", {
      element: target.tagName.toLowerCase(),
      label: label.substring(0, 50),  // Limita a 50 caracteres
      id: target.id || null,
      href: target.getAttribute("href") || null,
    });
  }, { passive: true });  // passive: true não bloqueia o scroll
}
```

---

## 6.9 Módulo `beeAnimation.js` — Abelhas com Física

O BeeAnimator é o elemento visual mais distinto do Hexomel. Implementa animação procedural de abelhas com efeito parallax usando matemática trigonométrica.

### A Classe BeeSystem

```javascript
class BeeSystem {
  constructor() {
    this.bees = document.querySelectorAll(".bee-decoration");
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;  // Para interpolação suave (lerp)
    this.targetY = 0;
    this.init();
  }

  init() {
    // Distribui as abelhas nos dois lados da página
    this.bees.forEach((bee, index) => {
      const isInverse = bee.src.includes("abelha_inverso.webp");
      const yPos = 10 + Math.random() * 80;  // Posição vertical aleatória

      if (isInverse) {
        bee.style.right = `${100 - (60 + Math.random() * 35)}%`;  // Lado direito
      } else {
        bee.style.left = `${5 + Math.random() * 35}%`;  // Lado esquerdo
      }
      bee.style.top = `${yPos}%`;

      // Guarda a posição inicial para o cálculo de parallax
      bee.dataset.baseX = xPos;
      bee.dataset.baseY = yPos;
    });

    // Regista a posição do rato
    document.addEventListener("mousemove", (e) => {
      // Normaliza: -1 (esquerda) a +1 (direita)
      this.mouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      this.mouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    });

    this.animate();  // Inicia o loop de animação
  }

  animate() {
    const time = Date.now() * 0.0008;

    // LERP (Linear Interpolation): movimento suave em direção ao rato
    // Fórmula: atual += (destino - atual) * fator
    // fator = 0.03 → movimento muito suave e inercial
    this.targetX += (this.mouseX - this.targetX) * 0.03;
    this.targetY += (this.mouseY - this.targetY) * 0.03;

    this.bees.forEach((bee, index) => {
      const offset = index * 1.5;  // Cada abelha tem fase diferente

      // 1. Flutuação natural com seno e coseno combinados
      const floatX = Math.sin(time + offset) * 20 + Math.cos(time * 0.5 + offset) * 10;
      const floatY = Math.cos(time * 0.7 + offset) * 25 + Math.sin(time * 0.3 + offset) * 10;
      const rotate = Math.sin(time * 0.4 + offset) * 15;  // Rotação suave

      // 2. Parallax: abelhas mais "perto" movem-se mais com o rato
      const depth = 50 + (index % 3) * 25;  // 50, 75 ou 100px de profundidade
      const parallaxX = this.targetX * depth;
      const parallaxY = this.targetY * depth;

      // 3. Aplica a transformação combinada
      bee.style.transform = `translate(${floatX + parallaxX}px, ${floatY + parallaxY}px) rotate(${rotate}deg)`;
    });

    // Agenda o próximo frame (~60 FPS)
    requestAnimationFrame(() => this.animate());
  }
}
```

**Conceitos matemáticos utilizados:**
- `Math.sin()` e `Math.cos()` — criam movimentos oscilatórios cíclicos (flutuação)
- **LERP (Linear Interpolation)** — suaviza o seguimento do rato (sem LERP seria brusco)
- `requestAnimationFrame()` — sincroniza com o browser para 60 FPS sem consumo excessivo
- `depth` — simula perspetiva: abelhas "mais perto" têm maior parallax

---

## 6.10 O Backend — `server.js`

O `server.js` é o ficheiro central do backend, com cerca de **5500 linhas** de código. Contém todas as rotas da API REST.

### Estrutura do Servidor

```javascript
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const nodemailer = require("nodemailer");

const app = express();

// Middlewares globais
app.use(express.json({ limit: "10mb" }));    // Parse de JSON nos pedidos
app.use(express.urlencoded({ extended: true }));

// Ligação à base de dados MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "hexomel",
});
```

### Middleware de Autenticação JWT

Todas as rotas protegidas passam por este middleware antes de executar a lógica:

```javascript
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];  // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // { id, email, role } disponível nas rotas seguintes
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
};

// Middleware de verificação de perfil (Admin, Apicultor)
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: "Acesso não autorizado para este perfil" });
  }
  next();
};
```

### Rota de Login — Suporte a Email e Username

```javascript
app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;

  // Procura por email OU username
  const [rows] = await db.query(
    "SELECT * FROM cliente WHERE Email = ? OR Username = ?",
    [identifier, identifier]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const user = rows[0];

  // Verifica a password com bcrypt (compara o input com o hash guardado)
  const isValid = await bcrypt.compare(password, user.Senha);
  if (!isValid) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  // Gera o token JWT (válido por 7 dias)
  const token = jwt.sign(
    { id: user.ID_Cliente, email: user.Email, role: user.UserType },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.ID_Cliente,
      name: user.Nome,
      email: user.Email,
      role: user.UserType,
      picture: user.Picture,
    }
  });
});
```

### Rota de Criação de Sessão Stripe

```javascript
app.post("/api/checkout/create-session", verifyToken, async (req, res) => {
  const { orderId, shippingCost } = req.body;

  // Busca os itens da encomenda
  const [items] = await db.query(
    "SELECT ie.*, p.Nome, p.Imagem FROM item_encomenda ie JOIN produto p ON p.ID_Produto = ie.ID_Produto WHERE ie.ID_Encomenda = ?",
    [orderId]
  );

  // Determina a URL base das imagens (Ngrok em dev, URL pública em produção)
  const baseUrl = process.env.CHECKOUT_PUBLIC_BASE_URL || `http://localhost:${PORT}`;

  // Cria os line_items para o Stripe
  const lineItems = items.map(item => ({
    price_data: {
      currency: "eur",
      product_data: {
        name: item.Nome,
        images: item.Imagem ? [`${baseUrl}${item.Imagem}`] : [],
      },
      unit_amount: Math.round(item.Preco_Unitario * 100),  // Stripe usa cêntimos
    },
    quantity: item.Quantidade,
  }));

  // Cria a sessão de checkout no Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cancel.html`,
  });

  res.json({ url: session.url });  // Frontend redireciona para este URL
});
```

---

## 6.11 Processo de Desenvolvimento — Do Início ao Fim

O desenvolvimento do Hexomel seguiu um processo iterativo dividido em fases:

### Fase 1 — Prototipagem e Estrutura Base
- Criação da estrutura de pastas e configuração do Vite;
- Design do esquema inicial da base de dados (v1.0 com 5 tabelas);
- Implementação da autenticação básica (login/registo);
- Setup do servidor Express com conexão ao MySQL.

### Fase 2 — Funcionalidades Core
- Desenvolvimento da loja com produtos e carrinho;
- Sistema de encomendas básico;
- Perfil de utilizador com edição de dados;
- Dashboard do apicultor com gestão de produtos.

### Fase 3 — Funcionalidades Avançadas
- Integração do Stripe para pagamentos;
- Implementação do 2FA por email (Nodemailer);
- Sistema de analytics comportamental;
- Visualização 3D com Three.js;
- Fórum de comunidade Q&A.

### Fase 4 — Qualidade e Polimento
- Adição de skeleton loaders em todas as páginas;
- Sistema de tradução i18n (PT/EN);
- Sistema de notificações toast personalizadas;
- BeeAnimator com parallax;
- Responsividade completa (320px a 1440px);
- Migração do charset para `utf8mb4`.

### Fase 5 — Segurança e Robustez
- Implementação de middleware de autorização por perfil;
- Proteção de rotas admin;
- Sanitização de inputs e prevenção de XSS;
- Moderação automática do fórum (PurgoMalum);
- Sistema de URLs amigáveis (slugs) para SEO;
- Suporte a Google OAuth 2.0.

### Ferramentas de Desenvolvimento Utilizadas

| Ferramenta | Função |
|-----------|--------|
| **Visual Studio Code** | Editor de código principal |
| **Git** | Controlo de versões |
| **MySQL Workbench** | Gestão e modelação da BD |
| **Postman / VS Code REST Client** | Teste das rotas da API |
| **Vite Dev Server** | Servidor de desenvolvimento com HMR |
| **Ngrok** | Túnel HTTPS para testes com Stripe |
| **Node.js scripts** | Automação de setup e migrações da BD |

---

## 6.12 Decisões Técnicas e Aprendizagens

### O que correu bem

1. **Arquitetura modular:** A separação em módulos ES6 facilitou o desenvolvimento e a manutenção. Cada ficheiro tem uma responsabilidade clara.

2. **Classe `CartManager`:** Encapsular o carrinho numa classe tornou muito mais simples gerir o estado complexo de sincronização entre localStorage e base de dados.

3. **`pre-load.js` anti-flickering:** Esta solução criativa eliminou completamente o problema do flash de conteúdo não estilizado, algo que normalmente obriga ao uso de frameworks.

4. **Analytics não-bloqueante:** O design do módulo `analytics.js` com `try/catch` e falha silenciosa garantiu que problemas no servidor de analytics nunca afetaram a experiência do utilizador.

### Desafios superados

1. **Sincronização do carrinho:** Garantir que o estado do carrinho ficava consistente entre o localStorage, a base de dados e a interface visual foi o maior desafio técnico.

2. **Stripe em desenvolvimento local:** O Stripe precisa de URLs públicas HTTPS para imagens. Resolver isto com suporte nativo a Ngrok e o sistema de dynamic image mocking foi uma solução criativa e profissional.

3. **JWT vs sessões:** A transição de um sistema de sessões para JWT exigiu repensar toda a gestão de estado da aplicação, mas o resultado é mais escalável e robusto.

4. **View Transitions API:** A API ainda está em fase de adoção, o que exigiu implementar fallbacks para browsers sem suporte.

---

*Capítulo elaborado para a PAP — Hexomel | Colégio de Gaia | Ano Letivo 2025/2026*
