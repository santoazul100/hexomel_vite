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
