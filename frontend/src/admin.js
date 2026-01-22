// Hexomel Admin Logic
const API_URL = "/api";

class AdminUI {
  constructor() {
    this.products = [];
    this.users = [];
    this.orders = [];
    this.token = localStorage.getItem("token");
    this.userData = JSON.parse(localStorage.getItem("user"));
    this.currentTags = new Set(); // Stores active tags for the modal
    this.init();
  }

  async init() {
    // Security Check
    const role =
      this.userData.role || this.userData.userType || this.userData.UserType;

    if (!this.token || !this.userData || role?.toLowerCase() !== "admin") {
      window.location.href = "index.html";
      return;
    }

    this.setupEventListeners();
    this.injectNavbar();
    this.initTagInput(); // Initialize tags once globally
    await this.loadProducts(); // Default view
  }

  async injectNavbar() {
    try {
      const response = await fetch("index.html");
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const navbar = doc.querySelector(".navbar-enhanced");
      if (navbar) {
        // Remove cart button from admin navbar to avoid confusion or fix its logic
        const cartBtn = navbar.querySelector(".cart-navbar-separate");
        if (cartBtn) cartBtn.remove();

        document.getElementById("navbar-placeholder").appendChild(navbar);

        // Re-initialize auth section in navbar
        const { updateNav, getLoggedUser } = await import("./auth.js");
        updateNav(getLoggedUser());
      }
    } catch (error) {
      console.error("Erro ao injetar navbar:", error);
    }
  }

  setupEventListeners() {
    // Nav switching
    const navLinks = document.querySelectorAll(".admin-nav-link[data-section]");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    // Product Form
    const productForm = document.getElementById("productForm");
    if (productForm) {
      productForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSaveProduct();
      });
    }
  }

  switchSection(sectionId) {
    // Update Nav UI
    document
      .querySelectorAll(".admin-nav-link")
      .forEach((l) => l.classList.remove("active"));
    document
      .querySelector(`.admin-nav-link[data-section="${sectionId}"]`)
      .classList.add("active");

    // Update Visibility
    document
      .querySelectorAll(".admin-section")
      .forEach((s) => s.classList.remove("active"));
    document.getElementById(`${sectionId}-section`).classList.add("active");

    // Load Data
    if (sectionId === "products") this.loadProducts();
    if (sectionId === "customers") this.loadUsers();
    if (sectionId === "orders") this.loadOrders();
  }

  // --- PRODUCTS ---
  async loadProducts() {
    try {
      const response = await fetch(`${API_URL}/admin/products`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar produtos");
      this.products = await response.json();
      this.renderProducts();
    } catch (error) {
      Swal.fire("Erro", "Não foi possível carregar os produtos.", "error");
    }
  }

  renderProducts() {
    const container = document.getElementById("product-list-body");
    container.innerHTML = this.products
      .map(
        (p) => `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <img src="${p.Imagem || "public/images/wildflower.png"}" class="product-img-small" alt="${p.Nome}">
                        <div>
                            <div class="fw-bold">${p.Nome}</div>
                            <div class="text-muted small">#${p.ID_Produto}</div>
                        </div>
                    </div>
                </td>
                <td class="fw-bold">${parseFloat(p.Preco).toFixed(2)}€</td>
                <td>
                    <span class="badge-status ${p.Stock < 10 ? "badge-low" : "badge-ok"}">
                        ${p.Stock} em stock
                    </span>
                </td>
                <td>${p.ID_Categoria === 1 ? "Méls" : "Derivados"}</td>
                <td>
                    <div class="d-flex flex-wrap gap-1">
                        ${
                          p.Tags
                            ? p.Tags.split(",")
                                .map(
                                  (tag) => `
                            <span class="badge bg-secondary smaller text-uppercase" style="font-size: 0.65rem;">${tag.trim()}</span>
                        `,
                                )
                                .join("")
                            : ""
                        }
                    </div>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light me-1" onclick="adminUI.editProduct('${p.ID_Produto}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-danger" onclick="adminUI.deleteProduct('${p.ID_Produto}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  // --- CUSTOMERS ---
  async loadUsers() {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar clientes");
      this.users = await response.json();
      this.renderUsers();
    } catch (error) {
      Swal.fire("Erro", "Não foi possível carregar os clientes.", "error");
    }
  }

  renderUsers() {
    const container = document.getElementById("customer-list-body");
    container.innerHTML = this.users
      .map(
        (u) => `
            <tr>
                <td><div class="fw-bold">${u.Nome}</div></td>
                <td>${u.Email}</td>
                <td><span class="badge bg-light text-dark">${u.UserType}</span></td>
                <td>${new Date(u.Data_Resgistro).toLocaleDateString()}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light text-danger" onclick="adminUI.deleteUser('${u.ID_Cliente}')" ${u.ID_Cliente === this.userData.id ? "disabled" : ""}>
                        <i class="fas fa-user-minus"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  // --- ORDERS ---
  async loadOrders() {
    try {
      const response = await fetch(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar encomendas");
      this.orders = await response.json();
      this.renderOrders();
    } catch (error) {
      Swal.fire("Erro", "Não foi possível carregar as encomendas.", "error");
    }
  }

  renderOrders() {
    const container = document.getElementById("order-list-body");
    container.innerHTML = this.orders
      .map(
        (o) => `
            <tr>
                <td class="fw-bold">#${o.ID_Encomenda}</td>
                <td>${o.ClienteNome}</td>
                <td>${new Date(o.Data_Encomenda).toLocaleDateString()}</td>
                <td class="fw-bold">${parseFloat(o.Total).toFixed(2)}€</td>
                <td>
                    <span class="badge-status badge-${o.Status.toLowerCase()}">${o.Status}</span>
                </td>
                <td class="text-end">
                    <select class="form-select form-select-sm d-inline-block w-auto" onchange="adminUI.updateOrderStatus('${o.ID_Encomenda}', this.value)">
                        <option value="Pendente" ${o.Status === "Pendente" ? "selected" : ""}>Pendente</option>
                        <option value="Pago" ${o.Status === "Pago" ? "selected" : ""}>Pago</option>
                        <option value="Enviado" ${o.Status === "Enviado" ? "selected" : ""}>Enviado</option>
                    </select>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  // --- ACTIONS ---
  async updateOrderStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar estado");
      Swal.fire({
        icon: "success",
        title: "Estado Atualizado",
        timer: 1000,
        showConfirmButton: false,
      });
      await this.loadOrders();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteUser(id) {
    const result = await Swal.fire({
      title: "Remover Cliente?",
      text: "Esta ação apagará a conta e todo o histórico!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Confirmar Remoção",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao remover utilizador");
        Swal.fire("Removido", "O cliente foi removido do sistema.", "success");
        await this.loadUsers();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // --- PRODUCT CRUD HELPERS (existing logic) ---
  resetForm() {
    document.getElementById("productForm").reset();
    document.getElementById("product-id").value = "";
    document.getElementById("modalTitle").innerText = "Novo Produto";
    this.currentTags.clear(); // Clear tags on form reset
    this.renderTagPills();
    this.renderSuggestions();
  }

  editProduct(id) {
    const p = this.products.find(
      (prod) => String(prod.ID_Produto) === String(id),
    );
    if (!p) return;
    document.getElementById("product-id").value = p.ID_Produto;
    document.getElementById("prod-nome").value = p.Nome;
    document.getElementById("prod-preco").value = p.Preco; // Corrected from prod-price to prod-preco
    document.getElementById("prod-stock").value = p.Stock;
    document.getElementById("prod-categoria").value = p.ID_Categoria;
    document.getElementById("prod-descricao").value = p.Descricao || "";
    document.getElementById("prod-imagem").value = p.Imagem || "";

    // Initialize Tags
    this.currentTags = new Set(
      p.Tags ? p.Tags.split(",").map((t) => t.trim()) : [],
    );
    this.renderTagPills();
    // this.initTagInput(); // Removed to avoid duplicate listeners

    document.getElementById("modalTitle").innerText = "Editar Produto";
    new bootstrap.Modal(document.getElementById("productModal")).show();
  }

  async handleSaveProduct() {
    const id = document.getElementById("product-id").value;
    const nome = document.getElementById("prod-nome").value;
    const preco = parseFloat(document.getElementById("prod-preco").value);
    const stock = parseInt(document.getElementById("prod-stock").value);
    const idCategoria = parseInt(
      document.getElementById("prod-categoria").value,
    );
    const descricao = document.getElementById("prod-descricao").value;
    const imagem =
      document.getElementById("prod-imagem").value || "/images/wildflower.png";
    const tags = Array.from(this.currentTags).join(", "); // Join Set to String

    const method = id ? "PUT" : "POST";
    const url = id
      ? `${API_URL}/admin/products/${id}`
      : `${API_URL}/admin/products`;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          nome,
          preco,
          stock,
          idCategoria,
          descricao,
          imagem,
          tags,
        }),
      });
      if (!response.ok) throw new Error("Erro ao guardar produto");
      Swal.fire({
        icon: "success",
        title: id ? "Atualizado" : "Criado",
        timer: 1500,
        showConfirmButton: false,
      });
      bootstrap.Modal.getInstance(
        document.getElementById("productModal"),
      ).hide();
      await this.loadProducts();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteProduct(id) {
    const result = await Swal.fire({
      title: "Tem a certeza?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, eliminar!",
    });
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/products/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao eliminar");
        Swal.fire("Eliminado", "", "success");
        await this.loadProducts();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }
  // --- TAG MANAGEMENT ---
  initTagInput() {
    const input = document.getElementById("tag-input-field");
    const container = document.getElementById("tag-input-container");
    if (!input || !container) return;

    // Handle Enter key
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.addTag(input.value);
        input.value = "";
      }
      if (
        e.key === "Backspace" &&
        input.value === "" &&
        this.currentTags.size > 0
      ) {
        const lastTag = Array.from(this.currentTags).pop();
        this.removeTag(lastTag);
      }
    });

    this.renderSuggestions();
  }

  addTag(tagName) {
    const cleanTag = tagName.trim();
    if (cleanTag && !this.currentTags.has(cleanTag)) {
      this.currentTags.add(cleanTag);
      this.renderTagPills();
      this.renderSuggestions(); // Refresh suggestions
    }
  }

  removeTag(tagName) {
    this.currentTags.delete(tagName);
    this.renderTagPills();
    this.renderSuggestions();
  }

  renderTagPills() {
    const container = document.getElementById("selected-tags-container");
    if (!container) return;
    container.innerHTML = Array.from(this.currentTags)
      .map(
        (tag) => `
        <span class="tag-pill">
            ${tag}
            <span class="remove-tag" onclick="adminUI.removeTag('${tag}')">×</span>
        </span>
    `,
      )
      .join("");
  }

  renderSuggestions() {
    const container = document.getElementById("available-tags-suggestions");
    if (!container) return;

    // Collect all unique tags from existing products
    const allTags = new Set([
      "Novo",
      "Destaque",
      "Desconto",
      "Esgotado",
      "Premium",
    ]); // Defaults
    this.products.forEach((p) => {
      if (p.Tags) {
        p.Tags.split(",").forEach((t) => allTags.add(t.trim()));
      }
    });

    // Filter out already selected tags
    const suggestions = Array.from(allTags).filter(
      (t) => !this.currentTags.has(t),
    );

    container.innerHTML = suggestions
      .map(
        (tag) => `
        <span class="tag-suggestion" onclick="adminUI.addTag('${tag}')">
            + ${tag}
        </span>
    `,
      )
      .join("");
  }
}

const adminUI = new AdminUI();
