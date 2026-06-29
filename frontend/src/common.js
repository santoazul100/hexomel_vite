import "./styles/index.css";
import "./styles/maintenance.css";

/**
 * Common layout and logic for all Hexomel pages
 */
class HexomelApp {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem("cart")) || [];
    this.user = JSON.parse(localStorage.getItem("user")) || null;
    this.sidebarOpen = false;
  }

  init() {
    this.checkMaintenanceMode();
    this.renderNavbar();
    this.renderFooter();
    // this.renderCartSidebar(); // Disabled to prevent duplicate carts (handled by cart.js)
    // this.initBeeAnimations(); // Disabled to prevent conflict with beeAnimation.js (causes visual stutter and lag)
    this.updateCartBadge();
    this.bindGlobalEvents();
  }

  renderNavbar() {
    const navbarContainer = document.getElementById("navbar-container");
    if (!navbarContainer) return;

    const cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const loginLink =
      this.user && this.user.Nome
        ? `<span class="nav-link text-success fw-semibold">Olá, ${
            this.user.Nome.split(" ")[0]
          }</span>`
        : `<button type="button" class="nav-link fw-medium border-0 bg-transparent" onclick="window.openAuthModal ? window.openAuthModal('login') : (window.location.href='index.html#auth-modal')">Entrar</button>`;

    navbarContainer.innerHTML = `
            <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm py-2">
                <div class="container">
                    <a class="navbar-brand fw-bold text-success fs-3 d-flex align-items-center gap-2" href="/">
                        <i class="bi bi-hexagon-fill"></i>
                        Hexomel
                    </a>
                    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto align-items-center gap-2">
                            <li class="nav-item"><a class="nav-link fw-medium px-3 rounded hover-bg-light" href="shop.html">Produtos</a></li>
                            <li class="nav-item"><a class="nav-link fw-medium px-3 rounded hover-bg-light" href="about.html">Sobre</a></li>
                            <li class="nav-item"><a class="nav-link fw-medium px-3 rounded hover-bg-light" href="contact.html">Contatos</a></li>
                            <li class="nav-item ms-lg-2">${loginLink}</li>
                            <li class="nav-item ms-lg-2">
                                <button class="btn btn-outline-success position-relative cart-btn-modern px-3 py-2" id="cart-toggle-btn" aria-label="Carrinho de compras">
                                    <i class="bi bi-cart3 fs-5"></i>
                                    ${
                                      cartCount > 0
                                        ? `
                                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger cart-badge-modern">
                                            ${cartCount}
                                            <span class="visually-hidden">items no carrinho</span>
                                        </span>
                                    `
                                        : ""
                                    }
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
            <div style="height: 75px;"></div>
        `;
  }

  renderCartSidebar() {
    let sidebar = document.getElementById("cart-sidebar");
    if (!sidebar) {
      sidebar = document.createElement("div");
      sidebar.id = "cart-sidebar";
      sidebar.className = "cart-sidebar";
      document.body.appendChild(sidebar);
    }

    const total = this.cart.reduce(
      (sum, item) => sum + item.Preco * item.quantity,
      0,
    );
    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);

    sidebar.innerHTML = `
        <div class="cart-sidebar-content">
            <div class="cart-header">
                <div>
                    <h4 class="cart-title mb-1">Carrinho</h4>
                    <p class="cart-subtitle text-muted mb-0">${itemCount} ${
                      itemCount === 1 ? "item" : "itens"
                    }</p>
                </div>
                <button class="btn-close cart-close-btn" id="close-cart" aria-label="Fechar carrinho"></button>
            </div>
            
            <div class="cart-items-container">
                ${
                  this.cart.length === 0
                    ? `
                    <div class="cart-empty-state">
                        <i class="bi bi-cart-x text-muted" style="font-size: 4rem; opacity: 0.3;"></i>
                        <p class="text-muted mt-3 mb-0">O seu carrinho está vazio</p>
                        <a href="shop.html" class="btn btn-sm btn-outline-success mt-3">Ver Produtos</a>
                    </div>
                `
                    : `
                    <div class="cart-items-list">
                        ${this.cart
                          .map(
                            (item, index) => `
                            <div class="cart-item">
                                <div class="cart-item-image">
                                    <img src="/img/${
                                      item.Imagem || "erro.png"
                                    }\" alt="${
                                      item.Nome
                                    }" onerror="this.src='https://placehold.co/80x80/e8f5e9/2d5f3f?text=Mel'">
                                </div>
                                <div class="cart-item-details">
                                    <h6 class="cart-item-name mb-1">${
                                      item.Nome
                                    }</h6>
                                    <div class="cart-item-meta">
                                        <span class="cart-item-quantity">${
                                          item.quantity
                                        }x</span>
                                        <span class="cart-item-price">${Number(
                                          item.Preco,
                                        ).toFixed(2)}€</span>
                                    </div>
                                </div>
                                <button class="cart-item-remove" data-index="${index}" aria-label="Remover item">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `
                }
            </div>

            <div class="cart-footer">
                <div class="cart-total">
                    <span class="cart-total-label">Total</span>
                    <span class="cart-total-value">${total.toFixed(2)}€</span>
                </div>
                <button class="btn btn-success w-100 cart-checkout-btn" ${
                  this.cart.length === 0 ? "disabled" : ""
                }>
                    <i class="bi bi-check-circle me-2"></i>
                    Finalizar Compra
                </button>
            </div>
        </div>
    `;

    sidebar.querySelectorAll(".cart-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index);
        this.removeFromCart(index);
      });
    });

    const closeBtn = document.getElementById("close-cart");
    if (closeBtn)
      closeBtn.addEventListener("click", () => this.toggleCart(false));
  }

  renderFooter() {
    const footerContainer = document.getElementById("footer-container");
    if (!footerContainer) return;

    footerContainer.innerHTML = `
            <footer class="bg-dark text-white py-5 mt-5">
                <div class="container py-4">
                    <div class="row g-4 text-center text-md-start">
                        <div class="col-md-4">
                            <h4 class="fw-bold text-success mb-4">Hexomel</h4>
                            <p class="text-secondary">O melhor mel natural do Alentejo, diretamente para a sua mesa. Qualidade e pureza garantidas em cada gota.</p>
                        </div>
                        <div class="col-md-4">
                            <h5 class="fw-bold mb-4">Links Rápidos</h5>
                            <ul class="list-unstyled">
                                <li class="mb-2"><a href="shop.html" class="text-secondary text-decoration-none hover-success">Produtos</a></li>
                                <li class="mb-2"><a href="about.html" class="text-secondary text-decoration-none hover-success">Sobre Nós</a></li>
                                <li class="mb-2"><a href="contact.html" class="text-secondary text-decoration-none hover-success">Contactos</a></li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <h5 class="fw-bold mb-3">Siga-nos</h5>
                            <div class="d-flex gap-3 justify-content-center justify-content-md-start">
                                <a href="#" class="btn btn-outline-success border-2 rounded-circle"><i class="bi bi-facebook"></i></a>
                                <a href="#" class="btn btn-outline-success border-2 rounded-circle"><i class="bi bi-instagram"></i></a>
                                <a href="#" class="btn btn-outline-success border-2 rounded-circle"><i class="bi bi-twitter-x"></i></a>
                            </div>
                        </div>
                    </div>
                    <hr class="my-4 border-secondary opacity-25">
                    <div class="text-center text-secondary small">
                        &copy; 2026 Hexomel. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        `;
  }

  initBeeAnimations() {
    const bees = document.querySelectorAll(".bee-decoration");
    if (bees.length === 0) return;

    bees.forEach((bee) => {
      bee.classList.remove("d-none");
      bee.style.pointerEvents = "none";
    });

    document.addEventListener("mousemove", (e) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      bees.forEach((bee, index) => {
        const depth = (index + 1) * 0.03;
        const x = (centerX - clientX) * depth;
        const y = (centerY - clientY) * depth;
        bee.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.2}deg)`;
      });
    });
  }

  bindGlobalEvents() {
    document.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest("#cart-toggle-btn");
      if (toggleBtn) {
        this.toggleCart(true);
      }
    });

    document.addEventListener("mousedown", (e) => {
      const sidebar = document.getElementById("cart-sidebar");
      const toggleBtn = e.target.closest("#cart-toggle-btn");
      if (
        this.sidebarOpen &&
        sidebar &&
        !sidebar.contains(e.target) &&
        !toggleBtn
      ) {
        this.toggleCart(false);
      }
    });
  }

  toggleCart(show) {
    this.sidebarOpen = show;
    const sidebar = document.getElementById("cart-sidebar");
    if (sidebar) {
      if (show) sidebar.classList.add("active");
      else sidebar.classList.remove("active");
    }
  }

  updateCartBadge() {
    this.renderCartSidebar();
  }

  addToCart(product) {
    if (!product) return;
    const existing = this.cart.find(
      (item) => item.ID_Produto === product.ID_Produto,
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }
    this.saveCart();
    this.updateCartBadge();
    this.toggleCart(true);
  }

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateCartBadge();
  }

  saveCart() {
    localStorage.setItem("cart", JSON.stringify(this.cart));
  }

  async checkMaintenanceMode() {
    // Only bypass for admin dashboard pages
    const path = window.location.pathname.toLowerCase();
    if (path.includes("admin")) return;

    try {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return;
      const settings = await res.json();
      try { localStorage.setItem("hexomel_maint_cache", JSON.stringify(settings)); } catch(e){}

      let currentSection = "full";
      if (path.includes("shop") || path.includes("loja") || path.includes("produto") || path.includes("checkout") || path.includes("cart")) {
        currentSection = "shop";
      } else if (path.includes("curiosidades")) {
        currentSection = "curiosidades";
      } else if (path.includes("aprender") || path.includes("workshops") || path.includes("faq")) {
        currentSection = "aprender";
      } else if (path.includes("rede-social") || path.includes("comunidade") || path.includes("hexohive")) {
        currentSection = "hexohive";
      }

      const isTrue = (val) => val === "true" || val === true || val === "1" || val === 1;
      const isFullMaint = isTrue(settings.maintenance_full) || isTrue(settings.maintenance_mode);
      const isSectionMaint = currentSection !== "full" && isTrue(settings[`maintenance_${currentSection}`]);

      const removeAntiFlicker = () => {
        const antiFlicker = document.getElementById("hexomel-anti-flicker-maint");
        if (antiFlicker) antiFlicker.remove();
      };

      if (isFullMaint || isSectionMaint) {
        const sectionNames = {
          full: "Site Inteiro",
          shop: "Compras / Loja",
          curiosidades: "Curiosidades",
          aprender: "Aprender",
          hexohive: "HexoHive"
        };
        const activeSectionName = isFullMaint ? "Site Inteiro" : (sectionNames[currentSection] || "esta secção");

        const message = settings.maintenance_message || "Estamos a realizar melhorias importantes nesta área do site.";
        const endTime = settings.maintenance_end_time || "Hoje às 18:00";
        const popupSeen = sessionStorage.getItem("hexomel_maint_popup_seen") === "true";

        if (!popupSeen) {
          removeAntiFlicker();
          this.showMaintenancePopup(message, endTime, () => {
            sessionStorage.setItem("hexomel_maint_popup_seen", "true");
            this.renderMaintenancePage(message, endTime, activeSectionName);
          }, activeSectionName);
        } else {
          this.renderMaintenancePage(message, endTime, activeSectionName);
          removeAntiFlicker();
        }
      } else {
        removeAntiFlicker();
      }
    } catch (e) {
      console.error("Error checking maintenance mode:", e);
    }
  }

  showMaintenancePopup(message, endTime, onCloseCallback, sectionName = "esta secção") {
    if (document.getElementById("hexomel-maint-popup-overlay")) return;
    
    let formattedEnd = endTime;
    if (endTime && endTime.includes("T")) {
      const d = new Date(endTime);
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
        <div class="hexomel-maint-modal-badge">🛠️ A secção ${sectionName} está em manutenção</div>
        <p class="hexomel-maint-modal-desc">${message}</p>
        
        ${formattedEnd ? `
          <div class="hexomel-maint-modal-meta">
            <strong>🕒 Previsão de Regresso:</strong> ${formattedEnd}
          </div>
        ` : ''}

        <div>
          <button id="hexomel-maint-close-btn" class="btn btn-warning rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm w-100" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-size: 1rem;">
            Entendi e Continuar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    document.getElementById("hexomel-maint-close-btn").addEventListener("click", () => {
      overlay.remove();
      document.body.style.overflow = "";
      if (onCloseCallback) onCloseCallback();
    });
  }

  renderMaintenancePage(message, endTime, activeSectionName = "Geral") {
    const mainContainer = document.querySelector("main") || document.getElementById("app") || document.body;
    if (!mainContainer) return;

    let formattedEnd = endTime;
    if (endTime && endTime.includes("T")) {
      const d = new Date(endTime);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        formattedEnd = `${day}/${month}/${d.getFullYear()} às ${hours}:${mins}`;
      }
    }

    const loggedUser = JSON.parse(localStorage.getItem("user") || "null") || this.user;

    let complaintBoxHTML = '';
    if (!loggedUser) {
      complaintBoxHTML = `
        <div id="hexomel-maint-complaint-box" class="hexomel-maint-complaint-box" style="display: none;">
          <div style="text-align: center; padding: 0.5rem 0;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin: 0 auto 0.75rem auto;">
              <i class="fas fa-lock"></i>
            </div>
            <h5 class="hexomel-maint-complaint-title" style="margin-bottom: 0.4rem; text-align: center;">Iniciar Sessão Necessário</h5>
            <p class="hexomel-maint-complaint-desc" style="margin-bottom: 1.25rem; text-align: center;">
              A previsão de manutenção terminou. Para enviar uma mensagem ou reclamação direta ao administrador, por favor inicie sessão na sua conta.
            </p>
            <button type="button" onclick="window.openAuthModal ? window.openAuthModal('login') : (window.location.href='index.html#auth-modal')" class="hexomel-maint-submit-btn" style="border: none; display: inline-flex; width: auto; padding: 0.75rem 1.75rem; margin: 0 auto; cursor: pointer;">
              <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sessão para Mandar Email
            </button>
          </div>
        </div>
      `;
    } else {
      const displayName = loggedUser.Nome || loggedUser.Username || 'Utilizador';
      const displayEmail = loggedUser.Email || 'Não especificado';
      const displayUser = loggedUser.Username ? `@${loggedUser.Username}` : '';

      complaintBoxHTML = `
        <div id="hexomel-maint-complaint-box" class="hexomel-maint-complaint-box" style="display: none;">
          <div class="hexomel-maint-complaint-header">
            <h5 class="hexomel-maint-complaint-title">Contactar a Administração</h5>
          </div>
          <p class="hexomel-maint-complaint-desc">
            A previsão de conclusão da manutenção terminou. Envie uma mensagem direta à administração.
          </p>
          <form id="hexomel-maint-complaint-form">
            <textarea id="maint-comp-msg" class="hexomel-maint-textarea" rows="3" placeholder="Escreva a sua mensagem ou comunicação..." required></textarea>
            <button type="submit" id="maint-comp-submit-btn" class="hexomel-maint-submit-btn mt-3">
              Mandar Email ao Administrador
            </button>
          </form>
          <div id="maint-comp-status" style="margin-top: 0.75rem; font-size: 0.88rem; font-weight: 600; text-align: center;"></div>
        </div>
      `;
    }

    mainContainer.innerHTML = `
      <div class="hexomel-maint-page">
        <div class="hexomel-maint-card">
          <!-- Beehive construction stage -->
          <div class="hexomel-maint-beehive-stage">
            <svg width="110" height="110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; filter: drop-shadow(0 10px 20px rgba(245, 158, 11, 0.25));">
              <path d="M50 12 L85 32 L15 32 Z" fill="#d97706" />
              <rect x="18" y="32" width="64" height="13" rx="4" fill="#f59e0b" />
              <rect x="22" y="47" width="56" height="13" rx="4" fill="#fbbf24" />
              <rect x="26" y="62" width="48" height="13" rx="4" fill="#f59e0b" />
              <rect x="30" y="77" width="40" height="10" rx="3" fill="#d97706" />
              <ellipse cx="50" cy="70" rx="7" ry="5" fill="#78350f" />
            </svg>
            <img src="/images/bee/abelha.webp" alt="Abelha Operária" class="hexomel-maint-page-bee-1" />
            <img src="/images/bee/abelha_inverso.webp" alt="Abelha Operária" class="hexomel-maint-page-bee-2" />
            <img src="/images/bee/abelha.webp" alt="Abelha Operária" class="hexomel-maint-page-bee-3" />
            <img src="/images/bee/abelha_inverso.webp" alt="Abelha Operária" class="hexomel-maint-page-bee-4" />
          </div>

          <h1 class="hexomel-maint-page-title">A construir melhorias na nossa colmeia!</h1>
          <p class="hexomel-maint-page-desc">
            ${message}
          </p>

          <div class="hexomel-maint-timer-container">
            <span class="hexomel-maint-timer-label">Tempo Restante para Conclusão</span>
            <div class="hexomel-maint-timer-boxes">
              <div class="hexomel-timer-box"><span id="maint-timer-hours">00</span><small>Horas</small></div>
              <div class="hexomel-timer-colon">:</div>
              <div class="hexomel-timer-box"><span id="maint-timer-mins">00</span><small>Minutos</small></div>
              <div class="hexomel-timer-colon">:</div>
              <div class="hexomel-timer-box"><span id="maint-timer-secs">00</span><small>Segundos</small></div>
            </div>
          </div>

          ${formattedEnd ? `
            <div class="hexomel-maint-page-box">
              <strong>Previsão de Conclusão:</strong> ${formattedEnd}
            </div>
          ` : ''}

          <!-- Box de Reclamação / Contacto quando o tempo termina -->
          ${complaintBoxHTML}

          <div>
            <a href="index.html" class="btn btn-success rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm" style="background: linear-gradient(135deg, #1a4d2e, #2d7a4f); border: none; font-size: 1rem;">
              Voltar à Página Inicial
            </a>
          </div>
        </div>
      </div>
    `;

    this.startCountdownTimer(endTime, activeSectionName);

    const compForm = document.getElementById("hexomel-maint-complaint-form");
    if (compForm) {
      compForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = document.getElementById("maint-comp-msg")?.value || "";
        const statusEl = document.getElementById("maint-comp-status");
        const btn = document.getElementById("maint-comp-submit-btn");

        if (statusEl) statusEl.textContent = "A enviar mensagem...";
        if (btn) btn.disabled = true;

        const currentLogged = JSON.parse(localStorage.getItem("user") || "null") || loggedUser;
        const nameToSend = currentLogged ? (currentLogged.Nome || currentLogged.name || currentLogged.Username || currentLogged.username || 'Utilizador') : 'Anónimo';
        const emailToSend = currentLogged ? (currentLogged.Email || currentLogged.email || 'Não especificado') : '';

        try {
          const res = await fetch("/api/maintenance/complaints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_name: nameToSend, user_email: emailToSend, message: msg, section: activeSectionName })
          });
          const data = await res.json();
          if (res.ok) {
            if (statusEl) {
              statusEl.style.color = "#059669";
              statusEl.textContent = "Mensagem enviada com sucesso ao Administrador!";
            }
            compForm.reset();
          } else {
            throw new Error(data.error || "Erro ao enviar mensagem.");
          }
        } catch (err) {
          if (statusEl) {
            statusEl.style.color = "#dc2626";
            statusEl.textContent = err.message;
          }
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }
  }

  startCountdownTimer(endTimeStr, sectionName = "Geral") {
    if (this.maintTimerInterval) clearInterval(this.maintTimerInterval);

    let targetDate = null;
    if (endTimeStr && endTimeStr.includes("T")) {
      const parsed = new Date(endTimeStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    if (!targetDate) {
      targetDate = new Date();
      const match = endTimeStr ? endTimeStr.match(/(\d{1,2}):(\d{2})/) : null;
      if (match) {
        targetDate.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
        if (targetDate.getTime() <= Date.now()) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
      } else {
        targetDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      }
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        if (this.maintTimerInterval) clearInterval(this.maintTimerInterval);
        const hEl = document.getElementById("maint-timer-hours");
        const mEl = document.getElementById("maint-timer-mins");
        const sEl = document.getElementById("maint-timer-secs");
        if (hEl) hEl.textContent = "00";
        if (mEl) mEl.textContent = "00";
        if (sEl) sEl.textContent = "00";

        // Show complaint form box
        const complaintBox = document.getElementById("hexomel-maint-complaint-box");
        if (complaintBox) complaintBox.style.display = "block";

        // Trigger email notification to admin about timer expiry
        if (!this.expiredEmailTriggered) {
          this.expiredEmailTriggered = true;
          fetch("/api/maintenance/timer-expired", { method: "POST" }).catch(() => {});
        }
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const hEl = document.getElementById("maint-timer-hours");
      const mEl = document.getElementById("maint-timer-mins");
      const sEl = document.getElementById("maint-timer-secs");

      if (hEl) hEl.textContent = String(hours).padStart(2, "0");
      if (mEl) mEl.textContent = String(minutes).padStart(2, "0");
      if (sEl) sEl.textContent = String(seconds).padStart(2, "0");
    };

    updateTimer();
    this.maintTimerInterval = setInterval(updateTimer, 1000);
  }
}

export const app = new HexomelApp();

const init = () => app.init();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
