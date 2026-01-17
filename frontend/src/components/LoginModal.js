import Swal from "sweetalert2";
import { initializeGoogleAuth } from "../auth.js";

export function createLoginModal() {
  // Generate Modal HTML
  const modalHTML = `
    <div id="login-modal" class="modal-overlay">
        <div class="modal-content auth-card">
            <button class="modal-close">&times;</button>
            <h2 class="auth-title">Sign in</h2>
            <p class="auth-subtitle">Welcome back to the golden touch of nature</p>
            
            <form id="modal-login-form" class="auth-form">
                <div class="floating-label-group">
                    <input type="email" id="modal-email" class="floating-input" placeholder=" " required />
                    <label class="floating-label">Email</label>
                </div>
                <div class="floating-label-group">
                    <input type="password" id="modal-password" class="floating-input" placeholder=" " required />
                    <label class="floating-label">Password</label>
                </div>
                <button type="submit" class="auth-submit">Sign in to Hexomel</button>
            </form>

            <div class="auth-divider" style="margin: 1.5rem 0;">
                <span>or sign in with Google</span>
            </div>
            
            <div id="modal-google-btn" style="display: flex; justify-content: center;"></div>

            <div class="auth-footer">
                Don't have an account? <a href="/register.html">Sign up</a>
            </div>
        </div>
    </div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Styling logic is in CSS now, but let's ensure basic modal styles if not present
  if (!document.getElementById("modal-styles")) {
    const style = document.createElement("style");
    style.id = "modal-styles";
    style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 3000;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .modal-overlay.open {
                display: flex;
                opacity: 1;
            }
            .modal-content {
                position: relative;
                transform: translateY(20px);
                transition: transform 0.3s;
                max-width: 450px;
                margin: 1rem;
            }
            .modal-overlay.open .modal-content {
                transform: translateY(0);
            }
            .modal-close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                font-size: 2rem;
                cursor: pointer;
                color: var(--text-light);
            }
        `;
    document.head.appendChild(style);
  }

  // Event Listeners
  const modal = document.getElementById("login-modal");
  const closeBtn = modal.querySelector(".modal-close");

  closeBtn.addEventListener("click", () => toggleLoginModal(false));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) toggleLoginModal(false);
  });

  // Handle Form Submit
  document
    .getElementById("modal-login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("modal-email").value;
      const password = document.getElementById("modal-password").value;

      try {
        const res = await fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          toggleLoginModal(false);
          Swal.fire({
            icon: "success",
            title: "Welcome back!",
            text: `Hello, ${data.user.name}! 🍯`,
            confirmButtonColor: "var(--primary-gold)",
          }).then(() => window.location.reload());
        } else {
          Swal.fire({
            icon: "error",
            title: "Login Failed",
            text: data.error,
            confirmButtonColor: "#d33",
          });
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Something went wrong!",
        });
      }
    });
}

export function toggleLoginModal(show) {
  const modal = document.getElementById("login-modal");
  if (show) {
    modal.classList.add("open");
    // Render Google Button dynamically when modal opens
    if (window.google) {
      window.google.accounts.id.renderButton(
        document.getElementById("modal-google-btn"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  } else {
    modal.classList.remove("open");
  }
}
