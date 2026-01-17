const API_URL = "http://localhost:3000/api";
import Swal from "sweetalert2";

class CartManager {
  constructor() {
    this.items = [];
    this.init();
  }

  async init() {
    this.createCartUI();
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

    // Create Overlay
    const overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    overlay.id = "cart-overlay";
    document.body.appendChild(overlay);

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
        icon: "warning",
        title: "Login Required",
        text: "Please login to add items to your cart!",
        confirmButtonColor: "var(--primary-gold)",
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
      Swal.fire("Your cart is empty!", "", "info");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire("Please login to checkout!", "", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cart/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Order Placed!",
          text: "Thank you for your purchase 🍯",
          confirmButtonColor: "var(--primary-gold)",
        });
        this.items = [];
        this.render();
        this.toggle(false);
      } else {
        Swal.fire("Checkout failed", data.error, "error");
      }
    } catch (error) {
      console.error("Checkout error:", error);
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
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.Nome}</div>
                        <div style="color: var(--text-light); font-size: 0.875rem;">Qty: ${
                          item.Quantidade
                        }</div>
                    </div>
                    <div style="font-weight: 600;">€${(
                      item.Preco * item.Quantidade
                    ).toFixed(2)}</div>
                </div>
            `;
      })
      .join("");

    if (this.items.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-light); margin-top: 2rem;">Your cart is empty.</p>';
    }

    totalEl.textContent = `€${total.toFixed(2)}`;
    if (badge) badge.textContent = this.items.length;
  }
}

export const cart = new CartManager();
window.addToCart = (id) => cart.addItem(id);
