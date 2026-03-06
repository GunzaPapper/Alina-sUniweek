const $ = (sel, root = document) => root.querySelector(sel);

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthTitle(date) {
  const s = date.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getMonthGrid(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function ensureCalendarStyles() {
  if (document.getElementById("uniweekCalendarStyles")) return;

  const style = document.createElement("style");
  style.id = "uniweekCalendarStyles";
  style.textContent = `
    .uniCal{
      display:grid;
      gap:12px;
    }

    .uniCal__top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .uniCal__title{
      font-size:18px;
      font-weight:950;
      text-align:center;
      flex:1;
    }

    .uniCal__nav{
      width:42px;
      height:42px;
      border-radius:50%;
      border:1px solid rgba(247,168,198,.18);
      background: rgba(255,255,255,.96);
      box-shadow: 0 8px 18px rgba(36,26,31,.08);
      cursor:pointer;
      font-weight:900;
      font-size:18px;
      touch-action: manipulation;
    }

    .uniCal__weekdays{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap:8px;
    }

    .uniCal__weekday{
      text-align:center;
      font-size:12px;
      font-weight:900;
      color: rgba(36,26,31,.58);
      padding:4px 0;
    }

    .uniCal__grid{
      display:grid;
      grid-template-columns: repeat(7, 1fr);
      gap:8px;
    }

    .uniCal__day{
      aspect-ratio:1/1;
      border-radius:16px;
      border:1px solid rgba(247,168,198,.16);
      background: rgba(255,255,255,.96);
      box-shadow: 0 8px 18px rgba(36,26,31,.06);
      cursor:pointer;
      font-weight:900;
      font-size:14px;
      transition: transform .14s ease, opacity .14s ease, border-color .18s ease, background .18s ease;
      touch-action: manipulation;
      position:relative;
    }

    .uniCal__day:active{
      transform: scale(.97);
    }

    .uniCal__day--muted{
      opacity:.42;
    }

    .uniCal__day--today{
      border-color: rgba(247,168,198,.45);
    }

    .uniCal__day--today::after{
      content:"";
      position:absolute;
      left:50%;
      bottom:6px;
      transform:translateX(-50%);
      width:5px;
      height:5px;
      border-radius:50%;
      background: rgba(247,168,198,.95);
    }

    .uniCal__day--selected{
      background: rgba(252,227,238,.65);
      border-color: rgba(247,168,198,.42);
      box-shadow: 0 10px 20px rgba(247,168,198,.14);
    }

    .uniCal__bottom{
      display:flex;
      justify-content:space-between;
      gap:10px;
      margin-top:4px;
    }

    .uniCal__action{
      flex:1;
      border:1px solid rgba(247,168,198,.18);
      background: rgba(255,255,255,.96);
      border-radius:16px;
      padding:11px 12px;
      font-weight:900;
      cursor:pointer;
      touch-action: manipulation;
    }
  `;
  document.head.appendChild(style);
}

function renderCalendar(root, viewDate, selectedDate, onPickDate, setViewDate) {
  if (!root) return;

  ensureCalendarStyles();

  const today = startOfDay(new Date());
  const selected = startOfDay(selectedDate || new Date());
  const grid = getMonthGrid(viewDate);

  const weekdays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

  root.innerHTML = `
    <div class="uniCal">
[06.03.2026 14:19] Прога: <div class="uniCal__top">
        <button class="uniCal__nav" id="uniCalPrev" type="button">‹</button>
        <div class="uniCal__title">${monthTitle(viewDate)}</div>
        <button class="uniCal__nav" id="uniCalNext" type="button">›</button>
      </div>

      <div class="uniCal__weekdays">
        ${weekdays.map((d) => `<div class="uniCal__weekday">${d}</div>`).join("")}
      </div>

      <div class="uniCal__grid">
        ${grid.map((day) => {
          const isMuted = day.getMonth() !== viewDate.getMonth();
          const isToday = sameDay(day, today);
          const isSelected = sameDay(day, selected);

          return `
            <button
              class="uniCal__day ${isMuted ? "uniCal__day--muted" : ""} ${isToday ? "uniCal__day--today" : ""} ${isSelected ? "uniCal__day--selected" : ""}"
              type="button"
              data-date="${day.toISOString()}"
            >
              ${day.getDate()}
            </button>
          `;
        }).join("")}
      </div>

      <div class="uniCal__bottom">
        <button class="uniCal__action" id="uniCalToday" type="button">Сегодня</button>
      </div>
    </div>
  `;

  $("#uniCalPrev", root)?.addEventListener("click", () => {
    setViewDate(addMonths(viewDate, -1));
  });

  $("#uniCalNext", root)?.addEventListener("click", () => {
    setViewDate(addMonths(viewDate, 1));
  });

  $("#uniCalToday", root)?.addEventListener("click", () => {
    const d = new Date();
    onPickDate?.(startOfDay(d));
  });

  root.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const iso = btn.getAttribute("data-date");
      if (!iso) return;
      onPickDate?.(startOfDay(new Date(iso)));
    });
  });
}

export function openCalendar({ state, onPickDate } = {}) {
  const root = $("#calendarRoot");
  if (!root) return;

  let viewDate = startOfDay(state?.selectedDate || new Date());

  const rerender = () => {
    renderCalendar(
      root,
      viewDate,
      state?.selectedDate || new Date(),
      onPickDate,
      (newDate) => {
        viewDate = newDate;
        rerender();
      }
    );
  };

  rerender();
}

