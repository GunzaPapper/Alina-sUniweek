// FILE: calendar.js
// UniWeek — Calendar modal (dialog) + month grid + date select

const $ = (sel, root = document) => root.querySelector(sel);

function esc(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function pad2(n) { return String(n).padStart(2, "0"); }

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

function addMonths(d, inc) {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + inc);
  // восстановим день (если в новом месяце меньше дней — clamp)
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, lastDay));
  return x;
}

function monthTitle(d) {
  const s = d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getMondayIndex(jsDay) {
  // JS: Sun=0..Sat=6 -> Mon=0..Sun=6
  return (jsDay + 6) % 7;
}

function lockBodyScroll(lock) {
  // простая блокировка прокрутки под модалкой (iOS friendly)
  if (lock) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  } else {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  }
}

function ensureCalendarCSS() {
  // Добавим минимальные стили календаря, чтобы он выглядел красиво
  // (не ломая твой общий styles.css)
  if (document.getElementById("uniweek-calendar-inline-css")) return;

  const css = `
  .calHead{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    margin-bottom:10px;
  }
  .calTitle{
    font-weight:900;
    letter-spacing:.2px;
    text-align:center;
    flex:1;
    font-size:14px;
  }
  .calNavBtn{
    width:38px; height:38px;
    border-radius:999px;
    border:1px solid rgba(247,168,198,.28);
    background: rgba(255,255,255,.85);
    cursor:pointer;
    display:grid; place-items:center;
    -webkit-tap-highlight-color: transparent;
  }
  .calNavBtn:active{ transform: scale(.97); opacity:.92; }
  .calGrid{
    display:grid;
    grid-template-columns: repeat(7, 1fr);
    gap:8px;
    user-select:none;
  }
  .calDow{
    font-size:11px;
    font-weight:800;
    color: rgba(42,31,37,.65);
    text-align:center;
    padding:4px 0;
  }
  .calCell{
    border-radius:14px;
    border:1px solid rgba(247,168,198,.18);
    background: rgba(255,255,255,.75);
    box-shadow: 0 8px 16px rgba(42,31,37,.06);
    height:42px;
    display:grid;
    place-items:center;
    cursor:pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 120ms ease, opacity 120ms ease, border-color 120ms ease, background 120ms ease;
  }
  .calCell:active{ transform: scale(.98); opacity:.92; }
  .calCell--muted{
    opacity:.55;
  }
  .calCell--today{
    border-color: rgba(247,168,198,.55);
    background: rgba(252,227,238,.55);
  }
  .calCell--selected{
    border-color: rgba(247,168,198,.75);
    background: linear-gradient(180deg, rgba(247,168,198,.40), rgba(255,255,255,.88));
  }
  .calCell__num{
    font-weight:900;
    font-size:13px;
  }
  `;
  const style = document.createElement("style");
  style.id = "uniweek-calendar-inline-css";
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * initCalendar
 * @param {Object} cfg
 * @param {HTMLDialogElement} cfg.modalEl          #calendarModal
 * @param {HTMLElement} cfg.rootEl                #calendarRoot (контент календаря)
 * @param {HTMLElement} cfg.openBtn               #calendarOpenBtn
 * @param {HTMLElement} cfg.closeBtn              #calendarCloseBtn
 * @param {() => Date} cfg.getSelectedDate        вернуть текущую выбранную дату из state
 * @param {(date: Date) => void} cfg.onSelectDate установить выбранную дату в state и перерендерить
 */
export function initCalendar(cfg) {
  ensureCalendarCSS();

  const modal = cfg?.modalEl || $("#calendarModal");
  const root = cfg?.rootEl || $("#calendarRoot");
  const openBtn = cfg?.openBtn || $("#calendarOpenBtn");
  const closeBtn = cfg?.closeBtn || $("#calendarCloseBtn");
  const getSelectedDate = cfg?.getSelectedDate || (() => new Date());
  const onSelectDate = cfg?.onSelectDate || (() => {});

  if (!modal || !root || !openBtn || !closeBtn) {
    console.warn("calendar.js: missing elements");
    return { open:()=>{}, close:()=>{}, render:()=>{} };
  }

  let viewMonth = startOfDay(getSelectedDate());
  viewMonth.setDate(1);

  function render() {
    const selected = startOfDay(getSelectedDate());
    const today = startOfDay(new Date());

    // месяц
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const firstDow = getMondayIndex(first.getDay()); // 0..6
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

    // предыдущий месяц (для заполнения сетки)
    const prevMonthDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 0).getDate();

    const dows = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

    const cells = [];

    // "хвост" предыдущего месяца
    for (let i = 0; i < firstDow; i++) {
      const num = prevMonthDays - firstDow + 1 + i;
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, num);
      cells.push({ date:d, muted:true, num });
    }

    // текущий месяц
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      cells.push({ date:d, muted:false, num:day });
    }

    // добиваем до ровных недель (42 ячейки = 6 строк)
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date:d, muted:true, num:d.getDate() });
    }

    root.innerHTML = `
      <div class="calHead">
        <button class="calNavBtn" type="button" data-cal="prev" aria-label="Предыдущий месяц">‹</button>
        <div class="calTitle">${esc(monthTitle(viewMonth))}</div>
        <button class="calNavBtn" type="button" data-cal="next" aria-label="Следующий месяц">›</button>
      </div>

      <div class="calGrid" aria-label="Календарь">
        ${dows.map(x => `<div class="calDow">${esc(x)}</div>`).join("")}

        ${cells.map(c => {
          const isToday = isSameDay(c.date, today);
          const isSel = isSameDay(c.date, selected);
          const cls = [
            "calCell",
            c.muted ? "calCell--muted" : "",
            isToday ? "calCell--today" : "",
            isSel ? "calCell--selected" : "",
          ].filter(Boolean).join(" ");

          const y = c.date.getFullYear();
          const m = pad2(c.date.getMonth() + 1);
          const dd = pad2(c.date.getDate());
          const key = `${y}-${m}-${dd}`;

          return `
            <button class="${esc(cls)}" type="button" data-cal-date="${esc(key)}" aria-label="${esc(key)}">
              <div class="calCell__num">${esc(String(c.num))}</div>
            </button>
          `;
        }).join("")}
      </div>
    `;

    // nav
    root.querySelector('[data-cal="prev"]')?.addEventListener("click", () => {
      viewMonth = addMonths(viewMonth, -1);
      viewMonth.setDate(1);
      render();
    });

    root.querySelector('[data-cal="next"]')?.addEventListener("click", () => {
      viewMonth = addMonths(viewMonth, +1);
      viewMonth.setDate(1);
      render();
    });

    // select date
    root.querySelectorAll("[data-cal-date]")?.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-cal-date");
        if (!key) return;
        const d = new Date(key + "T00:00:00");
        if (Number.isNaN(d.getTime())) return;

        onSelectDate(d);
        close(); // выбираем дату — закрываем
      });
    });
  }

  function open() {
    // синхронизируем месяц с выбранной датой
    const sd = startOfDay(getSelectedDate());
    viewMonth = new Date(sd.getFullYear(), sd.getMonth(), 1);

    render();

    // dialog.showModal может быть недоступен в некоторых окружениях
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
      modal.style.display = "block";
    }
    lockBodyScroll(true);
  }

  function close() {
    if (typeof modal.close === "function") {
      modal.close();
    } else {
      modal.removeAttribute("open");
      modal.style.display = "";
    }
    lockBodyScroll(false);
  }

  // events
  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  // click on backdrop to close (dialog only)
  modal.addEventListener("click", (e) => {
    // если кликнули по самому dialog (не по содержимому) — закрываем
    if (e.target === modal) close();
  });

  // ESC
  modal.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  return { open, close, render };
}
