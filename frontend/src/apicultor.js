import { updateNav, getLoggedUser, getAuthToken, buildAuthHeaders } from "./auth.js";
import Swal from "sweetalert2";
import { toast } from "./toast.js";
import { Skeleton } from "./skeleton.js";
import { getLang } from "./i18n.js";

const localTranslations = {
  // Favorites auth info
  favLoginTitle: { pt: "Iniciar Sessão", en: "Sign In" },
  favLoginText: { pt: "Precisas de estar logado para guardar favoritos.", en: "You must be signed in to save favorites." },
  favLoginBtn: { pt: "Entrar", en: "Sign In" },

  // Workshop reservation
  reserveLoginWarning: { pt: "Inicie sessão para reservar a sua vaga!", en: "Sign in to reserve your spot!" },
  reserveLoginTitle: { pt: "Autenticação Necessária", en: "Authentication Required" },
  reserveSuccess: { pt: "Reserva efetuada com sucesso!", en: "Reservation completed successfully!" },
  reserveError: { pt: "Não foi possível efetuar a reserva.", en: "Could not complete reservation." },
  networkError: { pt: "Erro de ligação ao servidor.", en: "Server connection error." },

  // Block/Unblock
  blockTitle: { pt: "Bloquear Apicultor?", en: "Block Beekeeper?" },
  blockText: { pt: "Não poderás enviar ou receber mensagens privadas deste apicultor.", en: "You won't be able to send or receive private messages from this beekeeper." },
  blockConfirmBtn: { pt: "Sim, bloquear", en: "Yes, block" },
  blockCancelBtn: { pt: "Cancelar", en: "Cancel" },
  blockSuccess: { pt: "Apicultor bloqueado com sucesso!", en: "Beekeeper blocked successfully!" },
  blockError: { pt: "Erro ao bloquear apicultor.", en: "Error blocking beekeeper." },
  unblockSuccess: { pt: "Apicultor desbloqueado com sucesso!", en: "Beekeeper unblocked successfully!" },
  unblockError: { pt: "Erro ao desbloquear apicultor.", en: "Error unblocking beekeeper." },
  connError: { pt: "Erro de ligação.", en: "Connection error." },

  // Report
  reportTitle: { pt: "Denunciar Apicultor", en: "Report Beekeeper" },
  reportInputLabel: { pt: "Qual é o motivo da denúncia?", en: "What is the reason for the report?" },
  reportInputPlaceholder: { pt: "Escreve aqui o motivo...", en: "Write the reason here..." },
  reportConfirmBtn: { pt: "Enviar Denúncia", en: "Send Report" },
  reportCancelBtn: { pt: "Cancelar", en: "Cancel" },
  reportItemText: { pt: "Denúncia de perfil de apicultor", en: "Beekeeper profile report" },
  reportSuccessTitle: { pt: "Denúncia Enviada!", en: "Report Sent!" },
  reportSuccessText: { pt: "A tua denúncia foi registada e será analisada pela moderação.", en: "Your report has been registered and will be analyzed by moderators." },
  reportError: { pt: "Erro ao enviar denúncia", en: "Error sending report" },

  // Profile data
  defaultBio: { pt: "Este apicultor ainda não definiu a sua biografia, mas garante o melhor mel da região!", en: "This beekeeper has not set a biography yet, but guarantees the best honey in the region!" },
  sendMsg: { pt: "Enviar Mensagem", en: "Send Message" },
  reportBtn: { pt: "Denunciar", en: "Report" },
  blockBtn: { pt: "Bloquear", en: "Block" },
  unblockBtn: { pt: "Desbloquear", en: "Unblock" },

  // Products & Workshops
  loadingProductsError: { pt: "Falha ao carregar produtos do apicultor", en: "Failed to load beekeeper's products" },
  noProducts: { pt: "Ainda não há produtos listados por este apicultor.", en: "No products listed by this beekeeper yet." },
  semCategoria: { pt: "Sem Categoria", en: "Uncategorized" },
  adicionarAoCarrinho: { pt: "Adicionar ao Carrinho", en: "Add to Cart" },
  
  loadingWorkshopsError: { pt: "Falha ao carregar workshops do apicultor", en: "Failed to load beekeeper's workshops" },
  noWorkshops: { pt: "Não há workshops ou experiências agendadas de momento.", en: "No workshops or experiences scheduled at the moment." },
  vagasDisponiveis: { pt: "vagas disponíveis", en: "spots available" },
  inscrito: { pt: "Inscrito", en: "Registered" },
  reservarVaga: { pt: "Reservar Vaga", en: "Book Spot" },
  esgotado: { pt: "Esgotado", en: "Sold Out" }
};

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
  const lang = getLang();
  if (!token) {
    Swal.fire({
      title: localTranslations.favLoginTitle[lang],
      text: localTranslations.favLoginText[lang],
      icon: "info",
      confirmButtonText: localTranslations.favLoginBtn[lang],
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
    const lang = getLang();
    if (!activeUser) {
        toast.warning(localTranslations.reserveLoginWarning[lang], localTranslations.reserveLoginTitle[lang]);
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
            if (data.addedToCart) {
                if (window.cart) {
                    await window.cart.syncWithBackend();
                    window.cart.render();
                    window.cart.toggle(true);
                }
            } else {
                toast.success(data.message || localTranslations.reserveSuccess[lang]);
            }
            // Reload workshops to update vacancy count
            fetchWorkshops(apicultorId);
        } else {
            toast.error(data.error || localTranslations.reserveError[lang]);
        }
    } catch (err) {
        toast.error(localTranslations.networkError[lang]);
    }
  };

  window.blockApicultor = async (id) => {
    const lang = getLang();
    const result = await Swal.fire({
      title: localTranslations.blockTitle[lang],
      text: localTranslations.blockText[lang],
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: localTranslations.blockConfirmBtn[lang],
      cancelButtonText: localTranslations.blockCancelBtn[lang]
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch(`/api/users/block/${id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          toast.success(localTranslations.blockSuccess[lang]);
          location.reload();
        } else {
          const data = await res.json();
          toast.error(data.error || localTranslations.blockError[lang]);
        }
      } catch (err) {
        toast.error(localTranslations.connError[lang]);
      }
    }
  };

  window.unblockApicultor = async (id) => {
    const lang = getLang();
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`/api/users/unblock/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(localTranslations.unblockSuccess[lang]);
        location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || localTranslations.unblockError[lang]);
      }
    } catch (err) {
      toast.error(localTranslations.connError[lang]);
    }
  };

  window.reportApicultor = async (id) => {
    const lang = getLang();
    const { value: reason } = await Swal.fire({
      title: localTranslations.reportTitle[lang],
      input: 'textarea',
      inputLabel: localTranslations.reportInputLabel[lang],
      inputPlaceholder: localTranslations.reportInputPlaceholder[lang],
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: localTranslations.reportConfirmBtn[lang],
      cancelButtonText: localTranslations.reportCancelBtn[lang]
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
            itemText: localTranslations.reportItemText[lang]
          }),
        });

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: localTranslations.reportSuccessTitle[lang],
            text: localTranslations.reportSuccessText[lang],
            confirmButtonColor: "#1a4d2e"
          });
        } else {
          const data = await res.json();
          Swal.fire("Erro", data.error || localTranslations.reportError[lang], "error");
        }
      } catch (err) {
        toast.error(localTranslations.connError[lang]);
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

  window.addEventListener("cart-updated", () => {
    fetchWorkshops(apicultorId);
  });
});

async function fetchProfile(id) {
  const res = await fetch(`/api/apicultores/${id}`);
  if (!res.ok) throw new Error("Apicultor não encontrado");
  const data = await res.json();
  const lang = getLang();

  document.title = `${data.name} - Hexomel`;
  document.getElementById("api-name").textContent = data.name;
  document.getElementById("api-bio").textContent =
    data.bio ||
    localTranslations.defaultBio[lang];
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
          <i class="fas fa-comment-dots me-2"></i> ${localTranslations.sendMsg[lang]}
        </a>
        <button onclick="window.reportApicultor(${id})" class="btn btn-sm btn-danger rounded-pill px-3 shadow-sm fw-bold">
          <i class="fas fa-flag me-2"></i> ${localTranslations.reportBtn[lang]}
        </button>
        <button id="btn-block-api" onclick="window.blockApicultor(${id})" class="btn btn-sm btn-secondary rounded-pill px-3 shadow-sm fw-bold">
          <i class="fas fa-ban me-2"></i> ${localTranslations.blockBtn[lang]}
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
              btnBlock.innerHTML = `<i class="fas fa-check me-2"></i> ${localTranslations.unblockBtn[lang]}`;
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
  const lang = getLang();

  // Mostrar skeleton placeholders enquanto carrega
  if (grid) grid.innerHTML = Skeleton.productGrid(4);

  const res = await fetch(`/api/apicultores/${id}/products`);
  if (!res.ok) throw new Error(`${localTranslations.loadingProductsError[lang]}: ${res.status}`);
  const products = await res.json();
  grid.innerHTML = "";

  if (products.length === 0) {
    grid.innerHTML = Skeleton.stateEmpty(localTranslations.noProducts[lang], 'fa-box-open');
    return;
  }

  products.forEach((p) => {
    const tags = p.Tags ? p.Tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const tagsHtml = tags.map(tag => `<div class="product-badge tag-${tag.toLowerCase().replace(/\s+/g, '-')}" data-i18n="tag.${tag.toUpperCase()}">${window.__t ? window.__t('tag.' + tag.toUpperCase()) : tag}</div>`).join('');
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
            <p class="text-muted small mb-0">${p.CategoriaNome || localTranslations.semCategoria[lang]} • 500g</p>
            ${p.OrigemNome ? `<p class="text-muted smaller mb-1"><i class="fas fa-map-marker-alt me-1"></i>${p.OrigemNome}</p>` : ''}
          </div>
          <div class="d-flex justify-content-between align-items-center mt-auto gap-2 pt-2 border-top">
            <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">€${parseFloat(p.Preco).toFixed(2)}</span>
            <div class="d-flex gap-2">
              <button class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect" 
                      style="width: 30px; height: 30px; min-width: 30px !important; font-size: 0.85rem; padding: 0 !important; flex-shrink: 0;" 
                      onclick="event.stopPropagation(); window.addToCart(${p.ID_Produto})"
                      title="${localTranslations.adicionarAoCarrinho[lang]}">
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
  const lang = getLang();

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
  if (!res.ok) throw new Error(`${localTranslations.loadingWorkshopsError[lang]}: ${res.status}`);
  const workshops = await res.json();
  grid.innerHTML = "";

  if (workshops.length === 0) {
    grid.innerHTML = Skeleton.stateEmpty(localTranslations.noWorkshops[lang], 'fa-chalkboard-teacher');
    return;
  }

  const locale = lang === 'pt' ? 'pt-PT' : 'en-GB';

  function formatDateSafely(dateStr, locale, options) {
    try {
      if (!dateStr) return "Data inválida";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Data inválida";
      return d.toLocaleDateString(locale, options);
    } catch (err) {
      console.error("Date formatting error:", err);
      return "Data inválida";
    }
  }

  workshops.forEach((w) => {
    const date = formatDateSafely(w.Data_Realizacao, locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const col = document.createElement("div");
    col.className = "col-lg-4 col-md-6";
    const hasVagas = w.Vagas > 0;

    const reservation = userReservations.find(r => r.ID_Workshop === w.ID_Workshop);
    const isPago = reservation && reservation.Status === 'Pago';
    const isPendente = reservation && reservation.Status === 'Pendente';
    const isInCart = window.cart && window.cart.items.some(item => item.ID_Workshop === w.ID_Workshop);

    let badgeHtml = '';
    let buttonHtml = '';

    if (reservation) {
      if (isPago) {
        badgeHtml = `<div class="workshop-reserved-badge" style="position: absolute; top: 15px; left: 15px; background: #2e7d32; color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-check-circle"></i> Inscrito</div>`;
        buttonHtml = `
          <button class="btn btn-success w-100 mt-4 rounded-pill fw-bold disabled" disabled>
            <i class="fas fa-check-circle me-1"></i> Inscrito
          </button>
        `;
      } else if (isPendente) {
        badgeHtml = `<div class="workshop-reserved-badge" style="position: absolute; top: 15px; left: 15px; background: #f4b400; color: #000; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-exclamation-circle"></i> Pendente</div>`;
        buttonHtml = `
          <button class="btn w-100 mt-4 rounded-pill fw-bold" 
                  style="background: #f4b400; color: #000; border: none;"
                  onclick="event.stopPropagation(); window.location.href='profile.html?tab=workshops'">
            <i class="fas fa-wallet me-1"></i> Pendente (Pagar)
          </button>
        `;
      }
    } else if (isInCart) {
      buttonHtml = `
        <button class="btn btn-warning w-100 mt-4 rounded-pill fw-bold" 
                style="background-color: #f4b400; border-color: #f4b400; color: #000;"
                onclick="event.stopPropagation(); window.cart.toggle(true);">
          <i class="fas fa-shopping-cart me-1"></i> No Carrinho
        </button>
      `;
    } else {
      buttonHtml = `
        <button class="btn btn-warning w-100 mt-4 rounded-pill fw-bold" 
                onclick="window.reserveWorkshop(${w.ID_Workshop})" 
                ${!hasVagas ? 'disabled' : ''}>
            ${hasVagas ? localTranslations.reservarVaga[lang] : localTranslations.esgotado[lang]}
        </button>
      `;
    }

    col.innerHTML = `
            <div class="workshop-card h-100">
                <div class="position-relative">
                  <img src="${w.Imagem || "assets/default-workshop.png"}" class="workshop-img w-100" alt="${w.Titulo}">
                  ${badgeHtml}
                </div>
                <div class="p-4">
                    <span class="badge badge-date mb-2"><i class="far fa-calendar-alt me-1"></i> ${date}</span>
                    <h4 class="fw-bold mb-3">${w.Titulo}</h4>
                    <p class="text-muted small mb-4">${w.Descricao}</p>
                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <span class="fs-4 fw-bold text-warning">${parseFloat(w.Preco).toFixed(2)}€</span>
                        <span class="text-muted small">${w.Vagas} ${localTranslations.vagasDisponiveis[lang]}</span>
                    </div>
                    ${buttonHtml}
                </div>
            </div>
        `;
    grid.appendChild(col);
  });
}
