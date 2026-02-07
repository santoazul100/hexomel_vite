// Hexomel Admin Logic
const API_URL = "/api";

class AdminUI {
  constructor() {
    this.products = [];
    this.users = [];
    this.orders = [];
    this.token = localStorage.getItem("token");
    this.userData = JSON.parse(localStorage.getItem("user"));
    this.init();
  }

  async init() {
    // Security Check
    if (!this.token || !this.userData) {
      window.location.href = "index.html";
      return;
    }

    const role =
      this.userData.role || this.userData.userType || this.userData.UserType;

    if (role?.toLowerCase() !== "admin") {
      window.location.href = "index.html";
      return;
    }

    this.setupEventListeners();
    this.renderUserInfo();
    await this.loadAllData(); // Load all data initially to compute dashboard stats
    this.switchSection("dashboard");
  }

  renderUserInfo() {
    const nameEl = document.getElementById("admin-user-name");
    const initialEl = document.getElementById("admin-user-initial");
    const navInitialEl = document.getElementById("navbar-user-initial");

    if (this.userData) {
      const name = this.userData.name || this.userData.firstName || "Admin";
      if (nameEl) nameEl.innerText = name;
      const initial = name.charAt(0).toUpperCase();
      if (initialEl) initialEl.innerText = initial;
      if (navInitialEl) navInitialEl.innerText = initial;
    }
  }

  async loadAllData() {
    try {
      // Parallel loading for initial stats
      const [prodRes, userRes, orderRes] = await Promise.all([
        fetch(`${API_URL}/admin/products`, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
        fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
        fetch(`${API_URL}/admin/orders`, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      ]);

      if (prodRes.ok) this.products = await prodRes.json();
      if (userRes.ok) this.users = await userRes.json();
      if (orderRes.ok) this.orders = await orderRes.json();

      this.updateDashboardStats();
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
    }
  }

  updateDashboardStats() {
    const setStat = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setStat("stat-total-users", this.users.length);
    setStat("stat-total-products", this.products.length);
    setStat("stat-total-orders", this.orders.length);

    const totalRevenue = this.orders
      .filter((o) => o.Status === "Pago" || o.Status === "Enviado")
      .reduce((sum, o) => sum + parseFloat(o.Total || 0), 0);

    setStat("stat-total-revenue", `${totalRevenue.toFixed(2)}€`);
  }

  setupEventListeners() {
    // Nav switching
    const navItems = document.querySelectorAll(
      ".nav-item[data-section], .bottom-nav-item[data-section]",
    );
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        // Handle click on icon or text span inside button
        const target = e.currentTarget;
        const section = target.dataset.section;
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

    // Logout
    const logoutBtn = document.getElementById("admin-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "index.html";
      });
    }
  }

  switchSection(sectionId) {
    // Update Nav UI (Both sidebar and bottom nav)
    document
      .querySelectorAll(".nav-item, .bottom-nav-item")
      .forEach((l) => l.classList.remove("active"));
    const activeLinks = document.querySelectorAll(
      `[data-section="${sectionId}"]`,
    );
    activeLinks.forEach((l) => l.classList.add("active"));

    // Update Visibility
    document
      .querySelectorAll(".admin-section")
      .forEach((s) => s.classList.remove("active"));
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) activeSection.classList.add("active");

    // Update Header Text
    const title = document.getElementById("page-title");
    const subtitle = document.getElementById("page-subtitle");
    const kicker = document.getElementById("section-kicker");
    const mainActionBtn = document.getElementById("main-action-btn");

    const sectionConfigs = {
      dashboard: {
        kicker: "Bem-vindo",
        title: "Administrador do Sistema",
        sub: "Visão geral e gestão dos dados principais.",
        action: null,
      },
      products: {
        kicker: "Logística",
        title: "Produtos (Stock)",
        sub: "Gerir stock e catálogo de produtos.",
        action: {
          text: "Novo Produto",
          handler: () => this.openProductModal(),
        },
      },
      users: {
        kicker: "Comunidade",
        title: "Utilizadores",
        sub: "Controlo de contas registadas.",
        action: null,
      },
      orders: {
        kicker: "Vendas",
        title: "Encomendas Recentess",
        sub: "Estado das vendas e envios.",
        action: null,
      },
    };

    if (sectionConfigs[sectionId]) {
      const config = sectionConfigs[sectionId];
      if (kicker) kicker.innerText = config.kicker;
      if (title) title.innerText = config.title;
      if (subtitle) subtitle.innerText = config.sub;

      if (mainActionBtn) {
        if (config.action) {
          mainActionBtn.style.display = "block";
          mainActionBtn.innerText = config.action.text;
          mainActionBtn.onclick = config.action.handler;
        } else {
          mainActionBtn.style.display = "none";
        }
      }
    }

    // Load Data if needed
    if (sectionId === "products") this.renderProducts();
    if (sectionId === "users") this.renderUsers();
    if (sectionId === "orders") this.renderOrders();
  }

  // --- RENDER METHODS ---
  renderProducts() {
    const container = document.getElementById("product-list-body");
    if (!container) return;
    container.innerHTML = this.products
      .map(
        (p) => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${p.Imagem || "public/images/wildflower.png"}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;" onerror="this.src='public/images/wildflower.png'">
              <div>
                <div style="font-weight:600;">${p.Nome}</div>
                <div style="font-size:0.8rem; color:#6b7280;">#${p.ID_Produto}</div>
              </div>
            </div>
          </td>
          <td style="font-weight:600;">${parseFloat(p.Preco).toFixed(2)}€</td>
          <td>
            <span class="badge-status ${p.Stock < 10 ? "badge-low" : "badge-ok"}">
              ${p.Stock} UN
            </span>
          </td>
          <td class="text-end">
            <div class="d-flex justify-content-end gap-2">
              <button class="admin-btn-outline" onclick="adminUI.editProduct('${p.ID_Produto}')"><i class="fas fa-edit"></i></button>
              <button class="admin-btn-outline danger" onclick="adminUI.deleteProduct('${p.ID_Produto}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `,
      )
      .join("");
  }

  renderUsers() {
    const container = document.getElementById("customer-list-body");
    if (!container) return;
    container.innerHTML = this.users
      .map(
        (u) => `
        <tr>
          <td><div style="font-weight:600;">${u.Nome}</div></td>
          <td style="color:#6b7280; font-size:0.9rem;">${u.Email}</td>
          <td><span class="badge-status bg-light text-dark">${u.UserType}</span></td>
          <td class="text-end">
            <button class="admin-btn-outline danger" onclick="adminUI.deleteUser('${u.ID_Cliente}')" ${u.ID_Cliente === this.userData.id ? "disabled" : ""}>
                <i class="fas fa-user-minus"></i>
            </button>
          </td>
        </tr>
      `,
      )
      .join("");
  }

  renderOrders() {
    const container = document.getElementById("order-list-body");
    if (!container) return;
    container.innerHTML = this.orders
      .map(
        (o) => `
        <tr>
          <td style="font-weight:600;">#${o.ID_Encomenda}</td>
          <td><div style="font-size:0.9rem; font-weight:500;">${o.ClienteNome}</div></td>
          <td style="font-weight:700;">${parseFloat(o.Total).toFixed(2)}€</td>
          <td>
            <span class="badge-status badge-${o.Status.toLowerCase().replace(/á/g, "a")}">${o.Status}</span>
          </td>
          <td class="text-end">
            <select class="form-select form-select-sm d-inline-block w-auto border-0 bg-light fw-bold" onchange="adminUI.updateOrderStatus('${o.ID_Encomenda}', this.value)">
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
      if (!response.ok) throw new Error("Erro ao atualizar status");
      Swal.fire({
        icon: "success",
        title: "Atualizado",
        timer: 1000,
        showConfirmButton: false,
      });
      await this.loadAllData();
      this.renderOrders();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteUser(id) {
    const result = await Swal.fire({
      title: "Eliminar Utilizador?",
      text: "Esta ação é irreversível.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1e293b",
      confirmButtonText: "Sim, eliminar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao eliminar");
        await this.loadAllData();
        this.renderUsers();
        Swal.fire("Eliminado", "Utilizador removido.", "success");
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // --- PRODUCT HELPERS ---
  openProductModal() {
    this.resetForm();
    new bootstrap.Modal(document.getElementById("productModal")).show();
  }

  resetForm() {
    const form = document.getElementById("productForm");
    if (form) form.reset();
    document.getElementById("product-id").value = "";
    document.getElementById("modalTitle").innerText = "Novo Produto";
  }

  editProduct(id) {
    const p = this.products.find(
      (prod) => String(prod.ID_Produto) === String(id),
    );
    if (!p) return;
    document.getElementById("product-id").value = p.ID_Produto;
    document.getElementById("prod-nome").value = p.Nome;
    document.getElementById("prod-preco").value = p.Preco;
    document.getElementById("prod-stock").value = p.Stock;
    document.getElementById("prod-categoria").value = p.ID_Categoria;
    document.getElementById("prod-descricao").value = p.Descricao || "";
    document.getElementById("prod-imagem").value = p.Imagem || "";
    document.getElementById("tag-input-field-legacy").value = p.Tags || "";

    document.getElementById("modalTitle").innerText = "Editar Produto";
    new bootstrap.Modal(document.getElementById("productModal")).show();
  }

  async handleSaveProduct() {
    const id = document.getElementById("product-id").value;
    const data = {
      nome: document.getElementById("prod-nome").value,
      preco: parseFloat(document.getElementById("prod-preco").value),
      stock: parseInt(document.getElementById("prod-stock").value),
      idCategoria: parseInt(document.getElementById("prod-categoria").value),
      descricao: document.getElementById("prod-descricao").value,
      imagem:
        document.getElementById("prod-imagem").value ||
        "/images/wildflower.png",
      tags: document.getElementById("tag-input-field-legacy").value,
    };

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
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao guardar");
      bootstrap.Modal.getInstance(
        document.getElementById("productModal"),
      ).hide();
      await this.loadAllData();
      this.renderProducts();
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteProduct(id) {
    const result = await Swal.fire({
      title: "Eliminar Produto?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Sim, eliminar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/products/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao eliminar");
        await this.loadAllData();
        this.renderProducts();
        Swal.fire("Eliminado", "", "success");
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }
}

// Expose globally
window.adminUI = new AdminUI();
