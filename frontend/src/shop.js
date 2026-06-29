// Shop page JavaScript - handles product display
import "./styles/index.css";
const API_URL = "/api";
// import "./styles/modern.css"; // Already in HTML
import { cart } from "./cart.js";
import Swal from "sweetalert2";
import { logInteraction, trackPageView } from "./analytics.js";
import { Skeleton } from "./skeleton.js";
import { getLoggedUser } from "./auth.js";

// Easy-to-edit config
const SHOP_CONFIG = {
  fallbackImage: "/images/default-product.png",
  productsPerPage: 9,
  maxSuggestions: 6,
  minSearchCharsForSuggestions: 2,
  minSearchCharsForAnalytics: 3,
  searchAnalyticsDebounceMs: 1000,
  defaultPriceFallback: 100,
  skeletonProductCount: 6,
};

// State
let products = [];
let filteredProducts = [];
let categories = [];
let origins = [];
let userFavorites = [];
let activeSuggestionIndex = -1;
let currentSuggestions = [];
let currentPage = 1;
let layoutAnimationStyle = "fade";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSearchSuggestionPool() {
  const suggestions = new Map();

  products.forEach((product) => {
    [
      product.name,
      product.category,
      product.origin,
      product.apicultorName,
      ...(product.tags || []),
    ]
      .filter(Boolean)
      .forEach((value) => {
        const normalized = value.trim();
        const key = normalized.toLowerCase();
        if (key && !suggestions.has(key)) {
          suggestions.set(key, normalized);
        }
      });
  });

  return Array.from(suggestions.values());
}

function setActiveSuggestion(index) {
  const items = document.querySelectorAll(".search-suggestion-item");
  items.forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex === index);
  });
  activeSuggestionIndex = index;
}

function hideSuggestions() {
  const suggestionsBox = document.getElementById("search-suggestions");
  if (!suggestionsBox) return;

  suggestionsBox.innerHTML = "";
  suggestionsBox.classList.add("d-none");
  currentSuggestions = [];
  activeSuggestionIndex = -1;
}

function applySuggestion(value) {
  const searchInput = document.getElementById("product-search");
  if (!searchInput) return;

  searchInput.value = value;
  syncSearchUi(value.trim());
  hideSuggestions();
  applyFilters();
  searchInput.focus();
}

function renderSuggestions(searchTerm) {
  const suggestionsBox = document.getElementById("search-suggestions");
  if (!suggestionsBox) return;

  const normalizedTerm = searchTerm.toLowerCase().trim();
  if (normalizedTerm.length < SHOP_CONFIG.minSearchCharsForSuggestions) {
    hideSuggestions();
    return;
  }

  currentSuggestions = getSearchSuggestionPool()
    .filter((value) => value.toLowerCase().includes(normalizedTerm))
    .slice(0, SHOP_CONFIG.maxSuggestions);

  if (currentSuggestions.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsBox.innerHTML = currentSuggestions
    .map(
      (value, index) => `
        <button
          type="button"
          class="search-suggestion-item"
          data-suggestion-index="${index}"
          data-suggestion-value="${escapeHtml(value)}"
        >
          <i class="fas fa-search"></i>
          <span>${escapeHtml(value)}</span>
        </button>
      `,
    )
    .join("");

  suggestionsBox.classList.remove("d-none");
  activeSuggestionIndex = -1;

  suggestionsBox.querySelectorAll(".search-suggestion-item").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      applySuggestion(button.dataset.suggestionValue || "");
    });
  });
}

function syncSearchUi(searchTerm = "") {
  const clearButton = document.getElementById("clear-search");
  if (!clearButton) return;

  clearButton.classList.toggle("d-none", !searchTerm);
}

function initSearchControls() {
  const searchInput = document.getElementById("product-search");
  const clearButton = document.getElementById("clear-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim();
    syncSearchUi(term);
    renderSuggestions(term);
    applyFilters();
  });

  searchInput.addEventListener("search", () => {
    const term = searchInput.value.trim();
    syncSearchUi(term);
    renderSuggestions(term);
    applyFilters();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (currentSuggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex =
        activeSuggestionIndex < currentSuggestions.length - 1
          ? activeSuggestionIndex + 1
          : 0;
      setActiveSuggestion(nextIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        activeSuggestionIndex > 0
          ? activeSuggestionIndex - 1
          : currentSuggestions.length - 1;
      setActiveSuggestion(nextIndex);
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      applySuggestion(currentSuggestions[activeSuggestionIndex]);
      return;
    }

    if (event.key === "Escape") {
      hideSuggestions();
    }
  });

  searchInput.addEventListener("blur", () => {
    window.setTimeout(hideSuggestions, 120);
  });

  searchInput.addEventListener("focus", () => {
    const term = searchInput.value.trim();
    if (term.length >= SHOP_CONFIG.minSearchCharsForSuggestions) {
      renderSuggestions(term);
    }
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      syncSearchUi();
      hideSuggestions();
      applyFilters();
      searchInput.focus();
    });
  }

  document.addEventListener("click", (event) => {
    const wrapper = event.target.closest(".premium-search-wrapper");
    if (!wrapper) {
      hideSuggestions();
    }
  });

  syncSearchUi(searchInput.value.trim());
}

// Fetch products from API and categories
async function fetchProducts() {
  const grid = document.getElementById("products-grid");

  // Carregar estilo de placeholder configurado pelo admin
  await Skeleton.init();

  // Mostrar skeleton placeholders enquanto carrega
  if (grid) {
    grid.innerHTML = Skeleton.productGrid(SHOP_CONFIG.skeletonProductCount);
  }

  try {
    // 1. Fetch Categories, Origins and Products
    const [catRes, oriRes, res] = await Promise.all([
      fetch(`${API_URL}/categories`),
      fetch(`${API_URL}/origins`),
      fetch(`${API_URL}/products`),
    ]);

    if (!catRes.ok) throw new Error(`Falha ao carregar categorias: ${catRes.status}`);
    if (!oriRes.ok) throw new Error(`Falha ao carregar origens: ${oriRes.status}`);

    categories = await catRes.json();
    origins = await oriRes.json();

    // Render dynamic filters
    renderCategoryFilters();
    renderOriginFilters();

    // 2. Parse Products
    if (!res.ok) throw new Error(`Falha ao carregar produtos: ${res.status}`);
    const data = await res.json();

    products = data.map((p) => {
      const catObj = categories.find((c) => c.ID_Categoria === p.ID_Categoria);
      const catName = catObj ? catObj.Nome : "Sem Categoria";

      const oriObj = origins.find((o) => o.ID_Origem === p.ID_Origem);
      const oriName = oriObj ? oriObj.Nome : "N/A";

      return {
        id: p.ID_Produto,
        name: p.Nome,
        price: Number(p.Preco),
        description: p.Descricao,
        category: catName,
        origin: oriName,
        categoryId: p.ID_Categoria,
        originId: p.ID_Origem,
        apicultorId: p.ID_Apicultor || null,
        apicultorName: p.ApicultorNome || "Hexomel",
        apicultorFoto: p.ApicultorFoto || null,
        image: p.Imagem || `/img/produtos/${p.ID_Produto}.webp`,
        weight: "500g",
        tags: p.Tags ? p.Tags.split(",").map((t) => t.trim()) : [],
        rating: p.Rating || 0,
        reviewCount: p.ReviewCount || 0,
        slug: p.Slug || null,
        stock: p.Stock !== undefined ? p.Stock : 0,
      };
    });

    filteredProducts = [...products];
    
    // 3. Initialize dynamic price filter
    const maxPrice = products.length > 0 ? Math.ceil(Math.max(...products.map(p => p.price))) : 100;
    initPriceSlider(maxPrice);
    
    renderProducts();
  } catch (error) {
    console.error("Error fetching data:", error);
    // Mostrar estado de erro com botão de retry
    if (grid) {
      grid.innerHTML = Skeleton.stateError('Não foi possível carregar os produtos. Verifica a tua ligação e tenta novamente.', 'retry-products-btn');
      Skeleton.onRetry('retry-products-btn', () => fetchProducts());
    }
  }
}

// Dynamically Render Category Checkboxes in the Sidebar
function renderCategoryFilters() {
  const container = document.getElementById("dynamic-categories-container");
  if (!container) return; // if shop.html is not updated yet

  container.innerHTML = categories
    .map(
      (cat) => `
    <label class="custom-checkbox-container">
      <input
        type="checkbox"
        id="cat-${cat.ID_Categoria}"
        class="custom-checkbox-input category-filter-checkbox"
        data-cat-id="${cat.ID_Categoria}"
      />
      <span class="custom-checkbox-visual"></span>
      <span class="checkbox-label-text">${cat.Nome}</span>
    </label>
  `,
    )
    .join("");

  // Re-bind events for newly created checkboxes
  const newCheckboxes = document.querySelectorAll(".category-filter-checkbox");
  newCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilters));
}

// Dynamically Render Origin Checkboxes in the Sidebar
function renderOriginFilters() {
  const container = document.getElementById("dynamic-origins-container");
  if (!container) return;

  container.innerHTML = origins
    .map(
      (ori) => `
    <label class="custom-checkbox-container">
      <input
        type="checkbox"
        id="ori-${ori.ID_Origem}"
        class="custom-checkbox-input origin-filter-checkbox"
        data-ori-id="${ori.ID_Origem}"
      />
      <span class="custom-checkbox-visual"></span>
      <span class="checkbox-label-text">${ori.Nome}</span>
    </label>
  `,
    )
    .join("");

  // Re-bind events
  const newCheckboxes = document.querySelectorAll(".origin-filter-checkbox");
  newCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilters));
}

// Initialize Price Slider based on dynamic data
function initPriceSlider(max) {
  const slider = document.getElementById("priceRange");
  const priceVal = document.getElementById("priceVal");
  if (!slider || !priceVal) return;

  slider.max = max;
  slider.value = max;
  priceVal.textContent = max + "€";
}

function renderPagination() {
  const pagination = document.getElementById("products-pagination");
  if (!pagination) return;

  const totalPages = Math.ceil(filteredProducts.length / SHOP_CONFIG.productsPerPage);
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    pagination.classList.add("d-none");
    return;
  }

  pagination.classList.remove("d-none");

  const pageButtons = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `
      <button
        type="button"
        class="pagination-pill ${page === currentPage ? "active" : ""}"
        onclick="window.goToProductsPage(${page})"
      >
        ${page}
      </button>
    `;
  }).join("");

  pagination.innerHTML = `
    <button
      type="button"
      class="pagination-pill pagination-nav"
      onclick="window.goToProductsPage(${currentPage - 1})"
      ${currentPage === 1 ? "disabled" : ""}
    >
      Anterior
    </button>
    <div class="pagination-pages">${pageButtons}</div>
    <button
      type="button"
      class="pagination-pill pagination-nav"
      onclick="window.goToProductsPage(${currentPage + 1})"
      ${currentPage === totalPages ? "disabled" : ""}
    >
      Seguinte
    </button>
  `;
}

// Render products (Nike Style)
function renderProducts() {
  const grid = document.getElementById("products-grid");
  const pagination = document.getElementById("products-pagination");

  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = Skeleton.stateEmpty('Nenhum produto encontrado com os filtros selecionados.', 'fa-search');
    if (pagination) {
      pagination.innerHTML = "";
      pagination.classList.add("d-none");
    }
    return;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / SHOP_CONFIG.productsPerPage),
  );
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * SHOP_CONFIG.productsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + SHOP_CONFIG.productsPerPage,
  );

  const currentView = localStorage.getItem("shopProductView") || "grid";

  if (currentView === "grid") {
    grid.innerHTML = paginatedProducts
      .map(
        (product) => `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="product-card-premium h-100 position-relative d-flex flex-column">
          <div class="product-img-container" style="cursor: pointer" onclick="window.location.href='/produto/${product.slug || product.id}'">
            <div class="product-tags-container">
              ${product.tags
                .map(
                  (tag) => `
                <div class="product-badge tag-${tag.toLowerCase().replace(/\s+/g, "-")}">${tag}</div>
              `,
                )
                .join("")}
            </div>
            <img src="${product.image}" alt="${product.name}" onerror="this.src='${SHOP_CONFIG.fallbackImage}'">
          </div>
          <div class="p-3 d-flex flex-column flex-grow-1">
            <div onclick="window.location.href='/produto/${product.slug || product.id}'" style="cursor: pointer" class="mb-2">
                <h5 class="fw-bold mb-1" style="min-height: 2.2rem; font-size: 1.1rem;">${product.name}</h5>
                <div class="star-rating">
                  ${generateStars(product.rating)} 
                  <span class="text-muted small">(${product.reviewCount})</span>
                </div>
                <p class="text-muted small mb-0">${product.category} • ${product.weight}</p>
                <p class="text-muted smaller mb-1"><i class="fas fa-map-marker-alt me-1"></i>${product.origin}</p>
                ${
                  product.apicultorId
                    ? `<p class="smaller mb-0" style="color:var(--primary-gold)">
                        <i class="fas fa-user-tie me-1"></i>Vendido por: 
                        <a href="profile.html?id=${product.apicultorId}" class="fw-bold text-decoration-none" style="color:inherit" onclick="event.stopPropagation()">
                          ${product.apicultorName}
                        </a>
                      </p>`
                    : `<p class="smaller mb-0 text-muted"><i class="fas fa-check-circle me-1 text-success"></i>Original Hexomel</p>`
                }
            </div>
            <div class="d-flex justify-content-between align-items-center mt-auto gap-2 pt-2 border-top">
              <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${product.price.toFixed(2)}</span>
              
              <div class="d-flex gap-2">

                <button class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect" 
                        style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.85rem; padding: 0 !important; flex-shrink: 0;" 
                        onclick="event.stopPropagation(); window.addToCart(${product.id})"
                        title="Adicionar ao Carrinho">
                    <i class="fas fa-shopping-cart" style="font-size: 0.75rem;"></i>
                </button>
                <button class="btn btn-soft-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect ${isFavorited(product.id) ? "active" : ""}" 
                        style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.75rem; padding: 0 !important; flex-shrink: 0;" 
                        id="btn-fav-${product.id}"
                        onclick="window.toggleFavorite(${product.id})">
                    <i class="fas fa-heart"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  } else {
    grid.innerHTML = paginatedProducts
      .map(
        (product) => `
      <div class="col-12">
        <div class="product-card-list-view">
          <div class="product-img-container" style="cursor: pointer" onclick="window.location.href='/produto/${product.slug || product.id}'">
            <div class="product-tags-container">
              ${product.tags
                .map(
                  (tag) => `
                <div class="product-badge tag-${tag.toLowerCase().replace(/\s+/g, "-")}">${tag}</div>
              `,
                )
                .join("")}
            </div>
            <img src="${product.image}" alt="${product.name}" onerror="this.src='${SHOP_CONFIG.fallbackImage}'">
          </div>
          <div class="list-body">
            <div onclick="window.location.href='/produto/${product.slug || product.id}'" style="cursor: pointer" class="mb-3">
                <h5 class="fw-bold mb-1">${product.name}</h5>
                <div class="star-rating mb-2">
                  ${generateStars(product.rating)} 
                  <span class="text-muted small">(${product.reviewCount})</span>
                </div>
                <p class="text-muted small mb-0">${product.category} • ${product.weight}</p>
                <p class="text-muted smaller mb-1"><i class="fas fa-map-marker-alt me-1"></i>${product.origin}</p>
                ${
                  product.apicultorId
                    ? `<p class="smaller mb-0" style="color:var(--primary-gold)">
                        <i class="fas fa-user-tie me-1"></i>Vendido por: 
                        <a href="profile.html?id=${product.apicultorId}" class="fw-bold text-decoration-none" style="color:inherit" onclick="event.stopPropagation()">
                          ${product.apicultorName}
                        </a>
                      </p>`
                    : `<p class="smaller mb-0 text-muted"><i class="fas fa-check-circle me-1 text-success"></i>Original Hexomel</p>`
                }
            </div>
            <div class="d-flex justify-content-between align-items-center mt-auto gap-2 pt-2 border-top">
              <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${product.price.toFixed(2)}</span>
              
              <div class="d-flex gap-2">

                <button class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect" 
                        style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.85rem; padding: 0 !important; flex-shrink: 0;" 
                        onclick="event.stopPropagation(); window.addToCart(${product.id})"
                        title="Adicionar ao Carrinho">
                    <i class="fas fa-shopping-cart" style="font-size: 0.75rem;"></i>
                </button>
                <button class="btn btn-soft-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect ${isFavorited(product.id) ? "active" : ""}" 
                        style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.75rem; padding: 0 !important; flex-shrink: 0;" 
                        id="btn-fav-${product.id}"
                        onclick="window.toggleFavorite(${product.id})">
                    <i class="fas fa-heart"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  renderPagination();
}

window.goToProductsPage = function (page) {
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / SHOP_CONFIG.productsPerPage),
  );
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderProducts();

  const toolbar = document.querySelector(".shop-toolbar");
  toolbar?.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

// Filtering Logic
function applyFilters() {
  // 1. Get checked dynamic categories
  const selectedCatIds = Array.from(
    document.querySelectorAll(".category-filter-checkbox:checked"),
  ).map((cb) => Number(cb.getAttribute("data-cat-id")));

  const selectedOriIds = Array.from(
    document.querySelectorAll(".origin-filter-checkbox:checked"),
  ).map((cb) => Number(cb.getAttribute("data-ori-id")));

  const selectedVendors = Array.from(
    document.querySelectorAll(".vendor-filter-checkbox:checked"),
  ).map((cb) => cb.value);

  // 2. Get price range
  const maxPrice = Number(
    document.getElementById("priceRange")?.value || SHOP_CONFIG.defaultPriceFallback,
  );

  // 3. Get search term
  const searchInput = document.getElementById("product-search");
  const searchTerm = searchInput?.value.toLowerCase().trim() || "";

  // Filter
  filteredProducts = products.filter((p) => {
    let catMatch = true;
    let oriMatch = true;
    let vendorMatch = true;
    let searchMatch = true;

    if (selectedCatIds.length > 0) {
      catMatch = selectedCatIds.includes(p.categoryId);
    }

    if (selectedOriIds.length > 0) {
      oriMatch = selectedOriIds.includes(p.originId);
    }

    if (selectedVendors.length > 0) {
      if (
        selectedVendors.includes("hexomel") &&
        selectedVendors.includes("apicultor")
      ) {
        vendorMatch = true; // Both selected, show all
      } else if (selectedVendors.includes("hexomel")) {
        vendorMatch = p.apicultorId === null; // Hexomel means no Apicultor
      } else if (selectedVendors.includes("apicultor")) {
        vendorMatch = p.apicultorId !== null; // Community means it has an Apicultor
      }
    }

    if (searchTerm) {
      const nameMatch = p.name.toLowerCase().includes(searchTerm);
      const descMatch = p.description?.toLowerCase().includes(searchTerm);
      const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(searchTerm));
      const originMatch = p.origin?.toLowerCase().includes(searchTerm);
      const categoryMatch = p.category?.toLowerCase().includes(searchTerm);
      const sellerMatch = p.apicultorName?.toLowerCase().includes(searchTerm);
      searchMatch =
        nameMatch ||
        descMatch ||
        tagMatch ||
        originMatch ||
        categoryMatch ||
        sellerMatch;
    }

    let priceMatch = p.price <= maxPrice;

    return catMatch && oriMatch && vendorMatch && priceMatch && searchMatch;
  });

  // Track Search (Debounced logic or only if searchTerm has length)
  if (searchTerm.length >= SHOP_CONFIG.minSearchCharsForAnalytics) {
    if (window.searchLogTimeout) clearTimeout(window.searchLogTimeout);
    window.searchLogTimeout = setTimeout(() => {
        logInteraction("search", { term: searchTerm, resultsCount: filteredProducts.length });
    }, SHOP_CONFIG.searchAnalyticsDebounceMs);
  }

  // 3. Apply Multi-Directional Sorting
  const sortValue =
    document.getElementById("sort-select")?.value || "Mais recentes";

  if (sortValue === "Preço: Baixo-Alto") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortValue === "Preço: Alto-Baixo") {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else {
    // Default: Newest (using ID as proxy for date if no date field)
    filteredProducts.sort((a, b) => b.id - a.id);
  }

  currentPage = 1;
  renderProducts();
}

// Product Details Modal Logic (Minimalist)
window.openProductDetails = async function (productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  // Track product view interaction
  logInteraction("product_view", { productId: product.id, productName: product.name });

  const modalHtml = `
    <div class="details-overlay" id="detailsOverlay">
      <div class="details-card-minimal" style="border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(0,0,0,0.05);">
        <button class="details-close-minimal" onclick="window.closeProductDetails()">×</button>
        
        <div class="details-image-section" style="background: #fafafa;">
          <img src="${product.image}" onerror="this.src='${SHOP_CONFIG.fallbackImage}'" alt="${product.name}" style="border-radius: 16px;">
        </div>
        
        <div class="details-info-section" style="padding: 50px 40px;">
          <!-- Tags -->
          ${product.tags && product.tags.length > 0 ? `
            <div class="produto-tags-top d-flex flex-wrap gap-2 mb-3">
              ${product.tags.map(t => `<span class="badge-tag" style="background: rgba(244, 180, 0, 0.08); border: 1px solid rgba(244, 180, 0, 0.15); border-radius: 6px; padding: 4px 10px; font-size: 0.68rem; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px;">${t}</span>`).join("")}
            </div>
          ` : ""}
          
          <h2 class="fw-bold mb-2" style="font-family: 'Outfit', sans-serif; font-size: 2rem; color: #1e293b; letter-spacing: 0; text-transform: none;">${product.name}</h2>
          
          <div class="star-rating-lg d-flex align-items-center gap-2 mb-3" style="color: #f4b400;">
            ${generateStars(product.rating || 0)}
            <span class="text-muted small">(${product.reviewCount || 0} avaliações)</span>
          </div>

          <div class="minimal-price mb-4" style="font-size: 1.8rem; font-weight: bold; color: var(--primary-green, #1a4d2e); margin-bottom: 20px;">€${product.price.toFixed(2)}</div>

          <div class="minimal-description mb-4" style="font-size: 0.95rem; line-height: 1.7; color: #475569; margin-bottom: 25px; max-width: 100%;">
            ${product.description || "Descrição não disponível para este produto."}
          </div>

          <!-- Product Meta -->
          <div class="mb-4">
            ${product.category ? `
              <div class="produto-meta-item d-flex align-items-center gap-2 mb-2 text-muted" style="font-size: 0.9rem;">
                <i class="fas fa-layer-group" style="width: 20px; color: var(--primary-green, #1a4d2e);"></i>
                <span>Categoria: <strong class="text-dark">${product.category}</strong></span>
              </div>
            ` : ""}
            ${product.origin && product.origin !== "N/A" ? `
              <div class="produto-meta-item d-flex align-items-center gap-2 mb-2 text-muted" style="font-size: 0.9rem;">
                <i class="fas fa-map-marker-alt" style="width: 20px; color: var(--primary-green, #1a4d2e);"></i>
                <span>Origem: <strong class="text-dark">${product.origin}</strong></span>
              </div>
            ` : ""}
            <div class="produto-meta-item d-flex align-items-center gap-2 mb-2 text-muted" style="font-size: 0.9rem;">
              <i class="fas fa-box" style="width: 20px; color: var(--primary-green, #1a4d2e);"></i>
              <span>Stock: <strong class="text-dark">${product.stock > 0 ? `${product.stock} disponíveis` : "Esgotado"}</strong></span>
            </div>
          </div>

          <!-- Seller Badge -->
          ${product.apicultorId ? `
            <a href="profile.html?id=${product.apicultorId}" class="apicultor-badge mb-4 d-inline-flex" style="text-decoration: none;">
              <img src="${(product.apicultorFoto && product.apicultorFoto.trim() !== '' && product.apicultorFoto !== 'null' && product.apicultorFoto !== 'undefined') ? product.apicultorFoto : `https://ui-avatars.com/api/?name=${encodeURIComponent(product.apicultorName || 'A')}&background=random`}" 
                   alt="${product.apicultorName}" 
                   referrerpolicy="no-referrer" 
                   style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(244, 180, 0, 0.3);"
                   onerror="this.src='https://ui-avatars.com/api/?name=A&background=random'">
              <div>
                <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #92400e; font-weight: bold; line-height: 1.1;">Vendido por</div>
                <div class="fw-bold" style="font-size: 0.9rem; color: #78350f;">${product.apicultorName || "Apicultor"}</div>
              </div>
            </a>
          ` : `
            <div class="apicultor-badge hexomel-badge mb-4 d-inline-flex">
              <div class="hexomel-badge-icon d-flex align-items-center justify-content-center">
                <i class="fas fa-check-circle"></i>
              </div>
              <div>
                <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: #1a4d2e; font-weight: bold; line-height: 1.1;">Garantia</div>
                <div class="fw-bold" style="font-size: 0.9rem; color: #1a4d2e;">Original Hexomel</div>
              </div>
            </div>
          `}

          <!-- Actions -->
          <div class="d-flex align-items-center gap-3 mt-3 flex-wrap">
            <div class="qty-selector d-flex align-items-center" style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 0;">
               <button class="qty-btn" onclick="window.updateModalQty(-1, ${product.stock})" style="width: 38px; height: 38px; border: none; background: #f8fafc; font-weight: bold; margin: 0;">-</button>
               <input type="number" id="modal-qty" class="qty-input" value="1" min="1" readonly style="width: 38px; height: 38px; text-align: center; border: none; font-weight: bold; margin: 0;">
               <button class="qty-btn" onclick="window.updateModalQty(1, ${product.stock})" style="width: 38px; height: 38px; border: none; background: #f8fafc; font-weight: bold; margin: 0;">+</button>
            </div>
            
            <button class="btn-minimal-add" onclick="window.addToCartFromDetails(${product.id})" ${product.stock <= 0 ? "disabled" : ""} style="background: var(--primary-green, #1a4d2e); border: none; color: white; border-radius: 8px; padding: 10px 24px; font-weight: bold; height: 40px; display: inline-flex; align-items: center; justify-content: center; letter-spacing: 0.5px; margin: 0;">
              <i class="fas fa-shopping-cart me-2"></i> ${product.stock > 0 ? "Adicionar" : "Esgotado"}
            </button>

            <button class="btn btn-soft-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect ${isFavorited(product.id) ? "active" : ""}" 
                  style="width: 40px; height: 40px; min-width: 40px !important; font-size: 1rem; padding: 0 !important; flex-shrink: 0; background: #f1f5f9; border: none; color: #64748b; margin: 0;" 
                  id="modal-fav-btn"
                  onclick="window.toggleFavorite(${product.id})">
              <i class="fas fa-heart"></i>
            </button>
          </div>

          <!-- Message Button / Support Button -->
          ${product.apicultorId ? `
            <button class="btn btn-outline-success rounded-pill fw-bold px-4 py-2 mt-3 w-100" id="modal-btn-ask-seller" style="border: 2px solid var(--primary-green); color: var(--primary-green); background: transparent; transition: all 0.2s ease; font-size: 0.85rem;" onclick="window.modalAskSeller(${product.id})">
              <i class="fas fa-comment-dots me-2"></i>Perguntar ao Vendedor
            </button>
          ` : `
            <a href="contact.html" class="btn btn-outline-success rounded-pill fw-bold px-4 py-2 mt-3 w-100 d-flex align-items-center justify-content-center" id="modal-btn-contact-support" style="border: 2px solid var(--primary-green); color: var(--primary-green); background: transparent; transition: all 0.2s ease; text-decoration: none; font-size: 0.85rem;">
              <i class="fas fa-envelope me-2"></i>Contactar Apoio ao Cliente
            </a>
          `}

          <!-- Reviews Section -->
          <div class="reviews-section mt-5" style="border-top: 1px solid #e2e8f0; padding-top: 25px;">
            <h3 class="reviews-title" style="font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: bold; color: #1e293b; margin-bottom: 20px;">Avaliações</h3>
            <div id="reviews-list-${product.id}" class="review-list mb-4">
                <p class="text-muted">A carregar avaliações...</p>
            </div>
            
            <div class="review-form-container p-3" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <label class="form-label fw-bold text-dark small mb-1" style="display: block;">A sua avaliação</label>
                <div class="rating-input d-flex gap-1 mb-3" id="rating-input-stars" style="color: #cbd5e1; cursor: pointer; font-size: 1.1rem;">
                    <i class="far fa-star" data-value="1"></i>
                    <i class="far fa-star" data-value="2"></i>
                    <i class="far fa-star" data-value="3"></i>
                    <i class="far fa-star" data-value="4"></i>
                    <i class="far fa-star" data-value="5"></i>
                </div>
                <input type="hidden" id="review-rating-value" value="0">
                
                <label class="form-label fw-bold text-dark small mb-1" style="display: block;">O seu comentário</label>
                <textarea id="review-comment" class="review-textarea" placeholder="Partilhe a sua experiência..." style="width: 100%; min-height: 80px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 0.85rem; outline: none; transition: border 0.2s; background: white; margin-bottom: 15px;"></textarea>
                
                <button class="btn-submit-review" onclick="window.submitReview(${product.id})" style="background: var(--primary-green, #1a4d2e); color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: background 0.2s;">Enviar Avaliação</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  /* Prevent double modal */
  const existing = document.getElementById("detailsOverlay");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Setup Star Rating Interactions
  const stars = document.querySelectorAll("#rating-input-stars i");
  const hiddenInput = document.getElementById("review-rating-value");

  stars.forEach((star) => {
    // Hover effect
    star.addEventListener("mouseover", function () {
      const val = parseInt(this.getAttribute("data-value"));
      stars.forEach((s, idx) => {
        if (idx < val) {
          s.classList.remove("far");
          s.classList.add("fas", "hovered");
          s.style.color = "#f4d03f";
        } else {
          s.classList.remove("fas", "hovered");
          s.classList.add("far");
          s.style.color = "#ddd";
        }
      });
    });

    // Reset on mouseout
    star.parentNode.addEventListener("mouseout", function () {
      const currentRating = parseInt(hiddenInput.value);
      window.setRating(currentRating); // Reset to selected
    });

    // Click to select
    star.addEventListener("click", function () {
      const val = parseInt(this.getAttribute("data-value"));
      window.setRating(val);

      // Add a little pop animation class
      this.classList.add("pop-anim");
      setTimeout(() => this.classList.remove("pop-anim"), 300);
    });
  });

  // Animation
  setTimeout(() => {
    document.getElementById("detailsOverlay").classList.add("active");
  }, 10);

  // Load Reviews
  window.loadReviews(productId);

  // Check favorite state handled by isFavorited in template, but modal btn needs specific ID check if opened later
  updateModalFavBtn(productId);

  setTimeout(() => {
    document.getElementById("detailsOverlay").classList.add("active");
    if (typeof window.updateScrollLock === "function") {
      window.updateScrollLock();
    } else {
      document.documentElement.classList.add("modal-open");
    }
  }, 10);
};

window.updateModalQty = function (change, maxStock = 999) {
  const input = document.getElementById("modal-qty");
  let val = parseInt(input.value) + change;
  if (val < 1) val = 1;
  if (val > maxStock) {
    val = maxStock;
    Swal.fire({
      icon: "warning",
      title: "Limite de Stock",
      text: `Apenas existem ${maxStock} unidades disponíveis em stock.`,
      timer: 1500,
      showConfirmButton: false,
    });
  }
  input.value = val;
};

window.closeProductDetails = function () {
  const overlay = document.getElementById("detailsOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  setTimeout(() => {
    overlay.remove();
    if (typeof window.updateScrollLock === "function") {
      window.updateScrollLock();
    } else {
      document.documentElement.classList.remove("modal-open");
    }
  }, 400);
};

window.addToCartFromDetails = function (id) {
  const product = products.find((p) => p.id === id);
  const qty = parseInt(document.getElementById("modal-qty").value);
  if (product && qty > product.stock) {
    Swal.fire("Limite de Stock", `Apenas existem ${product.stock} unidades em stock.`, "warning");
    return;
  }
  cart.addItem(id, qty);
  window.closeProductDetails();
  // cart.toggle(true); // Optional: open cart after add
};

window.modalAskSeller = function (productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const currentUser = getLoggedUser();
  if (!currentUser) {
    Swal.fire({
      icon: "warning",
      title: "Inicie sessão",
      text: "Precisa de iniciar sessão para enviar mensagens ao vendedor.",
      showCancelButton: true,
      confirmButtonText: "Iniciar Sessão",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--primary-green)"
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
      }
    });
    return;
  }

  if (currentUser.id === product.apicultorId) {
    Swal.fire({
      icon: "info",
      title: "Este produto é seu",
      text: "Não pode enviar uma mensagem a si mesmo sobre o seu próprio produto.",
      confirmButtonColor: "var(--primary-green)"
    });
    return;
  }

  const prefillMsg = `Olá! Tenho interesse no seu produto "${product.name}". Gostaria de obter mais informações.`;
  window.location.href = `rede-social.html?chatWith=${product.apicultorId}&prefill=${encodeURIComponent(prefillMsg)}&product=${product.slug || ''}`;
};

function isFavorited(productId) {
  const token = localStorage.getItem("token");
  if (token) {
    return userFavorites.some((f) => f.ID_Produto === productId);
  }
  return false;
}

function updateModalFavBtn(productId) {
  const btn = document.getElementById("modal-fav-btn");
  if (!btn) return;
  if (isFavorited(productId)) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
}

async function fetchFavorites() {
  const token = localStorage.getItem("token");
  if (!token) {
    userFavorites = [];
    return;
  }

  try {
    const res = await fetch("/api/user/favorites", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      userFavorites = await res.json();
      renderProducts(); // Re-render to show favorite states
    }
  } catch (error) {
    console.error("Error fetching favorites:", error);
  }
}

window.toggleFavorite = async function (productId) {
  const token = localStorage.getItem("token");

  if (!token) {
    window.closeAllPopups();
    Swal.fire({
      title: "Iniciar Sessão",
      text: "Precisas de estar logado para guardar favoritos.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Entrar",
      cancelButtonText: "Depois",
      confirmButtonColor: "#f4b400",
    }).then((result) => {
      if (result.isConfirmed) {
        window.openAuthModal("login");
      }
    });
    return;
  }

  // User Mode
  const isCurrentlyFav = userFavorites.some((f) => f.ID_Produto === productId);

  try {
    const res = await fetch(
      `/api/user/favorites/${isCurrentlyFav ? "remove/" + productId : "add"}`,
      {
        method: isCurrentlyFav ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: isCurrentlyFav ? null : JSON.stringify({ productId }),
      },
    );

    if (res.ok) {
      // Update local state and UI
      if (isCurrentlyFav) {
        userFavorites = userFavorites.filter((f) => f.ID_Produto !== productId);
      } else {
        // We don't have the full product object easily here, but we can just refetch or push a dummy
        userFavorites.push({ ID_Produto: productId });
      }

      const gridBtn = document.getElementById(`btn-fav-${productId}`);
      if (gridBtn) gridBtn.classList.toggle("active");
      updateModalFavBtn(productId);
    }
  } catch (error) {
    console.error("Fav toggle error", error);
  }
};

// Add to cart function (Old one for quick add if needed, but cards now open details)
window.addToCart = function (productId) {
  const product = products.find((p) => p.id === productId);
  cart.addItem(productId);
  if (product) logInteraction("add_to_cart", { productId: product.id, productName: product.name });
};

// Helper: Generate Stars HTML
function generateStars(rating) {
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      starsHtml += '<i class="fas fa-star filled" style="color: #f4b400"></i>';
    } else if (i - 0.5 <= rating) {
      starsHtml +=
        '<i class="fas fa-star-half-alt filled" style="color: #f4b400"></i>';
    } else {
      starsHtml += '<i class="far fa-star" style="color: #ddd"></i>';
    }
  }
  return starsHtml;
}

// Fetch and Render Reviews
window.loadReviews = async (productId) => {
  const container = document.getElementById(`reviews-list-${productId}`);
  if (!container) return;
  try {
    const res = await fetch(`${API_URL}/products/${productId}/reviews`);
    if (!res.ok) throw new Error("Failed");
    const reviews = await res.json();

    if (reviews.length === 0) {
      container.innerHTML =
        '<p class="text-muted">Ainda não existem avaliações. Seja o primeiro!</p>';
      return;
    }

    container.innerHTML = reviews
      .map(
        (r) => {
          const currentUser = JSON.parse(localStorage.getItem("user") || "null");
          const canDelete = currentUser && (currentUser.id === r.ID_Cliente || currentUser.role === "admin");

          return `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer-info">
                         <img src="${r.ClienteFoto && r.ClienteFoto !== "null" ? r.ClienteFoto : "https://ui-avatars.com/api/?name=" + r.ClienteNome + "&background=random"}" class="reviewer-avatar" referrerpolicy="no-referrer" onerror="this.src='https://ui-avatars.com/api/?name=${r.ClienteNome}&background=random'">
                         <span>${r.ClienteNome}</span>
                    </div>
                    <div class="star-rating" style="font-size: 0.8rem">${generateStars(r.Nota)}</div>
                </div>
                <div class="review-text">${r.Comentario || ""}</div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="review-date">${new Date(r.Data_Avaliacao).toLocaleDateString()}</div>
                    ${canDelete ? `
                      <button class="btn btn-sm btn-link text-danger text-decoration-none p-0 delete-review-btn" 
                              data-id="${r.ID_Avaliacao}" 
                              style="font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-trash-alt me-1"></i> Eliminar
                      </button>
                    ` : ""}
                </div>
            </div>
          `;
        }
      )
      .join("");

    // Bind delete review buttons inside modal
    container.querySelectorAll(".delete-review-btn").forEach(btn => {
      btn.addEventListener("click", async function() {
        const reviewId = this.getAttribute("data-id");
        const token = localStorage.getItem("token");

        const result = await Swal.fire({
          title: "Tem a certeza?",
          text: "Esta ação apagará permanentemente a sua avaliação.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          confirmButtonText: "Sim, apagar!",
          cancelButtonText: "Cancelar"
        });

        if (result.isConfirmed) {
          try {
            const deleteRes = await fetch(`${API_URL}/admin/reviews/${reviewId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            });

            const data = await deleteRes.json();
            if (deleteRes.ok) {
              Swal.fire({
                icon: "success",
                title: "Avaliação apagada com sucesso",
                timer: 1200,
                showConfirmButton: false
              });
              window.loadReviews(productId);
            } else {
              Swal.fire("Erro", data.error || "Erro ao apagar avaliação", "error");
            }
          } catch (err) {
            console.error(err);
            Swal.fire("Erro", "Erro ao comunicar com o servidor", "error");
          }
        }
      });
    });

  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<p class="text-danger">Erro ao carregar avaliações.</p>';
  }
};

// Rating Input Logic
window.setRating = (rating) => {
  document.getElementById("review-rating-value").value = rating;
  const stars = document.querySelectorAll("#rating-input-stars i");
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove("far");
      star.classList.remove("hovered");
      star.classList.add("fas", "filled");
      star.style.color = "#f4b400";
    } else {
      star.classList.remove("fas", "filled");
      star.classList.remove("hovered");
      star.classList.add("far");
      star.style.color = "#ddd";
    }
  });
};

// Submit Review
window.submitReview = async (productId) => {
  const rating = document.getElementById("review-rating-value").value;
  const comment = document.getElementById("review-comment").value;
  const token = localStorage.getItem("token");

  if (!token) {
    Swal.fire(
      "Login Necessário",
      "Por favor, faça login para avaliar.",
      "info",
    );
    return;
  }

  if (rating == 0) {
    Swal.fire(
      "Atenção",
      "Por favor, selecione uma classificação (estrelas).",
      "warning",
    );
    return;
  }

  try {
    const res = await fetch(`${API_URL}/products/${productId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating: Number(rating), comment }),
    });

    const data = await res.json();

    if (res.ok) {
      window.closeProductDetails(); // Close the product details modal
      Swal.fire("Sucesso", "Avaliação enviada!", "success");
      // clear form
      document.getElementById("review-comment").value = "";
      window.setRating(0);
    } else {
      Swal.fire("Erro", data.error || "Falha ao enviar avaliação", "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Erro", "Erro de conexão", "error");
  }
};

function initLayoutToggle() {
  const btnGrid = document.getElementById("btn-shop-grid");
  const btnList = document.getElementById("btn-shop-list");

  if (!btnGrid || !btnList) return;

  const viewPreference = localStorage.getItem("shopProductView") || "grid";
  setShopView(viewPreference);

  btnGrid.addEventListener("click", () => {
    setShopView("grid");
  });

  btnList.addEventListener("click", () => {
    setShopView("list");
  });
}

function setShopView(view) {
  const btnGrid = document.getElementById("btn-shop-grid");
  const btnList = document.getElementById("btn-shop-list");

  if (!btnGrid || !btnList) return;

  const previousView = localStorage.getItem("shopProductView");
  localStorage.setItem("shopProductView", view);

  if (view === "grid") {
    btnGrid.classList.add("active");
    btnList.classList.remove("active");
  } else {
    btnGrid.classList.remove("active");
    btnList.classList.add("active");
  }

  // Apply transition animation if the layout view was actually changed by the user
  if (previousView && previousView !== view) {
    const grid = document.getElementById("products-grid");
    if (grid) {
      grid.classList.remove("layout-anim-fade", "layout-anim-roda");
      void grid.offsetWidth; // Force layout recalculation/reflow
      grid.classList.add(`layout-anim-${layoutAnimationStyle}`);
    }
  }

  renderProducts();
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  trackPageView(); // Log page view
  initSearchControls();
  initLayoutToggle();
  await fetchProducts();
  await fetchFavorites(); // Get latest from DB

  // Load site settings for layout animation style
  try {
    const res = await fetch(`${API_URL}/site-settings`);
    if (res.ok) {
      const settings = await res.json();
      if (settings.layout_animation_style) {
        layoutAnimationStyle = settings.layout_animation_style;
      }
    }
  } catch (e) {
    console.warn("Could not load site settings for layout animation:", e);
  }

  // Bind Filter Events
  const filters = document.querySelectorAll(
    ".custom-checkbox-input, #priceRange, #sort-select",
  );
  filters.forEach((f) => {
    f.addEventListener("change", applyFilters);
    f.addEventListener("input", applyFilters); // For range slider
  });
});

console.log("Shop page loaded! 🛒");
