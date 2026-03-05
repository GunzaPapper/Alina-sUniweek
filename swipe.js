// FILE: js/swipe.js

export function init(element, callbacks = {}) {
  if (!element) return;

  let startX = 0;
  let startY = 0;

  let deltaX = 0;
  let deltaY = 0;

  let tracking = false;

  const threshold = 50; // минимальный свайп
  const restraint = 100; // максимум по вертикали

  function onStart(x, y) {
    startX = x;
    startY = y;
    deltaX = 0;
    deltaY = 0;
    tracking = true;
  }

  function onMove(x, y) {
    if (!tracking) return;

    deltaX = x - startX;
    deltaY = y - startY;
  }

  function onEnd() {
    if (!tracking) return;

    tracking = false;

    if (Math.abs(deltaX) >= threshold && Math.abs(deltaY) <= restraint) {
      if (deltaX < 0) {
        if (callbacks.left) callbacks.left();
      } else {
        if (callbacks.right) callbacks.right();
      }
    }
  }

  /* ===============================
     Touch Events
  =============================== */

  element.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      onStart(t.clientX, t.clientY);
    },
    { passive: true }
  );

  element.addEventListener(
    "touchmove",
    (e) => {
      const t = e.changedTouches[0];
      onMove(t.clientX, t.clientY);
    },
    { passive: true }
  );

  element.addEventListener("touchend", () => {
    onEnd();
  });

  /* ===============================
     Mouse Events (для desktop)
  =============================== */

  element.addEventListener("mousedown", (e) => {
    onStart(e.clientX, e.clientY);
  });

  element.addEventListener("mousemove", (e) => {
    if (!tracking) return;
    onMove(e.clientX, e.clientY);
  });

  element.addEventListener("mouseup", () => {
    onEnd();
  });

  element.addEventListener("mouseleave", () => {
    tracking = false;
  });
}