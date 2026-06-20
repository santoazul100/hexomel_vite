// Aprender Page — Interactive Gamified Quiz & Glossary Filters

let QUESTIONS = [];
let currentQ = 0;
let score = 0;
let answered = false;

async function fetchQuestions() {
  try {
    const res = await fetch("/api/quiz/perguntas");
    if (!res.ok) throw new Error("Failed to load questions");
    QUESTIONS = await res.json();
  } catch (error) {
    console.error(error);
    // Fallback if API fails
    QUESTIONS = [
      { Pergunta: "Erro ao carregar o quiz.", Opcao1: "Tentar novamente", Opcao2: "Mais tarde", Opcao3: "-", Opcao4: "-", Resposta_Correta: 0, Explicacao: "Por favor, verifica a tua ligação." }
    ];
  }
}

async function initQuiz() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  
  document.getElementById("quiz-question").textContent = "A carregar...";
  document.getElementById("quiz-options").innerHTML = "";
  
  if (QUESTIONS.length === 0) {
    await fetchQuestions();
  }

  currentQ = 0;
  score = 0;
  answered = false;
  
  document.getElementById("quiz-result").style.display = "none";
  container.style.display = "block";
  
  // Render dots progress tracker
  const dotsContainer = document.getElementById("quiz-dots");
  if (dotsContainer) {
    dotsContainer.innerHTML = "";
    for (let i = 0; i < QUESTIONS.length; i++) {
      const dot = document.createElement("div");
      dot.className = "quiz-dot";
      dotsContainer.appendChild(dot);
    }
  }

  renderQuestion();

  // Remove existing listeners to avoid duplicates
  const nextBtn = document.getElementById("quiz-next");
  const newNextBtn = nextBtn.cloneNode(true);
  nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
  newNextBtn.addEventListener("click", () => {
    currentQ++;
    if (currentQ >= QUESTIONS.length) { showResult(); return; }
    answered = false;
    renderQuestion();
  });

  const restartBtn = document.getElementById("quiz-restart");
  const newRestartBtn = restartBtn.cloneNode(true);
  restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
  newRestartBtn.addEventListener("click", () => {
    initQuiz();
  });
}

function renderQuestion() {
  if (QUESTIONS.length === 0) return;
  const q = QUESTIONS[currentQ];
  
  document.getElementById("quiz-question-num").textContent = `Pergunta ${currentQ + 1} de ${QUESTIONS.length}`;
  document.getElementById("quiz-question").textContent = q.Pergunta;
  
  // Update secondary horizontal bar
  document.getElementById("quiz-progress-bar").style.width = `${((currentQ + 1) / QUESTIONS.length) * 100}%`;
  
  document.getElementById("quiz-feedback").style.display = "none";
  document.getElementById("quiz-next").style.display = "none";

  // Highlight dots progress tracker
  const dots = document.querySelectorAll(".quiz-dot");
  dots.forEach((dot, idx) => {
    dot.classList.remove("is-active");
    if (idx === currentQ) {
      dot.classList.add("is-active");
    }
  });

  const optsDiv = document.getElementById("quiz-options");
  optsDiv.innerHTML = "";
  const opts = [q.Opcao1, q.Opcao2, q.Opcao3, q.Opcao4];
  const letters = ["A", "B", "C", "D"];

  opts.forEach((opt, i) => {
    // If option is empty or placeholder, do not render (unless fallback)
    if (!opt || opt === "-") return;

    const btn = document.createElement("button");
    btn.className = "quiz-option";
    
    const badge = document.createElement("span");
    badge.className = "option-badge";
    badge.textContent = letters[i];
    
    const textSpan = document.createElement("span");
    textSpan.className = "flex-grow-1 option-text";
    textSpan.textContent = opt;
    
    btn.appendChild(badge);
    btn.appendChild(textSpan);
    btn.addEventListener("click", () => handleAnswer(i));
    optsDiv.appendChild(btn);
  });
}

function handleAnswer(idx) {
  if (answered) return;
  answered = true;
  const q = QUESTIONS[currentQ];
  const correctIdx = q.Resposta_Correta;
  const btns = document.querySelectorAll(".quiz-option");
  const feedback = document.getElementById("quiz-feedback");

  const isCorrect = idx === correctIdx;
  if (isCorrect) score++;

  // Update dots progress tracker status
  const dots = document.querySelectorAll(".quiz-dot");
  if (dots[currentQ]) {
    dots[currentQ].classList.remove("is-active");
    if (isCorrect) {
      dots[currentQ].classList.add("is-correct");
    } else {
      dots[currentQ].classList.add("is-wrong");
    }
  }

  // Display wrong/correct option status
  btns.forEach((btn, i) => {
    btn.classList.add("is-disabled");
    if (i === correctIdx) {
      btn.classList.add("is-correct");
      const checkIcon = document.createElement("i");
      checkIcon.className = "fas fa-check ms-auto text-success fs-5";
      btn.appendChild(checkIcon);
    }
    if (i === idx && i !== correctIdx) {
      btn.classList.add("is-wrong");
      const crossIcon = document.createElement("i");
      crossIcon.className = "fas fa-times ms-auto text-danger fs-5";
      btn.appendChild(crossIcon);
    }
  });

  feedback.className = `quiz-feedback mt-4 ${isCorrect ? "is-correct" : "is-wrong"}`;
  
  const iconHtml = isCorrect ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-info-circle"></i>';
  const prefix = isCorrect ? "Resposta Exata." : "Curiosidade:";
  
  feedback.innerHTML = `${iconHtml}<div><strong style="display:block;margin-bottom:0.25rem;">${prefix}</strong>${q.Explicacao}</div>`;
  feedback.style.display = "flex";
  
  const nextBtn = document.getElementById("quiz-next");
  nextBtn.style.display = "inline-flex";
  nextBtn.innerHTML = currentQ === QUESTIONS.length - 1 ? 'Ver Resultado <i class="fas fa-trophy ms-2"></i>' : 'Próxima <i class="fas fa-arrow-right ms-2"></i>';
}

async function showResult() {
  document.getElementById("quiz-container").style.display = "none";
  const resultDiv = document.getElementById("quiz-result");
  resultDiv.style.display = "block";
  
  // Set text score
  document.getElementById("quiz-score").textContent = `${score}/${QUESTIONS.length}`;

  const pct = score / QUESTIONS.length;
  let msg = "";
  if (pct === 1) msg = "Demonstra um conhecimento excecional sobre apicultura e a vida das abelhas. Parabéns!";
  else if (pct >= 0.75) msg = "Excelente nível de conhecimento sobre o ecossistema apícola. Estás quase lá!";
  else if (pct >= 0.5) msg = "Um bom ponto de partida. Continua a explorar a nossa colmeia de sabedoria.";
  else msg = "Uma excelente oportunidade para descobrir mais sobre o fascinante mundo das abelhas na nossa plataforma.";
  document.getElementById("quiz-message").textContent = msg;

  // Animate circular progress meter
  const circle = document.getElementById("quiz-circular-progress");
  if (circle) {
    const circumference = 2 * Math.PI * 50; // Radius = 50, Circ = 314.159
    const offset = circumference - (pct * circumference);
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;
    // Force a browser reflow to play animation
    circle.getBoundingClientRect();
    circle.style.strokeDashoffset = offset;
  }

  // Update Tier badge
  const tierBadge = document.getElementById("quiz-tier-badge");
  if (tierBadge) {
    let tierText = "";
    let tierIcon = "";
    if (pct === 1) {
      tierText = "Rainha do Quiz";
      tierIcon = "fa-crown text-warning";
    } else if (pct >= 0.75) {
      tierText = "Mestre Apicultor";
      tierIcon = "fa-award text-warning";
    } else if (pct >= 0.5) {
      tierText = "Zangão Esforçado";
      tierIcon = "fa-graduation-cap text-secondary";
    } else {
      tierText = "Abelha Aprendiz";
      tierIcon = "fa-seedling text-success";
    }
    tierBadge.innerHTML = `<i class="fas ${tierIcon} me-2"></i>${tierText}`;
  }

  loadLeaderboard(score, QUESTIONS.length);
}

async function loadLeaderboard(score, maxScore) {
  const leaderboardDiv = document.getElementById("quiz-leaderboard");
  const loginPrompt = document.getElementById("quiz-login-prompt");
  if (!leaderboardDiv) return;

  const token = localStorage.getItem("token");
  const userRow = document.getElementById("lb-user-row");
  const rankingContainer = document.getElementById("lb-ranking-container");

  // Reset LB UI
  if (userRow) userRow.style.setProperty("display", "none", "important");
  if (rankingContainer) rankingContainer.innerHTML = '<div class="text-center py-3 text-muted small">A carregar classificação...</div>';
  loginPrompt.style.display = "none";

  function getScoreTier(score, maxScore) {
    if (!maxScore) return "Curioso do Mel";
    const pct = score / maxScore;
    if (pct >= 1.0) return "Mestre Apicultor";
    if (pct >= 0.75) return "Apicultor Experiente";
    if (pct >= 0.5) return "Zangão Esforçado";
    return "Abelha Aprendiz";
  }

  function renderLeaderboardList(globalBestList) {
    if (!rankingContainer) return;
    if (!globalBestList || globalBestList.length === 0) {
      rankingContainer.innerHTML = `<div class="text-center py-3 text-muted small">Nenhum registo de pontuação encontrado.</div>`;
      return;
    }

    rankingContainer.innerHTML = globalBestList.map((entry, index) => {
      const rank = index + 1;
      let rankBadge = "";
      
      if (rank === 1) {
        rankBadge = `<div class="rank-badge gold-rank"><i class="fas fa-crown text-warning"></i></div>`;
      } else if (rank === 2) {
        rankBadge = `<div class="rank-badge" style="background-color: #f3f4f6; color: #71717a;"><i class="fas fa-medal text-secondary"></i></div>`;
      } else if (rank === 3) {
        rankBadge = `<div class="rank-badge" style="background-color: #fdf2e9; color: #b45309;"><i class="fas fa-medal" style="color: #cd7f32;"></i></div>`;
      } else {
        rankBadge = `<div class="rank-badge user-rank"><span class="fw-bold small">${rank}</span></div>`;
      }

      const name = entry.Nome || entry.Username || "Anónimo";
      const tier = getScoreTier(entry.Score, entry.Max_Score);

      return `
        <div class="leaderboard-item d-flex justify-content-between align-items-center p-3 rounded-3 mb-1">
          <div class="d-flex align-items-center gap-3">
            ${rankBadge}
            <div>
              <span class="d-block fw-bold text-dark" style="font-size: 0.9rem;">${name}</span>
              <span class="d-block small text-muted" style="font-size: 0.7rem;">${tier}</span>
            </div>
          </div>
          <span class="fw-bold fs-5" style="color: var(--primary-green);">${entry.Score}/${entry.Max_Score}</span>
        </div>
      `;
    }).join("");
  }

  async function fetchAndRender() {
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    const lbRes = await fetch("/api/quiz/leaderboard", { headers });
    if (lbRes.ok) {
      const lbData = await lbRes.json();
      
      // Render user row
      if (lbData.userBest) {
        const userScoreEl = document.getElementById("lb-user-score");
        if (userScoreEl) userScoreEl.textContent = `${lbData.userBest.Score}/${lbData.userBest.Max_Score}`;
        
        const userNameEl = document.getElementById("lb-user-name");
        if (userNameEl) {
          const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
          const displayName = loggedUser.name || loggedUser.Nome || loggedUser.username || "Tu";
          userNameEl.textContent = displayName;
        }
        
        const userTierEl = document.getElementById("lb-user-tier");
        if (userTierEl) {
          const userTier = getScoreTier(lbData.userBest.Score, lbData.userBest.Max_Score);
          userTierEl.textContent = `${userTier} (O Teu Melhor)`;
        }
        
        if (userRow) userRow.style.setProperty("display", "flex", "important");
      }
      
      // Render top 5
      renderLeaderboardList(lbData.globalBestList);
    }
  }

  try {
    if (token && score !== undefined && score !== null && maxScore !== undefined && maxScore !== null) {
      // Post Score
      await fetch("/api/quiz/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ score, maxScore })
      });
    }
    
    if (!token) {
      loginPrompt.style.display = "block";
    }
    
    await fetchAndRender();
  } catch (e) {
    console.error("Error loading leaderboard data", e);
  }
}

// Keyboards shortcuts for quiz
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Check if quiz container is active
    const container = document.getElementById("quiz-container");
    if (!container || container.style.display === "none") return;

    // Keys 1, 2, 3, 4
    if (["1", "2", "3", "4"].includes(e.key)) {
      const index = parseInt(e.key) - 1;
      const options = document.querySelectorAll(".quiz-option");
      if (options[index] && !answered) {
        options[index].click();
      }
    }

    // Key Enter or Spacebar (to advance)
    if (e.key === "Enter" || e.key === " ") {
      const nextBtn = document.getElementById("quiz-next");
      if (nextBtn && nextBtn.style.display !== "none") {
        e.preventDefault(); // Prevent page scrolling down with space
        nextBtn.click();
      }
    }
  });
}

// Glossary Search & Filter Functionality
function initGlossary() {
  const searchInput = document.getElementById("glossary-search");
  const clearBtn = document.getElementById("glossary-search-clear");
  const filterBtns = document.querySelectorAll(".btn-filter");
  const glossaryItems = document.querySelectorAll(".glossary-item-col");
  const noResults = document.getElementById("glossary-no-results");
  
  let currentCategory = "all";
  let searchQuery = "";
  
  function filterGlossary() {
    let visibleCount = 0;
    
    glossaryItems.forEach(item => {
      const category = item.getAttribute("data-category");
      const title = item.querySelector("h5").textContent.toLowerCase();
      const desc = item.querySelector("p").textContent.toLowerCase();
      
      const matchesCategory = currentCategory === "all" || category === currentCategory;
      const matchesSearch = title.includes(searchQuery) || desc.includes(searchQuery);
      
      if (matchesCategory && matchesSearch) {
        item.classList.remove("is-hidden");
        visibleCount++;
      } else {
        item.classList.add("is-hidden");
      }
    });
    
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? "block" : "none";
    }
  }
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      if (clearBtn) {
        clearBtn.style.display = searchQuery.length > 0 ? "block" : "none";
      }
      filterGlossary();
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchQuery = "";
      clearBtn.style.display = "none";
      filterGlossary();
      searchInput.focus();
    });
  }
  
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-filter");
      filterGlossary();
    });
  });
}

async function initFactsAndGlossary() {
  const factsContainer = document.getElementById("reveal-cards-container");
  const glossaryContainer = document.getElementById("glossary-grid");

  const fallbackFacts = [
    { Titulo: "A Produção de uma Vida", Icon_Frente: "fas fa-spoon", Icon_Verso: "fas fa-hourglass-end", Conteudo_Verso: "Durante o seu ciclo natural, uma abelha obreira produz apenas <strong>uma fração de colher de chá</strong> de mel, evidenciando o valor de cada gota." },
    { Titulo: "Conservação Milenar", Icon_Frente: "fas fa-calendar-alt", Icon_Verso: "fas fa-infinity", Conteudo_Verso: "Pela sua baixa humidade e acidez natural, o mel puro é dos únicos alimentos que <strong>nunca se estraga</strong>, mantendo-se inalterado por séculos." },
    { Titulo: "A Dança das Abelhas", Icon_Frente: "fas fa-music", Icon_Verso: "fas fa-compass", Conteudo_Verso: "As abelhas comunicam a localização exata das flores através de uma <strong>coreografia complexa</strong>, um padrão de movimentos único na natureza." },
    { Titulo: "O Processo de Cristalização", Icon_Frente: "fas fa-snowflake", Icon_Verso: "fas fa-fire", Conteudo_Verso: "A cristalização atesta a <strong>pureza e qualidade</strong> do mel cru. Para o devolver ao estado líquido original, basta aquecê-lo suavemente." },
    { Titulo: "Engenharia Natural", Icon_Frente: "fas fa-cogs", Icon_Verso: "fas fa-tachometer-alt", Conteudo_Verso: "Equipadas com quatro asas, conseguem bater as asas até <strong>200 vezes por segundo</strong>, alcançando velocidades de voo surpreendentes." },
    { Titulo: "Propriedades Terapêuticas", Icon_Frente: "fas fa-mortar-pestle", Icon_Verso: "fas fa-spa", Conteudo_Verso: "O mel natural possui <strong>propriedades antibacterianas</strong> e antioxidantes notáveis, sendo utilizado há milénios como aliado do bem-estar." }
  ];

  const fallbackGlossary = [
    { Termo: "Néctar", Definicao: "Líquido açucarado produzido pelas flores que as abelhas recolhem e transformam em mel.", Icon: "fas fa-droplet", Categoria: "substance" },
    { Termo: "Própolis", Definicao: "Substância resinosa recolhida pelas abelhas, usada para desinfetar e selar a colmeia.", Icon: "fas fa-shield-alt", Categoria: "substance" },
    { Termo: "Geleia Real", Definicao: "Alimento exclusivo da rainha, rico em proteínas e vitaminas. Permite que ela viva até 5 anos.", Icon: "fas fa-crown", Categoria: "substance" },
    { Termo: "Polinização", Definicao: "Transferência de pólen entre flores, essencial para a reprodução das plantas e formação de frutos.", Icon: "fas fa-seedling", Categoria: "process" },
    { Termo: "Alvéolo", Definicao: "Célula hexagonal de cera onde as abelhas armazenam mel, pólen ou criam as larvas.", Icon: "fas fa-th", Categoria: "hive" },
    { Termo: "Fumigador", Definicao: "Ferramenta do apicultor que produz fumo para acalmar as abelhas durante a inspeção.", Icon: "fas fa-smog", Categoria: "equipment" }
  ];

  // Fetch Facts
  let facts = [];
  try {
    const res = await fetch("/api/aprender/factos");
    if (res.ok) {
      facts = await res.json();
    } else {
      throw new Error("HTTP error " + res.status);
    }
  } catch (e) {
    console.warn("Using fallback facts because API fetch failed:", e);
    facts = fallbackFacts;
  }

  if (factsContainer && facts && facts.length > 0) {
    factsContainer.innerHTML = facts.map((f, i) => `
      <div class="col-md-6 col-lg-4 scroll-reveal" style="transition-delay: ${0.1 * (i + 1)}s">
        <div class="reveal-card" onclick="this.classList.toggle('is-revealed')">
          <div class="reveal-card-inner">
            <div class="reveal-front">
              <div class="icon-wrapper mb-3"><i class="${f.Icon_Frente} fa-lg"></i></div>
              <h5>${f.Titulo}</h5>
              <span class="small text-muted mt-auto"><i class="fas fa-hand-pointer me-1"></i> Toca para revelar</span>
            </div>
            <div class="reveal-back">
              <i class="${f.Icon_Verso} mb-3"></i>
              <p>${f.Conteudo_Verso}</p>
            </div>
          </div>
        </div>
      </div>
    `).join("");
    
    // Re-trigger scroll-reveal observers
    if (window.obs) {
      document.querySelectorAll('#reveal-cards-container .scroll-reveal').forEach(el => window.obs.observe(el));
    } else {
      document.querySelectorAll('#reveal-cards-container .scroll-reveal').forEach(el => el.classList.add('is-visible'));
    }
  }

  // Fetch Glossary
  let glossary = [];
  try {
    const res = await fetch("/api/aprender/glossario");
    if (res.ok) {
      glossary = await res.json();
    } else {
      throw new Error("HTTP error " + res.status);
    }
  } catch (e) {
    console.warn("Using fallback glossary because API fetch failed:", e);
    glossary = fallbackGlossary;
  }

  if (glossaryContainer && glossary && glossary.length > 0) {
    glossaryContainer.innerHTML = glossary.map((g, i) => `
      <div class="col-md-6 col-lg-4 scroll-reveal glossary-item-col" data-category="${g.Categoria}" style="transition-delay: ${0.1 * (i + 1)}s">
        <div class="glossary-card">
          <div class="glossary-icon" style="background: ${getGlossaryGradient(g.Categoria)};"><i class="${g.Icon}"></i></div>
          <h5>${g.Termo}</h5>
          <p>${g.Definicao}</p>
        </div>
      </div>
    `).join("");
    
    // Re-trigger scroll-reveal observers
    if (window.obs) {
      document.querySelectorAll('#glossary-grid .scroll-reveal').forEach(el => window.obs.observe(el));
    } else {
      document.querySelectorAll('#glossary-grid .scroll-reveal').forEach(el => el.classList.add('is-visible'));
    }
    
    // Initialize glossary search/filters logic after DOM elements are created
    initGlossary();
  }
}

function getGlossaryGradient(category) {
  if (category === "substance") return "linear-gradient(135deg,#fbbf24,#f59e0b)";
  if (category === "hive") return "linear-gradient(135deg,#8b5cf6,#7c3aed)";
  if (category === "process") return "linear-gradient(135deg,#ec4899,#db2777)";
  if (category === "equipment") return "linear-gradient(135deg,#ef4444,#dc2626)";
  return "linear-gradient(135deg,#22c55e,#16a34a)";
}

document.addEventListener("DOMContentLoaded", () => {
  initQuiz();
  setupKeyboardShortcuts();
  initFactsAndGlossary();
  loadLeaderboard();
});
