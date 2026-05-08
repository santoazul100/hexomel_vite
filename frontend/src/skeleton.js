/**
 * Hexomel — Skeleton Loader Module
 * 
 * Componentes reutilizáveis de placeholder/loading state.
 * Gera HTML de skeletons para substituir temporariamente o conteúdo
 * enquanto os dados carregam da API.
 * 
 * Uso:
 *   import { Skeleton } from './skeleton.js';
 *   container.innerHTML = Skeleton.productGrid(6);
 */

// Importar CSS dos skeletons
import './styles/skeleton.css';

/**
 * Módulo Skeleton — funções estáticas para gerar HTML de placeholders
 */
export const Skeleton = {

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
    return Array.from({ length: count }, () => this.communityPost()).join('');
  },

  // ============================
  // GENERIC CARD SKELETON
  // ============================
  genericCard() {
    return `
      <div class="skeleton-generic-card">
        <div class="skeleton-generic-image"></div>
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
    return Array.from({ length: count }, () => `
      <div class="${colClass}">
        ${this.genericCard()}
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
