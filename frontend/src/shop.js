// Shop page JavaScript - handles product display
import "./styles/index.css";
// import "./styles/modern.css"; // Already in HTML
import { cart } from "./cart.js";

// Fallback images if files don't exist
const fallbackImage = "https://placehold.co/400x400/f6f6f6/e0e0e0?text=Honey";

// State
let products = [];
let filteredProducts = [];

// Fetch products from API
async function fetchProducts() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();

    // Map backend data to frontend format
    products = data.map((p) => ({
      id: p.ID_Produto,
      name: p.Nome,
      price: p.Preco,
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
            <span class="h5 fw-bold mb-0 me-auto" style="color: var(--primary-green)">€${product.price.toFixed(2)}</span>
            
            <button class="btn btn-light rounded-circle border d-flex align-items-center justify-content-center" 
                    style="width: 40px; height: 40px; color: #ccc;" 
                    onclick="window.toggleFavorite(${product.id}); this.classList.toggle('text-danger');">
                <i class="fas fa-heart"></i>
            </button>
            
            <button class="btn btn-auth-enhanced register btn-sm px-3" onclick="window.addToCart(${product.id})">
                Adicionar
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
            <button class="btn btn-light rounded-circle border d-flex align-items-center justify-content-center" 
                  style="width: 50px; height: 50px; color: #ccc;" 
                  id="modal-fav-btn"
                  onclick="window.toggleFavorite(${product.id}); this.classList.toggle('text-danger');">
              <i class="fas fa-heart"></i>
          </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("detailsOverlay")?.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Check favorite state
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch("http://localhost:3000/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const favorites = await res.json();
      if (favorites.some((f) => f.ID_Produto === productId)) {
        document.getElementById("modal-fav-btn")?.classList.add("text-danger");
      }
    } catch (e) {}
  }

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

window.toggleFavorite = async function (productId) {
  const token = localStorage.getItem("token");
  if (!token) {
    Swal.fire({
      title: "Iniciar Sessão",
      text: "Precisas de estar logado para guardar favoritos.",
      icon: "info",
      confirmButtonColor: "#f4b400",
    });
    return;
  }

  const btn = document.getElementById(`btn-fav-${productId}`);
  const isAdding = !btn.classList.contains("active");

  try {
    const res = await fetch(
      `http://localhost:3000/api/favorites/${isAdding ? "add" : "remove/" + productId}`,
      {
        method: isAdding ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: isAdding ? JSON.stringify({ productId }) : null,
      },
    );

    if (res.ok) {
      btn.classList.toggle("active");
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
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();

  // Bind Filter Events
  const filters = document.querySelectorAll(".form-check-input, #priceRange");
  filters.forEach((f) => {
    f.addEventListener("change", applyFilters);
    f.addEventListener("input", applyFilters); // For range slider
  });
});

console.log("Shop page loaded! 🛒");
