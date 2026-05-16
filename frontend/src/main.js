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
    const target = document.querySelector(this.getAttribute("href"));
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
window.openAuthModal = function (mode = "login") {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;

  window.toggleAuthMode(mode);
  overlay.classList.add("active");
  document.documentElement.classList.add("modal-open"); // Prevent scroll
};

window.closeAuthModal = function () {
  const overlay = document.getElementById("authOverlay");
  overlay?.classList.remove("active");
  document.documentElement.classList.remove("modal-open");
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

window.toggleAuthMode = function (mode) {
  const loginView = document.getElementById("login-view-v2");
  const registerView = document.getElementById("register-view-v2");
  const pillLogin = document.getElementById("pill-login");
  const pillRegister = document.getElementById("pill-register");

  if (mode === "login") {
    loginView.style.display = "block";
    registerView.style.display = "none";
    pillLogin.classList.add("active");
    pillRegister.classList.remove("active");
  } else {
    loginView.style.display = "none";
    registerView.style.display = "block";
    pillLogin.classList.remove("active");
    pillRegister.classList.add("active");
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
document.addEventListener("DOMContentLoaded", () => {
  trackPageView(); // Global analytics
  setupAutoTracking(); // Automatic click tracking
  injectAuthModal();
  initializeAuthForms();
  updateNav(getLoggedUser());
  highlightActiveNavLink();

  // Inject language toggle into navbar
  injectLangToggle();

  // Initialize i18n (apply saved language)
  initI18n();

  // Cart logic
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => cart.toggle(true));
  }
});

function injectLangToggle() {
  const navbarRight = document.querySelector(".navbar-right-fixed");
  if (!navbarRight) return;
  // Insert before cart
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
            <a href="#" class="forgot-password-link-v2">Esqueceu-se da palavra-passe?</a>
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
                <input type="password" id="register-password-v2" class="auth-input-v2" placeholder="Mínimo 6 caracteres" required>
                <button type="button" class="password-toggle-v2" onclick="window.togglePasswordVisibility('register-password-v2')">
                  <i class="far fa-eye"></i>
                </button>
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
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Close when clicking outside the card
  // Close when clicking outside the card (DISABLED as per user request)
  // document.getElementById("authOverlay").addEventListener("click", (e) => {
  //   if (e.target.id === "authOverlay") {
  //     window.closeAuthModal();
  //   }
  // });
}
