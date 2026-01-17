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
      <div class="product-card-premium h-100" onclick="addToCart(${product.id})">
        <div class="product-img-container">
          ${product.id === 1 ? '<div class="product-badge">Destaque</div>' : ""}
          <img src="${product.image}" alt="${product.name}" onerror="this.src='${fallbackImage}'">
        </div>
        <div class="p-4">
          <h5 class="fw-bold mb-1">${product.name}</h3>
          <p class="text-muted small mb-3">${product.category} • ${product.weight}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${product.price.toFixed(2)}</span>
            <button class="btn btn-auth-enhanced register btn-sm px-3">Adicionar</button>
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

// Add to cart function
window.addToCart = function (productId) {
  // Tiny animation feedback or just open cart
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
