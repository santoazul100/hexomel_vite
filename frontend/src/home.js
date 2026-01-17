import { app } from "./common.js";
import axios from "axios";

const API_URL = "http://127.0.0.1:3000/api";

const homePage = {
  async init() {
    await this.loadFeaturedProducts();
  },

  async loadFeaturedProducts() {
    const grid = document.getElementById("products-grid");
    try {
      const response = await axios.get(`${API_URL}/produtos`);
      const products = response.data.slice(0, 3);

      if (products.length === 0) {
        grid.innerHTML =
          '<p class="text-center">Novos produtos brevemente.</p>';
        return;
      }

      grid.innerHTML = products
        .map(
          (p) => `
                <div class="col-md-4">
                    <div class="card product-card border-0 h-100 shadow-sm transition-hover">
                        <div class="position-relative">
                            <img src="/img/${
                              p.Imagem || "erro.png"
                            }" class="card-img-top" style="height: 250px; object-fit: cover;" onerror="this.src='https://placehold.co/400x250?text=Mel+Hexomel'">
                            <div class="position-absolute bottom-0 end-0 p-3">
                                <span class="badge bg-success fs-6 shadow">${Number(
                                  p.Preco
                                ).toFixed(2)}€</span>
                            </div>
                        </div>
                        <div class="card-body p-4 text-center d-flex flex-column">
                            <h5 class="fw-bold mb-2">${
                              p.Nome || "Mel Hexomel"
                            }</h5>
                            <p class="text-muted small flex-grow-1">${
                              p.Descricao ||
                              "A pureza da natureza em cada gota."
                            }</p>
                            <button class="btn btn-green w-100 add-to-cart-btn mt-3" data-id="${
                              p.ID_Produto
                            }">
                                <i class="bi bi-cart-plus me-2"></i>Adicionar ao Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");

      // Bind click events
      document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const id = parseInt(
            btn.target.closest(".add-to-cart-btn").dataset.id
          );
          const product = products.find((p) => p.ID_Produto === id);
          app.addToCart(product);
        });
      });
    } catch (error) {
      console.error("Home products error:", error);
      grid.innerHTML =
        '<p class="text-center text-danger py-5">Indisponível de momento.</p>';
    }
  },
};

document.addEventListener("DOMContentLoaded", () => homePage.init());
