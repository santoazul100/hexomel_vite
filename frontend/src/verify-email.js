import { API_URL, ensureBackendReady, parseJsonSafely } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const contentDiv = document.getElementById("verify-content");

  if (!token) {
    contentDiv.innerHTML = `
      <div class="mb-4">
        <i class="fas fa-exclamation-triangle text-warning animate-pulse" style="font-size: 5rem; filter: drop-shadow(0 4px 10px rgba(255, 193, 7, 0.15));"></i>
      </div>
      <h4 class="fw-bold mb-3" style="color: #c89300; font-size: 1.5rem;">Token em Falta</h4>
      <p class="text-muted mb-4" style="font-size: 1rem;">O endereço eletrónico não contém um token de verificação de email válido.</p>
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
      const footer = document.getElementById("verify-footer");
      if (footer) footer.style.display = "none";

      // Auto-login: If backend returned token and user info, save immediately!
      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log("Auto-login active following email verification.");

        contentDiv.innerHTML = `
          <div class="mb-4 animate-fade-up">
            <i class="fas fa-check-circle text-success" style="font-size: 5rem; filter: drop-shadow(0 4px 12px rgba(26, 77, 46, 0.15)); animation: pulse 2s infinite;"></i>
          </div>
          <h4 class="fw-bold mb-3" style="color: var(--primary-green); font-size: 1.5rem;">${data.message || "Email verificado com sucesso!"}</h4>
          <p class="text-muted mb-4" style="font-size: 0.95rem; max-width: 380px; margin: auto;">A sua conta foi ativada e a sua sessão foi iniciada automaticamente. Explore a nossa coleção de méis artesanais!</p>
          <button onclick="window.location.href='index.html'" class="btn btn-primary rounded-pill px-5 py-3 fw-bold shadow-sm" style="font-size: 1rem; cursor: pointer; transition: all 0.3s; background: var(--primary-green); border: none;">
            <i class="fas fa-home me-2"></i> Ir para a Página Inicial
          </button>
        `;
      } else {
        // Fallback if token or user wasn't supplied: If already logged in, update status
        const localUserStr = localStorage.getItem("user");
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            localUser.isVerified = true;
            localUser.Is_Verified = true;
            localStorage.setItem("user", JSON.stringify(localUser));
          } catch (e) {
            console.error("Error updating local user status:", e);
          }
        }

        contentDiv.innerHTML = `
          <div class="mb-4 animate-fade-up">
            <i class="fas fa-check-circle text-success" style="font-size: 5rem; filter: drop-shadow(0 4px 12px rgba(26, 77, 46, 0.15)); animation: pulse 2s infinite;"></i>
          </div>
          <h4 class="fw-bold mb-3" style="color: var(--primary-green); font-size: 1.5rem;">${data.message || "Email verificado com sucesso!"}</h4>
          <p class="text-muted mb-4" style="font-size: 0.95rem; max-width: 380px; margin: auto;">A sua conta foi ativada! Já pode iniciar sessão e explorar a nossa coleção de méis artesanais.</p>
          <button onclick="window.location.href='index.html?openAuth=login'" class="btn btn-primary rounded-pill px-5 py-3 fw-bold shadow-sm" style="font-size: 1rem; cursor: pointer; transition: all 0.3s;">
            <i class="fas fa-sign-in-alt me-2"></i> Iniciar Sessão
          </button>
        `;
      }
    } else {
      contentDiv.innerHTML = `
        <div class="mb-4">
          <i class="fas fa-times-circle text-danger" style="font-size: 5rem; filter: drop-shadow(0 4px 12px rgba(220, 53, 69, 0.15));"></i>
        </div>
        <h4 class="fw-bold mb-3" style="color: #dc3545; font-size: 1.5rem;">Verificação Falhou</h4>
        <p class="text-muted mb-2" style="font-size: 1rem; font-weight: 500;">${data.error || "Ocorreu um erro ao verificar o token."}</p>
        <p class="text-muted small mb-4" style="max-width: 320px; margin: auto;">O link de confirmação pode ter expirado ou já foi utilizado anteriormente.</p>
      `;
    }
  } catch (error) {
    console.error("Verification error:", error);
    contentDiv.innerHTML = `
      <div class="mb-4">
        <i class="fas fa-wifi text-warning" style="font-size: 5rem; filter: drop-shadow(0 4px 12px rgba(255, 193, 7, 0.15));"></i>
      </div>
      <h4 class="fw-bold mb-3" style="color: #ffb300; font-size: 1.5rem;">Erro de Ligação</h4>
      <p class="text-muted mb-2" style="font-size: 1rem;">Não foi possível ligar ao servidor da Hexomel.</p>
      <p class="text-muted small mb-4">Verifique a sua ligação à internet ou tente novamente mais tarde.</p>
      <button onclick="window.location.reload()" class="btn btn-primary rounded-pill px-5 py-3 fw-bold shadow-sm" style="font-size: 1rem; cursor: pointer;">
        <i class="fas fa-sync-alt me-2"></i> Tentar Novamente
      </button>
    `;
  }
});
