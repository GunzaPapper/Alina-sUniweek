import { importScheduleFromCsv } from "./csvParser.js";
import { renderSchedule } from "./schedule.js";

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
function loadLS(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? safeJsonParse(raw, fallback) : fallback;
}
function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function disablePinchZoom() {
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });

  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });
}

function getWeekType(date) {
  if (!state.autoWeek) return state.manualWeek;

  const a = (state.anchorDate || "").trim();
  if (!a) return state.manualWeek;

  const anchor = new Date(a + "T00:00:00");
  if (Number.isNaN(anchor.getTime())) return state.manualWeek;

  const monday = (d) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x;
  };

  const w0 = monday(anchor).getTime();
  const w1 = monday(date).getTime();
  const diffWeeks = Math.round((w1 - w0) / (7 * 24 * 3600 * 1000));
  return (diffWeeks % 2 === 0) ? "odd" : "even";
}

function loadAll() {
  state.schedule = loadLS(LS.SCHEDULE, []);
  if (!Array.isArray(state.schedule)) state.schedule = [];

  state.subjectColors = loadLS(LS.SUBJECT_COLORS, {});
  if (!state.subjectColors || typeof state.subjectColors !== "object") state.subjectColors = {};

  state.manualWeek = localStorage.getItem(LS.MANUAL_WEEK) || "odd";
  state.autoWeek = (localStorage.getItem(LS.AUTO_WEEK) ?? "1") === "1";
  state.anchorDate = localStorage.getItem(LS.ANCHOR_DATE) || "";
}

function saveSettings() {
  localStorage.setItem(LS.MANUAL_WEEK, state.manualWeek);
  localStorage.setItem(LS.AUTO_WEEK, state.autoWeek ? "1" : "0");
  localStorage.setItem(LS.ANCHOR_DATE, state.anchorDate);
}

function setScreen(name) {
  state.screen = name;
  renderTabs();
  renderTopBar();
  renderDayStrip();
  renderMain();
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

  const appRoot = $("#appRoot");
  if (appRoot) appRoot.classList.toggle("settingsMode", state.screen === "settings");
}

function renderTopBar() {
  const monthTitle = $("#monthTitle");
  const weekSubtitle = $("#weekSubtitle");

  if (monthTitle) monthTitle.textContent = "Alina's UniWeek 💗";

  if (weekSubtitle) {
    const wt = getWeekType(state.selectedDate);
    weekSubtitle.textContent = wt === "odd" ? "Неделя: числитель" : "Неделя: знаменатель";
  }
}

function renderDayStrip() {
  const strip = $("#dayStrip");
  if (!strip) return;

  const base = new Date(state.selectedDate);
  const day = (base.getDay() + 6) % 7;
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
    const todayMark = isSameDay(d, today) ? `<div class="todayDot">today</div>` : "";

    return `
      <button class="dayPill ${active ? "dayPill--active" : ""}" type="button" data-date="${d.toISOString()}">
        <div class="dayPill__dow">${esc(dow)}</div>
        <div class="dayPill__date">${esc(ddmm)}</div>
        ${todayMark}
      </button>
    `;
  }).join("");

  $$(".dayPill", strip).forEach(btn => {
    btn.addEventListener("click", () => {
      const iso = btn.getAttribute("data-date");
      state.selectedDate = iso ? new Date(iso) : new Date();
      renderTopBar();
      renderDayStrip();
      renderMain();
    });
  });
}

function renderSubjectColors() {
  const root = $("#subjectColors");
  if (!root) return;

  const subjects = Array.from(new Set((state.schedule || []).map(x => x.courseName).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "ru"));

  if (!subjects.length) {
    root.innerHTML = `<div class="empty__text">Появится после импорта расписания 💗</div>`;
    return;
  }

  root.innerHTML = subjects.map(name => {
    const val = state.subjectColors[name] || "";
    return `
      <div class="colorRow">
        <div class="colorRow__name">${esc(name)}</div>
        <input class="input" data-subject="${esc(name)}" value="${esc(val)}" placeholder="#F7A8C6" />
      </div>
    `;
  }).join("");

  $$("input[data-subject]", root).forEach(inp => {
    inp.addEventListener("change", () => {
      const subject = inp.getAttribute("data-subject");
      const v = (inp.value || "").trim();
      if (!subject) return;
      if (!v) delete state.subjectColors[subject];
      else state.subjectColors[subject] = v;
      saveLS(LS.SUBJECT_COLORS, state.subjectColors);
      renderMain();
    });
  });
}

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

function renderMain() {
  renderSchedule({
    root: document,
    date: state.selectedDate,
    weekType: getWeekType(state.selectedDate),
    schedule: state.schedule,
    subjectColors: state.subjectColors,
  });

  if (state.screen === "settings") renderSettings();
}

function bindEvents() {
  $("#tabSchedule")?.addEventListener("click", () => setScreen("schedule"));
  $("#tabWishes")?.addEventListener("click", () => setScreen("wishes"));
  $("#tabNotes")?.addEventListener("click", () => setScreen("notes"));
  $("#tabSettings")?.addEventListener("click", () => setScreen("settings"));

  $("#dayPrevBtn")?.addEventListener("click", () => {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() - 1);
    state.selectedDate = d;
    renderTopBar();
    renderDayStrip();
    renderMain();
  });

  $("#dayNextBtn")?.addEventListener("click", () => {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() + 1);
    state.selectedDate = d;
    renderTopBar();
    renderDayStrip();
    renderMain();
  });

  $("#autoWeekToggle")?.addEventListener("change", (e) => {
    state.autoWeek = !!e.target.checked;
    saveSettings();
    renderTopBar();
    renderMain();
    renderSettings();
  });

  $("#anchorDateInput")?.addEventListener("change", (e) => {
    state.anchorDate = String(e.target.value || "").trim();
    saveSettings();
    renderTopBar();
    renderMain();
  });

  $("#weekOddBtn")?.addEventListener("click", () => {
    state.manualWeek = "odd";
    saveSettings();
    renderTopBar();
    renderMain();
    renderSettings();
  });

  $("#weekEvenBtn")?.addEventListener("click", () => {
    state.manualWeek = "even";
    saveSettings();
    renderTopBar();
    renderMain();
    renderSettings();
  });

  $("#csvInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const text = await f.text();
      const res = importScheduleFromCsv(text);

      if (res.ok && Array.isArray(res.lessons)) {
        state.schedule = res.lessons;
        saveLS(LS.SCHEDULE, state.schedule);
      }

      alert(res.msg || "Импорт завершён");
      renderMain();
      renderSettings();
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
    renderTopBar();
    renderDayStrip();
    renderMain();
    renderSettings();
  });

  $("#calendarOpenBtn")?.addEventListener("click", () => {
    const dlg = $("#calendarModal");
    const root = $("#calendarRoot");
    if (root) {
      root.innerHTML = `
        <div style="font-weight:900;margin-bottom:6px;">Скоро будет календарь ✨</div>
        <div style="color:rgba(35,26,32,.72);font-weight:800;">
          Сейчас мы стабилизируем основу. Следующим шагом подключим calendar.js красиво и полностью.
        </div>
      `;
    }
    dlg?.showModal?.();
  });

  $("#calendarCloseBtn")?.addEventListener("click", () => {
    $("#calendarModal")?.close?.();
  });

  $("#wishMoreBtn")?.addEventListener("click", () => {
    const wishes = [
      "Ты умничка 💗",
      "Пусть сегодня всё получится ✨",
      "Ты справишься, я в тебя верю 🌸"
    ];
    const box = $("#wishBox");
    if (box) box.textContent = wishes[Math.floor(Math.random() * wishes.length)];
  });
}

document.addEventListener("DOMContentLoaded", () => {
  disablePinchZoom();
  loadAll();
  bindEvents();
  renderTabs();
  renderTopBar();
  renderDayStrip();
  renderMain();
});
