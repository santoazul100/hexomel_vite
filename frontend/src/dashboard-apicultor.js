// Apicultor Dashboard Logic
const API_URL = "/api";

class ApicultorUI {
  constructor() {
    this.products = [];
    this.categories = [];
    this.origins = [];
    this.workshops = [];
    this.sales = [];
    this.token = localStorage.getItem("token");
    this.userData = JSON.parse(localStorage.getItem("user"));
    this.currentTags = new Set();
    this._editingProductId = null;
    this._editingWorkshopId = null;
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
    if (welcomeEl) welcomeEl.innerText = `Bem-vindo, ${this.userData.name.split(" ")[0]}`;

    this.setupEventListeners();
    this.initAuth();

    try {
      const { cart } = await import("./cart.js");
      const cartBtn = document.getElementById("cart-btn");
      if (cartBtn) cartBtn.addEventListener("click", () => cart.toggle(true));
    } catch (e) {}

    await Promise.all([this.loadCategories(), this.loadOrigins()]);
    this.initSidebar(); // Collapsed preference
    this.switchSection("dashboard");
  }

  initSidebar() {
    const adminLayout = document.getElementById("admin-layout");
    const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (isCollapsed && adminLayout) {
      adminLayout.classList.add("sidebar-collapsed");
    }

    const toggleMain = document.getElementById("navbar-sidebar-toggle");
    const toggleHide = document.getElementById("sidebar-hide");

    const toggleLogic = () => {
      if (adminLayout) {
        const collapsed = adminLayout.classList.toggle("sidebar-collapsed");
        localStorage.setItem("sidebarCollapsed", collapsed);
      }
    };

    if (toggleMain) toggleMain.addEventListener("click", toggleLogic);
    if (toggleHide) toggleHide.addEventListener("click", toggleLogic);
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

    const revertBtn = document.getElementById("btn-revert-client-dashboard");
    if (revertBtn) {
      revertBtn.addEventListener("click", () => this.handleBeekeeperDowngrade());
    }

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
    this.setupWorkshopImagePreview();
    this.initTagInput();
    this.initSearch();
    this.initFlatpickr();
  }

  initFlatpickr() {
    if (window.flatpickr) {
      flatpickr("#ws-data", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: "pt",
        minDate: "today",
        time_24hr: true,
        altInput: true,
        altFormat: "d/m/Y H:i",
      });
    }
  }

  setupWorkshopImagePreview() {
    const fileInput = document.getElementById("ws-image-file");
    const trigger = document.getElementById("ws-upload-trigger");
    const preview = document.getElementById("ws-image-preview");
    const overlay = trigger?.querySelector(".upload-overlay");

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
            if (overlay) overlay.style.opacity = "0";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (trigger && overlay) {
      trigger.addEventListener("mouseenter", () => {
        if (preview && preview.style.display !== "none" && preview.src) {
          overlay.style.opacity = "1";
        }
      });
      trigger.addEventListener("mouseleave", () => {
        overlay.style.opacity = "0";
      });
    }
  }

  setupImagePreview() {
    const fileInput = document.getElementById("prod-image-file");
    const trigger = document.getElementById("upload-trigger");
    const preview = document.getElementById("prod-image-preview");
    const placeholder = document.getElementById("prod-image-placeholder");
    const overlay = trigger?.querySelector(".upload-overlay");

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
            if (placeholder) placeholder.style.display = "none";
            if (overlay) overlay.style.opacity = "0";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Show overlay on hover when image is loaded
    if (trigger && overlay) {
      trigger.addEventListener("mouseenter", () => {
        if (preview && preview.style.display !== "none" && preview.src) {
          overlay.style.opacity = "1";
        }
      });
      trigger.addEventListener("mouseleave", () => {
        overlay.style.opacity = "0";
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
    if (sectionId === "sales") this.loadSales();
  }

  async loadDashboardStats() {
    try {
      const response = await fetch(`${API_URL}/apicultor/stats`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (response.ok) {
        const stats = await response.json();

        document.getElementById("dash-total-earnings").innerText = `${stats.summary.totalEarnings.toFixed(2)}€`;
        document.getElementById("dash-total-products").innerText = stats.summary.products;
        document.getElementById("dash-pending-products").innerText = stats.summary.pendingProducts;
        document.getElementById("dash-total-workshops").innerText = stats.summary.workshops;

        this.renderCharts(stats);
      }
    } catch (error) {
      console.error("Load stats error:", error);
    }
  }

  renderCharts(stats) {
    if (!window.Chart || !stats) return;

    if (this._categoryChart) this._categoryChart.destroy();
    if (this._statusChart) this._statusChart.destroy();

    const ctxCategory = document.getElementById("apicultorCategoryChart");
    if (ctxCategory && stats.categories) {
      this._categoryChart = new Chart(ctxCategory, {
        type: "bar",
        data: {
          labels: stats.categories.map((c) => c.category),
          datasets: [
            {
              label: "Número de Produtos",
              data: stats.categories.map((c) => c.count),
              backgroundColor: "#4ade80",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 46, 0.9)',
                titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
                bodyFont: { family: 'Outfit', size: 13 },
                padding: 12,
                cornerRadius: 10,
                displayColors: false
            }
          },
          scales: {
            y: { 
              beginAtZero: true, 
              ticks: { precision: 0, color: '#94a3b8', font: { family: 'Outfit' } },
              grid: { color: 'rgba(0,0,0,0.03)' }
            },
            x: { 
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
            },
          },
          animation: {
              duration: 2000,
              easing: 'easeOutQuart'
          }
        },
      });
    }

    const ctxStatus = document.getElementById("apicultorStatusChart");
    if (ctxStatus && stats.statuses) {
      const labels = stats.statuses.map((s) => s.Status);
      const colors = { Aprovado: "#10b981", Pendente: "#f59e0b", Rejeitado: "#ef4444" };

      this._statusChart = new Chart(ctxStatus, {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data: stats.statuses.map((s) => s.count),
              backgroundColor: labels.map((l) => colors[l] || "#64748b"),
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "78%",
          plugins: { 
            legend: { 
              position: "bottom",
              labels: {
                  padding: 20,
                  font: { family: 'Outfit', size: 12, weight: '600' },
                  usePointStyle: true,
                  pointStyle: 'circle'
              }
            },
            tooltip: {
                backgroundColor: 'rgba(26, 77, 46, 0.9)',
                padding: 12,
                cornerRadius: 10,
                bodyFont: { family: 'Outfit' }
            }
          },
          animation: {
              animateRotate: true,
              animateScale: true,
              duration: 1500
          }
        },
      });
    }
  }

  /* ──────────────────────────────────────────
     CATEGORIES & ORIGINS
  ────────────────────────────────────────── */
  async loadCategories() {
    try {
      const resp = await fetch(`${API_URL}/categories`);
      if (resp.ok) {
        this.categories = await resp.json();
        const select = document.getElementById("prod-categoria");
        if (select) {
          select.innerHTML =
            '<option value="">Selecionar...</option>' +
            this.categories
              .map((c) => `<option value="${c.ID_Categoria}">${c.Nome}</option>`)
              .join("");
        }
      }
    } catch (e) {}
  }

  async loadOrigins() {
    try {
      const resp = await fetch(`${API_URL}/origins`);
      if (resp.ok) {
        this.origins = await resp.json();
        const select = document.getElementById("prod-origem");
        if (select) {
          select.innerHTML =
            '<option value="">Selecionar...</option>' +
            this.origins
              .map((o) => `<option value="${o.ID_Origem}">${o.Nome}</option>`)
              .join("");
        }
      }
    } catch (e) {}
  }

  /* ──────────────────────────────────────────
     PRODUCTS
  ────────────────────────────────────────── */
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
      container.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted"><i class="fas fa-box-open fa-2x mb-3 d-block opacity-25"></i>Ainda não adicionou nenhum produto.</td></tr>`;
      return;
    }

    container.innerHTML = this.products
      .map((p) => {
        let statusClass = "aprovado";
        if (p.Status === "Pendente") statusClass = "pendente";
        if (p.Status === "Rejeitado") statusClass = "rejeitado";

        const category = this.categories.find(c => String(c.ID_Categoria) === String(p.ID_Categoria))?.Nome || "Sem Categoria";
        const origin = this.origins.find(o => String(o.ID_Origem) === String(p.ID_Origem))?.Nome || "N/A";

        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-3">
                <img src="${p.Imagem || "/images/wildflower.png"}" class="product-img-small" alt="${p.Nome}">
                <div class="fw-bold">${p.Nome}</div>
              </div>
            </td>
            <td><span class="text-muted small">${category}</span></td>
            <td><span class="text-muted small">${origin}</span></td>
            <td>${parseFloat(p.Preco).toFixed(2)}€</td>
            <td>${p.Stock} UN</td>
            <td><span class="badge-premium ${statusClass}">${p.Status || "Aprovado"}</span></td>
            <td class="text-end">
              <div class="d-flex gap-1 justify-content-end">
                <button class="btn-action-premium" onclick="apicultorUI.editProduct('${p.ID_Produto}')" title="Editar">
                  <i class="fas fa-pencil-alt" style="font-size: 0.8rem;"></i>
                </button>
                <button class="btn-action-premium delete" onclick="apicultorUI.deleteProduct('${p.ID_Produto}')" title="Remover">
                  <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                </button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  }

  editProduct(id) {
    const p = this.products.find((x) => String(x.ID_Produto) === String(id));
    if (!p) return;

    this._editingProductId = id;
    document.getElementById("modalTitle").innerText = "Editar Produto";
    document.getElementById("product-id").value = p.ID_Produto;
    document.getElementById("prod-nome").value = p.Nome || "";
    document.getElementById("prod-preco").value = p.Preco || "";
    document.getElementById("prod-stock").value = p.Stock || 0;
    document.getElementById("prod-descricao").value = p.Descricao || "";
    
    // Initialize Tags
    this.currentTags = new Set(p.Tags ? p.Tags.split(",").map(t => t.trim()) : []);
    this.renderTagPills();
    this.renderSuggestions();

    const catSelect = document.getElementById("prod-categoria");
    if (catSelect) catSelect.value = p.ID_Categoria || "";

    const origemSelect = document.getElementById("prod-origem");
    if (origemSelect) origemSelect.value = p.ID_Origem || "";

    const preview = document.getElementById("prod-image-preview");
    const placeholder = document.getElementById("prod-image-placeholder");
    if (p.Imagem) {
      preview.src = p.Imagem;
      preview.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    }

    new bootstrap.Modal(document.getElementById("productModal")).show();
  }

  async deleteProduct(id) {
    const result = await Swal.fire({
      title: "Remover produto?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/apicultor/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao remover produto.");
      }

      Swal.fire({ icon: "success", title: "Removido!", text: "Produto eliminado com sucesso.", timer: 1800, showConfirmButton: false });
      this.loadProducts();
    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  /* ──────────────────────────────────────────
     WORKSHOPS
  ────────────────────────────────────────── */
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
      container.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-calendar-times fa-2x mb-3 d-block opacity-25"></i>Ainda não agendou nenhum workshop.</td></tr>`;
      return;
    }

    container.innerHTML = this.workshops
      .map((w) => {
        const statusRaw = (w.Status || "pendente").toLowerCase();
        const statusLabel = w.Status || "Pendente";
        const dataFormatada = new Date(w.Data_Realizacao).toLocaleString("pt-PT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
          <tr>
            <td class="fw-bold">${w.Titulo}</td>
            <td class="text-muted" style="font-size:0.9rem">${dataFormatada}</td>
            <td>${parseFloat(w.Preco).toFixed(2)}€</td>
            <td>${w.Vagas}</td>
            <td><span class="badge-premium ${statusRaw}">${statusLabel}</span></td>
            <td class="text-end">
              <div class="d-flex gap-1 justify-content-end">
                <button class="btn-action-premium" onclick="apicultorUI.editWorkshop('${w.ID_Workshop}')" title="Editar">
                  <i class="fas fa-pencil-alt" style="font-size: 0.8rem;"></i>
                </button>
                <button class="btn-action-premium delete" onclick="apicultorUI.deleteWorkshop('${w.ID_Workshop}')" title="Cancelar">
                  <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                </button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  }

  editWorkshop(id) {
    const w = this.workshops.find((x) => String(x.ID_Workshop) === String(id));
    if (!w) return;

    this._editingWorkshopId = id;
    document.getElementById("workshopModalTitle").innerText = "Editar Workshop";
    document.getElementById("ws-id").value = w.ID_Workshop;
    document.getElementById("ws-titulo").value = w.Titulo || "";
    document.getElementById("ws-preco").value = w.Preco || "";
    document.getElementById("ws-vagas").value = w.Vagas || "";
    document.getElementById("ws-descricao").value = w.Descricao || "";
    document.getElementById("ws-imagem").value = w.Imagem || "";

    // Format data for datetime-local input
    if (w.Data_Realizacao) {
      const d = new Date(w.Data_Realizacao);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      const dataInput = document.getElementById("ws-data");
      if (dataInput._flatpickr) {
        dataInput._flatpickr.setDate(d);
      } else {
        dataInput.value = local;
      }
    }

    const preview = document.getElementById("ws-image-preview");
    if (w.Imagem) {
      preview.src = w.Imagem;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }

    new bootstrap.Modal(document.getElementById("workshopModal")).show();
  }

  async deleteWorkshop(id) {
    const result = await Swal.fire({
      title: "Cancelar workshop?",
      text: "Esta ação irá remover o workshop permanentemente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, cancelar",
      cancelButtonText: "Voltar",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/apicultor/workshops/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao cancelar workshop.");
      }

      Swal.fire({ icon: "success", title: "Cancelado!", text: "Workshop eliminado com sucesso.", timer: 1800, showConfirmButton: false });
      this.loadWorkshops();
    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  /* ──────────────────────────────────────────
     FORM RESETS
  ────────────────────────────────────────── */
  resetForm() {
    this._editingProductId = null;
    document.getElementById("modalTitle").innerText = "Novo Produto";
    document.getElementById("productForm").reset();
    document.getElementById("product-id").value = "";
    const placeholder = document.getElementById("prod-image-placeholder");
    if (preview) { preview.src = ""; preview.style.display = "none"; }
    if (placeholder) placeholder.style.display = "block";

    this.currentTags.clear();
    this.renderTagPills();
    this.renderSuggestions();
  }

  resetWorkshopForm() {
    this._editingWorkshopId = null;
    document.getElementById("workshopModalTitle").innerText = "Novo Workshop";
    document.getElementById("workshopForm").reset();
    document.getElementById("ws-id").value = "";
    const preview = document.getElementById("ws-image-preview");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
  }

  /* ──────────────────────────────────────────
     SAVE PRODUCT (CREATE / EDIT)
  ────────────────────────────────────────── */
  async handleSaveProduct() {
    const nome = document.getElementById("prod-nome").value;
    const preco = document.getElementById("prod-preco").value;
    const stock = document.getElementById("prod-stock").value;
    const idCategoria = document.getElementById("prod-categoria").value;
    const idOrigem = document.getElementById("prod-origem").value;
    const descricao = document.getElementById("prod-descricao").value;
    const tags = Array.from(this.currentTags).join(", ");

    // Upload image if a new file was selected
    const fileInput = document.getElementById("prod-image-file");
    let imagem = document.getElementById("prod-imagem").value || "";
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

    const isEditing = !!this._editingProductId;
    const url = isEditing
      ? `${API_URL}/apicultor/products/${this._editingProductId}`
      : `${API_URL}/apicultor/products`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ nome, preco, stock, idCategoria, idOrigem, descricao, tags, imagem }),
      });

      if (!response.ok) throw new Error("Erro ao guardar produto.");

      const msg = isEditing
        ? "Produto atualizado com sucesso."
        : "Produto submetido. Aguarda aprovação do administrador.";
      Swal.fire({ icon: "success", title: "Sucesso!", text: msg, timer: 2000, showConfirmButton: false });
      bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();
      this.loadProducts();
    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  /* ──────────────────────────────────────────
     SAVE WORKSHOP (CREATE / EDIT)
  ────────────────────────────────────────── */
  async handleSaveWorkshop() {
    const titulo = document.getElementById("ws-titulo").value;
    const preco = document.getElementById("ws-preco").value;
    const vagas = document.getElementById("ws-vagas").value;
    const data = document.getElementById("ws-data").value;
    const descricao = document.getElementById("ws-descricao").value;
    
    // Handle image upload
    const fileInput = document.getElementById("ws-image-file");
    let imagem = document.getElementById("ws-imagem").value || "";
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
        console.error("Workshop image upload failed", e);
      }
    }

    const isEditing = !!this._editingWorkshopId;
    const url = isEditing
      ? `${API_URL}/apicultor/workshops/${this._editingWorkshopId}`
      : `${API_URL}/apicultor/workshops`;
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ titulo, preco, vagas, data_realizacao: data, descricao, imagem }),
      });

      if (!response.ok) throw new Error("Erro ao guardar workshop.");

      Swal.fire({ icon: "success", title: "Sucesso!", text: isEditing ? "Workshop atualizado." : "Workshop agendado.", timer: 2000, showConfirmButton: false });
      bootstrap.Modal.getInstance(document.getElementById("workshopModal")).hide();
      this.loadWorkshops();
    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  /* ──────────────────────────────────────────
     REVERT TO CLIENT
  ────────────────────────────────────────── */
  async handleBeekeeperDowngrade() {
    const result = await Swal.fire({
      title: "Reverter para Cliente?",
      text: "Deixarás de ter acesso à gestão de produtos e workshops. Poderás voltar a ser Apicultor mais tarde através do menu do teu perfil.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, reverter",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/user/profile/role", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ userType: "client" }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          const localUser = JSON.parse(localStorage.getItem("user") || "{}");
          localUser.role = "client";
          localStorage.setItem("user", JSON.stringify(localUser));

          Swal.fire({
            icon: "success",
            title: "Conta Revertida",
            text: "A sua conta é agora do tipo Cliente. A redirecionar...",
            confirmButtonColor: "#f4b400",
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = "profile.html";
          });
        } else {
          throw new Error(data.error || "Falha ao reverter conta");
        }
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // --- SALES ---
  async loadSales() {
    try {
      const response = await fetch(`${API_URL}/apicultor/orders`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (response.ok) {
        this.sales = await response.json();
        this.renderSales();
      }
    } catch (error) {
      console.error("Load sales error:", error);
    }
  }

  renderSales() {
    const container = document.getElementById("sales-list-body");
    if (!container) return;

    if (this.sales.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Ainda não realizou nenhuma venda.</td></tr>`;
      return;
    }

    container.innerHTML = this.sales
      .map((s) => `
        <tr>
          <td class="fw-bold">#${s.ID_Encomenda}</td>
          <td>
            <div class="fw-bold">${s.ClienteNome}</div>
            <div class="small text-muted">${s.Morada}</div>
          </td>
          <td class="small text-muted">${new Date(s.Data_Encomenda).toLocaleDateString()}</td>
          <td class="fw-bold text-dark">${parseFloat(s.Total).toFixed(2)}€</td>
          <td><span class="badge-premium ${s.Status.toLowerCase()}">${s.Status}</span></td>
          <td class="text-end">
            <button class="btn-action-premium" onclick="Swal.fire('Info', 'Detalhes da encomenda em breve.', 'info')">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `)
      .join("");
  }

  // --- TAG MANAGEMENT ---
  initTagInput() {
    const input = document.getElementById("tag-input-field");
    const container = document.getElementById("tag-input-container");
    const suggestionsContainer = document.getElementById("available-tags-suggestions");

    if (!input || !container) return;

    container.addEventListener("click", () => input.focus());

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
        e.stopPropagation();
        this.removeTag(tag);
      };
      container.appendChild(span);
    });
  }

  renderSuggestions() {
    const container = document.getElementById("available-tags-suggestions");
    if (!container) return;
    const defaultTags = ["Mel", "Pólen", "Própolis", "Bio", "Natural", "Artesanal"];
    container.innerHTML = defaultTags
      .filter(t => !this.currentTags.has(t))
      .map(tag => `<span class="tag-suggestion" data-tag="${tag}">+ ${tag}</span>`)
      .join("");
  }

  // --- SEARCH / FILTER ---
  initSearch() {
    const pSearch = document.getElementById("product-search");
    if (pSearch) {
      pSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll("#product-list-body tr");
        rows.forEach(row => {
          const text = row.innerText.toLowerCase();
          row.style.display = text.includes(term) ? "" : "none";
        });
      });
    }

    const wSearch = document.getElementById("workshop-search");
    if (wSearch) {
      wSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll("#workshop-list-body tr");
        rows.forEach(row => {
          const text = row.innerText.toLowerCase();
          row.style.display = text.includes(term) ? "" : "none";
        });
      });
    }

    const sSearch = document.getElementById("sales-search");
    if (sSearch) {
      sSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll("#sales-list-body tr");
        rows.forEach(row => {
          const text = row.innerText.toLowerCase();
          row.style.display = text.includes(term) ? "" : "none";
        });
      });
    }
  }
}

// Global scope
window.apicultorUI = new ApicultorUI();
