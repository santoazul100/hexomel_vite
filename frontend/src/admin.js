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
            if(placeholder) placeholder.style.display = "none";
          };
          reader.readAsDataURL(file);
        } else {
            // Keep existing logic for clearing
        }
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
    document.getElementById("prod-imagem").value = ""; // Clear hidden path
    document.getElementById("prod-image-preview").style.display = "none";
    document.getElementById("prod-image-placeholder").style.display = "block";
    
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
        if(placeholder) placeholder.style.display = "none";
    } else {
        preview.style.display = "none";
        if(placeholder) placeholder.style.display = "block";
    }

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
                body: formData // No headers, browser sets multipart/form-data
            });
            if (uploadRes.ok) {
                const data = await uploadRes.json();
                imagem = data.path; // Update image path
            } else {
                console.error("Upload failed");
                Swal.fire("Aviso", "Falha no upload da imagem, a guardar sem imagem nova.", "warning");
            }
        } catch (err) {
            console.error("Upload error", err);
        }
    }

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
  // --- TAG MANAGEMENT ---
  initTagInput() {
    const input = document.getElementById("tag-input-field");
    const container = document.getElementById("tag-input-container");
    const suggestionsContainer = document.getElementById("available-tags-suggestions");
    
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
      if (e.key === "Backspace" && input.value === "" && this.currentTags.size > 0) {
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
    Array.from(this.currentTags).forEach(tag => {
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
      "Novo", "Destaque", "Desconto", "Esgotado", "Premium", "Mel", "Pólen", "Própolis"
    ]); 
    
    this.products.forEach((p) => {
      if (p.Tags) {
        p.Tags.split(",").forEach((t) => allTags.add(t.trim()));
      }
    });

    // Filter out already selected tags
    const suggestions = Array.from(allTags).filter((t) => !this.currentTags.has(t));

    container.innerHTML = suggestions
      .map(tag => `<span class="tag-suggestion" data-tag="${tag}">+ ${tag}</span>`)
      .join("");
  }
}

const adminUI = new AdminUI();
window.adminUI = adminUI;
