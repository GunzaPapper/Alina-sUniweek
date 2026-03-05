// app.js (CORE)
// Основа: вкладки + верхняя панель/дни + импорт CSV + рендер расписания
// Никакие второстепенные модули не требуются, чтобы приложение работало.
import { openCalendar } from "./calendar.js";
import { initNotes, openNotes } from "./notes.js";
import { renderSchedule } from "./schedule.js";
import { importScheduleFromCsv } from "./csvParser.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const LS = {
  SCHEDULE: "uniweek_schedule_v1",
  SUBJECT_COLORS: "uniweek_subject_colors_v1",
  MANUAL_WEEK: "uniweek_manual_week_v1",
  AUTO_WEEK: "uniweek_auto_week_v1",
  ANCHOR_DATE: "uniweek_anchor_date_v1",
};

const state = {
  screen: "schedule",
  selectedDate: new Date(),
  schedule: [],
  subjectColors: {},
  manualWeek: "odd",
  autoWeek: true,
  anchorDate: "",
};

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function loadAll() {
  const sch = safeJsonParse(localStorage.getItem(LS.SCHEDULE), []);
  state.schedule = Array.isArray(sch) ? sch : [];

  const colors = safeJsonParse(localStorage.getItem(LS.SUBJECT_COLORS), {});
  state.subjectColors = (colors && typeof colors === "object") ? colors : {};

  state.manualWeek = localStorage.getItem(LS.MANUAL_WEEK) || "odd";
  state.autoWeek = (localStorage.getItem(LS.AUTO_WEEK) ?? "1") === "1";
  state.anchorDate = localStorage.getItem(LS.ANCHOR_DATE) || "";
}

function saveSchedule() {
  localStorage.setItem(LS.SCHEDULE, JSON.stringify(state.schedule));
}
function saveColors() {
  localStorage.setItem(LS.SUBJECT_COLORS, JSON.stringify(state.subjectColors));
}
function saveSettings() {
  localStorage.setItem(LS.MANUAL_WEEK, state.manualWeek);
  localStorage.setItem(LS.AUTO_WEEK, state.autoWeek ? "1" : "0");
  localStorage.setItem(LS.ANCHOR_DATE, state.anchorDate);
}

/* ---------------------------
  Anti zoom (pinch + ctrl wheel)
--------------------------- */
function disablePinchZoom() {
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });

  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}

/* ---------------------------
  Week type
--------------------------- */
function getWeekType(date) {
  if (!state.autoWeek) return state.manualWeek;

  const a = (state.anchorDate || "").trim();
  if (!a) return state.manualWeek;

  const anchor = new Date(a + "T00:00:00");
  if (Number.isNaN(anchor.getTime())) return state.manualWeek;

  const monday = (d) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
    x.setHours(0,0,0,0);
    x.setDate(x.getDate() - day);
    return x;
  };

  const w0 = monday(anchor).getTime();
  const w1 = monday(date).getTime();
  const diffWeeks = Math.round((w1 - w0) / (7 * 24 * 3600 * 1000));
  return (diffWeeks % 2 === 0) ? "odd" : "even";
}

/* ---------------------------
  UI
--------------------------- */
function setScreen(name) {
  state.screen = name;
  renderTabs();
  renderTopVisibility();
  if (state.screen === "settings") renderSettings();
  if (state.screen === "schedule") renderAllScheduleBits();
}

function renderTabs() {
  const map = {
    schedule: ["#tabSchedule", "#screenSchedule"],
    wishes: ["#tabWishes", "#screenWishes"],
    notes: ["#tabNotes", "#screenNotes"],
    settings: ["#tabSettings", "#screenSettings"],
  };

  for (const [k, [tabSel, screenSel]] of Object.entries(map)) {
    const tab = $(tabSel);
    const screen = $(screenSel);
    if (!tab || !screen) continue;
    tab.classList.toggle("tab--active", state.screen === k);
    screen.classList.toggle("screen--active", state.screen === k);
  }
}

function renderTopBar() {
  const monthTitle = $("#monthTitle");
  const weekSubtitle = $("#weekSubtitle");
  if (!monthTitle || !weekSubtitle) return;

  monthTitle.textContent = "Alina's UniWeek 💗";
  const wt = getWeekType(state.selectedDate);
  weekSubtitle.textContent = wt === "odd" ? "Неделя: числитель" : "Неделя: знаменатель";
}

function renderTopVisibility() {
  // В настройках НЕ показываем: дни, стрелки, календарь
  const hide = state.screen === "settings";
  $("#dayStripWrap")?.classList.toggle("hidden", hide);
  $("#dayPrevBtn")?.classList.toggle("hidden", hide);
  $("#dayNextBtn")?.classList.toggle("hidden", hide);
  $("#calendarOpenBtn")?.classList.toggle("hidden", hide);
}

function renderDayStrip() {
  const strip = $("#dayStrip");
  if (!strip) return;

  const base = new Date(state.selectedDate);
  const day = (base.getDay() + 6) % 7; // Mon=0
  const monday = new Date(base);
  monday.setDate(monday.getDate() - day);

  const today = new Date();
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  strip.innerHTML = days.map(d => {
    const active = isSameDay(d, state.selectedDate);
    const dow = d.toLocaleDateString("ru-RU", { weekday: "short" }).toUpperCase();
    const ddmm = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

    const todayMark = isSameDay(d, today)
      ? `<div class="todayDot"><span class="todayDot__text">today</span></div>`
      : "";

    return `
      <button class="dayPill ${active ? "dayPill--active" : ""}" type="button" data-iso="${d.toISOString()}">
        <div class="dayPill__dow">${dow}</div>
        <div class="dayPill__date">${ddmm}</div>
        ${todayMark}
      </button>
    `;
  }).join("");

  $$(".dayPill", strip).forEach(btn => {
    btn.addEventListener("click", () => {
      const iso = btn.getAttribute("data-iso");
      if (!iso) return;
      state.selectedDate = new Date(iso);
      renderAllScheduleBits();
    });
  });
}

function renderAllScheduleBits() {
  renderTopBar();
  renderDayStrip();

  renderSchedule({
    root: document,
    date: state.selectedDate,
    weekType: getWeekType(state.selectedDate),
    schedule: state.schedule,
    subjectColors: state.subjectColors,
  });
}

/* ---------------------------
  Settings
--------------------------- */
function renderSettings() {
  const autoToggle = $("#autoWeekToggle");
  const anchorInput = $("#anchorDateInput");
  const manualRow = $("#manualWeekRow");
  const oddBtn = $("#weekOddBtn");
  const evenBtn = $("#weekEvenBtn");

  if (autoToggle) autoToggle.checked = state.autoWeek;
  if (anchorInput) anchorInput.value = state.anchorDate || "";
  if (manualRow) manualRow.style.display = state.autoWeek ? "none" : "";

  oddBtn?.classList.toggle("segBtn--active", state.manualWeek === "odd");
  evenBtn?.classList.toggle("segBtn--active", state.manualWeek === "even");

  renderSubjectColors();
}

function renderSubjectColors() {
  const root = $("#subjectColors");
  if (!root) return;

  const subjects = Array.from(new Set(state.schedule.map(x => x.courseName).filter(Boolean)))
    .sort((a,b) => a.localeCompare(b, "ru"));

  if (!subjects.length) {
    root.innerHTML = `<div class="empty__text">Появится после импорта расписания 💗</div>`;
    return;
  }

  root.innerHTML = subjects.map(name => {
    const val = state.subjectColors[name] || "";
    return `
      <div class="subjectColorRow">
        <div class="settingsLabel">${name}</div>
        <input class="colorPicker" data-subject="${name}" value="${val}" placeholder="#F7A8C6" />
      </div>
    `;
  }).join("");

  $$(".colorPicker", root).forEach(inp => {
    inp.addEventListener("change", () => {
      const subject = inp.getAttribute("data-subject");
      const v = (inp.value || "").trim();
      if (!subject) return;
      if (!v) delete state.subjectColors[subject];
      else state.subjectColors[subject] = v;
      saveColors();
      if (state.screen === "schedule") renderAllScheduleBits();
    });
  });
}

/* ---------------------------
  Events
--------------------------- */
function bindEvents() {
  initNotes();
  $("#tabSchedule")?.addEventListener("click", () => setScreen("schedule"));
  $("#tabWishes")?.addEventListener("click", () => setScreen("wishes"));
  $("#tabNotes")?.addEventListener("click", () => {
  setScreen("notes");
  openNotes();
  });
  $("#tabSettings")?.addEventListener("click", () => setScreen("settings"));

  $("#dayPrevBtn")?.addEventListener("click", () => {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() - 1);
    state.selectedDate = d;
    renderAllScheduleBits();
  });

  $("#dayNextBtn")?.addEventListener("click", () => {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() + 1);
    state.selectedDate = d;
    renderAllScheduleBits();
  });

  $("#calendarOpenBtn")?.addEventListener("click", () => {

  const modal = $("#calendarModal");
  modal?.showModal?.();

  openCalendar({
    state,
    onPickDate: (date) => {
      state.selectedDate = date;
      modal?.close?.();
      renderAllScheduleBits();
    }
  });

});
  $("#calendarCloseBtn")?.addEventListener("click", () => $("#calendarModal")?.close?.());

  // settings
  $("#autoWeekToggle")?.addEventListener("change", (e) => {
    state.autoWeek = !!e.target.checked;
    saveSettings();
    if (state.screen === "schedule") renderAllScheduleBits();
    if (state.screen === "settings") renderSettings();
  });

  $("#anchorDateInput")?.addEventListener("change", (e) => {
    state.anchorDate = String(e.target.value || "").trim();
    saveSettings();
    if (state.screen === "schedule") renderAllScheduleBits();
  });

  $("#weekOddBtn")?.addEventListener("click", () => {
    state.manualWeek = "odd";
    saveSettings();
    renderSettings();
    if (state.screen === "schedule") renderAllScheduleBits();
  });

  $("#weekEvenBtn")?.addEventListener("click", () => {
    state.manualWeek = "even";
    saveSettings();
    renderSettings();
    if (state.screen === "schedule") renderAllScheduleBits();
  });

  $("#csvInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const text = await f.text();
      const res = importScheduleFromCsv(text);

      if (res.ok) {
        state.schedule = res.lessons;
        saveSchedule();
      }

      alert(res.msg || "Готово");
      if (state.screen === "settings") renderSettings();
      if (state.screen === "schedule") renderAllScheduleBits();
    } catch (err) {
      alert("Ошибка чтения файла: " + (err?.message || err));
    } finally {
      e.target.value = "";
    }
  });

  $("#exportJsonBtn")?.addEventListener("click", () => {
    const data = {
      schedule: state.schedule,
      subjectColors: state.subjectColors,
      manualWeek: state.manualWeek,
      autoWeek: state.autoWeek,
      anchorDate: state.anchorDate,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uniweek-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $("#resetAllBtn")?.addEventListener("click", () => {
    if (!confirm("Сбросить всё?")) return;
    for (const k of Object.values(LS)) localStorage.removeItem(k);
    loadAll();
    setScreen("schedule");
    renderAllScheduleBits();
  });

  // пока игры просто открывают карточки-заглушки
  $("#openQuizBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.remove("hidden");
    $("#memoryCard")?.classList.add("hidden");
    $("#quizRoot").textContent = "Скоро подключим quiz.js 💗";
  });
  $("#openMemoryBtn")?.addEventListener("click", () => {
    $("#memoryCard")?.classList.remove("hidden");
    $("#quizCard")?.classList.add("hidden");
    $("#memoryRoot").textContent = "Скоро подключим memory.js 💗";
  });
  $("#quizBackBtn")?.addEventListener("click", () => $("#quizCard")?.classList.add("hidden"));
  $("#memoryBackBtn")?.addEventListener("click", () => $("#memoryCard")?.classList.add("hidden"));

  // пожелания (минималка)
  const wishes = [
    "Доброе утро, солнышко 🌸💗",
    "Ты умничка. Я тобой горжусь ✨",
    "Пусть день будет лёгким и тёплым 💞",
  ];
  $("#wishMoreBtn")?.addEventListener("click", () => {
    $("#wishBox").textContent = wishes[Math.floor(Math.random() * wishes.length)];
  });
}

/* ---------------------------
  Boot
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  disablePinchZoom();
  loadAll();
  bindEvents();

  // старт
  setScreen("schedule");
  $("#wishBox").textContent = "Нажми «Ещё» 💗";
  renderAllScheduleBits();
});
