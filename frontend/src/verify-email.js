import { API_URL, ensureBackendReady, parseJsonSafely } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const contentDiv = document.getElementById("verify-content");

  if (!token) {
    contentDiv.innerHTML = `
      <i class="error-icon" style="font-style: normal;">⚠️</i>
      <p class="auth-subtitle" style="color: #d32f2f;">Erro: Token de verificação não fornecido no endereço.</p>
    `;
    return;
  }

  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) {
      throw new Error("Backend unavailable");
    }

    const response = await fetch(
      `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
    const data = await parseJsonSafely(response);

    if (response.ok) {
      // If user is already logged in, update their local status
      const localUserStr = localStorage.getItem("user");
      if (localUserStr) {
        try {
          const localUser = JSON.parse(localUserStr);
          localUser.isVerified = true;
          localUser.Is_Verified = true; // Support both cases
          localStorage.setItem("user", JSON.stringify(localUser));
          console.log("Local user status updated to verified.");
        } catch (e) {
          console.error("Error updating local user status:", e);
        }
      }

      contentDiv.innerHTML = `
        <i class="success-icon" style="font-style: normal;">✅</i>
        <p class="auth-subtitle" style="color: #1a4d2e; font-weight: bold; font-size: 1.2rem;">${data.message}</p>
        <p class="auth-subtitle" style="margin-top: 10px;">A sua conta foi ativada! Vamos completar o seu perfil.</p>
        <button onclick="window.location.href='/login.html'" class="auth-submit btn" style="margin-top: 2rem; width: auto; padding: 12px 30px; cursor: pointer;">
          Iniciar Sessão
        </button>
      `;
    } else {
      contentDiv.innerHTML = `
        <i class="error-icon" style="font-style: normal;">❌</i>
        <p class="auth-subtitle" style="color: #d32f2f; font-weight: bold;">${data.error || "Ocorreu um erro ao verificar o token."}</p>
        <p class="auth-subtitle" style="font-size: 0.9em; margin-top: 5px;">O link de confirmação pode ter expirado ou já foi utilizado.</p>
      `;
    }
  } catch (error) {
    console.error("Verification error:", error);
    contentDiv.innerHTML = `
      <i class="error-icon" style="font-style: normal;">📶</i>
      <p class="auth-subtitle" style="color: #d32f2f; font-weight: bold;">Erro de ligação ao servidor.</p>
      <p class="auth-subtitle" style="font-size: 0.9em;">Por favor, verifique a sua ligação à internet ou tente mais tarde.</p>
      <button onclick="window.location.reload()" class="auth-submit mt-3" style="margin-top: 1rem; width: auto; padding: 10px 20px; cursor: pointer;">Tentar Novamente</button>
    `;
  }
});
