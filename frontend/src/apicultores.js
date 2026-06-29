import { getLang } from "./i18n.js";

const API_URL = "/api";

const localTranslations = {
  empty: { pt: "Nenhum apicultor encontrado.", en: "No beekeepers found." },
  defaultBio: { pt: "Dedicado à apicultura tradicional.", en: "Dedicated to traditional beekeeping." },
  viewProfile: { pt: "Ver Perfil", en: "View Profile" }
};

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("beekeepers-grid");
    if (!container) return;

    const lang = getLang();

    try {
        const res = await fetch(`${API_URL}/apicultores`);
        const beekeepers = await res.json();

        if (beekeepers.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">${localTranslations.empty[lang]}</p></div>`;
            return;
        }

        container.innerHTML = beekeepers.map(api => {
            const hasPicture = api.Picture && api.Picture.trim() !== "" && api.Picture !== "null" && api.Picture !== "undefined";
            const avatarUrl = hasPicture ? api.Picture : "/images/default-user.png";
            const bio = api.Bio || localTranslations.defaultBio[lang];
            return `
            <div class="col-md-4">
                <div class="product-card-premium text-center">
                    <div class="p-4">
                        <img src="${avatarUrl}" class="rounded-circle mb-3 shadow-sm" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid white;" onerror="this.onerror=null; this.src='/images/default-user.png';">
                        <h4 class="fw-bold">${api.Nome}</h4>
                        <p class="text-muted small italic mb-4" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 40px;">
                            ${bio}
                        </p>
                        <a href="profile.html?id=${api.ID_Cliente}" class="btn btn-auth-enhanced login w-100">${localTranslations.viewProfile[lang]}</a>
                    </div>
                </div>
            </div>
            `;
        }).join("");
    } catch (err) {
        console.error("Error loading beekeepers:", err);
    }
});
