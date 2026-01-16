const API_URL = "http://localhost:3000/api";

// Register
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Registration successful! Please login.");
        window.location.href = "/login.html";
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Something went wrong. Is the backend running?");
    }
  });
}

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/";
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Something went wrong. Is the backend running?");
    }
  });
}

// Check logged in state on other pages
export const getLoggedUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
};

// Google Auth Integration
export const initializeGoogleAuth = () => {
  if (!window.google) return;

  window.google.accounts.id.initialize({
    client_id:
      "566495487980-k2ten8upqs965tsjdvja8jvehv006tj7.apps.googleusercontent.com",
    callback: handleGoogleCallback,
  });

  // For Page
  const buttonDiv = document.getElementById("google-signin-button");
  if (buttonDiv) {
    window.google.accounts.id.renderButton(buttonDiv, {
      theme: "outline",
      size: "large",
      width: "100%",
    });
  }

  // For Modal (handled in LoginModal.js on open, but good to ensure global init works)
};

const handleGoogleCallback = async (response) => {
  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Check if modal is open and close it
      const modal = document.getElementById("login-modal");
      if (modal && modal.classList.contains("open")) {
        modal.classList.remove("open");
        location.reload(); // Reload to update UI
      } else {
        window.location.href = "/";
      }
    } else {
      alert(data.error || "Google login failed");
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
  }
};

// Auto-init for Google Auth
if (document.getElementById("google-signin-button")) {
  window.addEventListener("load", initializeGoogleAuth);
}
