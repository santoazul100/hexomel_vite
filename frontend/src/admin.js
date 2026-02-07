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

    this.setupImagePreview();
  }

  setupImagePreview() {
    const fileInput = document.getElementById("prod-image-file");
    const trigger = document.getElementById("upload-trigger");
    const preview = document.getElementById("prod-image-preview");
    const placeholder = document.getElementById("prod-image-placeholder");

    // Trigger file input when clicking the box
    if (trigger && fileInput) {
      trigger.addEventListener("click", () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = "block";
            // Check if placeholder exists (it might be hidden)
            if (placeholder) placeholder.style.display = "none";
          };
          reader.readAsDataURL(file);
        } else {
          // Keep existing logic for clearing
        }
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
                    <div class="d-flex align-items-center gap-3">
                        <img src="${p.Imagem || "/images/wildflower.png"}" class="product-img-rounded" alt="${p.Nome}">
                        <div>
                            <div class="fw-bold text-dark">${p.Nome}</div>
                            <div class="text-muted smaller">ID: #${p.ID_Produto}</div>
                        </div>
                    </div>
                </td>
                <td class="fw-bold text-dark">${parseFloat(p.Preco).toFixed(2)}€</td>
                <td>
                    <span class="badge-premium ${p.Stock < 10 ? "badge-stock-low" : "badge-stock-ok"}">
                        ${p.Stock} UN
                    </span>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${p.ID_Categoria === 1 ? "Méls" : "Derivados"}</span>
                </td>
                <td class="text-end">
                    <button class="btn-action-premium me-1" onclick="adminUI.editProduct('${p.ID_Produto}')" title="Editar">
                        <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                    </button>
                    <button class="btn-action-premium delete" onclick="adminUI.deleteProduct('${p.ID_Produto}')" title="Eliminar">
                        <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                    </button>
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
    document.getElementById("prod-imagem").value = ""; // Clear hidden path
    document.getElementById("prod-image-preview").style.display = "none";
    document.getElementById("prod-image-placeholder").style.display = "block";

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

    // Handle Image
    document.getElementById("prod-imagem").value = p.Imagem || "";
    const preview = document.getElementById("prod-image-preview");
    const placeholder = document.getElementById("prod-image-placeholder");

    if (p.Imagem) {
      preview.src = p.Imagem;
      preview.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    } else {
      preview.style.display = "none";
      if (placeholder) placeholder.style.display = "block";
    }

    // Initialize Tags
    this.currentTags = new Set(
      p.Tags ? p.Tags.split(",").map((t) => t.trim()) : [],
    );
    this.renderTagPills();

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
    let imagem = document.getElementById("prod-imagem").value; // Default to existing
    const tags = Array.from(this.currentTags).join(", ");

    // Handle File Upload
    const fileInput = document.getElementById("prod-image-file");
    if (fileInput && fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append("image", fileInput.files[0]);

      try {
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData, // No headers, browser sets multipart/form-data
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          imagem = data.path; // Update image path
        } else {
          console.error("Upload failed");
          Swal.fire(
            "Aviso",
            "Falha no upload da imagem, a guardar sem imagem nova.",
            "warning",
          );
        }
      } catch (err) {
        console.error("Upload error", err);
      }
    }

    const data = {
      nome,
      preco,
      stock,
      idCategoria,
      descricao,
      imagem: imagem || "/images/wildflower.png",
      tags,
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
  // --- TAG MANAGEMENT ---
  initTagInput() {
    const input = document.getElementById("tag-input-field");
    const container = document.getElementById("tag-input-container");
    const suggestionsContainer = document.getElementById(
      "available-tags-suggestions",
    );

    if (!input || !container) return;

    // Focus input when clicking container
    container.addEventListener("click", () => input.focus());

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

    // Event Delegation for Suggestions
    if (suggestionsContainer) {
      suggestionsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("tag-suggestion")) {
          const tag = e.target.dataset.tag;
          if (tag) this.addTag(tag);
        }
      });
    }

    this.renderSuggestions();
  }

  addTag(tagName) {
    const cleanTag = tagName.trim();
    if (cleanTag && !this.currentTags.has(cleanTag)) {
      this.currentTags.add(cleanTag);
      this.renderTagPills();
      this.renderSuggestions();
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

    container.innerHTML = "";
    Array.from(this.currentTags).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag-pill";
      span.innerHTML = `${tag} <span class="remove-tag">×</span>`;
      span.querySelector(".remove-tag").onclick = (e) => {
        e.stopPropagation(); // Prevent container focus
        this.removeTag(tag);
      };
      container.appendChild(span);
    });
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
      "Mel",
      "Pólen",
      "Própolis",
    ]);

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
        (tag) =>
          `<span class="tag-suggestion" data-tag="${tag}">+ ${tag}</span>`,
      )
      .join("");
  }
}

const adminUI = new AdminUI();
window.adminUI = adminUI;
