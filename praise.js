// praise.js
import { PRAISES } from "./data.js";

const $ = (sel, root = document) => root.querySelector(sel);

function randomPraise() {
  return PRAISES[Math.floor(Math.random() * PRAISES.length)];
}

export function showPraise() {
  const overlay = $("#praiseOverlay");
  const title = $("#praiseTitle");
  const text = $("#praiseText");

  if (!overlay || !title || !text) return;

  const praise = randomPraise();
  title.textContent = praise.title;
  text.textContent = praise.text;

  overlay.classList.remove("hidden");
}

export function hidePraise() {
  const overlay = $("#praiseOverlay");
  overlay?.classList.add("hidden");
}

export function initPraise() {
  $("#praiseCloseBtn")?.addEventListener("click", hidePraise);
}
