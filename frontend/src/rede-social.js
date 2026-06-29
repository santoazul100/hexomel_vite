// Hexomel Social Network Page Logic
import { getLang } from "./i18n.js";

const API_URL = "/api";

window.activeChatPartnerId = null;
window.chatPollInterval = null;
window.lastMessagesCount = 0;

const buildAuthHeaders = (headers = {}) => {
  const token = localStorage.getItem("token");
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

class SocialNetworkUI {
  constructor() {
    this.members = [];
    this.blockedUsers = new Set();
    this.token = localStorage.getItem("token");
    this.currentUser = null;
    
    try {
      this.currentUser = JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      console.warn("Failed to parse user details:", e);
    }

    this.currentFilter = "all";
    this.searchQuery = "";

    // Bind window functions
    window.fetchConversations = () => this.fetchConversations();
    window.openChat = (partnerId, partnerName, partnerPicture) => this.openChat(partnerId, partnerName, partnerPicture);
    window.fetchChatHistory = (partnerId, quiet) => this.fetchChatHistory(partnerId, quiet);
    window.sendChatMessage = () => this.sendChatMessage();
    window.blockChatUser = (id) => this.blockChatUser(id);
    window.unblockChatUser = (id) => this.unblockChatUser(id);
    window.reportChatUser = (id, name) => this.reportChatUser(id, name);

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadData();
    this.checkInitialParams();
  }

  checkInitialParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    const chatWithParam = urlParams.get("chatWith");

    if (tabParam === "comunidade" || tabParam === "forum") {
      const btnShowComunidade = document.getElementById("btn-show-comunidade");
      if (btnShowComunidade) btnShowComunidade.click();
    } else if (tabParam === "chat" || tabParam === "messages" || chatWithParam) {
      if (chatWithParam) {
        this.startChatWith(chatWithParam);
      } else {
        const btnShowChat = document.getElementById("btn-show-chat");
        if (btnShowChat) btnShowChat.click();
      }
    } else {
      const btnShowMembros = document.getElementById("btn-show-membros");
      if (btnShowMembros) btnShowMembros.click();
    }
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById("member-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.filterAndRender();
      });
    }

    // Filter pills
    document.querySelectorAll(".btn-filter-pill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".btn-filter-pill")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");

        this.currentFilter = e.target.dataset.filter;
        this.filterAndRender();
      });
    });

    // Delegate "Enviar Mensagem" button click to handle authentication dynamically
    const container = document.getElementById("members-grid-container");
    if (container) {
      container.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-item-msg");
        if (btn) {
          this.checkAuth(e);
        }
      });
    }

    const seeAllBtn = document.getElementById("see-all-suggestions");
    if (seeAllBtn) {
      seeAllBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Clear filter to show all
        const allBtn = document.querySelector('.btn-filter-pill[data-filter="all"]');
        if (allBtn) allBtn.click();
        
        // Scroll to search or focus
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    // Switcher buttons
    const btnShowMembros = document.getElementById("btn-show-membros");
    const btnShowComunidade = document.getElementById("btn-show-comunidade");
    const btnShowChat = document.getElementById("btn-show-chat");
    
    const viewMembros = document.getElementById("view-membros-container");
    const viewComunidade = document.getElementById("view-comunidade-container");
    const viewChat = document.getElementById("view-chat-container");

    if (btnShowMembros && btnShowComunidade && btnShowChat && viewMembros && viewComunidade && viewChat) {
      const updateUrlTab = (tabName) => {
        const url = new URL(window.location);
        url.searchParams.set("tab", tabName);
        window.history.replaceState({}, document.title, url);
      };

      btnShowMembros.addEventListener("click", () => {
        // Toggle view
        viewMembros.classList.remove("d-none");
        viewComunidade.classList.add("d-none");
        viewChat.classList.add("d-none");
        // Toggle active button style
        btnShowMembros.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-active";
        btnShowComunidade.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-inactive";
        btnShowChat.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-inactive";
        
        updateUrlTab("membros");

        // Stop polling
        if (window.chatPollInterval) {
          clearInterval(window.chatPollInterval);
          window.chatPollInterval = null;
        }
        window.activeChatPartnerId = null;
      });

      btnShowComunidade.addEventListener("click", () => {
        // Toggle view
        viewComunidade.classList.remove("d-none");
        viewMembros.classList.add("d-none");
        viewChat.classList.add("d-none");
        // Toggle active button style
        btnShowComunidade.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-active";
        btnShowMembros.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-inactive";
        btnShowChat.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-inactive";
        
        updateUrlTab("comunidade");

        // Stop polling
        if (window.chatPollInterval) {
          clearInterval(window.chatPollInterval);
          window.chatPollInterval = null;
        }
        window.activeChatPartnerId = null;
      });

      btnShowChat.addEventListener("click", (e) => {
        if (!this.token) {
          this.checkAuth(e);
          return;
        }
        // Toggle view
        viewChat.classList.remove("d-none");
        viewMembros.classList.add("d-none");
        viewComunidade.classList.add("d-none");
        // Toggle active button style
        btnShowChat.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-active";
        btnShowMembros.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-inactive";
        btnShowComunidade.className = "btn rounded-pill px-4 fw-bold hive-switch-btn-inactive";
        
        updateUrlTab("chat");

        // Load conversations
        window.fetchConversations();
      });
    }

    // Chat form submit listener
    const chatForm = document.getElementById("chat-send-form");
    if (chatForm) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        window.sendChatMessage();
      });
    }
  }

  async loadData() {
    this.renderSkeletons();
    this.renderSidebarProfileSkeleton();
    this.renderSidebarSuggestionsSkeletons();

    try {
      // Load public members
      const membersRes = await fetch(`${API_URL}/members`);
      if (!membersRes.ok) throw new Error("Failed to load members");
      this.members = await membersRes.json();

      // Load blocked users if authenticated
      if (this.token) {
        try {
          const blocksRes = await fetch(`${API_URL}/users/blocks`, {
            headers: { Authorization: `Bearer ${this.token}` },
          });
          if (blocksRes.ok) {
            const blocks = await blocksRes.json();
            this.blockedUsers = new Set(blocks.map((b) => Number(b.id)));
          }
        } catch (err) {
          console.warn("Could not load user blocks:", err);
        }
      }

      this.filterAndRender();
      this.renderSidebar();
      this.renderSuggestions();
    } catch (error) {
      console.error("Error loading social network data:", error);
      const container = document.getElementById("members-grid-container");
      if (container) {
        container.innerHTML = `
          <div class="col-12 text-center py-5 text-danger animate-fade-in">
            <i class="fas fa-exclamation-triangle fs-2 mb-3"></i>
            <p>Não foi possível carregar os membros. Por favor, tente mais tarde.</p>
          </div>
        `;
      }
    }
  }

  renderSkeletons() {
    const container = document.getElementById("members-grid-container");
    if (!container) return;

    let skeletonsHtml = "";
    for (let i = 0; i < 5; i++) {
      skeletonsHtml += `
        <div class="member-list-item border-light">
          <div class="member-item-info">
            <div class="skeleton skeleton-circle" style="width: 60px; height: 60px; flex-shrink: 0;"></div>
            <div class="member-item-details flex-grow-1" style="min-width: 0;">
              <div class="skeleton skeleton-text" style="width: 120px; height: 18px; margin-bottom: 8px;"></div>
              <div class="skeleton skeleton-text" style="width: 80%; height: 12px; margin-bottom: 0;"></div>
            </div>
          </div>
          <div class="member-item-actions d-none d-md-flex">
            <div class="skeleton" style="width: 90px; height: 36px; border-radius: 20px;"></div>
            <div class="skeleton" style="width: 130px; height: 36px; border-radius: 20px;"></div>
            <div class="skeleton" style="width: 90px; height: 36px; border-radius: 20px;"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = skeletonsHtml;
  }

  renderSidebarProfileSkeleton() {
    const container = document.getElementById("sidebar-current-user-container");
    if (!container) return;

    container.innerHTML = `
      <div class="sidebar-user-profile">
        <div class="sidebar-user-info">
          <div class="skeleton skeleton-circle" style="width: 46px; height: 46px; flex-shrink: 0;"></div>
          <div>
            <div class="skeleton skeleton-text" style="width: 80px; height: 14px; margin-bottom: 6px;"></div>
            <div class="skeleton skeleton-text" style="width: 50px; height: 10px; margin-bottom: 0;"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderSidebarSuggestionsSkeletons() {
    const container = document.getElementById("sidebar-suggestions-container");
    if (!container) return;

    let html = "";
    for (let i = 0; i < 5; i++) {
      html += `
        <div class="suggestion-row">
          <div class="suggestion-user-info" style="gap: 12px; width: 100%;">
            <div class="skeleton skeleton-circle" style="width: 38px; height: 38px; flex-shrink: 0;"></div>
            <div class="flex-grow-1">
              <div class="skeleton skeleton-text" style="width: 90px; height: 12px; margin-bottom: 6px;"></div>
              <div class="skeleton skeleton-text" style="width: 120px; height: 10px; margin-bottom: 0;"></div>
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  renderSidebar() {
    const sidebarUserContainer = document.getElementById("sidebar-current-user-container");
    if (!sidebarUserContainer) return;

    const lang = getLang();

    if (this.token && this.currentUser) {
      const user = this.currentUser;
      const avatarUrl = user.picture && user.picture.trim() !== "" ? user.picture : (user.avatar || "/images/default-user.png");
      const firstName = user.name || user.firstName || "Utilizador";
      
      const roleText = user.role?.toLowerCase() === "admin"
        ? (lang === "pt" ? "Administrador" : "Administrator")
        : (user.role?.toLowerCase() === "apicultor"
          ? (lang === "pt" ? "Apicultor" : "Beekeeper")
          : (lang === "pt" ? "Cliente" : "Client"));

      sidebarUserContainer.innerHTML = `
        <div class="sidebar-user-profile">
          <div class="sidebar-user-info">
            <img src="${avatarUrl}" class="sidebar-avatar-img" alt="${firstName}" onerror="this.onerror=null; this.src='/images/default-user.png';">
            <div>
              <div class="sidebar-username text-truncate" style="max-width: 150px;" title="${firstName}">${firstName}</div>
              <div class="sidebar-user-role">${roleText}</div>
            </div>
          </div>
          <a href="profile.html" class="sidebar-action-btn">${lang === "pt" ? "Ver Perfil" : "View Profile"}</a>
        </div>
      `;
    } else {
      sidebarUserContainer.innerHTML = `
        <div class="p-3 bg-white border rounded-3 text-center">
          <p class="small text-muted mb-3">${lang === "pt" ? "Inicie sessão para ver o seu perfil e conversar." : "Log in to see your profile and chat."}</p>
          <button class="btn btn-sm btn-nav-auth-filled rounded-pill px-4 fw-bold w-100" onclick="window.openAuthModal('login')">${lang === "pt" ? "Iniciar Sessão" : "Sign In"}</button>
        </div>
      `;
    }
  }

  renderSuggestions() {
    const suggestionsContainer = document.getElementById("sidebar-suggestions-container");
    if (!suggestionsContainer) return;

    const lang = getLang();
    let candidates = [...this.members];

    // Exclude currently logged user and blocked users
    if (this.currentUser) {
      candidates = candidates.filter(m => Number(m.id) !== Number(this.currentUser.id));
    }
    candidates = candidates.filter(m => !this.blockedUsers.has(Number(m.id)));

    // Sort to prioritize Beekeepers (apicultores)
    candidates.sort((a, b) => {
      const aVal = a.role === "apicultor" ? 1 : 0;
      const bVal = b.role === "apicultor" ? 1 : 0;
      return bVal - aVal;
    });

    // Take top 5
    const suggestions = candidates.slice(0, 5);

    if (suggestions.length === 0) {
      suggestionsContainer.innerHTML = `<p class="small text-muted fst-italic py-2">${lang === "pt" ? "Sem sugestões disponíveis" : "No suggestions available"}</p>`;
      return;
    }

    suggestionsContainer.innerHTML = suggestions.map(m => {
      const avatarUrl = m.picture && m.picture.trim() !== "" && m.picture !== "null" && m.picture !== "undefined"
        ? m.picture
        : "/images/default-user.png";
      
      const isApicultor = m.role === "apicultor";
      const isAdmin = m.role === "admin";
      
      let metaText = lang === "pt" ? "Membro Hexomel" : "Hexomel Member";
      if (isApicultor) {
        metaText = lang === "pt" ? "Apicultor Recomendado" : "Recommended Beekeeper";
      } else if (isAdmin) {
        metaText = lang === "pt" ? "Administrador Hexomel" : "Hexomel Administrator";
      }

      return `
        <div class="suggestion-row">
          <div class="suggestion-user-info" style="cursor: pointer;" onclick="window.socialUI.openMemberProfile(${m.id})">
            <img src="${avatarUrl}" class="suggestion-avatar-img" alt="${m.name}" onerror="this.onerror=null; this.src='/images/default-user.png';">
            <div style="min-width: 0;">
              <span class="suggestion-name text-truncate" title="${m.name}">${m.name}</span>
              <span class="suggestion-meta text-truncate" title="${metaText}">${metaText}</span>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-link p-0 text-success fw-bold text-decoration-none" style="font-size: 0.75rem;" onclick="window.socialUI.openMemberProfile(${m.id})">
            <button class="btn btn-link p-0 text-warning fw-bold text-decoration-none" style="font-size: 0.75rem;" onclick="window.socialUI.startChatWith(${m.id})">
              ${lang === "pt" ? "Mensagem" : "Message"}
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  filterAndRender() {
    const container = document.getElementById("members-grid-container");
    const emptyState = document.getElementById("social-empty-state");
    if (!container) return;

    // Filter members list
    let filtered = this.members;

    // Filter out self and blocked users
    if (this.currentUser) {
      filtered = filtered.filter((m) => Number(m.id) !== Number(this.currentUser.id));
    }
    filtered = filtered.filter((m) => !this.blockedUsers.has(Number(m.id)));

    // Filter by type
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((m) => m.role === this.currentFilter);
    }

    // Filter by search query
    if (this.searchQuery) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(this.searchQuery)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = "";
      emptyState?.classList.remove("d-none");
      return;
    }

    emptyState?.classList.add("d-none");

    const lang = getLang();

    container.innerHTML = filtered
      .map((m) => {
        const isApicultor = m.role === "apicultor";
        const isAdmin = m.role === "admin";
        
        let roleBadge = `<span class="member-badge-client">${lang === "pt" ? "Cliente" : "Client"}</span>`;
        if (isApicultor) {
          roleBadge = `<span class="member-badge-apicultor"><i class="fas fa-certificate me-1"></i>${lang === "pt" ? "Apicultor" : "Beekeeper"}</span>`;
        } else if (isAdmin) {
          roleBadge = `<span class="member-badge-admin"><i class="fas fa-shield-alt me-1"></i>Admin</span>`;
        }

        const isBlocked = this.blockedUsers.has(Number(m.id));

        // Use the standard avatar UI
        const avatarUrl = m.picture && m.picture.trim() !== "" && m.picture !== "null" && m.picture !== "undefined"
          ? m.picture
          : "/images/default-user.png";

        const blockText = isBlocked
          ? (lang === "pt" ? "Desbloquear" : "Unblock")
          : (lang === "pt" ? "Bloquear" : "Block");
          
        const blockClass = isBlocked ? "btn-item-unblock" : "btn-item-block";

        const bioText = m.bio && m.bio.trim() !== "" 
          ? m.bio 
          : (lang === "pt" ? "Sem biografia disponível." : "No biography available.");
        const bioClass = m.bio && m.bio.trim() !== "" ? "" : "fst-italic opacity-50";

        return `
          <div class="member-list-item animate-fade-in">
            <div class="member-item-info">
              <div class="member-item-avatar-wrap" style="cursor: pointer;" onclick="window.socialUI.openMemberProfile(${m.id})">
                <img src="${avatarUrl}" class="member-item-avatar" alt="${m.name}" onerror="this.onerror=null; this.src='/images/default-user.png';">
                ${m.restrictedToPost ? `<span class="badge bg-danger position-absolute top-0 start-100 translate-middle-x rounded-pill" style="font-size:0.6rem;">Restrito</span>` : ""}
              </div>
              <div class="member-item-details">
                <div class="member-item-name-row">
                  <h5 class="member-item-name" style="cursor: pointer;" onclick="window.socialUI.openMemberProfile(${m.id})">${m.name}</h5>
                  ${roleBadge}
                </div>
                <p class="member-item-bio ${bioClass}" title="${bioText}">${bioText}</p>
              </div>
            </div>

            <div class="member-item-actions">
              <button class="btn-item-profile" onclick="window.socialUI.openMemberProfile(${m.id})">
                <i class="fas fa-user me-1"></i><span>${lang === "pt" ? "Ver Perfil" : "View Profile"}</span>
              </button>
              <button class="btn-item-msg" onclick="window.socialUI.startChatWith(${m.id})">
                <i class="fas fa-comment-dots me-1"></i><span>Enviar Mensagem</span>
              </button>
              <button class="${blockClass}" onclick="window.socialUI.toggleBlock(${m.id}, ${isBlocked})">
                <i class="fas fa-ban me-1"></i><span>${blockText}</span>
              </button>
              <button class="btn-item-report" onclick="window.socialUI.reportMember(${m.id}, '${m.name}')" title="${lang === 'pt' ? 'Denunciar utilizador' : 'Report user'}">
                <i class="fas fa-flag"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Apply friendly URLs to dynamically injected elements
    if (window.applyFriendlyUrlsToDOM) {
      window.applyFriendlyUrlsToDOM();
    }
  }

  checkAuth(e) {
    if (!this.token) {
      e.preventDefault();
      Swal.fire({
        title: getLang() === "pt" ? "Autenticação Necessária" : "Authentication Required",
        text: getLang() === "pt" ? "Por favor, inicie sessão para conversar com outros membros." : "Please sign in to chat with other members.",
        icon: "info",
        showCancelButton: true,
        confirmButtonColor: "#1a4d2e",
        confirmButtonText: getLang() === "pt" ? "Iniciar Sessão" : "Sign In",
        cancelButtonText: getLang() === "pt" ? "Cancelar" : "Cancel",
      }).then((result) => {
        if (result.isConfirmed && typeof window.openAuthModal === "function") {
          window.openAuthModal("login");
        }
      });
      return false;
    }
    return true;
  }

  async toggleBlock(targetId, isBlocked) {
    if (!this.token) {
      Swal.fire(
        getLang() === "pt" ? "Aviso" : "Warning",
        getLang() === "pt" ? "Inicie sessão para gerir bloqueios." : "Please sign in to manage blocks.",
        "warning"
      );
      return;
    }

    const title = isBlocked
      ? (getLang() === "pt" ? "Desbloquear Utilizador?" : "Unblock User?")
      : (getLang() === "pt" ? "Bloquear Utilizador?" : "Block User?");
    const text = isBlocked
      ? (getLang() === "pt" ? "Poderá voltar a receber mensagens deste utilizador." : "You will be able to receive messages from this user again.")
      : (getLang() === "pt" ? "Este utilizador não lhe poderá enviar mensagens." : "This user will not be able to send you messages.");

    const confirmResult = await Swal.fire({
      title: title,
      text: text,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: isBlocked ? "#1a4d2e" : "#dc3545",
      confirmButtonText: getLang() === "pt" ? "Confirmar" : "Confirm",
    });

    if (confirmResult.isConfirmed) {
      try {
        const endpoint = isBlocked ? `/api/users/unblock/${targetId}` : `/api/users/block/${targetId}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) throw new Error("Failed to process block/unblock action");

        if (isBlocked) {
          this.blockedUsers.delete(targetId);
          Swal.fire({
            icon: "success",
            title: getLang() === "pt" ? "Desbloqueado" : "Unblocked",
            timer: 1200,
            showConfirmButton: false,
          });
        } else {
          this.blockedUsers.add(targetId);
          Swal.fire({
            icon: "success",
            title: getLang() === "pt" ? "Bloqueado" : "Blocked",
            timer: 1200,
            showConfirmButton: false,
          });
        }

        this.filterAndRender();
        this.renderSuggestions();
      } catch (err) {
        Swal.fire("Erro", "Não foi possível processar a ação.", "error");
      }
    }
  }

  async reportMember(targetId, name) {
    if (!this.token) {
      Swal.fire(
        getLang() === "pt" ? "Aviso" : "Warning",
        getLang() === "pt" ? "Inicie sessão para reportar membros." : "Please sign in to report members.",
        "warning"
      );
      return;
    }

    const { value: text } = await Swal.fire({
      title: getLang() === "pt" ? "Denunciar Membro" : "Report Member",
      input: "textarea",
      inputLabel: getLang() === "pt" ? `Qual é o motivo da denúncia de ${name}?` : `What is the reason for reporting ${name}?`,
      inputPlaceholder: getLang() === "pt" ? "Escreva o motivo detalhado aqui..." : "Write details of the reason here...",
      inputAttributes: {
        "aria-label": "Motivo da denúncia",
      },
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: getLang() === "pt" ? "Submeter Denúncia" : "Submit Report",
    });

    if (text) {
      try {
        const response = await fetch(`/api/reports/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            reportedUserId: targetId,
            itemType: "perfil",
            itemId: targetId,
            reason: text,
            itemText: `Perfil do utilizador: ${name}`,
          }),
        });

        if (!response.ok) throw new Error("Failed to submit report");

        Swal.fire(
          getLang() === "pt" ? "Sucesso" : "Success",
          getLang() === "pt" ? "A sua denúncia foi enviada ao administrador." : "Your report was sent to the administrator.",
          "success"
        );
      } catch (err) {
        Swal.fire("Erro", "Erro ao submeter a denúncia.", "error");
      }
    }
  }

  openMemberProfile(memberId) {
    window.location.href = `profile.html?id=${memberId}`;
  }

  renderStars(rating) {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars += '<i class="fas fa-star text-warning me-1"></i>';
      } else {
        stars += '<i class="far fa-star text-muted opacity-50 me-1"></i>';
      }
    }
    return stars;
  }

  renderMemberProfileModal(data) {
    const lang = getLang();
    const member = data.member;

    // Header info
    document.getElementById("modal-member-name").innerText = member.name;
    document.getElementById("modal-member-bio").innerText = member.bio && member.bio.trim() !== "" 
      ? member.bio 
      : (lang === "pt" ? "Sem biografia disponível." : "No biography available.");
    
    const avatarUrl = member.picture && member.picture.trim() !== "" && member.picture !== "null" && member.picture !== "undefined"
      ? member.picture
      : "/images/default-user.png";
    document.getElementById("modal-member-avatar").src = avatarUrl;

    // Badges
    const badgeContainer = document.getElementById("modal-member-badge");
    const isApicultor = member.role === "apicultor";
    const isAdmin = member.role === "admin";
    
    if (isApicultor) {
      badgeContainer.innerHTML = `<span class="member-badge-apicultor px-2.5 py-1" style="font-size:0.75rem; font-weight:600;"><i class="fas fa-certificate me-1"></i>${lang === "pt" ? "Apicultor" : "Beekeeper"}</span>`;
    } else if (isAdmin) {
      badgeContainer.innerHTML = `<span class="member-badge-admin px-2.5 py-1" style="font-size:0.75rem; font-weight:600;"><i class="fas fa-shield-alt me-1"></i>Admin</span>`;
    } else {
      badgeContainer.innerHTML = `<span class="member-badge-client px-2.5 py-1" style="font-size:0.75rem; font-weight:600;">${lang === "pt" ? "Cliente" : "Client"}</span>`;
    }

    // Configure Chat button in footer
    const chatBtn = document.getElementById("modal-chat-btn");
    if (chatBtn) {
      if (this.currentUser && Number(this.currentUser.id) === Number(member.id)) {
        chatBtn.classList.add("d-none");
      } else {
        chatBtn.classList.remove("d-none");
        chatBtn.removeAttribute("href");
        chatBtn.style.cursor = "pointer";
        chatBtn.onclick = (e) => {
          e.preventDefault();
          this.startChatWith(member.id);
          const modalEl = document.getElementById("memberProfileModal");
          if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
          }
        };
      }
    }

    // Tab visibility
    if (isApicultor) {
      document.getElementById("modal-tab-products-li").classList.remove("d-none");
    } else {
      document.getElementById("modal-tab-products-li").classList.add("d-none");
    }

    if (member.favoritesPublic) {
      document.getElementById("modal-tab-favorites-li").classList.remove("d-none");
    } else {
      document.getElementById("modal-tab-favorites-li").classList.add("d-none");
    }

    // Profile Mini Stats Calculation
    const reviewsCount = data.reviews ? data.reviews.length : 0;
    const workshopsCount = (data.hostedWorkshops ? data.hostedWorkshops.length : 0) + (data.attendedWorkshops ? data.attendedWorkshops.length : 0);
    const productsCount = data.products ? data.products.length : 0;
    const favoritesCount = data.favorites ? data.favorites.length : 0;

    let statsHtml = `
      <div class="profile-stat-item">
        <strong>${reviewsCount}</strong> ${lang === "pt" ? (reviewsCount === 1 ? "avaliação" : "avaliações") : (reviewsCount === 1 ? "review" : "reviews")}
      </div>
      <span class="text-muted opacity-50">•</span>
      <div class="profile-stat-item">
        <strong>${workshopsCount}</strong> ${lang === "pt" ? (workshopsCount === 1 ? "workshop" : "workshops") : (workshopsCount === 1 ? "workshop" : "workshops")}
      </div>
    `;

    if (isApicultor) {
      statsHtml += `
        <span class="text-muted opacity-50">•</span>
        <div class="profile-stat-item">
          <strong>${productsCount}</strong> ${lang === "pt" ? (productsCount === 1 ? "produto" : "produtos") : (productsCount === 1 ? "product" : "products")}
        </div>
      `;
    }

    if (member.favoritesPublic) {
      statsHtml += `
        <span class="text-muted opacity-50">•</span>
        <div class="profile-stat-item">
          <strong>${favoritesCount}</strong> ${lang === "pt" ? (favoritesCount === 1 ? "favorito" : "favoritos") : (favoritesCount === 1 ? "favorite" : "favorites")}
        </div>
      `;
    }

    document.getElementById("modal-member-stats").innerHTML = statsHtml;

    // Pane 1: Activity & Reviews
    let activityHtml = `
      <div class="row g-4">
        <!-- Reviews Column -->
        <div class="col-12 col-md-7">
          <h6 class="fw-bold mb-3 pb-2 border-bottom" style="font-family: 'Outfit', sans-serif; color: #1a4d2e; font-size: 0.95rem; letter-spacing: -0.2px;">
            <i class="far fa-comments me-2 text-warning"></i>${lang === 'pt' ? 'Avaliações de Compras' : 'Product Reviews'}
          </h6>
          <div class="d-flex flex-column gap-3">
    `;

    if (data.reviews && data.reviews.length > 0) {
      data.reviews.forEach(rev => {
        const prodImg = rev.productImage && rev.productImage.trim() !== "" ? rev.productImage : "/images/default-product.png";
        const formattedDate = new Date(rev.date).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
        
        activityHtml += `
          <div class="profile-review-card">
            <div class="d-flex gap-3 align-items-start">
              <img src="${prodImg}" alt="${rev.productName}" class="rounded-3 shadow-sm" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null; this.src='/images/default-product.png';">
              <div class="flex-grow-1" style="min-width: 0; padding-bottom: 12px;">
                <h6 class="fw-bold mb-1 text-dark text-truncate" title="${rev.productName}" style="font-size: 0.85rem;">${rev.productName}</h6>
                <div class="mb-2" style="font-size: 0.75rem;">
                  ${this.renderStars(rev.rating)}
                </div>
                <p class="mb-0 text-muted fst-italic text-truncate-custom" style="font-size: 0.8rem; line-height: 1.4;">"${rev.comment || ""}"</p>
              </div>
            </div>
            <span class="position-absolute bottom-0 end-0 m-3 text-muted" style="font-size: 0.65rem; font-weight: 500;">
              <i class="far fa-clock me-1"></i>${formattedDate}
            </span>
          </div>
        `;
      });
    } else {
      activityHtml += `
        <div class="profile-empty-state">
          <i class="far fa-star mb-3"></i>
          <p>${lang === 'pt' ? 'Este utilizador ainda não avaliou produtos na nossa loja.' : 'This user hasn\'t reviewed any products in our shop yet.'}</p>
        </div>
      `;
    }

    activityHtml += `
          </div>
        </div>

        <!-- Workshops Column -->
        <div class="col-12 col-md-5">
          <h6 class="fw-bold mb-3 pb-2 border-bottom" style="font-family: 'Outfit', sans-serif; color: #1a4d2e; font-size: 0.95rem; letter-spacing: -0.2px;">
            <i class="fas fa-calendar-alt me-2 text-warning"></i>Workshops
          </h6>
          <div class="d-flex flex-column gap-3">
    `;

    let hasWorkshops = false;

    if (data.hostedWorkshops && data.hostedWorkshops.length > 0) {
      hasWorkshops = true;
      activityHtml += `
        <div class="mb-3">
          <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill mb-2 px-2.5 py-1" style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            ${lang === 'pt' ? 'Ministrados' : 'Hosted'}
          </span>
          <div class="d-flex flex-column gap-2">
      `;
      data.hostedWorkshops.forEach(ws => {
        const wsDateObj = new Date(ws.date);
        const wsDayStr = wsDateObj.getDate().toString().padStart(2, '0');
        const wsMonthStr = wsDateObj.toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US", { month: "short" }).toUpperCase().replace('.', '');
        activityHtml += `
          <div class="profile-workshop-card">
            <div class="workshop-accent-bar hosted"></div>
            <div class="profile-calendar-badge">
              <div class="calendar-month">${wsMonthStr}</div>
              <div class="calendar-day">${wsDayStr}</div>
            </div>
            <div class="min-w-0 flex-grow-1">
              <span class="d-block fw-bold text-truncate text-dark" title="${ws.title}" style="font-size: 0.8rem; line-height: 1.3;">${ws.title}</span>
              <span class="text-muted d-block mt-0.5" style="font-size: 0.7rem;"><i class="fas fa-certificate text-success me-1" style="font-size: 0.65rem;"></i>${lang === "pt" ? "Organizador" : "Host"}</span>
            </div>
          </div>
        `;
      });
      activityHtml += `</div></div>`;
    }

    if (data.attendedWorkshops && data.attendedWorkshops.length > 0) {
      hasWorkshops = true;
      activityHtml += `
        <div>
          <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill mb-2 px-2.5 py-1" style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            ${lang === 'pt' ? 'Frequenta/Frequentou' : 'Attended'}
          </span>
          <div class="d-flex flex-column gap-2">
      `;
      data.attendedWorkshops.forEach(ws => {
        const wsDateObj = new Date(ws.date);
        const wsDayStr = wsDateObj.getDate().toString().padStart(2, '0');
        const wsMonthStr = wsDateObj.toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US", { month: "short" }).toUpperCase().replace('.', '');
        activityHtml += `
          <div class="profile-workshop-card">
            <div class="workshop-accent-bar attended"></div>
            <div class="profile-calendar-badge">
              <div class="calendar-month">${wsMonthStr}</div>
              <div class="calendar-day">${wsDayStr}</div>
            </div>
            <div class="min-w-0 flex-grow-1">
              <span class="d-block fw-bold text-truncate text-dark" title="${ws.title}" style="font-size: 0.8rem; line-height: 1.3;">${ws.title}</span>
              <span class="text-muted d-block mt-0.5" style="font-size: 0.7rem;"><i class="fas fa-user text-warning me-1" style="font-size: 0.65rem;"></i>${lang === "pt" ? "Participante" : "Participant"}</span>
            </div>
          </div>
        `;
      });
      activityHtml += `</div></div>`;
    }

    if (!hasWorkshops) {
      activityHtml += `
        <div class="profile-empty-state">
          <i class="far fa-calendar mb-3"></i>
          <p>${lang === 'pt' ? 'Este utilizador ainda não participou em workshops da nossa colmeia.' : 'This user hasn\'t participated in any workshops yet.'}</p>
        </div>
      `;
    }

    activityHtml += `
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-activity-content").innerHTML = activityHtml;

    // Pane 2: Products
    if (isApicultor) {
      let productsHtml = "";
      if (data.products && data.products.length > 0) {
        data.products.forEach(p => {
          const prodImg = p.image && p.image.trim() !== "" ? p.image : "/images/default-product.png";
          const isOutOfStock = p.stock <= 0;
          const stockBadge = isOutOfStock 
            ? `<span class="badge bg-danger rounded-pill position-absolute top-0 start-0 m-2 px-2 py-0.5" style="font-size:0.6rem; z-index: 5;">Sem Stock</span>`
            : `<span class="badge bg-success rounded-pill position-absolute top-0 start-0 m-2 px-2 py-0.5" style="font-size:0.6rem; z-index: 5;">Stock (${p.stock})</span>`;
          
          productsHtml += `
            <div class="col-6 col-sm-4">
              <div class="card h-100 border border-light shadow-sm rounded-4 overflow-hidden position-relative product-premium-card" style="transition: all 0.25s ease;">
                ${stockBadge}
                <div style="height: 120px; overflow: hidden; background-color: #f8fafc; position: relative;">
                  <img src="${prodImg}" alt="${p.name}" class="w-100 h-100 object-fit-cover" onerror="this.onerror=null; this.src='/images/default-product.png';">
                </div>
                <div class="p-3 d-flex flex-column justify-content-between flex-grow-1">
                  <div>
                    <h6 class="fw-bold mb-1 text-dark text-truncate" title="${p.name}" style="font-size: 0.8rem; line-height: 1.3;">${p.name}</h6>
                    <p class="text-muted mb-2 text-truncate small" style="font-size: 0.72rem;">${p.description || ""}</p>
                  </div>
                  <div class="d-flex align-items-center justify-content-between mt-auto pt-2 border-top" style="border-top-color: #f1f5f9 !important;">
                    <span class="fw-bold text-success" style="font-size: 0.85rem;">${Number(p.price).toFixed(2)}€</span>
                    <a href="/shop.html?search=${encodeURIComponent(p.name)}" class="btn btn-warning btn-xs rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 26px; height: 26px; background-color: var(--secondary-gold); border: none; color: white; transition: transform 0.2s;" title="Ver na Loja" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                      <i class="fas fa-shopping-cart" style="font-size:0.7rem;"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
      } else {
        productsHtml = `
          <div class="col-12">
            <div class="profile-empty-state">
              <i class="fas fa-store-slash mb-3"></i>
              <p>${lang === 'pt' ? 'Este apicultor ainda não publicou produtos.' : 'This beekeeper hasn\'t posted any products yet.'}</p>
            </div>
          </div>
        `;
      }
      document.getElementById("modal-products-grid").innerHTML = productsHtml;
    }

    // Pane 3: Favorites
    if (member.favoritesPublic) {
      let favoritesHtml = "";
      if (data.favorites && data.favorites.length > 0) {
        data.favorites.forEach(p => {
          const prodImg = p.image && p.image.trim() !== "" ? p.image : "/images/default-product.png";
          favoritesHtml += `
            <div class="col-6 col-sm-4">
              <div class="card h-100 border border-light shadow-sm rounded-4 overflow-hidden position-relative product-premium-card" style="transition: all 0.25s ease;">
                <div style="height: 120px; overflow: hidden; background-color: #f8fafc; position: relative;">
                  <img src="${prodImg}" alt="${p.name}" class="w-100 h-100 object-fit-cover" onerror="this.onerror=null; this.src='/images/default-product.png';">
                </div>
                <div class="p-3 d-flex flex-column justify-content-between flex-grow-1">
                  <div>
                    <h6 class="fw-bold mb-1 text-dark text-truncate" title="${p.name}" style="font-size: 0.8rem; line-height: 1.3;">${p.name}</h6>
                  </div>
                  <div class="d-flex align-items-center justify-content-between mt-auto pt-2 border-top" style="border-top-color: #f1f5f9 !important;">
                    <span class="fw-bold text-success" style="font-size: 0.85rem;">${Number(p.price).toFixed(2)}€</span>
                    <a href="/shop.html?search=${encodeURIComponent(p.name)}" class="btn btn-warning btn-xs rounded-circle p-1 d-flex align-items-center justify-content-center" style="width: 26px; height: 26px; background-color: var(--secondary-gold); border: none; color: white; transition: transform 0.2s;" title="Ver na Loja" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                      <i class="fas fa-shopping-cart" style="font-size:0.7rem;"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
      } else {
        favoritesHtml = `
          <div class="col-12">
            <div class="profile-empty-state">
              <i class="far fa-heart mb-3"></i>
              <p>${lang === 'pt' ? 'Este utilizador não tem favoritos públicos.' : 'This user has no public favorites.'}</p>
            </div>
          </div>
        `;
      }
      document.getElementById("modal-favorites-grid").innerHTML = favoritesHtml;
    }
  }

  startChatWith(memberId) {
    if (!this.token) {
      this.checkAuth({ preventDefault: () => {} });
      return;
    }
    
    // Set query parameter so fetchConversations picks it up
    const url = new URL(window.location);
    url.searchParams.set("chatWith", memberId);
    window.history.replaceState({}, document.title, url);
    
    // Switch to chat tab programmatically (triggers fetchConversations once)
    const chatBtn = document.getElementById("btn-show-chat");
    if (chatBtn) {
      chatBtn.click();
    }
  }

  async fetchConversations() {
    const listEl = document.getElementById("conversations-list");
    if (!this.token || !listEl) return;

    try {
      const res = await fetch("/api/messages/conversations", {
        headers: buildAuthHeaders()
      });
      
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!res.ok) throw new Error("Erro ao carregar conversas.");

      const conversations = await res.json();
      listEl.innerHTML = "";

      const urlParams = new URLSearchParams(window.location.search);
      const chatWithId = urlParams.get("chatWith");
      let hasChatWithInConversations = false;

      if (conversations.length === 0 && !chatWithId) {
        listEl.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="far fa-comment-alt fa-2x mb-2 opacity-50"></i>
            <p class="smaller mb-0">Nenhuma conversa iniciada.</p>
          </div>
        `;
        return;
      }

      conversations.forEach((c) => {
        if (chatWithId && String(c.partner.id) === String(chatWithId)) {
          hasChatWithInConversations = true;
        }
        
        const hasPartnerPic = c.partner.picture && c.partner.picture.trim() !== "" && c.partner.picture !== "null" && c.partner.picture !== "undefined";
        const avatarUrl = hasPartnerPic ? c.partner.picture : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.partner.name)}&background=1a4d2e&color=fff&size=80`;
        const unreadBadge = c.unreadCount > 0 ? `<span class="badge bg-success rounded-pill">${c.unreadCount}</span>` : "";
        const lastMsgText = c.lastMessage ? c.lastMessage.text : "Nenhuma mensagem.";
        const isActive = window.activeChatPartnerId === c.partner.id ? "active" : "";

        const item = document.createElement("div");
        item.className = `conversation-item p-3 border-bottom d-flex align-items-center gap-3 cursor-pointer ${isActive}`;
        item.innerHTML = `
          <img src="${avatarUrl}" class="rounded-circle" style="width: 40px; height: 40px; object-fit: cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${c.partner.name.replace(/'/g, "\\'")}') + '&background=1a4d2e&color=fff&size=80';" />
          <div class="flex-grow-1 overflow-hidden">
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold text-dark small text-truncate" style="max-width: 140px;">${c.partner.name}</span>
              ${unreadBadge}
            </div>
            <p class="text-muted smaller text-truncate mb-0">${lastMsgText}</p>
          </div>
        `;
        item.addEventListener("click", () => {
          document.querySelectorAll(".conversation-item").forEach(el => el.classList.remove("active"));
          item.classList.add("active");
          window.openChat(c.partner.id, c.partner.name, c.partner.picture);
        });
        listEl.appendChild(item);
      });

      if (chatWithId && !hasChatWithInConversations && !window.activeChatPartnerId) {
        // Prevent duplicate temp item
        if (listEl.querySelector(`[data-temp-partner-id="${chatWithId}"]`)) {
          return;
        }

        try {
          const userRes = await fetch(`/api/users/${chatWithId}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            const hasUserPic = userData.picture && userData.picture.trim() !== "" && userData.picture !== "null" && userData.picture !== "undefined";
            const avatarUrl = hasUserPic ? userData.picture : `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=1a4d2e&color=fff&size=80`;
            
            const tempItem = document.createElement("div");
            tempItem.className = "conversation-item p-3 border-bottom d-flex align-items-center gap-3 cursor-pointer active";
            tempItem.setAttribute("data-temp-partner-id", userData.id);
            tempItem.innerHTML = `
              <img src="${avatarUrl}" class="rounded-circle" style="width: 40px; height: 40px; object-fit: cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${userData.name.replace(/'/g, "\\'")}') + '&background=1a4d2e&color=fff&size=80';" />
              <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-dark small text-truncate">${userData.name}</span>
                  <span class="badge bg-warning text-dark smaller" style="font-size:0.6rem">Novo Chat</span>
                </div>
                <p class="text-muted smaller text-truncate mb-0">Escreva uma mensagem...</p>
              </div>
            `;
            
            tempItem.addEventListener("click", () => {
              document.querySelectorAll(".conversation-item").forEach(el => el.classList.remove("active"));
              tempItem.classList.add("active");
              window.openChat(userData.id, userData.name, userData.picture);
            });
            
            listEl.insertBefore(tempItem, listEl.firstChild);
            window.openChat(userData.id, userData.name, userData.picture);
          }
        } catch (err) {
          console.error("Error fetching temporary chat user:", err);
        }
      } else if (chatWithId && hasChatWithInConversations && !window.activeChatPartnerId) {
        const items = listEl.querySelectorAll(".conversation-item");
        for (const item of items) {
          const titleSpan = item.querySelector("span");
          if (titleSpan) {
            const matchRes = await fetch(`/api/users/${chatWithId}`).catch(() => null);
            if (matchRes && matchRes.ok) {
              const userData = await matchRes.json();
              if (titleSpan.textContent === userData.name) {
                item.click();
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Conversations fetch error:", error);
    }
  }

  async openChat(partnerId, partnerName, partnerPicture) {
    window.activeChatPartnerId = partnerId;
    window.lastMessagesCount = 0;

    const url = new URL(window.location);
    const prefill = url.searchParams.get("prefill");
    const productSlug = url.searchParams.get("product");
    url.searchParams.delete("chatWith");
    url.searchParams.delete("prefill");
    url.searchParams.delete("product");
    window.history.replaceState({}, document.title, url);

    const bannerContainer = document.getElementById("chat-product-banner-container");
    if (bannerContainer) {
      bannerContainer.innerHTML = "";
      bannerContainer.classList.add("d-none");
    }

    if (productSlug) {
      fetch(`/api/products/by-slug/${encodeURIComponent(productSlug)}`)
        .then(res => res.ok ? res.json() : null)
        .then(product => {
          if (product && String(product.ID_Apicultor) === String(partnerId)) {
            if (bannerContainer) {
              bannerContainer.innerHTML = `
                <div class="chat-product-banner d-flex align-items-center justify-content-between p-3 bg-light border-bottom" style="z-index: 10; width: 100%;">
                  <div class="d-flex align-items-center gap-3">
                    <img src="${product.Imagem || '/images/default-product.png'}" class="rounded-3 border" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null; this.src='/images/default-product.png';">
                    <div>
                      <div class="fw-bold text-dark small mb-1">${product.Nome}</div>
                      <div class="fw-bold text-success" style="font-size: 0.85rem;">€${parseFloat(product.Preco).toFixed(2)}</div>
                    </div>
                  </div>
                  <a href="/produto/${product.Slug}" class="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold" style="font-size: 0.8rem; border-color: var(--primary-green); color: var(--primary-green); text-decoration: none;">
                    <i class="fas fa-eye me-1"></i>Ver Produto
                  </a>
                </div>
              `;
              bannerContainer.classList.remove("d-none");
            }
          }
        })
        .catch(err => console.error("Error loading chat product:", err));
    }

    const headerEl = document.getElementById("chat-header");
    const messagesArea = document.getElementById("chat-messages-area");
    const inputArea = document.getElementById("chat-input-area");

    if (!headerEl || !messagesArea || !inputArea) return;

    const hasPartnerPic = partnerPicture && partnerPicture.trim() !== "" && partnerPicture !== "null" && partnerPicture !== "undefined";
    const avatarUrl = hasPartnerPic ? partnerPicture : `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=1a4d2e&color=fff&size=80`;

    headerEl.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <img src="${avatarUrl}" class="rounded-circle" style="width: 38px; height: 38px; object-fit: cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${partnerName.replace(/'/g, "\\'")}') + '&background=1a4d2e&color=fff&size=80';" />
        <div>
          <div class="fw-bold text-dark small">${partnerName}</div>
          <div class="smaller text-muted" id="chat-status-text">Histórico de mensagens</div>
        </div>
      </div>
      <div class="d-flex gap-1 align-items-center">
        <button class="btn btn-sm btn-outline-danger border-0 chat-header-btn" onclick="window.reportChatUser(${partnerId}, '${partnerName}')" title="Denunciar"><i class="fas fa-flag"></i></button>
        <button id="btn-chat-block" class="btn btn-sm btn-outline-secondary border-0 chat-header-btn" onclick="window.blockChatUser(${partnerId})" title="Bloquear"><i class="fas fa-ban"></i></button>
      </div>
    `;

    inputArea.classList.remove("d-none");
    messagesArea.innerHTML = `
      <div class="m-auto text-center text-muted">
        <i class="fas fa-spinner fa-spin fa-2x mb-2 text-success"></i>
        <p class="smaller mb-0">A carregar mensagens...</p>
      </div>
    `;

    await window.fetchChatHistory(partnerId, false);

    await fetch(`/api/messages/read/${partnerId}`, {
      method: "POST",
      headers: buildAuthHeaders()
    }).catch(() => {});

    if (window.chatPollInterval) clearInterval(window.chatPollInterval);
    window.chatPollInterval = setInterval(() => {
      if (window.activeChatPartnerId === partnerId) {
        window.fetchChatHistory(partnerId, true);
      }
    }, 3000);

    const chatMsgInput = document.getElementById("chat-message-input");
    if (chatMsgInput) {
      chatMsgInput.focus();
    }
  }

  async fetchChatHistory(partnerId, quiet = false) {
    const messagesArea = document.getElementById("chat-messages-area");
    if (!this.token || !messagesArea || window.activeChatPartnerId !== partnerId) return;

    try {
      const res = await fetch(`/api/messages/history/${partnerId}`, {
        headers: buildAuthHeaders()
      });

      if (!res.ok) throw new Error("Erro ao obter mensagens.");

      const data = await res.json();
      if (window.activeChatPartnerId !== partnerId) return;

      const messages = data.messages || [];
      
      const blockBtn = document.getElementById("btn-chat-block");
      if (blockBtn) {
        if (data.blockedByMe) {
          blockBtn.className = "btn btn-sm btn-danger border-0 chat-header-btn";
          blockBtn.innerHTML = '<i class="fas fa-check"></i>';
          blockBtn.setAttribute("onclick", `window.unblockChatUser(${partnerId})`);
          blockBtn.title = "Desbloquear Utilizador";
        } else {
          blockBtn.className = "btn btn-sm btn-outline-secondary border-0 chat-header-btn";
          blockBtn.innerHTML = '<i class="fas fa-ban"></i>';
          blockBtn.setAttribute("onclick", `window.blockChatUser(${partnerId})`);
          blockBtn.title = "Bloquear Utilizador";
        }
      }

      const chatMsgInput = document.getElementById("chat-message-input");
      const chatSendFormBtn = document.querySelector("#chat-send-form button[type='submit']");
      const statusText = document.getElementById("chat-status-text");

      if (data.blockedByMe || data.blockedMe) {
        if (chatMsgInput) {
          chatMsgInput.disabled = true;
          chatMsgInput.placeholder = data.blockedByMe 
            ? "Desbloqueie este utilizador para enviar mensagens." 
            : "Este utilizador bloqueou-te.";
        }
        if (chatSendFormBtn) chatSendFormBtn.disabled = true;
        if (statusText) statusText.innerText = "Bloqueio Ativo";
      } else {
        if (chatMsgInput) {
          chatMsgInput.disabled = false;
          chatMsgInput.placeholder = "Escreva a sua mensagem...";
        }
        if (chatSendFormBtn) chatSendFormBtn.disabled = false;
        if (statusText) statusText.innerText = "Online";
      }

      if (quiet && messages.length === window.lastMessagesCount) {
        return;
      }

      window.lastMessagesCount = messages.length;

      if (messages.length === 0) {
        messagesArea.innerHTML = `
          <div class="m-auto text-center text-muted py-5 px-3">
            <i class="far fa-comments fa-2x mb-2 text-success opacity-50"></i>
            <p class="smaller mb-0">Sem mensagens nesta conversa. Envia uma mensagem abaixo!</p>
          </div>
        `;
        return;
      }

      messagesArea.innerHTML = messages.map(m => {
        const isMe = String(m.senderId) === String(this.currentUser?.id);
        const bubbleClass = isMe ? "bg-success text-white ms-auto" : "bg-light text-dark me-auto";
        const time = new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const readIcon = isMe ? `<span class="ms-1" style="font-size: 0.65rem; opacity: 0.7;"><i class="fas ${m.read ? 'fa-check-double text-warning' : 'fa-check'}"></i></span>` : '';
        
        const escape = (str) => {
          const div = document.createElement("div");
          div.textContent = str;
          return div.innerHTML;
        };

        return `
          <div class="d-flex flex-column mb-1" style="max-width: 75%; ${isMe ? 'align-self: flex-end;' : 'align-self: flex-start;'}">
            <div class="p-2.5 rounded-4 shadow-sm ${bubbleClass}" style="border-radius: 18px; font-size: 0.85rem; word-break: break-word; line-height: 1.4; padding: 8px 14px;">
              ${escape(m.text)}
            </div>
            <span class="smaller text-muted mt-1 px-1 align-self-end" style="font-size: 0.65rem;">
              ${time} ${readIcon}
            </span>
          </div>
        `;
      }).join("");

      messagesArea.scrollTop = messagesArea.scrollHeight;
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }

  async sendChatMessage() {
    const inputEl = document.getElementById("chat-message-input");
    const text = inputEl ? inputEl.value.trim() : "";
    const partnerId = window.activeChatPartnerId;

    if (!text || !partnerId) return;

    inputEl.value = "";

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: buildAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          receiverId: partnerId,
          text
        })
      });

      if (res.ok) {
        await window.fetchChatHistory(partnerId, false);
        window.fetchConversations();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: "error",
          title: "Ops...",
          text: data.error || "Erro ao enviar mensagem.",
          confirmButtonColor: "#1a4d2e"
        });
        inputEl.value = text;
      }
    } catch (err) {
      console.error("Send message error:", err);
      Swal.fire({
        icon: "error",
        title: "Ops...",
        text: "Erro ao comunicar com o servidor.",
        confirmButtonColor: "#1a4d2e"
      });
      inputEl.value = text;
    }
  }

  async blockChatUser(id) {
    const result = await Swal.fire({
      title: "Bloquear Utilizador?",
      text: "Não poderás enviar ou receber mensagens privadas deste utilizador.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, bloquear",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/users/block/${id}`, {
          method: "POST",
          headers: buildAuthHeaders()
        });
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Utilizador Bloqueado!",
            timer: 1500,
            showConfirmButton: false
          });
          window.fetchChatHistory(id, false);
          window.fetchConversations();
        } else {
          const data = await res.json();
          Swal.fire("Erro", data.error || "Erro ao bloquear.", "error");
        }
      } catch (err) {
        Swal.fire("Erro", "Erro de ligação.", "error");
      }
    }
  }

  async unblockChatUser(id) {
    try {
      const res = await fetch(`/api/users/unblock/${id}`, {
        method: "POST",
        headers: buildAuthHeaders()
      });
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Utilizador Desbloqueado!",
          timer: 1500,
          showConfirmButton: false
        });
        window.fetchChatHistory(id, false);
        window.fetchConversations();
      } else {
        const data = await res.json();
        Swal.fire("Erro", data.error || "Erro ao desbloquear.", "error");
      }
    } catch (err) {
      Swal.fire("Erro", "Erro de ligação.", "error");
    }
  }

  async reportChatUser(id, name) {
    const { value: reason } = await Swal.fire({
      title: `Denunciar ${name}`,
      input: 'textarea',
      inputLabel: 'Qual é o motivo da denúncia?',
      inputPlaceholder: 'Escreve aqui o motivo...',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Enviar Denúncia',
      cancelButtonText: 'Cancelar'
    });

    if (reason) {
      try {
        const res = await fetch("/api/reports/create", {
          method: "POST",
          headers: buildAuthHeaders({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({
            reportedUserId: id,
            itemType: "mensagem",
            itemId: id,
            reason,
            itemText: "Denunciado a partir de chat privado"
          }),
        });

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Denúncia Enviada!",
            text: "A tua denúncia foi registada e será analisada pela moderação.",
            confirmButtonColor: "#1a4d2e"
          });
        } else {
          const data = await res.json();
          Swal.fire("Erro", data.error || "Erro ao enviar denúncia.", "error");
        }
      } catch (err) {
        Swal.fire("Erro", "Erro de ligação.", "error");
      }
    }
  }
}

// Instantiate
document.addEventListener("DOMContentLoaded", () => {
  window.socialUI = new SocialNetworkUI();
});
