import "./styles/index.css";
import { getLoggedUser, logout, initializeGoogleAuth } from "./auth.js";
import { cart } from "./cart.js";
import { createLoginModal, toggleLoginModal } from "./components/LoginModal.js";
import Swal from "sweetalert2";

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Add scroll animation to elements
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe all cards for scroll animations
document.querySelectorAll(".card").forEach((card) => {
  card.style.opacity = "0";
  card.style.transform = "translateY(20px)";
  card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  observer.observe(card);
});

// Navbar Logic
const updateNav = () => {
  const user = getLoggedUser();
  const authNav = document.getElementById("auth-nav");

  if (authNav) {
    if (user) {
      authNav.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 0.9rem; font-weight: 500;">Hello, ${user.name.split(" ")[0]}</span>
                <button id="logout-btn" class="btn btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Logout</button>
            </div>
        `;
      document.getElementById("logout-btn").addEventListener("click", () => {
        logout();
        Swal.fire({
          icon: "success",
          title: "Logged Out",
          showConfirmButton: false,
          timer: 1500,
        });
      });
    } else {
      // Replace Link with Modal Trigger
      authNav.innerHTML = `<button id="login-trigger" class="btn btn-secondary" style="padding: 0.5rem 1.25rem">Login</button>`;
      document
        .getElementById("login-trigger")
        .addEventListener("click", () => toggleLoginModal(true));
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  createLoginModal();
  updateNav();

  // Re-init Google Auth for Modal
  initializeGoogleAuth();
});

console.log("Hexomel website loaded successfully.");
