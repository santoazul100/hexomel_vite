const API_URL = "/api";
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
      <div class="checkout-modal-header" style="text-align: center; margin-bottom: 1rem;">
        <h5 class="fw-bold mb-1" style="font-family: var(--font-heading); color: var(--text-dark);">Finalizar Encomenda</h5>
        
        <!-- Stepper UI -->
        <div class="checkout-stepper mt-3 mb-2 d-flex justify-content-between position-relative">
          <div class="progress position-absolute" style="height: 3px; top: 15px; left: 10%; right: 10%; z-index: 1;">
            <div class="progress-bar" id="checkout-progress-bar" role="progressbar" style="width: 0%; background-color: var(--primary-gold);" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <div class="step-indicator active" id="step-ind-1">
            <div class="step-circle">1</div>
            <span class="step-label">Entrega</span>
          </div>
          <div class="step-indicator" id="step-ind-2">
            <div class="step-circle">2</div>
            <span class="step-label">Envio</span>
          </div>
          <div class="step-indicator" id="step-ind-3">
            <div class="step-circle">3</div>
            <span class="step-label">Pagamentos</span>
          </div>
          <div class="step-indicator" id="step-ind-4">
            <div class="step-circle">4</div>
            <span class="step-label">Revisão</span>
          </div>
        </div>
      </div>
      
      <form id="checkout-form">
        <!-- STEP 1: ENTREGA -->
        <div class="checkout-step-content active" id="checkout-step-1">
          <label class="form-label fw-bold small text-uppercase mb-2" style="letter-spacing: 1px; color: #64748b; font-size: 0.75rem;">Dados de Entrega</label>
          <div class="mb-3">
            <div class="input-group-v2">
              <span class="input-icon"><i class="fas fa-map-marker-alt"></i></span>
              <input type="text" id="checkout-address" class="form-control" required placeholder="Morada Completa (Rua, Nº, CP, Cidade)">
            </div>
          </div>
          <div class="mb-3">
            <div class="input-group-v2">
              <span class="input-icon"><i class="fas fa-phone"></i></span>
              <input type="tel" id="checkout-phone" class="form-control" required placeholder="Telefone de Contacto" pattern="[0-9]{9,}">
            </div>
          </div>
          <button type="button" class="btn btn-primary w-100 py-2 fw-bold btn-step" onclick="cart.goToStep(2)" style="background: var(--primary-gold); border-color: var(--primary-gold);">Continuar</button>
        </div>

        <!-- STEP 2: METODO ENVIO -->
        <div class="checkout-step-content d-none" id="checkout-step-2">
          <label class="form-label fw-bold small text-uppercase mb-2" style="letter-spacing: 1px; color: #64748b; font-size: 0.75rem;">Método de Envio</label>
          <div class="shipping-options d-flex flex-column gap-2 mb-3">
            <label class="shipping-card active-selection d-flex align-items-center p-3" style="border: 2px solid var(--primary-gold); border-radius: 12px; cursor: pointer; background: #fffdf5;">
              <input type="radio" name="shipping" value="ctt" checked class="me-3" style="accent-color: var(--primary-gold);">
              <div class="flex-grow-1">
                <div class="fw-bold text-dark">CTT Expresso</div>
                <div class="small text-muted">Entrega em 2-3 dias úteis</div>
              </div>
              <div class="fw-bold" style="color: var(--primary-gold);">+ €4.90</div>
            </label>
            <label class="shipping-card d-flex align-items-center p-3" style="border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer;">
              <input type="radio" name="shipping" value="loja" class="me-3" style="accent-color: var(--primary-gold);">
              <div class="flex-grow-1">
                <div class="fw-bold text-dark">Levantamento na Colmeia</div>
                <div class="small text-muted">Disponível em 24h</div>
              </div>
              <div class="fw-bold text-success">Grátis</div>
            </label>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-light w-50 py-2 fw-bold" onclick="cart.goToStep(1)">Voltar</button>
            <button type="button" class="btn btn-primary w-50 py-2 fw-bold btn-step" onclick="cart.goToStep(3)" style="background: var(--primary-gold); border-color: var(--primary-gold);">Continuar</button>
          </div>
        </div>

        <!-- STEP 3: PAGAMENTO -->
        <div class="checkout-step-content d-none" id="checkout-step-3">
          <label class="form-label fw-bold small text-uppercase mb-2" style="letter-spacing: 1px; color: #64748b; font-size: 0.75rem;">Método de Pagamento</label>
          <div class="payment-options d-flex gap-2 mb-3">
            <div class="payment-card active" style="flex: 1; border: 2px solid var(--primary-gold); border-radius: 12px; padding: 12px; text-align: center; cursor: pointer; background: #fffdf5; transition: all 0.2s;">
              <i class="fas fa-credit-card d-block mb-1" style="font-size: 1.2rem; color: var(--primary-gold);"></i>
              <span class="small fw-bold text-dark">Cartão</span>
            </div>
            <div class="payment-card disabled" style="flex: 1; border: 2px solid transparent; background: #f8fafc; border-radius: 12px; padding: 12px; text-align: center; cursor: not-allowed; opacity: 0.7;">
              <i class="fas fa-university d-block mb-1" style="font-size: 1.2rem; color: #94a3b8;"></i>
              <span class="small fw-bold text-muted">MB Way</span>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-light w-50 py-2 fw-bold" onclick="cart.goToStep(2)">Voltar</button>
            <button type="button" class="btn btn-primary w-50 py-2 fw-bold btn-step" onclick="cart.goToStep(4)" style="background: var(--primary-gold); border-color: var(--primary-gold);">Continuar</button>
          </div>
        </div>

        <!-- STEP 4: REVISAO -->
        <div class="checkout-step-content d-none" id="checkout-step-4">
          <label class="form-label fw-bold small text-uppercase mb-2" style="letter-spacing: 1px; color: #64748b; font-size: 0.75rem;">Resumo da Encomenda</label>
          <div class="order-summary-mini mb-3" style="background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div class="d-flex justify-content-between mb-2 small text-muted">
              <span>Subtotal:</span>
              <span id="checkout-subtotal">€0.00</span>
            </div>
            <div class="d-flex justify-content-between mb-2 small text-muted">
              <span>Portes de Envio:</span>
              <span id="checkout-shipping-cost">€0.00</span>
            </div>
            <hr class="my-2" style="border-color: #e2e8f0;">
            <div class="d-flex justify-content-between align-items-center">
              <span class="text-dark fw-bold">Total a pagar:</span>
              <span class="fw-bold h4 mb-0" id="checkout-final-total" style="color: var(--primary-gold); font-family: var(--font-heading);">€0.00</span>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button type="button" class="btn btn-light w-50 py-2 fw-bold" onclick="cart.goToStep(3)">Voltar</button>
            <button type="submit" class="btn btn-primary w-50 py-2 fw-bold" id="confirm-checkout-btn" style="border-radius: 12px; font-size: 1.05rem; box-shadow: 0 8px 20px rgba(244, 180, 0, 0.3); transition: all 0.3s; background: linear-gradient(135deg, var(--primary-gold) 0%, #ffc107 100%); border: none;">
              Pagar
            </button>
          </div>
        </div>
        
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
        .btn-step {
          border-radius: 10px;
        }

        /* Stepper CSS */
        .step-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 2;
          width: 60px;
          opacity: 0.5;
          transition: 0.3s;
        }
        .step-indicator.active, .step-indicator.completed {
          opacity: 1;
        }
        .step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.85rem;
          margin-bottom: 5px;
          transition: 0.3s;
          border: 2px solid #fff;
        }
        .step-indicator.active .step-circle {
          background: var(--primary-gold);
          color: white;
          box-shadow: 0 0 0 4px rgba(244, 180, 0, 0.2);
        }
        .step-indicator.completed .step-circle {
          background: var(--primary-gold);
          color: white;
        }
        .step-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .step-indicator.active .step-label {
          color: var(--primary-gold);
        }
        .checkout-step-content {
          animation: fadeIn 0.3s;
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

    // Handle Shipping Card Selection UI
    document.querySelectorAll('input[name="shipping"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        document.querySelectorAll(".shipping-card").forEach((card) => {
          card.style.borderColor = "#e2e8f0";
          card.style.background = "transparent";
        });
        const activeCard = e.target.closest(".shipping-card");
        if (activeCard) {
          activeCard.style.borderColor = "var(--primary-gold)";
          activeCard.style.background = "#fffdf5";
        }
        this.updateTotals();
      });
    });
  }

  goToStep(step) {
    if (step === 2) {
      // Validate step 1
      const address = document.getElementById("checkout-address").value;
      const phone = document.getElementById("checkout-phone").value;
      if (!address || !phone) {
        // Trigger native HTML validation
        document.getElementById("checkout-form").reportValidity();
        return;
      }
    }

    if (step === 4) {
      this.updateTotals();
    }

    // Hide all steps
    for (let i = 1; i <= 4; i++) {
      document.getElementById(`checkout-step-${i}`).classList.add("d-none");
      const ind = document.getElementById(`step-ind-${i}`);
      ind.classList.remove("active");
      if (i < step) ind.classList.add("completed");
      else ind.classList.remove("completed");
    }

    // Show current step
    document.getElementById(`checkout-step-${step}`).classList.remove("d-none");
    document.getElementById(`step-ind-${step}`).classList.add("active");

    // Update progress bar
    const progress = (step - 1) * 33.33;
    document.getElementById("checkout-progress-bar").style.width =
      `${progress}%`;
  }

  updateTotals() {
    const subtotal = this.items.reduce(
      (sum, item) => sum + item.Preco * item.Quantidade,
      0,
    );

    let shippingCost = 0;
    const shippingMethod = document.querySelector(
      'input[name="shipping"]:checked',
    );
    if (shippingMethod && shippingMethod.value === "ctt") {
      shippingCost = 4.9;
    }

    const finalTotal = subtotal + shippingCost;

    document.getElementById("checkout-subtotal").textContent =
      `€${subtotal.toFixed(2)}`;
    document.getElementById("checkout-shipping-cost").textContent =
      shippingCost === 0 ? "Grátis" : `€${shippingCost.toFixed(2)}`;
    document.getElementById("checkout-final-total").textContent =
      `€${finalTotal.toFixed(2)}`;
  }

  openCheckoutModal() {
    this.goToStep(1); // Ensure we start at step 1

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
      '<span class="spinner-border spinner-border-sm me-2"></span> Processando...';
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
