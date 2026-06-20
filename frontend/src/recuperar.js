import Swal from "sweetalert2";
import { ensureBackendReady, parseJsonSafely } from "./api.js";

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

        const response = await fetch("/api/auth/forgot-password", {
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

        Swal.fire({
          icon: "success",
          title: "Email Enviado!",
          text: data.message,
          confirmButtonText: "Ok",
          confirmButtonColor: "#2d5f3f"
        }).then(() => {
          window.location.href = "/";
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Erro no Pedido",
          text: error.message,
          confirmButtonText: "Fechar",
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
          title: "Senha Insegura",
          text: "A palavra-passe deve conter pelo menos 6 caracteres.",
          confirmButtonColor: "#ffa500"
        });
        return;
      }

      if (password !== confirmPassword) {
        Swal.fire({
          icon: "warning",
          title: "Palavras-passe diferentes",
          text: "A confirmação de palavra-passe não coincide.",
          confirmButtonColor: "#ffa500"
        });
        return;
      }

      resetPasswordSubmitting = true;
      const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      Swal.fire({
        title: "A guardar...",
        text: "A atualizar a sua nova palavra-passe.",
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

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token, password })
        });

        const data = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(data.error || "Erro ao redefinir palavra-passe.");
        }

        // Auto-login: If backend returned token and user info, save immediately!
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          console.log("Auto-login active following password reset.");

          Swal.fire({
            icon: "success",
            title: "Sucesso!",
            text: "A sua palavra-passe foi redefinida e a sua sessão foi iniciada automaticamente!",
            confirmButtonText: "Entrar na Minha Conta",
            confirmButtonColor: "#2d5f3f"
          }).then(() => {
            window.location.href = "/";
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "Sucesso!",
            text: data.message,
            confirmButtonText: "Iniciar Sessão",
            confirmButtonColor: "#2d5f3f"
          }).then(() => {
            // Redirect back home and open the login screen automatically
            window.location.href = "/?openAuth=login";
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Falha na Redefinição",
          text: error.message,
          confirmButtonText: "Tentar novamente",
          confirmButtonColor: "#d33"
        });
      } finally {
        resetPasswordSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
