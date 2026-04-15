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
      contentDiv.innerHTML = `
        <i class="success-icon" style="font-style: normal;">✅</i>
        <p class="auth-subtitle" style="color: #1a4d2e; font-weight: bold; font-size: 1.2rem;">${data.message}</p>
        <p class="auth-subtitle" style="margin-top: 10px;">A sua conta foi ativada e está pronta a ser utilizada.</p>
        <button onclick="window.closeAllPopups ? window.openAuthModal('login') : window.location.href='/login.html'" class="auth-submit btn" style="margin-top: 2rem; width: auto; padding: 12px 30px; cursor: pointer;">
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
