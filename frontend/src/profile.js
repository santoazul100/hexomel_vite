import { getLoggedUser } from "./auth.js";
import Swal from "sweetalert2";

const BADGE_DEFINITIONS = [
  {
    id: "first_login",
    name: "Iniciante",
    icon: "🐣",
    description: "Criou uma conta no Hexomel",
  },
  {
    id: "loyal_customer",
    name: "Cliente Fiel",
    icon: "🏆",
    description: "Fez mais de 5 encomendas",
  },
  {
    id: "gold_member",
    name: "Membro Gold",
    icon: "🍯",
    description: "Atingiu o nível 10",
  },
  {
    id: "bee_keeper",
    name: "Apicultor Jr",
    icon: "🐝",
    description: "Acumulou 1000 pontos",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const user = getLoggedUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  renderProfileData(user);
});

function renderProfileData(user) {
  // Basic Info
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("user-name-input").value = user.name;

  const profilePic = document.getElementById("profile-pic-large");
  if (user.picture) {
    profilePic.src = user.picture;
  } else {
    profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f4b400&color=fff&size=128`;
  }

  // Stats
  document.getElementById("stat-lvl").textContent = user.level || 1;
  document.getElementById("stat-pts").textContent = user.pontos || 0;

  const unlockedBadges = user.badges || [];
  document.getElementById("stat-badges").textContent = unlockedBadges.length;

  // XP Progress
  const currentXP = user.xp || 0;
  const level = user.level || 1;
  const xpNeeded = level * 100;
  const progress = (currentXP / xpNeeded) * 100;

  const xpBar = document.getElementById("xp-bar");
  const xpText = document.getElementById("xp-text");

  xpText.textContent = `${currentXP} / ${xpNeeded} XP`;
  // Animate bar after a short delay
  setTimeout(() => {
    xpBar.style.width = `${progress}%`;
  }, 300);

  // Badges Grid
  const badgesGrid = document.getElementById("badges-grid");
  badgesGrid.innerHTML = "";

  BADGE_DEFINITIONS.forEach((badge) => {
    const isLocked = !unlockedBadges.includes(badge.id);
    const card = document.createElement("div");
    card.className = `badge-card ${isLocked ? "locked" : ""}`;

    card.innerHTML = `
            <span class="badge-icon">${badge.icon}</span>
            <div class="badge-name-premium fs-6 fw-bold">${badge.name}</div>
            <div class="badge-description text-muted small">${badge.description}</div>
            ${isLocked ? '<i class="fas fa-lock mt-2 text-muted"></i>' : ""}
        `;

    if (!isLocked) {
      card.addEventListener("click", () => {
        Swal.fire({
          title: badge.name,
          text: badge.description,
          iconHtml: badge.icon,
          confirmButtonColor: "#f4b400",
        });
      });
    }

    badgesGrid.appendChild(card);
  });
}
