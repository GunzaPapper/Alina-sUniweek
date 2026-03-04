// FILE: js/praise.js

/* ===============================
   Praise Overlay Controller
   - blocks UI
   - random sweet phrases
   - tiny confetti animation (CSS)
================================= */

const overlay = document.getElementById("praiseOverlay");
const titleEl = document.getElementById("praiseTitle");
const textEl = document.getElementById("praiseText");
const closeBtn = document.getElementById("praiseCloseBtn");
const confettiEl = document.getElementById("praiseConfetti");

let injected = false;
let isOpen = false;

const PHRASES = [
  "Ты невероятная 💗",
  "Умничка! Я горжусь тобой ✨",
  "Ты справилась — просто вау 🌸",
  "Какая ты сильная и умная 💕",
  "Это было красиво! ⭐",
  "Ты растёшь с каждым разом 💗",
  "Продолжай — у тебя отлично получается ✨",
];

function injectOnce() {
  if (injected) return;
  injected = true;

  const style = document.createElement("style");
  style.textContent = `
    .praiseBurst{
      position:absolute;
      width:10px;
      height:10px;
      border-radius:3px;
      opacity:.95;
      animation: praiseFall 900ms ease-out forwards;
      filter: saturate(1.1);
    }
    @keyframes praiseFall{
      0%{ transform: translate3d(var(--x,0px), 0px, 0) rotate(0deg); opacity: 0; }
      10%{ opacity: 1; }
      100%{ transform: translate3d(var(--x,0px), 120px, 0) rotate(260deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function randomPhrase() {
  return PHRASES[Math.floor(Math.random() * PHRASES.length)];
}

function burst() {
  // очищаем и создаём конфетти
  confettiEl.innerHTML = "";

  // 18 кусочков — достаточно красиво и не тяжело
  const n = 18;

  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "praiseBurst";

    // без "явно заданных цветов" через CSS тему — используем нежные оттенки через hsl
    const hue = rand(320, 360); // розовые/пастельные
    const sat = rand(55, 75);
    const light = rand(70, 85);
    d.style.background = `hsl(${hue} ${sat}% ${light}%)`;

    const x = rand(-120, 120);
    d.style.setProperty("--x", `${x}px`);

    d.style.left = `${rand(10, 90)}%`;
    d.style.top = `${rand(10, 45)}%`;

    d.style.animationDelay = `${rand(0, 140)}ms`;

    confettiEl.appendChild(d);
  }
}

/* ===============================
   Public API
================================= */

export function show(opts = {}) {
  if (!overlay) return;

  injectOnce();

  // if already open — update content
  isOpen = true;

  const title = (opts.title || "Умничка 💗").trim();
  const text = (opts.text || randomPhrase()).trim();

  titleEl.textContent = title;
  textEl.textContent = text;

  overlay.classList.remove("hidden");

  // lock scroll behind
  document.body.style.overflow = "hidden";

  // burst
  burst();

  // focus
  closeBtn?.focus();
}

export function hide() {
  if (!overlay) return;

  isOpen = false;
  overlay.classList.add("hidden");
  document.body.style.overflow = "";

  confettiEl.innerHTML = "";
}

export function getOpen() {
  return isOpen;
}

/* ===============================
   Events
================================= */

if (closeBtn) {
  closeBtn.addEventListener("click", () => hide());
}

if (overlay) {
  overlay.addEventListener("click", (e) => {
    // клик по фону закрывает, по карточке — нет
    const card = overlay.querySelector(".overlay__card");
    if (!card) return;

    if (!card.contains(e.target)) {
      hide();
    }
  });
}

window.addEventListener("keydown", (e) => {
  if (!isOpen) return;
  if (e.key === "Escape") hide();
});