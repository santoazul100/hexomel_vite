// Workshops page JavaScript — handles workshop listing, detail modal, and reservations
import "./styles/index.css";
import { cart } from "./cart.js";
import { getLoggedUser } from "./auth.js";
import { toast } from "./toast.js";
import Swal from "sweetalert2";
import { trackPageView } from "./analytics.js";
import { Skeleton } from "./skeleton.js";

const API_URL = "/api";
const fallbackImage = "/images/workshop_default.webp";

let workshops = [];
let userReservations = [];

// Fetch all approved workshops
async function fetchWorkshops() {
  const gridEl = document.getElementById("workshops-grid");

  // Carregar estilo de placeholder configurado pelo admin
  await Skeleton.init();

  // Mostrar skeleton placeholders enquanto carrega
  if (gridEl) {
    gridEl.innerHTML = Skeleton.genericGrid(6, 'col-md-6 col-lg-4 mb-4');
  }

  userReservations = [];
  const user = getLoggedUser();
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (user && token) {
    try {
      const res = await fetch(`${API_URL}/user/workshops`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        userReservations = await res.json();
      }
    } catch (e) {
      console.error("Error fetching user reservations:", e);
    }
  }

  try {
    const res = await fetch(`${API_URL}/workshops`);
    if (!res.ok) throw new Error("Falha ao carregar workshops");
    workshops = await res.json();

    if (workshops.length === 0) {
      if (gridEl) gridEl.innerHTML = Skeleton.stateEmpty('Ainda não há workshops disponíveis de momento.', 'fa-chalkboard-teacher');
      return;
    }

    renderWorkshops();
  } catch (err) {
    console.error("Error fetching workshops:", err);
    if (gridEl) {
      gridEl.innerHTML = Skeleton.stateError('Erro ao carregar workshops. Tenta novamente.', 'retry-workshops-btn');
      Skeleton.onRetry('retry-workshops-btn', () => fetchWorkshops());
    }
  }
}

// Render workshop cards
function renderWorkshops() {
  const grid = document.getElementById("workshops-grid");
  if (!grid) return;

  grid.innerHTML = workshops
    .map((w, i) => {
      const date = formatDate(w.Data_Realizacao);
      const hasVagas = w.Vagas > 0;
      const isPast = new Date(w.Data_Realizacao) < new Date();
      const price = parseFloat(w.Preco).toFixed(2);
      const isReserved = userReservations.some(r => r.ID_Workshop === w.ID_Workshop);

      let buttonHtml = '';
      if (isPast) {
        buttonHtml = `<button class="btn btn-workshop-reserve disabled" disabled>Terminado</button>`;
      } else if (isReserved) {
        buttonHtml = `<button class="btn btn-success disabled w-auto" disabled><i class="fas fa-check-circle me-1"></i>Inscrito</button>`;
      } else if (!hasVagas) {
        buttonHtml = `<button class="btn btn-workshop-reserve disabled" disabled>Esgotado</button>`;
      } else {
        buttonHtml = `
          <button class="btn btn-workshop-reserve" 
                  onclick="event.stopPropagation(); window.reserveWorkshop(${w.ID_Workshop})">
            <i class="fas fa-ticket-alt me-2"></i>Reservar
          </button>
        `;
      }

      return `
      <div class="col-md-6 col-lg-4 animate-fade-up" style="animation-delay: ${i * 0.1}s">
        <div class="workshop-card-premium h-100 d-flex flex-column">
          <div class="workshop-img-wrapper" onclick="window.openWorkshopDetail(${w.ID_Workshop})" style="cursor:pointer">
            <img src="${w.Imagem || fallbackImage}" alt="${w.Titulo}" onerror="this.src='${fallbackImage}'">
            <div class="workshop-date-badge">
              <i class="far fa-calendar-alt me-1"></i>${date}
            </div>
            ${isPast ? '<div class="workshop-past-badge">Terminado</div>' : ''}
            ${!hasVagas && !isPast ? '<div class="workshop-sold-badge">Esgotado</div>' : ''}
            ${isReserved && !isPast ? '<div class="workshop-reserved-badge" style="position: absolute; top: 15px; left: 15px; background: #2e7d32; color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-check-circle"></i> Inscrito</div>' : ''}
          </div>
          <div class="workshop-card-body p-4 d-flex flex-column flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-3">
              <img src="${w.ApicultorFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.ApicultorNome)}&background=random`}" 
                   class="rounded-circle" style="width:32px;height:32px;object-fit:cover" 
                   referrerpolicy="no-referrer"
                   onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(w.ApicultorNome)}&background=random'" alt="">
              <span class="small text-muted">${w.ApicultorNome}</span>
            </div>
            <h5 class="fw-bold mb-2">${w.Titulo}</h5>
            <p class="text-muted small mb-3 flex-grow-1" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
              ${w.Descricao}
            </p>
            <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
              <div>
                <span class="h5 fw-bold mb-0" style="color: var(--primary-green)">${price}€</span>
                <span class="small text-muted d-block">${hasVagas ? w.Vagas + ' vagas' : 'Sem vagas'}</span>
              </div>
              ${buttonHtml}
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

// Format date helper
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Open workshop detail modal
window.openWorkshopDetail = function (id) {
  const w = workshops.find((ws) => ws.ID_Workshop === id);
  if (!w) return;

  const date = formatDate(w.Data_Realizacao);
  const hasVagas = w.Vagas > 0;
  const isPast = new Date(w.Data_Realizacao) < new Date();
  const price = parseFloat(w.Preco).toFixed(2);
  const isReserved = userReservations.some((r) => r.ID_Workshop === id);

  const content = document.getElementById("workshop-detail-content");
  content.innerHTML = `
    <div class="workshop-detail-modal">
      <div class="workshop-detail-img">
        <img src="${w.Imagem || fallbackImage}" alt="${w.Titulo}" onerror="this.src='${fallbackImage}'">
        <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0 m-3 bg-dark bg-opacity-50 rounded-circle p-2" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="p-4 p-md-5">
        <div class="d-flex align-items-center gap-2 mb-3">
          <img src="${w.ApicultorFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.ApicultorNome)}&background=random`}" 
               class="rounded-circle" style="width:40px;height:40px;object-fit:cover" 
               referrerpolicy="no-referrer"
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(w.ApicultorNome)}&background=random'" alt="">
          <div>
            <div class="fw-bold small">${w.ApicultorNome}</div>
            <div class="text-muted" style="font-size:0.75rem">Apicultor</div>
          </div>
        </div>

        <h2 class="fw-bold mb-3">${w.Titulo}</h2>

        <div class="d-flex flex-wrap gap-3 mb-4">
          <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
            <i class="far fa-calendar-alt me-1 text-warning"></i>${date}
          </span>
          <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
            <i class="fas fa-users me-1 text-warning"></i>${w.Vagas} vagas disponíveis
          </span>
          <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
            <i class="fas fa-tag me-1 text-warning"></i>${price}€
          </span>
        </div>

        <div class="mb-4">
          <h6 class="fw-bold mb-2">Sobre o Workshop</h6>
          <p class="text-muted" style="white-space:pre-line; line-height:1.8">${w.Descricao}</p>
        </div>

        <div class="d-flex gap-3">
          ${isPast 
            ? `<button class="btn btn-workshop-reserve flex-grow-1 py-3 disabled" disabled><i class="fas fa-clock me-2"></i>Workshop Terminado</button>`
            : isReserved 
              ? `<button class="btn btn-success flex-grow-1 py-3 disabled" disabled><i class="fas fa-check-circle me-2"></i>Inscrito</button>`
              : `<button class="btn btn-workshop-reserve flex-grow-1 py-3 ${!hasVagas ? 'disabled' : ''}" onclick="window.reserveWorkshop(${w.ID_Workshop})" ${!hasVagas ? 'disabled' : ''}><i class="fas fa-ticket-alt me-2"></i>Reservar Vaga</button>`
          }
          <button class="btn btn-auth-enhanced login py-3" data-bs-dismiss="modal">Fechar</button>
        </div>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById("workshopDetailModal"));
  modal.show();
};

// Reserve workshop
window.reserveWorkshop = async function (id) {
  const user = getLoggedUser();
  if (!user) {
    Swal.fire({
      title: "Iniciar Sessão",
      text: "Precisas de estar logado para reservar um workshop.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Entrar",
      cancelButtonText: "Depois",
      confirmButtonColor: "#f4b400",
    }).then((result) => {
      if (result.isConfirmed) {
        window.openAuthModal("login");
      }
    });
    return;
  }

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    toast.warning("Sessão expirada. Faz login novamente.");
    return;
  }

  // Find workshop details for the confirmation
  const w = workshops.find((ws) => ws.ID_Workshop === id);
  const price = w ? parseFloat(w.Preco).toFixed(2) : "0.00";
  const isPaid = w && parseFloat(w.Preco) > 0;

  // Confirm with price info
  const confirm = await Swal.fire({
    title: "Confirmar Reserva",
    html: isPaid
      ? `<p>Queres reservar a tua vaga no workshop <strong>"${w.Titulo}"</strong>?</p>
         <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:12px 16px;margin-top:12px;">
           <p style="margin:0;color:#92400e;font-weight:600;"><i class="fas fa-info-circle me-1"></i> Preço: ${price}€</p>
           <p style="margin:4px 0 0;color:#92400e;font-size:0.85rem;">O pagamento será efetuado presencialmente no dia do workshop.</p>
         </div>`
      : `<p>Queres reservar a tua vaga no workshop <strong>"${w ? w.Titulo : ''}"</strong>?</p>
         <p style="color:#166534;font-weight:600;"><i class="fas fa-gift me-1"></i> Workshop gratuito!</p>`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sim, reservar!",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#1a4d2e",
  });

  if (!confirm.isConfirmed) return;

  try {
    const res = await fetch(`${API_URL}/workshops/${id}/reserve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();

    if (res.ok) {
      // Close modal if open
      const modal = bootstrap.Modal.getInstance(document.getElementById("workshopDetailModal"));
      if (modal) modal.hide();

      Swal.fire({
        title: "Reserva Confirmada!",
        html: isPaid
          ? `<p>${data.message || "A tua vaga foi reservada com sucesso."}</p><p class="text-muted small">Lembra-te de efetuar o pagamento de <strong>${price}€</strong> no dia do workshop.</p>`
          : data.message || "A tua vaga foi reservada com sucesso.",
        icon: "success",
        confirmButtonColor: "#1a4d2e",
      });

      // Refresh workshops
      await fetchWorkshops();
    } else {
      toast.error(data.error || "Não foi possível efetuar a reserva.");
    }
  } catch (err) {
    console.error("Reserve error:", err);
    toast.error("Erro de ligação ao servidor.");
  }
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  trackPageView();
  await fetchWorkshops();

  // Cart logic
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => cart.toggle(true));
  }
});

console.log("Workshops page loaded! 🐝");
