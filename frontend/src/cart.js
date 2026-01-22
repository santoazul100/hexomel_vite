const API_URL = "http://localhost:3000/api";
import Swal from "sweetalert2";

class CartManager {
  constructor() {
    this.items = [];
    this.init();
  }

  async init() {
    this.createCartUI();
    this.createCheckoutModal(); // Init modal
    await this.syncWithBackend();
    this.render();
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
        background: white;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10001;
        width: 90%;
        max-width: 500px;
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
      Swal.fire("O carrinho está vazio!", "", "info");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
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
                
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" onclick="cart.updateQuantity(${item.ID_itemCarrinho}, ${item.Quantidade - 1})">-</button>
                    <span class="cart-qty-val">${item.Quantidade}</span>
                    <button class="cart-qty-btn" onclick="cart.updateQuantity(${item.ID_itemCarrinho}, ${item.Quantidade + 1})">+</button>
                    
                    <button class="cart-remove-btn" onclick="cart.removeItem(${item.ID_itemCarrinho})">
                        <i class="fas fa-trash"></i> Remover
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
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0 fw-bold">Finalizar Compra</h4>
        <button type="button" class="btn-close" onclick="cart.closeCheckoutModal()"></button>
      </div>
      <form id="checkout-form">
        <div class="mb-3">
          <label class="form-label small fw-bold">Morada de Entrega</label>
          <input type="text" class="form-control form-control-v2" required placeholder="Rua, Cidade, Código Postal">
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold">Pagamento (Simulação)</label>
          <div class="d-flex gap-2">
            <div class="border rounded p-2 flex-grow-1 text-center" style="cursor:pointer; border-color: var(--primary-color)!important">
              <i class="fas fa-credit-card me-2"></i> Cartão
            </div>
            <div class="border rounded p-2 flex-grow-1 text-center text-muted">
              <i class="fas fa-university me-2"></i> MB Way
            </div>
          </div>
        </div>
        <div class="mb-4">
           <label class="form-label small fw-bold">Dados do Cartão (Mock)</label>
           <input type="text" class="form-control form-control-v2 mb-2" value="4242 4242 4242 4242" disabled>
           <div class="row g-2">
             <div class="col-6"><input type="text" class="form-control form-control-v2" value="12/28" disabled></div>
             <div class="col-6"><input type="text" class="form-control form-control-v2" value="123" disabled></div>
           </div>
        </div>
        <button type="submit" class="btn btn-primary w-100" id="confirm-checkout-btn">
          Pagar e Encomendar
        </button>
      </form>
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
    document.getElementById("checkout-modal").classList.add("active");
    document.getElementById("checkout-overlay").classList.add("active");
    this.toggle(false); // Close cart sidebar
  }

  closeCheckoutModal() {
    document.getElementById("checkout-modal").classList.remove("active");
    document.getElementById("checkout-overlay").classList.remove("active");
  }

  async handlePaymentSimulation() {
    const btn = document.getElementById("confirm-checkout-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border"></span> Processando...';
    btn.disabled = true;

    // Simulate network delay for payment
    await new Promise((r) => setTimeout(r, 1500));

    // Proceed to backend checkout
    await this.processBackendCheckout();

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  async processBackendCheckout() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/cart/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        this.closeCheckoutModal();
        Swal.fire({
          icon: "success",
          title: "Encomenda Confirmada!",
          html: `<p>Obrigado pela sua compra.</p><p class="small text-muted">Um email de confirmação foi enviado.</p>`,
          confirmButtonColor: "var(--primary-gold)",
        });
        this.items = [];
        this.render();
      } else {
        Swal.fire("Erro", data.error || "Falha na encomenda", "error");
      }
    } catch (error) {
      console.error("Checkout Request Failed", error);
      Swal.fire("Erro", "Falha de comunicação com o servidor", "error");
    }
  }
}

export const cart = new CartManager();
window.addToCart = (id) => cart.addItem(id);
window.cart = cart; // Expose to window for inline onclicks
