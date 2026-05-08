import { updateNav, getLoggedUser } from "./auth.js";
import { toast } from "./toast.js";
import { Skeleton } from "./skeleton.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = getLoggedUser();
  updateNav(user);

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
        const res = await fetch(`/api/workshops/${id}/reserve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
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

  try {
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
    const col = document.createElement("div");
    col.className = "col-lg-3 col-md-4 col-sm-6";
    col.innerHTML = `
            <div class="product-card h-100">
                <div class="product-img-wrapper">
                    <img src="${p.Imagem || "assets/default-product.png"}" class="product-img" alt="${p.Nome}">
                    <div class="product-actions">
                         <button class="btn btn-action" onclick="window.addToCart(${p.ID_Produto})"><i class="fas fa-shopping-cart"></i></button>
                    </div>
                </div>
                <div class="product-info p-3">
                    <h5 class="product-title mb-1">${p.Nome}</h5>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="product-price fw-bold text-warning">${parseFloat(p.Preco).toFixed(2)}€</span>
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
    col.innerHTML = `
            <div class="workshop-card h-100">
                <img src="${w.Imagem || "assets/default-workshop.png"}" class="workshop-img w-100" alt="${w.Titulo}">
                <div class="p-4">
                    <span class="badge badge-date mb-2"><i class="far fa-calendar-alt me-1"></i> ${date}</span>
                    <h4 class="fw-bold mb-3">${w.Titulo}</h4>
                    <p class="text-muted small mb-4">${w.Descricao}</p>
                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <span class="fs-4 fw-bold text-warning">${parseFloat(w.Preco).toFixed(2)}€</span>
                        <span class="text-muted small">${w.Vagas} vagas disponíveis</span>
                    </div>
                    <button class="btn btn-warning w-100 mt-4 rounded-pill fw-bold" 
                            onclick="window.reserveWorkshop(${w.ID_Workshop})" 
                            ${!hasVagas ? 'disabled' : ''}>
                        ${hasVagas ? 'Reservar Vaga' : 'Esgotado'}
                    </button>
                </div>
            </div>
        `;
    grid.appendChild(col);
  });
}
