// app.js (FULL, modular-safe)
// UniWeek — модульный запуск (calendar/notes/quiz/memory/...) с защитой от падений
// Все файлы лежат рядом с index.html, поэтому пути: ./calendar.js и т.д.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const LS = {
  SCHEDULE: "uniweek_schedule_v1",
  SUBJECT_COLORS: "uniweek_subject_colors_v1",
  MANUAL_WEEK: "uniweek_manual_week_v1",
  AUTO_WEEK: "uniweek_auto_week_v1",
  ANCHOR_DATE: "uniweek_anchor_date_v1",
  NOTES: "uniweek_notes_v1",
};

const state = {
  screen: "schedule",
  selectedDate: new Date(),

  schedule: [],
  subjectColors: {},

  manualWeek: "odd",
  autoWeek: true,
  anchorDate: "",

  // модульные точки
  mods: {
    calendar: null,
    notes: null,
    quiz: null,
    memory: null,
    praise: null,
    swipe: null,
    csv: null,
    schedule: null,
    nextLesson: null,
    progress: null,
    achievements: null,
  }
};

/* ---------------------------
  Anti zoom (pinch) + nicer touch
--------------------------- */
function disablePinchZoom() {
  // iOS Safari gestures
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });

  // prevent ctrl+wheel zoom (desktop)
  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  // prevent double-tap zoom-ish on some browsers
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}

/* ---------------------------
  Utils
--------------------------- */
function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadLS(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? safeJsonParse(raw, fallback) : fallback;
}
function pad2(n) { return String(n).padStart(2, "0"); }
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function formatTime(t) { return String(t || "").trim(); }

/* ---------------------------
  Week logic
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
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day);
    return x;
  };

  const w0 = monday(anchor).getTime();
  const w1 = monday(date).getTime();
  const diffWeeks = Math.round((w1 - w0) / (7 * 24 * 3600 * 1000));

  return (diffWeeks % 2 === 0) ? "odd" : "even";
}

/* ---------------------------
  Load / Save
--------------------------- */
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

/* ---------------------------
  UI: Tabs & TopBar
--------------------------- */
function setScreen(name) {
  state.screen = name;
  renderTabs();
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
  const appRoot = document.getElementById("appRoot");
if (appRoot) appRoot.classList.toggle("settingsMode", state.screen === "settings");
}

function renderTopBar() {
  const monthTitle = document.getElementById("monthTitle");
  const weekSubtitle = document.getElementById("weekSubtitle");

  if (!monthTitle || !weekSubtitle) return;

  monthTitle.textContent = "Alina's UniWeek 💗";

  const weekType = getWeekType(state.selectedDate);
  weekSubtitle.textContent =
    weekType === "odd"
      ? "Неделя: числитель"
      : "Неделя: знаменатель";
}

/* ---------------------------
  Day strip (быстрый рендер недели)
--------------------------- */
function renderDayStrip() {
  const strip = $("#dayStrip");
  if (!strip) return;

  const base = new Date(state.selectedDate);
  // делаем 7 дней вокруг выбранного (с пн по вс)
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
      const d = iso ? new Date(iso) : new Date();
      state.selectedDate = d;
      renderAll();
    });
  });
}

/* ---------------------------
  Schedule render (CSS-compatible with твоим styles.css)
--------------------------- */
function lessonMatchesDate(lesson, date) {
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dow = dayNames[date.getDay()];
  const wt = getWeekType(date); // odd/even
  const lt = (lesson.weekType || "").toLowerCase().trim();

  const okWeek = !lt || lt === "any" || lt === wt;
  const okDay = (lesson.dayOfWeek || "").toLowerCase().trim() === dow;

  return okDay && okWeek;
}

function renderSchedule() {
  const list = $("#lessonList");
  const hint = $("#scheduleHint");
  const nextCard = $("#nextLessonCard");
  if (!list || !hint || !nextCard) return;

  const items = (Array.isArray(state.schedule) ? state.schedule : [])
    .filter(l => lessonMatchesDate(l, state.selectedDate))
    .sort((a,b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));

  hint.textContent = items.length ? `${items.length} шт.` : "Пока пусто — импортируй CSV в Настройках";

  if (!items.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет пар на этот день 💗</div>
        <div class="empty__text">Зайди в «Настройки» → «Импорт CSV» и выбери файл расписания.</div>
      </div>
    `;
  } else {
    list.innerHTML = items.map(l => {
      const color = l.color || state.subjectColors[l.courseName] || "#F7A8C6";
      const type = (l.type || "").toLowerCase();
      const typeLabel = type === "lecture" ? "🎓 Лекция" : type === "seminar" ? "📝 Семинар" : "📌 Занятие";

      return `
        <div class="lessonCard">
          <div class="lessonStripe" style="background:${esc(color)}"></div>
          <div class="lessonBody">
            <div class="lessonTop">
              <div class="lessonTime">${esc(formatTime(l.startTime))}–${esc(formatTime(l.endTime))}</div>
              <div class="lessonType">${esc(typeLabel)}</div>
            </div>
            <div class="lessonName">${esc(l.courseName || "—")}</div>
            <div class="lessonMeta">
              ${l.location ? `<span class="pill">📍 ${esc(l.location)}</span>` : ""}
              ${l.weekType ? `<span class="pill">📅 ${esc(l.weekType)}</span>` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // next lesson (today only)
  const now = new Date();
  const sameDay =
    now.getFullYear() === state.selectedDate.getFullYear() &&
    now.getMonth() === state.selectedDate.getMonth() &&
    now.getDate() === state.selectedDate.getDate();

  if (!sameDay || !items.length) {
    nextCard.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">${sameDay ? "Сегодня пар нет 💗" : "Выбери сегодняшний день, чтобы увидеть следующую пару"}</div>
      </div>
    `;
    return;
  }

  const cur = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const next = items.find(x => formatTime(x.endTime) > cur) || null;

  if (!next) {
    nextCard.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">На сегодня всё 💗</div>
      </div>
    `;
  } else {
    nextCard.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__row">
          <div style="font-weight:900">${esc(next.courseName || "—")}</div>
          <div style="color:rgba(42,31,37,.7); font-weight:800">${esc(formatTime(next.startTime))}–${esc(formatTime(next.endTime))}</div>
        </div>
        <div class="nextLesson__text">${esc(next.location || "")}</div>
      </div>
    `;
  }
}

/* ---------------------------
  Settings UI (базово)
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

  if (oddBtn) oddBtn.classList.toggle("segBtn--active", state.manualWeek === "odd");
  if (evenBtn) evenBtn.classList.toggle("segBtn--active", state.manualWeek === "even");

  renderSubjectColors();
}

function renderSubjectColors() {
  const root = $("#subjectColors");
  if (!root) return;

  const subjects = Array.from(new Set((state.schedule || []).map(x => x.courseName).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b,"ru"));

  if (!subjects.length) {
    root.innerHTML = `<div class="empty__text">Появится после импорта расписания 💗</div>`;
    return;
  }

  root.innerHTML = subjects.map(name => {
    const val = state.subjectColors[name] || "";
    // используем твои классы из CSS: subjectColorRow + colorPicker
    return `
      <div class="subjectColorRow">
        <div class="settingsLabel">${esc(name)}</div>
        <input class="colorPicker" data-subject="${esc(name)}" value="${esc(val)}" placeholder="#F7A8C6" />
      </div>
    `;
  }).join("");

  $$(".colorPicker", root).forEach(inp => {
    inp.addEventListener("change", () => {
      const subject = inp.getAttribute("data-subject");
      const v = inp.value.trim();
      if (!subject) return;
      if (!v) delete state.subjectColors[subject];
      else state.subjectColors[subject] = v;
      saveLS(LS.SUBJECT_COLORS, state.subjectColors);
      renderSchedule();
    });
  });
}

/* ---------------------------
  Modular loader (динамические импорты)
--------------------------- */
async function tryImport(path, key) {
  try {
    const mod = await import(path);
    state.mods[key] = mod;
    return mod;
  } catch (e) {
    console.warn(`[UniWeek] Module failed: ${path}`, e);
    state.mods[key] = null;
    return null;
  }
}

async function loadModules() {
  // грузим все, но приложение не падает если что-то не так
  await Promise.all([
    tryImport("./calendar.js", "calendar"),
    tryImport("./notes.js", "notes"),
    tryImport("./quiz.js", "quiz"),
    tryImport("./memory.js", "memory"),
    tryImport("./praise.js", "praise"),
    tryImport("./swipe.js", "swipe"),
    tryImport("./csvParser.js", "csv"),
    tryImport("./schedule.js", "schedule"),
    tryImport("./nextLesson.js", "nextLesson"),
    tryImport("./progress.js", "progress"),
    tryImport("./achievements.js", "achievements"),
  ]);
}

/* ---------------------------
  Events
--------------------------- */
function bindEvents() {
  // tabs
  $("#tabSchedule")?.addEventListener("click", () => { setScreen("schedule"); });
  $("#tabWishes")?.addEventListener("click", () => { setScreen("wishes"); });
  $("#tabNotes")?.addEventListener("click", () => { setScreen("notes"); });
  $("#tabSettings")?.addEventListener("click", () => { setScreen("settings"); renderSettings(); });

  // day arrows
  $("#dayPrevBtn")?.addEventListener("click", () => {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() - 1);
    state.selectedDate = d;
    renderAll();
  });
  $("#dayNextBtn")?.addEventListener("click", () => {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() + 1);
    state.selectedDate = d;
    renderAll();
  });

  // settings: autoWeek toggle
  $("#autoWeekToggle")?.addEventListener("change", (e) => {
    state.autoWeek = !!e.target.checked;
    saveSettings();
    renderAll();
  });

  // anchor date
  $("#anchorDateInput")?.addEventListener("change", (e) => {
    state.anchorDate = String(e.target.value || "").trim();
    saveSettings();
    renderAll();
  });

  // manual week
  $("#weekOddBtn")?.addEventListener("click", () => {
    state.manualWeek = "odd";
    saveSettings();
    renderAll();
  });
  $("#weekEvenBtn")?.addEventListener("click", () => {
    state.manualWeek = "even";
    saveSettings();
    renderAll();
  });

  // CSV import: если есть модуль csvParser — используем его, иначе fallback (сделаем в следующем файле)
  $("#csvInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const text = await f.text();

      // ожидаем, что csvParser.js экспортирует: importScheduleFromCsv(text) -> {ok,msg,lessons}
      const csv = state.mods.csv;
      if (csv?.importScheduleFromCsv) {
        const res = csv.importScheduleFromCsv(text);
        if (res?.ok && Array.isArray(res.lessons)) {
          state.schedule = res.lessons;
          saveLS(LS.SCHEDULE, state.schedule);
        }
        alert(res?.msg || "Импорт завершён");
      } else {
        alert("csvParser.js ещё не подключён/пустой. Сейчас я дам его следующим файлом ✅");
      }

      renderAll();
    } catch (err) {
      alert("Ошибка чтения файла: " + (err?.message || err));
    } finally {
      e.target.value = "";
    }
  });

  // export data
  $("#exportJsonBtn")?.addEventListener("click", () => {
    const data = {
      schedule: state.schedule,
      subjectColors: state.subjectColors,
      manualWeek: state.manualWeek,
      autoWeek: state.autoWeek,
      anchorDate: state.anchorDate,
      exportedAt: new Date().toISOString()
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

  // reset
  $("#resetAllBtn")?.addEventListener("click", () => {
    if (!confirm("Сбросить всё?")) return;
    for (const k of Object.values(LS)) localStorage.removeItem(k);
    loadAll();
    renderAll();
  });

  // open calendar modal (если модуль будет)
  $("#calendarOpenBtn")?.addEventListener("click", () => {
    const dlg = $("#calendarModal");
    if (!dlg) return;
    dlg.showModal?.();
    // если модуль calendar есть — пусть отрендерит
    state.mods.calendar?.openCalendar?.({ state, onPickDate: (d) => {
      state.selectedDate = d;
      dlg.close?.();
      renderAll();
    }});
  });
  $("#calendarCloseBtn")?.addEventListener("click", () => {
    $("#calendarModal")?.close?.();
  });

  // games buttons
  $("#openQuizBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.remove("hidden");
    $("#memoryCard")?.classList.add("hidden");
    state.mods.quiz?.openQuiz?.({ state });
  });
  $("#openMemoryBtn")?.addEventListener("click", () => {
    $("#memoryCard")?.classList.remove("hidden");
    $("#quizCard")?.classList.add("hidden");
    state.mods.memory?.openMemory?.({ state });
  });
  $("#quizBackBtn")?.addEventListener("click", () => {
    $("#quizCard")?.classList.add("hidden");
  });
  $("#memoryBackBtn")?.addEventListener("click", () => {
    $("#memoryCard")?.classList.add("hidden");
  });

  // notes screen init
  $("#tabNotes")?.addEventListener("click", () => {
    state.mods.notes?.openNotes?.({ state });
  });
}

/* ---------------------------
  Render all
--------------------------- */
function renderAll() {
  renderTopBar();
  renderTabs();
  renderDayStrip();
  renderSchedule();

  if (state.screen === "settings") renderSettings();

  // пусть модули тоже обновятся, если они умеют
  state.mods.progress?.renderProgress?.({ state });
  state.mods.achievements?.renderAchievements?.({ state });
}

/* ---------------------------
  SW register
--------------------------- */
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    if (location.protocol === "file:") return;
    await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  } catch (e) {
    console.warn("SW register failed:", e);
  }
}

/* ---------------------------
  Boot
--------------------------- */
function showFatal(err) {
  const card = $("#nextLessonCard");
  if (card) {
    card.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Ошибка запуска</div>
        <div class="nextLesson__text">${esc(err?.message || err)}</div>
        <div class="nextLesson__text">Открой DevTools → Console и пришли красные строки.</div>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    disablePinchZoom();
    loadAll();
    await loadModules();     // важно: модули подгрузятся, но не уронят app
    bindEvents();

    // если модуль swipe есть — пусть подключит свайпы между днями/экранами
    state.mods.swipe?.initSwipe?.({ state, onChange: renderAll });

    renderAll();
    // registerSW();
  } catch (err) {
    console.error(err);
    showFatal(err);
  }
});



