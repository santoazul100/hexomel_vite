(function () {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (e) {}

  const cartStr = localStorage.getItem("cart");
  let cart = [];
  try { cart = JSON.parse(cartStr || "[]"); } catch(e){}

  if (user) {
    document.documentElement.classList.add("auth-user-present");
  }

  if (cart.length > 0) {
    document.documentElement.classList.add("cart-items-present");
  }

  // Instant Maintenance Anti-Flicker Check
  const path = window.location.pathname.toLowerCase();
  if (!path.includes("admin")) {
    try {
      const rawCache = localStorage.getItem("hexomel_maint_cache");
      if (rawCache) {
        const settings = JSON.parse(rawCache);
        const isTrue = (val) => val === "true" || val === true || val === "1" || val === 1;
        let currentSection = "full";
        if (path.includes("shop") || path.includes("loja") || path.includes("produto") || path.includes("checkout") || path.includes("cart")) {
          currentSection = "shop";
        } else if (path.includes("curiosidades")) {
          currentSection = "curiosidades";
        } else if (path.includes("aprender") || path.includes("workshops") || path.includes("faq")) {
          currentSection = "aprender";
        } else if (path.includes("rede-social") || path.includes("comunidade") || path.includes("hexohive")) {
          currentSection = "hexohive";
        }

        const isFull = isTrue(settings.maintenance_full) || isTrue(settings.maintenance_mode);
        const isSection = currentSection !== "full" && isTrue(settings[`maintenance_${currentSection}`]);

        if (isFull || isSection) {
          const style = document.createElement("style");
          style.id = "hexomel-anti-flicker-maint";
          style.textContent = `main, #app, body > div.container, body > div.container-fluid, .products-section, .hero { opacity: 0 !important; visibility: hidden !important; }`;
          (document.head || document.documentElement).appendChild(style);
        }
      }
    } catch(e) {}
  }

  // Anti-flicker: Inject Navigation Auth State immediately upon DOM parsing
  const observer = new MutationObserver((mutations, obs) => {
    const authSection = document.getElementById('authSection');
    if (authSection) {
      if (user) {
        const avatar = user.picture && user.picture.trim() !== "" ? user.picture : user.avatar || "/images/default-user.png";
        const firstName = user.name?.split(" ")[0] || user.firstName || "User";
        authSection.innerHTML = `
          <div class="d-flex align-items-center gap-3">
              <div class="dropdown">
                  <div class="profile-avatar-container" data-bs-toggle="dropdown" aria-expanded="false">
                      <img src="${avatar}" alt="User" class="user-avatar-navbar" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/images/default-user.png'">
                      <span class="user-name-navbar d-none d-md-block">${firstName}</span>
                  </div>
                  <ul class="dropdown-menu dropdown-menu-end dropdown-menu-premium animate-fade-in">
                      <li><a class="dropdown-item dropdown-item-premium mt-1" href="profile.html"><i class="fas fa-spinner fa-spin me-2"></i>A carregar perfil...</a></li>
                  </ul>
              </div>
          </div>
        `;
      } else {
        authSection.innerHTML = `
          <button class="btn btn-primary rounded-pill px-4 auth-login-btn fw-bold" onclick="window.openAuthModal('login')">
              Entrar
          </button>
        `;
      }
      obs.disconnect(); // Stop observing once injected
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
