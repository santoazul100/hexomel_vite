// Aprender Page — Interactive Quiz
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
  document.getElementById("quiz-progress-bar").style.width = `${((currentQ + 1) / QUESTIONS.length) * 100}%`;
  document.getElementById("quiz-feedback").style.display = "none";
  document.getElementById("quiz-next").style.display = "none";

  const optsDiv = document.getElementById("quiz-options");
  optsDiv.innerHTML = "";
  const opts = [q.Opcao1, q.Opcao2, q.Opcao3, q.Opcao4];
  opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
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

  btns.forEach((btn, i) => {
    btn.classList.add("is-disabled");
    if (i === correctIdx) {
      btn.classList.add("is-correct");
      btn.innerHTML += ' <i class="fas fa-check float-end mt-1"></i>';
    }
    if (i === idx && i !== correctIdx) {
      btn.classList.add("is-wrong");
      btn.innerHTML += ' <i class="fas fa-times float-end mt-1"></i>';
    }
  });

  const isCorrect = idx === correctIdx;
  if (isCorrect) score++;

  feedback.className = `quiz-feedback mt-4 ${isCorrect ? "is-correct" : "is-wrong"}`;
  
  const iconHtml = isCorrect ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-info-circle"></i>';
  const prefix = isCorrect ? "Resposta Exata." : "Curiosidade:";
  
  feedback.innerHTML = `${iconHtml}<div><strong style="display:block;margin-bottom:0.25rem;">${prefix}</strong>${q.Explicacao}</div>`;
  feedback.style.display = "flex";
  
  document.getElementById("quiz-next").style.display = "inline-flex";
  document.getElementById("quiz-next").innerHTML = currentQ === QUESTIONS.length - 1 ? 'Ver Resultado' : 'Próxima <i class="fas fa-arrow-right ms-2"></i>';
}

async function showResult() {
  document.getElementById("quiz-container").style.display = "none";
  const resultDiv = document.getElementById("quiz-result");
  resultDiv.style.display = "block";
  document.getElementById("quiz-score").textContent = `${score}/${QUESTIONS.length}`;

  let msg = "";
  const pct = score / QUESTIONS.length;
  if (pct === 1) msg = "Demonstra um conhecimento excecional sobre apicultura e a vida das abelhas.";
  else if (pct >= 0.75) msg = "Excelente nível de conhecimento sobre o ecossistema apícola.";
  else if (pct >= 0.5) msg = "Um bom ponto de partida. Continue a explorar o nosso glossário.";
  else msg = "Uma excelente oportunidade para descobrir mais sobre o fascinante mundo das abelhas na nossa plataforma.";
  document.getElementById("quiz-message").textContent = msg;

  // Leaderboard Logic
  const leaderboardDiv = document.getElementById("quiz-leaderboard");
  const loginPrompt = document.getElementById("quiz-login-prompt");
  const token = localStorage.getItem("token");

  // Reset LB UI
  document.getElementById("lb-user-score").textContent = "--";
  document.getElementById("lb-global-score").textContent = "--";
  document.getElementById("lb-global-user").textContent = "--";
  leaderboardDiv.style.display = "none";
  loginPrompt.style.display = "none";

  if (token) {
    try {
      // Post Score
      await fetch("/api/quiz/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ score, maxScore: QUESTIONS.length })
      });
      
      // Get LB
      const lbRes = await fetch("/api/quiz/leaderboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        if (lbData.userBest) {
          document.getElementById("lb-user-score").textContent = `${lbData.userBest.Score}/${lbData.userBest.Max_Score}`;
        }
        if (lbData.globalBest) {
          const name = lbData.globalBest.Username || lbData.globalBest.Nome || "Anónimo";
          document.getElementById("lb-global-score").textContent = `${lbData.globalBest.Score}/${lbData.globalBest.Max_Score}`;
          document.getElementById("lb-global-user").textContent = `por ${name}`;
        }
        leaderboardDiv.style.display = "block";
      }
    } catch (e) {
      console.error("Error saving score or fetching LB", e);
    }
  } else {
    // Show login prompt if not logged in
    loginPrompt.style.display = "block";
    
    // Attempt to just fetch global best without auth
    try {
      const lbRes = await fetch("/api/quiz/leaderboard");
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        if (lbData.globalBest) {
          const name = lbData.globalBest.Username || lbData.globalBest.Nome || "Anónimo";
          document.getElementById("lb-global-score").textContent = `${lbData.globalBest.Score}/${lbData.globalBest.Max_Score}`;
          document.getElementById("lb-global-user").textContent = `por ${name}`;
          leaderboardDiv.style.display = "block";
        }
      }
    } catch (e) {}
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initQuiz();
});
