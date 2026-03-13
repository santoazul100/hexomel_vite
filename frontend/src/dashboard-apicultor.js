// Apicultor Dashboard Logic
const API_URL = "/api";

class ApicultorUI {
  constructor() {
    this.products = [];
    this.categories = [];
    this.workshops = [];
    this.token = localStorage.getItem("token");
    this.userData = JSON.parse(localStorage.getItem("user"));
    this.init();
  }

  async init() {
    // Security Check
    const role = this.userData?.role || this.userData?.userType || this.userData?.UserType;
    if (!this.token || !this.userData || (role?.toLowerCase() !== "apicultor" && role?.toLowerCase() !== "admin")) {
      window.location.href = "index.html";
      return;
    }

    // Set Welcome Name
    const welcomeEl = document.getElementById("apicultor-welcome-name");
    if (welcomeEl) welcomeEl.innerText = `Bem-vindo, ${this.userData.name.split(' ')[0]}`;

    this.setupEventListeners();
    this.initAuth();

    try {
      const { cart } = await import("./cart.js");
      const cartBtn = document.getElementById("cart-btn");
      if (cartBtn) cartBtn.addEventListener("click", () => cart.toggle(true));
    } catch (e) {}

    await this.loadCategories(); // Needed for products dropdown
    this.switchSection("dashboard");
  }

  async initAuth() {
    try {
      const { updateNav, getLoggedUser, logout } = await import("./auth.js");
      updateNav(getLoggedUser());
      document.body.addEventListener("click", (e) => {
        if (e.target.closest("#logout-btn")) {
          e.preventDefault();
          logout();
        }
      });
    } catch (e) {}
  }

  setupEventListeners() {
    const navLinks = document.querySelectorAll(".admin-nav-link[data-section]");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    const productForm = document.getElementById("productForm");
    if (productForm) {
      productForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSaveProduct();
      });
    }

    const workshopForm = document.getElementById("workshopForm");
    if (workshopForm) {
      workshopForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSaveWorkshop();
      });
    }

    this.setupImagePreview();
  }

  setupImagePreview() {
    const fileInput = document.getElementById("prod-image-file");
    const trigger = document.getElementById("upload-trigger");
    const preview = document.getElementById("prod-image-preview");

    if (trigger && fileInput) {
      trigger.addEventListener("click", () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.style.display = "block";
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  switchSection(sectionId) {
    document.querySelectorAll(".admin-nav-link").forEach((l) => l.classList.remove("active"));
    document.querySelector(`.admin-nav-link[data-section="${sectionId}"]`).classList.add("active");

    document.querySelectorAll(".admin-section").forEach((s) => s.classList.remove("active"));
    document.getElementById(`${sectionId}-section`).classList.add("active");

    if (sectionId === "dashboard") this.loadDashboardStats();
    if (sectionId === "products") this.loadProducts();
    if (sectionId === "workshops") this.loadWorkshops();
  }

  async loadDashboardStats() {
    await this.loadProducts(true);
    await this.loadWorkshops(true);

    const activeProducts = this.products.filter(p => p.Status === "Aprovado" || p.Status == null).length;
    const pendingProducts = this.products.filter(p => p.Status === "Pendente").length;
    
    document.getElementById("dash-total-products").innerText = activeProducts;
    document.getElementById("dash-pending-products").innerText = pendingProducts;
    document.getElementById("dash-total-workshops").innerText = this.workshops.length;
  }

  async loadCategories() {
    try {
      const resp = await fetch(`${API_URL}/categories`);
      if (resp.ok) {
        this.categories = await resp.json();
        const select = document.getElementById("prod-categoria");
        if (select) {
          select.innerHTML = '<option value="">Selecionar...</option>' + 
            this.categories.map(c => `<option value="${c.ID_Categoria}">${c.Nome}</option>`).join('');
        }
      }
    } catch (e) {}
  }

  async loadProducts(silent = false) {
    try {
      const response = await fetch(`${API_URL}/apicultores/${this.userData.id}/products`);
      if (response.ok) {
        this.products = await response.json();
        if (!silent) this.renderProducts();
      }
    } catch (error) {
      if (!silent) Swal.fire("Erro", "Falha ao carregar os seus produtos.", "error");
    }
  }

  renderProducts() {
    const container = document.getElementById("product-list-body");
    if (!container) return;

    if (this.products.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Ainda não adicionou nenhum produto.</td></tr>`;
      return;
    }

    container.innerHTML = this.products.map(p => {
      let statusClass = "aprovado";
      if (p.Status === "Pendente") statusClass = "pendente";
      if (p.Status === "Rejeitado") statusClass = "rejeitado";

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-3">
              <img src="${p.Imagem || '/images/wildflower.png'}" class="product-img-small" alt="${p.Nome}">
              <div class="fw-bold">${p.Nome}</div>
            </div>
          </td>
          <td>${parseFloat(p.Preco).toFixed(2)}€</td>
          <td>${p.Stock} UN</td>
          <td><span class="badge-premium ${statusClass}">${p.Status || "Aprovado"}</span></td>
          <td class="text-end">
            <!-- For now just delete, edits could go back to pending -->
            <button class="btn-action-premium delete" onclick="apicultorUI.deleteProduct('${p.ID_Produto}')" title="Remover">
                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
            </button>
          </td>
        </tr>
      `
    }).join('');
  }

  async loadWorkshops(silent = false) {
    try {
      const response = await fetch(`${API_URL}/apicultores/${this.userData.id}/workshops`);
      if (response.ok) {
        this.workshops = await response.json();
        if (!silent) this.renderWorkshops();
      }
    } catch (error) {}
  }

  renderWorkshops() {
    const container = document.getElementById("workshop-list-body");
    if (!container) return;

    if (this.workshops.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Ainda não agendou nenhum workshop.</td></tr>`;
      return;
    }

    container.innerHTML = this.workshops.map(w => `
      <tr>
        <td class="fw-bold">${w.Titulo}</td>
        <td>${new Date(w.Data_Realizacao).toLocaleString()}</td>
        <td>${parseFloat(w.Preco).toFixed(2)}€</td>
        <td>${w.Vagas}</td>
        <td class="text-end">
          <button class="btn-action-premium delete" onclick="apicultorUI.deleteWorkshop('${w.ID_Workshop}')" title="Cancelar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  resetForm() {
    document.getElementById("productForm").reset();
    document.getElementById("prod-image-preview").style.display = "none";
  }

  resetWorkshopForm() {
    document.getElementById("workshopForm").reset();
  }

  async handleSaveProduct() {
    const nome = document.getElementById("prod-nome").value;
    const preco = document.getElementById("prod-preco").value;
    const stock = document.getElementById("prod-stock").value;
    const idCategoria = document.getElementById("prod-categoria").value;
    const descricao = document.getElementById("prod-descricao").value;
    const tags = document.getElementById("prod-tags").value;
    
    // Upload image if selected
    const fileInput = document.getElementById("prod-image-file");
    let imagem = "";
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append("image", fileInput.files[0]);
      try {
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const ud = await uploadRes.json();
          imagem = ud.path;
        }
      } catch (e) {
        console.error("Upload failed", e);
      }
    }

    try {
      const response = await fetch(`${API_URL}/apicultor/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ nome, preco, stock, idCategoria, descricao, tags, imagem }),
      });

      if (!response.ok) throw new Error("Erro ao submeter produto.");
      
      Swal.fire("Sucesso!", "O produto foi submetido e aguarda aprovação pelo administrador.", "success");
      bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();
      this.loadProducts();
    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  async handleSaveWorkshop() {
    const titulo = document.getElementById("ws-titulo").value;
    const preco = document.getElementById("ws-preco").value;
    const vagas = document.getElementById("ws-vagas").value;
    const data = document.getElementById("ws-data").value;
    const descricao = document.getElementById("ws-descricao").value;
    const imagem = document.getElementById("ws-imagem").value;

    try {
      const response = await fetch(`${API_URL}/apicultor/workshops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          titulo, preco, vagas, data_realizacao: data, descricao, imagem
        }),
      });

      if (!response.ok) throw new Error("Erro ao criar workshop.");
      
      Swal.fire("Sucesso!", "Workshop agendado com sucesso.", "success");
      bootstrap.Modal.getInstance(document.getElementById("workshopModal")).hide();
      this.loadWorkshops();
    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  async deleteProduct(id) {
     // NOTE: We don't have a direct APICULTOR product deletion endpoint yet, 
     // but Admin can do it. For a proper app, apicultors should delete their own.
     Swal.fire("Em construção", "Por favor contacte o suporte para remover o produto por agora.", "info");
  }

  async deleteWorkshop(id) {
     Swal.fire("Em construção", "Cancelamento em desenvolvimento.", "info");
  }
}

// Global scope
window.apicultorUI = new ApicultorUI();
