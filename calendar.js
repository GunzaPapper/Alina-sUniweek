// FILE: js/calendar.js

function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampToMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderHeader(root, viewDate, onPrev, onNext) {
  const head = el("div", "calHead");

  const left = el("button", "iconBtn", "Л");
  left.type = "button";
  left.setAttribute("aria-label", "ѕредыдущий мес€ц");
  left.onclick = onPrev;

  const title = el(
    "div",
    "calTitle",
    viewDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  );

  const right = el("button", "iconBtn", "Ы");
  right.type = "button";
  right.setAttribute("aria-label", "—ледующий мес€ц");
  right.onclick = onNext;

  head.appendChild(left);
  head.appendChild(title);
  head.appendChild(right);

  root.appendChild(head);
}

function renderWeekdays(root) {
  const row = el("div", "calWeekdays");
  const names = ["ѕн", "¬т", "—р", "„т", "ѕт", "—б", "¬с"];
  names.forEach((n) => row.appendChild(el("div", "calWDay", n)));
  root.appendChild(row);
}

function getMondayBasedIndex(jsDay) {
  // JS: Sun=0..Sat=6 -> Monday based 0..6
  return (jsDay + 6) % 7;
}

function renderGrid(root, viewDate, selectedDate, onPick) {
  const grid = el("div", "calGrid");

  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);

  const firstIndex = getMondayBasedIndex(start.getDay());

  // start date shown in grid
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() - firstIndex);

  const today = clampToMidnight(new Date());
  const selected = clampToMidnight(selectedDate);

  // 6 rows * 7 days
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(cursor);

    const btn = el("button", "calDay");
    btn.type = "button";

    const inMonth =
      cellDate.getMonth() === viewDate.getMonth() &&
      cellDate.getFullYear() === viewDate.getFullYear();

    if (!inMonth) btn.classList.add("calDay--muted");
    if (sameDay(cellDate, today)) btn.classList.add("calDay--today");
    if (sameDay(cellDate, selected)) btn.classList.add("calDay--active");

    btn.textContent = String(cellDate.getDate());

    btn.onclick = () => {
      onPick(clampToMidnight(cellDate));
    };

    grid.appendChild(btn);

    cursor.setDate(cursor.getDate() + 1);
  }

  root.appendChild(grid);
}

export function render(root, selectedDate, onPick) {
  root.innerHTML = "";

  let viewDate = new Date(selectedDate);

  const rerender = () => {
    root.innerHTML = "";
    renderHeader(
      root,
      viewDate,
      () => {
        viewDate = new Date(viewDate);
        viewDate.setMonth(viewDate.getMonth() - 1);
        rerender();
      },
      () => {
        viewDate = new Date(viewDate);
        viewDate.setMonth(viewDate.getMonth() + 1);
        rerender();
      }
    );

    renderWeekdays(root);

    renderGrid(root, viewDate, selectedDate, (d) => {
      selectedDate = d;
      onPick(d);
    });

    injectCalendarStylesOnce();
  };

  rerender();
}

/* ===============================
   Calendar CSS injection (локально, без новых файлов)
   „тобы не плодить лишние стили в styles.css
================================= */

let injected = false;

function injectCalendarStylesOnce() {
  if (injected) return;
  injected = true;

  const style = document.createElement("style");
  style.textContent = `
    .calHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:10px;
    }
    .calTitle{
      font-weight:900;
      text-transform:capitalize;
    }
    .calWeekdays{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap:6px;
      margin-bottom:8px;
    }
    .calWDay{
      text-align:center;
      font-size:12px;
      color: rgba(42,31,37,.65);
      font-weight:800;
      padding:6px 0;
    }
    .calGrid{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap:6px;
      padding-bottom:6px;
    }
    .calDay{
      border:1px solid rgba(247,168,198,.25);
      background: rgba(255,255,255,.78);
      border-radius: 14px;
      padding: 10px 0;
      font-weight: 900;
      cursor:pointer;
      -webkit-tap-highlight-color: transparent;
      transition: transform 120ms ease, opacity 120ms ease, background 120ms ease, border-color 120ms ease;
    }
    .calDay:active{ transform: scale(.98); opacity:.92; }
    .calDay--muted{
      opacity: .45;
    }
    .calDay--today{
      border-color: rgba(247,168,198,.70);
      box-shadow: 0 10px 18px rgba(42,31,37,.08);
      position: relative;
    }
    .calDay--today::after{
      content:"Х";
      position:absolute;
      bottom:4px;
      left:50%;
      transform: translateX(-50%);
      color: var(--pink);
      font-size: 18px;
      line-height: 0;
    }
    .calDay--active{
      background: linear-gradient(180deg, rgba(247,168,198,.35), rgba(255,255,255,.90));
      border-color: rgba(247,168,198,.60);
    }
  `;
  document.head.appendChild(style);
}