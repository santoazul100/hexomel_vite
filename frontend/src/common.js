import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./index.css";

/**
 * Common layout and logic for all Hexomel pages
 */
class HexomelApp {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.user = JSON.parse(localStorage.getItem("user")) || null;
    this.sidebarOpen = false;
  }

  init() {
    this.renderNavbar();
    this.renderFooter();
    // this.renderCartSidebar(); // Disabled to prevent duplicate carts (handled by cart.js)
    this.initBeeAnimations();
    this.updateCartBadge();
    this.bindGlobalEvents();
  }

  renderNavbar() {
    const navbarContainer = document.getElementById("navbar-container");
    if (!navbarContainer) return;

    const cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const loginLink =
      this.user && this.user.Nome
        ? `<span class="nav-link text-success fw-semibold">Olá, ${
            this.user.Nome.split(" ")[0]
          }</span>`
        : `<a class="nav-link fw-medium" href="/src/pages/Login.html">Entrar</a>`;

    navbarContainer.innerHTML = `
            <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm py-2">
                <div class="container">
                    <a class="navbar-brand fw-bold text-success fs-3 d-flex align-items-center gap-2" href="/">
                        <i class="bi bi-hexagon-fill"></i>
                        Hexomel
                    </a>
                    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto align-items-center gap-2">
                            <li class="nav-item"><a class="nav-link fw-medium px-3 rounded hover-bg-light" href="/src/pages/Produtos.html">Produtos</a></li>
                            <li class="nav-item"><a class="nav-link fw-medium px-3 rounded hover-bg-light" href="/src/pages/About.html">Sobre</a></li>
                            <li class="nav-item"><a class="nav-link fw-medium px-3 rounded hover-bg-light" href="/src/pages/Contact.html">Contatos</a></li>
                            <li class="nav-item ms-lg-2">${loginLink}</li>
                            <li class="nav-item ms-lg-2">
                                <button class="btn btn-outline-success position-relative cart-btn-modern px-3 py-2" id="cart-toggle-btn" aria-label="Carrinho de compras">
                                    <i class="bi bi-cart3 fs-5"></i>
                                    ${
                                      cartCount > 0
                                        ? `
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger cart-badge-modern">
                                            ${cartCount}
                                            <span class="visually-hidden">items no carrinho</span>
                                        </span>
                                    `
                                        : ""
                                    }
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
            <div style="height: 75px;"></div>
        `;
  }

  renderCartSidebar() {
    let sidebar = document.getElementById("cart-sidebar");
    if (!sidebar) {
      sidebar = document.createElement("div");
      sidebar.id = "cart-sidebar";
      sidebar.className = "cart-sidebar";
      document.body.appendChild(sidebar);
    }

    const total = this.cart.reduce(
      (sum, item) => sum + item.Preco * item.quantity,
      0,
    );
    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);

    sidebar.innerHTML = `
        <div class="cart-sidebar-content">
            <div class="cart-header">
                <div>
                    <h4 class="cart-title mb-1">Carrinho</h4>
                    <p class="cart-subtitle text-muted mb-0">${itemCount} ${
                      itemCount === 1 ? "item" : "itens"
                    }</p>
                </div>
                <button class="btn-close cart-close-btn" id="close-cart" aria-label="Fechar carrinho"></button>
            </div>
            
            <div class="cart-items-container">
                ${
                  this.cart.length === 0
                    ? `
                    <div class="cart-empty-state">
                        <i class="bi bi-cart-x text-muted" style="font-size: 4rem; opacity: 0.3;"></i>
                        <p class="text-muted mt-3 mb-0">O seu carrinho está vazio</p>
                        <a href="/src/pages/Produtos.html" class="btn btn-sm btn-outline-success mt-3">Ver Produtos</a>
                    </div>
                `
                    : `
                    <div class="cart-items-list">
                        ${this.cart
                          .map(
                            (item, index) => `
                            <div class="cart-item">
                                <div class="cart-item-image">
                                    <img src="/img/${
                                      item.Imagem || "erro.png"
                                    }\" alt="${
                                      item.Nome
                                    }" onerror="this.src='https://placehold.co/80x80/e8f5e9/2d5f3f?text=Mel'">
                                </div>
                                <div class="cart-item-details">
                                    <h6 class="cart-item-name mb-1">${
                                      item.Nome
                                    }</h6>
                                    <div class="cart-item-meta">
                                        <span class="cart-item-quantity">${
                                          item.quantity
                                        }x</span>
                                        <span class="cart-item-price">${Number(
                                          item.Preco,
                                        ).toFixed(2)}€</span>
                                    </div>
                                </div>
                                <button class="cart-item-remove" data-index="${index}" aria-label="Remover item">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `
                }
            </div>

            <div class="cart-footer">
                <div class="cart-total">
                    <span class="cart-total-label">Total</span>
                    <span class="cart-total-value">${total.toFixed(2)}€</span>
                </div>
                <button class="btn btn-success w-100 cart-checkout-btn" ${
                  this.cart.length === 0 ? "disabled" : ""
                }>
                    <i class="bi bi-check-circle me-2"></i>
                    Finalizar Compra
                </button>
            </div>
        </div>
    `;

    sidebar.querySelectorAll(".cart-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index);
        this.removeFromCart(index);
      });
    });

    const closeBtn = document.getElementById("close-cart");
    if (closeBtn)
      closeBtn.addEventListener("click", () => this.toggleCart(false));
  }

  renderFooter() {
    const footerContainer = document.getElementById("footer-container");
    if (!footerContainer) return;

    footerContainer.innerHTML = `
            <footer class="bg-dark text-white py-5 mt-5">
                <div class="container py-4">
                    <div class="row g-4 text-center text-md-start">
                        <div class="col-md-4">
                            <h4 class="fw-bold text-success mb-4">Hexomel</h4>
                            <p class="text-secondary">O melhor mel natural do Alentejo, diretamente para a sua mesa. Qualidade e pureza garantidas em cada gota.</p>
                        </div>
                        <div class="col-md-4">
                            <h5 class="fw-bold mb-4">Links Rápidos</h5>
                            <ul class="list-unstyled">
                                <li class="mb-2"><a href="/src/pages/Produtos.html" class="text-secondary text-decoration-none hover-success">Produtos</a></li>
                                <li class="mb-2"><a href="/src/pages/About.html" class="text-secondary text-decoration-none hover-success">Sobre Nós</a></li>
                                <li class="mb-2"><a href="/src/pages/Contact.html" class="text-secondary text-decoration-none hover-success">Contactos</a></li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <h5 class="fw-bold mb-3">Siga-nos</h5>
                            <div class="d-flex gap-3 justify-content-center justify-content-md-start">
                                <a href="#" class="btn btn-outline-success border-2 rounded-circle"><i class="bi bi-facebook"></i></a>
                                <a href="#" class="btn btn-outline-success border-2 rounded-circle"><i class="bi bi-instagram"></i></a>
                                <a href="#" class="btn btn-outline-success border-2 rounded-circle"><i class="bi bi-twitter-x"></i></a>
                            </div>
                        </div>
                    </div>
                    <hr class="my-4 border-secondary opacity-25">
                    <div class="text-center text-secondary small">
                        &copy; 2026 Hexomel. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        `;
  }

  initBeeAnimations() {
    const bees = document.querySelectorAll(".bee-decoration");
    if (bees.length === 0) return;

    bees.forEach((bee) => {
      bee.classList.remove("d-none");
      bee.style.pointerEvents = "none";
    });

    document.addEventListener("mousemove", (e) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      bees.forEach((bee, index) => {
        const depth = (index + 1) * 0.03;
        const x = (centerX - clientX) * depth;
        const y = (centerY - clientY) * depth;
        bee.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.2}deg)`;
      });
    });
  }

  bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest("#cart-toggle-btn");
      if (toggleBtn) {
        this.toggleCart(true);
      }
    });

    document.addEventListener("mousedown", (e) => {
      const sidebar = document.getElementById("cart-sidebar");
      const toggleBtn = e.target.closest("#cart-toggle-btn");
      if (
        this.sidebarOpen &&
        sidebar &&
        !sidebar.contains(e.target) &&
        !toggleBtn
      ) {
        this.toggleCart(false);
      }
    });
  }

  toggleCart(show) {
    this.sidebarOpen = show;
    const sidebar = document.getElementById("cart-sidebar");
    if (sidebar) {
      if (show) sidebar.classList.add("active");
      else sidebar.classList.remove("active");
    }
  }

  updateCartBadge() {
    this.renderCartSidebar();
  }

  addToCart(product) {
    if (!product) return;
    const existing = this.cart.find(
      (item) => item.ID_Produto === product.ID_Produto,
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }
    this.saveCart();
    this.updateCartBadge();
    this.toggleCart(true);
  }

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateCartBadge();
  }

  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
  }
}

export const app = new HexomelApp();

const init = () => app.init();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
