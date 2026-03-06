// memory.js
import { MEMORY_SYMBOLS } from "./data.js";
import { showPraise } from "./praise.js";

const $ = (sel, root = document) => root.querySelector(sel);

let board = [];
let opened = [];
let locked = false;
let matched = 0;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBoard() {
  const symbols = MEMORY_SYMBOLS.slice(0, 6);
  const pairs = [...symbols, ...symbols];

  board = shuffle(pairs).map((symbol, idx) => ({
    id: idx,
    symbol,
    open: false,
    done: false,
  }));

  opened = [];
  locked = false;
  matched = 0;
}

function renderBoard() {
  const root = $("#memoryRoot");
  if (!root) return;

  const totalPairs = MEMORY_SYMBOLS.slice(0, 6).length;

  root.innerHTML = `
    <div class="card card--soft" style="margin-bottom:12px;">
      <div class="cardHint">Найди все пары</div>
      <div class="cardTitle" style="margin-top:6px;">Совпадений: ${matched} / ${totalPairs}</div>
    </div>

    <div class="gameGrid" id="memoryGrid">
      ${board.map((card) => `
        <button class="gameCard" type="button" data-id="${card.id}">
          <div class="gameCard__emoji" style="font-size:28px;">
            ${card.open || card.done ? card.symbol : "❔"}
          </div>
        </button>
      `).join("")}
    </div>
  `;

  root.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      openCard(id);
    });
  });
}

function openCard(id) {
  if (locked) return;

  const card = board.find((c) => c.id === id);
  if (!card || card.open || card.done) return;

  card.open = true;
  opened.push(card);
  renderBoard();

  if (opened.length < 2) return;

  locked = true;

  const [a, b] = opened;

  if (a.symbol === b.symbol) {
    a.done = true;
    b.done = true;
    a.open = true;
    b.open = true;

    opened = [];
    locked = false;
    matched++;
    renderBoard();

    if (matched === MEMORY_SYMBOLS.slice(0, 6).length) {
      setTimeout(() => {
        showPraise();
      }, 250);
    }
  } else {
    setTimeout(() => {
      a.open = false;
      b.open = false;
      opened = [];
      locked = false;
      renderBoard();
    }, 700);
  }
}

export function startMemory() {
  buildBoard();
  renderBoard();
}

export function initMemory() {
  $("#openMemoryBtn")?.addEventListener("click", () => {
    $("#memoryCard")?.classList.remove("hidden");
    $("#quizCard")?.classList.add("hidden");
    startMemory();
  });

  $("#memoryBackBtn")?.addEventListener("click", () => {
    $("#memoryCard")?.classList.add("hidden");
  });
}
