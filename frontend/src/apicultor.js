import { updateNav, getLoggedUser, getAuthToken, buildAuthHeaders } from "./auth.js";
import Swal from "sweetalert2";
import { toast } from "./toast.js";
import { Skeleton } from "./skeleton.js";

let userFavorites = [];
async function loadUserFavorites() {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch("/api/user/favorites", {
      headers: buildAuthHeaders()
    });
    if (res.ok) {
      userFavorites = await res.json();
    }
  } catch (err) {
    console.error("Error loading user favorites:", err);
  }
}

function isFavorited(productId) {
  return userFavorites.some((f) => f.id === productId || f.ID_Produto === productId);
}

window.toggleFavorite = async function (productId) {
  const token = getAuthToken();
  if (!token) {
    Swal.fire({
      title: "Iniciar Sessão",
      text: "Precisas de estar logado para guardar favoritos.",
      icon: "info",
      confirmButtonText: "Entrar",
      confirmButtonColor: "var(--primary-green)"
    });
    return;
  }

  const isCurrentlyFav = isFavorited(productId);

  try {
    const res = await fetch(
      `/api/user/favorites/${isCurrentlyFav ? "remove/" + productId : "add"}`,
      {
        method: isCurrentlyFav ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: isCurrentlyFav ? null : JSON.stringify({ productId }),
      },
    );

    if (res.ok) {
      if (isCurrentlyFav) {
        userFavorites = userFavorites.filter((f) => f.id !== productId && f.ID_Produto !== productId);
      } else {
        userFavorites.push({ id: productId });
      }
      
      // Update UI of heart buttons
      document.querySelectorAll(`#btn-fav-${productId}`).forEach(btn => {
        if (isCurrentlyFav) {
          btn.classList.remove("active");
        } else {
          btn.classList.add("active");
        }
      });
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
  }
};

function generateStars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      html += '<i class="fas fa-star" style="color: #f4b400"></i>';
    } else if (i - 0.5 <= rating) {
      html += '<i class="fas fa-star-half-alt" style="color: #f4b400"></i>';
    } else {
      html += '<i class="far fa-star" style="color: #ddd"></i>';
    }
  }
  return html;
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = getLoggedUser();
  updateNav(user);
  await loadUserFavorites();

  const urlParams = new URLSearchParams(window.location.search);
  const apicultorId = urlParams.get("id");

  if (!apicultorId) {
    window.location.href = "shop.html";
    return;
  }

  // Global functions for the onclick handlers
  window.reserveWorkshop = async (id) => {
    const activeUser = getLoggedUser();
    if (!activeUser) {
        toast.warning("Inicie sessão para reservar a sua vaga!", "Autenticação Necessária");
        return;
    }

    try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch(`/api/workshops/${id}/reserve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        
        if (res.ok) {
            toast.success(data.message || "Reserva efetuada com sucesso!");
            // Reload workshops to update vacancy count
            fetchWorkshops(apicultorId);
        } else {
            toast.error(data.error || "Não foi possível efetuar a reserva.");
        }
    } catch (err) {
        toast.error("Erro de ligação ao servidor.");
    }
  };

  window.blockApicultor = async (id) => {
    const result = await Swal.fire({
      title: "Bloquear Apicultor?",
      text: "Não poderás enviar ou receber mensagens privadas deste apicultor.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, bloquear",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch(`/api/users/block/${id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          toast.success("Apicultor bloqueado com sucesso!");
          location.reload();
        } else {
          const data = await res.json();
          toast.error(data.error || "Erro ao bloquear apicultor.");
        }
      } catch (err) {
        toast.error("Erro de ligação.");
      }
    }
  };

  window.unblockApicultor = async (id) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`/api/users/unblock/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Apicultor desbloqueado com sucesso!");
        location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao desbloquear apicultor.");
      }
    } catch (err) {
      toast.error("Erro de ligação.");
    }
  };

  window.reportApicultor = async (id) => {
    const { value: reason } = await Swal.fire({
      title: 'Denunciar Apicultor',
      input: 'textarea',
      inputLabel: 'Qual é o motivo da denúncia?',
      inputPlaceholder: 'Escreve aqui o motivo...',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Enviar Denúncia',
      cancelButtonText: 'Cancelar'
    });

    if (reason) {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch("/api/reports/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reportedUserId: id,
            itemType: "perfil",
            itemId: id,
            reason,
            itemText: "Denúncia de perfil de apicultor"
          }),
        });

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Denúncia Enviada!",
            text: "A tua denúncia foi registada e será analisada pela moderação.",
            confirmButtonColor: "#1a4d2e"
          });
        } else {
          const data = await res.json();
          Swal.fire("Erro", data.error || "Erro ao enviar denúncia", "error");
        }
      } catch (err) {
        toast.error("Erro de ligação.");
      }
    }
  };


  try {
    // Carregar estilo de placeholder configurado pelo admin
    await Skeleton.init();

    await Promise.all([
      fetchProfile(apicultorId),
      fetchProducts(apicultorId),
      fetchWorkshops(apicultorId),
    ]);
  } catch (error) {
    console.error("Error loading apicultor profile:", error);
  }
});

async function fetchProfile(id) {
  const res = await fetch(`/api/apicultores/${id}`);
  if (!res.ok) throw new Error("Apicultor não encontrado");
  const data = await res.json();

  document.title = `${data.name} - Hexomel`;
  document.getElementById("api-name").textContent = data.name;
  document.getElementById("api-bio").textContent =
    data.bio ||
    "Este apicultor ainda não definiu a sua biografia, mas garante o melhor mel da região!";
  if (data.picture) {
    document.getElementById("api-photo").src = data.picture;
  }

  // Render social action buttons (message, block, report)
  const activeUser = getLoggedUser();
  const socialActionsContainer = document.getElementById("api-social-actions");
  if (socialActionsContainer) {
    if (activeUser && String(activeUser.id) !== String(id)) {
      socialActionsContainer.innerHTML = `
        <a href="rede-social.html?chatWith=${id}" class="btn btn-sm btn-success rounded-pill px-3 shadow-sm fw-bold">
          <i class="fas fa-comment-dots me-2"></i> Enviar Mensagem
        </a>
        <button onclick="window.reportApicultor(${id})" class="btn btn-sm btn-danger rounded-pill px-3 shadow-sm fw-bold">
          <i class="fas fa-flag me-2"></i> Denunciar
        </button>
        <button id="btn-block-api" onclick="window.blockApicultor(${id})" class="btn btn-sm btn-secondary rounded-pill px-3 shadow-sm fw-bold">
          <i class="fas fa-ban me-2"></i> Bloquear
        </button>
      `;
      
      // Update block button text if already blocked
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const blocksRes = await fetch("/api/users/blocks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (blocksRes.ok) {
          const blockedUsers = await blocksRes.json();
          const isBlocked = blockedUsers.some(u => String(u.id) === String(id));
          if (isBlocked) {
            const btnBlock = document.getElementById("btn-block-api");
            if (btnBlock) {
              btnBlock.innerHTML = `<i class="fas fa-check me-2"></i> Desbloquear`;
              btnBlock.className = "btn btn-sm btn-outline-secondary rounded-pill px-3 shadow-sm fw-bold";
              btnBlock.setAttribute("onclick", `window.unblockApicultor(${id})`);
            }
          }
        }
      } catch (err) {
        console.error("Error checking blocked status:", err);
      }
    } else {
      socialActionsContainer.innerHTML = "";
    }
  }
}

async function fetchProducts(id) {
  const grid = document.getElementById("api-products-grid");

  // Mostrar skeleton placeholders enquanto carrega
  if (grid) grid.innerHTML = Skeleton.productGrid(4);

  const res = await fetch(`/api/apicultores/${id}/products`);
  if (!res.ok) throw new Error(`Falha ao carregar produtos do apicultor: ${res.status}`);
  const products = await res.json();
  grid.innerHTML = "";

  if (products.length === 0) {
    grid.innerHTML = Skeleton.stateEmpty('Ainda não há produtos listados por este apicultor.', 'fa-box-open');
    return;
  }

  products.forEach((p) => {
    const tags = p.Tags ? p.Tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const tagsHtml = tags.map(tag => `<div class="product-badge tag-${tag.toLowerCase().replace(/\s+/g, '-')}">${tag}</div>`).join('');
    const col = document.createElement("div");
    col.className = "col-lg-4 col-md-6 mb-4";
    col.innerHTML = `
      <div class="product-card-premium h-100 position-relative d-flex flex-column">
        <div class="product-img-container" style="cursor: pointer" onclick="window.location.href='/produto/${p.Slug || p.ID_Produto}'">
          ${tags.length > 0 ? `<div class="product-tags-container">${tagsHtml}</div>` : ''}
          <img src="${p.Imagem || '/images/default-product.png'}" alt="${p.Nome}" onerror="this.src='/images/default-product.png'">
        </div>
        <div class="p-4 d-flex flex-column flex-grow-1">
          <div onclick="window.location.href='/produto/${p.Slug || p.ID_Produto}'" style="cursor: pointer" class="mb-3">
            <h5 class="fw-bold mb-1" style="min-height: 2.5rem;">${p.Nome}</h5>
            <div class="star-rating">
              ${generateStars(p.Rating || 0)}
              <span class="text-muted small">(${p.ReviewCount || 0})</span>
            </div>
            <p class="text-muted small mb-0">${p.CategoriaNome || 'Sem Categoria'} • 500g</p>
            ${p.OrigemNome ? `<p class="text-muted smaller mb-1"><i class="fas fa-map-marker-alt me-1"></i>${p.OrigemNome}</p>` : ''}
          </div>
          <div class="d-flex justify-content-between align-items-center mt-auto gap-2 pt-2 border-top">
            <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${parseFloat(p.Preco).toFixed(2)}</span>
            <div class="d-flex gap-2">
              <button class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect" 
                      style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.85rem; padding: 0 !important; flex-shrink: 0;" 
                      onclick="event.stopPropagation(); window.addToCart(${p.ID_Produto})"
                      title="Adicionar ao Carrinho">
                <i class="fas fa-shopping-cart" style="font-size: 0.75rem;"></i>
              </button>
              <button class="btn btn-soft-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect ${isFavorited(p.ID_Produto) ? "active" : ""}" 
                      style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.75rem; padding: 0 !important; flex-shrink: 0;" 
                      id="btn-fav-${p.ID_Produto}"
                      onclick="event.stopPropagation(); window.toggleFavorite(${p.ID_Produto})">
                  <i class="fas fa-heart"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });
}

async function fetchWorkshops(id) {
  const grid = document.getElementById("api-workshops-grid");

  // Mostrar skeleton placeholders enquanto carrega
  if (grid) grid.innerHTML = Skeleton.genericGrid(3, 'col-lg-4 col-md-6 mb-4');

  let userReservations = [];
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`/api/user/workshops`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        userReservations = await res.json();
      }
    } catch (err) {
      console.error("Error fetching user reservations:", err);
    }
  }

  const res = await fetch(`/api/apicultores/${id}/workshops`);
  if (!res.ok) throw new Error(`Falha ao carregar workshops do apicultor: ${res.status}`);
  const workshops = await res.json();
  grid.innerHTML = "";

  if (workshops.length === 0) {
    grid.innerHTML = Skeleton.stateEmpty('Não há workshops ou experiências agendadas de momento.', 'fa-chalkboard-teacher');
    return;
  }

  workshops.forEach((w) => {
    const date = new Date(w.Data_Realizacao).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const col = document.createElement("div");
    col.className = "col-lg-4 col-md-6";
    const hasVagas = w.Vagas > 0;
    const isReserved = userReservations.some(r => r.ID_Workshop === w.ID_Workshop);

    let buttonHtml = '';
    if (isReserved) {
      buttonHtml = `
        <button class="btn btn-success w-100 mt-4 rounded-pill fw-bold disabled" disabled>
          <i class="fas fa-check-circle me-1"></i> Inscrito
        </button>
      `;
    } else {
      buttonHtml = `
        <button class="btn btn-warning w-100 mt-4 rounded-pill fw-bold" 
                onclick="window.reserveWorkshop(${w.ID_Workshop})" 
                ${!hasVagas ? 'disabled' : ''}>
            ${hasVagas ? 'Reservar Vaga' : 'Esgotado'}
        </button>
      `;
    }

    col.innerHTML = `
            <div class="workshop-card h-100">
                <div class="position-relative">
                  <img src="${w.Imagem || "assets/default-workshop.png"}" class="workshop-img w-100" alt="${w.Titulo}">
                  ${isReserved ? '<div class="workshop-reserved-badge" style="position: absolute; top: 15px; left: 15px; background: #2e7d32; color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-check-circle"></i> Inscrito</div>' : ''}
                </div>
                <div class="p-4">
                    <span class="badge badge-date mb-2"><i class="far fa-calendar-alt me-1"></i> ${date}</span>
                    <h4 class="fw-bold mb-3">${w.Titulo}</h4>
                    <p class="text-muted small mb-4">${w.Descricao}</p>
                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <span class="fs-4 fw-bold text-warning">${parseFloat(w.Preco).toFixed(2)}€</span>
                        <span class="text-muted small">${w.Vagas} vagas disponíveis</span>
                    </div>
                    ${buttonHtml}
                </div>
            </div>
        `;
    grid.appendChild(col);
  });
}
