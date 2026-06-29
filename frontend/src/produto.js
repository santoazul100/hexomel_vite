// Individual Product Page — SEO-friendly slug-based routing
import "./styles/index.css";
import { cart } from "./cart.js";
import Swal from "sweetalert2";
import { trackPageView } from "./analytics.js";
import { getLoggedUser } from "./auth.js";

const API_URL = "/api";
const fallbackImage = "/images/default-product.png";

let currentProduct = null;

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

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  let slug = params.get("slug");

  if (!slug) {
    const pathParts = window.location.pathname.split("/");
    const prodIndex = pathParts.indexOf("produto");
    if (prodIndex !== -1 && pathParts[prodIndex + 1]) {
      slug = decodeURIComponent(pathParts[prodIndex + 1]);
    }
  }

  if (!slug) {
    window.location.href = "/loja";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/products/by-slug/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) {
        document.getElementById("produto-content").innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="fas fa-search fa-3x mb-3 text-muted opacity-25"></i>
            <h3 class="text-muted">Produto não encontrado</h3>
            <p class="text-muted">O produto que procura pode ter sido removido ou o link está incorreto.</p>
            <a href="shop.html" class="btn btn-add-cart-lg mt-3 px-4 py-2" style="font-size: 0.95rem;">
              <i class="fas fa-arrow-left me-2"></i>Voltar à Loja
            </a>
          </div>
        `;
        return;
      }
      throw new Error("Failed to load product");
    }

    currentProduct = await res.json();
    renderProduct(currentProduct);
    loadReviews(currentProduct.ID_Produto);

    // Update SEO meta tags
    document.title = `${currentProduct.Nome} — Hexomel`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = currentProduct.Descricao
        ? currentProduct.Descricao.substring(0, 160)
        : `${currentProduct.Nome} — mel artesanal premium da Hexomel.`;
    }

    // Track page view
    trackPageView();
  } catch (error) {
    console.error("Error loading product:", error);
    document.getElementById("produto-content").innerHTML = `
      <div class="col-12 text-center py-5">
        <h3 class="text-danger">Erro ao carregar produto</h3>
        <a href="shop.html" class="btn btn-outline-secondary mt-3">Voltar à Loja</a>
      </div>
    `;
  }
}

function renderProduct(p) {
  document.getElementById("breadcrumb-name").textContent = p.Nome;

  const content = document.getElementById("produto-content");
  content.innerHTML = `
    <!-- Product Image -->
    <div class="col-lg-6">
      <div class="produto-image-wrapper">
        <img src="${p.Imagem || fallbackImage}" alt="${p.Nome}" onerror="this.src='${fallbackImage}'">
      </div>
    </div>

    <!-- Product Info -->
    <div class="col-lg-6">
      ${p.Tags ? `<div class="produto-tags-top d-flex flex-wrap gap-2 mb-3">
        ${p.Tags.split(",").map(t => `<span class="badge-tag">${t.trim()}</span>`).join("")}
      </div>` : ""}
      
      <h1 class="fw-bold mb-2" style="font-size: 2rem; color: #1e293b;">${p.Nome}</h1>
      
      <div class="star-rating-lg d-flex align-items-center gap-2 mb-3">
        ${generateStars(p.Rating || 0)}
        <span class="text-muted small">(${p.ReviewCount || 0} avaliações)</span>
      </div>

      <div class="produto-price mb-4">€${parseFloat(p.Preco).toFixed(2)}</div>

      <div class="produto-description mb-4">
        ${p.Descricao || "Descrição não disponível para este produto."}
      </div>

      <!-- Product Meta -->
      <div class="mb-4">
        ${p.CategoriaNome ? `<div class="produto-meta-item">
          <i class="fas fa-layer-group"></i>
          <span>Categoria: <strong>${p.CategoriaNome}</strong></span>
        </div>` : ""}
        ${p.OrigemNome ? `<div class="produto-meta-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>Origem: <strong>${p.OrigemNome}</strong></span>
        </div>` : ""}
        <div class="produto-meta-item">
          <i class="fas fa-box"></i>
          <span>Stock: <strong>${p.Stock > 0 ? `${p.Stock} disponíveis` : "Esgotado"}</strong></span>
        </div>
      </div>

      ${p.ID_Apicultor ? `
        <a href="profile.html?id=${p.ID_Apicultor}" class="apicultor-badge mb-4 d-inline-flex">
          <img src="${(p.ApicultorFoto && p.ApicultorFoto.trim() !== '' && p.ApicultorFoto !== 'null' && p.ApicultorFoto !== 'undefined') ? p.ApicultorFoto : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.ApicultorNome || 'A')}&background=random`}" 
               alt="${p.ApicultorNome}" 
               referrerpolicy="no-referrer" 
               onerror="this.src='https://ui-avatars.com/api/?name=A&background=random'">
          <div>
            <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Vendido por</div>
            <div class="fw-bold">${p.ApicultorNome || "Apicultor"}</div>
          </div>
        </a>
      ` : `
        <div class="apicultor-badge hexomel-badge mb-4 d-inline-flex">
          <div class="hexomel-badge-icon d-flex align-items-center justify-content-center">
            <i class="fas fa-check-circle"></i>
          </div>
          <div>
            <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Garantia</div>
            <div class="fw-bold">Original Hexomel</div>
          </div>
        </div>
      `}

      <!-- Add to Cart & Contact -->
      <div class="d-flex align-items-center gap-3 mt-4 flex-wrap">
        <div class="qty-selector">
          <button type="button" id="qty-minus">−</button>
          <input type="number" id="product-qty" value="1" min="1" readonly>
          <button type="button" id="qty-plus">+</button>
        </div>
        <button class="btn-add-cart-lg" id="btn-add-to-cart" ${p.Stock <= 0 ? "disabled" : ""}>
          <i class="fas fa-shopping-cart me-2"></i>
          ${p.Stock > 0 ? "Adicionar ao Carrinho" : "Esgotado"}
        </button>

        ${p.ID_Apicultor ? `
          <button class="btn btn-outline-success fw-bold px-4" id="btn-ask-seller" style="border: 2px solid var(--primary-green); color: var(--primary-green); background: transparent; transition: all 0.2s ease; height: 44px; border-radius: 10px; font-size: 0.95rem; display: inline-flex; align-items: center; justify-content: center; margin: 0;">
            <i class="fas fa-comment-dots me-2"></i>Perguntar ao Vendedor
          </button>
        ` : `
          <a href="contact.html" class="btn btn-outline-success fw-bold px-4 d-inline-flex align-items-center justify-content-center" id="btn-contact-support" style="border: 2px solid var(--primary-green); color: var(--primary-green); background: transparent; transition: all 0.2s ease; text-decoration: none; height: 44px; border-radius: 10px; font-size: 0.95rem; margin: 0;">
            <i class="fas fa-envelope me-2"></i>Contactar Apoio ao Cliente
          </a>
        `}
      </div>
    </div>
  `;

  // Show reviews section
  document.getElementById("produto-reviews").style.display = "block";

  // Bind qty buttons
  document.getElementById("qty-minus").addEventListener("click", () => {
    const input = document.getElementById("product-qty");
    let val = parseInt(input.value) - 1;
    if (val < 1) val = 1;
    input.value = val;
  });
  document.getElementById("qty-plus").addEventListener("click", () => {
    const input = document.getElementById("product-qty");
    let val = parseInt(input.value) + 1;
    if (val > p.Stock) {
      val = p.Stock;
      Swal.fire({
        icon: "warning",
        title: "Limite de Stock",
        text: `Apenas existem ${p.Stock} unidades disponíveis em stock.`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
    input.value = val;
  });

  const qtyInput = document.getElementById("product-qty");
  if (qtyInput) {
    qtyInput.addEventListener("change", function () {
      let val = parseInt(this.value) || 1;
      if (val < 1) val = 1;
      if (val > p.Stock) {
        val = p.Stock;
        Swal.fire({
          icon: "warning",
          title: "Limite de Stock",
          text: `Apenas existem ${p.Stock} unidades disponíveis em stock.`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
      this.value = val;
    });
  }

  // Bind add to cart
  document.getElementById("btn-add-to-cart").addEventListener("click", async () => {
    const qty = parseInt(document.getElementById("product-qty").value);
    if (qty > p.Stock) {
      Swal.fire("Limite de Stock", `Apenas existem ${p.Stock} unidades em stock.`, "warning");
      return;
    }
    const success = await cart.addItem(p.ID_Produto, qty, false);
    if (success) {
      Swal.fire({
        icon: "success",
        title: "Adicionado!",
        text: `${p.Nome} foi adicionado ao carrinho.`,
        timer: 1800,
        showConfirmButton: false,
      }).then(() => {
        cart.toggle(true);
      });
    }
  });

  // Bind ask seller button
  const askSellerBtn = document.getElementById("btn-ask-seller");
  if (askSellerBtn) {
    askSellerBtn.addEventListener("click", () => {
      const currentUser = getLoggedUser();
      if (!currentUser) {
        Swal.fire({
          icon: "warning",
          title: "Inicie sessão",
          text: "Precisa de iniciar sessão para enviar mensagens ao vendedor.",
          showCancelButton: true,
          confirmButtonText: "Iniciar Sessão",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "var(--primary-green)"
        }).then((result) => {
          if (result.isConfirmed) {
            window.openAuthModal("login");
          }
        });
        return;
      }

      // Check if trying to message oneself
      if (currentUser.id === p.ID_Apicultor) {
        Swal.fire({
          icon: "info",
          title: "Este produto é seu",
          text: "Não pode enviar uma mensagem a si mesmo sobre o seu próprio produto.",
          confirmButtonColor: "var(--primary-green)"
        });
        return;
      }

      const prefillMsg = `Olá! Tenho interesse no seu produto "${p.Nome}". Gostaria de obter mais informações.`;
      window.location.href = `rede-social.html?chatWith=${p.ID_Apicultor}&prefill=${encodeURIComponent(prefillMsg)}&product=${p.Slug}`;
    });
  }
}

async function loadReviews(productId) {
  const container = document.getElementById("reviews-container");
  try {
    const res = await fetch(`${API_URL}/products/${productId}/reviews`);
    if (!res.ok) throw new Error("Failed");
    const reviews = await res.json();

    if (reviews.length === 0) {
      container.innerHTML = '<div class="col-12"><p class="text-muted">Ainda não existem avaliações para este produto. Seja o primeiro!</p></div>';
      return;
    }

    container.innerHTML = reviews.map(r => {
      const currentUser = JSON.parse(localStorage.getItem("user") || "null");
      const canDelete = currentUser && (currentUser.id === r.ID_Cliente || currentUser.role === "admin");

      return `
      <div class="col-md-6 col-lg-4">
        <div class="review-card-product">
          <div class="d-flex align-items-center gap-3 mb-3">
            <img src="${r.ClienteFoto && r.ClienteFoto !== 'null' ? r.ClienteFoto : `https://ui-avatars.com/api/?name=${encodeURIComponent(r.ClienteNome)}&background=random`}" 
                 class="rounded-circle" style="width:40px; height:40px; object-fit:cover;" referrerpolicy="no-referrer"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.ClienteNome)}&background=random'">
            <div>
              <div class="fw-bold" style="font-size:0.95rem;">${r.ClienteNome}</div>
              <div class="star-rating-lg" style="font-size:0.75rem;">${generateStars(r.Nota)}</div>
            </div>
          </div>
          <p class="text-muted mb-2" style="font-size:0.9rem;">${r.Comentario || ""}</p>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <small class="text-muted">${new Date(r.Data_Avaliacao).toLocaleDateString("pt-PT")}</small>
            ${canDelete ? `
              <button class="btn btn-sm btn-link text-danger text-decoration-none p-0 delete-review-btn" 
                      data-id="${r.ID_Avaliacao}" 
                      style="font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                <i class="fas fa-trash-alt me-1"></i> Eliminar
              </button>
            ` : ""}
          </div>
        </div>
      </div>
      `;
    }).join("");

    // Bind delete review buttons
    container.querySelectorAll(".delete-review-btn").forEach(btn => {
      btn.addEventListener("click", async function() {
        const reviewId = this.getAttribute("data-id");
        const token = localStorage.getItem("token");

        const result = await Swal.fire({
          title: "Tem a certeza?",
          text: "Esta ação apagará permanentemente a sua avaliação.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          confirmButtonText: "Sim, apagar!",
          cancelButtonText: "Cancelar"
        });

        if (result.isConfirmed) {
          try {
            const deleteRes = await fetch(`${API_URL}/admin/reviews/${reviewId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` }
            });

            const data = await deleteRes.json();
            if (deleteRes.ok) {
              Swal.fire({
                icon: "success",
                title: "Avaliação apagada com sucesso",
                timer: 1200,
                showConfirmButton: false
              });
              loadReviews(productId);
            } else {
              Swal.fire("Erro", data.error || "Erro ao apagar avaliação", "error");
            }
          } catch (err) {
            console.error(err);
            Swal.fire("Erro", "Erro ao comunicar com o servidor", "error");
          }
        }
      });
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-danger">Erro ao carregar avaliações.</p>';
  }
}

function setupReviewForm() {
  const stars = document.querySelectorAll("#rating-input-stars i");
  const hiddenInput = document.getElementById("review-rating-value");

  const setRating = (rating) => {
    hiddenInput.value = rating;
    stars.forEach((star, idx) => {
      if (idx < rating) {
        star.classList.remove("far");
        star.classList.add("fas");
        star.style.color = "#f4b400";
      } else {
        star.classList.remove("fas");
        star.classList.add("far");
        star.style.color = "#ddd";
      }
    });
  };

  stars.forEach((star) => {
    star.addEventListener("mouseover", function () {
      const val = parseInt(this.getAttribute("data-value"));
      stars.forEach((s, idx) => {
        s.style.color = idx < val ? "#f4b400" : "#ddd";
        if (idx < val) { s.classList.remove("far"); s.classList.add("fas"); }
        else { s.classList.remove("fas"); s.classList.add("far"); }
      });
    });

    star.parentNode.addEventListener("mouseout", () => setRating(parseInt(hiddenInput.value)));

    star.addEventListener("click", function () {
      setRating(parseInt(this.getAttribute("data-value")));
    });
  });

  document.getElementById("submit-review-btn").addEventListener("click", async () => {
    if (!currentProduct) return;
    const rating = parseInt(hiddenInput.value);
    const comment = document.getElementById("review-comment").value;
    const token = localStorage.getItem("token");

    if (!token) {
      Swal.fire("Login Necessário", "Por favor, faça login para avaliar.", "info");
      return;
    }
    if (rating === 0) {
      Swal.fire("Atenção", "Por favor, selecione uma classificação.", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/products/${currentProduct.ID_Produto}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire("Sucesso", "Avaliação enviada!", "success");
        document.getElementById("review-comment").value = "";
        setRating(0);
        loadReviews(currentProduct.ID_Produto);
      } else {
        Swal.fire("Erro", data.error || "Falha ao enviar avaliação", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Erro de conexão", "error");
    }
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadProduct();
  setupReviewForm();
});
