// calendar.js (SECONDARY, safe)
// Рендер календаря в модальном окне <dialog id="calendarModal"> внутри #calendarRoot
// Использование из app.js:
//   openCalendar({ state, onPickDate: (date)=>{...} })

const $ = (sel, root = document) => root.querySelector(sel);

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function addMonths(date, delta) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  // восстановим число (с clamp)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

function getMonthTitle(d) {
  const s = d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildMonthGrid(viewDate) {
  // Неделя начинается с понедельника
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstDowMon0 = (first.getDay() + 6) % 7; // Mon=0..Sun=6
  const start = new Date(first);
  start.setDate(first.getDate() - firstDowMon0);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function ensureStylesOnce() {
  // Мини-стили для календаря (чтобы не требовать правки styles.css прямо сейчас)
  if (document.getElementById("uwCalendarInlineStyle")) return;

  const style = document.createElement("style");
  style.id = "uwCalendarInlineStyle";
  style.textContent = `
    .uwCalHead{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding: 2px 2px 10px;
    }
    .uwCalTitle{
      font-weight: 900;
      text-align:center;
      flex:1;
    }
    .uwCalNav{
      width:40px; height:40px;
      border-radius: 999px;
      border: 1px solid rgba(247,168,198,.30);
      background: rgba(255,255,255,.75);
      box-shadow: 0 10px 18px rgba(42,31,37,.08);
      display:grid; place-items:center;
      cursor:pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .uwCalNav:active{ transform: scale(.97); opacity:.92; }

    .uwCalDows{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      margin-bottom: 8px;
      padding: 0 2px;
      color: rgba(42,31,37,.65);
      font-weight: 900;
      font-size: 12px;
      text-align:center;
      letter-spacing: .2px;
    }

    .uwCalGrid{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      padding: 0 2px 2px;
    }

    .uwCalCell{
      border-radius: 14px;
      border: 1px solid rgba(247,168,198,.22);
      background: rgba(255,255,255,.78);
      box-shadow: 0 10px 18px rgba(42,31,37,.06);
      height: 42px;
      display:grid;
      place-items:center;
      cursor:pointer;
      user-select:none;
      -webkit-tap-highlight-color: transparent;
      font-weight: 900;
    }
    .uwCalCell:active{ transform: scale(.98); opacity:.92; }

    .uwCalCell--muted{
      opacity:.45;
    }
    .uwCalCell--today{
      border-color: rgba(247,168,198,.55);
      box-shadow: 0 12px 22px rgba(42,31,37,.08);
    }
    .uwCalCell--selected{
      background: linear-gradient(180deg, rgba(247,168,198,.40), rgba(255,255,255,.88));
      border-color: rgba(247,168,198,.55);
    }
  `;
  document.head.appendChild(style);
}

let viewMonth = null; // Date (любая дата внутри текущего отображаемого месяца)

function renderCalendar(root, selectedDate, onPickDate) {
  if (!root) return;

  ensureStylesOnce();

  const sel = selectedDate ? startOfDay(selectedDate) : startOfDay(new Date());
  const today = startOfDay(new Date());

  if (!viewMonth) viewMonth = new Date(sel);
  // держим viewMonth на 1 числе месяца
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);

  const title = getMonthTitle(viewMonth);
  const days = buildMonthGrid(viewMonth);

  const dows = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];

  root.innerHTML = `
    <div class="uwCalHead">
      <button class="uwCalNav" type="button" id="uwCalPrev" aria-label="Предыдущий месяц">‹</button>
      <div class="uwCalTitle" id="uwCalTitle">${esc(title)}</div>
      <button class="uwCalNav" type="button" id="uwCalNext" aria-label="Следующий месяц">›</button>
    </div>

    <div class="uwCalDows">
      ${dows.map(x => `<div>${esc(x)}</div>`).join("")}
    </div>

    <div class="uwCalGrid" id="uwCalGrid">
      ${days.map(d => {
        const inMonth = d.getMonth() === viewMonth.getMonth();
        const cls = [
          "uwCalCell",
          inMonth ? "" : "uwCalCell--muted",
          isSameDay(d, today) ? "uwCalCell--today" : "",
          isSameDay(d, sel) ? "uwCalCell--selected" : "",
        ].filter(Boolean).join(" ");

        return `
          <button
            class="${cls}"
            type="button"
            data-iso="${esc(d.toISOString())}"
            aria-label="${esc(d.toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" }))}"
          >${esc(d.getDate())}</button>
        `;
      }).join("")}
    </div>
  `;

  // events
  root.querySelector("#uwCalPrev")?.addEventListener("click", () => {
    viewMonth = addMonths(viewMonth, -1);
    renderCalendar(root, sel, onPickDate);
  });

  root.querySelector("#uwCalNext")?.addEventListener("click", () => {
    viewMonth = addMonths(viewMonth, +1);
    renderCalendar(root, sel, onPickDate);
  });

  root.querySelectorAll(".uwCalCell").forEach(btn => {
    btn.addEventListener("click", () => {
      const iso = btn.getAttribute("data-iso");
      if (!iso) return;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;

      // отдаём выбранную дату наружу
      if (typeof onPickDate === "function") {
        onPickDate(startOfDay(d));
      }
    });
  });
}

/**
 * Главная точка входа для app.js
 * openCalendar({ state, onPickDate })
 */
export function openCalendar({ state, onPickDate } = {}) {
  const root = document.getElementById("calendarRoot");
  if (!root) return;

  // если state есть — берём его выбранную дату
  const selectedDate = state?.selectedDate ? new Date(state.selectedDate) : new Date();

  // при открытии календаря делаем viewMonth = выбранному месяцу
  viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  renderCalendar(root, selectedDate, onPickDate);
}
