// Shop page JavaScript - handles product display
import "./styles/index.css";
// import "./styles/modern.css"; // Already in HTML
import { cart } from "./cart.js";
import Swal from "sweetalert2";

// Fallback images if files don't exist
const fallbackImage = "https://placehold.co/400x400/f6f6f6/e0e0e0?text=Honey";

// State
let products = [];
let filteredProducts = [];
let userFavorites = [];

// Fetch products from API
async function fetchProducts() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();

    products = data.map((p) => ({
      id: p.ID_Produto,
      name: p.Nome,
      price: Number(p.Preco), // Fix: Ensure price is a number
      description: p.Descricao,
      category: p.ID_Categoria === 2 ? "Pólen & Própolis" : "Mel Puro",
      image: `/img/produtos/${p.ID_Produto}.webp`,
      weight: "500g",
    }));

    filteredProducts = [...products];
    renderProducts();
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

// Render products (Nike Style)
function renderProducts() {
  const grid = document.getElementById("products-grid");

  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center py-5"><h3 class="text-muted">No products found matching your filters.</h3></div>`;
    return;
  }

  grid.innerHTML = filteredProducts
    .map(
      (product) => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="product-card-premium h-100 position-relative">
        <div class="product-img-container" style="cursor: pointer" onclick="window.openProductDetails(${product.id})">
          ${product.id === 1 ? '<div class="product-badge">Destaque</div>' : ""}
          <img src="${product.image}" alt="${product.name}" onerror="this.src='${fallbackImage}'">
        </div>
        <div class="p-4">
          <div onclick="window.openProductDetails(${product.id})" style="cursor: pointer">
              <h5 class="fw-bold mb-1">${product.name}</h3>
              <p class="text-muted small mb-3">${product.category} • ${product.weight}</p>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3 gap-2">
            <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${product.price.toFixed(2)}</span>
            
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
  `,
    )
    .join("");
}

// Filtering Logic
function applyFilters() {
  // 1. Get checked categories
  const melPuro = document.getElementById("cat-mel")?.checked;
  const polen = document.getElementById("cat-polen")?.checked;
  const acessorios = document.getElementById("cat-acessorios")?.checked;

  // 2. Get price range
  const maxPrice = document.getElementById("priceRange")?.value || 100;

  // Filter
  filteredProducts = products.filter((p) => {
    let catMatch = true;
    // If any category filter is checked, product must match one of them
    if (melPuro || polen || acessorios) {
      catMatch = false;
      if (melPuro && p.category === "Mel Puro") catMatch = true;
      if (polen && p.category === "Pólen & Própolis") catMatch = true;
      if (acessorios && p.category === "Acessórios") catMatch = true;
    }

    let priceMatch = p.price <= maxPrice;

    return catMatch && priceMatch;
  });

  renderProducts();
}

// Product Details Modal Logic (Minimalist)
window.openProductDetails = async function (productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

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
          
          <div class="minimal-description">
            ${product.description || "Trench com gola de lapela em tecido de contraste. Capuz removível ajustável com botão de pressão. Manga comprida com presilha e botão. Bolsos de chapa com aba e botões de pressão à frente."}
          </div>
          
          <div class="quantity-selector">
             <button class="qty-btn" onclick="window.updateModalQty(-1)">-</button>
             <input type="number" id="modal-qty" class="qty-input" value="1" min="1" readonly>
             <button class="qty-btn" onclick="window.updateModalQty(1)">+</button>
          </div>
          
          <div class="minimal-actions">
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
        </div>
      </div>
    </div>
  `;

  document.getElementById("detailsOverlay")?.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Check favorite state handled by isFavorited in template, but modal btn needs specific ID check if opened later
  updateModalFavBtn(productId);

  setTimeout(() => {
    document.getElementById("detailsOverlay").classList.add("active");
    document.body.style.overflow = "hidden";
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
    document.body.style.overflow = "";
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
    const res = await fetch("/api/favorites", {
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
      `/api/favorites/${isCurrentlyFav ? "remove/" + productId : "add"}`,
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
  cart.addItem(productId);
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  await fetchProducts();
  await fetchFavorites(); // Get latest from DB

  // Bind Filter Events
  const filters = document.querySelectorAll(".form-check-input, #priceRange");
  filters.forEach((f) => {
    f.addEventListener("change", applyFilters);
    f.addEventListener("input", applyFilters); // For range slider
  });
});

console.log("Shop page loaded! 🛒");
