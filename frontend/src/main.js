import "./styles/index.css";
// import "./styles/modern.css";
// Note: modern.css is loaded via HTML now to avoid FOUC
import {
  getLoggedUser,
  logout,
  initializeGoogleAuth,
  initializeAuthForms,
} from "./auth.js";
import { cart } from "./cart.js";
import Swal from "sweetalert2";

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

// Navbar Logic
// Update Navigation based on login status
export function updateNav(user) {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;

  if (user) {
    const avatar = user.avatar || "/public/default-avatar.png";

    authSection.innerHTML = `
      <div class="d-flex align-items-center gap-3">
          <!-- Profile Dropdown -->
          <div class="dropdown">
              <div class="profile-avatar-container" data-bs-toggle="dropdown" aria-expanded="false">
                  <img src="${avatar}" alt="User" class="user-avatar-navbar">
              </div>
              <ul class="dropdown-menu dropdown-menu-end dropdown-menu-premium animate-fade-in">
                  <li class="px-3 py-2 border-bottom">
                      <p class="mb-0 fw-bold small text-truncate" style="max-width: 150px">${user.firstName} ${user.lastName}</p>
                      <p class="mb-0 text-muted smaller">${user.userType === "admin" ? "Administrador" : "Membro Premium"}</p>
                  </li>
                  <li><a class="dropdown-item dropdown-item-premium mt-1" href="profile.html"><i class="fas fa-user-circle me-2"></i> Perfil</a></li>
                  <li><a class="dropdown-item dropdown-item-premium" href="orders.html"><i class="fas fa-history me-2"></i> Encomendas</a></li>
                  ${user.userType === "admin" ? '<li><a class="dropdown-item dropdown-item-premium" href="admin.html"><i class="fas fa-cog me-2"></i> Admin</a></li>' : ""}
                  <li><hr class="dropdown-divider opacity-50"></li>
                  <li><a class="dropdown-item dropdown-item-premium text-danger" href="#" id="logout-btn"><i class="fas fa-sign-out-alt me-2"></i> Sair</a></li>
              </ul>
          </div>
      </div>
    `;

    document.getElementById("logout-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    authSection.innerHTML = `
      <button class="btn btn-nav-auth-filled" onclick="window.openAuthModal('login')">Iniciar Sessão</button>
      <button class="btn btn-nav-auth-outline" onclick="window.openAuthModal('register')">Criar Conta</button>
    `;
  }
}

// Custom Auth Modal Logic (Vercel Style)
window.openAuthModal = function (mode = "login") {
  const overlay = document.getElementById("authOverlay");
  if (!overlay) return;

  window.toggleAuthMode(mode);
  overlay.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent scroll
};

window.closeAuthModal = function () {
  const overlay = document.getElementById("authOverlay");
  overlay?.classList.remove("active");
  document.body.style.overflow = "";
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

// Initialize Google Sign-In
function initGoogleAuth() {
  if (typeof google === "undefined") return;

  const handleCredentialResponse = async (response) => {
    // Handle auth...
  };

  const initOptions = {
    client_id:
      "725619379632-15fbe8v4ivueo5p8rkgisvvev6lquf5m.apps.googleusercontent.com",
    callback: handleCredentialResponse,
  };

  google.accounts.id.initialize(initOptions);

  const loginBtn = document.getElementById("google-signin-button");
  if (loginBtn)
    google.accounts.id.renderButton(loginBtn, {
      theme: "outline",
      size: "large",
      width: "100%",
    });

  const shopBtn = document.getElementById("google-signin-button-shop");
  if (shopBtn)
    google.accounts.id.renderButton(shopBtn, {
      theme: "outline",
      size: "large",
      width: "100%",
    });
}

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
  injectAuthModal();
  initializeAuthForms();
  updateNav(getLoggedUser());
  initGoogleAuth();

  // Cart logic
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => cart.toggle(true));
  }
});

function injectAuthModal() {
  if (document.getElementById("authOverlay")) return;

  const modalHtml = `
    <div class="auth-overlay" id="authOverlay">
      <div class="auth-card-v2">
        <div class="auth-header-row">
          <div class="auth-logo-v2">Hexomel</div>
          <div class="auth-switcher-v2">
            <button class="auth-pill active" id="pill-login" onclick="window.toggleAuthMode('login')">Entrar</button>
            <button class="auth-pill" id="pill-register" onclick="window.toggleAuthMode('register')">Criar conta</button>
          </div>
          <button class="auth-close-v2" onclick="window.closeAuthModal()">&times;</button>
        </div>

        <!-- Login View -->
        <div id="login-view-v2">
          <form id="loginFormV2">
            <div class="auth-field-v2">
              <label class="auth-label-v2">Email</label>
              <input type="email" id="login-email-v2" class="auth-input-v2" placeholder="nome@exemplo.com" required>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Password</label>
              <input type="password" id="login-password-v2" class="auth-input-v2" placeholder="Sua password" required>
            </div>
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
              <label class="auth-label-v2">Email</label>
              <input type="email" id="register-email-v2" class="auth-input-v2" placeholder="nome@exemplo.com" required>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Password</label>
              <input type="password" id="register-password-v2" class="auth-input-v2" placeholder="Mínimo 6 caracteres" required>
            </div>
            <div class="auth-field-v2">
              <label class="auth-label-v2">Confirmar password</label>
              <input type="password" id="register-confirm-v2" class="auth-input-v2" placeholder="Repete a password" required>
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
}
