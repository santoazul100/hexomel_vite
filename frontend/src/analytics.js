/**
 * Hexomel Analytics Module
 * Regista interações dos utilizadores (page views, product views, add-to-cart, etc.)
 * e envia para o backend de forma silenciosa e não-bloqueante.
 */

import { API_URL, ensureBackendReady } from "./api.js";

/**
 * Envia um evento de interação para o backend.
 * @param {string} tipo - Tipo de evento: 'page_view', 'product_view', 'add_to_cart', 'search', 'checkout_start'
 * @param {object} dados - Informação extra (ex: { productId: 5, productName: 'Mel' })
 */
export async function logInteraction(tipo, dados = {}) {
  try {
    const backendAvailable = await ensureBackendReady();
    if (!backendAvailable) {
      return;
    }

    const token = localStorage.getItem("token");
    const pagina = window.location.pathname.split("/").pop() || "index.html";

    await fetch(`${API_URL}/logs/interaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tipo, pagina, dados }),
    });
  } catch {
    // Silently fail — analytics must never break the app
  }
}

/**
 * Configura o rastreamento automático de cliques em elementos importantes.
 * Procura botões, links e elementos com atributos 'data-track'.
 */
export function setupAutoTracking() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, a, .track-click");
    if (!target) return;

    // Ignorar cliques em modais de fecho ou elementos puramente decorativos se necessário
    if (target.classList.contains("auth-close-v2") || target.classList.contains("details-close-minimal")) {
      return;
    }

    const label = target.innerText?.trim() || target.getAttribute("aria-label") || target.id || "unnamed_element";
    const tag = target.tagName.toLowerCase();
    
    // Evitar logs excessivos de navegação simples se já tivermos page_view, 
    // mas logar CTAs importantes.
    logInteraction("click", {
      element: tag,
      label: label.substring(0, 50),
      id: target.id || null,
      href: target.getAttribute("href") || null
    });
  }, { passive: true });

  console.log("Analytics: Automatic tracking enabled 🐝");
}

/**
 * Regista automaticamente uma page_view ao importar este módulo numa página.
 */
export function trackPageView() {
  const pagina = window.location.pathname.split("/").pop() || "index.html";
  logInteraction("page_view", { pagina });
}
