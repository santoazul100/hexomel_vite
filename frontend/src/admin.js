// Hexomel Admin Logic
const API_URL = "/api";
const ADMIN_LANG_KEY = "hexomel-admin-lang";

const ADMIN_I18N = {
  pt: {
    "admin.panel": "Painel Admin",
    "admin.nav.main": "Principal",
    "admin.nav.dashboard": "Dashboard",
    "admin.nav.products": "Produtos",
    "admin.nav.categories": "Categorias",
    "admin.nav.origins": "Origens",
    "admin.nav.users": "Utilizadores",
    "admin.nav.customers": "Clientes",
    "admin.nav.upgrades": "Pedidos Apicultor",
    "admin.nav.operations": "Operações",
    "admin.nav.orders": "Encomendas",
    "admin.nav.workshops": "Workshops",
    "admin.nav.quiz": "Quiz",
    "admin.nav.analysis": "Análise",
    "admin.nav.interactions": "Interações",
    "admin.nav.settings": "Configurações",
    "admin.nav.appearance": "Aparência",
    "admin.nav.menu": "Menu Dinâmico",
    "admin.nav.cms": "Conteúdo (CMS)",
    "admin.users.title": "Gestão de Utilizadores",
    "admin.users.subtitle": "Visualize, crie e gira os utilizadores registados no sistema.",
    "admin.users.new": "Novo Utilizador",
    "admin.cms.title": "Gestão de Conteúdo (CMS)",
    "admin.cms.subtitle": "Altere os textos ou imagens do site de forma simples e direta, sem mexer em código ou programação.",
    "admin.cms.new": "Novo Bloco de Conteúdo",
    "admin.cms.page": "Selecionar Página do Frontoffice",
    "cms.empty": "Nenhum bloco de conteúdo cadastrado para a página selecionada.",
    "cms.value": "O que deve aparecer no site?",
    "cms.save": "Guardar Texto",
    "cms.delete": "Eliminar",
    "user.empty": "Nenhum utilizador registado.",
    "user.client": "Cliente",
    "user.beekeeper": "Apicultor",
    "user.admin": "Admin",
  },
  en: {
    "admin.panel": "Admin Panel",
    "admin.nav.main": "Main",
    "admin.nav.dashboard": "Dashboard",
    "admin.nav.products": "Products",
    "admin.nav.categories": "Categories",
    "admin.nav.origins": "Origins",
    "admin.nav.users": "Users",
    "admin.nav.customers": "Customers",
    "admin.nav.upgrades": "Beekeeper Requests",
    "admin.nav.operations": "Operations",
    "admin.nav.orders": "Orders",
    "admin.nav.workshops": "Workshops",
    "admin.nav.quiz": "Quiz",
    "admin.nav.analysis": "Analytics",
    "admin.nav.interactions": "Interactions",
    "admin.nav.settings": "Settings",
    "admin.nav.appearance": "Appearance",
    "admin.nav.menu": "Dynamic Menu",
    "admin.nav.cms": "Content (CMS)",
    "admin.users.title": "User Management",
    "admin.users.subtitle": "View, create, and manage registered users.",
    "admin.users.new": "New User",
    "admin.cms.title": "Content Management (CMS)",
    "admin.cms.subtitle": "Change texts or images on the website simply and directly, without touching any code or programming.",
    "admin.cms.new": "New Content Block",
    "admin.cms.page": "Select Frontoffice Page",
    "cms.empty": "No content blocks registered for the selected page.",
    "cms.value": "What should appear on the website?",
    "cms.save": "Save Text",
    "cms.delete": "Delete",
    "user.empty": "No users registered.",
    "user.client": "Customer",
    "user.beekeeper": "Beekeeper",
    "user.admin": "Admin",
  },
};

class AdminUI {
  constructor() {
    this.products = [];
    this.users = [];
    this.orders = [];
    this.categories = []; // newly added
    this.quizQuestions = []; // newly added for quiz
    this.menus = []; // dynamic navigation menus
    this.cmsBlocks = []; // CMS content blocks
    this.showCmsTechnical = false; // toggle for showing technical details
    this.lang = localStorage.getItem(ADMIN_LANG_KEY) || "pt";
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
      const layoutEl = document.getElementById("admin-layout");
      if (layoutEl) layoutEl.style.display = "none";
      window.location.href = "index.html";
      return;
    }

    this.setupEventListeners();
    this.setupAdminLanguage();
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
    this.loadAdminNavbar();
    this.initTooltips();
    this.switchSection("dashboard"); // Default view
  }

  initTooltips() {
    if (window.bootstrap && bootstrap.Tooltip) {
      const tooltipTriggerList = document.querySelectorAll('[title]');
      [...tooltipTriggerList].forEach(el => {
        // Discard previous instance if any
        const existing = bootstrap.Tooltip.getInstance(el);
        if (existing) {
          existing.dispose();
        }
        new bootstrap.Tooltip(el);
      });
    }
  }

  initSidebar() {
    const adminLayout = document.getElementById("admin-layout");
    const mobileQuery = window.matchMedia("(max-width: 991.98px)");
    const toggleMain = document.getElementById("navbar-sidebar-toggle");
    const toggleHide = document.getElementById("sidebar-hide");
    const sectionLinks = document.querySelectorAll(".admin-nav-link[data-section]");

    const applySidebarState = () => {
      if (!adminLayout) return;

      const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

      if (mobileQuery.matches) {
        adminLayout.classList.add("sidebar-collapsed");
        return;
      }

      adminLayout.classList.toggle("sidebar-collapsed", isCollapsed);
    };

    const toggleLogic = () => {
      if (adminLayout) {
        const collapsed = adminLayout.classList.toggle("sidebar-collapsed");
        if (!mobileQuery.matches) {
          localStorage.setItem("sidebarCollapsed", collapsed);
        }
      }
    };

    applySidebarState();
    if (toggleMain) toggleMain.addEventListener("click", toggleLogic);
    if (toggleHide) toggleHide.addEventListener("click", toggleLogic);

    sectionLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (mobileQuery.matches && adminLayout) {
          adminLayout.classList.add("sidebar-collapsed");
        }
      });
    });

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener("change", applySidebarState);
    } else if (mobileQuery.addListener) {
      mobileQuery.addListener(applySidebarState);
    }
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

  t(key) {
    return ADMIN_I18N[this.lang]?.[key] || ADMIN_I18N.pt[key] || key;
  }

  setupAdminLanguage() {
    const apply = () => {
      document.documentElement.lang = this.lang;
      document.querySelectorAll("[data-admin-i18n]").forEach((el) => {
        const key = el.getAttribute("data-admin-i18n");
        el.textContent = this.t(key);
      });
      const label = document.getElementById("admin-lang-label");
      if (label) label.textContent = this.lang.toUpperCase();
    };

    const toggle = document.getElementById("admin-lang-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        this.lang = this.lang === "pt" ? "en" : "pt";
        localStorage.setItem(ADMIN_LANG_KEY, this.lang);
        apply();
        const active = document.querySelector(".admin-section.active")?.id?.replace("-section", "");
        if (active === "customers") this.renderUsers();
        if (active === "cms") this.renderCMSBlocks(document.getElementById("cms-page-selector")?.value || "home");
      });
    }

    apply();
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

    // Menu Type Select Switcher
    const typeRadios = document.querySelectorAll('input[name="menuType"]');
    if (typeRadios) {
      typeRadios.forEach(radio => radio.addEventListener("change", () => this.updateMenuModalFields()));
    }

    // Auto-init tooltips inside modals when fully shown
    document.addEventListener("shown.bs.modal", () => {
      this.initTooltips();
    });

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

  updateMenuModalFields() {
    const typeRadio = document.querySelector('input[name="menuType"]:checked');
    const linkContainer = document.getElementById("menu-link-container");
    const parentContainer = document.getElementById("menu-parent-container");
    const linkInput = document.getElementById("menu-link");
    const parentSelect = document.getElementById("menu-parent");
    const infoContainer = document.getElementById("menu-type-info");
    const infoText = document.getElementById("menu-type-info-text");

    if (!typeRadio) return;

    const val = typeRadio.value;
    
    if (infoContainer && infoText) {
      infoContainer.style.setProperty("display", "flex", "important");
      if (val === "main") {
        infoText.innerHTML = "<strong>Link Normal:</strong> Um atalho direto na barra. Requer um destino (ex: <code>shop.html</code>).";
      } else if (val === "group") {
        infoText.innerHTML = "<strong>Grupo:</strong> Cria apenas um título na navbar sem link próprio. Após guardar, crie <em>Sub-itens</em> e associe-os a este grupo!";
      } else if (val === "sub") {
        infoText.innerHTML = "<strong>Sub-item:</strong> Será agrupado dentro de um menu dropdown (Grupo).";
      }
    }

    if (val === "main") {
      if (linkContainer) linkContainer.style.display = "block";
      if (parentContainer) parentContainer.style.display = "none";
      if (linkInput) {
        linkInput.required = true;
        if (linkInput.value === "#") linkInput.value = "";
      }
      if (parentSelect) {
        parentSelect.value = "";
        parentSelect.required = false;
      }
    } else if (val === "group") {
      if (linkContainer) linkContainer.style.display = "none";
      if (parentContainer) parentContainer.style.display = "none";
      if (linkInput) {
        linkInput.value = "#";
        linkInput.required = false;
      }
      if (parentSelect) {
        parentSelect.value = "";
        parentSelect.required = false;
      }
    } else if (val === "sub") {
      if (linkContainer) linkContainer.style.display = "block";
      if (parentContainer) parentContainer.style.display = "block";
      if (linkInput) {
        linkInput.required = true;
        if (linkInput.value === "#") linkInput.value = "";
      }
      if (parentSelect) {
        parentSelect.required = true;
      }
    }
  }

  async loadAdminNavbar() {
    const navList = document.querySelector("#navbarNav ul.navbar-nav");
    if (!navList) return;

    try {
      const response = await fetch("/api/menu");
      if (!response.ok) throw new Error("Failed to fetch menu");
      const menus = await response.json();
      
      if (menus && menus.length > 0) {
        const topLevel = menus.filter(m => !m.ID_Parent);
        
        navList.innerHTML = topLevel
          .map((m) => {
            const children = menus.filter(child => child.ID_Parent === m.ID_Menu);
            
            let i18nAttr = "";
            if (m.Link === "index.html") i18nAttr = 'data-i18n="nav.home"';
            else if (m.Link === "shop.html") i18nAttr = 'data-i18n="nav.products"';
            else if (m.Link === "workshops.html") i18nAttr = 'data-i18n="nav.workshops"';
            else if (m.Link === "about.html") i18nAttr = 'data-i18n="nav.about"';
            else if (m.Link === "contact.html") i18nAttr = 'data-i18n="nav.contacts"';
            else if (m.Label.toLowerCase() === "descobrir") i18nAttr = 'data-i18n="nav.discover"';

            if (children.length > 0) {
              const childrenHtml = children.map(c => {
                const cTarget = c.Abrir_Nova_Aba ? 'target="_blank" rel="noopener noreferrer"' : '';
                let cI18n = "";
                if (c.Link === "curiosidades.html") cI18n = 'data-i18n="nav.curiosities"';
                else if (c.Link === "aprender.html") cI18n = 'data-i18n="nav.learn"';
                else if (c.Link === "comunidade.html") cI18n = 'data-i18n="nav.community"';
                
                return `<li><a class="dropdown-item" href="${c.Link || '#'}" ${cTarget} ${cI18n}>${c.Label}</a></li>`;
              }).join("");

              return `
                <li class="nav-item dropdown">
                  <a class="nav-link dropdown-toggle" href="${m.Link || '#'}" role="button" data-bs-toggle="dropdown" aria-expanded="false" ${i18nAttr}>${m.Label}</a>
                  <ul class="dropdown-menu dropdown-menu-hexomel">
                    ${childrenHtml}
                  </ul>
                </li>
              `;
            } else {
              const target = m.Abrir_Nova_Aba ? 'target="_blank" rel="noopener noreferrer"' : '';
              return `
                <li class="nav-item">
                  <a class="nav-link" href="${m.Link || '#'}" ${target} ${i18nAttr}>${m.Label}</a>
                </li>
              `;
            }
          })
          .join("");
        
        if (typeof initI18n === "function") {
          initI18n();
        }
      }
    } catch (error) {
      console.warn("Could not load dynamic admin navbar:", error);
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
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
      targetSection.classList.add("active");
    } else {
      console.warn(`Section ${sectionId}-section not found`);
    }

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
    if (sectionId === "seo") this.loadSEO();
    if (sectionId === "quiz") this.loadQuizQuestions();
    if (sectionId === "appearance") this.loadAppearanceSettings();
    if (sectionId === "menus") this.loadMenus();
    if (sectionId === "cms") this.loadCMSBlocks();
  }

  // ============================================================
  // GESTÃO DE MENUS DINÂMICOS
  // ============================================================

  async loadMenus() {
    try {
      const response = await fetch(`${API_URL}/admin/menu`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!response.ok) throw new Error("Falha ao carregar menus");
      this.menus = await response.json();
      this.renderMenusTable();
      this.loadAdminNavbar();
    } catch (error) {
      console.error("Error loading menus:", error);
      Swal.fire("Erro", "Não foi possível carregar os itens de menu.", "error");
    }
  }

  renderMenusTable() {
    const listBody = document.getElementById("admin-menus-list");
    if (!listBody) return;

    if (!this.menus || this.menus.length === 0) {
      listBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            <i class="fas fa-info-circle me-1"></i> Nenhum item de menu encontrado.
          </td>
        </tr>
      `;
      return;
    }

    // Organizar menus hierarquicamente: itens principais primeiro, e seus filhos logo a seguir
    const structuredMenus = [];
    const topLevel = this.menus.filter(m => !m.ID_Parent);
    
    topLevel.forEach(parent => {
      structuredMenus.push(parent);
      const children = this.menus.filter(child => child.ID_Parent === parent.ID_Menu);
      structuredMenus.push(...children);
    });

    // Se algum item tiver ID_Parent mas o pai não for encontrado na lista (ex: órfão), listamos no fim
    this.menus.forEach(m => {
      if (m.ID_Parent && !structuredMenus.includes(m)) {
        structuredMenus.push(m);
      }
    });

    listBody.innerHTML = structuredMenus
      .map((m, index) => {
        const statusBadge = m.Ativo
          ? `<span class="badge bg-success-subtle text-success border border-success border-opacity-10 px-2.5 py-1 rounded-pill cursor-pointer" onclick="adminUI.toggleMenuStatus(${m.ID_Menu}, 0)" style="cursor: pointer;">
              <i class="fas fa-check-circle me-1"></i> Ativo
             </span>`
          : `<span class="badge bg-danger-subtle text-danger border border-danger border-opacity-10 px-2.5 py-1 rounded-pill cursor-pointer" onclick="adminUI.toggleMenuStatus(${m.ID_Menu}, 1)" style="cursor: pointer;">
              <i class="fas fa-times-circle me-1"></i> Oculto
             </span>`;

        const targetBadge = m.Abrir_Nova_Aba
          ? `<span class="badge bg-primary-subtle text-primary border border-primary border-opacity-10 px-2.5 py-1 rounded-pill">Sim</span>`
          : `<span class="badge bg-secondary-subtle text-secondary border border-secondary border-opacity-10 px-2.5 py-1 rounded-pill">Não</span>`;

        let parentBadge = "";
        if (m.ID_Parent) {
          parentBadge = `<span class="badge bg-info-subtle text-info border border-info border-opacity-10 px-2 py-1 rounded-pill ms-2" style="font-size: 0.7rem;">Sub-item</span>`;
        } else if (m.Link === "#") {
          parentBadge = `<span class="badge bg-warning-subtle text-warning border border-warning border-opacity-10 px-2 py-1 rounded-pill ms-2" style="font-size: 0.7rem;"><i class="fas fa-folder me-1"></i>Grupo (Pai)</span>`;
        } else {
          parentBadge = `<span class="badge bg-primary-subtle text-primary border border-primary border-opacity-10 px-2 py-1 rounded-pill ms-2" style="font-size: 0.7rem;"><i class="fas fa-link me-1"></i>Link Normal</span>`;
        }

        const visibilityBtn = m.Ativo
          ? `<button type="button" class="btn btn-sm btn-outline-warning rounded-pill px-3" onclick="adminUI.toggleMenuStatus(${m.ID_Menu}, 0)" title="Ocultar do Menu">
               <i class="fas fa-eye-slash"></i>
             </button>`
          : `<button type="button" class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="adminUI.toggleMenuStatus(${m.ID_Menu}, 1)" title="Mostrar no Menu">
               <i class="fas fa-eye"></i>
             </button>`;

        return `
          <tr ${m.ID_Parent ? 'style="background-color: #f8f9fa;"' : ''}>
            <td class="fw-bold text-muted">${index + 1}</td>
            <td class="fw-600 text-dark">
              ${m.ID_Parent ? '<i class="fas fa-level-up-alt fa-rotate-90 text-muted me-2 ms-4"></i>' : ''}
              ${m.Label} ${parentBadge}
            </td>
            <td class="text-muted"><code style="font-size: 0.85rem;">${m.Link || '#'}</code></td>
            <td>${targetBadge}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">
              <div class="d-flex justify-content-end gap-2">
                ${visibilityBtn}
                <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="adminUI.openMenuModal(${m.ID_Menu})" title="Editar Link">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="adminUI.deleteMenuItem(${m.ID_Menu})" title="Eliminar Link">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
    
    this.initTooltips();
  }

  openMenuModal(id = null) {
    const modalEl = document.getElementById("menuModal");
    if (!modalEl) return;

    const form = document.getElementById("menuForm");
    if (form) form.reset();

    const titleEl = document.getElementById("menuModalTitle");
    const idInput = document.getElementById("menu-id");
    const labelInput = document.getElementById("menu-label");
    const linkInput = document.getElementById("menu-link");
    const ordemInput = document.getElementById("menu-ordem");
    const targetCheckbox = document.getElementById("menu-abrir-nova-aba");
    const activeCheckbox = document.getElementById("menu-ativo");
    const parentSelect = document.getElementById("menu-parent");

    // Populate Parent Select (only top-level groups, i.e. Link is '#')
    if (parentSelect) {
      parentSelect.innerHTML = '<option value="">-- Selecione o Grupo Pai --</option>';
      let count = 0;
      this.menus.forEach(m => {
        if (m.ID_Parent == null && m.ID_Menu !== id && m.Link === "#") {
          const option = document.createElement("option");
          option.value = m.ID_Menu;
          option.textContent = m.Label;
          parentSelect.appendChild(option);
          count++;
        }
      });
      if (count === 0) {
        parentSelect.innerHTML = '<option value="">-- Crie primeiro um Grupo Dropdown --</option>';
      }
    }

    if (id) {
      // Edit mode
      const item = this.menus.find((m) => m.ID_Menu === id);
      if (!item) return;

      if (titleEl) titleEl.innerText = "Editar Link de Menu";
      if (idInput) idInput.value = item.ID_Menu;
      if (labelInput) labelInput.value = item.Label;
      if (linkInput) linkInput.value = item.Link;
      if (ordemInput) ordemInput.value = item.Ordenacao || this.menus.findIndex((m) => m.ID_Menu === id) + 1;
      if (targetCheckbox) targetCheckbox.checked = !!item.Abrir_Nova_Aba;
      if (activeCheckbox) activeCheckbox.checked = !!item.Ativo;

      // Determine type
      let typeVal = "main";
      if (item.ID_Parent) {
        typeVal = "sub";
      } else if (item.Link === "#") {
        // It's a group. Redirect to group modal.
        return this.openGroupModal(id);
      }

      const typeRadio = document.querySelector(`input[name="menuType"][value="${typeVal}"]`);
      if (typeRadio) typeRadio.checked = true;
      if (parentSelect) parentSelect.value = item.ID_Parent || "";
      
      this.updateMenuModalFields();
      
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    } else {
      // Create mode
      if (titleEl) titleEl.innerText = "Novo Link de Menu";
      if (idInput) idInput.value = "";
      if (ordemInput) ordemInput.value = this.menus.length + 1;
      if (targetCheckbox) targetCheckbox.checked = false;
      if (activeCheckbox) activeCheckbox.checked = true;
      if (parentSelect) parentSelect.value = "";
      const typeRadio = document.querySelector('input[name="menuType"][value="main"]');
      if (typeRadio) typeRadio.checked = true;
      
      this.updateMenuModalFields();
      
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  openGroupModal(id = null) {
    const modalEl = document.getElementById("groupModal");
    if (!modalEl) return;

    const form = document.getElementById("groupForm");
    if (form) form.reset();

    const titleEl = document.getElementById("groupModalTitle");
    const idInput = document.getElementById("group-id");
    const labelInput = document.getElementById("group-label");
    const ordemInput = document.getElementById("group-ordem");
    const activeCheckbox = document.getElementById("group-ativo");

    if (id) {
      const item = this.menus.find((m) => m.ID_Menu === id);
      if (!item) return;

      if (titleEl) titleEl.innerText = "Editar Grupo";
      if (idInput) idInput.value = item.ID_Menu;
      if (labelInput) labelInput.value = item.Label;
      if (ordemInput) ordemInput.value = item.Ordenacao || this.menus.findIndex((m) => m.ID_Menu === id) + 1;
      if (activeCheckbox) activeCheckbox.checked = !!item.Ativo;
    } else {
      if (titleEl) titleEl.innerText = "Novo Grupo";
      if (idInput) idInput.value = "";
      if (ordemInput) ordemInput.value = this.menus.length + 1;
      if (activeCheckbox) activeCheckbox.checked = true;
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  async saveMenuItem() {
    const id = document.getElementById("menu-id").value;
    const label = document.getElementById("menu-label").value.trim();
    const linkInput = document.getElementById("menu-link");
    const parentSelect = document.getElementById("menu-parent");
    const typeRadio = document.querySelector('input[name="menuType"]:checked');
    const ordem = parseInt(document.getElementById("menu-ordem").value, 10) || 0;
    const target = document.getElementById("menu-abrir-nova-aba").checked;
    const ativo = document.getElementById("menu-ativo").checked;

    if (!label) {
      Swal.fire("Aviso", "A etiqueta (Label) é obrigatória.", "warning");
      return;
    }

    const typeVal = typeRadio ? typeRadio.value : "main";
    let finalLink = "";
    let finalParent = null;

    if (typeVal === "main") {
      finalLink = linkInput ? linkInput.value.trim() : "";
      if (!finalLink) {
        Swal.fire("Aviso", "O destino (Link) é obrigatório para links principais.", "warning");
        return;
      }
      finalParent = null;
    } else if (typeVal === "group") {
      finalLink = "#";
      finalParent = null;
    } else if (typeVal === "sub") {
      finalLink = linkInput ? linkInput.value.trim() : "";
      if (!finalLink) {
        Swal.fire("Aviso", "O destino (Link) é obrigatório para sub-itens.", "warning");
        return;
      }
      const parentVal = parentSelect ? parentSelect.value : "";
      if (!parentVal) {
        Swal.fire("Aviso", "Por favor, selecione um grupo pai para este sub-item.", "warning");
        return;
      }
      finalParent = parseInt(parentVal, 10);
    }

    const body = {
      Label: label,
      Link: finalLink,
      Ordenacao: ordem,
      Abrir_Nova_Aba: target,
      Ativo: ativo,
      ID_Parent: finalParent
    };

    const isEditing = !!id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/admin/menu/${id}` : `${API_URL}/admin/menu`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao guardar item de menu.");

      const modalEl = document.getElementById("menuModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      Swal.fire({
        icon: "success",
        title: isEditing ? "Link atualizado!" : "Link criado!",
        timer: 1500,
        showConfirmButton: false
      });

      this.loadMenus();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async saveGroupItem() {
    const id = document.getElementById("group-id").value;
    const label = document.getElementById("group-label").value.trim();
    const ordem = parseInt(document.getElementById("group-ordem").value, 10) || 0;
    const ativo = document.getElementById("group-ativo").checked;

    if (!label) {
      Swal.fire("Aviso", "A etiqueta do grupo é obrigatória.", "warning");
      return;
    }

    const body = {
      Label: label,
      Link: "#",
      Ordenacao: ordem,
      Abrir_Nova_Aba: false,
      Ativo: ativo,
      ID_Parent: null
    };

    const isEditing = !!id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/admin/menu/${id}` : `${API_URL}/admin/menu`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao guardar grupo.");

      const modalEl = document.getElementById("groupModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      Swal.fire({
        icon: "success",
        title: isEditing ? "Grupo atualizado!" : "Grupo criado!",
        timer: 1500,
        showConfirmButton: false
      });

      this.loadMenus();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async toggleMenuStatus(id, newStatus) {
    const item = this.menus.find((m) => m.ID_Menu === id);
    if (!item) return;

    const body = {
      Label: item.Label,
      Link: item.Link,
      Ordenacao: item.Ordenacao,
      Abrir_Nova_Aba: !!item.Abrir_Nova_Aba,
      Ativo: !!newStatus
    };

    try {
      const response = await fetch(`${API_URL}/admin/menu/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error("Erro ao atualizar estado.");
      
      Swal.fire({
        icon: "success",
        title: newStatus ? "Menu visível!" : "Menu ocultado!",
        timer: 1000,
        showConfirmButton: false
      });
      
      this.loadMenus();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteMenuItem(id) {
    const result = await Swal.fire({
      title: "Eliminar item?",
      text: "Isto removerá este link da barra de navegação no Frontoffice.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, eliminar!",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/menu/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` }
        });

        if (!response.ok) throw new Error("Falha ao eliminar item de menu.");

        Swal.fire({
          icon: "success",
          title: "Eliminado!",
          timer: 1000,
          showConfirmButton: false
        });

        this.loadMenus();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // ============================================================
  // GESTÃO DE CONTEÚDO (CMS)
  // ============================================================

  toggleCmsTechMode(enabled) {
    this.showCmsTechnical = enabled;
    const pageKey = document.getElementById("cms-page-selector")?.value || "home";
    this.renderCMSBlocks(pageKey);
  }

  async loadCMSBlocks() {
    const selector = document.getElementById("cms-page-selector");
    if (!selector) return;
    const pageKey = selector.value;

    try {
      const response = await fetch(`${API_URL}/cms/${pageKey}`);
      if (!response.ok) throw new Error("Falha ao carregar conteúdos CMS.");
      this.cmsBlocks = await response.json();
      this.renderCMSBlocks(pageKey);
    } catch (error) {
      console.error("Error loading CMS blocks:", error);
      Swal.fire("Erro", "Não foi possível carregar os blocos de conteúdo.", "error");
    }
  }

  renderCMSBlocks(pageKey) {
    const listContainer = document.getElementById("cms-blocks-list");
    if (!listContainer) return;

    if (!this.cmsBlocks || this.cmsBlocks.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-info-circle fa-2x mb-3 text-secondary"></i>
          <p class="m-0">${this.t("cms.empty")}</p>
        </div>
      `;
      return;
    }

    const blockDescriptions = {
      pt: {
        hero_title: {
          title: "Título de Boas-vindas (Topo da Página)",
          desc: "O grande título chamativo exibido no topo da página.",
          icon: "fas fa-heading",
          badge: "Título Principal"
        },
        hero_subtitle: {
          title: "Mensagem de Apresentação (Subtítulo do Topo)",
          desc: "O texto explicativo por baixo do título principal do cabeçalho.",
          icon: "fas fa-align-left",
          badge: "Subtítulo / Introdução"
        },
        featured_title: {
          title: "Título da Secção de Destaques",
          desc: "O título que introduz a vitrine de produtos em destaque.",
          icon: "fas fa-star",
          badge: "Título Secundário"
        },
        featured_subtitle: {
          title: "Subtítulo da Secção de Destaques",
          desc: "A frase de apoio colocada por baixo do título de destaques.",
          icon: "fas fa-comment-alt",
          badge: "Subtítulo"
        },
        legacy_text: {
          title: "História Hexomel (Nosso Legado)",
          desc: "O texto completo que narra a nossa história e o legado tradicional.",
          icon: "fas fa-book-open",
          badge: "Texto Narrativo Longo"
        }
      },
      en: {
        hero_title: {
          title: "Main Welcome Title (Page Top)",
          desc: "The big, prominent title displayed at the very top of the page.",
          icon: "fas fa-heading",
          badge: "Header Title"
        },
        hero_subtitle: {
          title: "Header Subtitle / Tagline",
          desc: "The explanatory paragraph beneath the main welcome title.",
          icon: "fas fa-align-left",
          badge: "Intro Text"
        },
        featured_title: {
          title: "Featured Section Title",
          desc: "The title introducing the section of our selected honeys.",
          icon: "fas fa-star",
          badge: "Section Title"
        },
        featured_subtitle: {
          title: "Featured Section Subtitle",
          desc: "A brief supportive phrase below the featured products title.",
          icon: "fas fa-comment-alt",
          badge: "Section Subtitle"
        },
        legacy_text: {
          title: "Our Legacy Story Text",
          desc: "The detailed historical text recounting our traditional apiculture values.",
          icon: "fas fa-book-open",
          badge: "Long Narrative Text"
        }
      }
    };

    listContainer.innerHTML = this.cmsBlocks
      .map((b) => {
        // Fallback or custom friendly details if key is not predefined
        const langData = blockDescriptions[this.lang] || blockDescriptions.pt;
        const info = langData[b.Block_Key] || {
          title: b.Block_Key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          desc: this.lang === "en" 
            ? "Custom website text block." 
            : "Bloco de texto personalizado do site.",
          icon: "fas fa-edit",
          badge: b.Type.toUpperCase()
        };

        const inputField = b.Content_Value.length > 80 
          ? `<textarea id="cms-value-${b.ID_Content}" class="form-control form-control-v2" rows="4" style="border-radius: 8px; font-size: 0.95rem; line-height: 1.5;" required>${b.Content_Value}</textarea>`
          : `<input type="text" id="cms-value-${b.ID_Content}" class="form-control form-control-v2" value="${b.Content_Value}" style="border-radius: 8px; font-size: 0.95rem;" required />`;

        return `
          <div class="card mb-4 border border-light-subtle shadow-sm overflow-hidden" style="border-radius: 16px; background: #ffffff; transition: all 0.2s;">
            <div class="card-header bg-white border-0 px-4 pt-4 pb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div class="d-flex align-items-center gap-3">
                <div class="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-3" style="width: 42px; height: 42px; font-size: 1.2rem;">
                  <i class="${info.icon}"></i>
                </div>
                <div>
                  <h5 class="fw-bold text-dark m-0" style="font-size: 1.05rem;">${info.title}</h5>
                  <small class="text-muted" style="font-size: 0.85rem;">${info.desc}</small>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                ${
                  this.showCmsTechnical 
                    ? `<span class="badge bg-secondary-subtle text-secondary border border-secondary border-opacity-10 rounded px-2.5 py-1 text-uppercase fw-bold" style="font-size: 0.65rem;">
                         Tipo: ${b.Type}
                       </span>
                       <code class="text-muted small px-2 py-0.5 bg-light rounded border" style="font-size: 0.75rem;">
                         Chave: ${b.Block_Key}
                       </code>`
                    : `<span class="badge bg-success-subtle text-success border border-success border-opacity-10 rounded-pill px-2.5 py-1 fw-bold" style="font-size: 0.7rem;">
                         ${info.badge}
                       </span>`
                }
              </div>
            </div>
            <div class="card-body px-4 pb-4 pt-2">
              <div class="mb-3">
                <label class="form-label small fw-bold text-uppercase text-muted" style="letter-spacing: 0.5px;">
                  ${this.t("cms.value")}
                </label>
                ${inputField}
              </div>
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <small class="text-muted d-flex align-items-center gap-1">
                    <i class="fas fa-history text-secondary"></i>
                    ${this.lang === "en" ? "Changes will reflect instantly on the website." : "As alterações são refletidas no site de imediato."}
                  </small>
                </div>
                <div class="d-flex gap-2">
                  ${
                    this.showCmsTechnical 
                      ? `<button type="button" class="btn btn-outline-danger px-4 py-2 fw-bold btn-sm rounded-pill" onclick="adminUI.deleteCMSBlock(${b.ID_Content})">
                           <i class="fas fa-trash me-2"></i>${this.t("cms.delete")}
                         </button>`
                      : ""
                  }
                  <button type="button" class="btn btn-add-product px-4 py-2 fw-bold btn-sm rounded-pill" onclick="adminUI.saveCMSBlock(${b.ID_Content}, '${b.Page_Key}', '${b.Block_Key}', '${b.Type}')" style="box-shadow: 0 4px 6px rgba(26, 77, 46, 0.15);">
                    <i class="fas fa-save me-2"></i>${this.t("cms.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
    
    this.initTooltips();
  }

  async saveCMSBlock(id, pageKey, blockKey, type) {
    const inputEl = document.getElementById(`cms-value-${id}`);
    if (!inputEl) return;
    
    const value = inputEl.value.trim();
    if (value === "") {
      Swal.fire("Aviso", "O conteúdo não pode estar vazio.", "warning");
      return;
    }

    const body = {
      Page_Key: pageKey,
      Block_Key: blockKey,
      Type: type,
      Content_Value: value
    };

    try {
      Swal.fire({
        title: "A guardar...",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      const response = await fetch(`${API_URL}/admin/cms`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error("Erro ao guardar alteração no CMS.");

      Swal.fire({
        icon: "success",
        title: "Conteúdo atualizado!",
        text: "As alterações foram guardadas com sucesso.",
        timer: 1500,
        showConfirmButton: false
      });

      // Reload blocks
      this.loadCMSBlocks();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async openCMSBlockModal() {
    const currentPage = document.getElementById("cms-page-selector")?.value || "home";
    const result = await Swal.fire({
      title: this.lang === "en" ? "New CMS Block" : "Novo Bloco CMS",
      width: 620,
      html: `
        <div class="text-start">
          <div class="alert alert-warning d-flex align-items-start py-2.5 small mb-3 border-0 rounded-3" style="background-color: rgba(255, 193, 7, 0.08); color: #856404;">
            <i class="fas fa-exclamation-triangle mt-1 me-2 text-warning" style="font-size: 1rem;"></i>
            <span>
              <strong>${this.lang === "en" ? "Developer Area" : "Nota para Administradores"}:</strong> 
              ${this.lang === "en" 
                ? "Creating new custom blocks is recommended for developers. A block requires matching frontend code to display on the site."
                : "A criação de novos blocos personalizados é recomendada para programadores, pois cada bloco precisa de uma chave correspondente no código do site para poder ser exibido."}
            </span>
          </div>
          
          <label class="form-label small fw-bold text-uppercase text-muted">${this.lang === "en" ? "Page" : "Página"}</label>
          <select id="swal-cms-page" class="form-select mb-3 form-control-v2" style="border-radius: 8px;">
            <option value="home" ${currentPage === "home" ? "selected" : ""}>${this.lang === "en" ? "Homepage (Home)" : "Página Inicial (Home)"}</option>
            <option value="about" ${currentPage === "about" ? "selected" : ""}>${this.lang === "en" ? "About Page (About)" : "Página Sobre Nós (About)"}</option>
            <option value="contact" ${currentPage === "contact" ? "selected" : ""}>${this.lang === "en" ? "Contact Page (Contact)" : "Página Contactos (Contact)"}</option>
          </select>
          
          <label class="form-label small fw-bold text-uppercase text-muted">${this.lang === "en" ? "Block Key (Technical Identifier)" : "Chave Técnica (Identificador no Código)"}</label>
          <input id="swal-cms-key" class="form-control mb-3 form-control-v2" placeholder="ex: intro_text" style="border-radius: 8px;">
          <small class="text-muted d-block mb-3" style="font-size: 0.75rem; margin-top: -10px;">
            ${this.lang === "en" ? "Must be unique, lowercase, using underscores instead of spaces." : "Deve ser único, apenas letras minúsculas e underscores (ex: titulo_topo)."}
          </small>
          
          <label class="form-label small fw-bold text-uppercase text-muted">${this.lang === "en" ? "Content Type" : "Tipo de Conteúdo"}</label>
          <select id="swal-cms-type" class="form-select mb-3 form-control-v2" style="border-radius: 8px;">
            <option value="text">${this.lang === "en" ? "Simple Text" : "Texto Curto / Linha Única"}</option>
            <option value="html">${this.lang === "en" ? "Large Paragraph / HTML" : "Parágrafo Longo / HTML"}</option>
            <option value="image_url">${this.lang === "en" ? "Image Link (URL)" : "Link da Imagem (URL)"}</option>
          </select>
          
          <label class="form-label small fw-bold text-uppercase text-muted">${this.lang === "en" ? "Initial Content" : "Conteúdo Inicial"}</label>
          <textarea id="swal-cms-value" class="form-control form-control-v2" rows="4" placeholder="${this.lang === "en" ? "Enter content..." : "Escreve aqui o texto inicial..."}" style="border-radius: 8px;"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: this.lang === "en" ? "Create" : "Criar Bloco",
      cancelButtonText: this.lang === "en" ? "Cancel" : "Cancelar",
      customClass: {
        confirmButton: 'btn btn-add-product px-4 py-2 rounded-pill fw-bold border-0',
        cancelButton: 'btn btn-light px-4 py-2 rounded-pill fw-bold border-0 text-muted'
      },
      buttonsStyling: false,
      preConfirm: () => {
        const payload = {
          Page_Key: document.getElementById("swal-cms-page").value,
          Block_Key: document.getElementById("swal-cms-key").value.trim().toLowerCase(),
          Type: document.getElementById("swal-cms-type").value,
          Content_Value: document.getElementById("swal-cms-value").value.trim(),
        };
        if (!payload.Page_Key || !payload.Block_Key || !payload.Content_Value) {
          Swal.showValidationMessage(this.lang === "en" ? "Fill in all fields." : "Preenche todos os campos obrigatórios.");
          return false;
        }
        if (!/^[a-z0-9_]+$/.test(payload.Block_Key)) {
          Swal.showValidationMessage(this.lang === "en" ? "Key must only contain lowercase letters, numbers, or underscores." : "A chave só pode conter letras minúsculas, números ou underscores.");
          return false;
        }
        return payload;
      },
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/admin/cms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(result.value),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar bloco CMS.");

      const selector = document.getElementById("cms-page-selector");
      if (selector) selector.value = result.value.Page_Key;
      Swal.fire({
        icon: "success",
        title: this.lang === "en" ? "Block created!" : "Bloco criado!",
        timer: 1400,
        showConfirmButton: false,
      });
      await this.loadCMSBlocks();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteCMSBlock(id) {
    const result = await Swal.fire({
      title: this.lang === "en" ? "Delete block?" : "Eliminar bloco?",
      text: this.lang === "en" ? "This content block will be removed from the CMS." : "Este bloco de conteúdo será removido do CMS.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: this.lang === "en" ? "Delete" : "Eliminar",
      cancelButtonText: this.lang === "en" ? "Cancel" : "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/admin/cms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao eliminar bloco CMS.");

      Swal.fire({
        icon: "success",
        title: this.lang === "en" ? "Block deleted!" : "Bloco eliminado!",
        timer: 1200,
        showConfirmButton: false,
      });
      await this.loadCMSBlocks();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
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
      container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">${this.t("user.empty")}</td></tr>`;
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
                        <option value="client" ${u.UserType === "client" ? "selected" : ""}>${this.t("user.client")}</option>
                        <option value="apicultor" ${u.UserType === "apicultor" ? "selected" : ""}>${this.t("user.beekeeper")}</option>
                        <option value="admin" ${u.UserType === "admin" ? "selected" : ""}>${this.t("user.admin")}</option>
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

  async openCreateUserModal() {
    const result = await Swal.fire({
      title: this.lang === "en" ? "Create User" : "Criar Utilizador",
      width: 620,
      html: `
        <div class="text-start">
          <label class="form-label small fw-bold text-uppercase text-muted">${this.lang === "en" ? "Name" : "Nome"}</label>
          <input id="swal-user-name" class="form-control mb-3" placeholder="${this.lang === "en" ? "Full name" : "Nome completo"}">
          <label class="form-label small fw-bold text-uppercase text-muted">Email</label>
          <input id="swal-user-email" type="email" class="form-control mb-3" placeholder="email@exemplo.com">
          <label class="form-label small fw-bold text-uppercase text-muted">Username</label>
          <input id="swal-user-username" class="form-control mb-3" placeholder="utilizador">
          <label class="form-label small fw-bold text-uppercase text-muted">Password</label>
          <input id="swal-user-password" type="password" class="form-control mb-3" placeholder="${this.lang === "en" ? "Temporary password" : "Password temporária"}">
          <label class="form-label small fw-bold text-uppercase text-muted">${this.lang === "en" ? "Type" : "Tipo"}</label>
          <select id="swal-user-type" class="form-select">
            <option value="client">${this.t("user.client")}</option>
            <option value="apicultor">${this.t("user.beekeeper")}</option>
            <option value="admin">${this.t("user.admin")}</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: this.lang === "en" ? "Create" : "Criar",
      cancelButtonText: this.lang === "en" ? "Cancel" : "Cancelar",
      preConfirm: () => {
        const payload = {
          name: document.getElementById("swal-user-name").value.trim(),
          email: document.getElementById("swal-user-email").value.trim(),
          username: document.getElementById("swal-user-username").value.trim(),
          password: document.getElementById("swal-user-password").value,
          userType: document.getElementById("swal-user-type").value,
        };
        if (!payload.name || !payload.email || !payload.username || !payload.password) {
          Swal.showValidationMessage(this.lang === "en" ? "Fill in all fields." : "Preenche todos os campos.");
          return false;
        }
        return payload;
      },
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(result.value),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar utilizador.");

      Swal.fire({
        icon: "success",
        title: this.lang === "en" ? "User created!" : "Utilizador criado!",
        timer: 1400,
        showConfirmButton: false,
      });
      await this.loadUsers();
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
    const slugInput = document.getElementById("prod-slug");
    if (slugInput) slugInput.value = "";
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

    const slugInput = document.getElementById("prod-slug");
    if (slugInput) slugInput.value = p.Slug || "";

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
      
      const responseData = await response.json();
      const productId = id || responseData.ID_Produto || responseData.id;

      const slugInput = document.getElementById("prod-slug");
      if (slugInput && slugInput.value.trim() && productId) {
        try {
          await fetch(`${API_URL}/admin/products/${productId}/slug`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ slug: slugInput.value.trim() }),
          });
        } catch (slugErr) {
          console.warn("Slug update failed:", slugErr);
        }
      }

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
    const loadingEl = document.getElementById("interactions-loading");
    const contentEl = document.getElementById("interactions-content");

    // Mostrar loader e ocultar conteúdo por defeito
    if (loadingEl) {
      loadingEl.classList.remove("d-none");
      loadingEl.classList.add("d-block");
    }
    if (contentEl) {
      contentEl.classList.remove("d-block");
      contentEl.classList.add("d-none");
    }

    try {
      const res = await fetch(`${API_URL}/admin/analytics/interactions`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar interações");
      const data = await res.json();

      // KPI Cards
      const { 
        totals = { total: 0, logged_in: 0, anonymous: 0 }, 
        byType = [], 
        byPage = [], 
        topViewed = [], 
        topCart = [], 
        perDay = [],
        topSearches = [],
        topClicks = []
      } = data || {};

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

      // Ocultar loader e revelar conteúdo
      if (loadingEl) {
        loadingEl.classList.remove("d-block");
        loadingEl.classList.add("d-none");
      }
      if (contentEl) {
        contentEl.classList.remove("d-none");
        contentEl.classList.add("d-block");
      }

    } catch (err) {
      console.error("Interactions load error", err);
    }
  }

  /* ──────────────────────────────────────────
     SEO & URLs MANAGEMENT
  ────────────────────────────────────────── */
  async loadSEO() {
    await Promise.all([this.loadSiteSlugs(), this.loadProductSlugs()]);
  }

  async loadSiteSlugs() {
    try {
      const res = await fetch(`${API_URL}/site-slugs`);
      if (!res.ok) throw new Error("Failed");
      const slugs = await res.json();
      const container = document.getElementById("site-slugs-body");
      if (!container) return;

      const pageLabels = {
        inicio: "🏠 Página Inicial",
        loja: "🛒 Loja",
        sobre: "ℹ️ Sobre Nós",
        contactos: "📧 Contactos",
        workshops: "🎓 Workshops",
        curiosidades: "🍯 Curiosidades",
        comunidade: "💬 Comunidade",
        apicultores: "🐝 Apicultores",
      };

      container.innerHTML = slugs.map(s => `
        <tr>
          <td class="fw-bold">${pageLabels[s.Pagina] || s.Pagina}</td>
          <td>
            <input type="text" class="form-control form-control-sm" 
                   value="${s.Slug || ''}" 
                   data-pagina="${s.Pagina}" 
                   data-field="slug"
                   style="border-radius:8px; font-family:monospace; font-size:0.85rem;">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" 
                   value="${s.Titulo_SEO || ''}" 
                   data-pagina="${s.Pagina}" 
                   data-field="titulo"
                   style="border-radius:8px; font-size:0.85rem;" 
                   placeholder="Título da página">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" 
                   value="${s.Descricao_SEO || ''}" 
                   data-pagina="${s.Pagina}" 
                   data-field="descricao"
                   style="border-radius:8px; font-size:0.85rem;" 
                   placeholder="Meta descrição">
          </td>
        </tr>
      `).join("");
    } catch (err) {
      console.error("Load site slugs error", err);
    }
  }

  async saveSiteSlugs() {
    const rows = document.querySelectorAll("#site-slugs-body tr");
    const slugs = [];
    rows.forEach(row => {
      const pagina = row.querySelector('[data-field="slug"]')?.getAttribute('data-pagina');
      const slug = row.querySelector('[data-field="slug"]')?.value;
      const titulo_seo = row.querySelector('[data-field="titulo"]')?.value;
      const descricao_seo = row.querySelector('[data-field="descricao"]')?.value;
      if (pagina) slugs.push({ pagina, slug, titulo_seo, descricao_seo });
    });

    try {
      const res = await fetch(`${API_URL}/admin/site-slugs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ slugs }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao guardar");
      }
      Swal.fire({ icon: "success", title: "Guardado!", text: "Slugs do site atualizados.", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  async downloadSitemap() {
    try {
      Swal.fire({
        title: 'A gerar sitemap...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      // 1. Fetch data
      const [siteRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/site-slugs`),
        fetch(`${API_URL}/admin/products`, { headers: { Authorization: `Bearer ${this.token}` } })
      ]);

      if (!siteRes.ok || !prodRes.ok) throw new Error("Falha ao obter dados para o sitemap");

      const sitePages = await siteRes.json();
      const products = await prodRes.json();

      // 2. Build XML
      const baseUrl = window.location.origin;
      const date = new Date().toISOString().split('T')[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Add site pages
      sitePages.forEach(p => {
        const publicPath = p.Pagina === "inicio" ? "" : (p.Slug || p.Pagina);
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${publicPath}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <priority>${p.Pagina === 'inicio' ? '1.0' : '0.8'}</priority>\n`;
        xml += `  </url>\n`;
      });

      // Add product pages
      products.forEach(p => {
        if (p.Slug) {
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/produto.html?slug=${p.Slug}</loc>\n`;
          xml += `    <lastmod>${date}</lastmod>\n`;
          xml += `    <priority>0.6</priority>\n`;
          xml += `  </url>\n`;
        }
      });

      xml += `</urlset>`;

      // 3. Trigger Download
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      Swal.fire({
        icon: 'success',
        title: 'Sitemap Gerado!',
        text: 'O ficheiro sitemap.xml foi descarregado com sucesso.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (err) {
      console.error("Sitemap error", err);
      Swal.fire("Erro", err.message, "error");
    }
  }

  async loadProductSlugs() {
    try {
      // Reuse products if already loaded, otherwise fetch
      if (!this.products || this.products.length === 0) {
        const res = await fetch(`${API_URL}/admin/products`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (res.ok) this.products = await res.json();
      }

      const container = document.getElementById("product-slugs-body");
      if (!container) return;

      if (!this.products || this.products.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum produto encontrado.</td></tr>';
        return;
      }

      container.innerHTML = this.products.map(p => `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${p.Imagem || '/images/wildflower.png'}" class="product-img-rounded" alt="${p.Nome}" style="width:32px;height:32px;object-fit:cover;border-radius:8px;">
              <span class="fw-bold small">${p.Nome}</span>
            </div>
          </td>
          <td>
            <code style="background:#f1f5f9; padding:4px 10px; border-radius:6px; font-size:0.82rem; color:#475569;">${p.Slug || '—'}</code>
          </td>
          <td>
            ${p.Slug ? `<a href="produto.html?slug=${p.Slug}" target="_blank" class="small text-decoration-none" style="color:var(--primary-green);">
              <i class="fas fa-external-link-alt me-1"></i>/produto.html?slug=${p.Slug}
            </a>` : '<span class="text-muted small">—</span>'}
          </td>
          <td class="text-end">
            <button class="btn-action-premium" onclick="adminUI.editProductSlug('${p.ID_Produto}', '${(p.Slug || '').replace(/'/g, "\\'")}')"
                    title="Editar Slug">
              <i class="fas fa-pen" style="font-size: 0.75rem;"></i>
            </button>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      console.error("Load product slugs error", err);
    }
  }

  async editProductSlug(productId, currentSlug) {
    const { value: newSlug } = await Swal.fire({
      title: "Editar Slug do Produto",
      input: "text",
      inputLabel: "URL amigável (slug)",
      inputValue: currentSlug,
      inputPlaceholder: "ex: mel-de-rosmaninho",
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--primary-green)",
      inputValidator: (value) => {
        if (!value || !value.trim()) return "O slug é obrigatório!";
      },
    });

    if (!newSlug) return;

    try {
      const res = await fetch(`${API_URL}/admin/products/${productId}/slug`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ slug: newSlug }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao atualizar slug");
      }

      const data = await res.json();
      Swal.fire({ icon: "success", title: "Slug Atualizado!", text: `Novo slug: ${data.slug}`, timer: 2000, showConfirmButton: false });
      
      // Refresh the product list to show updated slug
      this.products = []; // Force re-fetch
      this.loadProductSlugs();
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  // --- APPEARANCE MANAGEMENT ---
  selectLoadingStyle(style) {
    const placeholderStyleEl = document.getElementById("app-placeholder-style");
    if (placeholderStyleEl) {
      placeholderStyleEl.value = style;
    }

    const optSkeleton = document.getElementById("opt-skeleton");
    const optSpinner = document.getElementById("opt-spinner");

    if (style === "spinner") {
      optSkeleton?.classList.remove("active");
      optSpinner?.classList.add("active");
    } else {
      optSpinner?.classList.remove("active");
      optSkeleton?.classList.add("active");
    }
  }

  async loadAppearanceSettings() {
    try {
      const res = await fetch(`${API_URL}/site-settings`);
      if (!res.ok) throw new Error("Falha ao carregar definições de aparência");
      const settings = await res.json();

      const style = settings.placeholder_style || "skeleton";
      const placeholderStyleEl = document.getElementById("app-placeholder-style");
      if (placeholderStyleEl) placeholderStyleEl.value = style;

      // Update active UI cards state
      this.selectLoadingStyle(style);

    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar as definições de aparência.", "error");
    }
  }

  async saveAppearanceSettings() {
    try {
      const settings = {
        placeholder_style: document.getElementById("app-placeholder-style")?.value || "skeleton",
      };

      const res = await fetch(`${API_URL}/admin/site-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) throw new Error("Falha ao salvar definições de aparência");

      Swal.fire({
        icon: "success",
        title: "Definições Guardadas!",
        text: "As alterações de aparência foram guardadas com sucesso.",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível guardar as definições de aparência.", "error");
    }
  }

  // --- QUIZ MANAGEMENT ---
  async loadQuizQuestions() {
    try {
      const response = await fetch(`${API_URL}/quiz/perguntas`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar perguntas do quiz");
      this.quizQuestions = await response.json();
      this.renderQuizQuestions();
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar as perguntas.", "error");
    }
  }

  renderQuizQuestions() {
    const container = document.getElementById("quiz-list-body");
    if (!container) return;

    if (this.quizQuestions.length === 0) {
      container.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Nenhuma pergunta registada.</td></tr>`;
      return;
    }

    container.innerHTML = this.quizQuestions.map(q => {
      const optionsHtml = [q.Opcao1, q.Opcao2, q.Opcao3, q.Opcao4].map((opt, i) => {
        const isCorrect = i === q.Resposta_Correta;
        return `<div style="${isCorrect ? 'font-weight:bold;color:var(--primary-green)' : ''}">
          ${isCorrect ? '<i class="fas fa-check-circle me-1"></i>' : '<i class="far fa-circle me-1 text-muted"></i>'}
          ${opt}
        </div>`;
      }).join("");

      return `
        <tr>
            <td class="fw-bold text-muted">#${q.ID_Pergunta}</td>
            <td>
              <div class="fw-bold text-dark mb-1">${q.Pergunta}</div>
              <div class="small text-muted fst-italic">Explic: ${q.Explicacao}</div>
            </td>
            <td class="small">${optionsHtml}</td>
            <td class="text-end">
                <button class="btn-action-premium me-1" onclick="adminUI.editQuizQuestion(${q.ID_Pergunta})" title="Editar">
                    <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                </button>
                <button class="btn-action-premium delete" onclick="adminUI.deleteQuizQuestion(${q.ID_Pergunta})" title="Eliminar">
                    <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                </button>
            </td>
        </tr>
      `;
    }).join("");
  }

  resetQuizForm() {
    document.getElementById("quizForm").reset();
    document.getElementById("quizId").value = "";
    document.getElementById("quizModalLabel").innerText = "Adicionar Nova Pergunta";
  }

  editQuizQuestion(id) {
    const q = this.quizQuestions.find(x => x.ID_Pergunta === id);
    if (!q) return;

    document.getElementById("quizId").value = q.ID_Pergunta;
    document.getElementById("quizQuestion").value = q.Pergunta;
    document.getElementById("quizOpt1").value = q.Opcao1;
    document.getElementById("quizOpt2").value = q.Opcao2;
    document.getElementById("quizOpt3").value = q.Opcao3;
    document.getElementById("quizOpt4").value = q.Opcao4;
    document.getElementById("quizCorrectOpt").value = q.Resposta_Correta;
    document.getElementById("quizExplanation").value = q.Explicacao;
    document.getElementById("quizModalLabel").innerText = "Editar Pergunta #" + id;

    const modal = new bootstrap.Modal(document.getElementById("quizModal"));
    modal.show();
  }

  async saveQuizQuestion() {
    const id = document.getElementById("quizId").value;
    const body = {
      pergunta: document.getElementById("quizQuestion").value,
      opcao1: document.getElementById("quizOpt1").value,
      opcao2: document.getElementById("quizOpt2").value,
      opcao3: document.getElementById("quizOpt3").value,
      opcao4: document.getElementById("quizOpt4").value,
      resposta_correta: parseInt(document.getElementById("quizCorrectOpt").value, 10),
      explicacao: document.getElementById("quizExplanation").value,
    };

    if (!body.pergunta || !body.opcao1 || !body.opcao2 || !body.opcao3 || !body.opcao4 || !body.explicacao) {
      Swal.fire("Erro", "Preencha todos os campos obrigatórios.", "warning");
      return;
    }

    const isEditing = !!id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/quiz/perguntas/${id}` : `${API_URL}/quiz/perguntas`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error("Falha ao guardar pergunta");
      
      const modal = bootstrap.Modal.getInstance(document.getElementById("quizModal"));
      if (modal) modal.hide();
      
      Swal.fire({ icon: "success", title: "Pergunta Guardada", timer: 1500, showConfirmButton: false });
      this.loadQuizQuestions();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteQuizQuestion(id) {
    const result = await Swal.fire({
      title: "Remover Pergunta?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, apagar!"
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/quiz/perguntas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` }
        });
        if (!response.ok) throw new Error("Erro ao apagar");
        Swal.fire({ icon: "success", title: "Apagada", timer: 1000, showConfirmButton: false });
        this.loadQuizQuestions();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }
}

const adminUI = new AdminUI();
window.adminUI = adminUI;
export default adminUI;
