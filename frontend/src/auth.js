import Swal from "sweetalert2";
const API_URL = "/api";

// Register and Login Listeners (now initialized via main.js after injection)
export const initializeAuthForms = () => {
  const registerForm = document.getElementById("registerFormV2");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("register-name-v2").value;
      const email = document.getElementById("register-email-v2").value;
      const password = document.getElementById("register-password-v2").value;
      const confirmPassword = document.getElementById(
        "register-confirm-v2",
      ).value;

      if (password !== confirmPassword) {
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
          body: JSON.stringify({ firstName, lastName, email, password }),
        });

        const data = await res.json();
        if (res.ok) {
          // Auto-login on register
          if (data.token && data.user) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            updateNav(data.user);
          }

          // Close modal immediately
          if (typeof window.closeAuthModal === "function") {
            window.closeAuthModal();
          }

          Swal.fire({
            icon: "success",
            title: "Bem-vindo!",
            text: "Conta criada com sucesso. A iniciar sessão...",
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            window.location.reload();
          });
        } else {
          if (typeof window.closeAuthModal === "function") {
            window.closeAuthModal();
          }
          Swal.fire("Erro", data.error, "error");
        }
      } catch (error) {
        console.error("Registration failed:", error);
        if (typeof window.closeAuthModal === "function") {
          window.closeAuthModal();
        }
        Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
      }
    });
  }

  const loginForm = document.getElementById("loginFormV2");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email-v2").value;
      const password = document.getElementById("login-password-v2").value;

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
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

          Swal.fire({
            icon: "success",
            title: `Bem-vindo de volta!`,
            showConfirmButton: false,
            timer: 1500,
          }).then(() => {
            if (role?.toLowerCase() === "admin") {
              window.location.href = "admin.html";
            } else {
              window.location.reload();
            }
          });
        } else {
          if (typeof window.closeAuthModal === "function") {
            window.closeAuthModal();
          }
          Swal.fire("Login Falhou", data.error, "error");
        }
      } catch (error) {
        console.error("Login failed:", error);
        if (typeof window.closeAuthModal === "function") {
          window.closeAuthModal();
        }
        Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
      }
    });
  }
};

// Check logged in state on other pages
export const getLoggedUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
};

// Google Auth Integration
export const initializeGoogleAuth = () => {
  if (!window.google) return;

  const clientId =
    "566495487980-k2ten8upqs965tsjdvja8jvehv006tj7.apps.googleusercontent.com";

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCallback,
  });

  // Render in Unified Modal
  const buttonDiv = document.getElementById("google-signin-button-v2");
  if (buttonDiv) {
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
        window.location.reload();
      });
    } else {
      if (typeof window.closeAuthModal === "function") {
        window.closeAuthModal();
      }
      Swal.fire(
        "Login Falhou",
        data.error || "Autenticação Google falhou",
        "error",
      );
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    if (typeof window.closeAuthModal === "function") {
      window.closeAuthModal();
    }
    Swal.fire("Erro", "Erro na autenticação externa", "error");
  }
};

// Auto-init for Google Auth on window load
window.addEventListener("load", initializeGoogleAuth);

// Navbar Logic
// Update Navigation based on login status
export function updateNav(user) {
  const authSection = document.getElementById("authSection");
  if (!authSection) return;

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
                  <img src="${avatar}" alt="User" class="user-avatar-navbar" onerror="this.onerror=null;this.src='/images/default-user.png'">
                  <span class="user-name-navbar d-none d-md-block">${firstName}</span>
              </div>
              <ul class="dropdown-menu dropdown-menu-end dropdown-menu-premium animate-fade-in">
                  <li class="px-3 py-2 border-bottom">
                      <p class="mb-0 fw-bold small text-truncate" style="max-width: 150px">${user.name || user.firstName} ${user.lastName ?? ""}</p>
                      <p class="mb-0 text-muted smaller">${
                        user.role?.toLowerCase() === "admin" ||
                        user.userType?.toLowerCase() === "admin" ||
                        user.UserType?.toLowerCase() === "admin"
                          ? "Administrador"
                          : "Membro Premium"
                      }</p>
                  </li>
                  <li><a class="dropdown-item dropdown-item-premium mt-1" href="profile.html"><i class="fas fa-user-circle me-2"></i> Perfil</a></li>
                  <li><a class="dropdown-item dropdown-item-premium" href="orders.html"><i class="fas fa-history me-2"></i> Encomendas</a></li>
                  ${
                    user.role?.toLowerCase() === "admin" ||
                    user.userType?.toLowerCase() === "admin" ||
                    user.UserType?.toLowerCase() === "admin"
                      ? '<li><a class="dropdown-item dropdown-item-premium" href="admin.html"><i class="fas fa-cog me-2"></i> Admin</a></li>'
                      : ""
                  }
                  <li><hr class="dropdown-divider opacity-50"></li>
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
