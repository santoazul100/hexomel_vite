// Hexomel Admin Logic
const API_URL = "/api";
import Swal from "sweetalert2";
import { initI18n, createLangToggle } from "./i18n.js";
import { loadSiteSlugsCache, loadDynamicMenu } from "./main.js";
import "./styles/maintenance.css";



class AdminUI {
  constructor() {
    this.products = [];
    this.users = [];
    this.orders = [];
    this.categories = []; // newly added
    this.quizQuestions = []; // newly added for quiz
    this.menus = []; // dynamic navigation menus
    this.cmsBlocks = []; // CMS content blocks
    this.carouselProducts = []; // products for carousel management
    this.showCmsTechnical = false; // toggle for showing technical details
    this.facts = []; // dynamic cards for Aprender page
    this.glossaryTerms = []; // terms for Aprender page
    this.token = localStorage.getItem("token");
    this.userData = JSON.parse(localStorage.getItem("user"));
    this.currentTags = new Set(); // Stores active tags for the modal
    this.layoutAnimationStyle = "fade";

    // Load monetization parameters from localStorage with defaults
    const savedComm = localStorage.getItem("adminCommissionRate");
    this.commissionRate = savedComm !== null ? parseFloat(savedComm) : 10;
    if (isNaN(this.commissionRate)) this.commissionRate = 10;

    const savedGate = localStorage.getItem("adminGatewayRate");
    this.gatewayRate = savedGate !== null ? parseFloat(savedGate) : 2;
    if (isNaN(this.gatewayRate)) this.gatewayRate = 2;

    const savedFixed = localStorage.getItem("adminFixedCosts");
    this.fixedCosts = savedFixed !== null ? parseFloat(savedFixed) : 2000;
    if (isNaN(this.fixedCosts)) this.fixedCosts = 2000;

    this.init();
  }

  async init() {
    // Security Check
    if (!this.token || !this.userData) {
      window.location.replace("/login?admin=true");
      return;
    }

    const clientRole = this.userData.role || this.userData.userType || this.userData.UserType;
    if (clientRole?.toLowerCase() !== "admin") {
      document.documentElement.classList.add("admin-access-denied");
      const layoutEl = document.getElementById("admin-layout");
      if (layoutEl) layoutEl.style.display = "none";
      return;
    }

    // Server-side validation of token & role
    try {
      const verifyRes = await fetch("/api/auth/verify-admin", {
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      });
      
      if (!verifyRes.ok) {
        throw new Error("Server-side authorization failed");
      }
    } catch (e) {
      console.error("Admin verification failed:", e);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/login?admin=true");
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

    initI18n();

    loadDynamicMenu();
    this.initTooltips();
    
    try {
      await loadSiteSlugsCache();
    } catch (e) {
      console.warn("Could not load friendly URLs cache in admin:", e);
    }

    this.prefillMonetizationInputs();
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
    const sectionLinks = document.querySelectorAll(
      ".admin-nav-link[data-section]",
    );

    // Dynamic navbar height calculation to prevent page overlap
    const updateNavbarHeight = () => {
      const nav = document.querySelector(".navbar-enhanced");
      if (nav) {
        const height = nav.getBoundingClientRect().height;
        document.documentElement.style.setProperty("--navbar-height", `${height}px`);
      }
    };
    updateNavbarHeight();
    window.addEventListener("resize", updateNavbarHeight);
    window.addEventListener("scroll", updateNavbarHeight);
    window.addEventListener("load", updateNavbarHeight);
    setTimeout(updateNavbarHeight, 100);
    setTimeout(updateNavbarHeight, 500);

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

    // Close on link click for mobile
    sectionLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (mobileQuery.matches && adminLayout) {
          adminLayout.classList.add("sidebar-collapsed");
        }
      });
    });

    // Close on backdrop click for mobile
    const backdrop = document.getElementById("sidebar-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", () => {
        if (adminLayout) {
          adminLayout.classList.add("sidebar-collapsed");
        }
      });
    }

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


  setupEventListeners() {
    // Maintenance mode toggle button
    const maintenanceBtn = document.getElementById("toggle-maintenance-btn");
    if (maintenanceBtn) {
      maintenanceBtn.addEventListener("click", () => this.toggleMaintenanceMode());
    }

    // Nav switching
    const navLinks = document.querySelectorAll(".admin-nav-link[data-section]");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    // Simulator inputs
    const simRate = document.getElementById("sim-rate");
    const simGateway = document.getElementById("sim-gateway");
    const simFixed = document.getElementById("sim-fixed-costs");
    const simGmv = document.getElementById("sim-gmv");

    if (simRate) {
      simRate.addEventListener("input", () => {
        const val = parseFloat(simRate.value);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          this.commissionRate = val;
          localStorage.setItem("adminCommissionRate", val);
          this.updateUIPercentages();
          this.loadVendasData();
          this.loadAnalytics();
        }
      });
    }

    if (simGateway) {
      simGateway.addEventListener("input", () => {
        const val = parseFloat(simGateway.value);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          this.gatewayRate = val;
          localStorage.setItem("adminGatewayRate", val);
          this.updateUIPercentages();
          this.loadVendasData();
          this.loadAnalytics();
        }
      });
    }

    if (simFixed) {
      simFixed.addEventListener("input", () => {
        const val = parseFloat(simFixed.value);
        if (!isNaN(val) && val >= 0) {
          this.fixedCosts = val;
          localStorage.setItem("adminFixedCosts", val);
          this.loadAnalytics();
          this.runSimulator();
        }
      });
    }

    if (simGmv) {
      simGmv.addEventListener("input", () => this.runSimulator());
    }

    const simSingleGross = document.getElementById("sim-single-gross");
    const simSingleApicultor = document.getElementById("sim-single-apicultor");

    if (simSingleGross) {
      simSingleGross.addEventListener("input", () => this.runSingleSimulator("gross"));
    }
    if (simSingleApicultor) {
      simSingleApicultor.addEventListener("input", () => this.runSingleSimulator("apicultor"));
    }

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
    this.setupLayoutToggle();
  }

  prefillMonetizationInputs() {
    const simRateInput = document.getElementById("sim-rate");
    const simGatewayInput = document.getElementById("sim-gateway");
    const simFixedInput = document.getElementById("sim-fixed-costs");

    if (simRateInput) simRateInput.value = this.commissionRate;
    if (simGatewayInput) simGatewayInput.value = this.gatewayRate;
    if (simFixedInput) simFixedInput.value = this.fixedCosts;

    this.updateUIPercentages();
  }

  updateUIPercentages() {
    const netRate = this.commissionRate - this.gatewayRate;
    const sellerRate = 100 - this.commissionRate;

    // 1. Badge "TAXA COMISSÃO: X%"
    const badgeEl = document.getElementById("badge-taxa-comissao");
    if (badgeEl) {
      badgeEl.innerHTML = `<i class="fas fa-percent text-success me-1"></i> TAXA COMISSÃO: ${this.commissionRate}%`;
    }

    // 2. Dashboard Card platforms commission label
    const dashCommLabelEl = document.getElementById("dash-platform-commission-label");
    if (dashCommLabelEl) {
      dashCommLabelEl.innerHTML = `Comissões (${this.commissionRate}%) <i class="fas fa-circle-info text-muted ms-1" style="font-size:0.75rem;" title="Receita total proveniente das comissões cobradas sobre as vendas da plataforma."></i>`;
    }

    // 3. Sales Cards Labels
    const commLabelEl = document.getElementById("vendas-platform-commission-label");
    if (commLabelEl) {
      commLabelEl.innerHTML = `Comissão Bruta (${this.commissionRate}%) <i class="fas fa-circle-info text-muted ms-1" title="Percentagem cobrada sobre as vendas dos apicultores. Esta comissão é a receita bruta da plataforma."></i>`;
    }

    const gateLabelEl = document.getElementById("vendas-gateway-fees-label");
    if (gateLabelEl) {
      gateLabelEl.innerHTML = `Custos Gateway (${this.gatewayRate}%) <i class="fas fa-circle-info text-muted ms-1" title="Despesas financeiras de processamento cobradas pela entidade bancária ou gateway de pagamentos."></i>`;
    }

    const netLabelEl = document.getElementById("vendas-platform-net-label");
    if (netLabelEl) {
      netLabelEl.innerHTML = `Receita Líquida (${netRate.toFixed(1)}%) <i class="fas fa-circle-info text-muted ms-1" title="Receita retida pela plataforma após deduzir os custos do gateway de pagamento (Comissão Bruta - Custos Gateway)."></i>`;
    }

    // 4. Sales Table Headers
    const thComm = document.getElementById("th-vendas-comm");
    if (thComm) {
      thComm.innerHTML = `Comissão (${this.commissionRate}%) <i class="fas fa-circle-info text-muted ms-1" style="font-size:0.75rem;" title="Taxa cobrada pela plataforma (Bruto * Taxa Comissão)."></i>`;
    }

    const thGate = document.getElementById("th-vendas-gate");
    if (thGate) {
      thGate.innerHTML = `Gateway (${this.gatewayRate}%) <i class="fas fa-circle-info text-muted ms-1" style="font-size:0.75rem;" title="Custos cobrados pelo processador de pagamentos (Bruto * 2%)."></i>`;
    }

    const thPlat = document.getElementById("th-vendas-plat");
    if (thPlat) {
      thPlat.innerHTML = `Plataforma (${netRate.toFixed(1)}%) <i class="fas fa-circle-info text-muted ms-1" style="font-size:0.75rem;" title="Lucro retido pela plataforma (Comissão - Gateway)."></i>`;
    }

    const thVend = document.getElementById("th-vendas-vend");
    if (thVend) {
      thVend.innerHTML = `Vendedor (${sellerRate.toFixed(1)}%) <i class="fas fa-circle-info text-muted ms-1" style="font-size:0.75rem;" title="Valor líquido a transferir para o apicultor (Bruto - Comissão)."></i>`;
    }
    
    // 5. Simulator labels (inside the simulator card)
    const lblSimComm = document.getElementById("lbl-sim-commission");
    if (lblSimComm) lblSimComm.innerText = `Comissão (${this.commissionRate}%):`;

    const lblSimGate = document.getElementById("lbl-sim-gateway");
    if (lblSimGate) lblSimGate.innerText = `Custos Gateway (${this.gatewayRate}%):`;

    const lblSimNet = document.getElementById("lbl-sim-net");
    if (lblSimNet) lblSimNet.innerText = `Margem Líquida (${netRate.toFixed(1)}%):`;

    // 6. Individual Transaction Simulator labels
    const lblSingleComm = document.getElementById("lbl-single-commission");
    if (lblSingleComm) lblSingleComm.innerText = `Comissão Bruta (${this.commissionRate}%):`;

    const lblSingleGate = document.getElementById("lbl-single-gateway");
    if (lblSingleGate) lblSingleGate.innerText = `Custo Gateway (${this.gatewayRate}%):`;

    const lblSingleNet = document.getElementById("lbl-single-net");
    if (lblSingleNet) lblSingleNet.innerText = `Lucro Plataforma (${netRate.toFixed(1)}%):`;

    // Trigger single simulator recalculation
    this.runSingleSimulator("gross");

    // Re-initialize tooltips since label HTML was updated
    this.initTooltips();
  }

  runSingleSimulator(changedSource = "gross") {
    const grossInput = document.getElementById("sim-single-gross");
    const apicultorInput = document.getElementById("sim-single-apicultor");

    if (!grossInput || !apicultorInput) return;

    let gross = 0;
    if (changedSource === "gross") {
      gross = parseFloat(grossInput.value) || 0;
      const apicultorGain = gross * (1 - this.commissionRate / 100);
      apicultorInput.value = apicultorGain.toFixed(2);
    } else {
      const apicultorGain = parseFloat(apicultorInput.value) || 0;
      if (this.commissionRate < 100) {
        gross = apicultorGain / (1 - this.commissionRate / 100);
      } else {
        gross = 0;
      }
      grossInput.value = gross.toFixed(2);
    }

    const commission = gross * (this.commissionRate / 100);
    const gateway = gross * (this.gatewayRate / 100);
    const netMargin = commission - gateway;

    const commVal = document.getElementById("sim-single-comm-val");
    const gateVal = document.getElementById("sim-single-gate-val");
    const netVal = document.getElementById("sim-single-net-val");

    if (commVal) commVal.innerText = `€${commission.toFixed(2)}`;
    if (gateVal) gateVal.innerText = `€${gateway.toFixed(2)}`;
    if (netVal) netVal.innerText = `€${netMargin.toFixed(2)}`;
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

    // Fix scroll locking issues from modals/sweetalerts
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";

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
    if (sectionId === "comunidade") this.loadComunidade();
    if (sectionId === "reviews") this.loadReviews();
    if (sectionId === "appearance") this.loadAppearanceSettings();
    if (sectionId === "menus") this.loadMenus();
    if (sectionId === "cms") {
      this.loadCMSBlocks();
      this.loadCarouselProducts();
    }
    if (sectionId === "maintenance") {
      this.loadMaintenanceSectionSettings();
      this.loadMaintenanceComplaints();
    }
    if (sectionId === "moderacao") {
      this.loadModerationData();
    }
    if (sectionId === "aprender-factos") this.loadFacts();
    if (sectionId === "aprender-glossario") this.loadGlossaryTerms();
    if (sectionId === "monetizacao") this.loadMonetization();
    if (sectionId === "vendas") this.loadVendasData();
  }

  // ============================================================
  // GESTÃO DE MENUS DINÂMICOS
  // ============================================================

  async loadMenus() {
    try {
      const response = await fetch(`${API_URL}/admin/menu`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar menus");
      this.menus = await response.json();
      this.renderMenusTable();
      loadDynamicMenu();
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
    const url = isEditing
      ? `${API_URL}/admin/menu/${id}`
      : `${API_URL}/admin/menu`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro ao guardar item de menu.");

      const modalEl = document.getElementById("menuModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      Swal.fire({
        icon: "success",
        title: isEditing ? "Link atualizado!" : "Link criado!",
        timer: 1500,
        showConfirmButton: false,
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
      Ativo: !!newStatus,
    };

    try {
      const response = await fetch(`${API_URL}/admin/menu/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Erro ao atualizar estado.");

      Swal.fire({
        icon: "success",
        title: newStatus ? "Menu visível!" : "Menu ocultado!",
        timer: 1000,
        showConfirmButton: false,
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
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/menu/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) throw new Error("Falha ao eliminar item de menu.");

        Swal.fire({
          icon: "success",
          title: "Eliminado!",
          timer: 1000,
          showConfirmButton: false,
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

    const previewBtn = document.getElementById("cms-preview-btn");
    if (previewBtn) {
      const routeMap = {
        home: "/inicio",
        shop: "/shop.html",
        workshops: "/workshops.html",
        about: "/about.html",
        contact: "/contact.html"
      };
      previewBtn.href = routeMap[pageKey] || "/inicio";
    }

    try {
      const response = await fetch(`${API_URL}/cms/${pageKey}`);
      if (!response.ok) throw new Error("Falha ao carregar conteúdos CMS.");
      this.cmsBlocks = await response.json();
      this.renderCMSBlocks(pageKey);
    } catch (error) {
      console.error("Error loading CMS blocks:", error);
      Swal.fire(
        "Erro",
        "Não foi possível carregar os blocos de conteúdo.",
        "error",
      );
    }
  }

  renderCMSBlocks(pageKey) {
    const listContainer = document.getElementById("cms-blocks-list");
    if (!listContainer) return;

    if (!this.cmsBlocks || this.cmsBlocks.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-info-circle fa-2x mb-3 text-secondary"></i>
          <p class="m-0">Nenhum bloco de conteúdo cadastrado para a página selecionada.</p>
        </div>
      `;
      return;
    }

    const blockDescriptions = {
      home_hero_title: {
        title: "Título de Boas-vindas (Topo da Home)",
        desc: "O grande título chamativo exibido no topo da página inicial.",
        icon: "fas fa-heading",
        badge: "Título Principal"
      },
      home_hero_subtitle: {
        title: "Mensagem de Apresentação (Subtítulo da Home)",
        desc: "O texto explicativo por baixo do título principal do cabeçalho.",
        icon: "fas fa-align-left",
        badge: "Subtítulo / Introdução"
      },
      home_featured_title: {
        title: "Título da Secção de Destaques",
        desc: "O título que introduz a vitrine de produtos em destaque.",
        icon: "fas fa-star",
        badge: "Título Secundário"
      },
      home_featured_subtitle: {
        title: "Subtítulo da Secção de Destaques",
        desc: "A frase de apoio colocada por baixo do título de destaques.",
        icon: "fas fa-comment-alt",
        badge: "Subtítulo"
      },
      about_hero_title: {
        title: "Título da Página Sobre Nós",
        desc: "O título de apresentação da secção sobre a história da empresa.",
        icon: "fas fa-book-open",
        badge: "Título Principal"
      },
      about_hero_subtitle: {
        title: "Subtítulo da Página Sobre Nós",
        desc: "Frase introdutória sobre a missão e valores da Hexomel.",
        icon: "fas fa-align-left",
        badge: "Subtítulo"
      },
      about_legacy_text: {
        title: "História Hexomel (Nosso Legado)",
        desc: "O texto completo que narra a história e o legado tradicional da marca.",
        icon: "fas fa-history",
        badge: "Texto Narrativo Longo"
      },
      contact_hero_title: {
        title: "Título da Página de Contactos",
        desc: "Título principal exibido no cabeçalho da página de contactos.",
        icon: "fas fa-envelope",
        badge: "Título Principal"
      },
      contact_hero_subtitle: {
        title: "Subtítulo da Página de Contactos",
        desc: "Mensagem de acolhimento para incentivar os clientes a entrarem em contacto.",
        icon: "fas fa-comment-dots",
        badge: "Subtítulo"
      },
      shop_hero_title: {
        title: "Título da Loja de Mel",
        desc: "Título principal no topo do catálogo de produtos.",
        icon: "fas fa-store",
        badge: "Título Principal"
      },
      shop_hero_subtitle: {
        title: "Subtítulo da Loja de Mel",
        desc: "Descrição introdutória sob o título da loja.",
        icon: "fas fa-align-left",
        badge: "Subtítulo"
      },
      workshops_hero_title: {
        title: "Título da Secção de Workshops",
        desc: "Título principal no cabeçalho da página de experiências apícolas.",
        icon: "fas fa-graduation-cap",
        badge: "Título Principal"
      },
      workshops_hero_subtitle: {
        title: "Subtítulo de Workshops",
        desc: "Descrição sobre a experiência de aprender com apicultores.",
        icon: "fas fa-user-graduate",
        badge: "Subtítulo"
      },
      home_hero_image: {
        title: "Imagem Principal (Topo)",
        desc: "A imagem grande em destaque na página inicial.",
        icon: "fas fa-image",
        badge: "Imagem",
        defaultImage: "/images/hero.png"
      },
      about_hero_image: {
        title: "Imagem Principal (Sobre Nós)",
        desc: "A imagem fotográfica ao lado do texto de apresentação.",
        icon: "fas fa-image",
        badge: "Imagem",
        defaultImage: "/images/mel-jar-premium.png"
      }
    };

    const blockOrder = {
      hero_title: 1,
      hero_subtitle: 2,
      featured_title: 3,
      featured_subtitle: 4,
      legacy_text: 5,
      hero_image: 6
    };

    const sortedBlocks = [...this.cmsBlocks].sort((a, b) => {
      const orderA = blockOrder[a.Block_Key] || 99;
      const orderB = blockOrder[b.Block_Key] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.Block_Key.localeCompare(b.Block_Key);
    });

    listContainer.innerHTML = sortedBlocks
      .map((b) => {
        const compositeKey = `${b.Page_Key}_${b.Block_Key}`;
        const info = blockDescriptions[compositeKey] || blockDescriptions[b.Block_Key] || {
          title: b.Block_Key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          desc: "Bloco de texto personalizado do site.",
          icon: "fas fa-edit",
          badge: b.Type.toUpperCase()
        };
        let inputField = "";
        if (b.Type === "image_url") {
          inputField = `
            <div class="d-flex align-items-center gap-4 mt-2 mb-3 p-3 shadow-sm" style="background: #fffcf2; border-radius: 12px; border: 1px solid #fde68a;">
              <div style="width: 100px; height: 100px; border-radius: 10px; overflow: hidden; background: #ffffff; border: 1px solid #fde68a; flex-shrink: 0; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);">
                <img id="cms-img-preview-${b.ID_Content}" src="${b.Content_Value}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.src='https://via.placeholder.com/80?text=Sem+Img'" />
              </div>
              <div class="flex-grow-1">
                <div class="input-group shadow-sm mb-2" style="border-radius: 8px; overflow: hidden;">
                  <input type="text" id="cms-value-${b.ID_Content}" class="form-control border-0" value="${b.Content_Value}" placeholder="URL da Imagem (Ex: /images/banner.png)" style="font-size: 0.95rem; background: #ffffff;" required />
                  <input type="file" id="cms-file-${b.ID_Content}" accept="image/*" style="display: none;" onchange="window.uploadCMSImage('${b.ID_Content}', this)" />
                  <label for="cms-file-${b.ID_Content}" class="btn d-flex align-items-center gap-2 px-3 m-0" style="background: #f59e0b; color: #fff; font-weight: 600; cursor: pointer; border: none; transition: background 0.2s;">
                    <i class="fas fa-upload"></i> Escolher Ficheiro
                  </label>
                  ${info.defaultImage ? `
                    <button type="button" class="btn btn-light text-muted d-flex align-items-center justify-content-center px-3 m-0 border-start" onclick="document.getElementById('cms-value-${b.ID_Content}').value='${info.defaultImage}'; document.getElementById('cms-img-preview-${b.ID_Content}').src='${info.defaultImage}';" title="Repor imagem original (Hexomel)" style="background: #f8f9fa;">
                      <i class="fas fa-undo"></i>
                    </button>
                  ` : ''}
                </div>
                <small class="text-muted d-block" style="font-size: 0.85rem;"><i class="fas fa-lightbulb text-warning me-1"></i>Pode enviar uma imagem do computador ou colar um link web diretamente.</small>
              </div>
            </div>`;
        } else {
          inputField = b.Content_Value.length > 80
            ? `<textarea id="cms-value-${b.ID_Content}" class="form-control form-control-v2" rows="4" style="border-radius: 8px; font-size: 0.95rem; line-height: 1.5;" required>${b.Content_Value}</textarea>`
            : `<input type="text" id="cms-value-${b.ID_Content}" class="form-control form-control-v2" value="${b.Content_Value}" style="border-radius: 8px; font-size: 0.95rem;" required />`;
        }

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
                  ${b.Type === 'image_url' ? 'Imagem a apresentar no site' : 'O que deve aparecer no site?'}
                </label>
                ${inputField}
              </div>
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <small class="text-muted d-flex align-items-center gap-1">
                    <i class="fas fa-history text-secondary"></i>
                    As alterações são refletidas no site de imediato.
                  </small>
                </div>
                <div class="d-flex gap-2">
                  ${
                    this.showCmsTechnical 
                      ? `<button type="button" class="btn btn-outline-danger px-4 py-2 fw-bold btn-sm rounded-pill" onclick="adminUI.deleteCMSBlock(${b.ID_Content})">
                           <i class="fas fa-trash me-2"></i>Eliminar
                         </button>`
                      : ""
                  }
                  <button type="button" class="btn btn-add-product px-4 py-2 fw-bold btn-sm rounded-pill" onclick="adminUI.saveCMSBlock(${b.ID_Content}, '${b.Page_Key}', '${b.Block_Key}', '${b.Type}')" style="box-shadow: 0 4px 6px rgba(26, 77, 46, 0.15);">
                    <i class="fas fa-save me-2"></i>${b.Type === 'image_url' ? 'Guardar Imagem' : 'Guardar Texto'}
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
      Content_Value: value,
    };

    try {
      Swal.fire({
        title: "A guardar...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch(`${API_URL}/admin/cms`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Erro ao guardar alteração no CMS.");

      Swal.fire({
        icon: "success",
        title: "Conteúdo atualizado!",
        text: "As alterações foram guardadas com sucesso.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Reload blocks
      this.loadCMSBlocks();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async openCMSBlockModal() {
    const currentPage =
      document.getElementById("cms-page-selector")?.value || "home";
    const result = await Swal.fire({
      title: "Novo Bloco CMS",
      width: 620,
      html: `
        <div class="text-start">
          <div class="alert alert-warning d-flex align-items-start py-2.5 small mb-3 border-0 rounded-3" style="background-color: rgba(255, 193, 7, 0.08); color: #856404;">
            <i class="fas fa-exclamation-triangle mt-1 me-2 text-warning" style="font-size: 1rem;"></i>
            <span>
              <strong>Nota para Administradores:</strong> 
              A criação de novos blocos personalizados é recomendada para programadores, pois cada bloco precisa de uma chave correspondente no código do site para poder ser exibido.
            </span>
          </div>
          
          <label class="form-label small fw-bold text-uppercase text-muted">Página</label>
          <select id="swal-cms-page" class="form-select mb-3 form-control-v2" style="border-radius: 8px;">
            <option value="home" ${currentPage === "home" ? "selected" : ""}>🏠 Página Inicial (Home)</option>
            <option value="shop" ${currentPage === "shop" ? "selected" : ""}>🛒 Loja & Catálogo (Shop)</option>
            <option value="workshops" ${currentPage === "workshops" ? "selected" : ""}>🐝 Workshops & Experiências</option>
            <option value="about" ${currentPage === "about" ? "selected" : ""}>📖 Página Sobre Nós (About)</option>
            <option value="contact" ${currentPage === "contact" ? "selected" : ""}>✉️ Página Contactos (Contact)</option>
          </select>
          
          <label class="form-label small fw-bold text-uppercase text-muted">Chave Técnica (Identificador no Código)</label>
          <input id="swal-cms-key" class="form-control mb-3 form-control-v2" placeholder="ex: intro_text" style="border-radius: 8px;">
          <small class="text-muted d-block mb-3" style="font-size: 0.75rem; margin-top: -10px;">
            Deve ser único, apenas letras minúsculas e underscores (ex: titulo_topo).
          </small>
          
          <label class="form-label small fw-bold text-uppercase text-muted">Tipo de Conteúdo</label>
          <select id="swal-cms-type" class="form-select mb-3 form-control-v2" style="border-radius: 8px;">
            <option value="text">Texto Curto / Linha Única</option>
            <option value="html">Parágrafo Longo / HTML</option>
            <option value="image_url">Link da Imagem (URL)</option>
          </select>
          
          <label class="form-label small fw-bold text-uppercase text-muted">Conteúdo Inicial</label>
          <textarea id="swal-cms-value" class="form-control form-control-v2" rows="4" placeholder="Escreve aqui o texto inicial..." style="border-radius: 8px;"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Criar Bloco",
      cancelButtonText: "Cancelar",
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
          Swal.showValidationMessage("Preenche todos os campos obrigatórios.");
          return false;
        }
        if (!/^[a-z0-9_]+$/.test(payload.Block_Key)) {
          Swal.showValidationMessage("A chave só pode conter letras minúsculas, números ou underscores.");
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
      if (!response.ok)
        throw new Error(data.error || "Erro ao criar bloco CMS.");

      const selector = document.getElementById("cms-page-selector");
      if (selector) selector.value = result.value.Page_Key;
      Swal.fire({
        icon: "success",
        title: "Bloco criado!",
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
      title: "Eliminar bloco?",
      text: "Este bloco de conteúdo será removido do CMS.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/admin/cms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro ao eliminar bloco CMS.");

      Swal.fire({
        icon: "success",
        title: "Bloco eliminado!",
        timer: 1200,
        showConfirmButton: false,
      });
      await this.loadCMSBlocks();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  // --- CAROUSEL MANAGEMENT ---
  async loadCarouselProducts() {
    try {
      const response = await fetch(`${API_URL}/admin/products`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar produtos para carrossel");
      this.carouselProducts = await response.json();
      this.renderCarouselProducts();
    } catch (error) {
      console.error("Error loading products for carousel:", error);
    }
  }

  renderCarouselProducts() {
    const featuredList = document.getElementById("carousel-featured-list");
    const othersList = document.getElementById("carousel-others-list");
    if (!featuredList || !othersList) return;

    if (!this.carouselProducts || this.carouselProducts.length === 0) {
      featuredList.innerHTML = `<div class="col-12 text-center py-3 text-muted small">Nenhum produto destacado.</div>`;
      othersList.innerHTML = `<div class="col-12 text-center py-3 text-muted small">Nenhum produto disponível.</div>`;
      return;
    }

    const searchQuery = document.getElementById("carousel-search")?.value?.toLowerCase() || "";

    const filtered = this.carouselProducts.filter(p => 
      (p.Nome.toLowerCase().includes(searchQuery) ||
      (p.Tags && p.Tags.toLowerCase().includes(searchQuery))) &&
      p.Status !== 'Pendente'
    );

    const featuredProds = filtered.filter(p => Number(p.Em_Destaque) === 1);
    const otherProds = filtered.filter(p => Number(p.Em_Destaque) !== 1);

    // Render Featured
    if (featuredProds.length === 0) {
      featuredList.innerHTML = `<div class="col-12 text-center py-4 text-muted small border border-dashed rounded-3" style="background: rgba(0,0,0,0.01);">Nenhum produto destacado no carrossel de momento.</div>`;
    } else {
      featuredList.innerHTML = featuredProds.map(p => this.renderCarouselProductCard(p, true)).join("");
    }

    // Render Others
    if (otherProds.length === 0) {
      othersList.innerHTML = `<div class="col-12 text-center py-4 text-muted small">Nenhum outro produto disponível.</div>`;
    } else {
      othersList.innerHTML = otherProds.map(p => this.renderCarouselProductCard(p, false)).join("");
    }
  }

  renderCarouselProductCard(p, isFeatured) {
    const category = p.Nome_Categoria || this.categories?.find(c => c.ID_Categoria === p.ID_Categoria)?.Nome || `Categoria ${p.ID_Categoria}`;
    return `
      <div class="col-md-6 col-lg-4">
        <div class="admin-card border p-3 d-flex align-items-center justify-content-between gap-3 h-100" style="border-radius: 12px; background: ${isFeatured ? 'rgba(26, 77, 46, 0.02)' : 'white'}; border-color: ${isFeatured ? 'rgba(26, 77, 46, 0.15) !important' : 'rgba(0,0,0,0.08) !important'};">
          <div class="d-flex align-items-center gap-2 overflow-hidden">
            <img src="${p.Imagem || "/images/wildflower.png"}" alt="${p.Nome}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: contain; background: #f8f9fa; padding: 4px; border: 1px solid rgba(0,0,0,0.05);">
            <div class="overflow-hidden">
              <h6 class="mb-0 text-dark fw-bold text-truncate" style="font-size: 0.9rem;">${p.Nome}</h6>
              <span class="text-muted smaller">${category}</span>
            </div>
          </div>
          <button class="btn btn-sm ${isFeatured ? 'btn-danger' : 'btn-outline-success'} d-flex align-items-center gap-1 fw-bold rounded-pill px-3" onclick="adminUI.toggleProductFeaturedCarousel('${p.ID_Produto}', ${isFeatured ? 0 : 1})" style="font-size: 0.75rem; white-space: nowrap;">
            <i class="${isFeatured ? 'fas fa-times' : 'fas fa-plus'}"></i>
            ${isFeatured ? 'Remover' : 'Adicionar'}
          </button>
        </div>
      </div>
    `;
  }

  async toggleProductFeaturedCarousel(id, emDestaque) {
    try {
      const response = await fetch(`${API_URL}/admin/products/${id}/featured`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ emDestaque }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar destaque do produto");
      
      // Update local product state if it exists
      if (this.carouselProducts) {
        const prod = this.carouselProducts.find(p => String(p.ID_Produto) === String(id));
        if (prod) prod.Em_Destaque = emDestaque ? 1 : 0;
      }
      if (this.products) {
        const prod = this.products.find(p => String(p.ID_Produto) === String(id));
        if (prod) prod.Em_Destaque = emDestaque ? 1 : 0;
      }

      this.renderCarouselProducts();
      this.renderProducts();
      
      Swal.fire({
        icon: "success",
        title: emDestaque ? "Adicionado ao Carrossel" : "Removido do Carrossel",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  filterCarouselProducts() {
    this.renderCarouselProducts();
  }

  async loadDashboardStats() {
    try {
      // Fetch all data in parallel
      await Promise.all([
        this.loadProducts(),
        this.loadUsers(),
        this.loadOrders(),
      ]);

      // Update Users (Apicultores & Clientes)
      const apicultoresCount = this.users.filter(u => u.UserType === 'apicultor').length;
      const clientesCount = this.users.filter(u => u.UserType === 'client').length;
      const totalUsers = this.users.length;

      const totalUsersEl = document.getElementById("dash-total-users");
      if (totalUsersEl) totalUsersEl.innerText = totalUsers;

      const totalApicultoresEl = document.getElementById("dash-total-apicultores");
      if (totalApicultoresEl) totalApicultoresEl.innerText = apicultoresCount;

      const totalClientesEl = document.getElementById("dash-total-clientes");
      if (totalClientesEl) totalClientesEl.innerText = clientesCount;

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
      this.loadMaintenanceStatus();
    } catch (e) {
      console.error("Error loading dashboard stats", e);
    }
  }

  async loadMaintenanceStatus() {
    try {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return;
      const settings = await res.json();
      const isMaintenance = settings.maintenance_mode === "true";
      this.updateMaintenanceUI(isMaintenance);
    } catch (e) {
      console.error("Error loading maintenance status:", e);
    }
  }

  updateMaintenanceUI(isMaintenance) {
    const badge = document.getElementById("system-status-badge");
    const icon = document.getElementById("system-status-icon");
    const text = document.getElementById("system-status-text");
    const btn = document.getElementById("toggle-maintenance-btn");
    const btnText = document.getElementById("toggle-maintenance-text");

    if (isMaintenance) {
      if (badge) {
        badge.className = "badge bg-danger text-white border border-danger px-3 py-2 rounded-pill fw-bold shadow-sm";
      }
      if (icon) {
        icon.className = "fas fa-exclamation-triangle me-1 text-white";
      }
      if (text) {
        text.innerText = "SISTEMA EM MANUTENÇÃO";
      }
      if (btn) {
        btn.className = "btn btn-outline-success btn-sm rounded-pill fw-bold d-flex align-items-center gap-1 px-3";
      }
      if (btnText) {
        btnText.innerText = "Desativar Modo de Manutenção";
      }
    } else {
      if (badge) {
        badge.className = "badge bg-light text-muted border px-3 py-2 rounded-pill fw-bold";
      }
      if (icon) {
        icon.className = "fas fa-circle text-success me-1";
      }
      if (text) {
        text.innerText = "SISTEMA ONLINE";
      }
      if (btn) {
        btn.className = "btn btn-outline-warning btn-sm rounded-pill fw-bold d-flex align-items-center gap-1 px-3";
      }
      if (btnText) {
        btnText.innerText = "Ativar Modo de Manutenção";
      }
    }
  }

  async toggleMaintenanceMode() {
    const text = document.getElementById("system-status-text")?.innerText;
    const isCurrentlyActive = text && text.includes("MANUTENÇÃO");
    const willActivate = !isCurrentlyActive;

    const confirmRes = await Swal.fire({
      title: willActivate ? "Ativar Modo de Manutenção?" : "Desativar Modo de Manutenção?",
      text: willActivate ? "Ao ativar, os utilizadores verão o aviso e a página de manutenção." : "Pretende desativar a manutenção e restaurar o acesso normal?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, Confirmar",
      cancelButtonText: "Cancelar"
    });

    if (!confirmRes.isConfirmed) return;

    Swal.fire({
      title: "A processar...",
      text: willActivate ? "A ativar manutenção e a notificar utilizadores..." : "A atualizar definições...",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const res = await fetch("/api/admin/maintenance/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`
        },
        body: JSON.stringify({ active: willActivate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alterar estado.");

      this.updateMaintenanceUI(willActivate);

      Swal.fire({
        title: "Sucesso!",
        text: data.message + (data.notifiedCount ? ` (${data.notifiedCount} e-mails enviados/agendados)` : ""),
        icon: "success"
      });
    } catch (e) {
      console.error(e);
      Swal.fire("Erro", e.message, "error");
    }
  }

  async loadMaintenanceSectionSettings() {
    try {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return;
      const settings = await res.json();

      this.currentMaintenanceStates = {
        full: settings.maintenance_full === "true" || settings.maintenance_mode === "true",
        shop: settings.maintenance_shop === "true",
        curiosidades: settings.maintenance_curiosidades === "true",
        aprender: settings.maintenance_aprender === "true",
        hexohive: settings.maintenance_hexohive === "true"
      };

      const toggleFull = document.getElementById("maint-toggle-full");
      const toggleShop = document.getElementById("maint-toggle-shop");
      const toggleCuriosidades = document.getElementById("maint-toggle-curiosidades");
      const toggleAprender = document.getElementById("maint-toggle-aprender");
      const toggleHexohive = document.getElementById("maint-toggle-hexohive");

      if (toggleFull) toggleFull.checked = this.currentMaintenanceStates.full;
      if (toggleShop) toggleShop.checked = this.currentMaintenanceStates.shop;
      if (toggleCuriosidades) toggleCuriosidades.checked = this.currentMaintenanceStates.curiosidades;
      if (toggleAprender) toggleAprender.checked = this.currentMaintenanceStates.aprender;
      if (toggleHexohive) toggleHexohive.checked = this.currentMaintenanceStates.hexohive;

      const msgInput = document.getElementById("maint-message-input");
      const endInput = document.getElementById("maint-endtime-input");

      if (msgInput) msgInput.value = settings.maintenance_message || "Estamos a realizar melhorias importantes nesta área do site.";
      if (endInput) {
        const now = new Date();
        const toLocalIso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        endInput.min = toLocalIso(now);

        let validEndTime = null;
        if (settings.maintenance_end_time) {
          const parsed = new Date(settings.maintenance_end_time);
          if (!isNaN(parsed.getTime()) && parsed.getTime() > now.getTime()) {
            validEndTime = settings.maintenance_end_time;
          }
        }

        if (validEndTime) {
          endInput.value = validEndTime;
        } else {
          const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          endInput.value = toLocalIso(future);
        }
      }
    } catch (e) {
      console.error("Error loading maintenance section settings:", e);
    }
  }

  async saveMaintenanceSettings() {
    const fullActive = document.getElementById("maint-toggle-full")?.checked || false;
    const shopActive = document.getElementById("maint-toggle-shop")?.checked || false;
    const curiosidadesActive = document.getElementById("maint-toggle-curiosidades")?.checked || false;
    const aprenderActive = document.getElementById("maint-toggle-aprender")?.checked || false;
    const hexohiveActive = document.getElementById("maint-toggle-hexohive")?.checked || false;

    const message = document.getElementById("maint-message-input")?.value || "Estamos a realizar melhorias importantes nesta área do site.";
    const endTime = document.getElementById("maint-endtime-input")?.value || "";

    if (endTime) {
      const selectedDate = new Date(endTime);
      if (!isNaN(selectedDate.getTime()) && selectedDate.getTime() < Date.now() - 60000) {
        Swal.fire("Data Inválida", "Não é possível definir uma data ou hora de regresso no passado. Por favor, selecione um horário futuro.", "warning");
        return;
      }
    }

    const prev = this.currentMaintenanceStates || {};
    const changedSections = [];

    if (prev.full !== fullActive) changedSections.push({ name: "Site Inteiro", active: fullActive });
    if (prev.shop !== shopActive) changedSections.push({ name: "Compras / Loja", active: shopActive });
    if (prev.curiosidades !== curiosidadesActive) changedSections.push({ name: "Curiosidades", active: curiosidadesActive });
    if (prev.aprender !== aprenderActive) changedSections.push({ name: "Aprender", active: aprenderActive });
    if (prev.hexohive !== hexohiveActive) changedSections.push({ name: "HexoHive", active: hexohiveActive });

    Swal.fire({
      title: "A guardar definições...",
      text: "A guardar alterações de manutenção...",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const res = await fetch("/api/admin/maintenance/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`
        },
        body: JSON.stringify({
          maintenance_full: fullActive,
          maintenance_shop: shopActive,
          maintenance_curiosidades: curiosidadesActive,
          maintenance_aprender: aprenderActive,
          maintenance_hexohive: hexohiveActive,
          maintenance_message: message,
          maintenance_end_time: endTime,
          changed_sections: changedSections
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao guardar configurações.");

      try {
        localStorage.setItem("hexomel_maint_cache", JSON.stringify({
          maintenance_full: String(fullActive),
          maintenance_shop: String(shopActive),
          maintenance_curiosidades: String(curiosidadesActive),
          maintenance_aprender: String(aprenderActive),
          maintenance_hexohive: String(hexohiveActive),
          maintenance_message: message,
          maintenance_end_time: endTime
        }));
      } catch(e){}

      this.currentMaintenanceStates = {
        full: fullActive,
        shop: shopActive,
        curiosidades: curiosidadesActive,
        aprender: aprenderActive,
        hexohive: hexohiveActive
      };

      this.updateMaintenanceUI(fullActive);

      Swal.fire({
        title: "Sucesso!",
        text: "Definições de manutenção guardadas com sucesso.",
        icon: "success"
      });
    } catch (e) {
      console.error(e);
      Swal.fire("Erro", e.message, "error");
    }
  }

  previewMaintenancePopup() {
    const existing = document.getElementById("hexomel-maint-popup-overlay");
    if (existing) existing.remove();

    const message = document.getElementById("maint-message-input")?.value || "Estamos a realizar melhorias importantes nesta área do site.";
    const rawEndTime = document.getElementById("maint-endtime-input")?.value || "";
    
    let formattedEnd = rawEndTime;
    if (rawEndTime && rawEndTime.includes("T")) {
      const d = new Date(rawEndTime);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        formattedEnd = `${day}/${month}/${d.getFullYear()} às ${hours}:${mins}`;
      }
    }

    const overlay = document.createElement("div");
    overlay.id = "hexomel-maint-popup-overlay";
    overlay.className = "hexomel-maint-overlay";

    overlay.innerHTML = `
      <div class="hexomel-maint-modal">
        <div class="hexomel-maint-popup-stage">
          <svg width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; filter: drop-shadow(0 6px 12px rgba(245, 158, 11, 0.25));">
            <path d="M50 12 L85 32 L15 32 Z" fill="#d97706" />
            <rect x="18" y="32" width="64" height="13" rx="4" fill="#f59e0b" />
            <rect x="22" y="47" width="56" height="13" rx="4" fill="#fbbf24" />
            <rect x="26" y="62" width="48" height="13" rx="4" fill="#f59e0b" />
            <rect x="30" y="77" width="40" height="10" rx="3" fill="#d97706" />
            <ellipse cx="50" cy="70" rx="7" ry="5" fill="#78350f" />
          </svg>
          <img src="/images/bee/abelha.webp" alt="Abelha" class="hexomel-maint-real-bee hexomel-maint-popup-bee-1" />
          <img src="/images/bee/abelha_inverso.webp" alt="Abelha" class="hexomel-maint-real-bee hexomel-maint-popup-bee-2" />
          <img src="/images/bee/abelha.webp" alt="Abelha" class="hexomel-maint-real-bee hexomel-maint-popup-bee-3" />
        </div>
        <h2 class="hexomel-maint-modal-title">Em Manutenção</h2>
        <div class="hexomel-maint-modal-badge">🛠️ [Pré-visualização do Pop-Up]</div>
        <p class="hexomel-maint-modal-desc">${message}</p>
        
        ${formattedEnd ? `
          <div class="hexomel-maint-modal-meta">
            <strong>🕒 Previsão de Regresso:</strong> ${formattedEnd}
          </div>
        ` : ''}

        <div>
          <button id="hexomel-maint-close-btn" class="btn btn-warning rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm w-100" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-size: 1rem;">
            Fechar Pré-visualização
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("hexomel-maint-close-btn").addEventListener("click", () => {
      overlay.remove();
    });
  }

  async loadMaintenanceComplaints() {
    const tbody = document.getElementById("maint-complaints-tbody");
    if (!tbody) return;

    try {
      const res = await fetch("/api/admin/maintenance/complaints", {
        headers: { "Authorization": `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error("Erro ao carregar reclamações.");
      const complaints = await res.json();

      if (!Array.isArray(complaints) || complaints.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted py-4">
              <i class="fas fa-check-circle text-success me-2"></i>Nenhuma reclamação ou mensagem recebida até ao momento.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = complaints.map(c => {
        const dateStr = new Date(c.created_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
        const isCensored = c.message && (c.message.includes('*') || /\*{2,}/.test(c.message) || /nigger/i.test(c.message));
        const hasEmail = c.user_email && c.user_email !== 'Não especificado' && c.user_email.includes('@');
        const emailHTML = hasEmail 
          ? `<a href="mailto:${c.user_email}" class="text-success text-decoration-none fw-semibold" style="font-size: 0.88rem;">${c.user_email}</a>` 
          : `<span class="text-muted fst-italic" style="font-size: 0.88rem;">Não especificado</span>`;

        const dangerBadge = isCensored 
          ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle ms-2 px-2 py-1 rounded-pill" style="font-size:0.75rem; vertical-align: middle;"><i class="fas fa-exclamation-triangle me-1"></i>Linguagem Ofensiva</span>` 
          : '';

        const blockBtn = isCensored 
          ? `<button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 fw-semibold me-1" style="font-size: 0.78rem;" title="Bloquear Utilizador" onclick="adminUI.blockUserFromComplaint('${encodeURIComponent(c.user_email || '')}', '${encodeURIComponent(c.user_name || '')}')">
               <i class="fas fa-user-slash me-1"></i>Bloquear
             </button>` 
          : '';

        return `
          <tr class="${isCensored ? 'table-danger-subtle' : ''}" style="${isCensored ? 'background-color: #fff8f8;' : ''}">
            <td class="fw-medium text-muted align-middle" style="white-space: nowrap; font-size: 0.85rem;">${dateStr}</td>
            <td class="fw-bold text-dark align-middle" style="font-size: 0.88rem;">${c.user_name || 'Anónimo'}</td>
            <td class="align-middle">${emailHTML}</td>
            <td class="align-middle"><span class="badge bg-light text-dark border px-2.5 py-1 rounded-pill" style="font-size: 0.78rem; font-weight: 600;">${c.section || 'Geral'}</span></td>
            <td class="align-middle" style="max-width: 340px; word-wrap: break-word; font-size: 0.88rem;">
              <span class="${isCensored ? 'fw-semibold text-danger' : 'text-dark'}">${c.message}</span>
              ${dangerBadge}
            </td>
            <td class="text-end align-middle" style="white-space: nowrap;">
              ${blockBtn}
              <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 fw-semibold me-1" style="font-size: 0.78rem;" title="Responder por Email" onclick="adminUI.openReplyComplaintModal(${c.id}, '${encodeURIComponent(c.user_name || '')}', '${encodeURIComponent(c.user_email || '')}', '${encodeURIComponent(c.section || 'Geral')}')">
                <i class="fas fa-reply me-1"></i>Responder
              </button>
              <button type="button" class="btn-action-premium delete align-middle" title="Eliminar Mensagem" onclick="adminUI.deleteMaintenanceComplaint(${c.id})">
                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
              </button>
            </td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      console.error("Error loading complaints:", e);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Erro ao carregar reclamações.</td></tr>`;
    }
  }

  async blockUserFromComplaint(emailEnc, nameEnc) {
    const email = decodeURIComponent(emailEnc) || "";
    const userName = decodeURIComponent(nameEnc) || "Utilizador";

    const result = await Swal.fire({
      title: "Bloquear Utilizador?",
      text: `Tem a certeza que pretende restringir/bloquear a conta associada a ${userName} (${email || 'sem email registrado'})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, Bloquear",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/admin/maintenance/block-user", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, user_name: userName })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire("Bloqueado!", data.message || "Utilizador bloqueado com sucesso.", "success");
        this.loadMaintenanceComplaints();
      } else {
        Swal.fire("Aviso", data.error || "Não foi possível bloquear este utilizador.", "warning");
      }
    } catch (e) {
      console.error("Error blocking user:", e);
      Swal.fire("Erro", "Erro ao comunicar com o servidor.", "error");
    }
  }

  openReplyComplaintModal(id, nameEnc, emailEnc, sectionEnc) {
    const userName = decodeURIComponent(nameEnc) || "Utilizador";
    const userEmail = decodeURIComponent(emailEnc) || "";
    const section = decodeURIComponent(sectionEnc) || "Geral";

    const oldModal = document.getElementById("hexomel-reply-complaint-modal-overlay");
    if (oldModal) oldModal.remove();

    const defaultSubject = `Hexomel - Resposta à sua mensagem sobre a manutenção de ${section}`;
    const defaultMsg = `Olá ${userName},\n\nAgradecemos o seu contacto relativamente à manutenção da secção "${section}".\n\nInformamos que a nossa equipa está a trabalhar ativamente para concluir as melhorias e restabelecer o serviço o mais brevemente possível.\n\nCom os melhores cumprimentos,\nAdministração Hexomel`;

    const overlay = document.createElement("div");
    overlay.id = "hexomel-reply-complaint-modal-overlay";
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;";

    overlay.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #fef3c7; border-radius: 20px; max-width: 550px; width: 100%; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.2); text-align: left; position: relative;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; pb-3;">
          <h5 style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #1e293b; margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-paper-plane text-warning" style="color: #f59e0b;"></i> Responder a ${userName}
          </h5>
          <button type="button" id="reply-modal-close-btn" style="background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer;">&times;</button>
        </div>

        <div style="margin-bottom: 1rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.88rem; color: #334155;">
          <strong>Para:</strong> ${userEmail ? `<span class="text-primary">${userEmail}</span>` : '<span class="text-danger">Sem email registado</span>'}
        </div>

        <div style="margin-bottom: 1rem;">
          <label style="font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Assunto do Email:</label>
          <input type="text" id="reply-email-subject" value="${defaultSubject}" style="width: 100%; padding: 0.6rem 0.85rem; font-size: 0.9rem; border: 1px solid #cbd5e1; border-radius: 10px;" />
        </div>

        <div style="margin-bottom: 1.5rem;">
          <label style="font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block;">Mensagem de Resposta (Editável):</label>
          <textarea id="reply-email-body" rows="6" style="width: 100%; padding: 0.75rem; font-size: 0.9rem; border: 1px solid #cbd5e1; border-radius: 10px; line-height: 1.5; color: #1e293b; font-family: inherit;">${defaultMsg}</textarea>
        </div>

        <div id="reply-modal-status" style="margin-bottom: 1rem; font-size: 0.88rem; font-weight: 600; text-align: center;"></div>

        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button type="button" id="reply-modal-cancel-btn" class="btn btn-light rounded-pill px-4 fw-bold">Cancelar</button>
          <button type="button" id="reply-modal-send-btn" class="btn btn-warning rounded-pill px-4 fw-bold text-white" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none;">
            <i class="fas fa-paper-plane me-1.5"></i>Mandar Email de Resposta
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = document.getElementById("reply-modal-close-btn");
    const cancelBtn = document.getElementById("reply-modal-cancel-btn");
    const sendBtn = document.getElementById("reply-modal-send-btn");

    const closeModal = () => overlay.remove();
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (sendBtn) {
      sendBtn.onclick = async () => {
        const subjectVal = document.getElementById("reply-email-subject")?.value || "";
        const bodyVal = document.getElementById("reply-email-body")?.value || "";
        const statusEl = document.getElementById("reply-modal-status");

        if (!userEmail) {
          if (statusEl) { statusEl.style.color = "#dc2626"; statusEl.textContent = "❌ Este utilizador não tem um email válido para contacto."; }
          return;
        }
        if (!bodyVal.trim()) {
          if (statusEl) { statusEl.style.color = "#dc2626"; statusEl.textContent = "❌ Escreva uma mensagem para enviar."; }
          return;
        }

        if (statusEl) { statusEl.style.color = "#d97706"; statusEl.textContent = "A enviar email de resposta..."; }
        sendBtn.disabled = true;

        try {
          const res = await fetch("/api/admin/maintenance/reply-complaint", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              to_email: userEmail,
              user_name: userName,
              subject: subjectVal,
              message_body: bodyVal
            })
          });
          const data = await res.json();
          if (res.ok) {
            if (statusEl) { statusEl.style.color = "#059669"; statusEl.textContent = "✅ " + (data.message || "Email enviado!"); }
            setTimeout(() => closeModal(), 1500);
          } else {
            throw new Error(data.error || "Erro ao enviar resposta.");
          }
        } catch (err) {
          if (statusEl) { statusEl.style.color = "#dc2626"; statusEl.textContent = "❌ " + err.message; }
          sendBtn.disabled = false;
        }
      };
    }
  }

  async deleteMaintenanceComplaint(id) {
    const result = await Swal.fire({
      title: "Eliminar Mensagem?",
      text: "Tem a certeza que pretende eliminar esta mensagem? Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, Eliminar",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/maintenance/complaints/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${this.token}` }
      });
      if (res.ok) {
        Swal.fire({
          title: "Eliminada!",
          text: "A mensagem foi eliminada com sucesso.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        this.loadMaintenanceComplaints();
      } else {
        Swal.fire("Erro", "Erro ao eliminar mensagem.", "error");
      }
    } catch (e) {
      console.error("Error deleting complaint:", e);
      Swal.fire("Erro", "Ocorreu uma falha na comunicação.", "error");
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
        const totalRevenue = parseFloat(data.stats.totalRevenue) || 0;
        revenueEl.innerText = `${totalRevenue.toFixed(2)}€`;

        const commission = totalRevenue * (this.commissionRate / 100);
        const commEl = document.getElementById("dash-platform-commission");
        if (commEl) commEl.innerText = `${commission.toFixed(2)}€`;

        const gatewayCost = totalRevenue * (this.gatewayRate / 100);
        const balance = commission - gatewayCost;
        const balEl = document.getElementById("dash-platform-balance");
        const balIcon = document.getElementById("dash-platform-balance-icon");
        if (balEl) {
          balEl.innerText = `${balance.toFixed(2)}€`;
          if (balance < 0) {
            balEl.style.color = "#dc2626";
            if (balIcon) {
              balIcon.style.background = "#fef2f2";
              balIcon.style.color = "#dc2626";
            }
          } else {
            balEl.style.color = "#16a34a";
            if (balIcon) {
              balIcon.style.background = "#f0fdf4";
              balIcon.style.color = "#16a34a";
            }
          }
        }
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
    const {
      sales30d,
      distribution,
      ordersByStatus,
      topProducts,
      salesByBeekeeper,
      usersGrowth,
    } = data;

    // --- SHARED STYLING ---
    const goldenPalette = [
      "#f4b400", // Gold
      "#1c5236", // Green
      "#0284c7", // Blue
      "#9333ea", // Purple
      "#ef4444", // Red
      "#64748b", // Slate
      "#f97316", // Orange
      "#ec4899", // Pink
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
          labels:
            sales30d.length > 0
              ? sales30d.map((s) => new Date(s.date).toLocaleDateString())
              : ["Sem dados"],
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
                label: (context) => `Receita: ${context.parsed.y.toFixed(2)}€`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(0,0,0,0.03)", drawBorder: false },
              ticks: { callback: (value) => value + "€", maxTicksLimit: 5 },
            },
            x: { grid: { display: false }, ticks: { maxRotation: 0 } },
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
          datasets: [
            {
              data: distribution.map((d) => d.count),
              backgroundColor: goldenPalette,
              borderWidth: 0,
              hoverOffset: 15,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "75%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { usePointStyle: true, padding: 20 },
            },
          },
        },
      });
    }

    // 3. Orders by Status Chart (Doughnut)
    const statusCtx = document
      .getElementById("orderStatusChart")
      ?.getContext("2d");
    if (statusCtx) {
      if (this.statusChart) this.statusChart.destroy();
      this.statusChart = new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: ordersByStatus.map((o) => o.status),
          datasets: [
            {
              data: ordersByStatus.map((o) => o.count),
              backgroundColor: [
                "#fef08a",
                "#bbf7d0",
                "#bfdbfe",
                "#bae6fd",
                "#fecaca",
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true } },
          },
        },
      });
    }

    // 4. Users Growth Chart (Line)
    const growthCtx = document
      .getElementById("usersGrowthChart")
      ?.getContext("2d");
    if (growthCtx) {
      if (this.growthChart) this.growthChart.destroy();
      this.growthChart = new Chart(growthCtx, {
        type: "line",
        data: {
          labels: usersGrowth.map((u) => u.month),
          datasets: [
            {
              label: "Novos Utilizadores",
              data: usersGrowth.map((u) => u.count),
              borderColor: "#1c5236",
              backgroundColor: "rgba(28, 82, 54, 0.1)",
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    // 5. Top Products (Horizontal Bar)
    const topCtx = document
      .getElementById("topProductsChart")
      ?.getContext("2d");
    if (topCtx) {
      if (this.topChart) this.topChart.destroy();
      this.topChart = new Chart(topCtx, {
        type: "bar",
        data: {
          labels: topProducts.map((p) => p.name),
          datasets: [
            {
              label: "Receita",
              data: topProducts.map((p) => p.revenue),
              backgroundColor: "#f4b400",
              borderRadius: 8,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { callback: (v) => v + "€" } },
            y: { grid: { display: false } },
          },
        },
      });
    }

    // 6. Sales by Beekeeper (Bar)
    const beeCtx = document
      .getElementById("beekeeperSalesChart")
      ?.getContext("2d");
    if (beeCtx) {
      if (this.beeChart) this.beeChart.destroy();
      this.beeChart = new Chart(beeCtx, {
        type: "bar",
        data: {
          labels: salesByBeekeeper.map((b) => b.name),
          datasets: [
            {
              label: "Total de Vendas",
              data: salesByBeekeeper.map((b) => b.revenue),
              backgroundColor: "#1c5236",
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: (v) => v + "€" } },
            x: { grid: { display: false } },
          },
        },
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
      this.carouselProducts = [...this.products];
      this.renderProducts();
      this.renderCarouselProducts();
    } catch (error) {
      Swal.fire("Erro", "Não foi possível carregar os produtos.", "error");
    }
  }

  renderProducts() {
    const tableBody = document.getElementById("product-list-body");
    const gridBody = document.getElementById("product-grid-body");
    if (!tableBody || !gridBody) return;

    const currentView = localStorage.getItem("adminProductView") || "table";

    if (this.products.length === 0) {
      const emptyHtml = `<div class="col-12 text-center py-4 text-muted"><i class="fas fa-box-open fa-3x mb-3 d-block opacity-25"></i>Nenhum produto cadastrado.</div>`;
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Nenhum produto cadastrado.</td></tr>`;
      gridBody.innerHTML = emptyHtml;
      return;
    }

    if (currentView === "table") {
      tableBody.innerHTML = this.products
        .map((p) => {
          const category =
            this.categories?.find((c) => c.ID_Categoria === p.ID_Categoria)
              ?.Nome || `CAT ${p.ID_Categoria}`;
          return `
              <tr>
                  <td>
                      <div class="d-flex align-items-center gap-3">
                          <img src="${p.Imagem || "/images/wildflower.png"}" class="product-img-rounded" alt="${p.Nome}" style="width:48px; height:48px; object-fit:cover; border-radius:10px;">
                          <div>
                              <div class="fw-bold text-dark">${p.Nome}</div>
                              <div class="text-muted smaller">ID: #${p.ID_Produto}</div>
                          </div>
                      </div>
                  </td>
                  <td class="fw-bold text-dark">${parseFloat(p.Preco).toFixed(2)}€</td>
                  <td>
                      <span class="badge-premium ${p.Stock < 10 ? "badge-stock-low" : "badge-stock-ok"}" style="white-space: nowrap;">${p.Stock} UN</span>
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
                      <span class="badge-premium ${p.Status === "Pendente" ? "pendente" : p.Status === "Rejeitado" ? "rejeitado" : "aprovado"}" style="white-space: nowrap;">${p.Status || "Aprovado"}</span>
                  </td>
                  <td class="text-end">
                       <div class="d-flex gap-1 justify-content-end">
                           ${p.Status === "Pendente" ? `
                             <button class="btn-action-premium success" onclick="adminUI.updateProductStatus('${p.ID_Produto}', 'Aprovado')" title="Aprovar">
                                 <i class="fas fa-check" style="font-size: 0.8rem;"></i>
                             </button>
                             <button class="btn-action-premium delete" onclick="adminUI.updateProductStatus('${p.ID_Produto}', 'Rejeitado')" title="Rejeitar">
                                 <i class="fas fa-times" style="font-size: 0.8rem;"></i>
                             </button>
                           ` : `
                             <button class="btn-action-premium" onclick="adminUI.toggleProductFeatured('${p.ID_Produto}', ${p.Em_Destaque ? 0 : 1})" title="${p.Em_Destaque ? 'Remover Destaque' : 'Destacar'}">
                                 <i class="${p.Em_Destaque ? "fas fa-star text-warning" : "far fa-star text-muted"}" style="font-size: 0.85rem;"></i>
                             </button>
                             <button class="btn-action-premium" onclick="adminUI.editProduct('${p.ID_Produto}')" title="Editar">
                                 <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                             </button>
                             <button class="btn-action-premium delete" onclick="adminUI.deleteProduct('${p.ID_Produto}')" title="Eliminar">
                                 <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                             </button>
                           `}
                       </div>
                   </td>
              </tr>
          `;
        })
        .join("");
    } else {
      gridBody.innerHTML = this.products
        .map((p) => {
          const category =
            this.categories?.find((c) => c.ID_Categoria === p.ID_Categoria)
              ?.Nome || `CAT ${p.ID_Categoria}`;
          const origin =
            this.origins?.find((o) => o.ID_Origem === p.ID_Origem)
              ?.Nome || "N/A";
          let statusClass = "aprovado";
          if (p.Status === "Pendente") statusClass = "pendente";
          if (p.Status === "Rejeitado") statusClass = "rejeitado";

          return `
            <div class="col-sm-6 col-md-4">
              <div class="dash-product-card">
                <div class="dash-product-img-container">
                  <span class="badge-premium ${statusClass} dash-product-badge-status">${p.Status || "Aprovado"}</span>
                  <div class="dash-product-actions">
                    ${p.Status === "Pendente" ? `
                      <button class="btn-action-premium success" onclick="adminUI.updateProductStatus('${p.ID_Produto}', 'Aprovado')" title="Aprovar" style="width:28px; height:28px;">
                          <i class="fas fa-check" style="font-size: 0.7rem;"></i>
                      </button>
                      <button class="btn-action-premium delete" onclick="adminUI.updateProductStatus('${p.ID_Produto}', 'Rejeitado')" title="Rejeitar" style="width:28px; height:28px;">
                          <i class="fas fa-times" style="font-size: 0.7rem;"></i>
                      </button>
                    ` : `
                      <button class="btn-action-premium" onclick="adminUI.toggleProductFeatured('${p.ID_Produto}', ${p.Em_Destaque ? 0 : 1})" title="${p.Em_Destaque ? 'Remover Destaque' : 'Destacar'}" style="width:28px; height:28px;">
                          <i class="${p.Em_Destaque ? "fas fa-star text-warning" : "far fa-star text-muted"}" style="font-size: 0.75rem;"></i>
                      </button>
                      <button class="btn-action-premium" onclick="adminUI.editProduct('${p.ID_Produto}')" title="Editar" style="width:28px; height:28px;">
                          <i class="fas fa-pen" style="font-size: 0.75rem;"></i>
                      </button>
                      <button class="btn-action-premium delete" onclick="adminUI.deleteProduct('${p.ID_Produto}')" title="Eliminar" style="width:28px; height:28px;">
                          <i class="fas fa-trash" style="font-size: 0.75rem;"></i>
                      </button>
                    `}
                  </div>
                  <img src="${p.Imagem || "/images/wildflower.png"}" alt="${p.Nome}" class="img-fluid" style="max-height:160px; object-fit:contain;">
                </div>
                <div class="dash-product-body">
                  <div class="dash-product-title">${p.Nome}</div>
                  <div class="dash-product-meta">${category} • ${origin}</div>
                  <div class="dash-product-footer">
                    <span class="fw-bold text-success">${parseFloat(p.Preco).toFixed(2)}€</span>
                    <span class="badge bg-light text-dark border small fw-600">${p.Stock} UN</span>
                  </div>
                </div>
              </div>
            </div>`;
        })
        .join("");
    }
  }

  setupLayoutToggle() {
    const btnTable = document.getElementById("btn-view-table");
    const btnGrid = document.getElementById("btn-view-grid");

    if (!btnTable || !btnGrid) return;

    // Check local storage for preference
    const viewPreference = localStorage.getItem("adminProductView") || "table";
    this.setProductView(viewPreference);

    btnTable.addEventListener("click", () => {
      this.setProductView("table");
    });

    btnGrid.addEventListener("click", () => {
      this.setProductView("grid");
    });
  }

  setProductView(view) {
    const btnTable = document.getElementById("btn-view-table");
    const btnGrid = document.getElementById("btn-view-grid");
    const tableWrapper = document.getElementById("product-table-wrapper");
    const gridWrapper = document.getElementById("product-grid-wrapper");

    if (!btnTable || !btnGrid || !tableWrapper || !gridWrapper) return;

    const previousView = localStorage.getItem("adminProductView");
    localStorage.setItem("adminProductView", view);

    if (view === "table") {
      btnTable.classList.add("active");
      btnGrid.classList.remove("active");
      tableWrapper.classList.remove("d-none");
      gridWrapper.classList.add("d-none");

      // Apply transition layout animation if layout view was changed by the user
      if (previousView && previousView !== view) {
        tableWrapper.classList.remove("layout-anim-fade", "layout-anim-roda");
        void tableWrapper.offsetWidth; // Force layout recalculation/reflow
        tableWrapper.classList.add(`layout-anim-${this.layoutAnimationStyle || "fade"}`);
      }
    } else {
      btnTable.classList.remove("active");
      btnGrid.classList.add("active");
      tableWrapper.classList.add("d-none");
      gridWrapper.classList.remove("d-none");

      // Apply transition layout animation if layout view was changed by the user
      if (previousView && previousView !== view) {
        gridWrapper.classList.remove("layout-anim-fade", "layout-anim-roda");
        void gridWrapper.offsetWidth; // Force layout recalculation/reflow
        gridWrapper.classList.add(`layout-anim-${this.layoutAnimationStyle || "fade"}`);
      }
    }

    this.renderProducts();
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

    const filteredUsers = (this.users || []).filter((u) => u.UserType?.toLowerCase() !== "admin");

    if (filteredUsers.length === 0) {
      container.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Nenhum utilizador registado.</td></tr>`;
      return;
    }

    container.innerHTML = filteredUsers
      .map((u) => {
        const initials = u.Nome
          ? u.Nome.trim().split(/\s+/)
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .substring(0, 2)
          : "??";

        // Checkout 2FA Status Badge (static status indicator)
        const checkoutVerified = Boolean(Number(u.Checkout_Verified) === 1 || u.checkoutVerified === true || u.checkoutVerified === 1);
        let checkout2faBadge = "";
        
        if (checkoutVerified) {
          checkout2faBadge = `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1.5 small fw-semibold"><i class="fas fa-shield-alt me-1"></i>2FA Verificado</span>`;
        } else if (u.Checkout_OTP) {
          // Check if expired
          const expiresAt = new Date(u.Checkout_OTP_Expires);
          const isExpired = new Date() > expiresAt;
          const formattedTime = expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          if (isExpired) {
            checkout2faBadge = `<span class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill px-2.5 py-1.5 small fw-semibold d-inline-flex flex-column align-items-start gap-0.5"><span class="d-flex align-items-center"><i class="fas fa-hourglass-end me-1"></i>Código Expirado</span><span class="smaller opacity-75">Expirou às ${formattedTime}</span></span>`;
          } else {
            checkout2faBadge = `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2.5 py-1.5 small fw-semibold d-inline-flex flex-column align-items-start gap-0.5"><span class="d-flex align-items-center"><i class="fas fa-key me-1"></i>Código: <strong class="ms-1 font-monospace text-dark">${u.Checkout_OTP}</strong></span><span class="smaller opacity-75">Expira às ${formattedTime}</span></span>`;
          }
        } else {
          checkout2faBadge = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1.5 small fw-semibold"><i class="fas fa-exclamation-triangle me-1"></i>Requer 2FA</span>`;
        }

        // Restrito_Postar Status Badge (static status indicator)
        const isRestricted = Boolean(Number(u.Restrito_Postar) === 1 || u.restrictedToPost === true || u.restrictedToPost === 1);
        const restrictionBadge = isRestricted
          ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1.5 small fw-semibold"><i class="fas fa-ban me-1"></i>Restrito</span>`
          : `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1.5 small fw-semibold"><i class="fas fa-check me-1"></i>Ativo</span>`;

        const userPic = u.Picture && typeof u.Picture === 'string' && u.Picture.trim() !== '' && u.Picture !== 'null' && u.Picture !== 'undefined' ? u.Picture : null;
        const avatarDisplay = userPic 
          ? `<img src="${userPic}" class="rounded-circle" style="width:36px;height:36px;object-fit:cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${(u.Nome || 'Utilizador').replace(/'/g, "\\'")}') + '&background=1a4d2e&color=fff';">`
          : `<div class="user-avatar-bubble">${initials}</div>`;

        const isAccountVerified = Boolean(Number(u.Is_Verified) === 1 || u.isVerified === true || u.isVerified === 1 || u.Is_Verified === true);
        const warningIcon = !isAccountVerified 
          ? `<span class="custom-tooltip-wrapper">
               <i class="fas fa-exclamation-triangle text-danger" style="cursor: help;"></i>
               <span class="custom-tooltip-text">Conta não verificada: o utilizador ainda não confirmou o endereço de email de registo.</span>
             </span>`
          : "";

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        ${avatarDisplay}
                        <div>
                            <div class="fw-bold text-dark d-inline-flex align-items-center">${u.Nome}${warningIcon}</div>
                            <div class="small text-muted mb-0.5" style="font-size: 0.78rem;">@${u.Username || u.Email.split("@")[0]}</div>
                        </div>
                    </div>
                </td>
                <td><div class="small text-dark">${u.Email}</div></td>
                <td>
                    <select class="role-select role-select--${u.UserType || 'client'}" onchange="adminUI.updateUserRole('${u.ID_Cliente}', this.value)">
                        <option value="client" ${u.UserType === 'client' ? 'selected' : ''}>Cliente</option>
                        <option value="apicultor" ${u.UserType === 'apicultor' ? 'selected' : ''}>Apicultor</option>
                        <option value="admin" ${u.UserType === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="small text-muted">${u.Data_Resgistro ? new Date(u.Data_Resgistro).toLocaleDateString('pt-PT') : 'N/A'}</td>
                <td>${checkout2faBadge}</td>
                <td>${restrictionBadge}</td>
                <td class="text-end">
                    <button class="btn-action-premium info me-1" onclick="adminUI.sendEmailToUser('${(u.Email || '').replace(/'/g, "\\'")}', '${(u.Nome || '').replace(/'/g, "\\'")}')" title="Enviar Notificação por Email">
                        <i class="fas fa-envelope" style="font-size: 0.75rem;"></i>
                    </button>
                    <button class="btn-action-premium ${isRestricted ? 'success' : 'warning'} me-1" onclick="adminUI.toggleUserRestriction('${u.ID_Cliente}', ${isRestricted ? 'true' : 'false'})" title="${isRestricted ? 'Permitir Postagem (Desbloquear)' : 'Privar de Postar (Bloquear)'}">
                        <i class="fas ${isRestricted ? 'fa-check' : 'fa-ban'}" style="font-size: 0.75rem;"></i>
                    </button>
                    <button class="btn-action-premium delete" onclick="adminUI.deleteUser('${u.ID_Cliente}')" ${u.ID_Cliente === this.userData?.id || u.UserType?.toLowerCase() === "admin" ? "disabled" : ""} title="Eliminar utilizador">
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

  async toggleProductFeatured(id, emDestaque) {
    try {
      const response = await fetch(`${API_URL}/admin/products/${id}/featured`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ emDestaque }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar destaque do produto");
      Swal.fire({
        icon: "success",
        title: emDestaque ? "Produto Destacado" : "Destaque Removido",
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
      title: "Criar Utilizador",
      width: 620,
      html: `
        <div class="text-start">
          <label class="form-label small fw-bold text-uppercase text-muted">Nome</label>
          <input id="swal-user-name" class="form-control mb-3" placeholder="Nome completo">
          <label class="form-label small fw-bold text-uppercase text-muted">Email</label>
          <input id="swal-user-email" type="email" class="form-control mb-3" placeholder="email@exemplo.com">
          <label class="form-label small fw-bold text-uppercase text-muted">Username</label>
          <input id="swal-user-username" class="form-control mb-3" placeholder="utilizador">
          <label class="form-label small fw-bold text-uppercase text-muted">Password</label>
          <input id="swal-user-password" type="password" class="form-control mb-3" placeholder="Password temporária">
          <label class="form-label small fw-bold text-uppercase text-muted">Tipo</label>
          <select id="swal-user-type" class="form-select">
            <option value="client">Cliente</option>
            <option value="apicultor">Apicultor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Criar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const payload = {
          name: document.getElementById("swal-user-name").value.trim(),
          email: document.getElementById("swal-user-email").value.trim(),
          username: document.getElementById("swal-user-username").value.trim(),
          password: document.getElementById("swal-user-password").value,
          userType: document.getElementById("swal-user-type").value,
        };
        if (
          !payload.name ||
          !payload.email ||
          !payload.username ||
          !payload.password
        ) {
          Swal.showValidationMessage("Preenche todos os campos.");
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
      if (!response.ok)
        throw new Error(data.error || "Erro ao criar utilizador.");

      Swal.fire({
        icon: "success",
        title: "Utilizador criado!",
        timer: 1400,
        showConfirmButton: false,
      });
      await this.loadUsers();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteUser(id) {
    // If users lists aren't preloaded, fetch them first to do safety checks
    if (!this.users || this.users.length === 0) {
      try {
        const response = await fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (response.ok) {
          this.users = await response.json();
        }
      } catch (e) {
        console.error("Failed to preload users for delete safety check:", e);
      }
    }

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

        // Refresh moderation panel if active
        const moderacaoSection = document.getElementById("moderacao-section");
        if (moderacaoSection && moderacaoSection.classList.contains("active")) {
          await this.loadModerationData();
        }
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  async updateUserRole(id, userType) {
    // Immediately update the color class for instant visual feedback
    const selectEl = document.querySelector(
      `.role-select[onchange*="updateUserRole('${id}'"]`
    );
    if (selectEl) {
      selectEl.className = `role-select role-select--${userType}`;
    }
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

  async loadModerationData() {
    try {
      const [reportsRes, blocksRes] = await Promise.all([
        fetch(`${API_URL}/admin/reports`, { headers: { Authorization: `Bearer ${this.token}` } }),
        fetch(`${API_URL}/admin/blocks`, { headers: { Authorization: `Bearer ${this.token}` } })
      ]);

      if (!reportsRes.ok || !blocksRes.ok) throw new Error("Falha ao carregar dados de moderação");

      const reports = await reportsRes.json();
      const blocks = await blocksRes.json();

      this.renderReports(reports);
      this.renderBlocks(blocks);
    } catch (error) {
      console.error("Error loading moderation data:", error);
      Swal.fire("Erro", "Não foi possível carregar os dados de moderação.", "error");
    }
  }

  renderReports(reports) {
    const body = document.getElementById("moderacao-denuncias-body");
    if (!body) return;

    if (reports.length === 0) {
      body.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Nenhuma denúncia registada.</td></tr>`;
      return;
    }

    body.innerHTML = reports.map(r => {
      const date = new Date(r.Data_Denuncia).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const isResolved = r.Status === "Resolvido";
      const statusBadge = isResolved
        ? `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1.5 small fw-semibold"><i class="fas fa-check-circle me-1"></i>Resolvido</span>`
        : `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2.5 py-1.5 small fw-semibold"><i class="fas fa-exclamation-triangle me-1"></i>Pendente</span>`;

      const restrictBtn = r.DenunciadoRestrito
        ? `<button class="btn btn-sm btn-outline-success rounded-pill px-3 py-1 fw-semibold" style="font-size: 0.75rem;" onclick="adminUI.toggleUserRestriction('${r.ID_Denunciado}', true)" title="Permitir Postagem"><i class="fas fa-check me-1"></i>Permitir</button>`
        : `<button class="btn btn-sm rounded-pill px-3 py-1 fw-semibold" style="background-color: #fff8e1; color: #b45309; border: 1px solid #fef3c7; font-size: 0.75rem;" onclick="adminUI.toggleUserRestriction('${r.ID_Denunciado}', false)" title="Privar de Postar"><i class="fas fa-ban me-1"></i>Restringir</button>`;

      const resolveBtn = isResolved
        ? ""
        : `<button class="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-semibold" style="background-color: #1a4d2e; border-color: #1a4d2e; font-size: 0.75rem;" onclick="adminUI.resolveReport('${r.ID_Denuncia}')" title="Resolver"><i class="fas fa-check-double me-1"></i>Resolver</button>`;

      const emailBtn = `<button class="btn btn-sm btn-outline-info rounded-pill px-2.5 py-1 fw-semibold" style="font-size: 0.75rem;" onclick="adminUI.sendEmailToUser('${r.DenunciadoEmail}', '${r.DenunciadoNome ? r.DenunciadoNome.replace(/'/g, "\\'") : ''}')" title="Enviar Email ao Denunciado"><i class="fas fa-envelope me-1"></i>Email</button>`;
      const deleteBtn = `<button class="btn btn-sm btn-outline-danger rounded-pill px-2.5 py-1 fw-semibold" style="font-size: 0.75rem;" onclick="adminUI.deleteUser('${r.ID_Denunciado}')" title="Remover Conta"><i class="fas fa-user-minus"></i></button>`;

      return `
        <tr class="align-middle border-bottom">
          <td class="py-3">
            <div class="fw-bold text-dark" style="font-size: 0.88rem;">${r.DenuncianteNome}</div>
            <div class="smaller text-muted" style="font-size: 0.75rem;">${r.DenuncianteEmail}</div>
          </td>
          <td class="py-3">
            <div class="fw-bold text-dark" style="font-size: 0.88rem;">${r.DenunciadoNome}</div>
            <div class="smaller text-muted" style="font-size: 0.75rem;">${r.DenunciadoEmail}</div>
            ${r.DenunciadoRestrito ? '<span class="badge bg-danger-subtle text-danger px-2 py-0.5 mt-1 small" style="font-size:0.7rem">Restrito</span>' : ''}
          </td>
          <td class="py-3"><span class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill px-2.5 py-1 small fw-semibold" style="font-size: 0.72rem;">${r.Tipo_Item}</span></td>
          <td class="py-3">
            <div class="small text-dark text-wrap" style="max-width: 220px; word-break: break-word; font-size: 0.82rem;">
              ${r.Texto_Item || '<span class="text-muted italic">(sem conteúdo textual)</span>'}
            </div>
            <div class="smaller text-muted mt-0.5" style="font-size: 0.7rem;">ID Item: #${r.ID_Item}</div>
          </td>
          <td class="py-3"><div class="small text-dark text-wrap" style="max-width: 140px; word-break: break-word; font-size: 0.82rem;">${r.Motivo}</div></td>
          <td class="py-3 smaller text-muted" style="font-size: 0.78rem; white-space: nowrap;">${date}</td>
          <td class="py-3" style="white-space: nowrap;">${statusBadge}</td>
          <td class="py-3 text-end" style="white-space: nowrap;">
            <div class="d-flex justify-content-end align-items-center gap-1.5">
              ${resolveBtn}
              ${restrictBtn}
              ${emailBtn}
              ${deleteBtn}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  renderBlocks(blocks) {
    const body = document.getElementById("moderacao-bloqueios-body");
    if (!body) return;

    if (blocks.length === 0) {
      body.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Nenhum bloqueio registado.</td></tr>`;
      return;
    }

    body.innerHTML = blocks.map(b => {
      const date = new Date(b.Data_Bloqueio).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <tr class="align-middle border-bottom">
          <td class="py-3">
            <div class="fw-bold text-dark" style="font-size: 0.88rem;">${b.BloqueadorNome}</div>
            <div class="smaller text-muted" style="font-size: 0.75rem;">${b.BloqueadorEmail} (ID: #${b.ID_Bloqueador})</div>
          </td>
          <td class="py-3">
            <div class="fw-bold text-dark" style="font-size: 0.88rem;">${b.BloqueadoNome}</div>
            <div class="smaller text-muted" style="font-size: 0.75rem;">${b.BloqueadoEmail} (ID: #${b.ID_Bloqueado})</div>
          </td>
          <td class="py-3 smaller text-muted" style="font-size: 0.78rem; white-space: nowrap;">${date}</td>
        </tr>
      `;
    }).join("");
  }

  async resolveReport(reportId) {
    try {
      const response = await fetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!response.ok) throw new Error("Erro ao resolver denúncia.");
      const result = await response.json();
      Swal.fire({
        icon: "success",
        title: "Sucesso",
        text: result.message,
        timer: 1500,
        showConfirmButton: false
      });
      await this.loadModerationData();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async toggleUserRestriction(id, isCurrentlyRestricted) {
    const isRestrictedBool = isCurrentlyRestricted === true || isCurrentlyRestricted === 1 || isCurrentlyRestricted === "1" || isCurrentlyRestricted === "true";
    const newValue = isRestrictedBool ? 0 : 1;
    const statusText = newValue ? "Restrito (bloqueado de postar/enviar mensagens)" : "Ativo (permissão concedida)";

    const userObj = Array.isArray(this.users) ? this.users.find((u) => String(u.ID_Cliente) === String(id)) : null;
    const oldRestrito = userObj ? userObj.Restrito_Postar : null;
    if (userObj) {
      userObj.Restrito_Postar = newValue;
      userObj.restrictedToPost = newValue;
      this.renderUsers();
    }

    try {
      const response = await fetch(`${API_URL}/admin/users/${id}/restrict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ restrict: newValue === 1 }),
      });

      if (!response.ok) {
        let errText = "Erro ao atualizar restrição.";
        try {
          const err = await response.json();
          if (err && err.error) errText = err.error;
        } catch (e) {}
        throw new Error(errText);
      }

      Swal.fire({
        icon: "success",
        title: "Estado de Restrição Atualizado",
        text: `Utilizador agora está ${statusText}.`,
        timer: 1500,
        showConfirmButton: false,
      });

      const moderacaoSection = document.getElementById("moderacao-section");
      if (moderacaoSection && moderacaoSection.classList.contains("active") && typeof this.loadModerationData === "function") {
        this.loadModerationData();
      }
      const comunidadeSection = document.getElementById("comunidade-section");
      if (comunidadeSection && comunidadeSection.classList.contains("active") && typeof this.loadComunidade === "function") {
        this.loadComunidade();
      }
    } catch (error) {
      if (userObj && oldRestrito !== null) {
        userObj.Restrito_Postar = oldRestrito;
        userObj.restrictedToPost = oldRestrito;
        this.renderUsers();
      }
      Swal.fire("Erro", error.message, "error");
    }
  }

  async sendEmailToUser(toEmail, toName) {
    if (!toEmail) {
      Swal.fire("Erro", "Este utilizador não possui um endereço de email válido.", "error");
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: `<span style="color:#1a4d2e;"><i class="fas fa-paper-plane me-2"></i>Enviar Notificação por Email</span>`,
      html: `
        <div class="text-start mb-3">
          <label class="form-label fw-bold small text-muted">Destinatário</label>
          <input id="swal-email-to" class="form-control bg-light" value="${toName || 'Utilizador'} <${toEmail}>" readonly>
        </div>
        <div class="text-start mb-3">
          <label class="form-label fw-bold small text-muted">Assunto</label>
          <input id="swal-email-subject" class="form-control" value="Notificação de Moderação — Hexomel">
        </div>
        <div class="text-start mb-2">
          <label class="form-label fw-bold small text-muted">Mensagem</label>
          <textarea id="swal-email-msg" class="form-control" rows="4" placeholder="Escreva a mensagem para o utilizador...">Informamos que o seu conteúdo publicado no Hexomel foi analisado pela nossa equipa de moderação na sequência de uma denúncia.</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Enviar Email',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1a4d2e',
      focusConfirm: false,
      preConfirm: () => {
        const subject = document.getElementById('swal-email-subject').value.trim();
        const message = document.getElementById('swal-email-msg').value.trim();
        if (!message) {
          Swal.showValidationMessage('Escreva uma mensagem para enviar.');
          return false;
        }
        return { subject, message };
      }
    });

    if (formValues) {
      try {
        Swal.fire({
          title: "A enviar email...",
          text: "Por favor aguarde um momento.",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const res = await fetch(`${API_URL}/admin/send-user-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            toEmail,
            toName,
            subject: formValues.subject,
            message: formValues.message
          })
        });

        let data = {};
        try { data = await res.json(); } catch (e) {}
        if (!res.ok) throw new Error(data.error || "Erro ao enviar email.");

        Swal.fire("Enviado!", data.message || "Email enviado com sucesso.", "success");
      } catch (err) {
        Swal.fire("Erro", err.message, "error");
      }
    }
  }

  async toggleUserVerification(id, field, currentValue) {
    const isCurrentlyVerified = currentValue === true || currentValue === 1 || currentValue === "1" || currentValue === "true";
    const newValue = isCurrentlyVerified ? 0 : 1;

    // Optimistic update for seamless automatic feedback without popup
    const userObj = Array.isArray(this.users) ? this.users.find((u) => String(u.ID_Cliente) === String(id)) : null;
    const oldVerified = userObj ? (userObj.Checkout_Verified !== undefined ? userObj.Checkout_Verified : userObj.checkoutVerified) : null;
    if (userObj) {
      if (field === "checkoutVerified") {
        userObj.Checkout_Verified = newValue;
        userObj.checkoutVerified = newValue;
        if (newValue === 1) {
          userObj.Checkout_OTP = null;
        }
      } else if (field === "isVerified") {
        userObj.Is_Verified = newValue;
        userObj.isVerified = newValue;
      }
      userObj[field] = newValue;
      this.renderUsers();
    }

    try {
      const body = {};
      body[field] = newValue;
      if (field === "checkoutVerified") {
        body.Checkout_Verified = newValue;
        body.checkoutVerified = newValue;
      } else if (field === "isVerified") {
        body.Is_Verified = newValue;
        body.isVerified = newValue;
      }

      const response = await fetch(`${API_URL}/admin/users/${id}/verification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errText = "Erro ao atualizar estado de verificação.";
        try {
          const err = await response.json();
          if (err && err.error) errText = err.error;
        } catch (e) {}
        console.error("Verification toggle server warning:", errText);
      }
    } catch (error) {
      console.error("Verification toggle network error:", error);
      if (userObj && oldVerified !== null) {
        if (field === "checkoutVerified") {
          userObj.Checkout_Verified = oldVerified;
          userObj.checkoutVerified = oldVerified;
        }
        this.renderUsers();
      }
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
    const destaqueInput = document.getElementById("prod-destaque");
    if (destaqueInput) destaqueInput.checked = false;

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

    const destaqueInput = document.getElementById("prod-destaque");
    if (destaqueInput) destaqueInput.checked = Boolean(p.Em_Destaque);

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
    const emDestaque = document.getElementById("prod-destaque")?.checked ? 1 : 0;

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
          emDestaque,
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
      if (!response.ok)
        throw new Error("Falha ao carregar pedidos de Apicultor");
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
        const initials = r.ClienteNome
          ? r.ClienteNome.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .substring(0, 2)
          : "??";
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
        const response = await fetch(
          `${API_URL}/admin/upgrade-requests/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ status }),
          },
        );

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
        const statusClass = w.Status
          ? w.Status.toLowerCase().replace(" ", "-")
          : "pendente";

        return `
            <tr>
                <td><div class="fw-bold text-dark text-wrap" style="max-width:250px;">${w.Titulo}</div></td>
                <td><div class="small text-muted">${apicultorNome}</div></td>
                <td>
                    <div class="small text-muted mb-1"><i class="far fa-calendar-alt me-1"></i>${new Date(w.Data_Realizacao).toLocaleDateString()}</div>
                    <div class="small text-muted"><i class="fas fa-users me-1"></i>${w.Vagas} vagas</div>
                </td>
                <td class="fw-bold text-dark">${parseFloat(w.Preco).toFixed(2)}€</td>
                <td><span class="badge-premium ${statusClass}">${w.Status || "Pendente"}</span></td>
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
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(
          `${API_URL}/admin/workshops/${id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.token}`,
            },
            body: JSON.stringify({ status }),
          },
        );

        if (!response.ok) throw new Error("Erro ao processar workshop");

        Swal.fire(
          "Sucesso",
          `Workshop ${status.toLowerCase()} com sucesso!`,
          "success",
        );
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
        topClicks = [],
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
        pagesBody.innerHTML =
          byPage.length === 0
            ? `<tr><td colspan="2" class="text-center text-muted py-3">Sem dados ainda.</td></tr>`
            : byPage
                .map(
                  (p) => `
              <tr>
                <td><i class="fas fa-file-alt me-2 text-muted" style="font-size:0.8rem"></i>${p.pagina}</td>
                <td class="text-end fw-bold">${p.count}</td>
              </tr>`,
                )
                .join("");
      }

      const palette = [
        "#f4b400",
        "#1c5236",
        "#0284c7",
        "#9333ea",
        "#ef4444",
        "#f97316",
        "#ec4899",
        "#64748b",
      ];

      // Chart: Events per Day
      const perDayCtx = document
        .getElementById("intPerDayChart")
        ?.getContext("2d");
      if (perDayCtx) {
        if (this.intPerDayChart) this.intPerDayChart.destroy();
        const gradient = perDayCtx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, "rgba(28,82,54,0.3)");
        gradient.addColorStop(1, "rgba(28,82,54,0)");
        this.intPerDayChart = new Chart(perDayCtx, {
          type: "line",
          data: {
            labels: perDay.map((d) =>
              new Date(d.dia).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "short",
              }),
            ),
            datasets: [
              {
                label: "Eventos",
                data: perDay.map((d) => d.total),
                borderColor: "#1c5236",
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(0,0,0,0.03)" },
                ticks: { stepSize: 1 },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }

      // Chart: Events by Type (Doughnut)
      const byTypeCtx = document
        .getElementById("intByTypeChart")
        ?.getContext("2d");
      if (byTypeCtx) {
        if (this.intByTypeChart) this.intByTypeChart.destroy();
        const typeLabels = {
          page_view: "Visita Página",
          product_view: "Viu Produto",
          add_to_cart: "Add Carrinho",
          checkout_start: "Checkout",
          search: "Pesquisa",
        };
        this.intByTypeChart = new Chart(byTypeCtx, {
          type: "doughnut",
          data: {
            labels: byType.map((t) => typeLabels[t.tipo] || t.tipo),
            datasets: [
              {
                data: byType.map((t) => t.count),
                backgroundColor: palette,
                borderWidth: 0,
                hoverOffset: 12,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  usePointStyle: true,
                  padding: 16,
                  font: { size: 11 },
                },
              },
            },
          },
        });
      }

      // Chart: Top Viewed Products (horizontal bar)
      const viewCtx = document
        .getElementById("intTopViewedChart")
        ?.getContext("2d");
      if (viewCtx) {
        if (this.intTopViewedChart) this.intTopViewedChart.destroy();
        this.intTopViewedChart = new Chart(viewCtx, {
          type: "bar",
          data: {
            labels: topViewed.map((p) => p.nome || `Produto ${p.id}`),
            datasets: [
              {
                label: "Visualizações",
                data: topViewed.map((p) => p.views),
                backgroundColor: "#f4b400",
                borderRadius: 8,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { stepSize: 1 } },
              y: { grid: { display: false } },
            },
          },
        });
      }

      // Chart: Top Add-to-Cart Products (horizontal bar)
      const cartCtx = document
        .getElementById("intTopCartChart")
        ?.getContext("2d");
      if (cartCtx) {
        if (this.intTopCartChart) this.intTopCartChart.destroy();
        this.intTopCartChart = new Chart(cartCtx, {
          type: "bar",
          data: {
            labels: topCart.map((p) => p.nome || `Produto ${p.id}`),
            datasets: [
              {
                label: "Adds ao Carrinho",
                data: topCart.map((p) => p.adds),
                backgroundColor: "#1c5236",
                borderRadius: 8,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { stepSize: 1 } },
              y: { grid: { display: false } },
            },
          },
        });
      }

      // 1. NEW: Search Queries Table
      const searchesBody = document.getElementById("int-searches-body");
      if (searchesBody) {
        searchesBody.innerHTML =
          !topSearches || topSearches.length === 0
            ? `<tr><td colspan="2" class="text-center text-muted py-3">Sem pesquisas capturadas.</td></tr>`
            : topSearches
                .map(
                  (s) => `
              <tr>
                <td class="fw-bold"><i class="fas fa-search me-2 text-muted small"></i>${s.termo}</td>
                <td class="text-end"><span class="badge bg-light text-dark border">${s.count}</span></td>
              </tr>`,
                )
                .join("");
      }

      // 2. NEW: Top Clicks Chart (Horizontal Bar)
      const clickCtx = document
        .getElementById("intTopClicksChart")
        ?.getContext("2d");
      if (clickCtx) {
        if (this.intTopClicksChart) this.intTopClicksChart.destroy();
        this.intTopClicksChart = new Chart(clickCtx, {
          type: "bar",
          data: {
            labels: topClicks.map((c) =>
              c.label.length > 25 ? c.label.substring(0, 25) + "..." : c.label,
            ),
            datasets: [
              {
                label: "Cliques",
                data: topClicks.map((c) => c.clicks),
                backgroundColor: "rgba(244, 180, 0, 0.7)",
                borderColor: "#f4b400",
                borderWidth: 1,
                borderRadius: 4,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  afterLabel: (context) => {
                    const item = topClicks[context.dataIndex];
                    return `Elemento: <${item.element}>`;
                  },
                },
              },
            },
            scales: {
              x: { ticks: { stepSize: 1 } },
              y: { grid: { display: false } },
            },
          },
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

      container.innerHTML = slugs
        .map(
          (s) => `
        <tr>
          <td class="fw-bold">${pageLabels[s.Pagina] || s.Pagina}</td>
          <td>
            <input type="text" class="form-control form-control-sm" 
                   value="${s.Slug || ""}" 
                   data-pagina="${s.Pagina}" 
                   data-field="slug"
                   style="border-radius:8px; font-family:monospace; font-size:0.85rem;">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" 
                   value="${s.Titulo_SEO || ""}" 
                   data-pagina="${s.Pagina}" 
                   data-field="titulo"
                   style="border-radius:8px; font-size:0.85rem;" 
                   placeholder="Título da página">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" 
                   value="${s.Descricao_SEO || ""}" 
                   data-pagina="${s.Pagina}" 
                   data-field="descricao"
                   style="border-radius:8px; font-size:0.85rem;" 
                   placeholder="Meta descrição">
          </td>
        </tr>
      `,
        )
        .join("");
    } catch (err) {
      console.error("Load site slugs error", err);
    }
  }

  async saveSiteSlugs() {
    const rows = document.querySelectorAll("#site-slugs-body tr");
    const slugs = [];
    rows.forEach((row) => {
      const pagina = row
        .querySelector('[data-field="slug"]')
        ?.getAttribute("data-pagina");
      const slug = row.querySelector('[data-field="slug"]')?.value;
      const titulo_seo = row.querySelector('[data-field="titulo"]')?.value;
      const descricao_seo = row.querySelector(
        '[data-field="descricao"]',
      )?.value;
      if (pagina) slugs.push({ pagina, slug, titulo_seo, descricao_seo });
    });

    try {
      const res = await fetch(`${API_URL}/admin/site-slugs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ slugs }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao guardar");
      }
      Swal.fire({
        icon: "success",
        title: "Guardado!",
        text: "Slugs do site atualizados.",
        timer: 1500,
        showConfirmButton: false,
      });
      this.loadSiteSlugs();
      if (typeof window.loadSiteSlugsCache === "function") {
        window.loadSiteSlugsCache();
      }
    } catch (err) {
      Swal.fire("Erro", err.message, "error");
    }
  }

  async downloadSitemap() {
    try {
      Swal.fire({
        title: "A gerar sitemap...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // 1. Fetch data
      const [siteRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/site-slugs`),
        fetch(`${API_URL}/admin/products`, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      ]);

      if (!siteRes.ok || !prodRes.ok)
        throw new Error("Falha ao obter dados para o sitemap");

      const sitePages = await siteRes.json();
      const products = await prodRes.json();

      // 2. Build XML
      const baseUrl = window.location.origin;
      const date = new Date().toISOString().split("T")[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Add site pages
      sitePages.forEach((p) => {
        const publicPath = p.Pagina === "inicio" ? "" : p.Slug || p.Pagina;
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${publicPath}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <priority>${p.Pagina === "inicio" ? "1.0" : "0.8"}</priority>\n`;
        xml += `  </url>\n`;
      });

      // Add product pages
      products.forEach((p) => {
        if (p.Slug) {
          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/produto/${p.Slug}</loc>\n`;
          xml += `    <lastmod>${date}</lastmod>\n`;
          xml += `    <priority>0.6</priority>\n`;
          xml += `  </url>\n`;
        }
      });

      xml += `</urlset>`;

      // 3. Trigger Download
      const blob = new Blob([xml], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sitemap.xml";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      Swal.fire({
        icon: "success",
        title: "Sitemap Gerado!",
        text: "O ficheiro sitemap.xml foi descarregado com sucesso.",
        timer: 2000,
        showConfirmButton: false,
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
        container.innerHTML =
          '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum produto encontrado.</td></tr>';
        return;
      }

      container.innerHTML = this.products
        .map(
          (p) => `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${p.Imagem || "/images/wildflower.png"}" class="product-img-rounded" alt="${p.Nome}" style="width:32px;height:32px;object-fit:cover;border-radius:8px;">
              <span class="fw-bold small">${p.Nome}</span>
            </div>
          </td>
          <td>
            <code style="background:#f1f5f9; padding:4px 10px; border-radius:6px; font-size:0.82rem; color:#475569;">${p.Slug || "—"}</code>
          </td>
          <td>
            ${
              p.Slug
                ? `<a href="/produto/${p.Slug}" target="_blank" class="small text-decoration-none" style="color:var(--primary-green);">
              <i class="fas fa-external-link-alt me-1"></i>/produto/${p.Slug}
            </a>`
                : '<span class="text-muted small">—</span>'
            }
          </td>
          <td class="text-end">
            <button class="btn-action-premium" onclick="adminUI.editProductSlug('${p.ID_Produto}', '${(p.Slug || "").replace(/'/g, "\\'")}')"
                    title="Editar Slug">
              <i class="fas fa-pen" style="font-size: 0.75rem;"></i>
            </button>
          </td>
        </tr>
      `,
        )
        .join("");
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ slug: newSlug }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao atualizar slug");
      }

      const data = await res.json();
      Swal.fire({
        icon: "success",
        title: "Slug Atualizado!",
        text: `Novo slug: ${data.slug}`,
        timer: 2000,
        showConfirmButton: false,
      });

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

  selectAnimationStyle(animStyle) {
    const hiddenInput = document.getElementById("app-layout-animation-style");
    if (hiddenInput) {
      hiddenInput.value = animStyle;
    }

    const optFade = document.getElementById("opt-anim-fade");
    const optRoda = document.getElementById("opt-anim-roda");

    if (animStyle === "roda") {
      optFade?.classList.remove("active");
      optRoda?.classList.add("active");
    } else {
      optRoda?.classList.remove("active");
      optFade?.classList.add("active");
    }
  }

  async loadAppearanceSettings() {
    try {
      const res = await fetch(`${API_URL}/site-settings`);
      if (!res.ok) throw new Error("Falha ao carregar definições de aparência");
      const settings = await res.json();

      const style = settings.placeholder_style || "skeleton";
      const placeholderStyleEl = document.getElementById(
        "app-placeholder-style",
      );
      if (placeholderStyleEl) placeholderStyleEl.value = style;

      // Update active UI cards state
      this.selectLoadingStyle(style);

      // Animation style
      const animStyle = settings.layout_animation_style || "fade";
      const animStyleEl = document.getElementById("app-layout-animation-style");
      if (animStyleEl) animStyleEl.value = animStyle;
      this.selectAnimationStyle(animStyle);

      this.layoutAnimationStyle = animStyle;
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Erro",
        "Não foi possível carregar as definições de aparência.",
        "error",
      );
    }
  }

  async saveAppearanceSettings() {
    try {
      const settings = {
        placeholder_style:
          document.getElementById("app-placeholder-style")?.value || "skeleton",
        layout_animation_style:
          document.getElementById("app-layout-animation-style")?.value || "fade",
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

      // Update local state
      this.layoutAnimationStyle = settings.layout_animation_style;

      Swal.fire({
        icon: "success",
        title: "Definições Guardadas!",
        text: "As alterações de aparência foram guardadas com sucesso.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Erro",
        "Não foi possível guardar as definições de aparência.",
        "error",
      );
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

    container.innerHTML = this.quizQuestions
      .map((q) => {
        const optionsHtml = [q.Opcao1, q.Opcao2, q.Opcao3, q.Opcao4]
          .map((opt, i) => {
            const isCorrect = i === q.Resposta_Correta;
            return `<div style="${isCorrect ? "font-weight:bold;color:var(--primary-green)" : ""}">
          ${isCorrect ? '<i class="fas fa-check-circle me-1"></i>' : '<i class="far fa-circle me-1 text-muted"></i>'}
          ${opt}
        </div>`;
          })
          .join("");

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
      })
      .join("");
  }

  resetQuizForm() {
    document.getElementById("quizForm").reset();
    document.getElementById("quizId").value = "";
    document.getElementById("quizModalLabel").innerText =
      "Adicionar Nova Pergunta";
  }

  editQuizQuestion(id) {
    const q = this.quizQuestions.find((x) => x.ID_Pergunta === id);
    if (!q) return;

    document.getElementById("quizId").value = q.ID_Pergunta;
    document.getElementById("quizQuestion").value = q.Pergunta;
    document.getElementById("quizOpt1").value = q.Opcao1;
    document.getElementById("quizOpt2").value = q.Opcao2;
    document.getElementById("quizOpt3").value = q.Opcao3;
    document.getElementById("quizOpt4").value = q.Opcao4;
    document.getElementById("quizCorrectOpt").value = q.Resposta_Correta;
    document.getElementById("quizExplanation").value = q.Explicacao;
    document.getElementById("quizModalLabel").innerText =
      "Editar Pergunta #" + id;

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
      resposta_correta: parseInt(
        document.getElementById("quizCorrectOpt").value,
        10,
      ),
      explicacao: document.getElementById("quizExplanation").value,
    };

    if (
      !body.pergunta ||
      !body.opcao1 ||
      !body.opcao2 ||
      !body.opcao3 ||
      !body.opcao4 ||
      !body.explicacao
    ) {
      Swal.fire("Erro", "Preencha todos os campos obrigatórios.", "warning");
      return;
    }

    const isEditing = !!id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${API_URL}/quiz/perguntas/${id}`
      : `${API_URL}/quiz/perguntas`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Falha ao guardar pergunta");

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("quizModal"),
      );
      if (modal) modal.hide();

      Swal.fire({
        icon: "success",
        title: "Pergunta Guardada",
        timer: 1500,
        showConfirmButton: false,
      });
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
      confirmButtonText: "Sim, apagar!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/quiz/perguntas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao apagar");
        Swal.fire({
          icon: "success",
          title: "Apagada",
          timer: 1000,
          showConfirmButton: false,
        });
        this.loadQuizQuestions();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }



  // --- APRENDER FACTS MANAGEMENT ---
  async loadFacts() {
    try {
      const response = await fetch(`${API_URL}/aprender/factos`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar os factos.");
      this.facts = await response.json();
      this.renderFactsTable();
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar os factos.", "error");
    }
  }

  async uploadFactIcon(inputEl, targetInputId) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const file = inputEl.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      Swal.fire({
        title: "A carregar ícone...",
        text: "Aguarde um momento",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Falha no envio do ficheiro.");
      const data = await response.json();
      const targetInput = document.getElementById(targetInputId);
      if (targetInput) targetInput.value = data.url;

      Swal.fire({
        icon: "success",
        title: "Ícone Carregado!",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Erro", error.message || "Não foi possível carregar a imagem.", "error");
    } finally {
      inputEl.value = "";
    }
  }

  renderFactsTable() {
    const container = document.getElementById("factos-list-body");
    if (!container) return;

    if (!this.facts || this.facts.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum facto registado.</td></tr>`;
      return;
    }

    const renderIconBadge = (icon) => {
      if (!icon) return '';
      if (icon.startsWith('/uploads/') || icon.startsWith('uploads/') || icon.startsWith('http') || icon.startsWith('data:')) {
        const src = icon.startsWith('uploads/') ? '/' + icon : icon;
        return `<span class="badge bg-light text-dark"><img src="${src}" style="width:18px;height:18px;object-fit:contain;" class="me-1" /> ${icon.split('/').pop()}</span>`;
      }
      return `<span class="badge bg-light text-dark"><i class="${icon} me-1"></i> ${icon}</span>`;
    };

    container.innerHTML = this.facts
      .map(
        (f) => `
        <tr>
          <td class="fw-bold text-muted">#${f.ID_Facto}</td>
          <td class="fw-bold text-dark">${f.Titulo}</td>
          <td>${renderIconBadge(f.Icon_Frente)}</td>
          <td>${renderIconBadge(f.Icon_Verso)}</td>
          <td><div class="small text-muted" style="max-height: 60px; overflow-y: auto;">${f.Conteudo_Verso}</div></td>
          <td class="text-end">
            <div class="d-flex align-items-center justify-content-end gap-1.5" style="white-space:nowrap;">
              <button class="btn-action-premium me-1" onclick="adminUI.editFact(${f.ID_Facto})" title="Editar">
                <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
              </button>
              <button class="btn-action-premium delete" onclick="adminUI.deleteFact(${f.ID_Facto})" title="Eliminar">
                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  }

  resetFactForm() {
    const form = document.getElementById("factForm");
    if (form) form.reset();
    const idField = document.getElementById("factId");
    if (idField) idField.value = "";
    const labelField = document.getElementById("factModalLabel");
    if (labelField) labelField.innerText = "Adicionar Novo Facto";
  }

  editFact(id) {
    const f = this.facts.find((x) => x.ID_Facto === id);
    if (!f) return;

    const idField = document.getElementById("factId");
    if (idField) idField.value = f.ID_Facto;
    const titleField = document.getElementById("factTitle");
    if (titleField) titleField.value = f.Titulo;
    const iconFrontField = document.getElementById("factIconFront");
    if (iconFrontField) iconFrontField.value = f.Icon_Frente;
    const iconBackField = document.getElementById("factIconBack");
    if (iconBackField) iconBackField.value = f.Icon_Verso;
    const contentBackField = document.getElementById("factContentBack");
    if (contentBackField) contentBackField.value = f.Conteudo_Verso;

    const labelField = document.getElementById("factModalLabel");
    if (labelField) labelField.innerText = "Editar Facto #" + id;

    const modal = new bootstrap.Modal(document.getElementById("factModal"));
    modal.show();
  }

  async saveFact() {
    const id = document.getElementById("factId").value;
    const body = {
      titulo: document.getElementById("factTitle").value,
      icon_frente: document.getElementById("factIconFront").value,
      icon_verso: document.getElementById("factIconBack").value,
      conteudo_verso: document.getElementById("factContentBack").value,
    };

    if (!body.titulo || !body.icon_frente || !body.icon_verso || !body.conteudo_verso) {
      Swal.fire("Erro", "Preencha todos os campos obrigatórios.", "warning");
      return;
    }

    const isEditing = !!id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${API_URL}/aprender/factos/${id}`
      : `${API_URL}/aprender/factos`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Falha ao guardar facto.");

      const modalEl = document.getElementById("factModal");
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      if (modal) modal.hide();

      Swal.fire({
        icon: "success",
        title: "Facto Guardado",
        timer: 1500,
        showConfirmButton: false,
      });
      this.loadFacts();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteFact(id) {
    const result = await Swal.fire({
      title: "Remover Facto?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, remover!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/aprender/factos/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Falha ao remover facto.");
        Swal.fire({
          icon: "success",
          title: "Facto Removido",
          timer: 1500,
          showConfirmButton: false,
        });
        this.loadFacts();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // --- APRENDER GLOSSARY MANAGEMENT ---
  async loadGlossaryTerms() {
    try {
      const response = await fetch(`${API_URL}/aprender/glossario`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar o glossário.");
      this.glossaryTerms = await response.json();
      this.renderGlossaryTerms();
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar o glossário.", "error");
    }
  }

  renderGlossaryTerms() {
    const container = document.getElementById("glossario-list-body");
    if (!container) return;

    if (!this.glossaryTerms || this.glossaryTerms.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum termo registado.</td></tr>`;
      return;
    }

    const catLabels = {
      substance: "Substâncias",
      hive: "A Colmeia",
      process: "Processos",
      equipment: "Equipamentos"
    };

    const renderIconBadge = (icon) => {
      if (!icon) return '';
      if (icon.startsWith('/uploads/') || icon.startsWith('uploads/') || icon.startsWith('http') || icon.startsWith('data:')) {
        const src = icon.startsWith('uploads/') ? '/' + icon : icon;
        return `<span class="badge bg-light text-dark"><img src="${src}" style="width:18px;height:18px;object-fit:contain;" class="me-1" /> ${icon.split('/').pop()}</span>`;
      }
      return `<span class="badge bg-light text-dark"><i class="${icon} me-1"></i> ${icon}</span>`;
    };

    container.innerHTML = this.glossaryTerms
      .map((g) => {
        const categoryLabel = catLabels[g.Categoria] || g.Categoria;
        return `
        <tr>
            <td class="fw-bold text-muted">#${g.ID_Glossario}</td>
            <td class="fw-bold text-dark">${g.Termo}</td>
            <td><div class="small text-muted" style="max-height: 60px; overflow-y: auto;">${g.Definicao}</div></td>
            <td>${renderIconBadge(g.Icon)}</td>
            <td><span class="badge bg-secondary text-uppercase" style="font-size:0.7rem;">${categoryLabel}</span></td>
            <td class="text-end">
                <button class="btn-action-premium me-1" onclick="adminUI.editGlossaryTerm(${g.ID_Glossario})" title="Editar">
                    <i class="fas fa-pen" style="font-size: 0.8rem;"></i>
                </button>
                <button class="btn-action-premium delete" onclick="adminUI.deleteGlossaryTerm(${g.ID_Glossario})" title="Eliminar">
                    <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
                </button>
            </td>
        </tr>
      `;
      })
      .join("");
  }

  toggleGlossaryCategoryField() {
    const select = document.getElementById("glossaryCategory");
    const container = document.getElementById("glossaryCustomCategoryContainer");
    const customInput = document.getElementById("glossaryCustomCategory");
    if (select && container) {
      if (select.value === "custom") {
        container.style.display = "block";
        if (customInput) customInput.required = true;
      } else {
        container.style.display = "none";
        if (customInput) {
          customInput.required = false;
          customInput.value = "";
        }
      }
    }
  }

  resetGlossaryForm() {
    const form = document.getElementById("glossaryForm");
    if (form) form.reset();
    const idField = document.getElementById("glossaryId");
    if (idField) idField.value = "";
    const labelField = document.getElementById("glossaryModalLabel");
    if (labelField) labelField.innerText = "Adicionar Novo Termo";
    const customContainer = document.getElementById("glossaryCustomCategoryContainer");
    if (customContainer) customContainer.style.display = "none";
    const customInput = document.getElementById("glossaryCustomCategory");
    if (customInput) {
      customInput.value = "";
      customInput.required = false;
    }
  }

  editGlossaryTerm(id) {
    const g = this.glossaryTerms.find((x) => x.ID_Glossario === id);
    if (!g) return;

    const idField = document.getElementById("glossaryId");
    if (idField) idField.value = g.ID_Glossario;
    const termField = document.getElementById("glossaryTerm");
    if (termField) termField.value = g.Termo;
    const iconField = document.getElementById("glossaryIcon");
    if (iconField) iconField.value = g.Icon;
    
    const categoryField = document.getElementById("glossaryCategory");
    const customContainer = document.getElementById("glossaryCustomCategoryContainer");
    const customInput = document.getElementById("glossaryCustomCategory");
    if (categoryField) {
      const defaultCategories = ["substance", "hive", "process", "equipment"];
      if (defaultCategories.includes(g.Categoria)) {
        categoryField.value = g.Categoria;
        if (customContainer) customContainer.style.display = "none";
        if (customInput) {
          customInput.value = "";
          customInput.required = false;
        }
      } else {
        categoryField.value = "custom";
        if (customContainer) customContainer.style.display = "block";
        if (customInput) {
          customInput.value = g.Categoria;
          customInput.required = true;
        }
      }
    }

    const definitionField = document.getElementById("glossaryDefinition");
    if (definitionField) definitionField.value = g.Definicao;
    const labelField = document.getElementById("glossaryModalLabel");
    if (labelField) labelField.innerText = "Editar Termo #" + id;

    const modal = new bootstrap.Modal(document.getElementById("glossaryModal"));
    modal.show();
  }

  async saveGlossaryTerm() {
    const id = document.getElementById("glossaryId").value;
    let categoria = document.getElementById("glossaryCategory").value;
    if (categoria === "custom") {
      categoria = document.getElementById("glossaryCustomCategory").value.trim().toLowerCase();
    }
    
    const body = {
      termo: document.getElementById("glossaryTerm").value,
      icon: document.getElementById("glossaryIcon").value,
      categoria: categoria,
      definicao: document.getElementById("glossaryDefinition").value,
    };

    if (!body.termo || !body.icon || !body.categoria || !body.definicao) {
      Swal.fire("Erro", "Preencha todos os campos obrigatórios.", "warning");
      return;
    }

    const isEditing = !!id;
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `${API_URL}/aprender/glossario/${id}`
      : `${API_URL}/aprender/glossario`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Falha ao guardar termo do glossário.");

      const modalEl = document.getElementById("glossaryModal");
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      if (modal) modal.hide();

      Swal.fire({
        icon: "success",
        title: "Termo Guardado",
        timer: 1500,
        showConfirmButton: false,
      });
      this.loadGlossaryTerms();
    } catch (error) {
      Swal.fire("Erro", error.message, "error");
    }
  }

  async deleteGlossaryTerm(id) {
    const result = await Swal.fire({
      title: "Remover Termo?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, apagar!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/aprender/glossario/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!response.ok) throw new Error("Erro ao apagar o termo.");
        Swal.fire({
          icon: "success",
          title: "Apagado",
          timer: 1000,
          showConfirmButton: false,
        });
        this.loadGlossaryTerms();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // --- COMMUNITY (Q&A) MODERATION ---
  async loadComunidade() {
    try {
      const response = await fetch(`${API_URL}/comunidade/perguntas`);
      if (!response.ok) throw new Error("Falha ao carregar publicações da comunidade");
      this.comunidadePosts = await response.json();
      this.renderComunidade();
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar os posts da comunidade.", "error");
    }
  }

  renderComunidade() {
    const container = document.getElementById("comunidade-list-body");
    if (!container) return;

    if (!this.comunidadePosts || this.comunidadePosts.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhuma publicação registada na comunidade.</td></tr>`;
      return;
    }

    const rows = [];
    const getValidAvatar = (pic, nome) => {
      if (pic && typeof pic === 'string' && pic.trim() !== '' && pic !== 'null' && pic !== 'undefined') {
        return pic.startsWith('uploads/') ? '/' + pic : pic;
      }
      const cleanName = (nome && nome !== 'Utilizador' && nome !== 'Anónimo') ? nome : 'U';
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(cleanName) + '&background=random&color=fff';
    };

    const getRoleBadge = (tipo) => {
      if (tipo === 'admin') return '<span class="badge bg-danger text-white border-0" style="font-size:0.55rem;"><i class="fas fa-shield-alt me-1"></i>Equipa Hexomel</span>';
      if (tipo === 'apicultor') return '<span class="badge bg-warning text-dark border-0" style="font-size:0.55rem;"><i class="fas fa-check-circle me-1"></i>Apicultor</span>';
      return '<span class="badge bg-secondary border-0" style="font-size:0.55rem;">Cliente</span>';
    };

    this.comunidadePosts.forEach((p) => {
      const pAvatar = getValidAvatar(p.AutorPicture, p.AutorNome);
      const isPRestricted = Boolean(p.AutorRestrito);
      const pAvatarImg = `<img src="${pAvatar}" class="rounded-circle" style="width:30px;height:30px;object-fit:cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${(p.AutorNome || 'U').replace(/'/g, "\\'")}') + '&background=1a4d2e&color=fff';">`;
      const pAvatarHtml = p.ID_Cliente ? `<a href="profile.html?id=${p.ID_Cliente}" target="_blank" title="Ver Perfil">${pAvatarImg}</a>` : pAvatarImg;
      const pNameHtml = p.ID_Cliente 
        ? `<a href="profile.html?id=${p.ID_Cliente}" target="_blank" class="fw-bold small text-dark text-decoration-none d-block text-truncate" style="max-width:130px;" title="Ver Perfil da Comunidade">${p.AutorNome || "Utilizador"}</a>`
        : `<span class="fw-bold small text-dark d-block text-truncate" style="max-width:130px;">${p.AutorNome || "Utilizador"}</span>`;

      // Add Question row
      rows.push(`
        <tr class="table-light">
          <td>
            <div class="d-flex align-items-center gap-2">
              ${pAvatarHtml}
              <div>
                ${pNameHtml}
                <div class="d-flex align-items-center gap-1 mt-0.5">
                  ${getRoleBadge(p.AutorTipo)}
                  ${isPRestricted ? '<span class="badge bg-danger text-white border-0" style="font-size:0.55rem;"><i class="fas fa-ban me-1"></i>Restrito</span>' : ''}
                </div>
              </div>
            </div>
          </td>
          <td>
            <div class="fw-medium text-dark" style="max-width:350px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.Texto}">
              ${p.Texto}
            </div>
          </td>
          <td>
            <span class="badge bg-primary"><i class="fas fa-question-circle me-1"></i>Pergunta #${p.ID_Pergunta}</span>
          </td>
          <td>
            <span class="badge bg-light text-dark border"><i class="fas fa-thumbs-up text-primary me-1"></i>${p.Votos || 0}</span>
          </td>
          <td class="small text-muted">
            ${new Date(p.Data_Criacao).toLocaleDateString("pt-PT")}
          </td>
          <td class="text-end">
            <div class="d-flex align-items-center justify-content-end gap-1.5" style="white-space:nowrap;">
              ${p.ID_Cliente ? `
                <button class="btn-action-premium ${isPRestricted ? 'success' : 'warning'}" onclick="adminUI.toggleUserRestriction('${p.ID_Cliente}', ${isPRestricted ? 1 : 0})" title="${isPRestricted ? 'Permitir Postagem (Desbloquear)' : 'Privar de Postar (Bloquear)'}">
                  <i class="fas ${isPRestricted ? 'fa-check' : 'fa-ban'}" style="font-size: 0.8rem;"></i>
                </button>
              ` : ''}
              <button class="btn-action-premium delete" onclick="adminUI.deleteComunidadePost('pergunta', ${p.ID_Pergunta})" title="Eliminar Pergunta">
                <i class="fas fa-trash" style="font-size: 0.8rem;"></i>
              </button>
            </div>
          </td>
        </tr>
      `);

      // Add Answers rows
      if (p.respostas && p.respostas.length > 0) {
        p.respostas.forEach((r) => {
          const rAvatar = getValidAvatar(r.AutorPicture, r.AutorNome);
          const isRRestricted = Boolean(r.AutorRestrito);
          const rAvatarImg = `<img src="${rAvatar}" class="rounded-circle" style="width:26px;height:26px;object-fit:cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${(r.AutorNome || 'U').replace(/'/g, "\\'")}') + '&background=1a4d2e&color=fff';">`;
          const rAvatarHtml = r.ID_Cliente ? `<a href="profile.html?id=${r.ID_Cliente}" target="_blank" title="Ver Perfil">${rAvatarImg}</a>` : rAvatarImg;
          const rNameHtml = r.ID_Cliente 
            ? `<a href="profile.html?id=${r.ID_Cliente}" target="_blank" class="fw-medium small text-dark text-decoration-none d-block text-truncate" style="max-width:120px;" title="Ver Perfil">${r.AutorNome || "Utilizador"}</a>`
            : `<span class="fw-medium small text-muted d-block text-truncate" style="max-width:120px;">${r.AutorNome || "Utilizador"}</span>`;

          rows.push(`
            <tr>
              <td style="padding-left: 1.8rem !important;">
                <div class="d-flex align-items-center gap-2">
                  <i class="fas fa-reply text-muted fa-rotate-180 small"></i>
                  ${rAvatarHtml}
                  <div>
                    ${rNameHtml}
                    <div class="d-flex align-items-center gap-1 mt-0.5">
                      ${getRoleBadge(r.AutorTipo)}
                      ${isRRestricted ? '<span class="badge bg-danger text-white border-0" style="font-size:0.5rem;"><i class="fas fa-ban me-1"></i>Restrito</span>' : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="text-muted small" style="max-width:350px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.Texto}">
                  ↳ ${r.Texto}
                </div>
              </td>
              <td>
                <span class="badge bg-success bg-opacity-75"><i class="fas fa-comment me-1"></i>Resposta #${r.ID_Resposta}</span>
                ${r.Melhor_Resposta ? '<span class="badge bg-warning text-dark"><i class="fas fa-star me-1"></i>Melhor</span>' : ''}
              </td>
              <td>
                <span class="badge bg-light text-muted border"><i class="fas fa-thumbs-up me-1"></i>${r.Votos || 0}</span>
              </td>
              <td class="small text-muted">
                ${new Date(r.Data_Criacao).toLocaleDateString("pt-PT")}
              </td>
              <td class="text-end">
                <div class="d-flex align-items-center justify-content-end gap-1.5" style="white-space:nowrap;">
                  ${r.ID_Cliente ? `
                    <button class="btn-action-premium ${isRRestricted ? 'success' : 'warning'}" onclick="adminUI.toggleUserRestriction('${r.ID_Cliente}', ${isRRestricted ? 1 : 0})" title="${isRRestricted ? 'Permitir Postagem (Desbloquear)' : 'Privar de Postar (Bloquear)'}">
                      <i class="fas ${isRRestricted ? 'fa-check' : 'fa-ban'}" style="font-size: 0.75rem;"></i>
                    </button>
                  ` : ''}
                  <button class="btn-action-premium delete" onclick="adminUI.deleteComunidadePost('resposta', ${r.ID_Resposta})" title="Eliminar Resposta">
                    <i class="fas fa-trash" style="font-size: 0.75rem;"></i>
                  </button>
                </div>
              </td>
            </tr>
          `);
        });
      }
    });

    container.innerHTML = rows.join("");
  }

  async deleteComunidadePost(type, id) {
    const typeLabel = type === "pergunta" ? "Pergunta" : "Resposta";
    const result = await Swal.fire({
      title: `Remover ${typeLabel}?`,
      text: "Esta ação apagará permanentemente esta publicação e não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, apagar!",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const url = type === "pergunta"
          ? `${API_URL}/comunidade/perguntas/${id}`
          : `${API_URL}/comunidade/respostas/${id}`;

        const response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) throw new Error("Erro ao apagar");
        
        Swal.fire({
          icon: "success",
          title: "Apagado com sucesso",
          timer: 1000,
          showConfirmButton: false,
        });
        
        this.loadComunidade();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  // ============================================================
  // GESTÃO DE AVALIAÇÕES (REVIEWS)
  // ============================================================

  async loadReviews() {
    try {
      const response = await fetch(`${API_URL}/admin/reviews`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!response.ok) throw new Error("Falha ao carregar as avaliações");
      this.reviews = await response.json();
      this.renderReviews();
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível carregar as avaliações.", "error");
    }
  }

  renderReviews() {
    const container = document.getElementById("reviews-list-body");
    if (!container) return;

    if (!this.reviews || this.reviews.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhuma avaliação registada nos produtos.</td></tr>`;
      return;
    }

    container.innerHTML = "";
    this.reviews.forEach((r) => {
      const date = new Date(r.Data_Avaliacao).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      let stars = "";
      for (let i = 1; i <= 5; i++) {
        stars += `<i class="${i <= r.Nota ? "fas" : "far"} fa-star text-warning small"></i>`;
      }

      const avatarSrc = r.ClienteFoto ? r.ClienteFoto : "https://cdn-icons-png.flaticon.com/512/6596/6596121.png";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${avatarSrc}" alt="Avatar" class="rounded-circle border" style="width: 32px; height: 32px; object-fit: cover;">
            <div>
              <div class="fw-bold small">${r.ClienteNome || "Cliente Hexomel"}</div>
              <div class="text-muted text-truncate" style="max-width: 150px; font-size: 0.75rem;">${r.ClienteEmail || ""}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="fw-medium small text-truncate" style="max-width: 200px;">
            ${r.ProdutoNome || "Produto Indisponível"}
          </div>
          <div class="text-muted" style="font-size: 0.75rem;">ID Produto: ${r.ID_Produto}</div>
        </td>
        <td>
          <div class="d-flex gap-1 align-items-center">
            ${stars}
            <span class="badge bg-light text-dark ms-1 small" style="font-size: 0.7rem">${r.Nota}/5</span>
          </div>
        </td>
        <td>
          <div class="text-wrap small text-muted" style="max-width: 250px; word-break: break-word;">
            ${r.Comentario ? r.Comentario : '<span class="fst-italic text-muted">Sem comentário</span>'}
          </div>
        </td>
        <td class="small text-muted">${date}</td>
        <td class="text-end">
          <button class="btn-action-premium delete" onclick="adminUI.deleteReview(${r.ID_Avaliacao})" title="Eliminar Avaliação">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      container.appendChild(tr);
    });
  }

  async deleteReview(id) {
    const result = await Swal.fire({
      title: "Tem a certeza?",
      text: "Esta ação apagará permanentemente esta avaliação e não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sim, apagar!",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/admin/reviews/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) throw new Error("Erro ao apagar a avaliação");

        Swal.fire({
          icon: "success",
          title: "Avaliação apagada com sucesso",
          timer: 1000,
          showConfirmButton: false,
        });

        this.loadReviews();
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  }

  loadMonetization() {
    this.calculateMonetization();
  }

  updateCustomRateValue(val) {
    const badge = document.getElementById("sim-custom-rate-badge");
    if (badge) badge.innerText = `${val}%`;
    const titleRate = document.getElementById("val-custom-title-rate");
    if (titleRate) titleRate.innerText = `${val}%`;
    this.calculateMonetization();
  }

  calculateMonetization() {
    const gmvEl = document.getElementById("sim-gmv-monet");
    const fixedEl = document.getElementById("sim-fixed-monet");
    const gatewayEl = document.getElementById("sim-gateway-monet");
    const customRateEl = document.getElementById("sim-custom-rate");

    if (!gmvEl || !fixedEl || !gatewayEl || !customRateEl) return;

    const gmv = parseFloat(gmvEl.value) || 0;
    const fixedCosts = parseFloat(fixedEl.value) || 0;
    const gatewayPct = parseFloat(gatewayEl.value) || 0;
    const customRate = parseFloat(customRateEl.value) || 0;

    const gatewayCost = gmv * (gatewayPct / 100);

    const netResults = {};

    const calculateRow = (ratePct, rowIdPrefix) => {
      const revenue = gmv * (ratePct / 100);
      const grossProfit = revenue - gatewayCost;
      const netProfit = grossProfit - fixedCosts;
      netResults[rowIdPrefix] = netProfit;

      const revEl = document.getElementById(`val-${rowIdPrefix}-revenue`);
      const gateEl = document.getElementById(`val-${rowIdPrefix}-gateway`);
      const grossEl = document.getElementById(`val-${rowIdPrefix}-gross`);
      const fixEl = document.getElementById(`val-${rowIdPrefix}-fixed`);
      const netEl = document.getElementById(`val-${rowIdPrefix}-net`);
      const statusEl = document.getElementById(`val-${rowIdPrefix}-status`);

      if (revEl) revEl.innerText = `${revenue.toFixed(2)}€`;
      if (gateEl) gateEl.innerText = `${gatewayCost.toFixed(2)}€`;
      if (grossEl) grossEl.innerText = `${grossProfit.toFixed(2)}€`;
      if (fixEl) fixEl.innerText = `${fixedCosts.toFixed(2)}€`;
      
      if (netEl) {
        netEl.innerText = `${netProfit.toFixed(2)}€`;
        if (netProfit < 0) {
          netEl.className = "fw-bold text-danger";
        } else {
          netEl.className = "fw-bold text-success";
        }
      }

      if (statusEl) {
        if (netProfit < 0) {
          statusEl.innerHTML = `<span class="badge bg-danger">Prejuízo</span>`;
        } else {
          statusEl.innerHTML = `<span class="badge bg-success">Lucro</span>`;
        }
      }
    };

    calculateRow(5, "5");
    calculateRow(10, "10");
    calculateRow(20, "20");
    calculateRow(customRate, "custom");

    this.renderMonetizationScenarioChart(netResults["5"], netResults["10"], netResults["20"], netResults["custom"], customRate);
  }

  renderMonetizationScenarioChart(net5, net10, net20, netCustom, customRate) {
    if (typeof Chart === "undefined") return;
    const scenarioCtx = document.getElementById("monetizationScenarioChart")?.getContext("2d");
    if (!scenarioCtx) return;

    if (this.monetizationScenarioChart) this.monetizationScenarioChart.destroy();
    this.monetizationScenarioChart = new Chart(scenarioCtx, {
      type: "bar",
      data: {
        labels: ["Cenário 5%", "Cenário 10% (Recomendado)", "Cenário 20%", `Personalizado (${customRate}%)`],
        datasets: [{
          label: "Lucro Líquido Simulado (€)",
          data: [net5, net10, net20, netCustom],
          backgroundColor: [
            net5 < 0 ? "#dc2626" : "#16a34a",
            net10 < 0 ? "#dc2626" : "#f59e0b",
            net20 < 0 ? "#dc2626" : "#2563eb",
            netCustom < 0 ? "#dc2626" : "#10b981"
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: "rgba(0,0,0,0.05)" } }
        }
      }
    });
  }

  renderVendasCharts(totalGross, commission, gatewayFees, netPlatform) {
    if (typeof Chart === "undefined") return;

    // 1. Split Chart (Doughnut)
    const splitCtx = document.getElementById("vendasSplitChart")?.getContext("2d");
    if (splitCtx) {
      if (this.vendasSplitChart) this.vendasSplitChart.destroy();
      this.vendasSplitChart = new Chart(splitCtx, {
        type: "doughnut",
        data: {
          labels: ["Apicultor (90%)", "Lucro Hexomel (8%)", "Taxas Banco/Gateway (2%)"],
          datasets: [{
            data: [90, 8, 2],
            backgroundColor: ["#16a34a", "#2563eb", "#dc2626"],
            borderWidth: 2,
            borderColor: "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 11 } } }
          }
        }
      });
    }

    // 2. Breakdown Chart (Bar)
    const breakdownCtx = document.getElementById("vendasBreakdownChart")?.getContext("2d");
    if (breakdownCtx) {
      if (this.vendasBreakdownChart) this.vendasBreakdownChart.destroy();
      this.vendasBreakdownChart = new Chart(breakdownCtx, {
        type: "bar",
        data: {
          labels: ["Vendas Brutas (GMV)", "Comissão Bruta (10%)", "Custos Gateway (2%)", "Receita Líquida (8%)"],
          datasets: [{
            label: "Valores em Euros (€)",
            data: [totalGross, commission, gatewayFees, netPlatform],
            backgroundColor: ["#f97316", "#16a34a", "#dc2626", "#2563eb"],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } }
          }
        }
      });
    }
  }

  async loadVendasData() {
    try {
      const response = await fetch(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar encomendas");
      const orders = await response.json();

      // Filter paid/completed or all orders except cancelled
      const activeOrders = orders.filter(o => o.Status.toLowerCase() !== "cancelado");

      let totalGross = 0;
      activeOrders.forEach(o => {
        totalGross += parseFloat(o.Total) || 0;
      });

      const commission = totalGross * (this.commissionRate / 100);
      const gatewayFees = totalGross * (this.gatewayRate / 100);
      const netPlatform = commission - gatewayFees;

      // Update Cards
      const grossEl = document.getElementById("vendas-total-gross");
      const commEl = document.getElementById("vendas-platform-commission");
      const gateEl = document.getElementById("vendas-gateway-fees");
      const netEl = document.getElementById("vendas-platform-net");

      if (grossEl) grossEl.innerText = `${totalGross.toFixed(2)}€`;
      if (commEl) commEl.innerText = `${commission.toFixed(2)}€`;
      if (gateEl) gateEl.innerText = `${gatewayFees.toFixed(2)}€`;
      if (netEl) netEl.innerText = `${netPlatform.toFixed(2)}€`;

      // Render Visual Charts
      this.renderVendasCharts(totalGross, commission, gatewayFees, netPlatform);

      // Update Table
      const tableBody = document.getElementById("vendas-table-body");
      if (tableBody) {
        if (activeOrders.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Nenhuma venda registada.</td></tr>`;
        } else {
          tableBody.innerHTML = activeOrders.map(o => {
            const valGross = parseFloat(o.Total) || 0;
            const valComm = valGross * (this.commissionRate / 100);
            const valGate = valGross * (this.gatewayRate / 100);
            const valNet = valComm - valGate;
            const valSeller = valGross - valComm;
            const date = new Date(o.Data_Encomenda).toLocaleDateString();

            return `
              <tr>
                <td class="fw-bold text-muted small">#${o.ID_Encomenda}</td>
                <td class="small text-muted">${date}</td>
                <td class="fw-bold text-dark">${valGross.toFixed(2)}€</td>
                <td class="text-success fw-medium">${valComm.toFixed(2)}€</td>
                <td class="text-danger fw-medium">${valGate.toFixed(2)}€</td>
                <td class="text-primary fw-bold">${valNet.toFixed(2)}€</td>
                <td class="fw-medium text-dark">${valSeller.toFixed(2)}€</td>
              </tr>
            `;
          }).join("");
        }
      }

      // Initial run of the simulator with database values (or default)
      const simGmvInput = document.getElementById("sim-gmv");
      if (simGmvInput && (parseFloat(simGmvInput.value) === 10000 || simGmvInput.value === "")) {
        simGmvInput.value = Math.max(Math.round(totalGross), 1000);
      }
      this.runSimulator();

    } catch (error) {
      console.error("Error loading sales/financial data:", error);
      Swal.fire("Erro", "Não foi possível carregar os dados financeiros.", "error");
    }
  }

  runSimulator() {
    const simGmvInput = document.getElementById("sim-gmv");
    const simFixedInput = document.getElementById("sim-fixed-costs");
    
    if (!simGmvInput || !simFixedInput) return;

    const gmv = parseFloat(simGmvInput.value) || 0;
    const fixedCosts = parseFloat(simFixedInput.value) || 0;

    const commission = gmv * (this.commissionRate / 100);
    const gateway = gmv * (this.gatewayRate / 100);
    const netMargin = commission - gateway;
    const netProfit = netMargin - fixedCosts;

    // Update Simulator display values
    const commValEl = document.getElementById("sim-commission-val");
    const gateValEl = document.getElementById("sim-gateway-val");
    const netValEl = document.getElementById("sim-net-val");
    const profitTitleEl = document.getElementById("sim-profit-title");
    const profitTextEl = document.getElementById("sim-profit-text");
    const resultBoxEl = document.getElementById("sim-result-box");

    if (commValEl) commValEl.innerText = `€${commission.toFixed(2)}`;
    if (gateValEl) gateValEl.innerText = `€${gateway.toFixed(2)}`;
    if (netValEl) netValEl.innerText = `€${netMargin.toFixed(2)}`;

    if (profitTitleEl) {
      const sign = netProfit >= 0 ? "+" : "";
      profitTitleEl.innerText = `${sign}€${netProfit.toFixed(2)}`;
    }

    if (profitTextEl && resultBoxEl) {
      if (netProfit >= 0) {
        profitTextEl.innerText = "(Acima do Ponto de Equilíbrio)";
        profitTextEl.style.color = "#16a34a";
        resultBoxEl.style.background = "#f0fdf4";
        resultBoxEl.style.borderColor = "#bbf7d0";
        if (profitTitleEl) profitTitleEl.style.color = "#16a34a";
      } else {
        profitTextEl.innerText = "(Abaixo do Ponto de Equilíbrio)";
        profitTextEl.style.color = "#dc2626";
        resultBoxEl.style.background = "#fef2f2";
        resultBoxEl.style.borderColor = "#fecaca";
        if (profitTitleEl) profitTitleEl.style.color = "#dc2626";
      }
    }
  }
}

window.uploadCMSImage = async (idContent, fileInput) => {
  if (!fileInput.files || !fileInput.files[0]) return;
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("image", file);

  const btnLabel = fileInput.nextElementSibling;
  const originalHtml = btnLabel.innerHTML;
  btnLabel.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A carregar...`;
  btnLabel.style.pointerEvents = "none";

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data.path) {
      const inputVal = document.getElementById(`cms-value-${idContent}`);
      const imgPreview = document.getElementById(`cms-img-preview-${idContent}`);
      if (inputVal) inputVal.value = data.path;
      if (imgPreview) imgPreview.src = data.path;

      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "Imagem Carregada!",
          text: "Clique em 'Guardar Alterações' para aplicar a alteração no site.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } else {
      alert(data.error || "Erro ao carregar imagem.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de ligação ao carregar a imagem.");
  } finally {
    btnLabel.innerHTML = originalHtml;
    btnLabel.style.pointerEvents = "auto";
  }
};

const adminUI = new AdminUI();
window.adminUI = adminUI;
export default adminUI;
