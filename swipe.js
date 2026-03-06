// swipe.js
export function initSwipe({ state, onPrev, onNext }) {
  let startX = 0;
  let startY = 0;

  document.addEventListener("touchstart", (e) => {
    const t = e.changedTouches?.[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (state?.screen !== "schedule") return;

    const t = e.changedTouches?.[0];
    if (!t) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) < 50) return;
    if (Math.abs(dy) > 60) return;

    if (dx < 0) onNext?.();
    else onPrev?.();
  }, { passive: true });
}
