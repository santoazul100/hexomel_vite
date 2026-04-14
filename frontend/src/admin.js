// Hexomel Admin Logic
const API_URL = "/api";

class AdminUI {
  constructor() {
    this.products = [];
    this.users = [];
    this.orders = [];
    this.categories = []; // newly added
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
    // Navbar is now static, just init auth
    this.initAuth();

    // Init Cart for the Navbar
    try {
      const { cart } = await import("./cart.js");
      const cartBtn = document.getElementById("cart-btn");
      if (cartBtn) {
        cartBtn.addEventListener("click", () => cart.toggle(true));
      }
    } catch (e) {
      console.error("Cart init error", e);
    }

    this.initTagInput();
    this.initSidebar(); // Collapsed preference
    this.switchSection("dashboard"); // Default view
  }

  initSidebar() {
    const adminLayout = document.getElementById("admin-layout");
    const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (isCollapsed && adminLayout) {
      adminLayout.classList.add("sidebar-collapsed");
    }

    const toggleMain = document.getElementById("sidebar-toggle-main");
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

      // Setup Logout
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          logout();
        });
      }
    } catch (e) {
      console.error("Auth init error", e);
    }
  }

  // injectNavbar removed - static in HTML

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
    if (sectionId === "dashboard") this.loadDashboardStats();
    if (sectionId === "products") {
      this.loadCategories();
      this.loadOrigins();
      this.loadProducts();
    }
    if (sectionId === "categories") this.loadCategories();
    if (sectionId === "origins") this.loadOrigins();
    if (sectionId === "customers") this.loadUsers();
    if (sectionId === "orders") this.loadOrders();
    if (sectionId === "upgrade-requests") this.loadUpgradeRequests();
    if (sectionId === "workshops") this.loadWorkshops();
    if (sectionId === "interactions") this.loadInteractions();
  }

  async loadDashboardStats() {
    try {
      // Fetch all data in parallel
      await Promise.all([
        this.loadProducts(),
        this.loadUsers(),
        this.loadOrders(),
      ]);

      // Update Users
      const userCount = this.users.length;
      const totalUsersEl = document.getElementById("dash-total-users");
      if (totalUsersEl) totalUsersEl.innerText = userCount;

      // Update Products
      const prodCount = this.products.length;
      const totalProdsEl = document.getElementById("dash-total-products");
      if (totalProdsEl) totalProdsEl.innerText = prodCount;

      // Update Orders
      const orderCount = this.orders.length;
      const totalOrdersEl = document.getElementById("dash-total-orders");
      if (totalOrdersEl) totalOrdersEl.innerText = orderCount;

      // Update Low Stock (less than 5 units)
      const lowStockCount = this.products.filter((p) => p.Stock < 5).length;
      const lowStockEl = document.getElementById("dash-low-stock");
      if (lowStockEl) lowStockEl.innerText = lowStockCount;

      // Load Charts
      this.loadAnalytics();
    } catch (e) {
      console.error("Error loading dashboard stats", e);
    }
  }

  async loadAnalytics() {
    try {
      const response = await fetch(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar analítica");
      const data = await response.json();

      // Update Revenue Card
      const revenueEl = document.getElementById("dash-total-revenue");
      if (revenueEl && data.stats) {
        revenueEl.innerText = `${data.stats.totalRevenue}€`;
      }

      // Update AOV Card
      const aovEl = document.getElementById("dash-avg-order-value");
      if (aovEl && data.stats) {
        aovEl.innerText = `${data.stats.avgOrderValue}€`;
      }

      this.renderCharts(data);
    } catch (e) {
      console.error("Analytics load error", e);
    }
  }

  renderCharts(data) {
    const { sales30d, distribution, ordersByStatus, topProducts, salesByBeekeeper, usersGrowth } = data;

    // --- SHARED STYLING ---
    const goldenPalette = [
      "#f4b400", // Gold
      "#1c5236", // Green
      "#0284c7", // Blue
      "#9333ea", // Purple
      "#ef4444", // Red
      "#64748b", // Slate
      "#f97316", // Orange
      "#ec4899"  // Pink
    ];

    // 1. Sales Chart (Line)
    const salesCtx = document.getElementById("salesChart")?.getContext("2d");
    if (salesCtx) {
      if (this.salesChart) this.salesChart.destroy();
      
      const gradient = salesCtx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, "rgba(244, 180, 0, 0.4)");
      gradient.addColorStop(1, "rgba(244, 180, 0, 0)");

      this.salesChart = new Chart(salesCtx, {
        type: "line",
        data: {
          labels: sales30d.length > 0 ? sales30d.map((s) => new Date(s.date).toLocaleDateString()) : ["Sem dados"],
          datasets: [
            {
              label: "Receita (€)",
              data: sales30d.length > 0 ? sales30d.map((s) => s.revenue) : [0],
              borderColor: "#f4b400",
              borderWidth: 2,
              backgroundColor: gradient,
              fill: true,
              tension: 0.3,
              pointRadius: sales30d.length > 0 ? 3 : 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(0,0,0,0.8)",
              padding: 12,
              callbacks: {
                label: (context) => `Receita: ${context.parsed.y.toFixed(2)}€`
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,0.03)", drawBorder: false },
              ticks: { callback: (value) => value + "€", maxTicksLimit: 5 }
            },
            x: { grid: { display: false }, ticks: { maxRotation: 0 } }
          },
        },
      });
    }

    // 2. Category Chart (Doughnut)
    const catCtx = document.getElementById("categoryChart")?.getContext("2d");
    if (catCtx) {
      if (this.catChart) this.catChart.destroy();
      this.catChart = new Chart(catCtx, {
        type: "doughnut",
        data: {
          labels: distribution.map((d) => d.category),
          datasets: [{
            data: distribution.map((d) => d.count),
            backgroundColor: goldenPalette,
            borderWidth: 0,
            hoverOffset: 15
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 20 } }
          },
        },
      });
    }

    // 3. Orders by Status Chart (Doughnut)
    const statusCtx = document.getElementById("orderStatusChart")?.getContext("2d");
    if (statusCtx) {
      if (this.statusChart) this.statusChart.destroy();
      this.statusChart = new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: ordersByStatus.map(o => o.status),
          datasets: [{
            data: ordersByStatus.map(o => o.count),
            backgroundColor: ["#fef08a", "#bbf7d0", "#bfdbfe", "#bae6fd", "#fecaca"],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { legend: { position: "bottom", labels: { usePointStyle: true } } }
        }
      });
    }

    // 4. Users Growth Chart (Line)
    const growthCtx = document.getElementById("usersGrowthChart")?.getContext("2d");
    if (growthCtx) {
      if (this.growthChart) this.growthChart.destroy();
      this.growthChart = new Chart(growthCtx, {
        type: "line",
        data: {
          labels: usersGrowth.map(u => u.month),
          datasets: [{
            label: "Novos Utilizadores",
            data: usersGrowth.map(u => u.count),
            borderColor: "#1c5236",
            backgroundColor: "rgba(28, 82, 54, 0.1)",
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 5. Top Products (Horizontal Bar)
    const topCtx = document.getElementById("topProductsChart")?.getContext("2d");
    if (topCtx) {
      if (this.topChart) this.topChart.destroy();
      this.topChart = new Chart(topCtx, {
        type: "bar",
        data: {
          labels: topProducts.map(p => p.name),
          datasets: [{
            label: "Receita",
            data: topProducts.map(p => p.revenue),
            backgroundColor: "#f4b400",
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { callback: v => v + "€" } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    // 6. Sales by Beekeeper (Bar)
    const beeCtx = document.getElementById("beekeeperSalesChart")?.getContext("2d");
    if (beeCtx) {
      if (this.beeChart) this.beeChart.destroy();
      this.beeChart = new Chart(beeCtx, {
        type: "bar",
        data: {
          labels: salesByBeekeeper.map(b => b.name),
          datasets: [{
            label: "Total de Vendas",
            data: salesByBeekeeper.map(b => b.revenue),
            backgroundColor: "#1c5236",
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: v => v + "€" } },
            x: { grid: { display: false } }
          }
        }
      });
    }
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

    if (this.products.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum produto cadastrado.</td></tr>`;
      return;
    }

    container.innerHTML = this.products
      .map((p) => {
        const category =
          this.categories?.find((c) => c.ID_Categoria === p.ID_Categoria)
            ?.Nome || `CAT ${p.ID_Categoria}`;
        return `
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
                    <span class="badge bg-light text-dark border">${category}</span>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${
                      this.origins?.find((o) => o.ID_Origem === p.ID_Origem)
                        ?.Nome || "N/A"
                    }</span>
                </td>
                <td>
                    <span class="badge-premium ${p.Status === 'Pendente' ? 'pendente' : p.Status === 'Rejeitado' ? 'rejeitado' : 'aprovado'}">
                        ${p.Status || 'Aprovado'}
                    </span>
                </td>
                <td class="text-end">
                    ${p.Status === 'Pendente' ? `
                      <button class="btn-action-premium success me-1" onclick="adminUI.updateProductStatus('${p.ID_Produto}', 'Aprovado')" title="Aprovar">
                          <i class="fas fa-check" style="font-size: 0.8rem;"></i>
                      </button>
                      <button class="btn-action-premium delete me-1" onclick="adminUI.updateProductStatus('${p.ID_Produto}', 'Rejeitado')" title="Rejeitar">
                          <i class="fas fa-times" style="font-size: 0.8rem;"></i>
                      </button>
                    ` : ""}
                    <button class="btn-action-premium me-1" onclick="adminUI.editProduct('${p.ID_Produto}')" title="Editar">
                        <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                    </button>
                    <button class="btn-action-premium delete" onclick="adminUI.deleteProduct('${p.ID_Produto}')" title="Eliminar">
                        <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                    </button>
                </td>
            </tr>
        `;
      })
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

    if (this.users.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum cliente registado.</td></tr>`;
      return;
    }

    container.innerHTML = this.users
      .map((u) => {
        const initials = u.Nome ? u.Nome.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "??";
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="user-avatar-bubble">${initials}</div>
                        <div>
                            <div class="fw-bold text-dark">${u.Nome}</div>
                            <div class="small text-muted">ID: #${u.ID_Cliente}</div>
                        </div>
                    </div>
                </td>
                <td><div class="small text-dark">${u.Email}</div></td>
                <td>
                    <select class="form-select form-select-sm d-inline-block w-auto bg-light border p-1 rounded-3" onchange="adminUI.updateUserRole('${u.ID_Cliente}', this.value)">
                        <option value="client" ${u.UserType === "client" ? "selected" : ""}>Cliente</option>
                        <option value="apicultor" ${u.UserType === "apicultor" ? "selected" : ""}>Apicultor</option>
                        <option value="admin" ${u.UserType === "admin" ? "selected" : ""}>Admin</option>
                    </select>
                </td>
                <td class="small text-muted">${new Date(u.Data_Resgistro).toLocaleDateString()}</td>
                <td class="text-end">
                    <button class="btn-action-premium delete" onclick="adminUI.deleteUser('${u.ID_Cliente}')" ${u.ID_Cliente === this.userData.id || u.UserType?.toLowerCase() === "admin" ? "disabled" : ""} title="Eliminar utilizador">
                        <i class="fas fa-user-minus" style="font-size: 0.75rem;"></i>
                    </button>
                </td>
            </tr>
        `;
      })
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

    if (this.orders.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Sem encomendas no momento.</td></tr>`;
      return;
    }

    container.innerHTML = this.orders
      .map((o) => {
        const statusClass = o.Status.toLowerCase();
        let premiumBadgeClass = "pendente"; // default
        if (statusClass === "pago") premiumBadgeClass = "aprovado";
        if (statusClass === "cancelado") premiumBadgeClass = "rejeitado";

        return `
            <tr>
                <td class="fw-bold text-muted small">#${o.ID_Encomenda}</td>
                <td><div class="fw-bold text-dark">${o.ClienteNome}</div></td>
                <td class="small text-muted">${new Date(o.Data_Encomenda).toLocaleDateString()}</td>
                <td class="fw-bold">${parseFloat(o.Total).toFixed(2)}€</td>
                <td>
                    <span class="badge-premium ${premiumBadgeClass}">${o.Status}</span>
                </td>
                <td class="text-end">
                    <select class="form-select form-select-sm d-inline-block w-auto rounded-3" onchange="adminUI.updateOrderStatus('${o.ID_Encomenda}', this.value)">
                        <option value="Pendente" ${o.Status === "Pendente" ? "selected" : ""}>Pendente</option>
                        <option value="Pago" ${o.Status === "Pago" ? "selected" : ""}>Pago</option>
                        <option value="Enviado" ${o.Status === "Enviado" ? "selected" : ""}>Enviado</option>
                        <option value="Entregue" ${o.Status === "Entregue" ? "selected" : ""}>Entregue</option>
                        <option value="Cancelado" ${o.Status === "Cancelado" ? "selected" : ""}>Cancelado</option>
                    </select>
                </td>
            </tr>
        `;
      })
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

  async updateProductStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/admin/products/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar estado do produto");
      Swal.fire({
        icon: "success",
        title: `Produto ${status}`,
        timer: 1000,
        showConfirmButton: false,
      });
      await this.loadProducts();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteUser(id) {
    const userToDel = this.users.find(
      (u) => String(u.ID_Cliente) === String(id),
    );
    if (userToDel && userToDel.UserType?.toLowerCase() === "admin") {
      Swal.fire(
        "Aviso",
        "Não é possível remover contas de administrador.",
        "warning",
      );
      return;
    }

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

  async updateUserRole(id, userType) {
    try {
      const response = await fetch(`${API_URL}/admin/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ userType }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao atualizar role");
      }
      Swal.fire({
        icon: "success",
        title: "Permissões de Conta Atualizadas",
        timer: 1000,
        showConfirmButton: false,
      });

      // If current user downgraded themselves, logout
      if (
        String(id) === String(this.userData.id) &&
        userType.toLowerCase() !== "admin"
      ) {
        setTimeout(async () => {
          const { logout } = await import("./auth.js");
          logout();
        }, 1200);
      } else {
        await this.loadUsers();
      }
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
      await this.loadUsers(); // revert UI change
    }
  }

  // --- PRODUCT CRUD HELPERS (existing logic) ---

  async loadCategories() {
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (response.ok) {
        this.categories = await response.json();
        this.populateCategorySelect();
        this.renderCategories();
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  }

  renderCategories() {
    const container = document.getElementById("category-list-body");
    if (!container) return;

    if (this.categories.length === 0) {
      container.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Nenhuma categoria registada.</td></tr>`;
      return;
    }

    container.innerHTML = this.categories
      .map(
        (c) => `
            <tr>
                <td class="fw-bold text-muted">#${c.ID_Categoria}</td>
                <td class="fw-bold">${c.Nome}</td>
                <td class="text-end">
                    <button class="btn-action-premium me-1" onclick="adminUI.editCategory('${c.ID_Categoria}')" title="Editar">
                        <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                    </button>
                    <button class="btn-action-premium delete" onclick="adminUI.deleteCategory('${c.ID_Categoria}')" title="Eliminar">
                        <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  async addCategory() {
    const { value: nome } = await Swal.fire({
      title: "Nova Categoria",
      input: "text",
      inputLabel: "Nome da Categoria",
      inputPlaceholder: "Ex: Mel Biológico",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return "O nome é obrigatório!";
      },
    });

    if (nome) {
      try {
        const res = await fetch(`${API_URL}/admin/categories`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ nome }),
        });
        if (!res.ok) throw new Error("Erro ao criar categoria");

        await this.loadCategories();
        Swal.fire("Criada!", "Categoria adicionada.", "success");
      } catch (e) {
        Swal.fire("Erro", e.message, "error");
      }
    }
  }

  async editCategory(id) {
    const category = this.categories.find(
      (c) => String(c.ID_Categoria) === String(id),
    );
    if (!category) return;

    const { value: nome } = await Swal.fire({
      title: "Editar Categoria",
      input: "text",
      inputLabel: "Novo nome da Categoria",
      inputValue: category.Nome,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return "O nome é obrigatório!";
      },
    });

    if (nome && nome !== category.Nome) {
      try {
        const res = await fetch(`${API_URL}/admin/categories/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ nome }),
        });
        if (!res.ok) throw new Error("Erro ao editar categoria");

        await this.loadCategories();
        Swal.fire("Atualizada!", "Categoria modificada.", "success");
      } catch (e) {
        Swal.fire("Erro", e.message, "error");
      }
    }
  }

  async deleteCategory(id) {
    const productsInCat = this.products.filter(
      (p) => String(p.ID_Categoria) === String(id),
    );
    if (productsInCat.length > 0) {
      Swal.fire(
        "Aviso",
        `Esta categoria possui ${productsInCat.length} produto(s). Remova-os ou altere as suas categorias primeiro.`,
        "warning",
      );
      return;
    }

    const result = await Swal.fire({
      title: "Tem a certeza?",
      text: "Esta ação apagará a categoria.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, eliminar!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/categories/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao eliminar categoria");
        Swal.fire("Eliminada", "", "success");
        await this.loadCategories();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  populateCategorySelect() {
    const select = document.getElementById("prod-categoria");
    if (!select) return;

    select.innerHTML = this.categories
      .map((c) => `<option value="${c.ID_Categoria}">${c.Nome}</option>`)
      .join("");
  }

  resetForm() {
    this.populateCategorySelect();
    this.populateOriginSelect();
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
    this.populateCategorySelect(); // Ensure populated before showing
    const p = this.products.find(
      (prod) => String(prod.ID_Produto) === String(id),
    );
    if (!p) return;
    document.getElementById("product-id").value = p.ID_Produto;
    document.getElementById("prod-nome").value = p.Nome;
    document.getElementById("prod-preco").value = p.Preco;
    document.getElementById("prod-stock").value = p.Stock;
    document.getElementById("prod-categoria").value = p.ID_Categoria;
    document.getElementById("prod-origem").value =
      p.ID_Origin || p.idOrigem || p.ID_Origem || "";
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
    const idOrigem =
      parseInt(document.getElementById("prod-origem").value) || null;
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
          idOrigem,
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

  // --- ORIGINS ---
  async loadOrigins() {
    try {
      const response = await fetch(`${API_URL}/origins`);
      if (response.ok) {
        this.origins = await response.json();
        this.populateOriginSelect();
        this.renderOrigins();
      }
    } catch (e) {
      console.error("Failed to load origins", e);
    }
  }

  renderOrigins() {
    const container = document.getElementById("origin-list-body");
    if (!container) return;

    if (this.origins.length === 0) {
      container.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Nenhuma origem registada.</td></tr>`;
      return;
    }

    container.innerHTML = this.origins
      .map(
        (o) => `
            <tr>
                <td class="fw-bold text-muted">#${o.ID_Origem}</td>
                <td class="fw-bold">${o.Nome}</td>
                <td class="text-end">
                    <button class="btn-action-premium me-1" onclick="adminUI.editOrigin('${o.ID_Origem}')" title="Editar">
                        <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                    </button>
                    <button class="btn-action-premium delete" onclick="adminUI.deleteOrigin('${o.ID_Origem}')" title="Eliminar">
                        <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  async addOrigin() {
    const { value: nome } = await Swal.fire({
      title: "Nova Origem",
      input: "text",
      inputLabel: "Nome da Origem",
      inputPlaceholder: "Ex: Serra da Estrela",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return "O nome é obrigatório!";
      },
    });

    if (nome) {
      try {
        const res = await fetch(`${API_URL}/admin/origins`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ nome }),
        });
        if (!res.ok) throw new Error("Erro ao criar origem");

        await this.loadOrigins();
        Swal.fire("Criada!", "Origem adicionada.", "success");
      } catch (e) {
        Swal.fire("Erro", e.message, "error");
      }
    }
  }

  async editOrigin(id) {
    const origin = this.origins.find((o) => String(o.ID_Origem) === String(id));
    if (!origin) return;

    const { value: nome } = await Swal.fire({
      title: "Editar Origem",
      input: "text",
      inputLabel: "Novo nome da Origem",
      inputValue: origin.Nome,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return "O nome é obrigatório!";
      },
    });

    if (nome && nome !== origin.Nome) {
      try {
        const res = await fetch(`${API_URL}/admin/origins/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ nome }),
        });
        if (!res.ok) throw new Error("Erro ao editar origem");

        await this.loadOrigins();
        Swal.fire("Atualizada!", "Origem modificada.", "success");
      } catch (e) {
        Swal.fire("Erro", e.message, "error");
      }
    }
  }

  async deleteOrigin(id) {
    const productsInOri = this.products.filter(
      (p) => String(p.ID_Origem) === String(id),
    );
    if (productsInOri.length > 0) {
      Swal.fire(
        "Aviso",
        `Esta origem possui ${productsInOri.length} produto(s). Remova-os ou altere as suas origens primeiro.`,
        "warning",
      );
      return;
    }

    const result = await Swal.fire({
      title: "Tem a certeza?",
      text: "Esta ação apagará a origem.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, eliminar!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/origins/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao eliminar origem");
        Swal.fire("Eliminada", "", "success");
        await this.loadOrigins();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  async loadUpgradeRequests() {
    try {
      const response = await fetch(`${API_URL}/admin/upgrade-requests`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar pedidos de Apicultor");
      this.upgradeRequests = await response.json();
      this.renderUpgradeRequests();
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Erro",
        "Não foi possível carregar os pedidos de Apicultor.",
        "error",
      );
    }
  }

  renderUpgradeRequests() {
    const container = document.getElementById("upgrade-list-body");
    if (!container) return;

    if (!this.upgradeRequests || this.upgradeRequests.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Sem pedidos de Apicultor no momento.</td></tr>`;
      return;
    }

    container.innerHTML = this.upgradeRequests
      .map((r) => {
        const initials = r.ClienteNome ? r.ClienteNome.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "??";
        const statusClass = r.Status.toLowerCase();
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="user-avatar-bubble">${initials}</div>
                        <div>
                            <div class="fw-bold text-dark">${r.ClienteNome}</div>
                            <div class="small text-muted">${r.ClienteEmail}</div>
                        </div>
                    </div>
                </td>
                <td><div class="small text-muted text-wrap" style="max-width:300px; line-height: 1.4;">${r.Descricao}</div></td>
                <td>
                    <button class="doc-link-premium border-0 bg-transparent" onclick="adminUI.viewDocument('${r.Documento}')">
                        <i class="fas fa-file-pdf"></i> Ver Doc
                    </button>
                </td>
                <td class="small text-muted">${new Date(r.Data_Pedido).toLocaleDateString()}</td>
                <td>
                    <span class="badge-premium ${statusClass}">
                        ${r.Status}
                    </span>
                </td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-2">
                    ${
                      r.Status === "Pendente"
                        ? `
                        <button class="btn-action-premium success" onclick="adminUI.processUpgradeRequest('${r.ID_Request}', 'Aprovado')" title="Aprovar">
                            <i class="fas fa-check" style="font-size: 0.75rem;"></i>
                        </button>
                        <button class="btn-action-premium delete" onclick="adminUI.processUpgradeRequest('${r.ID_Request}', 'Rejeitado')" title="Rejeitar">
                            <i class="fas fa-times" style="font-size: 0.75rem;"></i>
                        </button>
                    `
                        : `<span class="small text-muted fw-500">${new Date(r.Data_Processamento).toLocaleDateString()}</span>`
                    }
                    </div>
                </td>
            </tr>
        `;
      })
      .join("");
  }

  async processUpgradeRequest(id, status) {
    const action = status === "Aprovado" ? "aprovar" : "rejeitar";
    const result = await Swal.fire({
      title: `Confirmar ${action}?`,
      text: `Tem a certeza que deseja ${action} este pedido de Apicultor?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: status === "Aprovado" ? "#198754" : "#dc3545",
      confirmButtonText: "Sim, confirmar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/upgrade-requests/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) throw new Error("Erro ao processar pedido");

        Swal.fire(
          "Sucesso",
          `Pedido ${status.toLowerCase()} com sucesso!`,
          "success",
        );
        await this.loadUpgradeRequests();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  async loadWorkshops() {
    try {
      const response = await fetch(`${API_URL}/admin/workshops`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar workshops");
      this.workshopsList = await response.json();
      this.renderWorkshops();
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar os workshops.", "error");
    }
  }

  renderWorkshops() {
    const container = document.getElementById("workshops-tbody");
    if (!container) return;

    if (!this.workshopsList || this.workshopsList.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Sem workshops no momento.</td></tr>`;
      return;
    }

    container.innerHTML = this.workshopsList
      .map((w) => {
        const apicultorNome = w.ApicultorNome || "Desconhecido";
        const statusClass = w.Status ? w.Status.toLowerCase().replace(" ", "-") : "pendente";

        return `
            <tr>
                <td><div class="fw-bold text-dark text-wrap" style="max-width:250px;">${w.Titulo}</div></td>
                <td><div class="small text-muted">${apicultorNome}</div></td>
                <td>
                    <div class="small text-muted mb-1"><i class="far fa-calendar-alt me-1"></i>${new Date(w.Data_Realizacao).toLocaleDateString()}</div>
                    <div class="small text-muted"><i class="fas fa-users me-1"></i>${w.Vagas} vagas</div>
                </td>
                <td class="fw-bold text-dark">${parseFloat(w.Preco).toFixed(2)}€</td>
                <td><span class="badge-premium ${statusClass}">${w.Status || 'Pendente'}</span></td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-2">
                    ${
                      (w.Status || "Pendente") === "Pendente"
                        ? `
                        <button class="btn-action-premium success" onclick="adminUI.processWorkshop(${w.ID_Workshop}, 'Aprovado')" title="Aprovar">
                            <i class="fas fa-check" style="font-size: 0.75rem;"></i>
                        </button>
                        <button class="btn-action-premium delete" onclick="adminUI.processWorkshop(${w.ID_Workshop}, 'Rejeitado')" title="Rejeitar">
                            <i class="fas fa-times" style="font-size: 0.75rem;"></i>
                        </button>
                    `
                        : `<span class="small text-muted fw-500">Já processado</span>`
                    }
                    </div>
                </td>
            </tr>
        `;
      })
      .join("");
  }

  async processWorkshop(id, status) {
    const action = status === "Aprovado" ? "aprovar" : "rejeitar";
    const result = await Swal.fire({
      title: `Confirmar ${action}?`,
      text: `Tem a certeza que deseja ${action} este workshop?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: status === "Aprovado" ? "#198754" : "#dc3545",
      confirmButtonText: "Sim, confirmar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/workshops/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) throw new Error("Erro ao processar workshop");

        Swal.fire("Sucesso", `Workshop ${status.toLowerCase()} com sucesso!`, "success");
        await this.loadWorkshops();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  populateOriginSelect() {
    const select = document.getElementById("prod-origem");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Selecionar...</option>';
    this.origins.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.ID_Origem;
      opt.textContent = o.Nome;
      select.appendChild(opt);
    });
    select.value = currentVal;
  }

  viewDocument(path) {
    const modalElement = document.getElementById("documentModal");
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) modal = new bootstrap.Modal(modalElement);
    
    const iframe = document.getElementById("doc-iframe");
    const imgContainer = document.getElementById("doc-image-container");
    const img = document.getElementById("doc-image");
    const loader = document.getElementById("doc-viewer-loader");
    const errorView = document.getElementById("doc-error-view");
    const downloadBtn = document.getElementById("doc-download-link-btn");
    const fallbackLink = document.getElementById("doc-fallback-download");

    // Reset views
    iframe.src = "";
    iframe.classList.add("d-none");
    imgContainer.classList.add("d-none");
    errorView.classList.add("d-none");
    
    loader.classList.remove("d-none");
    loader.classList.add("d-flex");

    
    // Set download links
    downloadBtn.href = path;
    fallbackLink.href = path;

    modal.show();

    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path);
    const isPDF = /\.pdf$/i.test(path);

    // Add cache buster to avoid 304 issues and force fresh load if needed
    const cacheBuster = `?t=${Date.now()}`;
    const urlWithBuster = path + cacheBuster;

    if (isImage) {
      // CRITICAL: Set event handlers BEFORE setting src to avoid race conditions
      img.onload = () => {
        loader.classList.remove("d-flex");
        loader.classList.add("d-none");
        imgContainer.classList.remove("d-none");
        imgContainer.classList.add("d-block");
      };
      img.onerror = () => {
        loader.classList.remove("d-flex");
        loader.classList.add("d-none");
        errorView.classList.remove("d-none");
        errorView.classList.add("d-flex");
      };
      img.src = urlWithBuster;
    } else if (isPDF) {
      // For PDFs, we still set onload handler first
      iframe.onload = () => {
        loader.classList.remove("d-flex");
        loader.classList.add("d-none");
        iframe.classList.remove("d-none");
        iframe.classList.add("d-block");
      };
      iframe.src = urlWithBuster;

      // Fallback if iframe fails to trigger onload (common with PDFs)
      setTimeout(() => {
        if (!loader.classList.contains("d-none")) {
          loader.classList.remove("d-flex");
          loader.classList.add("d-none");
          iframe.classList.remove("d-none");
          iframe.classList.add("d-block");
        }
      }, 2000);
    } else {
      loader.classList.remove("d-flex");
      loader.classList.add("d-none");
      errorView.classList.remove("d-none");
      errorView.classList.add("d-flex");
    }


  }

  // --- INTERACTIONS ANALYTICS ---
  async loadInteractions() {
    try {
      const res = await fetch(`${API_URL}/admin/analytics/interactions`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar interações");
      const data = await res.json();

      // KPI Cards
      const { totals, byType, byPage, topViewed, topCart, perDay } = data;
      const totalEl = document.getElementById("int-total");
      const loggedEl = document.getElementById("int-logged");
      const anonEl = document.getElementById("int-anon");
      if (totalEl) totalEl.textContent = totals?.total ?? 0;
      if (loggedEl) loggedEl.textContent = totals?.logged_in ?? 0;
      if (anonEl) anonEl.textContent = totals?.anonymous ?? 0;

      // Pages Table
      const pagesBody = document.getElementById("int-pages-body");
      if (pagesBody) {
        pagesBody.innerHTML = byPage.length === 0
          ? `<tr><td colspan="2" class="text-center text-muted py-3">Sem dados ainda.</td></tr>`
          : byPage.map(p => `
              <tr>
                <td><i class="fas fa-file-alt me-2 text-muted" style="font-size:0.8rem"></i>${p.pagina}</td>
                <td class="text-end fw-bold">${p.count}</td>
              </tr>`).join("");
      }

      const palette = ["#f4b400","#1c5236","#0284c7","#9333ea","#ef4444","#f97316","#ec4899","#64748b"];

      // Chart: Events per Day
      const perDayCtx = document.getElementById("intPerDayChart")?.getContext("2d");
      if (perDayCtx) {
        if (this.intPerDayChart) this.intPerDayChart.destroy();
        const gradient = perDayCtx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, "rgba(28,82,54,0.3)");
        gradient.addColorStop(1, "rgba(28,82,54,0)");
        this.intPerDayChart = new Chart(perDayCtx, {
          type: "line",
          data: {
            labels: perDay.map(d => new Date(d.dia).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })),
            datasets: [{
              label: "Eventos",
              data: perDay.map(d => d.total),
              borderColor: "#1c5236",
              backgroundColor: gradient,
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              borderWidth: 2,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.03)" }, ticks: { stepSize: 1 } },
              x: { grid: { display: false } }
            }
          }
        });
      }

      // Chart: Events by Type (Doughnut)
      const byTypeCtx = document.getElementById("intByTypeChart")?.getContext("2d");
      if (byTypeCtx) {
        if (this.intByTypeChart) this.intByTypeChart.destroy();
        const typeLabels = { page_view: "Visita Página", product_view: "Viu Produto", add_to_cart: "Add Carrinho", checkout_start: "Checkout", search: "Pesquisa" };
        this.intByTypeChart = new Chart(byTypeCtx, {
          type: "doughnut",
          data: {
            labels: byType.map(t => typeLabels[t.tipo] || t.tipo),
            datasets: [{ data: byType.map(t => t.count), backgroundColor: palette, borderWidth: 0, hoverOffset: 12 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            cutout: "72%",
            plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 16, font: { size: 11 } } } }
          }
        });
      }

      // Chart: Top Viewed Products (horizontal bar)
      const viewCtx = document.getElementById("intTopViewedChart")?.getContext("2d");
      if (viewCtx) {
        if (this.intTopViewedChart) this.intTopViewedChart.destroy();
        this.intTopViewedChart = new Chart(viewCtx, {
          type: "bar",
          data: {
            labels: topViewed.map(p => p.nome || `Produto ${p.id}`),
            datasets: [{ label: "Visualizações", data: topViewed.map(p => p.views), backgroundColor: "#f4b400", borderRadius: 8 }]
          },
          options: {
            indexAxis: "y",
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { stepSize: 1 } }, y: { grid: { display: false } } }
          }
        });
      }

      // Chart: Top Add-to-Cart Products (horizontal bar)
      const cartCtx = document.getElementById("intTopCartChart")?.getContext("2d");
      if (cartCtx) {
        if (this.intTopCartChart) this.intTopCartChart.destroy();
        this.intTopCartChart = new Chart(cartCtx, {
          type: "bar",
          data: {
            labels: topCart.map(p => p.nome || `Produto ${p.id}`),
            datasets: [{ label: "Adds ao Carrinho", data: topCart.map(p => p.adds), backgroundColor: "#1c5236", borderRadius: 8 }]
          },
          options: {
            indexAxis: "y",
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { stepSize: 1 } }, y: { grid: { display: false } } }
          }
        });
      }

      // 1. NEW: Search Queries Table
      const { topSearches, topClicks } = data;
      const searchesBody = document.getElementById("int-searches-body");
      if (searchesBody) {
        searchesBody.innerHTML = !topSearches || topSearches.length === 0
          ? `<tr><td colspan="2" class="text-center text-muted py-3">Sem pesquisas capturadas.</td></tr>`
          : topSearches.map(s => `
              <tr>
                <td class="fw-bold"><i class="fas fa-search me-2 text-muted small"></i>${s.termo}</td>
                <td class="text-end"><span class="badge bg-light text-dark border">${s.count}</span></td>
              </tr>`).join("");
      }

      // 2. NEW: Top Clicks Chart (Horizontal Bar)
      const clickCtx = document.getElementById("intTopClicksChart")?.getContext("2d");
      if (clickCtx) {
        if (this.intTopClicksChart) this.intTopClicksChart.destroy();
        this.intTopClicksChart = new Chart(clickCtx, {
          type: "bar",
          data: {
            labels: topClicks.map(c => c.label.length > 25 ? c.label.substring(0,25) + "..." : c.label),
            datasets: [{ 
              label: "Cliques", 
              data: topClicks.map(c => c.clicks), 
              backgroundColor: "rgba(244, 180, 0, 0.7)", 
              borderColor: "#f4b400",
              borderWidth: 1,
              borderRadius: 4 
            }]
          },
          options: {
            indexAxis: "y",
            responsive: true, maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                callbacks: {
                  afterLabel: (context) => {
                    const item = topClicks[context.dataIndex];
                    return `Elemento: <${item.element}>`;
                  }
                }
              }
            },
            scales: { x: { ticks: { stepSize: 1 } }, y: { grid: { display: false } } }
          }
        });
      }

    } catch (err) {
      console.error("Interactions load error", err);
    }
  }
}

const adminUI = new AdminUI();
window.adminUI = adminUI;
