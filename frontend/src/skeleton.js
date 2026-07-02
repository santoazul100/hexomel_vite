/**
 * Hexomel — Skeleton Loader Module
 * 
 * Sistema centralizado de placeholder/loading state.
 * Gera HTML de placeholders de acordo com o estilo
 * configurado pelo admin (skeleton ou spinner).
 * 
 * Uso:
 *   import { Skeleton } from './skeleton.js';
 *   await Skeleton.init();  // carrega config do admin
 *   container.innerHTML = Skeleton.productGrid(6);
 */

// Importar CSS dos skeletons
import './styles/skeleton.css';

// Importar i18n para traduzir texto do spinner
import { getLang } from './i18n.js';

/**
 * Traduções locais para o spinner (mínimas, independentes do i18n principal)
 */
const LOADING_TEXT = {
  pt: 'Carregando',
  en: 'Loading'
};

/**
 * Módulo Skeleton — funções estáticas para gerar HTML de placeholders
 */
export const Skeleton = {

  /** Estilo ativo: 'skeleton' (cards shimmer) ou 'spinner' (círculo + texto) */
  _style: (() => {
    try {
      return localStorage.getItem('hexomel_skeleton_style') || 'skeleton';
    } catch(e) {
      return 'skeleton';
    }
  })(),

  /** Flag para evitar múltiplos fetches */
  _initialized: false,

  /** Promise de inicialização (evita race conditions) */
  _initPromise: null,

  // ============================
  // INIT — Carrega configuração do admin
  // ============================
  init() {
    // Se já temos uma promise, reutiliza-a
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      if (this._initialized) return;
      try {
        const res = await fetch('/api/site-settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings.placeholder_style === 'spinner' || settings.placeholder_style === 'skeleton') {
            this._style = settings.placeholder_style;
            try {
              localStorage.setItem('hexomel_skeleton_style', this._style);
            } catch(e) {}
          }
        }
      } catch (e) {
        // Silently fallback to 'skeleton' if API is unavailable
        console.warn('Skeleton: Could not load site settings, using default style.');
      }
      this._initialized = true;
    })();

    return this._initPromise;
  },

  // ============================
  // SPINNER — Estilo com círculo e texto i18n
  // ============================
  spinner(lines = 1) {
    const lang = getLang();
    const text = LOADING_TEXT[lang] || LOADING_TEXT.pt;

    return `
      <div class="skeleton-spinner-container">
        <div class="skeleton-spinner-circle"></div>
        <p class="skeleton-spinner-text">${text}</p>
      </div>`;
  },

  // ============================
  // PRODUCT CARD SKELETON
  // ============================
  productCard() {
    return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="skeleton-product-card">
          <div class="skeleton-product-image" style="position:relative">
            <div class="skeleton-product-tags">
              <div class="skeleton skeleton-badge"></div>
            </div>
          </div>
          <div class="skeleton-product-body">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text medium"></div>
            <div class="skeleton skeleton-text short"></div>
            <div class="skeleton skeleton-text short" style="margin-top:4px"></div>
            <div class="skeleton-product-footer">
              <div class="skeleton skeleton-price"></div>
              <div class="skeleton-product-actions">
                <div class="skeleton skeleton-btn-circle"></div>
                <div class="skeleton skeleton-btn-circle"></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  // ============================
  // PRODUCT GRID (múltiplos cards)
  // ============================
  productGrid(count = 6) {
    if (this._style === 'spinner') return this.spinner();
    return Array.from({ length: count }, () => this.productCard()).join('');
  },

  // ============================
  // COMMUNITY POST SKELETON
  // ============================
  communityPost() {
    return `
      <div class="skeleton-community-post">
        <div class="skeleton-post-header">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-post-meta">
            <div class="skeleton skeleton-text medium" style="margin-bottom:6px"></div>
            <div class="skeleton skeleton-text short" style="height:10px"></div>
          </div>
        </div>
        <div class="skeleton-post-body">
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text full"></div>
          <div class="skeleton skeleton-text medium"></div>
        </div>
        <div class="skeleton-post-actions">
          <div class="skeleton skeleton-button" style="width:60px;height:28px;border-radius:14px"></div>
          <div class="skeleton skeleton-button" style="width:80px;height:28px;border-radius:14px"></div>
          <div class="skeleton skeleton-button" style="width:100px;height:28px;border-radius:14px"></div>
        </div>
      </div>`;
  },

  // ============================
  // COMMUNITY LIST (múltiplos posts)
  // ============================
  communityList(count = 4) {
    if (this._style === 'spinner') return this.spinner();
    return Array.from({ length: count }, () => this.communityPost()).join('');
  },

  // ============================
  // GENERIC CARD SKELETON
  // ============================
  genericCard() {
    return `
      <div class="skeleton-generic-card">
        <div class="skeleton skeleton-generic-image"></div>
        <div class="skeleton-generic-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>`;
  },

  // ============================
  // GENERIC GRID (múltiplos cards genéricos)
  // ============================
  genericGrid(count = 3, colClass = 'col-md-4 mb-4') {
    if (this._style === 'spinner') return this.spinner();
    return Array.from({ length: count }, () => `
      <div class="${colClass}">
        ${this.genericCard()}
      </div>
    `).join('');
  },

  // ============================
  // WORKSHOP CARD SKELETON
  // ============================
  workshopCard() {
    return `
      <div class="workshop-card-premium h-100 d-flex flex-column" style="pointer-events: none;">
        <div class="skeleton" style="width: 100%; aspect-ratio: 16/10; border-radius: 20px 20px 0 0; position: relative;">
          <div style="position: absolute; top: 12px; right: 12px;">
            <div class="skeleton skeleton-badge" style="width: 110px; background: rgba(255,255,255,0.3);"></div>
          </div>
        </div>
        <div class="workshop-card-body p-4 d-flex flex-column flex-grow-1">
          <div class="d-flex align-items-center gap-2 mb-3">
            <div class="skeleton skeleton-circle" style="width: 32px; height: 32px; flex-shrink: 0;"></div>
            <div class="skeleton skeleton-text short" style="margin-bottom: 0; width: 80px;"></div>
          </div>
          <div class="skeleton skeleton-title" style="width: 85%;"></div>
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
            <div>
              <div class="skeleton skeleton-price" style="margin-bottom: 4px; height: 24px; width: 60px;"></div>
              <div class="skeleton skeleton-text short" style="margin-bottom: 0; height: 12px; width: 50px;"></div>
            </div>
            <div class="skeleton skeleton-button" style="width: 100px; border-radius: 50px; height: 40px;"></div>
          </div>
        </div>
      </div>`;
  },

  // ============================
  // WORKSHOP GRID (múltiplos cards de workshops)
  // ============================
  workshopGrid(count = 6, colClass = 'col-md-6 col-lg-4') {
    if (this._style === 'spinner') return this.spinner();
    return Array.from({ length: count }, () => `
      <div class="${colClass}">
        ${this.workshopCard()}
      </div>
    `).join('');
  },


  // ============================
  // STATE: ERROR
  // ============================
  stateError(message = 'Ocorreu um erro ao carregar os dados.', retryId = null) {
    const retryBtn = retryId
      ? `<button class="state-retry-btn" id="${retryId}">
           <i class="fas fa-redo"></i> Tentar novamente
         </button>`
      : `<button class="state-retry-btn" onclick="location.reload()">
           <i class="fas fa-redo"></i> Tentar novamente
         </button>`;

    return `
      <div class="col-12">
        <div class="skeleton-state-error">
          <div class="state-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h3 class="state-title">Erro de Carregamento</h3>
          <p class="state-message">${message}</p>
          ${retryBtn}
        </div>
      </div>`;
  },

  // ============================
  // STATE: EMPTY / SEM RESULTADOS
  // ============================
  stateEmpty(message = 'Nenhum resultado encontrado.', icon = 'fa-inbox') {
    return `
      <div class="col-12">
        <div class="skeleton-state-empty">
          <div class="state-icon">
            <i class="fas ${icon}"></i>
          </div>
          <h3 class="state-title">Sem Resultados</h3>
          <p class="state-message">${message}</p>
        </div>
      </div>`;
  },

  // ============================
  // HELPER: Revelar conteúdo com animação
  // ============================
  reveal(container) {
    if (!container) return;
    container.classList.add('skeleton-content-reveal');
  },

  // ============================
  // HELPER: Bind retry button callback
  // ============================
  onRetry(retryId, callback) {
    const btn = document.getElementById(retryId);
    if (btn && typeof callback === 'function') {
      btn.addEventListener('click', callback);
    }
  }
};

// Export por defeito também
export default Skeleton;
