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
    this.currentOrderId = new URLSearchParams(window.location.search).get("orderId");
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

    // Allow access if we have items in cart OR we are paying for an existing order
    if (cart.items.length === 0 && !this.currentOrderId) {
      window.location.href = "shop.html";
      return;
    }

    // If we have an orderId, we need to load its items instead of the cart items for the summary
    if (this.currentOrderId) {
      await this.fetchOrderData();
      this.currentStep = 2; // Skip to payment step for existing orders
    }

    this.renderSummary();
    this.setupListeners();
    this.updateUI();

    // Track checkout start
    logInteraction("checkout_start", {
      orderId: this.currentOrderId,
      itemCount: cart.items.length,
      totalValue: cart.items.reduce((acc, item) => acc + item.Preco * item.Quantidade, 0).toFixed(2)
    });
  }

  async fetchOrderData() {
    try {
      const [resItems, resDetails] = await Promise.all([
        fetch(`${API_URL}/user/orders/${this.currentOrderId}/items`, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
        fetch(`${API_URL}/user/orders/${this.currentOrderId}`, {
          headers: { Authorization: `Bearer ${this.token}` },
        })
      ]);

      if (resItems.ok) {
        const items = await resItems.json();
        // Override cart items for summary display
        // We map them to match the cart item structure
        this.orderItems = items.map(it => ({
          ...it,
          Preco: it.Preco_Unitario,
          Nome: it.Nome,
          ID_Produto: it.ID_Produto
        }));
      }

      if (resDetails.ok) {
        const order = await resDetails.json();
        this.orderData = order;
        this.autoFillOrderData();
      }
    } catch (error) {
      console.error("Error fetching order data:", error);
    }
  }

  autoFillOrderData() {
    if (!this.orderData) return;
    
    // Fill identification
    if (this.orderData.Nome) {
        const el = document.getElementById("nome");
        if (el) el.value = this.orderData.Nome;
    }
    if (this.orderData.Apelido) {
        const el = document.getElementById("apelido");
        if (el) el.value = this.orderData.Apelido;
    }

    // Fill address fields
    if (this.orderData.Morada) {
      const addrParts = this.orderData.Morada.split(", ");
      if (addrParts.length >= 2) {
        const mainAddress = addrParts[0];
        const lastPart = addrParts[1];
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
        const moradaEl = document.getElementById("morada");
        if (moradaEl) moradaEl.value = this.orderData.Morada;
      }
    }
    
    if (this.orderData.Telefone) {
      const telEl = document.getElementById("telemovel");
      if (telEl) telEl.value = this.orderData.Telefone;
    }

    // Select shipping method
    const shippingType = this.orderData.Tipo_Envio || (parseFloat(this.orderData.Custo_Envio || 0) > 0 ? "ctt" : "levantamento");
    const radio = document.querySelector(`input[name="envio"][value="${shippingType}"]`);
    if (radio) {
      radio.checked = true;
      this.updateSelectionCards("envio");
    }
  }

  async fetchUserProfile() {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (res.ok) {
        this.userData = await res.json();
        const btn = document.getElementById("btn-autofill");
        if (btn && this.userData && (this.userData.name || this.userData.address || this.userData.phone)) {
          btn.classList.remove("d-none");
          btn.addEventListener("click", () => {
            this.autoFillData();
            
            // Subtle toast if some data is missing
            if (!this.userData.address || !this.userData.phone) {
              Swal.fire({
                toast: true,
                position: 'bottom-end',
                icon: 'info',
                title: 'Aviso: Alguns dados não estão preenchidos no teu perfil.',
                showConfirmButton: false,
                timer: 4000,
                background: '#f8f9fa',
                color: '#6c757d'
              });
            }

            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check me-1"></i>Preenchido';
            btn.classList.add("btn-success", "text-white");
            btn.classList.remove("btn-outline-success");
            setTimeout(() => {
              btn.innerHTML = originalHtml;
              btn.classList.remove("btn-success", "text-white");
              btn.classList.add("btn-outline-success");
            }, 2000);
          });
        }
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

    // Fill address info
    if (this.userData.address) {
      const zipMatch = this.userData.address.match(/\b\d{4}-\d{3}\b/);
      let mainAddress = this.userData.address;
      let zip = "";
      let city = "";

      if (zipMatch) {
        zip = zipMatch[0];
        const zipIndex = this.userData.address.indexOf(zip);
        
        mainAddress = this.userData.address.substring(0, zipIndex).trim();
        if (mainAddress.endsWith(',')) {
          mainAddress = mainAddress.slice(0, -1).trim();
        }
        
        city = this.userData.address.substring(zipIndex + zip.length).trim();
      }

      const moradaEl = document.getElementById("morada");
      const zipEl = document.getElementById("cod-postal");
      const cityEl = document.getElementById("cidade");

      if (moradaEl) moradaEl.value = mainAddress;
      if (zipEl) zipEl.value = zip;
      if (cityEl) cityEl.value = city;
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
        this.updateConfirmationDetails();
      });
    });

    ["nome", "apelido", "morada", "cod-postal", "cidade", "telemovel"].forEach(
      (id) => {
        const element = document.getElementById(id);
        element?.addEventListener("input", () => {
          this.updateConfirmationDetails();
        });
      },
    );
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

  getShippingType() {
    return document.querySelector('input[name="envio"]:checked')?.value || "ctt";
  }

  getShippingLabel(shippingType) {
    return shippingType === "ctt"
      ? "CTT Expresso - entrega em casa"
      : "Levantamento no Apiario";
  }

  getCheckoutCustomerName() {
    const nome = document.getElementById("nome")?.value?.trim() || "";
    const apelido = document.getElementById("apelido")?.value?.trim() || "";
    return [nome, apelido].filter(Boolean).join(" ").trim() || "Por confirmar";
  }

  updateConfirmationDetails() {
    const morada = document.getElementById("morada")?.value?.trim() || "";
    const cp = document.getElementById("cod-postal")?.value?.trim() || "";
    const cidade = document.getElementById("cidade")?.value?.trim() || "";
    const telemovel = document.getElementById("telemovel")?.value?.trim() || "";
    const shippingType = this.getShippingType();
    const shippingLabel = this.getShippingLabel(shippingType);
    const paymentLabel = "Stripe Checkout - cartao";
    const customerName = this.getCheckoutCustomerName();
    const fullAddress = [morada, `${cp} ${cidade}`.trim()]
      .filter(Boolean)
      .join(", ");

    const confirmName = document.getElementById("confirm-name");
    const confirmPhone = document.getElementById("confirm-phone");
    const confirmAddress = document.getElementById("confirm-address");
    const confirmShipping = document.getElementById("confirm-shipping");
    const confirmPayment = document.getElementById("confirm-payment");

    if (confirmName) confirmName.textContent = customerName;
    if (confirmPhone) confirmPhone.textContent = telemovel || "Por confirmar";
    if (confirmAddress) confirmAddress.textContent = fullAddress || "Por confirmar";
    if (confirmShipping) confirmShipping.textContent = shippingLabel;
    if (confirmPayment) confirmPayment.textContent = paymentLabel;
  }

  async nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Validate current step
      const currentContent = document.getElementById(
        `step-content-${this.currentStep}`,
      );
      const inputs = currentContent.querySelectorAll("input[required]");
      let valid = true;

      inputs.forEach((input) => {
        if (!input.value.trim()) {
          input.style.borderColor = "var(--primary-green)";
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

      // Removed Step 1 initialization to only create order on final submit
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
      "Confirmacao e Pagamento",
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

    this.updateConfirmationDetails();

    // Toggle confirmation expansion on sidebar
    const summaryConfirmCard = document.getElementById("summary-confirm-card");
    const mainGrid = document.querySelector(".checkout-main-grid");

    if (summaryConfirmCard) {
      summaryConfirmCard.classList.toggle("is-open", this.currentStep === 2);
    }
    if (mainGrid) {
      mainGrid.classList.toggle("is-confirming", this.currentStep === 2);
    }

    // Header Back Button Logic
    const headerBackButton = document.querySelector(".back-to-shop");
    if (headerBackButton) {
      if (this.currentStep === 2) {
        headerBackButton.onclick = (e) => {
          e.preventDefault();
          this.prevStep();
        };
        headerBackButton.title = "Voltar aos Dados de Envio";
      } else {
        headerBackButton.onclick = null;
        headerBackButton.title = "Voltar à Loja";
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderSummary() {
    const list = document.getElementById("summary-items-list");
    let subtotal = 0;

    const itemsToRender = this.currentOrderId ? (this.orderItems || []) : cart.items;

    list.innerHTML = itemsToRender
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

    const shippingType = this.getShippingType();
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
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A redirecionar...';

    const address = `${document.getElementById("morada").value}, ${document.getElementById("cod-postal").value} ${document.getElementById("cidade").value}`;
    const phone = document.getElementById("telemovel").value;
    const nome = document.getElementById("nome").value;
    const apelido = document.getElementById("apelido").value;

    const shippingType = document.querySelector('input[name="envio"]:checked').value;
    const shippingCost = shippingType === "ctt" ? 4.9 : 0;
    // Always card for Stripe
    const paymentType = "card";

    try {
      const res = await fetch(`${API_URL}/checkout/create-session`, {
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
          shippingCost,
          shippingType,
          orderId: this.currentOrderId,
          paymentType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.url) {
          // Stripe Session (Real or Mock)
          cart.clear(); // Clear cart immediately on redirect
          window.location.href = data.url;
        } else {
          // Manual Checkout Success (Legacy)
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
      btn.innerHTML = originalText;
    }
  }
}

window.checkoutManager = new CheckoutManager();
