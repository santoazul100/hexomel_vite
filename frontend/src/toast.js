/**
 * Hexomel Premium Minimalist Toast System
 * UI based on the top header notifications, UX based on the bottom-right toast system
 */

class Toast {
  constructor() {
    this.container = document.getElementById("toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      document.body.appendChild(this.container);
    }
    
    // Auto-inject CSS
    if (!document.getElementById("toast-minimal-css")) {
      const style = document.createElement("style");
      style.id = "toast-minimal-css";
      style.textContent = `
        #toast-container {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
        }

        .minimal-toast {
          pointer-events: auto;
          background: #fff;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border: 1px solid #eee;
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 320px;
          max-width: 420px;
          font-family: inherit;
          transform: translateX(120%);
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          position: relative;
          overflow: hidden;
        }

        .minimal-toast.active {
          transform: translateX(0);
        }

        .minimal-toast.closing {
          transform: translateX(120%);
          opacity: 0;
        }

        .minimal-toast-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .minimal-toast-content {
          font-size: 0.95rem;
          color: var(--text-dark, #2d3748);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          line-height: 1.4;
        }

        .minimal-toast-msg {
          color: var(--primary-green, #1a4d2e);
          font-weight: 500;
        }

        .minimal-toast-close {
          background: none;
          border: none;
          color: #aaa;
          cursor: pointer;
          padding: 0 0 0 8px;
          margin-left: auto;
          font-size: 1rem;
          transition: color 0.2s;
        }

        .minimal-toast-close:hover {
          color: #666;
        }
        
        .minimal-toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(0,0,0,0.05);
          width: 100%;
        }
        
        .minimal-toast-progress-bar {
          height: 100%;
          width: 100%;
          transform-origin: left;
        }
      `;
      document.head.appendChild(style);
    }
  }

  show(message, type = "success", title = null) {
    const toast = document.createElement("div");
    toast.className = `minimal-toast`;
    
    const settings = {
      success: { icon: "fa-check-circle", color: "var(--primary-green, #1a4d2e)", defaultTitle: "Sucesso" },
      error: { icon: "fa-exclamation-circle", color: "#e53e3e", defaultTitle: "Erro" },
      warning: { icon: "fa-exclamation-triangle", color: "var(--primary-gold-dark, #b45309)", defaultTitle: "Aviso" },
      info: { icon: "fa-info-circle", color: "#3182ce", defaultTitle: "Info" }
    };

    const conf = settings[type] || settings.success;
    const toastTitle = title || conf.defaultTitle;

    toast.innerHTML = `
      <i class="fas ${conf.icon} minimal-toast-icon" style="color: ${conf.color}"></i>
      <div class="minimal-toast-content">
        <span>${toastTitle}</span> <span style="opacity: 0.5; font-weight: 400">—</span>
        <span class="minimal-toast-msg" style="color: ${conf.color}">${message}</span>
      </div>
      <button class="minimal-toast-close"><i class="fas fa-times"></i></button>
      <div class="minimal-toast-progress">
        <div class="minimal-toast-progress-bar" style="background-color: ${conf.color}; transition: transform 5s linear;"></div>
      </div>
    `;

    this.container.appendChild(toast);

    // Initial state (for animation)
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.classList.add("active");
        // Start progress bar shrink
        const progressBar = toast.querySelector('.minimal-toast-progress-bar');
        if (progressBar) {
          progressBar.style.transform = 'scaleX(0)';
        }
      }, 10);
    });

    const closeBtn = toast.querySelector(".minimal-toast-close");
    
    let timeoutId;
    let isPaused = false;
    let remainingTime = 5000;
    let startTime = Date.now();

    const removeToast = () => {
      toast.classList.add("closing");
      setTimeout(() => toast.remove(), 400); // Wait for closing animation
    };

    closeBtn.onclick = removeToast;

    // Timer logic with pausing
    timeoutId = setTimeout(removeToast, remainingTime);

    toast.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
      isPaused = true;
      remainingTime -= (Date.now() - startTime);
      const progressBar = toast.querySelector('.minimal-toast-progress-bar');
      if (progressBar) {
        // Pause animation by computing current scale and setting it statically
        const computedStyle = window.getComputedStyle(progressBar);
        const matrix = new DOMMatrixReadOnly(computedStyle.transform);
        progressBar.style.transition = 'none';
        progressBar.style.transform = `scaleX(${matrix.a})`;
      }
    });

    toast.addEventListener('mouseleave', () => {
      isPaused = false;
      startTime = Date.now();
      timeoutId = setTimeout(removeToast, remainingTime);
      const progressBar = toast.querySelector('.minimal-toast-progress-bar');
      if (progressBar) {
        // Resume animation
        progressBar.style.transition = 'transform ' + remainingTime + 'ms linear';
        progressBar.style.transform = 'scaleX(0)';
      }
    });
  }

  success(msg, title) { this.show(msg, "success", title); }
  error(msg, title) { this.show(msg, "error", title); }
  warning(msg, title) { this.show(msg, "warning", title); }
  info(msg, title) { this.show(msg, "info", title); }
}

export const toast = new Toast();
window.toast = toast; // Global access
