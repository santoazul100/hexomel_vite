const API_URL = "http://localhost:3000/api";
import Swal from "sweetalert2";

class CartManager {
  constructor() {
    this.items = [];
    this.init();
  }

  async init() {
    this.createCartUI();
    this.createCheckoutModal();
    this.renderBadgeOnly(); // Show badge as early as possible
    await this.syncWithBackend();
    this.render();
  }

  renderBadgeOnly() {
    const badge = document.getElementById("cart-badge");
    if (badge) {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      badge.textContent = cart.length;
    }
  }

  createCartUI() {
    // Create Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "cart-sidebar";
    sidebar.id = "cart-sidebar";
    sidebar.innerHTML = `
            <div class="cart-header">
                <h3>Your Honey Cart</h3>
                <button id="close-cart" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
            </div>
            <div class="cart-items" id="cart-items-container"></div>
            <div class="cart-footer">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-weight: 700;">
                    <span>Total:</span>
                    <span id="cart-total">€0.00</span>
                </div>
                <button id="checkout-btn" class="btn btn-primary" style="width: 100%;">Checkout</button>
            </div>
        `;
    document.body.appendChild(sidebar);

    const overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    overlay.id = "cart-overlay";
    document.body.appendChild(overlay);

    // Styles for Checkout Modal
    const style = document.createElement("style");
    style.textContent = `
      .checkout-modal {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
        z-index: 10001;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        animation: fadeIn 0.3s ease;
      }
      .checkout-modal.active { display: block; }
      .checkout-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
      }
      .checkout-overlay.active { display: block; }
      .spinner-border {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spinner-border .75s linear infinite;
      }
      @keyframes spinner-border { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    // Events
    document
      .getElementById("close-cart")
      .addEventListener("click", () => this.toggle(false));
    document
      .getElementById("checkout-btn")
      .addEventListener("click", () => this.checkout());
    overlay.addEventListener("click", () => this.toggle(false));
  }

  async syncWithBackend() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        this.items = await res.json();
      }
    } catch (error) {
      console.error("Cart sync failed:", error);
    }
  }

  async addItem(productId, quantity = 1) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.closeAllPopups();
      Swal.fire({
        title: "Iniciar Sessão",
        text: "Precisas de estar logado para adicionar produtos ao carrinho.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Entrar",
        cancelButtonText: "Depois",
        confirmButtonColor: "#f4b400",
      }).then((result) => {
        if (result.isConfirmed) {
          if (typeof window.openAuthModal === "function") {
            window.openAuthModal("login");
          }
        }
      });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });

      if (res.ok) {
        await this.syncWithBackend();
        this.render();
        this.toggle(true);
      }
    } catch (error) {
      console.error("Add to cart failed:", error);
    }
  }

  async checkout() {
    if (this.items.length === 0) {
      window.closeAllPopups();
      Swal.fire("O carrinho está vazio!", "", "info");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      window.closeAllPopups();
      Swal.fire({
        title: "Login Necessário",
        text: "Por favor, inicie sessão para finalizar a compra.",
        icon: "warning",
        confirmButtonColor: "#f4b400",
      });
      return;
    }

    this.openCheckoutModal();
  }

  async updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_URL}/cart/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });
      await this.syncWithBackend();
      this.render();
    } catch (error) {
      console.error("Update cart error:", error);
    }
  }

  async removeItem(itemId) {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_URL}/cart/remove/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await this.syncWithBackend();
      this.render();
    } catch (error) {
      console.error("Remove item error:", error);
    }
  }

  toggle(show) {
    document.getElementById("cart-sidebar").classList.toggle("open", show);
    document.getElementById("cart-overlay").classList.toggle("show", show);
    if (show) {
      document.documentElement.classList.add("modal-open");
    } else {
      document.documentElement.classList.remove("modal-open");
    }
  }

  render() {
    const container = document.getElementById("cart-items-container");
    const totalEl = document.getElementById("cart-total");
    const badge = document.getElementById("cart-badge");

    let total = 0;
    container.innerHTML = this.items
      .map((item) => {
        total += item.Preco * item.Quantidade;
        return `
            <div class="cart-item">
                <div class="d-flex justify-content-between">
                    <div class="cart-item-title">${item.Nome}</div>
                    <div style="font-weight: 600;">€${(
                      item.Preco * item.Quantidade
                    ).toFixed(2)}</div>
                </div>
                
                <div class="cart-item-controls" style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                    <div style="display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                        <button class="cart-qty-btn" style="border: none; background: white; padding: 4px 10px; cursor: pointer; color: #64748b;" onclick="cart.updateQuantity(${item.ID_itemCarrinho}, ${item.Quantidade - 1})">-</button>
                        <span class="cart-qty-val" style="padding: 4px 12px; font-weight: 600; font-size: 0.95rem;">${item.Quantidade}</span>
                        <button class="cart-qty-btn" style="border: none; background: white; padding: 4px 10px; cursor: pointer; color: #64748b;" onclick="cart.updateQuantity(${item.ID_itemCarrinho}, ${item.Quantidade + 1})">+</button>
                    </div>
                    
                    <button class="cart-remove-btn" onclick="cart.removeItem(${item.ID_itemCarrinho})" style="background: none; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ff8a8a; font-size: 0.85rem; cursor: pointer; padding: 0; margin-left: auto; transition: color 0.2s;">
                        <i class="fas fa-trash-alt" style="font-size: 1.1rem; margin-bottom: 2px;"></i>
                        <span style="font-weight: 500;">Remover</span>
                    </button>
                </div>
            </div>
        `;
      })
      .join("");

    if (this.items.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-light); margin-top: 2rem;">O seu carrinho está vazio.</p>';
    }

    totalEl.textContent = `€${total.toFixed(2)}`;
    if (badge) badge.textContent = this.items.length;
  }

  createCheckoutModal() {
    const overlay = document.createElement("div");
    overlay.className = "checkout-overlay";
    overlay.id = "checkout-overlay";

    const modal = document.createElement("div");
    modal.className = "checkout-modal";
    modal.id = "checkout-modal";
    modal.innerHTML = `
      <div class="checkout-modal-header" style="text-align: center; margin-bottom: 1.25rem;">
        <div style="background: linear-gradient(135deg, var(--primary-gold) 0%, #ffc107 100%); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; color: white; font-size: 1.2rem; box-shadow: 0 8px 20px rgba(244, 180, 0, 0.3);">
          <i class="fas fa-shopping-basket"></i>
        </div>
        <h5 class="fw-bold mb-1" style="font-family: var(--font-heading); color: var(--text-dark);">Finalizar Encomenda</h5>
        <p class="text-muted small mb-0" style="font-size: 0.8rem;">Complete os seus dados para receber o seu mel</p>
      </div>
      
      <form id="checkout-form">
        <div class="checkout-section mb-3">
          <label class="form-label fw-bold small text-uppercase mb-1" style="letter-spacing: 1px; color: #64748b; font-size: 0.75rem;">Dados de Entrega</label>
          <div class="mb-2">
            <div class="input-group-v2">
              <span class="input-icon"><i class="fas fa-map-marker-alt"></i></span>
              <input type="text" id="checkout-address" class="form-control" required placeholder="Morada Completa (Rua, Nº, CP, Cidade)">
            </div>
          </div>
          <div class="mb-2">
            <div class="input-group-v2">
              <span class="input-icon"><i class="fas fa-phone"></i></span>
              <input type="tel" id="checkout-phone" class="form-control" required placeholder="Telefone de Contacto" pattern="[0-9]{9,}">
            </div>
          </div>
        </div>

        <div class="checkout-section mb-3">
          <label class="form-label fw-bold small text-uppercase mb-1" style="letter-spacing: 1px; color: #64748b; font-size: 0.75rem;">Método de Pagamento</label>
          <div class="payment-options d-flex gap-2">
            <div class="payment-card active" style="flex: 1; border: 2px solid var(--primary-gold); border-radius: 12px; padding: 12px; text-align: center; cursor: pointer; background: #fffdf5; transition: all 0.2s; box-shadow: 0 4px 12px rgba(244, 180, 0, 0.1);">
              <i class="fas fa-credit-card d-block mb-1" style="font-size: 1.2rem; color: var(--primary-gold);"></i>
              <span class="small fw-bold text-dark">Cartão</span>
            </div>
            <div class="payment-card disabled" style="flex: 1; border: 2px solid transparent; background: #f8fafc; border-radius: 12px; padding: 12px; text-align: center; cursor: not-allowed; opacity: 0.7; transition: all 0.2s;">
              <i class="fas fa-university d-block mb-1" style="font-size: 1.2rem; color: #94a3b8;"></i>
              <span class="small fw-bold text-muted">MB Way</span>
            </div>
          </div>
        </div>

        <div class="order-summary-mini mb-3" style="background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="text-muted fw-medium small">Total a pagar:</span>
            <span class="fw-bold h4 mb-0" id="checkout-final-total" style="color: var(--primary-gold); font-family: var(--font-heading);">€0.00</span>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-2 fw-bold" id="confirm-checkout-btn" style="border-radius: 12px; font-size: 1.05rem; box-shadow: 0 8px 20px rgba(244, 180, 0, 0.3); transition: all 0.3s; background: linear-gradient(135deg, var(--primary-gold) 0%, #ffc107 100%); border: none;">
          Confirmar e Pagar
        </button>
        
        <button class="btn btn-link w-100 text-muted small mt-2 py-1 fw-medium" type="button" onclick="cart.closeCheckoutModal()" style="text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#1e293b'" onmouseout="this.style.color='#64748b'">Cancelar e voltar ao carrinho</button>
      </form>
      
      <style>
        .input-group-v2 {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 15px;
          color: #94a3b8;
          z-index: 10;
          font-size: 1rem;
        }
        .input-group-v2 .form-control {
          padding-left: 45px;
          height: 46px;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          background-color: #f8fafc;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.9rem;
          color: #1e293b;
        }
        .input-group-v2 .form-control:focus {
          border-color: var(--primary-gold);
          background-color: #ffffff;
          box-shadow: 0 0 0 4px rgba(244, 180, 0, 0.15);
          outline: none;
        }
        .input-group-v2 .form-control::placeholder {
          color: #94a3b8;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(244, 180, 0, 0.4) !important;
        }
      </style>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    document
      .getElementById("checkout-overlay")
      .addEventListener("click", () => this.closeCheckoutModal());
    document.getElementById("checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handlePaymentSimulation();
    });
  }

  openCheckoutModal() {
    const total = this.items.reduce(
      (sum, item) => sum + item.Preco * item.Quantidade,
      0,
    );
    document.getElementById("checkout-final-total").textContent =
      `€${total.toFixed(2)}`;

    document.getElementById("checkout-modal").classList.add("active");
    document.getElementById("checkout-overlay").classList.add("active");
    this.toggle(false); // Close cart sidebar
    document.documentElement.classList.add("modal-open"); // Block body scroll
  }

  closeCheckoutModal() {
    document.getElementById("checkout-modal").classList.remove("active");
    document.getElementById("checkout-overlay").classList.remove("active");
    document.documentElement.classList.remove("modal-open"); // Restore scroll
  }

  async handlePaymentSimulation() {
    const btn = document.getElementById("confirm-checkout-btn");
    const address = document.getElementById("checkout-address").value;
    const phone = document.getElementById("checkout-phone").value;

    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<span class="spinner-border"></span> Processando Pagamento...';
    btn.disabled = true;

    // Simulate network delay for payment
    await new Promise((r) => setTimeout(r, 2000));

    // Proceed to backend checkout
    await this.processBackendCheckout(address, phone);

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  async processBackendCheckout(address, phone) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/cart/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address, phone }),
      });

      const data = await res.json();
      if (res.ok) {
        this.closeCheckoutModal();
        window.closeAllPopups();

        Swal.fire({
          icon: "success",
          title: '<span style="color: #f4b400">Encomenda Confirmada!</span>',
          html: `
            <div style="text-align: center;">
              <p>Obrigado pela sua compra, a nossa colmeia já está a trabalhar nela!</p>
              <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-top: 1rem; border: 1px solid #e2e8f0;">
                <p class="small text-muted mb-0">Um email de confirmação foi enviado para a sua conta.</p>
                <p class="small fw-bold mt-1">ID da Encomenda: #${data.orderId}</p>
              </div>
            </div>
          `,
          confirmButtonColor: "#f4b400",
          confirmButtonText: "Continuar a Comprar",
        });

        this.items = [];
        this.render();
      } else {
        Swal.fire({
          title: "Erro",
          text: data.error || "Falha na encomenda",
          icon: "error",
          customClass: {
            container: "swal-top-layer",
          },
        });
      }
    } catch (error) {
      console.error("Checkout Request Failed", error);
      Swal.fire({
        title: "Erro",
        text: "Falha de comunicação com o servidor",
        icon: "error",
        customClass: {
          container: "swal-top-layer",
        },
      });
    }
  }
}

export const cart = new CartManager();
window.addToCart = (id) => cart.addItem(id);
window.cart = cart; // Expose to window for inline onclicks
