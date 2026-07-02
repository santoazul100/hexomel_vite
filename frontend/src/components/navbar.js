export function getNavbarHtml() {
  return `
    <nav class="navbar navbar-expand-lg navbar-enhanced fixed-top">
      <div class="container-fluid px-4">
        <!-- Sidebar Toggle (always visible inside navbar) -->
        <button id="navbar-sidebar-toggle" class="d-none" title="Alternar Menu" aria-label="Toggle Sidebar" style="background: transparent; border: none; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-dark); font-size: 1.1rem; margin-right: 15px; cursor: pointer; transition: background 0.2s;">
          <i class="fas fa-bars"></i>
        </button>

        <a class="navbar-brand" href="index.html">
          <img src="/images/logo_hexomel.webp" alt="Hexomel Logo" class="navbar-logo" />
        </a>
        
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav mx-auto gap-2 gap-lg-3 gap-xl-4">
            <li class="nav-item"><a class="nav-link" href="index.html" data-i18n="nav.home">Início</a></li>
            <li class="nav-item"><a class="nav-link" href="shop.html" data-i18n="nav.products">Produtos</a></li>
            <li class="nav-item"><a class="nav-link" href="workshops.html" data-i18n="nav.workshops">Workshops</a></li>
            <li class="nav-item dropdown">
              <a class="nav-link" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-i18n="nav.discover">Descobrir</a>
              <ul class="dropdown-menu dropdown-menu-hexomel">
                <li><a class="dropdown-item" href="curiosidades.html" data-i18n="nav.curiosities">Curiosidades</a></li>
                <li><a class="dropdown-item" href="aprender.html" data-i18n="nav.learn">Aprender</a></li>
              </ul>
            </li>
            <li class="nav-item"><a class="nav-link" href="about.html" data-i18n="nav.about">Sobre</a></li>
            <li class="nav-item"><a class="nav-link" href="contact.html" data-i18n="nav.contacts">Contactos</a></li>
          </ul>
          
          <div class="d-flex align-items-center navbar-right-fixed">
            <div class="cart-navbar-separate me-3">
              <button id="cart-btn" class="btn btn-link text-decoration-none text-dark position-relative p-0">
                <i class="fas fa-shopping-cart fs-5"></i>
                <span id="cart-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark border-0">0</span>
              </button>
            </div>
            <div class="d-flex align-items-center gap-3" id="authSection"></div>
          </div>
        </div>
      </div>
    </nav>
  `;
}
