const fs = require('fs');
let c = fs.readFileSync('admin.html', 'utf8');

const target = `          <a class="admin-nav-link" data-section="workshops">
            <i class="fas fa-chalkboard-teacher"></i> <span>Workshops</span>
          </a>
            >
              <i class="fas fa-plus me-2"></i> Novo Produto
            </button>
          </header>`;

const fix = `          <a class="admin-nav-link" data-section="workshops">
            <i class="fas fa-chalkboard-teacher"></i> <span>Workshops</span>
          </a>
          <a class="admin-nav-link" data-section="quiz">
            <i class="fas fa-question-circle"></i> <span>Quiz</span>
          </a>

          <p class="sidebar-section-title">Análise</p>
          <a class="admin-nav-link" data-section="interactions">
            <i class="fas fa-mouse-pointer"></i> <span>Interações</span>
          </a>
          <a class="admin-nav-link" data-section="seo">
            <i class="fas fa-globe"></i> <span>SEO & URLs</span>
          </a>

          <p class="sidebar-section-title">Configurações</p>
          <a class="admin-nav-link" data-section="appearance">
            <i class="fas fa-palette"></i> <span>Aparência</span>
          </a>
        </nav>
      </aside>

      <main class="admin-main" style="padding-top: 2rem">
        <section id="dashboard-section" class="admin-section active">
          <!-- Welcome Header -->
          <div class="mb-5 d-flex justify-content-between align-items-end border-bottom pb-4">
            <div>
              <p class="text-uppercase small fw-bold text-muted mb-1 ls-1" style="letter-spacing: 1.5px;">Painel de Controlo</p>
              <h1 class="fw-bold text-dark mb-0 fs-2">Visão Geral do Sistema</h1>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="row g-4 mb-5">
            <!-- Total Users -->
            <div class="col-md-2 col-sm-4">
              <div class="admin-card h-100 border-0 shadow-sm p-4 d-flex flex-column justify-content-center" style="border-left: 3px solid #64748b !important;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-muted small text-uppercase fw-semibold" style="letter-spacing: 1px;">Utilizadores</span>
                  <i class="fas fa-users text-muted opacity-50"></i>
                </div>
                <h3 id="dash-total-users" class="fw-bolder mb-0 fs-2 text-dark">0</h3>
              </div>
            </div>

            <!-- Total Products -->
            <div class="col-md-2 col-sm-4">
              <div class="admin-card h-100 border-0 shadow-sm p-4 d-flex flex-column justify-content-center" style="border-left: 3px solid #1c5236 !important;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-muted small text-uppercase fw-semibold" style="letter-spacing: 1px;">Produtos</span>
                  <i class="fas fa-box text-muted opacity-50"></i>
                </div>
                <h3 id="dash-total-products" class="fw-bolder mb-0 fs-2 text-dark">0</h3>
              </div>
            </div>

            <!-- Orders -->
            <div class="col-md-2 col-sm-4">
              <div class="admin-card h-100 border-0 shadow-sm p-4 d-flex flex-column justify-content-center" style="border-left: 3px solid #0f172a !important;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-muted small text-uppercase fw-semibold" style="letter-spacing: 1px;">Encomendas</span>
                  <i class="fas fa-shopping-bag text-muted opacity-50"></i>
                </div>
                <h3 id="dash-total-orders" class="fw-bolder mb-0 fs-2 text-dark">0</h3>
              </div>
            </div>

            <!-- Revenue -->
            <div class="col-md-3 col-sm-6">
              <div class="admin-card h-100 border-0 shadow-sm p-4 d-flex flex-column justify-content-center" style="border-left: 3px solid #1c5236 !important; background: #f8fafc;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-muted small text-uppercase fw-semibold" style="letter-spacing: 1px;">Receita Total</span>
                  <i class="fas fa-wallet text-muted opacity-50"></i>
                </div>
                <h3 id="dash-total-revenue" class="fw-bolder mb-0 fs-2" style="color: #1c5236;">0.00€</h3>
              </div>
            </div>

            <!-- Average Order Value (KPI) -->
            <div class="col-md-3 col-sm-6">
              <div class="admin-card h-100 border-0 shadow-sm p-4 d-flex flex-column justify-content-center" style="border-left: 3px solid #cbd5e1 !important;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-muted small text-uppercase fw-semibold" style="letter-spacing: 1px;">Ticket Médio</span>
                  <i class="fas fa-chart-line text-muted opacity-50"></i>
                </div>
                <h3 id="dash-avg-order-value" class="fw-bolder mb-0 fs-2 text-dark">0.00€</h3>
              </div>
            </div>
          </div>

          <!-- Charts Row 1: Sales and Orders Distribution -->
          <div class="row g-4 mb-4">
            <div class="col-lg-8">
              <div class="admin-card border-0 shadow-sm h-100 p-4">
                <h6 class="text-uppercase small fw-bold text-muted mb-4" style="letter-spacing: 1px;">Tendência de Vendas (30 Dias)</h6>
                <div style="height: 300px;">
                  <canvas id="salesChart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="admin-card border-0 shadow-sm h-100 p-4">
                <h6 class="text-uppercase small fw-bold text-muted mb-4" style="letter-spacing: 1px;">Estado das Encomendas</h6>
                <div style="height: 300px;">
                  <canvas id="orderStatusChart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts Row 2: Categories and Users Growth -->
          <div class="row g-4 mb-4">
            <div class="col-lg-4">
              <div class="admin-card border-0 shadow-sm h-100 p-4">
                <h6 class="text-uppercase small fw-bold text-muted mb-4" style="letter-spacing: 1px;">Produtos por Categoria</h6>
                <div style="height: 300px;">
                  <canvas id="categoryChart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-8">
              <div class="admin-card border-0 shadow-sm h-100 p-4">
                <h6 class="text-uppercase small fw-bold text-muted mb-4" style="letter-spacing: 1px;">Crescimento de Utilizadores</h6>
                <div style="height: 300px;">
                  <canvas id="usersGrowthChart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts Row 3: Top Products and Sales by Beekeeper -->
          <div class="row g-4 mb-4">
            <div class="col-lg-6">
              <div class="admin-card border-0 shadow-sm h-100 p-4">
                <h6 class="text-uppercase small fw-bold text-muted mb-4" style="letter-spacing: 1px;">Top 10 Produtos (Receita)</h6>
                <div style="height: 350px;">
                  <canvas id="topProductsChart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="admin-card border-0 shadow-sm h-100 p-4">
                <h6 class="text-uppercase small fw-bold text-muted mb-4" style="letter-spacing: 1px;">Vendas por Apicultor</h6>
                <div style="height: 350px;">
                  <canvas id="beekeeperSalesChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PRODUCTS SECTION -->
        <section id="products-section" class="admin-section">
          <header class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 class="fw-bold mb-1">Gestão de Produtos</h2>
              <p class="text-muted small">Adicione, edite ou remova produtos da loja virtual.</p>
            </div>
            <button class="btn btn-add-product" data-bs-toggle="modal" data-bs-target="#productModal" onclick="adminUI.resetForm()">
              <i class="fas fa-plus me-2"></i> Novo Produto
            </button>
          </header>`;

if (c.includes(target)) {
    fs.writeFileSync('admin.html', c.replace(target, fix));
    console.log('SUCCESS');
} else {
    // try to find it matching regardless of whitespace
    const targetNoSpace = target.replace(/\s+/g, '');
    const cNoSpace = c.replace(/\s+/g, '');
    if (cNoSpace.includes(targetNoSpace)) {
        console.log('Target found without spaces, please adjust target string.');
    } else {
        console.log('TARGET NOT FOUND\\n', target);
    }
}
