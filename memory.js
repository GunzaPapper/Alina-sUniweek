// quiz.js
import { QUIZ_QUESTIONS } from "./data.js";
import { showPraise } from "./praise.js";

const $ = (sel, root = document) => root.querySelector(sel);

let quizState = {
  index: 0,
  score: 0,
  questions: []
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuestion() {
  const root = $("#quizRoot");
  if (!root) return;

  const q = quizState.questions[quizState.index];
  if (!q) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__title">Quiz завершён 💗</div>
        <div class="empty__text">Правильных ответов: ${quizState.score} из ${quizState.questions.length}</div>
      </div>
      <button class="btn" id="quizRestartBtn" type="button">Играть ещё</button>
    `;

    $("#quizRestartBtn")?.addEventListener("click", startQuiz);
    if (quizState.score === quizState.questions.length) showPraise();
    return;
  }

  root.innerHTML = `
    <div class="card card--soft" style="margin-bottom:12px;">
      <div class="cardHint">Вопрос ${quizState.index + 1} / ${quizState.questions.length}</div>
      <div class="cardTitle" style="margin-top:6px;">${q.question}</div>
    </div>

    <div class="gameGrid" id="quizOptions" style="grid-template-columns:1fr;">
      ${q.options.map((opt, idx) => `
        <button class="gameCard" type="button" data-answer="${idx}">
          <div class="gameCard__title">${opt}</div>
        </button>
      `).join("")}
    </div>
  `;

  root.querySelectorAll("[data-answer]").forEach(btn => {
    btn.addEventListener("click", () => {
      const picked = Number(btn.getAttribute("data-answer"));
      if (picked === q.answer) quizState.score++;
      quizState.index++;
      renderQuestion();
    });
  });
}

export function startQuiz() {
  quizState = {
    index: 0,
    score: 0,
    questions: shuffle(QUIZ_QUESTIONS).slice(0, 5)
  };
  renderQuestion();
}

export function initQuiz() {
  $("#openQuizBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.remove("hidden");
    $("#memoryCard")?.classList.add("hidden");
    startQuiz();
  });

  $("#quizBackBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.add("hidden");
  });
}
