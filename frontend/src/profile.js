// Profile page logic
import { getLoggedUser } from "./auth.js";

// ... existing code ...

document.addEventListener("DOMContentLoaded", () => {
  fetchProfileData();
  updateNav(getLoggedUser());
});

async function fetchProfileData() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch profile");

    const data = await res.json();
    renderProfile(data);
  } catch (error) {
    console.error("Profile fetch error:", error);
    // If unauthorized, redirect might be needed, but for now just log
  }
}

function renderProfile(data) {
  // Basic Info
  document.getElementById("profile-name").innerText = data.Nome;
  document.getElementById("profile-email").innerText = data.Email;
  // document.getElementById("profile-level").innerText = data.Level || 1;

  if (data.Picture) {
    document.getElementById("profile-avatar-large").src = data.Picture;
  } else {
    document.getElementById("profile-avatar-large").src =
      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.Nome)}&background=f4b400&color=fff&size=150`;
  }

  // Orders
  const ordersList = document.getElementById("orders-list");
  if (data.orders && data.orders.length > 0) {
    ordersList.innerHTML = data.orders
      .map(
        (order) => `
            <div class="premium-card p-4 d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">Encomenda #${order.ID_Encomenda}</div>
                    <div class="small text-muted">${new Date(order.Data_Encomenda).toLocaleDateString("pt-PT")}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold" style="color: var(--primary-green)">€${order.Total.toFixed(2)}</div>
                    <span class="badge rounded-pill ${order.Status === "Pendente" ? "bg-warning text-dark" : "bg-success"}">${order.Status}</span>
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
    const res = await fetch("http://localhost:3000/api/favorites", {
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
            <div class="premium-card p-3 d-flex align-items-center gap-3">
                <img src="/img/produtos/${fav.ID_Produto}.webp" alt="${fav.Nome}" style="width: 50px; height: 50px; object-fit: contain;" onerror="this.src='https://placehold.co/50x50/f6f6f6/e0e0e0?text=H'">
                <div class="flex-grow-1">
                    <div class="fw-bold small">${fav.Nome}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">€${fav.Preco.toFixed(2)}</div>
                </div>
                <button onclick="removeFromFavorites(${fav.ID_Produto})" class="btn btn-sm text-danger"><i class="fas fa-times"></i></button>
            </div>
        `,
      )
      .join("");
  } else {
    favGrid.innerHTML = `
            <div class="text-center py-4 opacity-50 bg-light rounded-4 border">
                <p class="small mb-0">Sem favoritos.</p>
            </div>
        `;
  }
}

window.removeFromFavorites = async function (productId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(
      `http://localhost:3000/api/favorites/remove/${productId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (res.ok) fetchFavorites();
  } catch (error) {
    console.error("Remove favorite error:", error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  fetchProfileData();
  updateNav(getLoggedUser());
});
