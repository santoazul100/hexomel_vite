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
      const parts = currentUserData.address.split(", ");
      const street = parts[0] || "";
      const rest = parts.slice(1).join(", ");
      const restWords = rest.split(" ");
      const zip = restWords[0] || "";
      const city = restWords.slice(1).join(" ") || "";

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
    el.innerHTML = `<span class="badge" style="background:var(--primary-gold,#f4b400);color:#000;font-size:.8rem;padding:.4em .8em"><i class="fas fa-spinner fa-spin me-1"></i>A guardar alteraÃ§Ãµes...</span>`;
  } else if (type === "saved") {
    el.innerHTML = `<span class="badge bg-success" style="font-size:.8rem;padding:.4em .8em"><i class="fas fa-check-circle me-1"></i>AlteraÃ§Ãµes provocadas com sucesso!</span>`;
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
    renderProfile(data);
  } catch (error) {
    console.error("Profile fetch error:", error);
    Swal.fire({
      icon: "error",
      title: "Erro ao carregar perfil",
      text: error.message || "NÃ£o foi possÃ­vel carregar os teus dados.",
      confirmButtonColor: "#f4b400",
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
      : `<i class="fas fa-map-marker-alt me-1"></i> Morada nÃ£o definida`;
  }

  // Tab View Mode Elements
  const viewName = document.getElementById("view-name");
  if (viewName) viewName.innerText = name;

  const viewEmail = document.getElementById("view-email");
  if (viewEmail) viewEmail.innerText = email;

  const viewPhone = document.getElementById("view-phone");
  if (viewPhone) viewPhone.innerText = data.phone || "NÃ£o definido";

  const viewAddress = document.getElementById("view-address");
  if (viewAddress)
    viewAddress.innerText = data.address || "Morada nÃ£o definida";

  const viewCity = document.getElementById("view-city");
  if (viewCity) {
    if (data.address) {
      const parts = data.address.split(", ");
      const rest = parts.slice(1).join(", ");
      const restWords = rest.split(" ");
      viewCity.innerText = restWords.slice(1).join(" ") || "NÃ£o definida";
    } else {
      viewCity.innerText = "NÃ£o definida";
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
}

function renderOrders(orders) {
  const ordersList = document.getElementById("orders-list");
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
              <div class="fw-bold fs-5" style="color:var(--primary-green,#1a4d2e)">â‚¬${(parseFloat(order.total)||0).toFixed(2)}</div>
              <span class="order-status-pill" style="background:${sc.bg};color:${sc.color}"><i class="fas ${sc.icon} me-1"></i>${order.status}</span>
            </div>
          </div>
          <div class="order-timeline-container">${tl}</div>
          <div class="order-card-actions">
            <button class="btn btn-order-action primary" onclick="window.viewOrderDetails(${order.id})"><i class="fas fa-eye me-1"></i>Detalhes</button>
            <button class="btn btn-order-action" onclick="window.downloadReceipt(${order.id})"><i class="fas fa-file-invoice me-1"></i>Recibo</button>
            <button class="btn btn-order-action" onclick="window.resendReceipt(${order.id})"><i class="fas fa-envelope me-1"></i>Email</button>
            <button class="btn btn-order-action success" onclick="window.reorderItems(${order.id})"><i class="fas fa-redo me-1"></i>Repetir</button>
          </div>
        </div>`;
      }).join("");
  } else {
    ordersList.innerHTML = `
      <div class="text-center py-5 opacity-50 bg-light rounded-4 border">
        <i class="fas fa-shopping-basket fs-1 mb-3"></i>
        <p>Ainda nÃ£o fizeste nenhuma encomenda.</p>
        <a href="shop.html" class="btn btn-sm btn-auth-enhanced register">Ir para a Loja</a>
      </div>`;
  }
}

async function fetchFavorites() {
  const token = getAuthToken();
  const favGrid = document.getElementById("favorites-grid");

  if (!token || !favGrid) return;

  try {
    const res = await fetch("/api/favorites", {
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
                <p>Ainda nÃ£o tens favoritos.</p>
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
    const res = await fetch(`/api/favorites/remove/${productId}`, {
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
    return Swal.fire("Erro", "As novas passwords nÃ£o coincidem", "error");
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
    text: "Esta aÃ§Ã£o Ã© irreversÃ­vel e todos os seus dados serÃ£o eliminados!",
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
          text: "A sua conta foi removida com sucesso. Esperamos vÃª-lo de novo!",
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
      title: "Ficheiro InvÃ¡lido",
      text: "Por favor, seleciona uma imagem vÃ¡lida.",
      confirmButtonColor: "#f4b400",
    });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    Swal.fire({
      icon: "error",
      title: "Ficheiro Muito Grande",
      text: "A imagem deve ter no mÃ¡ximo 5MB.",
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
      text: error.message || "NÃ£o foi possÃ­vel atualizar a foto.",
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

    const items = result.data;

    let itemsHtml = `
      <div class="order-id-display mb-4 p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
        <span class="text-muted small">ID da Encomenda</span>
        <span class="fw-bold">#${orderId}</span>
      </div>
      <div class="table-responsive">
        <table class="table table-borderless align-middle">
          <thead class="text-muted small fw-bold">
            <tr>
              <th colspan="2">Produto</th>
              <th class="text-center">Qtd</th>
              <th class="text-end">PreÃ§o</th>
            </tr>
          </thead>
          <tbody>
    `;

    let total = 0;
    items.forEach((item) => {
      const itemTotal = item.Quantidade * item.Preco_Unitario;
      total += itemTotal;
      itemsHtml += `
        <tr>
          <td style="width: 60px;">
            <img src="${item.Imagem || "/img/produtos/" + item.ID_Produto + ".webp"}" 
                 class="rounded-3 shadow-sm" style="width: 50px; height: 50px; object-fit: cover;"
                 onerror="this.src='/images/logo_hexomel.webp'">
          </td>
          <td>
            <div class="fw-bold small text-wrap">${item.Nome}</div>
            <div class="text-muted small">â‚¬${parseFloat(item.Preco_Unitario).toFixed(2)} / un</div>
          </td>
          <td class="text-center small">${item.Quantidade}</td>
          <td class="text-end fw-bold small">â‚¬${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    itemsHtml += `
          </tbody>
          <tfoot class="border-top">
            <tr>
              <td colspan="3" class="pt-3 fw-bold">Total da Encomenda</td>
              <td class="pt-3 text-end fw-bold fs-5 text-warning">â‚¬${total.toFixed(2)}</td>
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
    Swal.fire({
      title: "Gerando Recibo...",
      didOpen: () => { Swal.showLoading(); }
    });

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
      throw new Error("Por favor, seleciona um documento de verificaÃ§Ã£o.");

    const formData = new FormData();
    formData.append("descricao", descricao);
    formData.append("document", docFile);

    const res = await fetch("/api/upgrade-request", {
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
        text: "O teu pedido de Apicultor foi enviado e serÃ¡ analisado pela administraÃ§Ã£o.",
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
  } finally {
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
        let statusText = "O teu pedido para ser Apicultor estÃ¡ pendente de anÃ¡lise.";

        if (data.Status === "Aprovado") {
          statusClass = "bg-success-subtle text-success-emphasis";
          statusIcon = "fa-check-circle";
          statusText =
            "O teu pedido de Apicultor foi aprovado! Re-inicia a sessÃ£o para ativar as tuas ferramentas de venda.";
          form.classList.add("d-none");
        } else if (data.Status === "Rejeitado") {
          statusClass = "bg-danger-subtle text-danger-emphasis";
          statusIcon = "fa-times-circle";
          statusText =
            "O teu pedido de Apicultor foi rejeitado. Podes tentar novamente mais tarde.";
        } else {
          form.classList.add("d-none");
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
