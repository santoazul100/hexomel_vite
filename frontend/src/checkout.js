import { cart } from "./cart.js";
import Swal from "sweetalert2";
import { logInteraction } from "./analytics.js";

const API_URL = "/api";

class CheckoutManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 2;
    this.token = localStorage.getItem("token");
    this.userData = null;
    this.init();
  }

  async init() {
    if (!this.token) {
      window.location.href = "login.html";
      return;
    }

    // Parallelize cart sync and user profile fetch
    await Promise.all([cart.syncWithBackend(), this.fetchUserProfile()]);

    if (this.userData && this.userData.checkoutVerified !== true) {
      window.location.href = "profile.html?tab=security";
      return;
    }

    if (cart.items.length === 0) {
      window.location.href = "shop.html";
      return;
    }

    this.renderSummary();
    this.setupListeners();
    this.updateUI();

    // Track checkout start
    logInteraction("checkout_start", {
      itemCount: cart.items.length,
      totalValue: cart.items.reduce((acc, item) => acc + item.Preco * item.Quantidade, 0).toFixed(2)
    });
  }

  async fetchUserProfile() {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (res.ok) {
        this.userData = await res.json();
        this.autoFillData();
      }
    } catch (error) {
      console.error("Error fetching profile for checkout:", error);
    }
  }

  autoFillData() {
    if (!this.userData) return;

    // Split name into first and last if possible
    const nameParts = (this.userData.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Fill basic identification
    const fields = {
      nome: firstName,
      apelido: lastName,
      telemovel: this.userData.phone || "",
    };

    for (const [id, value] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el && value) el.value = value;
    }

    // Fill address info (Step 2)
    if (this.userData.address) {
      const addrParts = this.userData.address.split(", ");
      if (addrParts.length >= 2) {
        const mainAddress = addrParts[0];
        const lastPart = addrParts[1]; // Expected "XXXX-XXX City"
        const lastPartWords = lastPart.split(" ");
        const zip = lastPartWords[0];
        const city = lastPartWords.slice(1).join(" ");

        const moradaEl = document.getElementById("morada");
        const zipEl = document.getElementById("cod-postal");
        const cityEl = document.getElementById("cidade");

        if (moradaEl) moradaEl.value = mainAddress;
        if (zipEl) zipEl.value = zip;
        if (cityEl) cityEl.value = city;
      } else {
        // Fallback: just put everything in morada
        const moradaEl = document.getElementById("morada");
        if (moradaEl) moradaEl.value = this.userData.address;
      }
    }
  }

  setupListeners() {
    const form = document.getElementById("checkout-main-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.currentStep === this.totalSteps) {
        this.handleFinalSubmit();
      } else {
        this.nextStep();
      }
    });

    // Shipping radio buttons - also handle visual feedback
    document.querySelectorAll('input[name="envio"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.updateSelectionCards("envio");
        this.renderSummary();
      });
    });

    // Payment radio buttons
    document.querySelectorAll('input[name="pagamento"]').forEach((input) => {
      input.addEventListener("change", (e) => {
        this.updateSelectionCards("pagamento");
      });
    });
  }

  updateSelectionCards(name) {
    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      const card = input.closest(".selection-card");
      if (card) {
        if (input.checked) {
          card.classList.add("selected");
        } else {
          card.classList.remove("selected");
        }
      }
    });
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Validate current step
      const currentContent = document.getElementById(
        `step-content-${this.currentStep}`,
      );
      const inputs = currentContent.querySelectorAll("input[required]");
      let valid = true;

      inputs.forEach((input) => {
        if (!input.value.trim()) {
          input.style.borderColor = "var(--primary-green)"; // Use brand color for highlight
          valid = false;
        } else {
          input.style.borderColor = "var(--border-color)";
        }
      });

      if (!valid) {
        Swal.fire({
          icon: "warning",
          title: "Campos Obrigatórios",
          text: "Por favor, preenche todos os campos necessários.",
          confirmButtonColor: "#f4b400",
        });
        return;
      }

      this.currentStep++;
      this.updateUI();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  }

  updateUI() {
    const stepLabels = [
      "Dados de Envio",
      "Pagamento e Revisão",
    ];

    const titleEl = document.getElementById("page-title");
    if (titleEl) titleEl.textContent = stepLabels[this.currentStep - 1];

    // Update stepper
    for (let i = 1; i <= this.totalSteps; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (stepEl) {
        stepEl.classList.remove("active", "completed");
        if (i < this.currentStep) {
          stepEl.classList.add("completed");
        } else if (i === this.currentStep) {
          stepEl.classList.add("active");
        }
      }

      // Show/Hide content
      const contentEl = document.getElementById(`step-content-${i}`);
      if (contentEl) {
        if (i === this.currentStep) {
          contentEl.classList.remove("d-none");
        } else {
          contentEl.classList.add("d-none");
        }
      }
    }

    // Prepare Review Step (Step 2)
    if (this.currentStep === 2) {
      const morada = document.getElementById("morada").value;
      const cp = document.getElementById("cod-postal").value;
      const cidade = document.getElementById("cidade").value;
      const telemovel = document.getElementById("telemovel").value;

      document.getElementById("review-morada").textContent =
        `${morada}, ${cp} ${cidade}`;
      document.getElementById("review-contacto").textContent =
        `Telemóvel: ${telemovel}`;

      const pagamento = document.querySelector(
        'input[name="pagamento"]:checked',
      ).value;
      document.getElementById("review-pagamento").textContent =
        pagamento === "cartao" ? "Cartão de Crédito / Débito" : "MB Way";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderSummary() {
    const list = document.getElementById("summary-items-list");
    let subtotal = 0;

    list.innerHTML = cart.items
      .map((item) => {
        subtotal += item.Preco * item.Quantidade;
        return `
                <div class="summary-item">
                    <img src="${item.Imagem || "/img/produtos/" + item.ID_Produto + ".webp"}" 
                         class="summary-item-img" 
                         onerror="this.src='https://placehold.co/100x100?text=Mel'">
                    <div class="summary-item-info">
                        <div class="summary-item-name">${item.Nome}</div>
                        <div style="font-size: 0.75rem; color: var(--text-light)">Quantidade: ${item.Quantidade}</div>
                        <div class="summary-item-price">€${(item.Preco * item.Quantidade).toFixed(2)}</div>
                    </div>
                </div>
            `;
      })
      .join("");

    const shippingType = document.querySelector(
      'input[name="envio"]:checked',
    ).value;
    const shippingCost = shippingType === "ctt" ? 4.9 : 0;
    const total = subtotal + shippingCost;

    document.getElementById("subtotal-val").textContent =
      `€${subtotal.toFixed(2)}`;
    document.getElementById("shipping-val").textContent =
      shippingCost === 0 ? "Grátis" : `€${shippingCost.toFixed(2)}`;
    document.getElementById("total-val").textContent = `€${total.toFixed(2)}`;
  }

  async handleFinalSubmit() {
    const btn = document.getElementById("final-submit-btn");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "A redirecionar...";

    const address = `${document.getElementById("morada").value}, ${document.getElementById("cod-postal").value} ${document.getElementById("cidade").value}`;
    const phone = document.getElementById("telemovel").value;
    const nome = document.getElementById("nome").value;
    const apelido = document.getElementById("apelido").value;

    const shippingType = document.querySelector('input[name="envio"]:checked').value;
    const shippingCost = shippingType === "ctt" ? 4.9 : 0;
    const paymentType = document.querySelector('input[name="pagamento"]:checked').value;

    try {
      // If it's MBWay, we use the manual checkout (Legacy)
      // If it's Card, we use Stripe Checkout Session
      const endpoint = paymentType === "cartao" ? "/api/checkout/create-session" : "/api/cart/checkout";
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ 
          address, 
          phone, 
          nome, 
          apelido,
          shippingCost
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.url) {
          // Stripe Session (Real or Mock)
          window.location.href = data.url;
        } else {
          // Manual Checkout Success (Legacy/MBWay)
          logInteraction("order_placed", {
            orderId: data.orderId,
            total: data.total || 0,
            itemCount: cart.items.length
          });

          localStorage.removeItem("cart");
          Swal.fire({
            icon: "success",
            title: "Encomenda Confirmada!",
            text: `Obrigado pela sua compra. ID do pedido: #${data.orderId}`,
            confirmButtonColor: "#f4b400",
          }).then(() => {
            window.location.href = "shop.html";
          });
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Erro no Checkout",
          text: data.error || "Não foi possível processar a encomenda",
          confirmButtonColor: "#f4b400",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erro de Rede",
        text: "Ocorreu um erro ao ligar ao servidor. Tenta novamente.",
        confirmButtonColor: "#f4b400",
      });
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

window.checkoutManager = new CheckoutManager();
