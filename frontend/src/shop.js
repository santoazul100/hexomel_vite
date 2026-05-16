// Shop page JavaScript - handles product display
import "./styles/index.css";
const API_URL = "/api";
// import "./styles/modern.css"; // Already in HTML
import { cart } from "./cart.js";
import Swal from "sweetalert2";
import { logInteraction, trackPageView } from "./analytics.js";
import { Skeleton } from "./skeleton.js";

// Fallback images if files don't exist
const fallbackImage = "https://placehold.co/400x400/f6f6f6/e0e0e0?text=Honey";

// State
let products = [];
let filteredProducts = [];
let categories = [];
let origins = [];
let userFavorites = [];

// Fetch products from API and categories
async function fetchProducts() {
  const grid = document.getElementById("products-grid");

  // Carregar estilo de placeholder configurado pelo admin
  await Skeleton.init();

  // Mostrar skeleton placeholders enquanto carrega
  if (grid) {
    grid.innerHTML = Skeleton.productGrid(6);
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
        image: p.Imagem || `/img/produtos/${p.ID_Produto}.webp`,
        weight: "500g",
        tags: p.Tags ? p.Tags.split(",").map((t) => t.trim()) : [],
        rating: p.Rating || 0,
        reviewCount: p.ReviewCount || 0,
        slug: p.Slug || null,
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

// Render products (Nike Style)
function renderProducts() {
  const grid = document.getElementById("products-grid");

  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = Skeleton.stateEmpty('Nenhum produto encontrado com os filtros selecionados.', 'fa-search');
    return;
  }

  grid.innerHTML = filteredProducts
    .map(
      (product) => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="product-card-premium h-100 position-relative d-flex flex-column">
        <div class="product-img-container" style="cursor: pointer" onclick="window.openProductDetails(${product.id})">
          <div class="product-tags-container">
            ${product.tags
              .map(
                (tag) => `
              <div class="product-badge tag-${tag.toLowerCase().replace(/\s+/g, "-")}">${tag}</div>
            `,
              )
              .join("")}
          </div>
          <img src="${product.image}" alt="${product.name}" onerror="this.src='${fallbackImage}'">
        </div>
        <div class="p-4 d-flex flex-column flex-grow-1">
          <div onclick="window.openProductDetails(${product.id})" style="cursor: pointer" class="mb-3">
              <h5 class="fw-bold mb-1" style="min-height: 2.5rem;">${product.name}</h3>
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
                      <a href="apicultor.html?id=${product.apicultorId}" class="fw-bold text-decoration-none" style="color:inherit" onclick="event.stopPropagation()">
                        ${product.apicultorName}
                      </a>
                    </p>`
                  : `<p class="smaller mb-0 text-muted"><i class="fas fa-check-circle me-1 text-success"></i>Original Hexomel</p>`
              }
          </div>
          <div class="d-flex justify-content-between align-items-center mt-auto gap-2 pt-2 border-top">
            <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${product.price.toFixed(2)}</span>
            
            <div class="d-flex gap-2">
              ${product.slug ? `<a href="produto.html?slug=${product.slug}" class="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect" 
                      style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.75rem; padding: 0 !important; flex-shrink: 0; text-decoration: none;" 
                      onclick="event.stopPropagation()"
                      title="Ver Produto">
                  <i class="fas fa-external-link-alt" style="font-size: 0.65rem;"></i>
              </a>` : ''}
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
  const maxPrice = Number(document.getElementById("priceRange")?.value || 100);

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
      const tagMatch = p.tags?.some(t => t.toLowerCase().includes(searchTerm));
      searchMatch = nameMatch || descMatch || tagMatch;
    }

    let priceMatch = p.price <= maxPrice;

    return catMatch && oriMatch && vendorMatch && priceMatch && searchMatch;
  });

  // Track Search (Debounced logic or only if searchTerm has length)
  if (searchTerm.length >= 3) {
    if (window.searchLogTimeout) clearTimeout(window.searchLogTimeout);
    window.searchLogTimeout = setTimeout(() => {
        logInteraction("search", { term: searchTerm, resultsCount: filteredProducts.length });
    }, 1000); // 1s debounce
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
      <div class="details-card-minimal">
        <button class="details-close-minimal" onclick="window.closeProductDetails()">×</button>
        
        <div class="details-image-section">
          <img src="${product.image}" onerror="this.src='${fallbackImage}'" alt="${product.name}">
        </div>
        
        <div class="details-info-section">
          <div class="minimal-category">${product.category}</div>
          <h2 class="minimal-title">${product.name}</h2>
          <div class="minimal-price">€${product.price.toFixed(2)}</div>
          
          
          <div class="progress mb-4" style="height: 5px;">
             <div class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
          </div>

          <div class="minimal-description">
            ${product.description || "Descrição do produto não disponível."}
          </div>

          <div class="quantity-selector mt-4">
             <button class="qty-btn" onclick="window.updateModalQty(-1)">-</button>
             <input type="number" id="modal-qty" class="qty-input" value="1" min="1" readonly>
             <button class="qty-btn" onclick="window.updateModalQty(1)">+</button>
          </div>
          
          <div class="minimal-actions mb-5">
            <button class="btn-minimal-add" onclick="window.addToCartFromDetails(${product.id})">
              ADICIONAR
            </button>
            <button class="btn btn-soft-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect ${isFavorited(product.id) ? "active" : ""}" 
                  style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.75rem; padding: 0 !important; flex-shrink: 0;" 
                  id="modal-fav-btn"
                  onclick="window.toggleFavorite(${product.id})">
              <i class="fas fa-heart" ></i>
          </button>
          </div>

          <!-- Reviews Section -->
           <div class="reviews-section">
            <h3 class="reviews-title">Avaliações</h3>
            <div id="reviews-list-${product.id}" class="review-list">
                <p class="text-muted">A carregar avaliações...</p>
            </div>
            
            <div class="review-form-container">
                <label class="form-label">A sua avaliação</label>
                <div class="rating-input d-flex gap-1" id="rating-input-stars">
                    <i class="far fa-star" data-value="1"></i>
                    <i class="far fa-star" data-value="2"></i>
                    <i class="far fa-star" data-value="3"></i>
                    <i class="far fa-star" data-value="4"></i>
                    <i class="far fa-star" data-value="5"></i>
                </div>
                <input type="hidden" id="review-rating-value" value="0">
                
                <label class="form-label mt-3">O seu comentário</label>
                <textarea id="review-comment" class="review-textarea" placeholder="Partilhe a sua experiência..."></textarea>
                
                <button class="btn-submit-review" onclick="window.submitReview(${product.id})">Enviar Avaliação</button>
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
    document.documentElement.classList.add("modal-open");
  }, 10);
};

window.updateModalQty = function (change) {
  const input = document.getElementById("modal-qty");
  let val = parseInt(input.value) + change;
  if (val < 1) val = 1;
  input.value = val;
};

window.closeProductDetails = function () {
  const overlay = document.getElementById("detailsOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  setTimeout(() => {
    overlay.remove();
    document.documentElement.classList.remove("modal-open");
  }, 400);
};

window.addToCartFromDetails = function (id) {
  const qty = parseInt(document.getElementById("modal-qty").value);
  cart.addItem(id, qty);
  window.closeProductDetails();
  // cart.toggle(true); // Optional: open cart after add
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
        (r) => `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer-info">
                         <img src="${r.ClienteFoto && r.ClienteFoto !== "null" ? r.ClienteFoto : "https://ui-avatars.com/api/?name=" + r.ClienteNome + "&background=random"}" class="reviewer-avatar" referrerpolicy="no-referrer" onerror="this.src='https://ui-avatars.com/api/?name=${r.ClienteNome}&background=random'">
                         <span>${r.ClienteNome}</span>
                    </div>
                    <div class="star-rating" style="font-size: 0.8rem">${generateStars(r.Nota)}</div>
                </div>
                <div class="review-text">${r.Comentario || ""}</div>
                <div class="review-date text-end mt-2">${new Date(r.Data_Avaliacao).toLocaleDateString()}</div>
            </div>
        `,
      )
      .join("");
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

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  trackPageView(); // Log page view
  await fetchProducts();
  await fetchFavorites(); // Get latest from DB

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
