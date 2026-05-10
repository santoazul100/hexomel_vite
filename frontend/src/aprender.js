// Aprender Page — Interactive Quiz
const QUESTIONS = [
  { q: "Quantas flores uma abelha visita para produzir 1 kg de mel?", opts: ["500 mil", "2 a 4 milhões", "100 mil", "10 milhões"], correct: 1, explain: "Para produzir 1 kg de mel, as abelhas visitam entre 2 a 4 milhões de flores!" },
  { q: "Quanto tempo vive uma abelha operária no verão?", opts: ["1 ano", "6 meses", "Cerca de 45 dias", "2 semanas"], correct: 2, explain: "Uma abelha operária vive cerca de 45 dias no verão, trabalhando incansavelmente." },
  { q: "Quantos ovos pode a abelha rainha pôr por dia?", opts: ["100", "500", "1.000", "Até 3.000"], correct: 3, explain: "A rainha pode pôr até 3.000 ovos por dia — quase um a cada 30 segundos!" },
  { q: "O mel puro tem prazo de validade?", opts: ["Sim, 2 anos", "Sim, 5 anos", "Não, nunca expira", "Depende da flor"], correct: 2, explain: "O mel puro nunca expira! Potes de mel com 3.000 anos foram encontrados intactos em tumbas egípcias." },
  { q: "Que percentagem das plantas com flor depende das abelhas para polinização?", opts: ["20%", "50%", "80%", "95%"], correct: 2, explain: "As abelhas são responsáveis pela polinização de cerca de 80% das plantas com flor." },
  { q: "Quem recebeu o Prémio Nobel pela descoberta da 'dança das abelhas'?", opts: ["Charles Darwin", "Karl von Frisch", "Albert Einstein", "Gregor Mendel"], correct: 1, explain: "Karl von Frisch recebeu o Nobel de Fisiologia/Medicina em 1973 pela descoberta da dança das abelhas." },
  { q: "O que indica a cristalização do mel?", opts: ["Mel estragado", "Mel com açúcar adicionado", "Pureza e qualidade", "Mel de fraca qualidade"], correct: 2, explain: "A cristalização é um processo natural e forte indicador de que o mel é puro e de qualidade." },
  { q: "Quantas asas tem uma abelha?", opts: ["2", "4", "6", "8"], correct: 1, explain: "As abelhas têm 4 asas que podem bater até 200 vezes por segundo!" },
];

let currentQ = 0;
let score = 0;
let answered = false;

function initQuiz() {
  const container = document.getElementById("quiz-container");
  if (!container) return;
  currentQ = 0;
  score = 0;
  answered = false;
  document.getElementById("quiz-result").style.display = "none";
  container.style.display = "block";
  renderQuestion();

  document.getElementById("quiz-next").addEventListener("click", () => {
    currentQ++;
    if (currentQ >= QUESTIONS.length) { showResult(); return; }
    answered = false;
    renderQuestion();
  });

  document.getElementById("quiz-restart").addEventListener("click", () => {
    initQuiz();
  });
}

function renderQuestion() {
  const q = QUESTIONS[currentQ];
  document.getElementById("quiz-question-num").textContent = `Pergunta ${currentQ + 1} de ${QUESTIONS.length}`;
  document.getElementById("quiz-question").textContent = q.q;
  document.getElementById("quiz-progress-bar").style.width = `${((currentQ + 1) / QUESTIONS.length) * 100}%`;
  document.getElementById("quiz-feedback").style.display = "none";
  document.getElementById("quiz-next").style.display = "none";

  const optsDiv = document.getElementById("quiz-options");
  optsDiv.innerHTML = "";
  q.opts.forEach((opt, i) => {
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
  const btns = document.querySelectorAll(".quiz-option");
  const feedback = document.getElementById("quiz-feedback");

  btns.forEach((btn, i) => {
    btn.classList.add("is-disabled");
    if (i === q.correct) btn.classList.add("is-correct");
    if (i === idx && i !== q.correct) btn.classList.add("is-wrong");
  });

  const isCorrect = idx === q.correct;
  if (isCorrect) score++;

  feedback.className = `quiz-feedback mt-3 ${isCorrect ? "is-correct" : "is-wrong"}`;
  feedback.innerHTML = `<strong>${isCorrect ? "✅ Correto!" : "❌ Errado!"}</strong> ${q.explain}`;
  feedback.style.display = "block";
  document.getElementById("quiz-next").style.display = "inline-flex";
  document.getElementById("quiz-next").textContent = currentQ === QUESTIONS.length - 1 ? "Ver Resultado" : "Próxima →";
}

function showResult() {
  document.getElementById("quiz-container").style.display = "none";
  const resultDiv = document.getElementById("quiz-result");
  resultDiv.style.display = "block";
  document.getElementById("quiz-score").textContent = `${score}/${QUESTIONS.length}`;

  let msg = "";
  const pct = score / QUESTIONS.length;
  if (pct === 1) msg = "Perfeito! És um verdadeiro especialista em abelhas! 🐝🏆";
  else if (pct >= 0.75) msg = "Excelente! Sabes muito sobre o mundo das abelhas! 🌟";
  else if (pct >= 0.5) msg = "Bom trabalho! Continua a aprender sobre as abelhas! 📚";
  else msg = "Podes melhorar! Visita as Curiosidades para aprender mais. 💪";
  document.getElementById("quiz-message").textContent = msg;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuiz, { once: true });
} else {
  initQuiz();
}
