import {
  buildAuthHeaders,
  getAuthToken,
  getLoggedUser,
  handleSessionExpired,
  isAuthFailure,
  logout,
  updateNav,
} from "./auth.js";
import Swal from "sweetalert2";

let currentUserData = null;
let selectedRole = null;

document.addEventListener("DOMContentLoaded", () => {
  // Check for tab parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get("tab");
  if (tab) {
    const tabBtn = document.querySelector(`.btn-profile-tab[data-tab="${tab}"]`);
    if (tabBtn) {
      // Remove active from any other tab
      document.querySelectorAll(".btn-profile-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".profile-tab-content").forEach(c => {
        c.classList.remove("active");
        c.style.display = "none";
      });
      
      tabBtn.classList.add("active");
      const panel = document.getElementById(`tab-${tab}`);
      if (panel) {
        panel.classList.add("active");
        panel.style.display = "block";
      }
    }
  }
  fetchProfileData();
  const user = getLoggedUser();
  if (user) updateNav(user);

  initializeTabs();
  initialize2FA();

  // Welcome onboarding flow for new accounts
  const isWelcome = urlParams.get("welcome");
  if (isWelcome === "1") {
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname + (tab ? `?tab=${tab}` : ''));
    
    setTimeout(() => {
      Swal.fire({
        icon: "info",
        title: "👋 Bem-vindo à Hexomel!",
        html: `<p style="font-size:0.95rem;color:#555;line-height:1.6">Para poderes fazer encomendas, precisamos que preenchas a tua <strong>morada de entrega</strong> e <strong>telemóvel</strong>.</p><p style="font-size:0.85rem;color:#999;margin-top:8px">Demora menos de 1 minuto!</p>`,
        confirmButtonText: "Preencher Agora",
        confirmButtonColor: "#1a4d2e",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        // Auto-open the delivery edit section
        const deliverySection = document.getElementById("delivery-section");
        if (deliverySection) {
          deliverySection.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            const editBtn = deliverySection.querySelector(".edit-toggle-btn");
            if (editBtn) editBtn.click();
          }, 400);
        }
      });
    }, 600);
  }

  // Initialize Inline Edit Toggles
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-toggle-btn");
    if (btn) {
      const section = btn.getAttribute("data-section");
      toggleEditMode(section);
    }
  });

  // Initialize Personal Data Form
  const personalForm = document.getElementById("personal-edit-form");
  if (personalForm) {
    personalForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserDataSave("personal");
    });
  }

  // Initialize Delivery Data Form
  const deliveryForm = document.getElementById("delivery-edit-form");
  if (deliveryForm) {
    deliveryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserDataSave("delivery");
    });
  }


  const deleteBtn = document.getElementById("delete-account-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDeleteAccount);
  }

  // Initialize Avatar Upload
  const uploadAvatarBtn = document.getElementById("upload-avatar-btn");
  const avatarFileInput = document.getElementById("avatar-file-input");

  if (uploadAvatarBtn && avatarFileInput) {
    uploadAvatarBtn.addEventListener("click", () => {
      avatarFileInput.click();
    });

    avatarFileInput.addEventListener("change", handleAvatarUpload);
  }

  // Initialize Upgrade Request Form
  const upgradeForm = document.getElementById("upgrade-request-form");
  if (upgradeForm) {
    upgradeForm.addEventListener("submit", handleUpgradeRequest);
  }

  // Check the upgrade status on page load to preserve UI state
  checkUpgradeStatus();
});

function initializeTabs() {
  const tabs = document.querySelectorAll(".btn-profile-tab[data-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");

      // Update buttons
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Update content
      document.querySelectorAll(".profile-tab-content").forEach((c) => {
        c.style.display = "none";
        c.classList.remove("active");
      });

      const content = document.getElementById(`tab-${target}`);
      if (content) {
        content.style.display = "block";
        content.classList.add("active");
        
        // Trigger data refreshes for specific tabs
        if (target === "workshops") fetchUserWorkshops();
        if (target === "favorites") fetchFavorites();
        if (target === "orders") fetchProfileData(); // Refresh full profile for orders
      }
    });
  });
}

function toggleEditMode(section) {
  const container = document
    .querySelector(`[data-section="${section}"]`)
    .closest(".premium-card");
  const viewMode = container.querySelector(`#${section}-view`);
  const editMode = container.querySelector(`#${section}-edit-form`);
  const btn = container.querySelector(`.edit-toggle-btn`);

  const isEditing = !editMode.classList.contains("d-none");

  if (isEditing) {
    // Switch to View
    editMode.classList.add("d-none");
    viewMode.classList.remove("d-none");
    btn.querySelector(".view-mode").classList.remove("d-none");
    btn.querySelector(".edit-mode").classList.add("d-none");
  } else {
    // Switch to Edit
    populateEditInputs(section);
    editMode.classList.remove("d-none");
    viewMode.classList.add("d-none");
    btn.querySelector(".view-mode").classList.add("d-none");
    btn.querySelector(".edit-mode").classList.remove("d-none");
  }
}

function populateEditInputs(section) {
  if (!currentUserData) return;

  if (section === "personal") {
    document.getElementById("input-name").value = currentUserData.name || "";
    document.getElementById("input-email").value = currentUserData.email || "";
  } else if (section === "delivery") {
    document.getElementById("input-phone").value = currentUserData.phone || "";

    // Parse address: "Rua X, 0000-000 Cidade"
    if (currentUserData.address) {
      const zipMatch = currentUserData.address.match(/\b\d{4}-\d{3}\b/);
      let street = currentUserData.address;
      let zip = "";
      let city = "";

      if (zipMatch) {
        zip = zipMatch[0];
        const zipIndex = currentUserData.address.indexOf(zip);
        street = currentUserData.address.substring(0, zipIndex).trim();
        if (street.endsWith(',')) {
          street = street.slice(0, -1).trim();
        }
        city = currentUserData.address.substring(zipIndex + zip.length).trim();
      }

      document.getElementById("input-address").value = street;
      document.getElementById("input-zip").value = zip;
      document.getElementById("input-city").value = city;
    } else {
      document.getElementById("input-address").value = "";
      document.getElementById("input-zip").value = "";
      document.getElementById("input-city").value = "";
    }
  }
}

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const handleProtectedResponse = async (
  response,
  fallbackMessage,
  sessionMessage,
) => {
  const data = await parseJsonSafely(response);

  if (isAuthFailure(response.status, data?.error)) {
    await handleSessionExpired(sessionMessage);
    return { handled: true, data };
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return { handled: false, data };
};

async function handleUserDataSave(section) {
  const token = getAuthToken();
  if (!token) {
    await handleSessionExpired(
      "Precisas de iniciar sessao novamente para editar o perfil.",
    );
    return;
  }

  let payload = {};

  if (section === "personal") {
    payload = {
      name: document.getElementById("input-name").value,
      email: document.getElementById("input-email").value,
    };
  } else if (section === "delivery") {
    const street = document.getElementById("input-address").value;
    const zip = document.getElementById("input-zip").value;
    const city = document.getElementById("input-city").value;
    const address = street ? `${street}, ${zip} ${city}` : "";

    payload = {
      phone: document.getElementById("input-phone").value,
      address: address,
    };
  }

  showInlineStatus("saving");

  try {
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const result = await handleProtectedResponse(
      res,
      "Falha ao guardar perfil.",
      "A tua sessao expirou. Inicia sessao novamente para editar o perfil.",
    );
    if (result.handled) return;

    if (res.ok) {
      showInlineStatus("saved");

      // Update Local State
      currentUserData = result.data?.user
        ? { ...currentUserData, ...result.data.user }
        : { ...currentUserData, ...payload };
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = {
        ...localUser,
        ...currentUserData,
        name: currentUserData.name,
        email: currentUserData.email,
        picture: currentUserData.picture,
        role: currentUserData.role,
      };
      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser),
      );

      // Refresh UI Components
      renderProfile(currentUserData);
      toggleEditMode(section); // Return to view mode
      updateNav(updatedUser);
    } else {
      showInlineStatus("error", result.data?.error);
    }
  } catch (error) {
    console.error("Save error:", error);
    showInlineStatus("error", error.message);
  }
}

function showInlineStatus(type, msg) {
  const el = document.getElementById("inline-save-status");
  if (!el) return;

  if (type === "saving") {
    el.innerHTML = `<span class="badge" style="background:var(--primary-gold,#f4b400);color:#000;font-size:.8rem;padding:.4em .8em"><i class="fas fa-spinner fa-spin me-1"></i>A guardar alterações...</span>`;
  } else if (type === "saved") {
    el.innerHTML = `<span class="badge bg-success" style="font-size:.8rem;padding:.4em .8em"><i class="fas fa-check-circle me-1"></i>Alterações provocadas com sucesso!</span>`;
    setTimeout(() => {
      el.innerHTML = "";
    }, 3000);
  } else if (type === "error") {
    el.innerHTML = `<span class="badge bg-danger" style="font-size:.8rem;padding:.4em .8em"><i class="fas fa-exclamation-circle me-1"></i>Erro: ${msg || "Falha ao gravar"}</span>`;
    setTimeout(() => {
      el.innerHTML = "";
    }, 5000);
  }
}

async function fetchProfileData() {
  const token = getAuthToken();
  if (!token) {
    const mainEl = document.querySelector("main");
    if (mainEl) mainEl.style.display = "none";
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch("/api/user/profile", {
      headers: buildAuthHeaders(),
    });

    const result = await handleProtectedResponse(
      res,
      "Nao foi possivel carregar o perfil.",
      "A tua sessao deixou de ser valida. Inicia sessao novamente para abrir o perfil.",
    );
    if (result.handled) return;

    const data = result.data;
    currentUserData = data;

    // Update localStorage with fresh data to ensure persistence across refreshes
    const localUser = getLoggedUser();
    if (localUser) {
      const updatedUser = { ...localUser, ...data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    renderProfile(data);
  } catch (error) {
    console.error("Profile fetch error:", error);
    Swal.fire({
      icon: "error",
      title: "Erro ao carregar perfil",
      text: error.message || "Não foi possível carregar os teus dados.",
      confirmButtonColor: "#f4b400",
    });
  }
}

function initialize2FA() {
  const btnRequest = document.getElementById("btn-request-2fa");
  const btnVerify = document.getElementById("btn-verify-2fa");
  let timerInterval = null;

  function start2FATimer() {
    clearInterval(timerInterval);
    let remaining = 90; // 1:30
    const timerEl = document.getElementById("2fa-timer");
    if (!timerEl) return;

    const updateDisplay = () => {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      timerEl.innerHTML = `<i class="fas fa-clock me-1"></i>${m}:${String(s).padStart(2, '0')}`;
      if (remaining <= 10) {
        timerEl.classList.add("text-danger");
        timerEl.classList.remove("text-muted");
      } else {
        timerEl.classList.remove("text-danger");
        timerEl.classList.add("text-muted");
      }
    };

    updateDisplay();
    timerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerEl.innerHTML = '<i class="fas fa-times-circle me-1"></i>Expirado';
        timerEl.classList.add("text-danger");
        const feedback = document.getElementById("2fa-feedback");
        if (feedback) feedback.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>Código expirado. Usa "Reenviar código" para gerar um novo.</span>';
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  if (btnRequest) {
    btnRequest.addEventListener("click", async () => {
      const token = getAuthToken();
      if (!token) return handleSessionExpired();

      btnRequest.disabled = true;
      btnRequest.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A solicitar...';

      try {
        const res = await fetch("/api/auth/checkout-2fa/generate", {
          method: "POST",
          headers: buildAuthHeaders()
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById("2fa-request-section").classList.add("d-none");
          document.getElementById("2fa-verify-section").classList.remove("d-none");
          start2FATimer();
          Swal.fire("Código Enviado", data.message || "Verifique a sua caixa de entrada.", "success");
        } else {
          Swal.fire("Erro", data.error || "Não foi possível enviar o código.", "error");
          btnRequest.disabled = false;
          btnRequest.innerText = "Tentar Novamente";
        }
      } catch (err) {
        Swal.fire("Erro", "Falha na conexão ao servidor.", "error");
        btnRequest.disabled = false;
      }
    });
  }

  if (btnVerify) {
    btnVerify.addEventListener("click", async () => {
      const rawOtp = document.getElementById("input-2fa-code").value.replace(/\s/g, "").trim();
      const otp = rawOtp;
      const feedback = document.getElementById("2fa-feedback");
      if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        feedback.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>O código deve ter exatamente 6 dígitos numéricos.</span>';
        return;
      }

      btnVerify.disabled = true;
      feedback.innerHTML = '<span class="text-muted"><i class="fas fa-spinner fa-spin me-1"></i>A validar...</span>';

      try {
        const res = await fetch("/api/auth/checkout-2fa/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders()
          },
          body: JSON.stringify({ otp })
        });
        const data = await res.json();
        
        if (res.ok) {
          // Update local token and user
          if (data.token) localStorage.setItem("token", data.token);
          if (data.user) {
            const localUser = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...localUser, ...data.user }));
            currentUserData = { ...currentUserData, ...data.user };
          }
      
          currentUserData.checkoutVerified = true;
          clearInterval(timerInterval);
          renderProfile(currentUserData);
          
          document.getElementById("2fa-verify-section").classList.add("d-none");
          document.getElementById("2fa-request-section").classList.remove("d-none");
          btnRequest.innerText = "Gerar Novo Código";
          btnRequest.disabled = false;
          
          Swal.fire({
            icon: "success",
            title: "Sessão Verificada",
            text: "Podes agora efetuar checkouts com segurança nesta sessão.",
            confirmButtonColor: "#1a4d2e"
          });
        } else {
          feedback.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle me-1"></i>${data.error || "Código inválido"}</span>`;
          btnVerify.disabled = false;
        }
      } catch (err) {
        feedback.innerHTML = '<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Falha de comunicação.</span>';
        btnVerify.disabled = false;
      }
    });
  }

  // Resend button
  const btnResend = document.getElementById("btn-resend-2fa");
  if (btnResend) {
    btnResend.addEventListener("click", async () => {
      const token = getAuthToken();
      if (!token) return handleSessionExpired();

      btnResend.disabled = true;
      btnResend.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>A reenviar...';
      const feedback = document.getElementById("2fa-feedback");
      feedback.innerHTML = '';

      try {
        const res = await fetch("/api/auth/checkout-2fa/generate", {
          method: "POST",
          headers: buildAuthHeaders()
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById("input-2fa-code").value = "";
          document.getElementById("btn-verify-2fa").disabled = false;
          feedback.innerHTML = '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Novo código enviado!</span>';
          start2FATimer();
          Swal.fire("Novo Código Enviado", data.message || "Verifique a sua caixa de entrada.", "success");
        } else {
          feedback.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle me-1"></i>${data.error || "Erro ao reenviar"}</span>`;
        }
      } catch (err) {
        feedback.innerHTML = '<span class="text-danger">Falha de comunicação.</span>';
      }
      btnResend.disabled = false;
      btnResend.innerHTML = '<i class="fas fa-redo me-1"></i>Reenviar código';
    });
  }
}



function renderProfile(data) {
  // Header Elements
  const name = data.name || "Utilizador";
  const email = data.email || "";
  const pictureUrl = data.picture;

  document.getElementById("profile-name").innerText = name;
  document.getElementById("profile-email").innerText = email;

  // Bio for Apicultores
  const bioInput = document.getElementById("apicultor-bio-input");
  if (bioInput) {
    bioInput.value = data.bio || "";
  }

  // 2FA Badge Update
  const badge2FA = document.getElementById("2fa-status-badge");
  const requestSec = document.getElementById("2fa-request-section");
  if (badge2FA) {
    if (data.checkoutVerified) {
      badge2FA.className = "verify-badge-premium verified";
      badge2FA.innerHTML = '<i class="fas fa-shield-alt me-1"></i>Sessão Protegida';
      if(requestSec) requestSec.classList.add("d-none"); // Hide request if already verified
    } else {
      badge2FA.className = "verify-badge-premium unverified";
      badge2FA.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Sessão Não Verificada';
      if(requestSec) requestSec.classList.remove("d-none");
    }
  }

  // Account Verification Badge
  const badgeVerify = document.getElementById("account-verify-badge");
  if (badgeVerify) {
    if (data.isVerified) {
      badgeVerify.className = "verify-badge-premium verified";
      badgeVerify.innerHTML = '<i class="fas fa-check-circle me-1"></i>Conta Verificada';
    } else {
      badgeVerify.className = "verify-badge-premium pending";
      badgeVerify.innerHTML = '<i class="fas fa-clock me-1"></i>Verificação Pendente';
      badgeVerify.title = "Por favor, verifique o seu email.";
    }
  }

    // Show Upgrade tab if role is client
    const upgradeTabBtn = document.getElementById("nav-tab-upgrade");
    if (upgradeTabBtn) {
      if (data.role === "client") {
        upgradeTabBtn.classList.remove("d-none");
      } else {
        upgradeTabBtn.classList.add("d-none");
      }
    }

  const addressEl = document.getElementById("profile-address");
  if (addressEl) {
    addressEl.innerHTML = data.address
      ? `<i class="fas fa-map-marker-alt me-1"></i> ${data.address}`
      : `<i class="fas fa-map-marker-alt me-1"></i> Morada não definida`;
  }

  // Tab View Mode Elements
  const viewName = document.getElementById("view-name");
  if (viewName) viewName.innerText = name;

  const viewEmail = document.getElementById("view-email");
  if (viewEmail) viewEmail.innerText = email;

  const viewPhone = document.getElementById("view-phone");
  if (viewPhone) viewPhone.innerText = data.phone || "Não definido";

  const viewAddress = document.getElementById("view-address");
  if (viewAddress)
    viewAddress.innerText = data.address || "Morada não definida";

  const viewCity = document.getElementById("view-city");
  if (viewCity) {
    if (data.address) {
      const zipMatch = data.address.match(/\b\d{4}-\d{3}\b/);
      let city = "Não definida";
      
      if (zipMatch) {
        const zipIndex = data.address.indexOf(zipMatch[0]);
        city = data.address.substring(zipIndex + zipMatch[0].length).trim();
      }
      viewCity.innerText = city || "Não definida";
    } else {
      viewCity.innerText = "Não definida";
    }
  }

  // Avatar Handling
  const avatarEl = document.getElementById("profile-avatar-large");
  if (pictureUrl && pictureUrl.trim() !== "") {
    avatarEl.src = pictureUrl;
  } else {
    avatarEl.src = "/images/default-user.png";
  }

  avatarEl.onerror = function () {
    this.onerror = null;
    this.src = "/images/default-user.png";
  };

  // Orders
  renderOrders(data.orders || []);
  fetchFavorites();
  fetchUserWorkshops();
}

function renderOrders(orders) {
  const ordersList = document.getElementById("orders-list");

  if (!orders) orders = [];

  if (orders.length > 0) {
    ordersList.innerHTML = orders
      .map((order) => {
        const statusSteps = ["Pendente", "Pago", "Enviado", "Entregue"];
        const curIdx = statusSteps.indexOf(order.status);
        const sc = { Pendente: {bg:"#fffbeb",color:"#b45309",icon:"fa-clock"}, Pago: {bg:"#f0fdf4",color:"#166534",icon:"fa-check-circle"}, Enviado: {bg:"#eff6ff",color:"#1d4ed8",icon:"fa-truck"}, Entregue: {bg:"#f0fdf4",color:"#15803d",icon:"fa-gift"}, Cancelado: {bg:"#fef2f2",color:"#991b1b",icon:"fa-times-circle"} }[order.status] || {bg:"#fffbeb",color:"#b45309",icon:"fa-clock"};
        const tl = statusSteps.map((s,i) => `<div class="order-timeline-step ${i<=curIdx?"active":""} ${i===curIdx?"current":""}"><div class="timeline-dot"></div><span class="timeline-label">${s}</span></div>`).join('<div class="timeline-line-connector"></div>');
        return `<div class="order-card-premium animate-fade-up">
          <div class="order-card-header">
            <div class="d-flex align-items-center gap-3">
              <div class="order-id-badge">#${order.id}</div>
              <div><div class="fw-bold">Encomenda #${order.id}</div><div class="text-muted small">${new Date(order.date).toLocaleDateString("pt-PT",{year:"numeric",month:"long",day:"numeric"})}</div></div>
            </div>
            <div class="text-end">
              <div class="fw-bold fs-5" style="color:var(--primary-green,#1a4d2e)">€${(parseFloat(order.total)||0).toFixed(2)}</div>
              <span class="order-status-pill" style="background:${sc.bg};color:${sc.color}"><i class="fas ${sc.icon} me-1"></i>${order.status}</span>
            </div>
          </div>
          <div class="order-timeline-container">${tl}</div>
          <div class="d-flex flex-wrap gap-2 pt-3 mt-3" style="border-top: 1px dashed #eee;">
            <button class="btn text-white flex-grow-1 py-2 shadow-sm" style="background: var(--primary-green); border-radius: 8px; font-weight: 600; min-width: 140px;" onclick="window.viewOrderDetails(${order.id})"><i class="fas fa-eye me-2"></i>Detalhes</button>
            ${order.status === 'Pendente' 
              ? `<button class="btn flex-grow-1 py-2 shadow-sm" style="background: var(--primary-gold, #f4b400); color: #000; border: none; border-radius: 8px; font-weight: 600; min-width: 120px;" onclick="window.payOrder(${order.id})"><i class="fas fa-credit-card me-2"></i>Pagar</button>` 
              : `<button class="btn flex-grow-1 py-2 shadow-sm" style="background: white; border: 1px solid #e2e8f0; color: #475569; border-radius: 8px; font-weight: 600; min-width: 120px;" onclick="window.downloadReceipt(${order.id})"><i class="fas fa-file-invoice me-2"></i>Recibo</button>
                 <button class="btn flex-grow-1 py-2 shadow-sm" style="background: white; border: 1px solid #e2e8f0; color: #475569; border-radius: 8px; font-weight: 600; min-width: 120px;" onclick="window.resendReceipt(${order.id})"><i class="fas fa-envelope me-2"></i>Email</button>`
            }
          </div>
        </div>`;
      }).join("");
  } else {
    ordersList.innerHTML = `
      <div class="text-center py-5 opacity-50 bg-light rounded-4 border">
        <i class="fas fa-shopping-basket fs-1 mb-3"></i>
        <p>Ainda não fizeste nenhuma encomenda.</p>
        <a href="shop.html" class="btn btn-sm btn-auth-enhanced register">Ir para a Loja</a>
      </div>`;
  }
}

async function fetchFavorites() {
  const token = getAuthToken();
  const favGrid = document.getElementById("favorites-grid");

  if (!token || !favGrid) return;

  try {
    const res = await fetch("/api/user/favorites", {
      headers: buildAuthHeaders(),
    });

    const result = await handleProtectedResponse(
      res,
      "Falha ao carregar favoritos.",
      "A tua sessao expirou. Inicia sessao novamente para ver os favoritos.",
    );
    if (result.handled) return;

    renderFavorites(result.data);
  } catch (error) {
    console.error("Favorites fetch error:", error);
  }
}

function renderFavorites(favorites) {
  const favGrid = document.getElementById("favorites-grid");
  if (favorites && favorites.length > 0) {
    favGrid.innerHTML = favorites
      .map(
        (fav) => `
            <div class="col-md-6 col-xl-4">
              <div class="premium-card p-3 h-100 d-flex flex-column gap-3">
                  <div class="text-center">
                    <img src="/img/produtos/${fav.ID_Produto}.webp" alt="${fav.Nome}" style="width: 100%; height: 120px; object-fit: contain;" onerror="this.src='/images/logo_hexomel.webp'">
                  </div>
                  <div class="flex-grow-1">
                      <div class="fw-bold small text-truncate">${fav.Nome}</div>
                      <div class="text-muted" style="font-size: 0.85rem;">â‚¬${(parseFloat(fav.Preco) || 0).toFixed(2)}</div>
                  </div>
                  <div class="d-flex gap-2">
                    <button onclick="window.location.href='product.html?id=${fav.ID_Produto}'" class="btn btn-sm btn-auth-enhanced login flex-grow-1 py-1">Ver</button>
                    <button onclick="window.removeFromFavorites(${fav.ID_Produto})" class="btn btn-sm btn-outline-danger py-1"><i class="fas fa-trash"></i></button>
                  </div>
              </div>
            </div>
        `,
      )
      .join("");
  } else {
    favGrid.innerHTML = `
            <div class="col-12 text-center py-5 opacity-50 bg-light rounded-4 border">
                <i class="fas fa-heart fs-1 mb-3"></i>
                <p>Ainda não tens favoritos.</p>
            </div>
        `;
  }
}

window.removeFromFavorites = async function (productId) {
  const token = getAuthToken();
  if (!token) {
    await handleSessionExpired(
      "Precisas de iniciar sessao novamente para gerir os favoritos.",
    );
    return;
  }

  try {
    const res = await fetch(`/api/user/favorites/remove/${productId}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
    });
    const result = await handleProtectedResponse(
      res,
      "Falha ao remover favorito.",
      "A tua sessao expirou. Inicia sessao novamente para gerir os favoritos.",
    );
    if (!result.handled && res.ok) fetchFavorites();
  } catch (error) {
    console.error("Remove favorite error:", error);
  }
};

async function handlePasswordUpdate(e) {
  e.preventDefault();
  const token = getAuthToken();
  if (!token) {
    await handleSessionExpired(
      "Precisas de iniciar sessao novamente para alterar a password.",
    );
    return;
  }

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-new-password").value;

  if (newPassword !== confirmPassword) {
    return Swal.fire("Erro", "As novas passwords não coincidem", "error");
  }

  if (newPassword.length < 6) {
    return Swal.fire(
      "Erro",
      "A nova password deve ter pelo menos 6 caracteres",
      "error",
    );
  }

  try {
    const res = await fetch("/api/user/profile/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const result = await handleProtectedResponse(
      res,
      "Falha ao atualizar password.",
      "A tua sessao expirou. Inicia sessao novamente para alterar a password.",
    );
    if (result.handled) return;

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Password Alterada!",
        text: "A tua palavra-passe foi atualizada com sucesso.",
        confirmButtonColor: "#f4b400",
      }).then(() => {
        e.target.reset();
      });
    } else {
      Swal.fire(
        "Erro",
        result.data?.error || "Falha ao atualizar password",
        "error",
      );
    }
  } catch (error) {
    console.error("Password update error:", error);
    Swal.fire(
      "Erro",
      error.message || "Erro ao comunicar com o servidor.",
      "error",
    );
  }
}

async function handleDeleteAccount() {
  const result = await Swal.fire({
    title: "Tem a certeza?",
    text: "Esta ação é irreversível e todos os seus dados serão eliminados!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar conta",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    const token = getAuthToken();
    if (!token) {
      await handleSessionExpired(
        "Precisas de iniciar sessao novamente para eliminar a conta.",
      );
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
        headers: buildAuthHeaders(),
      });

      const resultData = await handleProtectedResponse(
        res,
        "Falha ao eliminar conta.",
        "A tua sessao expirou. Inicia sessao novamente para eliminar a conta.",
      );
      if (resultData.handled) return;

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Conta Eliminada",
          text: "A sua conta foi removida com sucesso. Esperamos vê-lo de novo!",
          confirmButtonColor: "#f4b400",
        }).then(() => {
          logout();
        });
      } else {
        Swal.fire(
          "Erro",
          resultData.data?.error || "Falha ao eliminar conta",
          "error",
        );
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire(
        "Erro",
        error.message || "Erro ao comunicar com o servidor.",
        "error",
      );
    }
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    Swal.fire({
      icon: "error",
      title: "Ficheiro Inválido",
      text: "Por favor, seleciona uma imagem válida.",
      confirmButtonColor: "#f4b400",
    });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "Ficheiro Muito Grande",
      text: "A imagem deve ter no máximo 5MB.",
      confirmButtonColor: "#f4b400",
    });
    return;
  }

  try {
    Swal.fire({
      title: "A carregar...",
      text: "A atualizar a tua foto de perfil",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Image = event.target.result;
        const token = getAuthToken();
        if (!token) {
          await handleSessionExpired(
            "Precisas de iniciar sessao novamente para atualizar a foto.",
          );
          return;
        }

        const res = await fetch("/api/user/profile/picture", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({ picture: base64Image }),
        });

        const result = await handleProtectedResponse(
          res,
          "Erro ao atualizar foto.",
          "A tua sessao expirou. Inicia sessao novamente para atualizar a foto.",
        );
        if (result.handled) return;

        document.getElementById("profile-avatar-large").src = base64Image;
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.picture = base64Image;
        localStorage.setItem("user", JSON.stringify(user));
        updateNav(user);

        Swal.fire({
          icon: "success",
          title: "Foto Atualizada!",
          text: "A tua foto de perfil foi atualizada com sucesso.",
          confirmButtonColor: "#f4b400",
        });
      } catch (error) {
        console.error("Avatar upload fetch error:", error);
        Swal.fire("Erro", "Falha ao enviar a foto", "error");
      }
    };
    reader.onerror = () => {
      Swal.fire("Erro", "Erro ao ler o ficheiro", "error");
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Avatar upload general error:", error);
    Swal.fire({
      icon: "error",
      title: "Erro",
      text: error.message || "Não foi possível atualizar a foto.",
      confirmButtonColor: "#f4b400",
    });
  } finally {
    e.target.value = "";
  }
}

window.viewOrderDetails = async function (orderId) {
  const token = getAuthToken();
  if (!token) {
    await handleSessionExpired(
      "Precisas de iniciar sessao novamente para ver os detalhes da encomenda.",
    );
    return;
  }
  const content = document.getElementById("order-details-content");

  // Use bootstrap from window if not imported (it's loaded via CDN in profile.html)
  const modalEl = document.getElementById("orderDetailsModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  content.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">A carregar...</span>
      </div>
    </div>
  `;

  modal.show();

  try {
    let items;
    const res = await fetch(`/api/user/orders/${orderId}/items`, {
      headers: buildAuthHeaders(),
    });

    const result = await handleProtectedResponse(
      res,
      "Falha ao carregar detalhes.",
      "A tua sessao expirou. Inicia sessao novamente para ver os detalhes da encomenda.",
    );
    if (result.handled) {
      modal.hide();
      return;
    }
    items = result.data;

    let itemsHtml = `
      <div class="order-id-display mb-4 p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
        <span class="text-muted small">ID da Encomenda</span>
        <span class="fw-bold">#${orderId}</span>
      </div>
      <div class="table-responsive bg-white rounded-3 p-2 shadow-sm border border-light">
        <table class="table table-hover align-middle mb-0">
          <thead class="text-muted small fw-bold">
            <tr style="border-bottom: 2px solid #f1f5f9;">
              <th colspan="2" class="pb-3 px-3 text-uppercase" style="letter-spacing: 0.5px;">Produto</th>
              <th class="text-center pb-3 text-uppercase" style="letter-spacing: 0.5px;">Qtd</th>
              <th class="text-end pb-3 px-3 text-uppercase" style="letter-spacing: 0.5px;">Preço</th>
            </tr>
          </thead>
          <tbody style="border-top: none;">
    `;

    let total = 0;
    items.forEach((item) => {
      const itemTotal = item.Quantidade * item.Preco_Unitario;
      total += itemTotal;
      itemsHtml += `
        <tr style="border-bottom: 1px solid #f8fafc; transition: background-color 0.2s;">
          <td style="width: 70px; padding: 12px 10px 12px 15px;">
            <img src="${item.Imagem || "/img/produtos/" + item.ID_Produto + ".webp"}" 
                 class="rounded-3 shadow-sm border" style="width: 48px; height: 48px; object-fit: cover;"
                 onerror="this.src='/images/logo_hexomel.webp'">
          </td>
          <td style="padding: 12px 10px;">
            <div class="fw-bold text-wrap" style="color: #1e293b;">${item.Nome}</div>
            <div class="text-muted mt-1" style="font-size: 0.70rem; color: #94a3b8 !important;"><i class="fas fa-user-circle me-1"></i>${item.ApicultorNome || "Hexomel"}</div>
            <div class="text-muted small mt-1">€${parseFloat(item.Preco_Unitario).toFixed(2)} / un</div>
          </td>
          <td class="text-center fw-medium" style="color: #475569;">${item.Quantidade}</td>
          <td class="text-end fw-bold" style="padding-right: 15px; color: #1e293b;">€${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    itemsHtml += `
          </tbody>
          <tfoot class="bg-light rounded-bottom-3">
            <tr>
              <td colspan="3" class="p-3 fw-bold text-end" style="color: #64748b; border-bottom-left-radius: 8px;">Total da Encomenda</td>
              <td class="p-3 text-end fw-bold fs-5" style="color: var(--primary-green); border-bottom-right-radius: 8px;">€${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    content.innerHTML = itemsHtml;
  } catch (error) {
    console.error("Order details error:", error);
    content.innerHTML = `
      <div class="alert alert-danger rounded-4 py-4 text-center">
        <i class="fas fa-exclamation-triangle fs-2 mb-2 d-block"></i>
        Erro ao carregar os detalhes da encomenda.
      </div>
    `;
  }
};

window.downloadReceipt = async function (orderId) {
  const token = getAuthToken();
  if (!token) return handleSessionExpired();

  try {
    const res = await fetch(`/api/user/orders/${orderId}/receipt`, {
      headers: buildAuthHeaders(),
    });
    
    if (!res.ok) throw new Error("Falha ao gerar recibo");

    const html = await res.text();
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    
    // Auto-print after fonts load
    win.onload = () => {
      setTimeout(() => {
        win.print();
        Swal.close();
      }, 500);
    };

  } catch (error) {
    console.error("Download receipt error:", error);
    Swal.fire("Erro", "Não foi possível carregar o recibo para impressão.", "error");
  }
};

window.resendReceipt = async function (orderId) {
  const token = getAuthToken();
  if (!token) return handleSessionExpired();

  Swal.fire({
    title: "Reenviar Recibo?",
    text: "Enviaremos uma cópia do recibo para o teu email registado.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sim, reenviar",
    confirmButtonColor: "#f4b400",
    cancelButtonColor: "#718096",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        Swal.fire({ title: "Enviando...", didOpen: () => { Swal.showLoading(); } });

        const res = await fetch(`/api/user/orders/${orderId}/resend-receipt`, {
          method: "POST",
          headers: buildAuthHeaders(),
        });
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Enviado!",
            text: "O recibo foi enviado com sucesso. Verifica a tua caixa de entrada.",
            confirmButtonColor: "#1a4d2e"
          });
        } else {
          const data = await res.json();
          throw new Error(data.error || "Falha ao enviar email");
        }
      } catch (error) {
        Swal.fire("Erro", error.message, "error");
      }
    }
  });
};

window.reorderItems = async function (orderId) {
  const token = getAuthToken();
  if (!token) return handleSessionExpired();

  try {
    Swal.fire({
      title: "A preparar re-encomenda...",
      text: "A validar produtos e stock disponível",
      didOpen: () => { Swal.showLoading(); }
    });

    const res = await fetch(`/api/user/orders/${orderId}/items`, {
      headers: buildAuthHeaders(),
    });
    const items = await res.json();
    
    if (!items || items.length === 0) throw new Error("Não foram encontrados itens nesta encomenda.");

    let addedCount = 0;
    
    // Use global cart object if available
    if (window.cart && typeof window.cart.addItem === "function") {
      for (const item of items) {
        try {
          // Check stock indirectly via adding
          await window.cart.addItem(item.ID_Produto, item.Quantidade); 
          addedCount++;
        } catch (err) {
          console.warn(`Could not add product ${item.ID_Produto}:`, err);
        }
      }
      
      if (addedCount === 0) {
        Swal.fire("Aviso", "Infelizmente, os produtos desta encomenda já não estão disponíveis ou estão sem stock.", "warning");
        return;
      }

      Swal.fire({
        icon: "success",
        title: "🛒 Carrinho Atualizado!",
        text: `Adicionámos ${addedCount} produto(s) ao teu carrinho. Desejas finalizar a compra agora?`,
        showCancelButton: true,
        confirmButtonText: "Ir para o Checkout",
        cancelButtonText: "Continuar a Comprar",
        confirmButtonColor: "#1a4d2e",
      }).then((result) => {
        if (result.isConfirmed) window.location.href = "checkout.html";
        else {
           // Provide feedback that things are in the cart
           window.cart.toggle(true);
        }
      });
    } else {
      // Fallback manual adding loop
      for (const item of items) {
        await fetch("/api/cart/add", {
          method: "POST",
          headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ productId: item.ID_Produto, quantity: item.Quantidade }),
        });
      }
      Swal.fire("Sucesso", "Produtos adicionados ao carrinho!", "success");
    }
  } catch (error) {
    console.error("Reorder error:", error);
    Swal.fire("Erro", "Não foi possível repetir a encomenda. Tenta novamente mais tarde.", "error");
  }
};

window.payOrder = async function (orderId) {
  const token = getAuthToken();
  if (!token) return handleSessionExpired();

  Swal.fire({
    title: "Efetuar Pagamento",
    text: "Desejas prosseguir para o pagamento desta encomenda?",
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "Sim, Pagar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#f4b400",
    cancelButtonColor: "#718096",
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = `checkout.html?orderId=${orderId}`;
    }
  });
};

// Upgrade Request Handling
async function handleUpgradeRequest(e) {
  e.preventDefault();
  const token = getAuthToken();
  if (!token) {
    await handleSessionExpired(
      "Precisas de iniciar sessao novamente para enviar o pedido.",
    );
    return;
  }

  const btn = document.getElementById("btn-submit-upgrade");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A enviar...';
  btn.disabled = true;

  try {
    const descricao = document.getElementById("upgrade-desc").value;
    const docFile = document.getElementById("upgrade-doc").files[0];

    if (!docFile)
      throw new Error("Por favor, seleciona um documento de verificação.");

    const formData = new FormData();
    formData.append("descricao", descricao);
    formData.append("document", docFile);

    const res = await fetch("/api/user/upgrade-request", {
      method: "POST",
      headers: buildAuthHeaders(),
      body: formData,
    });

    const result = await handleProtectedResponse(
      res,
      "Erro ao enviar pedido.",
      "A tua sessao expirou. Inicia sessao novamente para enviar o pedido.",
    );
    if (result.handled) return;

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Pedido Enviado",
        text: "O teu pedido de Apicultor foi enviado e será analisado pela administração.",
        confirmButtonColor: "#f4b400",
      });
      e.target.reset();
      checkUpgradeStatus();
    } else {
      throw new Error(result.data?.error || "Erro ao enviar pedido.");
    }
  } catch (error) {
    console.error("Upgrade request error:", error);
    Swal.fire({
      icon: "error",
      title: "Erro",
      text: error.message,
      confirmButtonColor: "#f4b400",
    });
    // Restore button only if there was an error
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function checkUpgradeStatus() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch("/api/user/upgrade-request-status", {
      headers: buildAuthHeaders(),
    });
    const result = await handleProtectedResponse(
      res,
      "Falha ao verificar o pedido.",
      "A tua sessao expirou. Inicia sessao novamente para verificar o pedido.",
    );
    if (result.handled || !res.ok) return;

    const data = result.data;
    const banner = document.getElementById("upgrade-status-banner");
    const form = document.getElementById("upgrade-request-form");

    if (data.Status && data.Status !== "Nenhum") {
        banner.classList.remove("d-none");
        let statusClass = "bg-warning-subtle text-warning-emphasis";
        let statusIcon = "fa-clock";
        let statusText = "O teu pedido para ser Apicultor está pendente de análise.";

        if (data.Status === "Aprovado") {
          statusClass = "bg-success-subtle text-success-emphasis";
          statusIcon = "fa-check-circle";
          statusText =
            "O teu pedido de Apicultor foi aprovado! Re-inicia a sessão para ativar as tuas ferramentas de venda.";
          form.classList.add("d-none");
        } else if (data.Status === "Rejeitado") {
          statusClass = "bg-danger-subtle text-danger-emphasis";
          statusIcon = "fa-times-circle";
          statusText =
            "O teu pedido de Apicultor foi rejeitado. Podes submeter um novo pedido e tentar novamente.";
          
          // Re-enable form
          document.getElementById("upgrade-desc").disabled = false;
          document.getElementById("upgrade-doc").disabled = false;
          const btnSubmit = document.getElementById("btn-submit-upgrade");
          if(btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = "Enviar Pedido de Apicultor";
          }
        } else {
          // Pendente
          statusClass = "bg-warning-subtle text-warning-emphasis";
          statusIcon = "fa-clock";
          statusText =
            "O teu pedido já foi submetido. Agora aguarde até o seu pedido estar aceite pela administração.";
            
          form.classList.remove("d-none");
          
          // Disable form elements
          document.getElementById("upgrade-desc").disabled = true;
          document.getElementById("upgrade-doc").disabled = true;
          const btnSubmit = document.getElementById("btn-submit-upgrade");
          if(btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-lock me-2"></i>Aguarde até estar aceite...';
            btnSubmit.classList.replace("btn-primary", "btn-secondary");
            btnSubmit.style.background = "#e2e8f0";
            btnSubmit.style.color = "#64748b";
            btnSubmit.style.border = "none";
          }
        }

        banner.innerHTML = `
          <div class="d-flex align-items-center gap-3 p-3 rounded-3 ${statusClass} border">
            <i class="fas ${statusIcon} fs-4"></i>
            <div class="small fw-bold">${statusText}</div>
          </div>
        `;
      } else {
        banner.classList.add("d-none");
        form.classList.remove("d-none");
      }
  } catch (error) {
    console.error("Check upgrade status error:", error);
  }
}

// WORKSHOPS (USER RESERVATIONS)
async function fetchUserWorkshops() {
  const token = getAuthToken();
  const listEl = document.getElementById("my-workshops-list");

  if (!token || !listEl) return;

  try {
    const res = await fetch("/api/user/workshops", {
      headers: buildAuthHeaders(),
    });

    const result = await handleProtectedResponse(
      res,
      "Falha ao carregar reservas de workshops.",
      "A tua sessão expirou. Inicia sessão novamente para ver os workshops.",
    );
    if (result.handled) return;

    renderUserWorkshops(result.data);
  } catch (error) {
    console.error("User workshops fetch error:", error);
    if (listEl) {
      listEl.innerHTML = `<div class="col-12 text-center py-5 text-danger">Erro ao carregar reservas.</div>`;
    }
  }
}

function renderUserWorkshops(reservations) {
  const listEl = document.getElementById("my-workshops-list");
  if (!listEl) return;

  if (reservations && reservations.length > 0) {
    listEl.innerHTML = reservations
      .map((reserva) => {
        const dataRes = new Date(reserva.Data_Realizacao);
        const agora = new Date();
        const isPast = dataRes < agora;
        const dateStr = dataRes.toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const statusClass = isPast ? "past" : "upcoming";
        const statusText = isPast ? "Realizado" : "Agendado";
        const fallbackImg = "https://placehold.co/600x340/f6f6f6/e0e0e0?text=Workshop";

        return `
          <div class="col-md-6 col-lg-6">
            <div class="reservation-card d-flex flex-column h-100 p-0">
              <img src="${reserva.Imagem || fallbackImg}" alt="${reserva.Titulo}" class="reservation-card-img" onerror="this.src='${fallbackImg}'">
              <div class="p-4 d-flex flex-column flex-grow-1">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="reservation-status ${statusClass}">${statusText}</span>
                  <span class="fw-bold text-dark fs-5">#${reserva.ID_Reserva}</span>
                </div>
                <h5 class="fw-bold mb-2 text-truncate" title="${reserva.Titulo}">${reserva.Titulo}</h5>
                <div class="text-muted small mb-3">
                  <i class="far fa-calendar-alt me-1 text-warning"></i> ${dateStr} <br/>
                  <i class="fas fa-user-tie me-1 text-warning mt-1"></i> ${reserva.ApicultorNome}
                </div>
                <div class="mt-auto d-flex justify-content-end border-top pt-3">
                  ${
                    !isPast
                      ? `<button class="btn-cancel-reservation" onclick="window.cancelWorkshop(${reserva.ID_Reserva})">
                           <i class="fas fa-times me-1"></i> Cancelar Reserva
                         </button>`
                      : `<button class="btn btn-sm btn-outline-secondary disabled">Terminado</button>`
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  } else {
    listEl.innerHTML = `
      <div class="col-12 text-center py-5 bg-light rounded-4 border shadow-sm animate-fade-in" style="border-style: dashed !important; border-width: 2px !important;">
          <div class="mb-3">
            <i class="fas fa-calendar-times fs-1 text-muted opacity-25"></i>
          </div>
          <h4 class="fw-bold text-dark">Não tens nenhum workshop reservado</h4>
          <p class="text-muted">Parece que ainda não tens nenhuma reserva ativa para os próximos workshops.</p>
          <a href="workshops.html" class="btn btn-auth-enhanced login mt-2 px-4">
            <i class="fas fa-search me-2"></i>Descobrir Workshops
          </a>
      </div>
    `;
  }
}

window.cancelWorkshop = async function (reservationId) {
  const result = await Swal.fire({
    title: "Cancelar Reserva?",
    text: "Tens a certeza que queres cancelar esta reserva? A vaga voltará a ficar disponível.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, Cancelar",
    cancelButtonText: "Não",
  });

  if (!result.isConfirmed) return;

  const token = getAuthToken();
  if (!token) {
    await handleSessionExpired("Sessão expirada. Volta a fazer login.");
    return;
  }

  try {
    const res = await fetch(`/api/user/workshops/${reservationId}`, {
      method: "DELETE",
      headers: buildAuthHeaders(),
    });

    const data = await handleProtectedResponse(
      res,
      "Falha ao cancelar reserva.",
    );
    if (data.handled) return;

    Swal.fire({
      title: "Cancelada",
      text: "A reserva foi cancelada com sucesso.",
      icon: "success",
      confirmButtonColor: "#1a4d2e",
    });

    fetchUserWorkshops();
  } catch (err) {
    console.error("Cancel workshop error:", err);
    Swal.fire("Erro", err.message || "Erro de ligação ao servidor.", "error");
  }
};
