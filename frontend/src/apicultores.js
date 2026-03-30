const API_URL = "/api";

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("beekeepers-grid");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/apicultores`);
        const beekeepers = await res.json();

        if (beekeepers.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Nenhum apicultor encontrado.</p></div>';
            return;
        }

        container.innerHTML = beekeepers.map(api => `
            <div class="col-md-4">
                <div class="product-card-premium text-center">
                    <div class="p-4">
                        <img src="${api.Picture || 'assets/default-avatar.png'}" class="rounded-circle mb-3 shadow-sm" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid white;">
                        <h4 class="fw-bold">${api.Nome}</h4>
                        <p class="text-muted small italic mb-4" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 40px;">
                            ${api.Bio || 'Dedicado à apicultura tradicional.'}
                        </p>
                        <a href="apicultor.html?id=${api.ID_Cliente}" class="btn btn-auth-enhanced login w-100">Ver Perfil</a>
                    </div>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Error loading beekeepers:", err);
    }
});
