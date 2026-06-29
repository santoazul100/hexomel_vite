import Swal from "sweetalert2";
import { ensureBackendReady, parseJsonSafely } from "./api.js";
import { getLang } from "./i18n.js";

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const requestView = document.getElementById("request-view");
  const resetView = document.getElementById("reset-view");

  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");

  const authLoginLink = document.getElementById("auth-login-link");

  // Determine current state based on presence of token
  if (token) {
    requestView.style.display = "none";
    resetView.style.display = "block";
  } else {
    requestView.style.display = "block";
    resetView.style.display = "none";
  }

  // Handle the 'Entrar' link to open auth modal in main page
  if (authLoginLink) {
    authLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/?openAuth=login";
    });
  }




  // --- STATE A: SUBMIT FORGOT PASSWORD ---
  if (forgotPasswordForm) {
    let forgotPasswordSubmitting = false;

    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (forgotPasswordSubmitting) return;

      const identity = document.getElementById("identity-input").value.trim();

      if (!identity) return;

      forgotPasswordSubmitting = true;
      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      Swal.fire({
        title: getLang() === "pt" ? "A processar..." : "Processing...",
        text: getLang() === "pt" ? "Por favor, aguarde enquanto validamos o seu pedido." : "Please wait while we validate your request.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const backendAvailable = await ensureBackendReady();
        if (!backendAvailable) {
          throw new Error(getLang() === "pt" ? "O servidor ainda está a iniciar. Tente novamente dentro de alguns segundos." : "The server is still starting. Try again in a few seconds.");
        }

        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ identity })
        });

        const data = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(data.error || (getLang() === "pt" ? "Erro ao solicitar redefinição." : "Error requesting reset."));
        }

        Swal.fire({
          icon: "success",
          title: getLang() === "pt" ? "Email Enviado!" : "Email Sent!",
          text: data.message,
          confirmButtonText: "Ok",
          confirmButtonColor: "#2d5f3f"
        }).then(() => {
          window.location.href = "/";
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: getLang() === "pt" ? "Erro no Pedido" : "Request Error",
          text: error.message,
          confirmButtonText: getLang() === "pt" ? "Fechar" : "Close",
          confirmButtonColor: "#d33"
        });
      } finally {
        forgotPasswordSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // --- STATE B: SUBMIT RESET PASSWORD ---
  if (resetPasswordForm) {
    let resetPasswordSubmitting = false;

    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (resetPasswordSubmitting) return;

      const password = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (password.length < 6) {
        Swal.fire({
          icon: "warning",
          title: getLang() === "pt" ? "Senha Insegura" : "Insecure Password",
          text: getLang() === "pt" ? "A palavra-passe deve conter pelo menos 6 caracteres." : "The password must contain at least 6 characters.",
          confirmButtonColor: "#ffa500"
        });
        return;
      }

      if (password !== confirmPassword) {
        Swal.fire({
          icon: "warning",
          title: getLang() === "pt" ? "Palavras-passe diferentes" : "Passwords do not match",
          text: getLang() === "pt" ? "A confirmação de palavra-passe não coincide." : "The password confirmation does not match.",
          confirmButtonColor: "#ffa500"
        });
        return;
      }

      resetPasswordSubmitting = true;
      const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      Swal.fire({
        title: getLang() === "pt" ? "A guardar..." : "Saving...",
        text: getLang() === "pt" ? "A atualizar a sua nova palavra-passe." : "Updating your new password.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const backendAvailable = await ensureBackendReady();
        if (!backendAvailable) {
          throw new Error(getLang() === "pt" ? "O servidor ainda está a iniciar. Tente novamente dentro de alguns segundos." : "The server is still starting. Try again in a few seconds.");
        }

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token, password })
        });

        const data = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(data.error || (getLang() === "pt" ? "Erro ao redefinir palavra-passe." : "Error resetting password."));
        }

        // Auto-login or maintain existing active session
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          console.log("Auto-login active following password reset.");
        }

        const isLoggedIn = !!(localStorage.getItem("token") || sessionStorage.getItem("token"));

        if (isLoggedIn) {
          Swal.fire({
            icon: "success",
            title: getLang() === "pt" ? "Password Alterada!" : "Password Changed!",
            text: getLang() === "pt" ? "A sua palavra-passe foi redefinida com sucesso. A sua sessão continua ativa!" : "Your password was reset successfully. Your session remains active!",
            confirmButtonText: getLang() === "pt" ? "Ir para a Página Inicial" : "Go to Home",
            confirmButtonColor: "#2d5f3f"
          }).then(() => {
            window.location.href = "/";
          });
        } else {
          Swal.fire({
            icon: "success",
            title: getLang() === "pt" ? "Sucesso!" : "Success!",
            text: data.message || (getLang() === "pt" ? "Palavra-passe alterada com sucesso." : "Password reset successfully."),
            confirmButtonText: getLang() === "pt" ? "Iniciar Sessão" : "Log In",
            confirmButtonColor: "#2d5f3f"
          }).then(() => {
            // Redirect back home and open the login screen automatically for non-logged users
            window.location.href = "/?openAuth=login";
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: getLang() === "pt" ? "Falha na Redefinição" : "Reset Failed",
          text: error.message,
          confirmButtonText: getLang() === "pt" ? "Tentar novamente" : "Try again",
          confirmButtonColor: "#d33"
        });
      } finally {
        resetPasswordSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
