// FILE: js/memory.js

import * as achievements from "./achievements.js";
import * as praise from "./praise.js";

/* ===============================
   Themes
================================= */

const THEMES = {
  hearts: ["💗","💖","💘","💝","💕","💞"],
  sweets: ["🍬","🍭","🍫","🧁","🍪","🍩"],
  emoji: ["🌸","⭐","🌙","☀️","🌈","✨"]
};

function randomTheme() {
  const keys = Object.keys(THEMES);
  return keys[Math.floor(Math.random() * keys.length)];
}

/* ===============================
   Helpers
================================= */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/* ===============================
   Game State
================================= */

let root;
let cards = [];
let opened = [];
let locked = false;

/* ===============================
   Start
================================= */

export function start(rootId) {
  root = document.getElementById(rootId);
  if (!root) return;

  const theme = randomTheme();
  const base = THEMES[theme];

  const deck = shuffle([...base, ...base]);

  cards = deck.map((v, i) => ({
    id: i,
    value: v,
    matched: false
  }));

  opened = [];
  locked = false;

  render();
}

/* ===============================
   Render
================================= */

function render() {
  root.innerHTML = "";

  const grid = el("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(4,1fr)";
  grid.style.gap = "10px";

  cards.forEach(card => {
    const c = el("div","memoryCard");
    c.dataset.id = card.id;

    const inner = el("div","memoryInner");

    const front = el("div","memoryFront");
    front.textContent = "❓";

    const back = el("div","memoryBack");
    back.textContent = card.value;

    inner.appendChild(front);
    inner.appendChild(back);
    c.appendChild(inner);

    if (card.matched) c.classList.add("memoryMatched");

    c.onclick = () => flip(card);

    grid.appendChild(c);
  });

  root.appendChild(grid);

  injectStyles();
}

/* ===============================
   Flip Logic
================================= */

function flip(card) {
  if (locked) return;
  if (opened.includes(card)) return;
  if (card.matched) return;

  const elCard = root.querySelector(`[data-id="${card.id}"]`);
  elCard.classList.add("memoryOpen");

  opened.push(card);

  if (opened.length < 2) return;

  locked = true;

  const [a,b] = opened;

  if (a.value === b.value) {
    a.matched = true;
    b.matched = true;

    opened = [];
    locked = false;

    checkWin();
  } else {
    setTimeout(() => {
      const elA = root.querySelector(`[data-id="${a.id}"]`);
      const elB = root.querySelector(`[data-id="${b.id}"]`);

      elA.classList.remove("memoryOpen");
      elB.classList.remove("memoryOpen");

      opened = [];
      locked = false;

    }, 700);
  }
}

/* ===============================
   Win Check
================================= */

function checkWin() {
  const win = cards.every(c => c.matched);

  if (!win) return;

  achievements.unlock?.("memory_first_win");

  setTimeout(() => {
    praise.show({
      title: "Ты справилась 💗",
      text: "Все пары найдены — отличная память!"
    });
  }, 300);
}

/* ===============================
   Styles
================================= */

let injected = false;

function injectStyles() {

  if (injected) return;
  injected = true;

  const style = document.createElement("style");

  style.textContent = `

  .memoryCard{
    perspective:800px;
    height:80px;
    cursor:pointer;
  }

  .memoryInner{
    position:relative;
    width:100%;
    height:100%;
    transition: transform .4s;
    transform-style:preserve-3d;
  }

  .memoryCard.memoryOpen .memoryInner{
    transform: rotateY(180deg);
  }

  .memoryFront,
  .memoryBack{
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:28px;
    border-radius:14px;
    backface-visibility:hidden;
    border:1px solid rgba(247,168,198,.3);
    background:white;
  }

  .memoryBack{
    transform: rotateY(180deg);
  }

  .memoryMatched{
    opacity:.6;
  }

  `;

  document.head.appendChild(style);
}