import Swal from "sweetalert2";
import { API_URL, ensureBackendReady } from "./api.js";

class CartManager {
  constructor() {
    this.items = [];
    this.init();
  }

  async init() {
    this.createCartUI();
    this.renderBadgeOnly(); // Show badge as early as possible
    const backendAvailable = await ensureBackendReady();
    if (backendAvailable) {
      await this.syncWithBackend();
    }
    this.render();
  }

  renderBadgeOnly() {
    const badge = document.getElementById("cart-badge");
    if (badge) {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const total = cart.reduce(
        (sum, item) => sum + (item.Quantidade || item.quantity || 0),
        0,
      );
      badge.textContent = total;
    }
  }

  createCartUI() {
    if (window.location.pathname.includes("/checkout.html")) return;

    // Create Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "cart-sidebar";
    sidebar.id = "cart-sidebar";
    sidebar.innerHTML = `
            <div class="cart-header" style="padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 800; color: #1e293b; font-size: 1.5rem; letter-spacing: -0.5px;">O Seu Carrinho</h3>
                <button id="close-cart" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #64748b; padding: 0;">&times;</button>
            </div>
            <div class="cart-items" id="cart-items-container" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;"></div>
            <div class="cart-footer" style="padding: 1.5rem; border-top: 1px solid #f1f5f9; background: #fafafa;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-weight: 700; font-family: 'Outfit', sans-serif; font-size: 1.25rem; color: #1e293b;">
                    <span>Total:</span>
                    <span id="cart-total">€0.00</span>
                </div>
                <button id="checkout-btn" class="btn btn-primary" style="width: 100%; border-radius: 50px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: var(--primary-gold, #f4b400); border: none; color: #000; padding: 12px; font-family: 'Outfit', sans-serif;">Finalizar Compra</button>
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

    // 2FA Security Check
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.checkoutVerified !== true) {
      window.closeAllPopups();
      Swal.fire({
        title: "Verificação Necessária",
        text: "Por segurança, antes de efetuar o checkout precisamos de confirmar a sua identidade na sessão atual.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Fazer Verificação",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#f4b400",
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "profile.html?tab=security";
        }
      });
      return;
    }

    // Redirect to the new checkout page
    window.location.href = "checkout.html";
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
    if (typeof window.updateScrollLock === "function") {
      window.updateScrollLock();
    } else {
      // Fallback if main.js is not loaded yet or in different context
      if (show) {
        document.documentElement.classList.add("modal-open");
      } else {
        document.documentElement.classList.remove("modal-open");
      }
    }
  }

  render() {
    const container = document.getElementById("cart-items-container");
    const totalEl = document.getElementById("cart-total");
    const badge = document.getElementById("cart-badge");

    if (!container) return; // Prevent error on checkout page

    let total = 0;
    container.innerHTML = this.items
      .map((item) => {
        total += item.Preco * item.Quantidade;
        return `
            <div class="cart-item" style="display: flex; gap: 15px; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02); align-items: stretch;">
                <img src="${item.Imagem || '/img/produtos/' + item.ID_Produto + '.webp'}" onerror="this.src='/images/logo_hexomel.webp'" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: #f8fafc; padding: 5px;" alt="${item.Nome}">
                
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #1e293b; font-size: 1rem; line-height: 1.2; margin-bottom: 4px;">${item.Nome}</div>
                        <div style="font-weight: 700; color: var(--primary-green, #1a4d2e); font-size: 1.1rem; font-family: 'Outfit', sans-serif;">€${(item.Preco * item.Quantidade).toFixed(2)}</div>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
                        <div style="display: flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 50px; overflow: hidden; background: #fff;">
                            <button style="border: none; background: transparent; padding: 4px 12px; cursor: pointer; color: #64748b; font-weight: bold; font-size: 1.1rem;" onclick="cart.updateQuantity(${item.ID_itemCarrinho}, ${item.Quantidade - 1})">-</button>
                            <span style="padding: 4px 12px; font-weight: 700; font-size: 0.95rem; font-family: 'Outfit', sans-serif; color: #1e293b;">${item.Quantidade}</span>
                            <button style="border: none; background: transparent; padding: 4px 12px; cursor: pointer; color: #64748b; font-weight: bold; font-size: 1.1rem;" onclick="cart.updateQuantity(${item.ID_itemCarrinho}, ${item.Quantidade + 1})">+</button>
                        </div>
                        
                        <button onclick="cart.removeItem(${item.ID_itemCarrinho})" style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" title="Remover item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
      })
      .join("");

    if (this.items.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-light); margin-top: 2rem;">O seu carrinho está vazio.</p>';
    }

    if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
    const totalQty = this.items.reduce((sum, item) => sum + item.Quantidade, 0);
    if (badge) badge.textContent = totalQty;
  }

  clear() {
    this.items = [];
    localStorage.removeItem("cart");
    this.render();
    this.renderBadgeOnly();
  }
}

export const cart = new CartManager();
window.addToCart = (id) => cart.addItem(id);
window.cart = cart; // Expose to window for inline onclicks
