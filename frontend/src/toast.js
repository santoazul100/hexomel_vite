/**
 * Hexomel Premium Toast Notification System
 */

class Toast {
  constructor() {
    this.container = document.getElementById("toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      document.body.appendChild(this.container);
    }
    
    // Auto-inject CSS if not present
    if (!document.getElementById("toast-css")) {
      const link = document.createElement("link");
      link.id = "toast-css";
      link.rel = "stylesheet";
      link.href = "src/styles/toast.css";
      document.head.appendChild(link);
    }
  }

  show(message, type = "success", title = null) {
    const toast = document.createElement("div");
    toast.className = `premium-toast ${type}`;
    
    const icons = {
      success: "fa-check-circle",
      error: "fa-times-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle"
    };
    
    const defaultTitles = {
      success: "Sucesso",
      error: "Erro",
      warning: "Aviso",
      info: "Informação"
    };

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${icons[type]}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title || defaultTitles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;

    this.container.appendChild(toast);

    // Initial state (for animation)
    setTimeout(() => toast.classList.add("active"), 10);

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.onclick = () => this.remove(toast);

    // Auto-remove
    setTimeout(() => this.remove(toast), 5000);
  }

  remove(toast) {
    toast.classList.remove("active");
    setTimeout(() => toast.remove(), 500);
  }

  success(msg, title) { this.show(msg, "success", title); }
  error(msg, title) { this.show(msg, "error", title); }
  warning(msg, title) { this.show(msg, "warning", title); }
  info(msg, title) { this.show(msg, "info", title); }
}

export const toast = new Toast();
window.toast = toast; // Global access
