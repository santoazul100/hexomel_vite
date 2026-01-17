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
          Swal.fire({
            icon: "success",
            title: "Conta Criada!",
            text: "Agora podes entrar na tua conta.",
            confirmButtonColor: "#f4b400",
          });

          // Switch to login view
          if (typeof window.toggleAuthMode === "function") {
            window.toggleAuthMode("login");
          }
        } else {
          Swal.fire("Erro", data.error, "error");
        }
      } catch (error) {
        console.error("Registration failed:", error);
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

          // Close custom modal immediately
          if (typeof window.closeAuthModal === "function") {
            window.closeAuthModal();
          }

          Swal.fire({
            icon: "success",
            title: `Bem-vindo de volta!`,
            showConfirmButton: false,
            timer: 1500,
          }).then(() => {
            window.location.reload();
          });
        } else {
          Swal.fire("Login Falhou", data.error, "error");
        }
      } catch (error) {
        console.error("Login failed:", error);
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

      // Close custom modal
      if (typeof window.closeAuthModal === "function") {
        window.closeAuthModal();
      }

      Swal.fire({
        icon: "success",
        title: `Bem-vindo!`,
        text: "Login com Google efetuado com sucesso.",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        window.location.reload();
      });
    } else {
      Swal.fire(
        "Login Falhou",
        data.error || "Autenticação Google falhou",
        "error",
      );
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    Swal.fire("Erro", "Erro na autenticação externa", "error");
  }
};

// Auto-init for Google Auth on window load
window.addEventListener("load", initializeGoogleAuth);
