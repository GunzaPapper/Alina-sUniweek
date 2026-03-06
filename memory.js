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

function getSymbols() {
  if (Array.isArray(MEMORY_SYMBOLS) && MEMORY_SYMBOLS.length >= 6) {
    return MEMORY_SYMBOLS.slice(0, 6);
  }
  return ["💗", "🌸", "✨", "🎀", "🫶", "💞"];
}

function buildBoard() {
  const pairs = [...getSymbols(), ...getSymbols()];

  board = shuffle(pairs).map((symbol, idx) => ({
    id: idx,
    symbol,
    open: false,
    done: false
  }));

  opened = [];
  locked = false;
  matched = 0;
}

function renderBoard() {
  const root = $("#memoryRoot");
  if (!root) return;

  const totalPairs = board.length / 2;

  const cardsHtml = board.map((item) => {
    const isOpen = item.open || item.done;

    return `
      <button
        class="memoryTile ${isOpen ? "memoryTile--open" : ""} ${item.done ? "memoryTile--done" : ""}"
        type="button"
        data-id="${item.id}"
        aria-label="Карточка memory"
      >
        <span class="memoryTile__inner">${isOpen ? item.symbol : "?"}</span>
      </button>
    `;
  }).join("");

  root.innerHTML = `
    <div class="memoryHero">
      <div class="memoryHero__title">Memory 💗</div>
      <div class="memoryHero__text">Совпадений: ${matched} / ${totalPairs}</div>
    </div>

    <div class="memoryGrid">
      ${cardsHtml}
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

  const item = board.find((x) => x.id === id);
  if (!item || item.open || item.done) return;

  item.open = true;
  opened.push(item);
  renderBoard();

  if (opened.length < 2) return;

  locked = true;

  const [a, b] = opened;

  if (a.symbol === b.symbol) {
    a.done = true;
    b.done = true;
    matched++;
    opened = [];
    locked = false;
    renderBoard();

    if (matched === board.length / 2) {
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
    }, 650);
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
