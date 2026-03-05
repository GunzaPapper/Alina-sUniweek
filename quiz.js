// FILE: js/quiz.js

import * as storage from "./storage.js";
import * as progress from "./progress.js";
import * as achievements from "./achievements.js";
import * as praise from "./praise.js";
import { QUESTIONS_RAW } from "./data.js";

/* ===============================
   Question Bank
   { id, block, level, q, opts, a, exp }
   block: history | science | literature | geo | logic
   level: easy | medium | hard
   a: index of correct option
================================= */

// Запасной набор, если data.js отсутствует/пустой
const RAW_QUESTIONS = [
  // --- HISTORY 🏛️ ---
  {
    id: "h_e_1",
    block: "history",
    level: "easy",
    q: "В каком веке произошло Крещение Руси (988 год)?",
    opts: ["IX век", "X век", "XI век", "XII век"],
    a: 1,
    exp: "988 год относится к X веку.",
  },
  {
    id: "h_e_2",
    block: "history",
    level: "easy",
    q: "Кто был первым императором Римской империи?",
    opts: ["Юлий Цезарь", "Октавиан Август", "Нерон", "Траян"],
    a: 1,
    exp: "Октавиан Август считается первым римским императором.",
  },
  {
    id: "h_m_1",
    block: "history",
    level: "medium",
    q: "Как назывался период реформ в СССР 1980-х?",
    opts: ["НЭП", "Перестройка", "Оттепель", "Военный коммунизм"],
    a: 1,
    exp: "Перестройка — курс реформ в 1980-х.",
  },
  {
    id: "h_m_2",
    block: "history",
    level: "medium",
    q: "Какое событие принято считать началом Великой французской революции?",
    opts: ["Взятие Бастилии", "Коронация Наполеона", "Ватерлоо", "Версальский договор"],
    a: 0,
    exp: "14 июля 1789 — взятие Бастилии.",
  },
  {
    id: "h_h_1",
    block: "history",
    level: "hard",
    q: "Какой документ в Англии 1215 года ограничил власть короля?",
    opts: ["Билль о правах", "Великая хартия вольностей", "Декларация независимости", "Акт о супрематии"],
    a: 1,
    exp: "Magna Carta (1215) — Великая хартия вольностей.",
  },
  {
    id: "h_h_2",
    block: "history",
    level: "hard",
    q: "Какая война закончилась подписанием Вестфальского мира (1648)?",
    opts: ["Столетняя", "Тридцатилетняя", "Семилетняя", "Крымская"],
    a: 1,
    exp: "Вестфальский мир завершил Тридцатилетнюю войну.",
  },

  // --- SCIENCE 🧪 ---
  {
    id: "s_e_1",
    block: "science",
    level: "easy",
    q: "Какая планета ближе всего к Солнцу?",
    opts: ["Венера", "Марс", "Меркурий", "Земля"],
    a: 2,
    exp: "Меркурий — первая планета от Солнца.",
  },
  {
    id: "s_e_2",
    block: "science",
    level: "easy",
    q: "Какой газ необходим для дыхания человеку?",
    opts: ["Азот", "Кислород", "Углекислый газ", "Гелий"],
    a: 1,
    exp: "Кислород участвует в клеточном дыхании.",
  },
  {
    id: "s_m_1",
    block: "science",
    level: "medium",
    q: "Как называется единица измерения силы?",
    opts: ["Паскаль", "Ватт", "Ньютон", "Джоуль"],
    a: 2,
    exp: "Сила измеряется в Ньютонах (Н).",
  },
  {
    id: "s_m_2",
    block: "science",
    level: "medium",
    q: "Что такое pH?",
    opts: ["Показатель плотности", "Показатель кислотности", "Температура плавления", "Скорость реакции"],
    a: 1,
    exp: "pH — мера кислотности раствора.",
  },
  {
    id: "s_h_1",
    block: "science",
    level: "hard",
    q: "Какой закон описывает связь давления и объёма газа при постоянной температуре?",
    opts: ["Закон Ома", "Закон Бойля–Мариотта", "Закон Архимеда", "Закон Кулона"],
    a: 1,
    exp: "p·V = const при T=const — закон Бойля–Мариотта.",
  },
  {
    id: "s_h_2_fix",
    block: "science",
    level: "hard",
    q: "Какой слой атмосферы содержит озоновый слой?",
    opts: ["Тропосфера", "Стратосфера", "Мезосфера", "Термосфера"],
    a: 1,
    exp: "Основная концентрация озона — в стратосфере.",
  },
  // оригинал будет исключён, потому что есть *_fix:
  {
    id: "s_h_2",
    block: "science",
    level: "hard",
    q: "Где находится озоновый слой?",
    opts: ["В тропосфере", "В стратосфере", "В мезосфере", "В экзосфере"],
    a: 1,
    exp: "Озоновый слой — в стратосфере.",
  },

  // --- LITERATURE 📚 ---
  {
    id: "l_e_1",
    block: "literature",
    level: "easy",
    q: "Кто написал «Война и мир»?",
    opts: ["Ф. Достоевский", "Л. Толстой", "А. Чехов", "Н. Гоголь"],
    a: 1,
    exp: "Автор — Лев Николаевич Толстой.",
  },
  {
    id: "l_e_2",
    block: "literature",
    level: "easy",
    q: "Как называется жанр произведения «Сказка о рыбаке и рыбке»?",
    opts: ["Повесть", "Сказка", "Роман", "Басня"],
    a: 1,
    exp: "Это сказка в стихах.",
  },
  {
    id: "l_m_1",
    block: "literature",
    level: "medium",
    q: "Кто автор романа «Преступление и наказание»?",
    opts: ["Ф. Достоевский", "И. Тургенев", "М. Булгаков", "М. Лермонтов"],
    a: 0,
    exp: "Автор — Фёдор Михайлович Достоевский.",
  },
  {
    id: "l_m_2",
    block: "literature",
    level: "medium",
    q: "Что такое «эпитет»?",
    opts: ["Сравнение", "Определение с образностью", "Повтор", "Диалог"],
    a: 1,
    exp: "Эпитет — образное определение.",
  },
  {
    id: "l_h_1",
    block: "literature",
    level: "hard",
    q: "Как называется приём: «невыразимая грусть» (соединение несовместимого)?",
    opts: ["Оксюморон", "Гипербола", "Метонимия", "Аллитерация"],
    a: 0,
    exp: "Оксюморон — сочетание противоположных/несовместимых понятий.",
  },
  {
    id: "l_h_2",
    block: "literature",
    level: "hard",
    q: "К какому направлению чаще относят Франца Кафку?",
    opts: ["Классицизм", "Романтизм", "Модернизм", "Реализм"],
    a: 2,
    exp: "Кафку обычно связывают с модернизмом/экспрессионистской традицией.",
  },

  // --- GEO 🌍 ---
  {
    id: "g_e_1",
    block: "geo",
    level: "easy",
    q: "Самый большой океан на Земле?",
    opts: ["Индийский", "Тихий", "Атлантический", "Северный Ледовитый"],
    a: 1,
    exp: "Тихий океан — крупнейший по площади.",
  },
  {
    id: "g_e_2",
    block: "geo",
    level: "easy",
    q: "Столица Франции?",
    opts: ["Марсель", "Лион", "Париж", "Ницца"],
    a: 2,
    exp: "Столица Франции — Париж.",
  },
  {
    id: "g_m_1",
    block: "geo",
    level: "medium",
    q: "Какая река самая длинная в мире (по школьной версии в тестах)?",
    opts: ["Амазонка", "Нил", "Янцзы", "Миссисипи"],
    a: 1,
    exp: "В большинстве учебных тестов — Нил.",
  },
  {
    id: "g_m_2",
    block: "geo",
    level: "medium",
    q: "Какой материк самый сухой?",
    opts: ["Африка", "Австралия", "Антарктида", "Южная Америка"],
    a: 2,
    exp: "Антарктида — самый сухой материк (полярная пустыня).",
  },
  {
    id: "g_h_1",
    block: "geo",
    level: "hard",
    q: "Как называется линия смены календарных дат?",
    opts: ["Экватор", "Тропик Рака", "Меридиан Гринвича", "Линия перемены дат"],
    a: 3,
    exp: "Она называется линией перемены дат.",
  },
  {
    id: "g_h_2",
    block: "geo",
    level: "hard",
    q: "Самая высокая горная система мира?",
    opts: ["Альпы", "Кордильеры", "Гималаи", "Урал"],
    a: 2,
    exp: "Гималаи включают Эверест и самые высокие вершины.",
  },

  // --- LOGIC 🧠 ---
  {
    id: "lo_e_1",
    block: "logic",
    level: "easy",
    q: "Какое число лишнее: 2, 4, 6, 9, 8?",
    opts: ["2", "4", "6", "9"],
    a: 3,
    exp: "9 — нечётное, остальные чётные.",
  },
  {
    id: "lo_e_2",
    block: "logic",
    level: "easy",
    q: "Продолжи ряд: 1, 1, 2, 3, 5, …",
    opts: ["7", "8", "9", "10"],
    a: 1,
    exp: "Последовательность Фибоначчи: 3+5=8.",
  },
  {
    id: "lo_m_1",
    block: "logic",
    level: "medium",
    q: "Если все А — В, и все В — С, то верно ли что все А — С?",
    opts: ["Да", "Нет", "Только иногда", "Недостаточно данных"],
    a: 0,
    exp: "Транзитивность: A⊆B и B⊆C ⇒ A⊆C.",
  },
  {
    id: "lo_m_2",
    block: "logic",
    level: "medium",
    q: "Сколько сторон у пятиугольника?",
    opts: ["4", "5", "6", "7"],
    a: 1,
    exp: "Пятиугольник — 5 сторон.",
  },
  {
    id: "lo_h_1",
    block: "logic",
    level: "hard",
    q: "Найди следующее: 2, 6, 12, 20, …",
    opts: ["28", "30", "32", "36"],
    a: 0,
    exp: "Разности: +4, +6, +8 → дальше +10 → 30? Стоп: 20+10=30. Но ряд также n(n+1): 1·2=2,2·3=6,3·4=12,4·5=20,5·6=30.",
  },
  {
    id: "lo_h_1_fix",
    block: "logic",
    level: "hard",
    q: "Найди следующее: 2, 6, 12, 20, …",
    opts: ["28", "30", "32", "36"],
    a: 1,
    exp: "Это n(n+1): 1·2=2, 2·3=6, 3·4=12, 4·5=20 → 5·6=30.",
  },
  {
    id: "lo_h_2",
    block: "logic",
    level: "hard",
    q: "Сколько различных пар можно составить из 5 элементов?",
    opts: ["5", "8", "10", "20"],
    a: 2,
    exp: "C(5,2)=5·4/2=10.",
  },
];

// Основной банк вопросов берём из data.js (QUESTIONS_RAW)
// Формат: { id, block, level, q, opts, a, exp }
const QUESTIONS = (Array.isArray(QUESTIONS_RAW) && QUESTIONS_RAW.length)
  ? QUESTIONS_RAW
  : RAW_QUESTIONS;

/* ===============================
   Fix-rule: если есть *_fix, оригинал исключается
================================= */

function buildQuestionBank() {
  const byId = new Map();
  const hasFix = new Set();

  for (const q of QUESTIONS) {
    if (q.id.endsWith("_fix")) {
      hasFix.add(q.id.slice(0, -4));
    }
  }

  for (const q of QUESTIONS) {
    const baseId = q.id.endsWith("_fix") ? q.id.slice(0, -4) : q.id;
    if (hasFix.has(baseId) && !q.id.endsWith("_fix")) {
      continue; // исключаем оригинал
    }
    // если есть fix, сохраняем под baseId как единственную версию
    byId.set(baseId, { ...q, id: baseId });
  }

  return Array.from(byId.values());
}

const QUESTION_BANK = buildQuestionBank();

/* ===============================
   Blocks / Labels
================================= */

const BLOCKS = [
  { id: "history", label: "История 🏛️" },
  { id: "science", label: "Наука 🧪" },
  { id: "literature", label: "Литература 📚" },
  { id: "geo", label: "География 🌍" },
  { id: "logic", label: "Логика 🧠" },
];

const LEVELS = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

/* ===============================
   Local anti-repeat keys
================================= */

const SEEN_KEY = "quiz.seen"; // { "<block>|<level>": [id,id,...] }
const STREAK_KEY = "quiz.streak"; // number

function getSeenMap() {
  return storage.get(SEEN_KEY, {});
}

function addSeen(block, level, id) {
  const key = `${block}|${level}`;
  const seen = getSeenMap();
  const arr = Array.isArray(seen[key]) ? seen[key] : [];
  const next = arr.filter((x) => x !== id);
  next.push(id);
  // держим хвост (последние 80 вопросов)
  seen[key] = next.slice(-80);
  storage.set(SEEN_KEY, seen);
}

function pickQuestions(block, level, count = 10) {
  const pool = QUESTION_BANK.filter((q) => q.block === block && q.level === level);
  if (!pool.length) return [];

  const key = `${block}|${level}`;
  const seen = getSeenMap();
  const seenArr = Array.isArray(seen[key]) ? seen[key] : [];
  const seenSet = new Set(seenArr);

  // сначала неиспользованные
  const fresh = pool.filter((q) => !seenSet.has(q.id));
  const fallback = pool.slice();

  const chosen = [];
  const source = fresh.length >= count ? fresh : fresh.concat(fallback);

  // простой shuffle
  const arr = source.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  for (const q of arr) {
    if (chosen.length >= count) break;
    // не повторять в рамках одной сессии
    if (chosen.some((x) => x.id === q.id)) continue;
    chosen.push(q);
  }

  return chosen;
}

/* ===============================
   UI helpers
================================= */

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function btn(text, className = "btn") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = text;
  return b;
}

function percent(n, d) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function starsFromPct(p) {
  if (p >= 90) return 3;
  if (p >= 70) return 2;
  if (p >= 50) return 1;
  return 0;
}

/* ===============================
   Public API
================================= */

let rootEl = null;

export function start(rootId) {
  rootEl = document.getElementById(rootId);
  if (!rootEl) return;
  renderTopics();
}

/* ===============================
   Screens
================================= */

function renderTopics() {
  rootEl.innerHTML = "";

  const top = el("div", "cardHint", "Выбери тему ✨");
  rootEl.appendChild(top);

  const grid = el("div", "gameGrid");
  grid.style.gridTemplateColumns = "1fr 1fr";

  for (const b of BLOCKS) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gameCard";
    card.innerHTML = `
      <div class="gameCard__title">${b.label}</div>
      <div class="gameCard__sub">уровни: easy / medium / hard</div>
    `;
    card.onclick = () => renderLevels(b.id);
    grid.appendChild(card);
  }

  rootEl.appendChild(grid);
}

function renderLevels(block) {
  rootEl.innerHTML = "";

  const head = el("div", "cardHeader");
  const back = btn("← Темы", "chipBtn");
  const title = el("div", "cardTitle", BLOCKS.find((x) => x.id === block)?.label || "Тема");
  const hint = el("div", "cardHint", "Выбери уровень");

  back.onclick = () => renderTopics();
  head.appendChild(back);
  head.appendChild(title);
  head.appendChild(hint);
  rootEl.appendChild(head);

  const list = el("div", "");
  list.style.display = "grid";
  list.style.gap = "10px";

  for (const lv of LEVELS) {
    const p = progress.getQuizProgress?.(block, lv.id) || { correct: 0, total: 0, bestStreak: 0 };
    const pct = p.total ? percent(p.correct, p.total) : 0;

    const row = document.createElement("button");
    row.type = "button";
    row.className = "noteRow";
    row.innerHTML = `
      <div class="noteRow__top">
        <div class="noteRow__title">${lv.label}</div>
        <div class="noteRow__date">${pct}%</div>
      </div>
      <div class="noteRow__preview">Правильных: ${p.correct}/${p.total || 0} • Лучший стрик: ${p.bestStreak || 0}</div>
    `;
    row.onclick = () => startRun(block, lv.id);

    list.appendChild(row);
  }

  rootEl.appendChild(list);
}

function startRun(block, level) {
  const questions = pickQuestions(block, level, 10);

  if (questions.length === 0) {
    rootEl.innerHTML = "";
    rootEl.appendChild(el("div", "cardHint", "Пока нет вопросов для этого уровня 💗"));
    const b = btn("Назад", "btn btn--secondary");
    b.onclick = () => renderLevels(block);
    rootEl.appendChild(b);
    return;
  }

  const run = {
    block,
    level,
    questions,
    idx: 0,
    correct: 0,
    answers: [], // {id, ok}
  };

  renderQuestion(run);
}

function renderQuestion(run) {
  const q = run.questions[run.idx];
  rootEl.innerHTML = "";

  const head = el("div", "cardHeader");

  const back = btn("← Уровни", "chipBtn");
  back.onclick = () => renderLevels(run.block);

  const title = el(
    "div",
    "cardTitle",
    `${BLOCKS.find((x) => x.id === run.block)?.label || ""} • ${run.level.toUpperCase()}`
  );

  const hint = el("div", "cardHint", `${run.idx + 1}/${run.questions.length}`);
  head.appendChild(back);
  head.appendChild(title);
  head.appendChild(hint);

  rootEl.appendChild(head);

  const qBox = document.createElement("div");
  qBox.className = "wishBox";
  qBox.style.fontWeight = "800";
  qBox.textContent = q.q;
  rootEl.appendChild(qBox);

  const opts = el("div", "");
  opts.style.display = "grid";
  opts.style.gap = "10px";
  opts.style.marginTop = "10px";

  let locked = false;

  q.opts.forEach((text, idx) => {
    const b = btn(text, "btn btn--secondary");
    b.style.textAlign = "left";

    b.onclick = () => {
      if (locked) return;
      locked = true;

      const ok = idx === q.a;

      // streak
      let streak = storage.get(STREAK_KEY, 0);
      if (ok) streak += 1;
      else streak = 0;
      storage.set(STREAK_KEY, streak);

      // achievements hooks
      if (ok) achievements.unlock?.("quiz_first_correct");
      if (streak >= 10) achievements.unlock?.("quiz_10_streak");

      // record progress
      try {
        progress.recordQuizAnswer?.(run.block, run.level, ok, streak);
      } catch {
        // ignore
      }

      // seen (anti-repeat)
      addSeen(run.block, run.level, q.id);

      // ui feedback
      b.classList.remove("btn--secondary");
      b.classList.add(ok ? "btn" : "btn--danger");

      // explanation card
      const expCard = document.createElement("div");
      expCard.className = "card card--soft fadeIn";
      expCard.style.marginTop = "10px";
      expCard.innerHTML = `
        <div class="cardTitle">${ok ? "Верно 💗" : "Почти!"}</div>
        <div class="cardHint" style="text-align:left;margin-top:6px;color:rgba(42,31,37,.80);font-weight:750;">
          ${escapeHtml(q.exp || "")}
        </div>
      `;

      const nextBtn = btn(run.idx === run.questions.length - 1 ? "Результат" : "Дальше", "btn");
      nextBtn.style.marginTop = "10px";
      nextBtn.onclick = () => {
        if (ok) run.correct += 1;
        run.answers.push({ id: q.id, ok });

        run.idx += 1;

        if (run.idx >= run.questions.length) {
          renderResult(run);
        } else {
          renderQuestion(run);
        }
      };

      rootEl.appendChild(expCard);
      rootEl.appendChild(nextBtn);
    };

    opts.appendChild(b);
  });

  rootEl.appendChild(opts);
}

function renderResult(run) {
  rootEl.innerHTML = "";

  const total = run.questions.length;
  const correct = run.correct;
  const pct = percent(correct, total);
  const stars = starsFromPct(pct);

  // тема пройдена (условно: >=70%)
  if (pct >= 70) achievements.unlock?.(`quiz_theme_${run.block}`);

  const card = document.createElement("div");
  card.className = "card fadeIn";
  card.innerHTML = `
    <div class="cardHeader">
      <div class="cardTitle">Результат</div>
      <div class="cardHint">${BLOCKS.find((x)=>x.id===run.block)?.label || ""} • ${run.level.toUpperCase()}</div>
    </div>

    <div class="wishBox" style="font-size:14px;">
      <div style="font-weight:900;font-size:18px;margin-bottom:6px;">${correct}/${total}</div>
      <div style="font-weight:800;color:rgba(42,31,37,.80);">Процент: <b>${pct}%</b></div>
      <div style="margin-top:8px;font-size:20px;">
        ${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}
      </div>
    </div>
  `;

  const actions = document.createElement("div");
  actions.style.display = "grid";
  actions.style.gridTemplateColumns = "1fr 1fr";
  actions.style.gap = "10px";
  actions.style.marginTop = "12px";

  const retry = btn("Повторить", "btn");
  retry.onclick = () => startRun(run.block, run.level);

  const back = btn("Назад к темам", "btn btn--secondary");
  back.onclick = () => renderTopics();

  actions.appendChild(retry);
  actions.appendChild(back);

  rootEl.appendChild(card);
  rootEl.appendChild(actions);

  // Praise overlay after result (blocks UI)
  setTimeout(() => {
    try {
      praise.show({
        title: stars >= 2 ? "Умничка 💗" : "Хороший прогресс ✨",
        text:
          stars === 3
            ? "Ты просто звезда! Ещё чуть-чуть — и идеал 🌸"
            : stars === 2
              ? "Очень круто! Ты реально растёшь 💕"
              : stars === 1
                ? "Неплохо! Давай ещё раз — получится лучше 💗"
                : "Ничего страшного — попробуем снова, я рядом ✨",
      });
    } catch {
      // ignore
    }
  }, 200);
}

/* ===============================
   Utils
================================= */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}