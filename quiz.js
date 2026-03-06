import { QUESTIONS_RAW } from "./data.js";
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

function getQuestions() {
  if (!Array.isArray(QUESTIONS_RAW)) return [];

  const safe = QUESTIONS_RAW.filter((q) => {
    return (
      q &&
      typeof q.q === "string" &&
      Array.isArray(q.opts) &&
      q.opts.length >= 2 &&
      typeof q.a === "number" &&
      q.a >= 0 &&
      q.a < q.opts.length
    );
  });

  return shuffle(safe).slice(0, 5);
}

function renderQuestion() {
  const root = $("#quizRoot");
  if (!root) return;

  if (!quizState.questions.length) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__title">Quiz пока недоступен 💗</div>
        <div class="empty__text">Не удалось загрузить вопросы.</div>
      </div>
    `;
    return;
  }

  if (quizState.index >= quizState.questions.length) {
    root.innerHTML = `
      <div class="card card--soft" style="margin-bottom:12px;">
        <div class="cardTitle">Quiz завершён 💗</div>
      </div>

      <div class="empty">
        <div class="empty__title">
          Правильных ответов: ${quizState.score} из ${quizState.questions.length}
        </div>
      </div>

      <button class="btn" id="quizRestartBtn" type="button">Играть ещё</button>
    `;

    $("#quizRestartBtn")?.addEventListener("click", startQuiz);

    if (quizState.score === quizState.questions.length) {
      setTimeout(() => showPraise(), 250);
    }

    return;
  }

  const q = quizState.questions[quizState.index];

  root.innerHTML = `
    <div class="card card--soft" style="margin-bottom:12px;">
      <div class="cardHint">
        Вопрос ${quizState.index + 1} / ${quizState.questions.length}
      </div>
      <div class="cardTitle" style="margin-top:6px;">
        ${q.q}
      </div>
    </div>

    <div class="gameGrid" style="grid-template-columns:1fr;">
      ${q.opts.map((opt, idx) => `
        <button class="gameCard" type="button" data-answer="${idx}">
          <div class="gameCard__title">${opt}</div>
        </button>
      `).join("")}
    </div>
  `;

  root.querySelectorAll("[data-answer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const picked = Number(btn.getAttribute("data-answer"));

      if (picked === q.a) {
        quizState.score++;
      }

      quizState.index++;
      renderQuestion();
    });
  });
}

function startQuiz() {
  quizState = {
    index: 0,
    score: 0,
    questions: getQuestions()
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
