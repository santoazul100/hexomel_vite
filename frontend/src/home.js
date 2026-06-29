import { app } from "./common.js";
import { API_URL } from "./api.js";

const homePage = {
  async init() {
    await this.loadFeaturedProducts();
    this.initCarouselControls();
  },

  async loadFeaturedProducts() {
    const grid = document.getElementById("featured-products");
    if (!grid) return;

    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();

      // Filter products that are marked as featured
      let products = data.filter((p) => Number(p.Em_Destaque) === 1);

      if (products.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5" style="width: 100%;">Nenhum produto em destaque de momento.</div>';
        const dotsContainer = document.getElementById("featured-carousel-dots");
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
      }

      grid.innerHTML = products
        .map((p) => {
          const category = p.CategoriaNome || "Mel Puro";
          const rating = p.Rating || 5;
          const reviewCount = p.ReviewCount || 0;
          const weight = "500g";
          const origin = p.OrigemNome || "N/A";
          const tags = p.Tags ? p.Tags.split(",").map((t) => t.trim()) : [];
          
          const starsHtml = this.generateStars(rating);

          const tagsHtml = tags
            .map(
              (tag) => `
            <div class="product-badge tag-${tag.toLowerCase().replace(/\s+/g, "-")}">${tag}</div>
          `,
            )
            .join("");

          const beekeeperHtml = p.ID_Apicultor
            ? `<p class="smaller mb-0" style="color: #f4b400; font-size: 0.78rem;">
                <i class="fas fa-user me-1"></i>Vendido por: 
                <span class="fw-bold">${p.ApicultorNome}</span>
              </p>`
            : `<p class="smaller mb-0 text-muted" style="font-size: 0.78rem;"><i class="fas fa-check-circle me-1 text-success"></i>Original Hexomel</p>`;

          return `
            <div class="product-card-premium d-flex flex-column" style="flex: 0 0 280px; scroll-snap-align: start; min-height: 350px;">
              <div class="product-img-container" style="cursor: pointer" onclick="window.location.href='/produto/${p.Slug || ""}'">
                <div class="product-tags-container">
                  ${tagsHtml}
                </div>
                <img src="${p.Imagem || "/images/default-product.png"}" alt="${p.Nome}" onerror="this.src='/images/default-product.png'">
              </div>
              <div class="p-3 d-flex flex-column flex-grow-1">
                <div onclick="window.location.href='/produto/${p.Slug || ""}'" style="cursor: pointer" class="mb-2">
                  <h5 class="fw-bold mb-1" style="min-height: 2.2rem; font-size: 1.1rem;">${p.Nome}</h5>
                  <div class="star-rating mb-1" style="font-size: 0.85rem;">
                    ${starsHtml} 
                    <span class="text-muted small">(${reviewCount})</span>
                  </div>
                  <p class="text-muted small mb-0">${category} • ${weight}</p>
                  <p class="text-muted smaller mb-1" style="font-size: 0.8rem;"><i class="fas fa-map-marker-alt me-1"></i>${origin}</p>
                  ${beekeeperHtml}
                </div>
                <div class="d-flex justify-content-between align-items-center mt-auto gap-2 pt-2 border-top">
                  <span class="h5 fw-bold mb-0" style="color: var(--primary-green); font-size: 1.25rem;">€${Number(p.Preco).toFixed(2)}</span>
                  
                  <div class="d-flex gap-2">
                    ${p.Slug ? `
                      <a href="/produto/${p.Slug}" class="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect" 
                         style="width: 34px; height: 34px; min-width: 34px !important; font-size: 0.75rem; padding: 0 !important; flex-shrink: 0; text-decoration: none; border-color: rgba(26, 77, 46, 0.2); color: var(--primary-green);" 
                         title="Ver Produto">
                        <i class="fas fa-external-link-alt" style="font-size: 0.65rem;"></i>
                      </a>
                    ` : ""}
                    <button class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center icon-hover-effect add-to-cart-home" 
                            style="width: 34px; height: 34px; min-width: 34px !important; font-size: 0.85rem; padding: 0 !important; flex-shrink: 0; background: var(--primary-green); border: 0;" 
                            data-id="${p.ID_Produto}"
                            title="Adicionar ao Carrinho">
                      <i class="fas fa-shopping-cart" style="font-size: 0.75rem; color: white;"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
      
      // Bind click events for add-to-cart
      grid.querySelectorAll(".add-to-cart-home").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          const product = data.find((p) => p.ID_Produto === id);
          if (product && app && typeof app.addToCart === "function") {
            app.addToCart(product);
          }
        });
      });

      // Render dots
      this.setupCarouselDots();
    } catch (error) {
      console.warn("Home featured products: using static HTML fallback.", error);
    }
  },

  setupCarouselDots() {
    const carousel = document.getElementById("featured-products");
    if (!carousel) return;
    
    setTimeout(() => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      if (maxScroll <= 0) {
        this.renderCarouselDots(0, []);
        return;
      }
      
      const firstCard = carousel.firstElementChild;
      const cardWidth = firstCard ? firstCard.offsetWidth : 280;
      const gap = 24; // 1.5rem
      const step = cardWidth + gap;
      
      const snapPoints = [];
      for (let s = 0; s < maxScroll; s += step) {
        snapPoints.push(s);
      }
      snapPoints.push(maxScroll);
      
      const uniqueSnaps = snapPoints.filter((val, i, arr) => {
        if (i === 0) return true;
        return val - arr[i-1] > 10; 
      });

      this.carouselSnapPoints = uniqueSnaps;
      this.renderCarouselDots(uniqueSnaps.length, uniqueSnaps);
      carousel.dispatchEvent(new Event("scroll")); 
    }, 50);
  },

  renderCarouselDots(count, snapPoints = []) {
    const dotsContainer = document.getElementById("featured-carousel-dots");
    if (!dotsContainer) return;

    if (count <= 1) {
      dotsContainer.innerHTML = "";
      return;
    }

    let dotsHtml = "";
    for (let i = 0; i < count; i++) {
      dotsHtml += `
        <button class="carousel-dot ${i === 0 ? 'active' : ''}" 
                data-index="${i}" 
                aria-label="Slide ${i + 1}">
        </button>
      `;
    }
    dotsContainer.innerHTML = dotsHtml;

    // Adicionar eventos de clique aos pontos
    const dots = dotsContainer.querySelectorAll(".carousel-dot");
    const carousel = document.getElementById("featured-products");
    
    dots.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        if (!carousel) return;
        const targetScroll = snapPoints.length > i ? snapPoints[i] : 0;
        carousel.scrollTo({ left: targetScroll, behavior: "smooth" });
      });
    });
  },

  generateStars(rating) {
    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        starsHtml += '<i class="fas fa-star filled" style="color: #f4b400"></i>';
      } else if (i - 0.5 <= rating) {
        starsHtml += '<i class="fas fa-star-half-alt filled" style="color: #f4b400"></i>';
      } else {
        starsHtml += '<i class="far fa-star" style="color: #ddd"></i>';
      }
    }
    return starsHtml;
  },

  initCarouselControls() {
    const prevBtn = document.getElementById("featured-prev");
    const nextBtn = document.getElementById("featured-next");
    const carousel = document.getElementById("featured-products");

    if (!prevBtn || !nextBtn || !carousel) return;

    prevBtn.addEventListener("click", () => {
      carousel.scrollBy({ left: -304, behavior: "smooth" });
    });

    nextBtn.addEventListener("click", () => {
      carousel.scrollBy({ left: 304, behavior: "smooth" });
    });

    // Synchronize dots on scroll
    carousel.addEventListener("scroll", () => {
      const dots = document.querySelectorAll("#featured-carousel-dots .carousel-dot");
      if (dots.length <= 1) return;
      
      const currentScroll = carousel.scrollLeft;
      let closestIndex = 0;
      let minDiff = Infinity;
      
      const snapPoints = this.carouselSnapPoints || [];
      snapPoints.forEach((snap, idx) => {
        const diff = Math.abs(currentScroll - snap);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      });
      
      dots.forEach((dot, idx) => {
        if (idx === closestIndex) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });
    });

    // Reajustar ao redimensionar a janela
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.setupCarouselDots();
      }, 250);
    });
  },
};

document.addEventListener("DOMContentLoaded", () => homePage.init());
