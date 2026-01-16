// Shop page JavaScript - handles product display
import "./styles/index.css";
import { cart } from "./cart.js";

// Product data
const products = [
  {
    id: 1,
    name: "Wildflower Honey",
    description:
      "Rich and complex flavor from diverse wildflower sources. Perfect for everyday use.",
    price: 12.5,
    image: "/images/wildflower.png",
    weight: "500g",
  },
  {
    id: 2,
    name: "Acacia Honey",
    description:
      "Light, delicate sweetness with floral notes. Ideal for tea and desserts.",
    price: 14.0,
    image: "/images/acacia.png",
    weight: "500g",
  },
  {
    id: 3,
    name: "Lavender Honey",
    description:
      "Aromatic honey with soothing lavender essence. Great for relaxation.",
    price: 15.5,
    image: "/images/lavender.png",
    weight: "500g",
  },
  {
    id: 4,
    name: "Wildflower Honey - Large",
    description: "Family size jar of our popular wildflower honey. Best value!",
    price: 22.0,
    image: "/images/wildflower.png",
    weight: "1kg",
  },
  {
    id: 5,
    name: "Acacia Honey - Large",
    description: "Family size jar of premium acacia honey for daily enjoyment.",
    price: 25.0,
    image: "/images/acacia.png",
    weight: "1kg",
  },
  {
    id: 6,
    name: "Lavender Honey - Large",
    description: "Family size jar of our aromatic lavender honey.",
    price: 28.0,
    image: "/images/lavender.png",
    weight: "1kg",
  },
];

// Render products
function renderProducts() {
  const grid = document.getElementById("products-grid");

  if (!grid) return;

  grid.innerHTML = products
    .map(
      (product) => `
    <div class="card">
      <img src="${product.image}" alt="${product.name}" class="card-image">
      <div class="card-content">
        <h4 class="card-title">${product.name}</h4>
        <p style="color: var(--primary-gold); font-weight: 600; margin-bottom: 0.5rem;">${
          product.weight
        }</p>
        <p class="card-description">${product.description}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
          <p class="card-price">€${product.price.toFixed(2)}</p>
          <button class="btn btn-primary" onclick="addToCart(${
            product.id
          })">Add to Cart</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Add scroll animations
  const cards = grid.querySelectorAll(".card");
  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    card.style.transitionDelay = `${index * 0.1}s`;

    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100);
  });
}

// Add to cart function
window.addToCart = function (productId) {
  cart.addItem(productId);
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", renderProducts);

console.log("Shop page loaded! 🛒");
