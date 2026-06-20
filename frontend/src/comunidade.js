/**
 * Comunidade Q&A Module
 * Handles the community questions & answers on the curiosidades page
 */
import { Skeleton } from './skeleton.js';

class ComunidadeQA {
  constructor() {
    this.container = document.getElementById("qa-thread");
    this.form = document.getElementById("qa-form");
    this.token = localStorage.getItem("token");
    this.user = JSON.parse(localStorage.getItem("user") || "null");

    if (this.container) {
      this.init();
    }
  }

  async init() {
    this.setupForm();
    await this.loadMeusVotos();
    await this.loadPerguntas();
  }

  async loadMeusVotos() {
    if (!this.token) {
      localStorage.removeItem("qa_voted");
      return;
    }
    try {
      const res = await fetch("/api/comunidade/meus-votos", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("qa_voted", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error loading user votes:", err);
    }
  }

  setupForm() {
    if (!this.form) return;

    const textarea = this.form.querySelector("#qa-input");
    const submitBtn = this.form.querySelector("#qa-submit-btn");
    const loginMsg = this.form.querySelector("#qa-login-msg");

    if (!this.token || !this.user) {
      // Show login message, hide form inputs
      if (textarea) textarea.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      if (loginMsg) loginMsg.classList.remove("d-none");
    }

    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!this.token) return;

      const texto = textarea.value.trim();
      if (texto.length < 10) {
        textarea.classList.add("is-invalid");
        return;
      }
      textarea.classList.remove("is-invalid");

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>A publicar...';

      try {
        const res = await fetch("/api/comunidade/perguntas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ texto }),
        });

        if (res.ok) {
          textarea.value = "";
          await this.loadPerguntas();
          Swal.fire({
            icon: "success",
            title: "Publicado!",
            text: "A tua pergunta foi partilhada com a comunidade.",
            confirmButtonColor: "#1a4d2e"
          });
        } else {
          const data = await res.json();
          if (res.status === 401 || data.error === "Session expired") {
            this.handleSessionExpired();
          } else {
            Swal.fire({
              icon: "error",
              title: "Ops...",
              text: data.error || "Erro ao publicar pergunta.",
              confirmButtonColor: "#1a4d2e"
            });
          }
        }
      } catch (err) {
        console.error("Error posting question:", err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Publicar Pergunta';
      }
    });
  }

  async loadPerguntas() {
    // Carregar estilo de placeholder configurado pelo admin
    await Skeleton.init();

    // Mostrar skeleton placeholders enquanto carrega
    if (this.container && this.container.children.length === 0) {
      this.container.innerHTML = Skeleton.communityList(4);
    }

    try {
      const res = await fetch("/api/comunidade/perguntas");
      if (!res.ok) throw new Error("Fetch failed");
      const perguntas = await res.json();
      this.renderPerguntas(perguntas);
    } catch (err) {
      console.error("Error loading Q&A:", err);
      // Mostrar estado de erro com botão de retry
      if (this.container) {
        this.container.innerHTML = Skeleton.stateError(
          'Não foi possível carregar as perguntas da comunidade.',
          'retry-comunidade-btn'
        );
        Skeleton.onRetry('retry-comunidade-btn', () => this.loadPerguntas());
      }
    }
  }

  timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    if (diff < 2592000) return `há ${Math.floor(diff / 604800)} semanas`;
    return date.toLocaleDateString("pt-PT");
  }

  isBeekeeper(tipo) {
    return tipo === "apicultor" || tipo === "admin";
  }

  getAvatarUrl(picture, nome) {
    if (picture && picture.trim() !== "" && picture !== "null" && picture !== "undefined") return picture;
    const encoded = encodeURIComponent(nome || "U");
    return `https://ui-avatars.com/api/?name=${encoded}&background=1a4d2e&color=fff&size=80`;
  }

  renderPerguntas(perguntas) {
    if (!this.container) return;

    if (perguntas.length === 0) {
      this.container.innerHTML = Skeleton.stateEmpty(
        'Ainda não há perguntas. Sê o primeiro a perguntar!',
        'fa-comments'
      );
      return;
    }

    this.container.innerHTML = perguntas
      .map((p, idx) => this.renderPergunta(p, idx))
      .join("");

    // Bind event listeners
    this.bindEvents();
  }

  renderPergunta(p, idx) {
    const isAuthorBeekeeper = this.isBeekeeper(p.AutorTipo);
    const isAuthorAdmin = p.AutorTipo === "admin";
    const avatarUrl = this.getAvatarUrl(p.AutorPicture, p.AutorNome);
    
    let roleClass = isAuthorBeekeeper ? "qa-role-beekeeper" : "qa-role-client";
    let roleLabel = isAuthorBeekeeper
      ? '<i class="fas fa-check-circle me-1"></i>Apicultor Verificado'
      : "Cliente";
      
    if (isAuthorAdmin) {
      roleClass = "badge bg-danger text-white border-0 py-1 px-2";
      roleLabel = '<i class="fas fa-shield-alt me-1"></i>Equipa Hexomel';
    }
    
    const avatarClass = isAuthorBeekeeper ? "qa-avatar-beekeeper" : "qa-avatar-client";

    const respostasHTML = (p.respostas || [])
      .map((r) => this.renderResposta(r, p.ID_Pergunta))
      .join("");

    const answerFormHTML = this.token
      ? `<div class="qa-reply-form" data-pergunta-id="${p.ID_Pergunta}">
          <div class="d-flex gap-2 align-items-start p-3" style="border-top: 1px dashed rgba(0,0,0,0.06);">
            <textarea class="qa-reply-input" placeholder="Escreve a tua resposta..." rows="2"></textarea>
            <button class="qa-reply-btn" data-id="${p.ID_Pergunta}">
              <i class="fas fa-reply"></i>
            </button>
          </div>
        </div>`
      : "";

    const canDelete = this.user && (this.user.id === p.ID_Cliente || this.user.role === "admin");
    const deleteBtn = canDelete
      ? `<button class="qa-delete-btn ms-auto" data-type="pergunta" data-id="${p.ID_Pergunta}" title="Apagar Pergunta"><i class="fas fa-trash-alt"></i></button>`
      : "";

    const isAuthor = this.user && this.user.id === p.ID_Cliente;
    const authorBadge = isAuthor ? '<span class="badge ms-2" style="font-size: 0.65rem; background-color: var(--primary-green);">A Tua Pergunta</span>' : '';

    let socialActionsHtml = "";
    if (this.token && this.user && this.user.id !== p.ID_Cliente && !isAuthorAdmin) {
      socialActionsHtml = `
        <div class="qa-social-actions ms-2 d-inline-flex gap-2">
          <a href="rede-social.html?chatWith=${p.ID_Cliente}" class="btn btn-sm btn-link p-0 text-success" style="font-size: 0.9rem;" title="Enviar Mensagem Privada"><i class="fas fa-comment-dots"></i></a>
          <button class="btn btn-sm btn-link p-0 text-danger qa-report-btn" style="font-size: 0.9rem; border: none; background: none;" data-user-id="${p.ID_Cliente}" data-item-type="pergunta" data-item-id="${p.ID_Pergunta}" data-item-text="${this.escapeHTML(p.Texto)}" title="Denunciar"><i class="fas fa-flag"></i></button>
          <button class="btn btn-sm btn-link p-0 text-secondary qa-block-btn" style="font-size: 0.9rem; border: none; background: none;" data-user-id="${p.ID_Cliente}" title="Bloquear"><i class="fas fa-ban"></i></button>
        </div>
      `;
    }

    const voted = JSON.parse(localStorage.getItem('qa_voted') || '{"perguntas":[],"respostas":[]}');
    const isVoted = voted.perguntas.includes(p.ID_Pergunta) ? "qa-voted" : "";

    const authorLinkStart = isAuthorAdmin ? "" : `<a href="profile.html?id=${p.ID_Cliente}">`;
    const authorLinkEnd = isAuthorAdmin ? "" : `</a>`;

    return `
      <div class="qa-item animate-fade-up" style="animation-delay: ${0.1 + idx * 0.08}s">
        <div class="qa-question">
          ${authorLinkStart}
            <img src="${avatarUrl}" alt="${p.AutorNome || 'U'}" class="qa-avatar-img ${avatarClass}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${p.AutorNome || 'U'}') + '&background=1a4d2e&color=fff&size=80';" />
          ${authorLinkEnd}
          <div class="qa-content">
            <div class="qa-meta d-flex w-100 align-items-center">
              ${isAuthorAdmin 
                ? `<span class="qa-author fw-bold text-dark me-2">${p.AutorNome || "Anónimo"}</span>` 
                : `<a href="profile.html?id=${p.ID_Cliente}" class="qa-author text-decoration-none fw-bold text-dark me-2">${p.AutorNome || "Anónimo"}</a>`}
              <span class="qa-role ${roleClass}">${roleLabel}</span>
              ${authorBadge}
              ${socialActionsHtml}
              ${deleteBtn}
            </div>
            <p class="qa-text">${this.escapeHTML(p.Texto)}</p>
            <div class="qa-actions">
              <button class="qa-vote ${isVoted}" data-type="pergunta" data-id="${p.ID_Pergunta}">
                <i class="fas fa-thumbs-up"></i> <span>${p.Votos || 0}</span>
              </button>
              <span class="qa-timestamp"><i class="far fa-clock me-1"></i>${this.timeAgo(p.Data_Criacao)}</span>
              <span class="qa-reply-count"><i class="fas fa-comment me-1"></i>${(p.respostas || []).length} resposta${(p.respostas || []).length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        ${respostasHTML}
        ${answerFormHTML}
      </div>`;
  }

  renderResposta(r, perguntaId) {
    const isAuthorBeekeeper = this.isBeekeeper(r.AutorTipo);
    const isAuthorAdmin = r.AutorTipo === "admin";
    const avatarUrl = this.getAvatarUrl(r.AutorPicture, r.AutorNome);
    
    let roleClass = isAuthorBeekeeper ? "qa-role-beekeeper" : "qa-role-client";
    let roleLabel = isAuthorBeekeeper
      ? '<i class="fas fa-check-circle me-1"></i>Apicultor Verificado'
      : "Cliente";
      
    if (isAuthorAdmin) {
      roleClass = "badge bg-danger text-white border-0 py-1 px-2";
      roleLabel = '<i class="fas fa-shield-alt me-1"></i>Equipa Hexomel';
    }
    
    const avatarClass = isAuthorBeekeeper ? "qa-avatar-beekeeper" : "qa-avatar-client";
    const bestBadge = r.Melhor_Resposta
      ? '<span class="qa-badge-best"><i class="fas fa-star me-1"></i>Melhor Resposta</span>'
      : "";
      
    const canDelete = this.user && (this.user.id === r.ID_Cliente || this.user.role === "admin");
    const deleteBtn = canDelete
      ? `<button class="qa-delete-btn ms-auto" data-type="resposta" data-id="${r.ID_Resposta}" title="Apagar Resposta"><i class="fas fa-trash-alt"></i></button>`
      : "";

    const isAuthor = this.user && this.user.id === r.ID_Cliente;
    const authorBadge = isAuthor ? '<span class="badge ms-2" style="font-size: 0.65rem; background-color: var(--primary-green);">A Tua Resposta</span>' : '';

    let socialActionsHtml = "";
    if (this.token && this.user && this.user.id !== r.ID_Cliente && !isAuthorAdmin) {
      socialActionsHtml = `
        <div class="qa-social-actions ms-2 d-inline-flex gap-2">
          <a href="rede-social.html?chatWith=${r.ID_Cliente}" class="btn btn-sm btn-link p-0 text-success" style="font-size: 0.9rem;" title="Enviar Mensagem Privada"><i class="fas fa-comment-dots"></i></a>
          <button class="btn btn-sm btn-link p-0 text-danger qa-report-btn" style="font-size: 0.9rem; border: none; background: none;" data-user-id="${r.ID_Cliente}" data-item-type="resposta" data-item-id="${r.ID_Resposta}" data-item-text="${this.escapeHTML(r.Texto)}" title="Denunciar"><i class="fas fa-flag"></i></button>
          <button class="btn btn-sm btn-link p-0 text-secondary qa-block-btn" style="font-size: 0.9rem; border: none; background: none;" data-user-id="${r.ID_Cliente}" title="Bloquear"><i class="fas fa-ban"></i></button>
        </div>
      `;
    }

    const voted = JSON.parse(localStorage.getItem('qa_voted') || '{"perguntas":[],"respostas":[]}');
    const isVoted = voted.respostas.includes(r.ID_Resposta) ? "qa-voted" : "";

    const authorLinkStart = isAuthorAdmin ? "" : `<a href="profile.html?id=${r.ID_Cliente}">`;
    const authorLinkEnd = isAuthorAdmin ? "" : `</a>`;

    return `
      <div class="qa-answer ${isAuthorBeekeeper ? "qa-answer-beekeeper" : ""}">
        <div class="qa-answer-line"></div>
        ${authorLinkStart}
          <img src="${avatarUrl}" alt="${r.AutorNome || 'U'}" class="qa-avatar-img ${avatarClass}" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + encodeURIComponent('${r.AutorNome || 'U'}') + '&background=1a4d2e&color=fff&size=80';" />
        ${authorLinkEnd}
        <div class="qa-content">
          <div class="qa-meta d-flex w-100 align-items-center">
            ${isAuthorAdmin 
              ? `<span class="qa-author fw-bold text-dark me-2">${r.AutorNome || "Anónimo"}</span>` 
              : `<a href="profile.html?id=${r.ID_Cliente}" class="qa-author text-decoration-none fw-bold text-dark me-2">${r.AutorNome || "Anónimo"}</a>`}
            <span class="qa-role ${roleClass}">${roleLabel}</span>
            ${authorBadge}
            ${socialActionsHtml}
            ${deleteBtn}
          </div>
          <p class="qa-text">${this.escapeHTML(r.Texto)}</p>
          <div class="qa-actions">
            <button class="qa-vote ${isVoted}" data-type="resposta" data-id="${r.ID_Resposta}">
              <i class="fas fa-thumbs-up"></i> <span>${r.Votos || 0}</span>
            </button>
            ${bestBadge}
            <span class="qa-timestamp"><i class="far fa-clock me-1"></i>${this.timeAgo(r.Data_Criacao)}</span>
          </div>
        </div>
      </div>`;
  }

  bindEvents() {
    // Vote buttons
    this.container.querySelectorAll(".qa-vote").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this.token) {
          Swal.fire({
            icon: "info",
            title: "Sessão Necessária",
            text: "Precisas de iniciar sessão para votar nas perguntas e respostas!",
            confirmButtonColor: "#1a4d2e",
            showCancelButton: true,
            cancelButtonText: "Agora não",
            confirmButtonText: "Iniciar Sessão"
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = "index.html#auth-modal";
            }
          });
          return;
        }
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        const url =
          type === "pergunta"
            ? `/api/comunidade/perguntas/${id}/votar`
            : `/api/comunidade/respostas/${id}/votar`;

        const isVoted = btn.classList.contains("qa-voted");
        const action = isVoted ? "remove" : "add";

        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${this.token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ action })
          });
          if (res.ok) {
            const countSpan = btn.querySelector("span");
            const currentVotes = parseInt(countSpan.textContent);
            let votedStorage = JSON.parse(localStorage.getItem('qa_voted') || '{"perguntas":[],"respostas":[]}');
            
            const storageKey = type === "pergunta" ? "perguntas" : "respostas";
            const idNum = parseInt(id);

            if (isVoted) {
              countSpan.textContent = Math.max(0, currentVotes - 1);
              btn.classList.remove("qa-voted");
              votedStorage[storageKey] = votedStorage[storageKey].filter(v => v !== idNum);
            } else {
              countSpan.textContent = currentVotes + 1;
              btn.classList.add("qa-voted");
              if (!votedStorage[storageKey].includes(idNum)) {
                votedStorage[storageKey].push(idNum);
              }
            }
            localStorage.setItem('qa_voted', JSON.stringify(votedStorage));
          }
        } catch (err) {
          console.error("Vote error:", err);
        }
      });
    });

    // Reply buttons
    this.container.querySelectorAll(".qa-reply-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const perguntaId = btn.dataset.id;
        const form = btn.closest(".qa-reply-form");
        const textarea = form.querySelector(".qa-reply-input");
        const texto = textarea.value.trim();

        if (texto.length < 2) {
          Swal.fire({
            icon: 'warning',
            title: 'Texto muito curto',
            text: 'A tua resposta deve ter pelo menos 2 caracteres.',
            confirmButtonColor: '#1a4d2e'
          });
          textarea.classList.add("is-invalid");
          return;
        }
        textarea.classList.remove("is-invalid");
        btn.disabled = true;

        try {
          const res = await fetch(
            `/api/comunidade/perguntas/${perguntaId}/respostas`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
              },
              body: JSON.stringify({ texto }),
            }
          );

          if (res.ok) {
            await this.loadPerguntas();
            Swal.fire({
              icon: "success",
              title: "Respondido!",
              text: "A tua resposta foi adicionada à discussão.",
              confirmButtonColor: "#1a4d2e",
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            const data = await res.json();
            if (res.status === 401 || data.error === "Session expired") {
              this.handleSessionExpired();
            } else {
              Swal.fire({
                icon: "error",
                title: "Erro",
                text: data.error || "Erro ao publicar resposta",
                confirmButtonColor: "#1a4d2e"
              });
            }
          }
        } catch (err) {
          console.error("Reply error:", err);
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Delete buttons
    this.container.querySelectorAll(".qa-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!this.token) return;

        const type = btn.dataset.type;
        const id = btn.dataset.id;
        const typeName = type === "pergunta" ? "pergunta" : "resposta";

        const result = await Swal.fire({
          title: "Apagar " + typeName + "?",
          text: "Esta ação não pode ser desfeita.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc3545",
          cancelButtonColor: "#6c757d",
          confirmButtonText: "Sim, apagar",
          cancelButtonText: "Cancelar"
        });

        if (result.isConfirmed) {
          const url = type === "pergunta"
            ? `/api/comunidade/perguntas/${id}`
            : `/api/comunidade/respostas/${id}`;

          try {
            const res = await fetch(url, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${this.token}` }
            });

            if (res.ok) {
              await this.loadPerguntas();
              Swal.fire({
                title: "Apagado!",
                text: "O post foi apagado com sucesso.",
                icon: "success",
                confirmButtonColor: "#1a4d2e",
                timer: 1500,
                showConfirmButton: false
              });
            } else {
              const data = await res.json();
              if (res.status === 401 || data.error === "Session expired") {
                this.handleSessionExpired();
              } else {
                Swal.fire("Erro", data.error || "Erro ao apagar", "error");
              }
            }
          } catch (err) {
            console.error("Delete error:", err);
            Swal.fire("Erro", "Falha na ligação", "error");
          }
        }
      });
    });

    // Report buttons
    this.container.querySelectorAll(".qa-report-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const reportedUserId = btn.dataset.userId;
        const itemType = btn.dataset.itemType;
        const itemId = btn.dataset.itemId;
        const itemText = btn.dataset.itemText;

        const { value: reason } = await Swal.fire({
          title: 'Denunciar Conteúdo',
          input: 'textarea',
          inputLabel: 'Qual é o motivo da denúncia?',
          inputPlaceholder: 'Escreve aqui o motivo...',
          inputAttributes: {
            'aria-label': 'Escreve o teu motivo'
          },
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
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.token}`,
              },
              body: JSON.stringify({
                reportedUserId,
                itemType,
                itemId,
                reason,
                itemText
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
              Swal.fire("Erro", data.error || "Erro ao enviar denúncia", "error");
            }
          } catch (err) {
            console.error("Report submit error:", err);
            Swal.fire("Erro", "Falha de ligação", "error");
          }
        }
      });
    });

    // Block buttons
    this.container.querySelectorAll(".qa-block-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetUserId = btn.dataset.userId;

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
            const res = await fetch(`/api/users/block/${targetUserId}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.token}`
              }
            });

            if (res.ok) {
              Swal.fire({
                icon: "success",
                title: "Bloqueado!",
                text: "O utilizador foi bloqueado com sucesso.",
                confirmButtonColor: "#1a4d2e",
                timer: 1500,
                showConfirmButton: false
              });
              await this.loadPerguntas();
            } else {
              const data = await res.json();
              Swal.fire("Erro", data.error || "Erro ao bloquear utilizador", "error");
            }
          } catch (err) {
            console.error("Block error:", err);
            Swal.fire("Erro", "Falha na ligação", "error");
          }
        }
      });
    });
  }

  escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  handleSessionExpired() {
    Swal.fire({
      icon: "warning",
      title: "Sessão Expirada",
      text: "A tua sessão expirou. Por favor, inicia sessão novamente para continuar.",
      confirmButtonColor: "#1a4d2e",
      confirmButtonText: "Iniciar Sessão"
    }).then(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html#auth-modal";
    });
  }
}

// Auto-init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new ComunidadeQA());
} else {
  new ComunidadeQA();
}
