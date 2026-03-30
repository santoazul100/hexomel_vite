import { getLoggedUser, updateNav, logout } from "./auth.js";
import Swal from "sweetalert2";

let currentUserData = null;
let selectedRole = null;

document.addEventListener("DOMContentLoaded", () => {
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

async function handleUserDataSave(section) {
  const token = localStorage.getItem("token");
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      showInlineStatus("saved");

      // Update Local State
      currentUserData = { ...currentUserData, ...payload };
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({ ...localUser, ...payload }),
      );

      // Refresh UI Components
      renderProfile(currentUserData);
      toggleEditMode(section); // Return to view mode
      updateNav(JSON.parse(localStorage.getItem("user")));
    } else {
      showInlineStatus("error", data.error);
    }
  } catch (error) {
    console.error("Save error:", error);
    showInlineStatus("error");
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
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to fetch profile");
    }

    const data = await res.json();
    currentUserData = data;
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
      const parts = data.address.split(", ");
      const rest = parts.slice(1).join(", ");
      const restWords = rest.split(" ");
      viewCity.innerText = restWords.slice(1).join(" ") || "Não definida";
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
}

function renderOrders(orders) {
  const ordersList = document.getElementById("orders-list");
  if (orders.length > 0) {
    ordersList.innerHTML = orders
      .map(
        (order) => `
            <div class="premium-card p-4 d-flex justify-content-between align-items-center mb-3">
                <div>
                    <div class="fw-bold">Encomenda #${order.id}</div>
                    <div class="small text-muted">${new Date(order.date).toLocaleDateString("pt-PT")}</div>
                </div>
                <div class="text-end d-flex flex-column align-items-end gap-2">
                    <div>
                        <div class="fw-bold" style="color: var(--primary-green)">€${(parseFloat(order.total) || 0).toFixed(2)}</div>
                        <span class="badge rounded-pill ${order.status === "Pendente" ? "bg-warning text-dark" : "bg-success"}">${order.status}</span>
                    </div>
                    <button class="btn btn-sm btn-outline-warning py-1 px-3 rounded-pill" onclick="window.viewOrderDetails(${order.id})">
                        <i class="fas fa-eye me-1"></i> Detalhes
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  } else {
    ordersList.innerHTML = `
            <div class="text-center py-5 opacity-50 bg-light rounded-4 border">
                <i class="fas fa-shopping-basket fs-1 mb-3"></i>
                <p>Ainda não fizeste nenhuma encomenda.</p>
                <a href="shop.html" class="btn btn-sm btn-auth-enhanced register">Ir para a Loja</a>
            </div>
        `;
  }
}

async function fetchFavorites() {
  const token = localStorage.getItem("token");
  const favGrid = document.getElementById("favorites-grid");

  if (!token || !favGrid) return;

  try {
    const res = await fetch("/api/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch favorites");

    const favorites = await res.json();
    renderFavorites(favorites);
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
                      <div class="text-muted" style="font-size: 0.85rem;">€${(parseFloat(fav.Preco) || 0).toFixed(2)}</div>
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
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`/api/favorites/remove/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) fetchFavorites();
  } catch (error) {
    console.error("Remove favorite error:", error);
  }
};

async function handlePasswordUpdate(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();

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
      Swal.fire("Erro", data.error || "Falha ao atualizar password", "error");
    }
  } catch (error) {
    console.error("Password update error:", error);
    Swal.fire("Erro", "Erro ao comunicar com o servidor.", "error");
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
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
        const data = await res.json();
        Swal.fire("Erro", data.error || "Falha ao eliminar conta", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire("Erro", "Erro ao comunicar com o servidor.", "error");
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
      const base64Image = event.target.result;
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/profile/picture", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ picture: base64Image }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao atualizar foto");
      }

      document.getElementById("profile-avatar-large").src = base64Image;
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      try {
        const res = await fetch("/api/user/profile/picture", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ picture: base64Image }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao atualizar foto");
        }

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
  const token = localStorage.getItem("token");
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
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Falha ao carregar detalhes");

    const items = await res.json();

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
              <th class="text-end">Preço</th>
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
            <div class="text-muted small">€${parseFloat(item.Preco_Unitario).toFixed(2)} / un</div>
          </td>
          <td class="text-center small">${item.Quantidade}</td>
          <td class="text-end fw-bold small">€${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    itemsHtml += `
          </tbody>
          <tfoot class="border-top">
            <tr>
              <td colspan="3" class="pt-3 fw-bold">Total da Encomenda</td>
              <td class="pt-3 text-end fw-bold fs-5 text-warning">€${total.toFixed(2)}</td>
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


// Upgrade Request Handling
async function handleUpgradeRequest(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) return;

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

    const res = await fetch("/api/upgrade-request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

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
      const errorData = await res.json();
      throw new Error(errorData.error || "Erro ao enviar pedido.");
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
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("/api/user/upgrade-request-status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
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
    }
  } catch (error) {
    console.error("Check upgrade status error:", error);
  }
}
