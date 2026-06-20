import Swal from "sweetalert2";
import { API_URL, getPublicConfig } from "./api.js";
let isHandlingSessionExpiry = false;
let googleInitialized = false;

// Register and Login Listeners (now initialized via main.js after injection)
export const initializeAuthForms = () => {
  const registerForm = document.getElementById("registerFormV2");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("register-name-v2").value;
      const username = document.getElementById("register-username-v2").value;
      const email = document.getElementById("register-email-v2").value;
      const password = document.getElementById("register-password-v2").value;
      const confirmPassword = document.getElementById(
        "register-confirm-v2",
      ).value;

      if (password !== confirmPassword) {
        window.closeAllPopups(); // Ensure modal is closed before alert
        return Swal.fire("Erro", "As passwords não coincidem", "error");
      }

      // Split name for current backend compatibility
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            username,
            password,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (typeof window.closeAuthModal === "function") {
            window.closeAuthModal();
          }

          if (data.requiresVerification) {
            Swal.fire({
              icon: "info",
              title: "Verifica o teu email",
              text:
                data.message ||
                "Enviámos um link de ativação para o teu email.",
              confirmButtonColor: "#1a4d2e",
            });
            return;
          }

          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          if (typeof updateNav === "function") {
            updateNav(data.user);
          }

          Swal.fire({
            icon: "success",
            title: "Conta criada!",
            text: "Vamos completar o teu perfil para poderes receber encomendas.",
            showConfirmButton: false,
            timer: 2000,
          }).then(() => {
            window.location.href = "profile.html?tab=dados&welcome=1";
          });
        } else {
          window.closeAllPopups();
          Swal.fire("Erro", data.error, "error");
        }
      } catch (error) {
        console.error("Registration failed:", error);
        window.closeAllPopups();
        Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
      }
    });
  }

  const loginForm = document.getElementById("loginFormV2");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const identifier = document.getElementById("login-email-v2").value;
      const password = document.getElementById("login-password-v2").value;

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          updateNav(data.user);

          // Close custom modal immediately
          if (typeof window.closeAuthModal === "function") {
            window.closeAuthModal();
          }

          const role =
            data.user.role || data.user.userType || data.user.UserType;

          // Check if profile is incomplete (first login after verification)
          const hasAddress = data.user.address || data.user.Morada;
          const hasPhone = data.user.phone || data.user.Telefone;
          const isProfileIncomplete = !hasAddress || !hasPhone;

          Swal.fire({
            icon: "success",
            title: `Bem-vindo de volta!`,
            showConfirmButton: false,
            timer: 1500,
          }).then(() => {
            if (role?.toLowerCase() === "admin") {
              const urlParams = new URLSearchParams(window.location.search);
              const isAdminSecret = urlParams.get("admin") === "true";
              if (!isAdminSecret) {
                clearSession();
                updateNav(null);
                Swal.fire({
                  icon: "warning",
                  title: "Acesso Restrito",
                  text: "Contas de administrador apenas podem iniciar sessão a partir do URL dedicado.",
                  confirmButtonColor: "#1a4d2e"
                });
                return;
              }
              window.location.href = "/admin";
            } else if (isProfileIncomplete) {
              window.location.href = "profile.html?tab=dados&welcome=1";
            } else {
              const urlParams = new URLSearchParams(window.location.search);
              const redirectUrl = urlParams.get("redirect");
              if (redirectUrl) {
                window.location.href = redirectUrl;
              } else {
                window.location.reload();
              }
            }
          });
        } else {
          window.closeAllPopups();
          if (data.unverified) {
            Swal.fire({
              icon: "warning",
              title: "Email não verificado",
              text: data.message,
              confirmButtonColor: "#b45309",
            });
          } else {
            Swal.fire("Login Falhou", data.error, "error");
          }
        }
      } catch (error) {
        console.error("Login failed:", error);
        window.closeAllPopups();
        Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
      }
    });
  }
};

// Check logged in state on other pages
export const getLoggedUser = () => {
  const user = localStorage.getItem("user");
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    clearSession();
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getAuthToken = () => {
  const token = localStorage.getItem("token");
  if (!token || token === "undefined" || token === "null") {
    return null;
  }
  return token;
};

export const buildAuthHeaders = (headers = {}) => {
  const token = getAuthToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

export const isAuthFailure = (status, errorMessage = "") => {
  if (![401, 403].includes(status)) {
    return false;
  }

  const normalizedMessage = String(errorMessage).toLowerCase();
  return (
    normalizedMessage === "" ||
    normalizedMessage.includes("token") ||
    normalizedMessage.includes("session") ||
    normalizedMessage.includes("access denied") ||
    normalizedMessage.includes("jwt")
  );
};

export const handleSessionExpired = async (
  message = "A tua sessão expirou ou deixou de ser válida. Inicia sessão novamente.",
) => {
  if (isHandlingSessionExpiry) return;
  isHandlingSessionExpiry = true;

  // Hide the main content to avoid showing protected data behind the alert
  const mainEl = document.querySelector("main");
  if (mainEl) mainEl.style.display = "none";

  clearSession();
  updateNav(null);

  await Swal.fire({
    icon: "warning",
    title: "Sessão expirada",
    text: message,
    confirmButtonColor: "#f4b400",
  });

  isHandlingSessionExpiry = false;
  window.location.href = "/";
};

export const logout = () => {
  clearSession();
  window.location.href = "/";
};

// Google Auth Integration
export const initializeGoogleAuth = async () => {
  if (!window.google || googleInitialized) return;

  const { googleClientId } = await getPublicConfig();
  if (!googleClientId) return;

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCallback,
  });

  googleInitialized = true;

  const buttonDiv = document.getElementById("google-signin-button-v2");
  if (buttonDiv) {
    buttonDiv.innerHTML = "";
    window.google.accounts.id.renderButton(buttonDiv, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: "300",
    });
  }
};

const handleGoogleCallback = async (response) => {
  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      updateNav(data.user);

      if (typeof window.closeAuthModal === "function") {
        window.closeAuthModal();
      }

      Swal.fire({
        icon: "success",
        title: "Login Efetuado",
        text: `Bem-vindo, ${data.user.name}!`,
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get("redirect");
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          window.location.reload();
        }
      });
    } else {
      window.closeAllPopups();
      Swal.fire(
        "Login Falhou",
        data.error || "Autenticação Google falhou",
        "error",
      );
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    window.closeAllPopups();
    Swal.fire("Erro", "Erro na autenticação externa", "error");
  }
};

// Auto-init for Google Auth on window load
window.addEventListener("load", () => {
  initializeGoogleAuth().catch((error) => {
    console.error("Google init failed:", error);
  });
});

// Navbar Logic
// Update Navigation based on login status
export function updateNav(user) {
  const authSection = document.getElementById("authSection");
  const cartIconContainer = document.querySelector(".cart-navbar-separate");
  if (!authSection) return;

  // Check if we already rendered this specific state to prevent flashing
  const currentState = authSection.getAttribute("data-user-state");
  const newState = user
    ? `logged-${user.id || user.ID_Utilizador || user.email}`
    : "guest";

  if (currentState === newState && authSection.classList.contains("loaded")) {
    return; // Already rendered correctly
  }

  // If we are in the middle of a transition from pre-load to full load,
  // and the state matches, we might still want to render to ensure
  // all event listeners and dynamic data are attached.

  // Toggle cart visibility based on session
  if (cartIconContainer) {
    cartIconContainer.style.display = user ? "flex" : "none";
  }

  authSection.setAttribute("data-user-state", newState);

  if (user) {
    // Prioritize picture, then avatar, then default
    const avatar =
      user.picture && user.picture.trim() !== ""
        ? user.picture
        : user.avatar || "/images/default-user.png";
    const firstName = user.name?.split(" ")[0] || user.firstName || "User";

    authSection.innerHTML = `
      <div class="d-flex align-items-center gap-3">
          <!-- Profile Dropdown -->
          <div class="dropdown">
              <div class="profile-avatar-container" data-bs-toggle="dropdown" aria-expanded="false">
                  <img src="${avatar}" alt="User" class="user-avatar-navbar" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/images/default-user.png'">
                  <span class="user-name-navbar d-none d-md-block">${firstName}</span>
              </div>
              <ul class="dropdown-menu dropdown-menu-end dropdown-menu-premium animate-fade-in">
                  <li class="px-3 py-2 border-bottom">
                      <p class="mb-0 fw-bold small text-truncate" style="max-width: 150px">${user.name || user.firstName} ${user.lastName ?? ""}</p>
                      <p class="mb-0 text-muted smaller">${
                        user.role?.toLowerCase() === "admin"
                          ? "Administrador"
                          : user.role?.toLowerCase() === "apicultor"
                            ? "Apicultor"
                            : "Cliente"
                      }</p>
                  </li>
                  <li><a class="dropdown-item dropdown-item-premium mt-1" href="profile.html"><i class="fas fa-user-circle me-2"></i> <span data-i18n="nav.profile">Perfil</span></a></li>
                  <li><a class="dropdown-item dropdown-item-premium" href="rede-social.html?tab=chat"><i class="fas fa-comments me-2"></i> <span data-i18n="nav.messages">Mensagens</span></a></li>
                  <li><a class="dropdown-item dropdown-item-premium" href="rede-social.html"><i class="fas fa-users me-2"></i> <span data-i18n="nav.social">HexoHive</span></a></li>

                  ${
                    user.role?.toLowerCase() === "admin"
                      ? '<li><a class="dropdown-item dropdown-item-premium" href="/admin"><i class="fas fa-cog me-2"></i> Admin</a></li>'
                      : ""
                  }
                  ${
                    user.role?.toLowerCase() === "apicultor"
                      ? '<li><a class="dropdown-item dropdown-item-premium" href="dashboard-apicultor.html"><i class="fas fa-leaf me-2"></i> Painel Apicultor</a></li>'
                      : ""
                  }
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

    // Incomplete Profile Notification Logic
    const phone = user.phone || user.Telefone;
    const address = user.address || user.Morada;
    const isVerified = user.isVerified || user.Is_Verified;
    
    setTimeout(() => {
       const existingBanner = document.getElementById("profile-incomplete-banner");
       
       // Verification reminder
       if (!isVerified && !sessionStorage.getItem("hideVerifyBanner")) {
          if (window.toast) {
            window.toast.info(
              "Por favor, verifique o seu email para ativar todas as funcionalidades da sua conta.", 
              "Conta Não Verificada"
            );
            sessionStorage.setItem("hideVerifyBanner", "true");
          }
       }

       if (!phone || !address) {
         if (!sessionStorage.getItem("hideProfileBanner") && window.location.pathname.indexOf('profile.html') === -1 && window.location.pathname.indexOf('checkout.html') === -1) {
           sessionStorage.setItem("hideProfileBanner", "true"); // mark as shown so it doesn't spam on every un-related navigation
           
           if (window.toast) {
             window.toast.warning(
               '<a href="profile.html?tab=dados" style="color:var(--primary-green);text-decoration:none;font-weight:600;">completar perfil</a>', 
               "Perfil incompleto"
             );
           }
         }
       } else if (existingBanner) {
         existingBanner.remove();
       }
    }, 1200);

  } else {
    const isAuthPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html") || window.location.pathname.includes("verify-email.html") || window.location.pathname.includes("recuperar.html");
    authSection.innerHTML = isAuthPage ? "" : `
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-nav-auth-filled" data-i18n="auth.login" onclick="window.openAuthModal('login')">Iniciar Sessão</button>
      </div>
    `;
  }

  // Re-apply i18n if language is not PT (since we just injected new DOM)
  try {
    import('./i18n.js').then(({ getLang, initI18n }) => {
      if (getLang() !== 'pt') initI18n();
    });
  } catch(e) { /* ignore if i18n not loaded */ }

  // Add the loaded class with a tiny delay to trigger CSS transition anti-FOUC
  setTimeout(() => {
    authSection.classList.add("loaded");
    if (cartIconContainer) cartIconContainer.classList.add("loaded");
  }, 10);
}


// Auto-initialize if on standalone auth pages
if (
  typeof document !== "undefined" &&
  (window.location.pathname.includes("login.html") ||
    window.location.pathname.includes("register.html"))
) {
  document.addEventListener("DOMContentLoaded", initializeAuthForms);
}
