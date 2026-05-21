import { app } from "./common.js";
import { API_URL } from "./api.js";

const homePage = {
  async init() {
    await this.loadFeaturedProducts();
  },

  async loadFeaturedProducts() {
    const grid = document.getElementById("featured-products");
    if (!grid) return;

    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      const products = data.slice(0, 3);

      if (products.length === 0) return; // Keep static HTML placeholders

      grid.innerHTML = products
        .map(
          (p, i) => `
                <div class="col-md-4 animate-fade-up" style="animation-delay: ${0.1 + i * 0.1}s">
                    <div class="product-card-premium">
                        <div class="product-img-container">
                            <img src="/img/${p.Imagem || "erro.png"}" alt="${p.Nome || "Mel Hexomel"}" onerror="this.src='/images/logo_hexomel.webp'" />
                        </div>
                        <div class="p-4 text-center">
                            <h4 class="fw-bold">${p.Nome || "Mel Hexomel"}</h4>
                            <p class="text-muted small">${
                              p.Descricao || "A pureza da natureza em cada gota."
                            }</p>
                            <p class="price-text mb-3">€${Number(p.Preco).toFixed(2)}</p>
                            <button class="btn btn-auth-enhanced login w-100 add-to-cart-home" data-id="${p.ID_Produto}">
                                <i class="bi bi-cart-plus me-2"></i>Adicionar ao Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");

      // Bind click events for add-to-cart
      grid.querySelectorAll(".add-to-cart-home").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.dataset.id);
          const product = products.find((p) => p.ID_Produto === id);
          if (product && app && typeof app.addToCart === "function") {
            app.addToCart(product);
          }
        });
      });
    } catch (error) {
      console.warn("Home featured products: using static HTML fallback.", error);
      // Keep the existing static HTML products as fallback
    }
  },
};

document.addEventListener("DOMContentLoaded", () => homePage.init());
