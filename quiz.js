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

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];

  return raw.filter((q) => {
    return (
      q &&
      typeof q.question === "string" &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      typeof q.answer === "number" &&
      q.answer >= 0 &&
      q.answer < q.options.length
    );
  });
}

function renderQuestion() {
  const root = $("#quizRoot");
  if (!root) return;

  if (!Array.isArray(quizState.questions) || quizState.questions.length === 0) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__title">Quiz пока недоступен 💗</div>
        <div class="empty__text">Не удалось загрузить вопросы. Проверь data.js.</div>
      </div>
    `;
    return;
  }

  if (quizState.index >= quizState.questions.length) {
    root.innerHTML = `
      <div class="card card--soft" style="margin-bottom:12px;">
        <div class="cardHint">Готово ✨</div>
        <div class="cardTitle" style="margin-top:6px;">Quiz завершён</div>
      </div>

      <div class="empty">
        <div class="empty__title">Правильных ответов: ${quizState.score} из ${quizState.questions.length}</div>
        <div class="empty__text">Очень достойно 💗</div>
      </div>

      <button class="btn" id="quizRestartBtn" type="button" style="margin-top:12px;">Играть ещё</button>
    `;

    $("#quizRestartBtn")?.addEventListener("click", startQuiz);

    if (quizState.score === quizState.questions.length) {
      setTimeout(() => showPraise(), 250);
    }

    return;
  }

  const q = quizState.questions[quizState.index];

  if (!q || !Array.isArray(q.options)) {
    quizState.index++;
    renderQuestion();
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

  root.querySelectorAll("[data-answer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const picked = Number(btn.getAttribute("data-answer"));
      if (picked === q.answer) {
        quizState.score++;
      }
      quizState.index++;
      renderQuestion();
    });
  });
}

export function startQuiz() {
  const safeQuestions = normalizeQuestions(QUIZ_QUESTIONS);

  quizState = {
    index: 0,
    score: 0,
    questions: shuffle(safeQuestions).slice(0, 5)
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
