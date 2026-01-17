// Shop page JavaScript - handles product display
import "./styles/index.css";
// import "./styles/modern.css"; // Already in HTML
import { cart } from "./cart.js";

// Product data
const products = [
  {
    id: 1,
    name: "Wildflower Honey",
    category: "Silvestre",
    price: 12.5,
    image: "/img/produtos/mel_silvestre.webp", // Updated path assumption, or use placeholder
    weight: "500g",
  },
  {
    id: 2,
    name: "Acacia Honey",
    category: "Acácia",
    price: 14.0,
    image: "/img/produtos/mel_rosmaninho.webp",
    weight: "500g",
  },
  {
    id: 3,
    name: "Lavender Honey",
    category: "Lavanda",
    price: 15.5,
    image: "/img/produtos/mel_eucalipto.webp",
    weight: "500g",
  },
  {
    id: 4,
    name: "Wildflower Honey - Large",
    category: "Silvestre",
    price: 22.0,
    image: "/img/produtos/mel_silvestre.webp",
    weight: "1kg",
  },
  {
    id: 5,
    name: "Acacia Honey - Large",
    category: "Acácia",
    price: 25.0,
    image: "/img/produtos/mel_rosmaninho.webp",
    weight: "1kg",
  },
  {
    id: 6,
    name: "Lavender Honey - Large",
    category: "Lavanda",
    price: 28.0,
    image: "/img/produtos/mel_eucalipto.webp",
    weight: "1kg",
  },
];

// Fallback images if files don't exist
const fallbackImage = "https://placehold.co/400x400/f6f6f6/e0e0e0?text=Honey";

// State
let filteredProducts = [...products];

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
  const silvestre = document.getElementById("f-wildflower")?.checked;
  const acacia = document.getElementById("f-acacia")?.checked;
  const lavender = document.getElementById("f-lavender")?.checked;

  // 2. Get price range
  const maxPrice = document.getElementById("priceRange")?.value || 100;

  // Filter
  filteredProducts = products.filter((p) => {
    let catMatch = true;
    // If any category filter is checked, product must match one of them
    if (silvestre || acacia || lavender) {
      catMatch = false;
      if (silvestre && p.category === "Silvestre") catMatch = true;
      if (acacia && p.category === "Acácia") catMatch = true;
      if (lavender && p.category === "Lavanda") catMatch = true;
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
  renderProducts();

  // Bind Filter Events
  const filters = document.querySelectorAll(".form-check-input, #priceRange");
  filters.forEach((f) => {
    f.addEventListener("change", applyFilters);
    f.addEventListener("input", applyFilters); // For range slider
  });
});

console.log("Shop page loaded! 🛒");
