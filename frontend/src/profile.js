import { getLoggedUser, updateNav, logout } from "./auth.js";
import Swal from "sweetalert2";

let currentUserData = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchProfileData();
  const user = getLoggedUser();
  if (user) updateNav(user);

  initializeTabs();

  // Initialize Edit Form
  const editForm = document.getElementById("editProfileForm");
  if (editForm) {
    editForm.addEventListener("submit", handleProfileUpdate);
  }

  // Initialize Password Change Form
  const passwordForm = document.getElementById("changePasswordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordUpdate);
  }

  // Initialize Account Deletion
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
    console.log("Profile Data Loaded:", data);
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

    document.getElementById("profile-name").innerText = "Erro ao carregar";
    document.getElementById("orders-list").innerHTML =
      `<div class="text-center py-4 text-danger">Erro: ${error.message}</div>`;
  }
}

function renderProfile(data) {
  // Use standardized lowercase keys
  const name = data.name || "Utilizador";
  const email = data.email || "";
  const pictureUrl = data.picture;

  document.getElementById("profile-name").innerText = name;
  document.getElementById("profile-email").innerText = email;

  const avatarEl = document.getElementById("profile-avatar-large");
  if (pictureUrl) {
    avatarEl.src = pictureUrl;
  } else {
    // Default avatar as requested
    avatarEl.src = "/default-avatar.png";

    // Add error handler to fallback to UI Avatars if local default is missing
    avatarEl.onerror = function () {
      this.onerror = null;
      this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4b400&color=fff&size=160`;
    };
  }

  // Update nav and localStorage to match fresh data
  const updatedUser = { ...data, orders: undefined };
  localStorage.setItem("user", JSON.stringify(updatedUser));
  updateNav(updatedUser);

  // Orders
  const ordersList = document.getElementById("orders-list");
  const orders = data.orders || [];

  if (orders.length > 0) {
    ordersList.innerHTML = orders
      .map(
        (order) => `
            <div class="premium-card p-4 d-flex justify-content-between align-items-center mb-3">
                <div>
                    <div class="fw-bold">Encomenda #${order.id}</div>
                    <div class="small text-muted">${new Date(order.date).toLocaleDateString("pt-PT")}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold" style="color: var(--primary-green)">€${(order.total || 0).toFixed(2)}</div>
                    <span class="badge rounded-pill ${order.status === "Pendente" ? "bg-warning text-dark" : "bg-success"}">${order.status}</span>
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

  fetchFavorites();
}

async function fetchFavorites() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("/api/favorites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
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
                    <img src="/img/produtos/${fav.ID_Produto}.webp" alt="${fav.Nome}" style="width: 100%; height: 120px; object-fit: contain;" onerror="this.src='https://placehold.co/150x120/f6f6f6/e0e0e0?text=Honeycomb'">
                  </div>
                  <div class="flex-grow-1">
                      <div class="fw-bold small text-truncate">${fav.Nome}</div>
                      <div class="text-muted" style="font-size: 0.85rem;">€${fav.Preco.toFixed(2)}</div>
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

window.openEditModal = function () {
  if (!currentUserData) return;
  document.getElementById("edit-name").value = currentUserData.name || "";
  document.getElementById("edit-email").value = currentUserData.email || "";
  document.getElementById("edit-phone").value = currentUserData.phone || "";

  const modal = new bootstrap.Modal(
    document.getElementById("editProfileModal"),
  );
  modal.show();
};

async function handleProfileUpdate(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const name = document.getElementById("edit-name").value;
  const email = document.getElementById("edit-email").value;
  const phone = document.getElementById("edit-phone").value;

  try {
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, email, phone }),
    });

    const data = await res.json();

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Perfil Atualizado!",
        text: "As tuas alterações foram guardadas com sucesso.",
        confirmButtonColor: "#f4b400",
      }).then(() => {
        bootstrap.Modal.getInstance(
          document.getElementById("editProfileModal"),
        ).hide();
        fetchProfileData();
        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
        localUser.name = name;
        localUser.email = email;
        localStorage.setItem("user", JSON.stringify(localUser));
        updateNav(localUser);
      });
    } else {
      Swal.fire("Erro", data.error || "Falha ao atualizar perfil", "error");
    }
  } catch (error) {
    console.error("Update error:", error);
    Swal.fire("Erro", "Ocorreu um erro ao comunicar com o servidor.", "error");
  }
}

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
// Handle Avatar Upload
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    Swal.fire({
      icon: "error",
      title: "Ficheiro InvÃ¡lido",
      text: "Por favor, seleciona uma imagem vÃ¡lida.",
      confirmButtonColor: "#f4b400",
    });
    return;
  }

  // Validate file size (max 5MB)
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
    // Show loading
    Swal.fire({
      title: "A carregar...",
      text: "A atualizar a tua foto de perfil",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Convert image to base64
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

      // Update UI
      document.getElementById("profile-avatar-large").src = base64Image;

      // Update localStorage and nav
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
    };

    reader.onerror = () => {
      throw new Error("Erro ao ler o ficheiro");
    };

    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Avatar upload error:", error);
    Swal.fire({
      icon: "error",
      title: "Erro",
      text: error.message || "NÃ£o foi possÃ­vel atualizar a foto.",
      confirmButtonColor: "#f4b400",
    });
  } finally {
    // Reset file input
    e.target.value = "";
  }
}
