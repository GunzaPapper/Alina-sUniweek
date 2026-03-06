import { QUESTIONS_RAW } from "./data.js";
import { showPraise } from "./praise.js";

const $ = (sel, root = document) => root.querySelector(sel);

let quizState = {
  index: 0,
  score: 0,
  questions: [],
  block: "mixed",
  level: "mixed",
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getSafeQuestions() {
  if (!Array.isArray(QUESTIONS_RAW)) return [];

  const seen = new Set();

  return QUESTIONS_RAW.filter((q) => {
    const ok =
      q &&
      typeof q.q === "string" &&
      Array.isArray(q.opts) &&
      q.opts.length >= 2 &&
      typeof q.a === "number" &&
      q.a >= 0 &&
      q.a < q.opts.length;

    if (!ok) return false;

    const key = JSON.stringify({
      q: q.q,
      opts: q.opts,
      a: q.a,
      block: q.block || "",
      level: q.level || "",
    });

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickQuestions() {
  let list = getSafeQuestions();

  if (quizState.block !== "mixed") {
    list = list.filter((q) => (q.block || "mixed") === quizState.block);
  }

  if (quizState.level !== "mixed") {
    list = list.filter((q) => (q.level || "mixed") === quizState.level);
  }

  return shuffle(list).slice(0, 5);
}

function renderStartScreen() {
  const root = $("#quizRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="card card--soft" style="margin-bottom:12px;">
      <div class="cardTitle">Quiz 💗</div>
      <div class="cardHint" style="margin-top:6px;">Выбери тему и сложность</div>
    </div>

    <div class="row" style="margin-bottom:12px;">
      <select class="input" id="quizBlockSelect">
        <option value="mixed">Все темы</option>
        <option value="history">История</option>
        <option value="science">Наука</option>
        <option value="literature">Литература</option>
        <option value="geo">География</option>
        <option value="logic">Логика</option>
      </select>

      <select class="input" id="quizLevelSelect">
        <option value="mixed">Любая сложность</option>
        <option value="easy">Лёгкий</option>
        <option value="medium">Средний</option>
        <option value="hard">Сложный</option>
      </select>
    </div>

    <button class="btn" id="quizStartBtn" type="button">Начать</button>
  `;

  $("#quizStartBtn")?.addEventListener("click", () => {
    quizState.block = $("#quizBlockSelect")?.value || "mixed";
    quizState.level = $("#quizLevelSelect")?.value || "mixed";
    startQuizRound();
  });
}

function renderQuestion() {
  const root = $("#quizRoot");
  if (!root) return;

  if (!quizState.questions.length) {
    root.innerHTML = `
      <div class="empty">
        <div class="empty__title">Нет вопросов по этому фильтру 💗</div>
        <div class="empty__text">Выбери другую тему или сложность.</div>
      </div>

      <button class="btn" id="quizBackToMenuBtn" type="button" style="margin-top:12px;">
        Назад
      </button>
    `;

    $("#quizBackToMenuBtn")?.addEventListener("click", renderStartScreen);
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
        <div class="empty__text">Очень достойно ✨</div>
      </div>

      <div class="row" style="margin-top:12px;">
        <button class="btn" id="quizRestartBtn" type="button">Играть ещё</button>
        <button class="btn btn--secondary" id="quizMenuBtn" type="button">В меню</button>
      </div>
    `;

    $("#quizRestartBtn")?.addEventListener("click", startQuizRound);
    $("#quizMenuBtn")?.addEventListener("click", renderStartScreen);

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
      <div class="cardHint" style="margin-top:4px;">
        ${(q.block || "mixed")} • ${(q.level || "mixed")}
      </div>
      <div class="cardTitle" style="margin-top:8px;">
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

function startQuizRound() {
  quizState.index = 0;
  quizState.score = 0;
  quizState.questions = pickQuestions();
  renderQuestion();
}

export function initQuiz() {
  $("#openQuizBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.remove("hidden");
    $("#memoryCard")?.classList.add("hidden");
    renderStartScreen();
  });

  $("#quizBackBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.add("hidden");
  });
}
