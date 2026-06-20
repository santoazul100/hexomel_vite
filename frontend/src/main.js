import "./styles/index.css";
import "./styles/i18n.css";
// import "./styles/modern.css";
// Note: modern.css is loaded via HTML now to avoid FOUC
import { initI18n, createLangToggle, getLang } from "./i18n.js";
import {
  getLoggedUser,
  logout,
  initializeGoogleAuth,
  initializeAuthForms,
  updateNav,
} from "./auth.js";
import { cart } from "./cart.js";
import Swal from "sweetalert2";
import { trackPageView, setupAutoTracking } from "./analytics.js";
import { API_URL, ensureBackendReady, parseJsonSafely } from "./api.js";

// Global fetch interceptor for automatic logout on 401 Unauthorized
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  if (response.status === 401) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    // Avoid triggering on login/register endpoints to prevent loops
    if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
      import("./auth.js").then(({ handleSessionExpired }) => {
        handleSessionExpired("A sua sessão expirou. Por favor, inicie sessão novamente.");
      });
    }
  }
  return response;
};

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const href = this.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Scroll Animations (Intersection Observer)
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("fade-in-up");
      entry.target.style.opacity = "1";
    }
  });
}, observerOptions);

// Observe cards and sections
document
  .querySelectorAll(
    ".card, .product-card-minimal, .hover-card, .stat-card, .badge-card",
  )
  .forEach((el) => {
    el.style.opacity = "0";
    observer.observe(el);
  });

// Navbar and Auth initialization handled in DOMContentLoaded below

// Custom Auth Modal Logic (Vercel Style)
window.updateScrollLock = function () {
  const anyModalOpen = !!document.querySelector(".modal.show");
  const anyOverlayActive = !!document.querySelector(
    ".auth-overlay.active, .cart-sidebar.open, .details-overlay.active, #checkoutModal.show",
  );
  const anySwalOpen = document.body.classList.contains("swal2-shown");

  if (anyModalOpen || anyOverlayActive || anySwalOpen) {
    document.documentElement.classList.add("modal-open");
    // Adicionar padding ao html se necessário (mesma lógica que o Bootstrap faz no body)
    if (window.innerWidth > document.documentElement.clientWidth) {
      // O scrollbar-gutter: stable já cuida disso na maioria dos browsers modernos
    }
  } else {
    document.documentElement.classList.remove("modal-open");
  }
};

window.openAuthModal = function (mode = "login") {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;

  window.toggleAuthMode(mode);
  overlay.classList.add("active");
  window.updateScrollLock();
};

window.closeAuthModal = function () {
  const overlay = document.getElementById("authOverlay");
  overlay?.classList.remove("active");
  window.updateScrollLock();
};

// Global utility to close all active overlays/modals
window.closeAllPopups = function () {
  // 1. Close Auth Modal
  window.closeAuthModal();

  // 2. Close Cart Sidebar
  if (window.cart && typeof window.cart.toggle === "function") {
    window.cart.toggle(false);
  }

  // 3. Close Product Details
  if (typeof window.closeProductDetails === "function") {
    window.closeProductDetails();
  }

  // 4. Close Checkout Modal
  if (window.cart && typeof window.cart.closeCheckoutModal === "function") {
    window.cart.closeCheckoutModal();
  }
};

// Listen for all Bootstrap modals to prevent scroll on <html> as well
document.addEventListener("show.bs.modal", () => {
  window.updateScrollLock();
});

document.addEventListener("shown.bs.modal", () => {
  window.updateScrollLock();
});

document.addEventListener("hidden.bs.modal", () => {
  window.updateScrollLock();
});

window.togglePasswordVisibility = function (id) {
  const input = document.getElementById(id);
  const icon = input.nextElementSibling.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
};

function getPasswordStrength(value) {
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const levels = [
    { cls: "weak", text: "Fraca - adicione letras e números" },
    { cls: "weak", text: "Fraca - continue a melhorar" },
    { cls: "fair", text: "Razoável - adicione caracteres especiais" },
    { cls: "good", text: "Forte - excelente escolha!" },
    { cls: "strong", text: "Muito forte - segurança máxima" },
  ];

  return levels[Math.min(score, levels.length - 1)];
}

function initializePasswordStrengthMeters() {
  document.querySelectorAll("[data-password-strength-input]").forEach((input) => {
    if (input.dataset.strengthReady === "true") return;

    const form = input.closest("form");
    const container = form?.querySelector("[data-password-strength-container]");
    const fill = form?.querySelector("[data-password-strength-fill]");
    const label = form?.querySelector("[data-password-strength-label]");

    if (!container || !fill || !label) return;

    input.dataset.strengthReady = "true";
    input.addEventListener("input", () => {
      const value = input.value;
      if (!value) {
        container.style.display = "none";
        fill.className = "strength-fill";
        label.className = "strength-label";
        label.textContent = "Mínimo 6 caracteres";
        return;
      }

      const strength = getPasswordStrength(value);
      container.style.display = "block";
      fill.className = `strength-fill ${strength.cls}`;
      label.className = `strength-label ${strength.cls}`;
      label.textContent = strength.text;
    });
  });
}

window.toggleAuthMode = function (mode) {
  const loginView = document.getElementById("login-view-v2");
  const registerView = document.getElementById("register-view-v2");
  const forgotView = document.getElementById("forgot-view-v2");
  const switcher = document.querySelector(".auth-switcher-v2");
  const pillLogin = document.getElementById("pill-login");
  const pillRegister = document.getElementById("pill-register");

  if (mode === "login") {
    if (loginView) loginView.style.display = "block";
    if (registerView) registerView.style.display = "none";
    if (forgotView) forgotView.style.display = "none";
    if (switcher) switcher.style.display = "flex";
    if (pillLogin) pillLogin.classList.add("active");
    if (pillRegister) pillRegister.classList.remove("active");
  } else if (mode === "register") {
    if (loginView) loginView.style.display = "none";
    if (registerView) registerView.style.display = "block";
    if (forgotView) forgotView.style.display = "none";
    if (switcher) switcher.style.display = "flex";
    if (pillLogin) pillLogin.classList.remove("active");
    if (pillRegister) pillRegister.classList.add("active");
  } else if (mode === "forgot") {
    if (loginView) loginView.style.display = "none";
    if (registerView) registerView.style.display = "none";
    if (forgotView) forgotView.style.display = "block";
    if (switcher) switcher.style.display = "none";
  }
};

// Smooth scrolling and scroll effects
window.addEventListener("scroll", () => {
  const nav = document.querySelector(".navbar-enhanced");
  if (window.scrollY > 50) {
    nav?.classList.add("scrolled");
  } else {
    nav?.classList.remove("scrolled");
  }
});

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  trackPageView(); // Global analytics
  setupAutoTracking(); // Automatic click tracking
  injectAuthModal();
  initializePasswordStrengthMeters();
  initializeAuthForms();
  updateNav(getLoggedUser());
  
  // Load dynamic menu
  await loadDynamicMenu();

  highlightActiveNavLink();

  // Inject language toggle into navbar
  injectLangToggle();

  // Initialize i18n (apply saved language)
  initI18n();

  // Apply admin-managed SEO title/description for the current page
  await applySiteSEO();

  // Cart logic
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => cart.toggle(true));
  }

  // Handle URL parameters like ?openAuth=login or ?openAuth=register
  const urlParams = new URLSearchParams(window.location.search);
  const openAuth = urlParams.get("openAuth");
  if (openAuth === "login" || openAuth === "register") {
    // Wait a brief moment for assets and i18n to load nicely
    setTimeout(() => {
      window.openAuthModal(openAuth);
    }, 150);
    // Clean URL parameters without reloading
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Load dynamic CMS content for the current page
  await loadCMSContent();

  // Load dynamic friendly URLs cache
  await loadSiteSlugsCache();

  // Apply friendly URLs to all links on load
  if (typeof applyFriendlyUrlsToDOM === "function") {
    applyFriendlyUrlsToDOM();
  }
});

async function applySiteSEO() {
  const pageKeyByFile = {
    "": "inicio",
    "index.html": "inicio",
    "inicio": "inicio",
    "shop.html": "loja",
    "loja": "loja",
    "about.html": "sobre",
    "sobre-nos": "sobre",
    "contact.html": "contactos",
    "contactos": "contactos",
    "workshops.html": "workshops",
    "workshops": "workshops",
    "curiosidades.html": "curiosidades",
    "curiosidades": "curiosidades",
    "comunidade.html": "comunidade",
    "comunidade": "comunidade",
    "apicultores.html": "apicultores",
    "apicultores": "apicultores",
    "rede-social.html": "social",
    "rede-social": "social",
  };

  const fileName = window.location.pathname.split("/").pop() || "index.html";
  const pageKey = pageKeyByFile[fileName];
  if (!pageKey) return;

  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) return;

    const response = await fetch(`${API_URL}/site-slugs`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;

    const pages = await response.json();
    const current = pages.find((page) => page.Pagina === pageKey);
    if (!current) return;

    if (current.Titulo_SEO) {
      document.title = current.Titulo_SEO;
    }

    if (current.Descricao_SEO) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", current.Descricao_SEO);
    }
  } catch (error) {
    console.warn("SEO settings not available, using static page metadata.", error);
  }
}

function injectLangToggle() {
  const navbarRight = document.querySelector(".navbar-right-fixed");
  if (!navbarRight) return;
  if (navbarRight.querySelector("#lang-toggle-btn")) return; // Evitar duplicados!

  const langContainer = document.createElement("div");
  langContainer.className = "me-3 d-flex align-items-center";
  langContainer.innerHTML = createLangToggle();
  navbarRight.insertBefore(langContainer, navbarRight.firstChild);
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Check if current path ends with the href OR if it's the root/index
    const isHome =
      (currentPath === "/" || currentPath.endsWith("index.html")) &&
      href === "index.html";
    const isMatch = currentPath.endsWith(href);

    if (isHome || (href !== "index.html" && isMatch)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function injectAuthModal() {
  // Force remove existing modal to ensure updates (dev fix)
  const existing = document.getElementById("authOverlay");
  if (existing) existing.remove();

  const modalHtml = `
    <div class="auth-overlay" id="authOverlay">
      <div class="auth-card-v2">
        <div class="auth-header-row">
          <div class="auth-logo-v2">
            <img src="/images/logo_hexomel.webp" alt="Hexomel Logo" style="height: 50px; width: auto;">
          </div>
          <div class="auth-header-right-v2">
            <div class="auth-switcher-v2">
              <button class="auth-pill active" id="pill-login" onclick="window.toggleAuthMode('login')">Entrar</button>
              <button class="auth-pill" id="pill-register" onclick="window.toggleAuthMode('register')">Criar conta</button>
            </div>
            <button class="auth-close-v2" onclick="window.closeAuthModal()">&times;</button>
          </div>
        </div>

        <!-- Login View -->
        <div id="login-view-v2">
          <form id="loginFormV2">
            <div class="auth-field-v2">
              <label class="auth-label-v2">Email ou nome de utilizador</label>
              <input type="text" id="login-email-v2" class="auth-input-v2" placeholder="email@exemplo.com ou username" required autocomplete="username">
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Password</label>
              <div class="password-wrapper-v2">
                <input type="password" id="login-password-v2" class="auth-input-v2" placeholder="Sua password" required>
                <button type="button" class="password-toggle-v2" onclick="window.togglePasswordVisibility('login-password-v2')">
                  <i class="far fa-eye"></i>
                </button>
              </div>
            </div>
            <a href="#" class="forgot-password-link-v2" onclick="window.toggleAuthMode('forgot')">Esqueceu-se da palavra-passe?</a>
            <button type="submit" class="auth-btn-primary" id="login-submit-v2">Entrar</button>
          </form>

          <div class="auth-divider-v2">ou</div>

          <!-- Google Login Button Placeholder -->
          <div id="google-signin-button-v2" class="d-flex justify-content-center"></div>
        </div>

        <!-- Register View -->
        <div id="register-view-v2" style="display: none;">
          <form id="registerFormV2">
            <div class="auth-field-v2">
              <label class="auth-label-v2">Nome completo</label>
              <input type="text" id="register-name-v2" class="auth-input-v2" placeholder="Como queres aparecer" required>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Nome de utilizador</label>
              <input type="text" id="register-username-v2" class="auth-input-v2" placeholder="Ex: joao_silva" required>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Email</label>
              <input type="email" id="register-email-v2" class="auth-input-v2" placeholder="nome@exemplo.com" required>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Password</label>
              <div class="password-wrapper-v2">
                <input type="password" id="register-password-v2" class="auth-input-v2" placeholder="Mínimo 6 caracteres" data-password-strength-input required>
                <button type="button" class="password-toggle-v2" onclick="window.togglePasswordVisibility('register-password-v2')">
                  <i class="far fa-eye"></i>
                </button>
              </div>
              <div class="strength-container" data-password-strength-container style="display: none;">
                <div class="strength-track">
                  <div class="strength-fill" data-password-strength-fill></div>
                </div>
                <span class="strength-label" data-password-strength-label>Mínimo 6 caracteres</span>
              </div>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Confirmar password</label>
              <div class="password-wrapper-v2">
                <input type="password" id="register-confirm-v2" class="auth-input-v2" placeholder="Repete a password" required>
                <button type="button" class="password-toggle-v2" onclick="window.togglePasswordVisibility('register-confirm-v2')">
                  <i class="far fa-eye"></i>
                </button>
              </div>
            </div>
            <label class="terms-label-v2">
              <input type="checkbox" id="terms-checkbox-v2" required>
              <span>Aceito os <a href="#" class="terms-link">Termos e Condições</a></span>
            </label>
            <button type="submit" class="auth-btn-primary" id="register-submit-v2">Criar conta</button>
          </form>
        </div>

        <!-- Forgot Password View -->
        <div id="forgot-view-v2" style="display: none;">
          <form id="forgotFormV2">
            <p class="text-muted small text-center mb-3">Introduza o seu email ou nome de utilizador.<br>Enviaremos um link seguro para redefinir o acesso.</p>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Email ou nome de utilizador</label>
              <input type="text" id="forgot-identity-v2" class="auth-input-v2" placeholder="Email ou nome de utilizador" required autocomplete="username">
            </div>
            <button type="submit" class="auth-btn-primary" id="forgot-submit-v2">Enviar Link de Recuperação</button>
            <a href="#" class="forgot-password-link-v2 text-center d-block mt-3" onclick="window.toggleAuthMode('login')" style="text-align: center; margin-top: 15px !important; display: block;">Voltar para Iniciar Sessão</a>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Bind forgot password form handler
  const forgotForm = document.getElementById("forgotFormV2");
  if (forgotForm) {
    let forgotSubmitting = false;
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (forgotSubmitting) return;

      const identity = document.getElementById("forgot-identity-v2").value.trim();
      if (!identity) return;

      forgotSubmitting = true;
      const submitBtn = document.getElementById("forgot-submit-v2");
      if (submitBtn) submitBtn.disabled = true;

      Swal.fire({
        title: "A processar...",
        text: "Por favor, aguarde enquanto validamos o seu pedido.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const backendAvailable = await ensureBackendReady();
        if (!backendAvailable) {
          throw new Error("O servidor ainda está a iniciar. Tente novamente dentro de alguns segundos.");
        }

        const response = await fetch(`${API_URL}/auth/forgot-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ identity })
        });

        const data = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(data.error || "Erro ao solicitar redefinição.");
        }

        window.closeAuthModal();

        Swal.fire({
          icon: "success",
          title: "Email Enviado!",
          text: data.message,
          confirmButtonText: "Ok",
          confirmButtonColor: "#1a4d2e"
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Erro no Pedido",
          text: error.message,
          confirmButtonText: "Fechar",
          confirmButtonColor: "#dc3545"
        });
      } finally {
        forgotSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

export async function loadDynamicMenu() {
  const navList = document.querySelector("#navbarNav ul.navbar-nav");
  if (!navList) return;

  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) return;

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
          else if (m.Link === "rede-social.html") i18nAttr = 'data-i18n="nav.social"';

          if (children.length > 0) {
            const childrenHtml = children.map(c => {
              const cTarget = c.Abrir_Nova_Aba ? 'target="_blank" rel="noopener noreferrer"' : '';
              let cI18n = "";
              if (c.Link === "curiosidades.html") cI18n = 'data-i18n="nav.curiosities"';
              else if (c.Link === "aprender.html") cI18n = 'data-i18n="nav.learn"';
              else if (c.Link === "comunidade.html") cI18n = 'data-i18n="nav.community"';
              else if (c.Link === "rede-social.html") cI18n = 'data-i18n="nav.social"';
              else if (c.Link && c.Link.includes("tab=messages")) cI18n = 'data-i18n="nav.messages"';
              
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

      // Re-trigger highlight
      highlightActiveNavLink();
      
      // Translate dynamic items
      if (typeof initI18n === "function") {
        initI18n();
      }

      // Apply friendly URLs to dynamic menu items
      if (typeof applyFriendlyUrlsToDOM === "function") {
        applyFriendlyUrlsToDOM();
      }
    }
  } catch (error) {
    console.warn("Could not load dynamic menu, using static HTML fallback:", error);
  }
}

/**
 * Loads dynamic CMS content from the backend and injects it into the current page.
 * Maps page filenames to CMS page keys, then maps block keys to CSS selectors.
 * Falls back gracefully to static HTML content if the API is unreachable.
 */
async function loadCMSContent() {
  // Determine current page key from URL
  const path = window.location.pathname.replace(/^\//, "").replace(/\.html$/, "") || "index";
  
  const pageKeyMap = {
    "index": "home",
    "": "home",
    "inicio": "home",
    "about": "about",
    "sobre-nos": "about",
    "about.html": "about",
    "contact": "contact",
    "contactos": "contact",
    "contact.html": "contact",
  };

  const pageKey = pageKeyMap[path];
  if (!pageKey) return; // No CMS mapping for this page

  // Map of CMS block keys to CSS selectors for each page
  const selectorMap = {
    home: {
      hero_title: ".hero-title, [data-i18n='home.title']",
      hero_subtitle: ".hero-subtitle, [data-i18n='home.subtitle']",
      featured_title: "h2[data-i18n='home.collection'], .featured-collection-title",
      featured_subtitle: "span[data-i18n='home.selection'], .featured-collection-subtitle",
    },
    about: {
      hero_title: ".about-hero-title, [data-i18n-html='about.title']",
      hero_subtitle: ".about-hero-subtitle, [data-i18n='about.subtitle']",
      legacy_text: ".about-legacy-text",
    },
    contact: {
      hero_title: ".contact-hero-title",
      hero_subtitle: ".contact-hero-subtitle",
    },
  };

  const i18nKeyMap = {
    home: {
      hero_title: "home.title",
      hero_subtitle: "home.subtitle",
      featured_title: "home.collection",
      featured_subtitle: "home.selection",
    },
    about: {
      hero_title: "about.title",
      hero_subtitle: "about.subtitle",
      legacy_text: "about.story.p2",
    },
    contact: {
      hero_title: "contact.title",
      hero_subtitle: "contact.subtitle",
    }
  };

  const selectors = selectorMap[pageKey];
  if (!selectors) return;

  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) return;

    const response = await fetch(`/api/cms/${pageKey}`);
    if (!response.ok) throw new Error("CMS fetch failed");
    const blocks = await response.json();

    if (!blocks || blocks.length === 0) return;

    // Load i18n module to update cache
    const i18nModule = await import("./i18n.js");

    for (const block of blocks) {
      const selector = selectors[block.Block_Key];
      if (!selector) continue;

      // Update translation cache in i18n
      const i18nKey = i18nKeyMap[pageKey]?.[block.Block_Key];
      if (i18nKey && i18nModule && typeof i18nModule.updateTranslation === "function") {
        i18nModule.updateTranslation(i18nKey, "pt", block.Content_Value);
      }

      const el = document.querySelector(selector);
      if (!el) continue;

      if (block.Type === "html") {
        el.innerHTML = block.Content_Value;
      } else if (block.Type === "image_url") {
        if (el.tagName === "IMG") {
          el.src = block.Content_Value;
        } else {
          el.style.backgroundImage = `url('${block.Content_Value}')`;
        }
      } else {
        // text type — set textContent to preserve XSS safety
        el.textContent = block.Content_Value;
      }
    }

    console.log(`✅ CMS content loaded for page: ${pageKey}`);
  } catch (error) {
    console.warn("CMS content not available, using static HTML fallback:", error);
  }
}

let siteSlugsCache = null;

export function checkCanonicalUrl() {
  if (!siteSlugsCache) return;
  
  const currentPath = window.location.pathname;
  const fileName = currentPath.split('/').pop() || '';
  
  const fileToPageKey = {
    'index.html': 'inicio',
    'shop.html': 'loja',
    'about.html': 'sobre',
    'contact.html': 'contactos',
    'workshops.html': 'workshops',
    'curiosidades.html': 'curiosidades',
    'aprender.html': 'aprender',
    'comunidade.html': 'comunidade',
    'apicultores.html': 'apicultores',
    'rede-social.html': 'social'
  };
  
  const pageKeyToDefaultSlug = {
    inicio: 'inicio',
    loja: 'loja',
    sobre: 'sobre-nos',
    contactos: 'contactos',
    workshops: 'workshops',
    curiosidades: 'curiosidades',
    aprender: 'aprender',
    comunidade: 'comunidade',
    apicultores: 'apicultores',
    social: 'rede-social'
  };

  let currentPageKey = null;
  
  if (fileToPageKey[fileName]) {
    currentPageKey = fileToPageKey[fileName];
  } else {
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');
    const foundBySlug = siteSlugsCache.find(p => p.Slug === cleanPath);
    if (foundBySlug) {
      return;
    }
    
    const foundByDefault = Object.entries(pageKeyToDefaultSlug).find(([key, def]) => def === cleanPath);
    if (foundByDefault) {
      currentPageKey = foundByDefault[0];
    }
  }
  
  if (currentPageKey) {
    const pageConfig = siteSlugsCache.find(p => p.Pagina === currentPageKey);
    if (pageConfig && pageConfig.Slug) {
      const canonicalPath = '/' + pageConfig.Slug;
      if (currentPath !== canonicalPath) {
        window.history.replaceState(null, '', canonicalPath + window.location.search + window.location.hash);
      }
    }
  }
}

export async function loadSiteSlugsCache() {
  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) return;
    const response = await fetch(`${API_URL}/site-slugs`, {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      siteSlugsCache = await response.json();
      applyFriendlyUrlsToDOM();
      checkCanonicalUrl();
    }
  } catch (error) {
    console.warn("Could not load site-slugs cache:", error);
  }
}

export function toFriendlyUrl(url) {
  if (!url) return url;
  
  if (url.startsWith('http') && !url.includes(window.location.host)) {
    return url;
  }
  
  try {
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname.split('/').pop() || '';
    
    const fileToPageKey = {
      'index.html': 'inicio',
      'shop.html': 'loja',
      'about.html': 'sobre',
      'contact.html': 'contactos',
      'workshops.html': 'workshops',
      'curiosidades.html': 'curiosidades',
      'aprender.html': 'aprender',
      'comunidade.html': 'comunidade',
      'apicultores.html': 'apicultores',
      'rede-social.html': 'social'
    };
    
    const pageKey = fileToPageKey[pathname];
    if (pageKey) {
      let customSlug = null;
      if (siteSlugsCache) {
        const found = siteSlugsCache.find(p => p.Pagina === pageKey);
        if (found && found.Slug) {
          customSlug = found.Slug;
        }
      }
      
      if (!customSlug) {
        const defaults = {
          inicio: 'inicio',
          loja: 'loja',
          sobre: 'sobre-nos',
          contactos: 'contactos',
          workshops: 'workshops',
          curiosidades: 'curiosidades',
          aprender: 'aprender',
          comunidade: 'comunidade',
          apicultores: 'apicultores',
          social: 'rede-social'
        };
        customSlug = defaults[pageKey];
      }
      
      urlObj.pathname = '/' + customSlug;
    } else if (pathname === 'produto.html') {
      const slug = urlObj.searchParams.get('slug');
      if (slug) {
        urlObj.pathname = `/produto/${slug}`;
        urlObj.search = ''; // clear query parameter
      }
    }
    
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (e) {
    return url;
  }
}

export function applyFriendlyUrlsToDOM() {
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      const friendly = toFriendlyUrl(href);
      if (friendly !== href) {
        link.setAttribute('href', friendly);
      }
    }
  });
}

window.toFriendlyUrl = toFriendlyUrl;
window.applyFriendlyUrlsToDOM = applyFriendlyUrlsToDOM;
window.loadSiteSlugsCache = loadSiteSlugsCache;
window.checkCanonicalUrl = checkCanonicalUrl;
