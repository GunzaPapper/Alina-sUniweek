// progress.js
const $ = (sel, root = document) => root.querySelector(sel);

export function renderQuizProgress({ current, total }) {
  const hint = $("#quizHeaderHint");
  if (hint) {
    hint.textContent = total > 0 ? `${current}/${total}` : "—";
  }
}
