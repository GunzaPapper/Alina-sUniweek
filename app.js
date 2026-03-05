// app.js (FULL)
// UniWeek — устойчивый запуск без 404 на модули + базовая логика UI
// ВАЖНО: этот app.js НЕ импортирует другие js-файлы, чтобы не было 404.
// Если позже захочешь вернуть модульную структуру — сделаем правильно (везде ./).

/* -----------------------------
  Helpers
----------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function safeJsonParse(str, fallback) {
  try {
    if (str == null) return fallback;
    const parsed = JSON.parse(str);

    // КЛЮЧЕВОЕ: если в storage лежит "null" -> parsed = null -> возвращаем fallback
    if (parsed == null) return fallback;

    return parsed;
  } catch {
    return fallback;
  }
}

function safeArrayFromLS(key, fallback = []) {
  const v = safeJsonParse(localStorage.getItem(key), fallback);
  return Array.isArray(v) ? v : fallback;
}

function safeObjectFromLS(key, fallback = {}) {
  const v = safeJsonParse(localStorage.getItem(key), fallback);
  // объект, но не массив
  return v && typeof v === "object" && !Array.isArray(v) ? v : fallback;
}

function formatTime(t) {
  // expects "HH:MM"
  return String(t || "").trim();
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* -----------------------------
  Storage keys
----------------------------- */
const LS = {
  SCHEDULE: "uniweek_schedule_v1",  // array of lessons
  SUBJECT_COLORS: "uniweek_subject_colors_v1",
  MANUAL_WEEK: "uniweek_manual_week_v1", // "odd" | "even"
  AUTO_WEEK: "uniweek_auto_week_v1", // "1" | "0"
  ANCHOR_DATE: "uniweek_anchor_date_v1", // "YYYY-MM-DD"
  NOTES: "uniweek_notes_v1",
};

/* -----------------------------
  Defaults (можешь заменить на свои массивы)
----------------------------- */
const BASE_WISHES = [
  "Доброе утро, мой цветочек 🌸💗 как ты спала?",
  "Напоминание на сегодня: я тебя очень сильно люблю 💗",
  "Ты умничка и красавица 💞",
];

const PRAISES = [
  { t:"Ты моя умничка 💗🥰", s:"Так держать! ✨" },
  { t:"Вау! Ты супер 💖", s:"Я тобой горжусь 😍" },
];

/* -----------------------------
  App state
----------------------------- */
const state = {
  screen: "schedule", // schedule | wishes | notes | settings
  selectedDate: new Date(),
  schedule: [],        // lessons
  subjectColors: {},   // { [courseName]: color }
  notes: [],
  manualWeek: "odd",
  autoWeek: true,
  anchorDate: "",

  // anti-repeat wishes
  wishPool: [],
  currentWish: "",
};

/* -----------------------------
  Week logic
----------------------------- */
// если autoWeek включен — считаем odd/even относительно ANCHOR_DATE
function getWeekType(date) {
  if (!state.autoWeek) return state.manualWeek;

  // anchorDate optional; if missing, fallback to manual
  const a = state.anchorDate?.trim();
  if (!a) return state.manualWeek;

  const anchor = new Date(a + "T00:00:00");
  if (Number.isNaN(anchor.getTime())) return state.manualWeek;

  // ISO-ish week diff (by Monday)
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

/* -----------------------------
  Load / Save
----------------------------- */
function loadAll() {
  // КЛЮЧЕВО: даже если в LS лежит "null" или не тот тип — тут всегда будут нормальные структуры
  state.schedule = safeArrayFromLS(LS.SCHEDULE, []);
  state.subjectColors = safeObjectFromLS(LS.SUBJECT_COLORS, {});
  state.notes = safeArrayFromLS(LS.NOTES, []);

  state.manualWeek = localStorage.getItem(LS.MANUAL_WEEK) || "odd";
  state.autoWeek = (localStorage.getItem(LS.AUTO_WEEK) ?? "1") === "1";
  state.anchorDate = localStorage.getItem(LS.ANCHOR_DATE) || "";

  // если текущая вкладка "wishes", но пожелания ещё нет — подготовим
  if (!state.currentWish) {
    state.currentWish = pickWish();
  }
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
function saveNotes() {
  localStorage.setItem(LS.NOTES, JSON.stringify(state.notes));
}

/* -----------------------------
  UI rendering
----------------------------- */
function renderTopBar() {
  const monthTitle = $("#monthTitle");
  const weekSubtitle = $("#weekSubtitle");
  if (!monthTitle || !weekSubtitle) return;

  const d = state.selectedDate;
  const month = d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  monthTitle.textContent = month.charAt(0).toUpperCase() + month.slice(1);

  const weekType = getWeekType(d);
  weekSubtitle.textContent = `Неделя: ${weekType === "odd" ? "Odd (числ)" : "Even (знам)"}`;
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

function lessonMatchesDate(lesson, date) {
  // lesson: {courseName,type,dayOfWeek,startTime,endTime,weekType,location,color}
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dow = dayNames[date.getDay()];
  const wt = getWeekType(date); // "odd"/"even"
  const lt = String(lesson?.weekType || "").toLowerCase().trim();
  const okWeek = !lt || lt === "any" || lt === wt;
  const okDay = String(lesson?.dayOfWeek || "").toLowerCase().trim() === dow;
  return okDay && okWeek;
}

function sortByTime(a, b) {
  return formatTime(a?.startTime).localeCompare(formatTime(b?.startTime));
}

function renderSchedule() {
  const list = $("#lessonList");
  const hint = $("#scheduleHint");
  const nextCard = $("#nextLessonCard");
  if (!list || !hint || !nextCard) return;

  // ГАРАНТИЯ: schedule всегда массив (из loadAll), но на всякий — страховка
  const scheduleSafe = Array.isArray(state.schedule) ? state.schedule : [];

  const items = scheduleSafe
    .filter(l => l && lessonMatchesDate(l, state.selectedDate))
    .sort(sortByTime);

  hint.textContent = items.length ? `${items.length} шт.` : "Пока пусто — импортируй CSV в Настройках";

  // list
  if (!items.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет пар на этот день 💗</div>
        <div class="empty__text">Зайди в «Настройки» → «Импорт CSV» и выбери файл расписания.</div>
      </div>
    `;
  } else {
    list.innerHTML = items.map(l => {
      const courseName = l.courseName || "—";
      const color = l.color || state.subjectColors[courseName] || "#F7A8C6";
      const type = String(l.type || "").toLowerCase();
      const icon = type === "lecture" ? "🎓" : type === "seminar" ? "📝" : "📌";
      return `
        <div class="lesson">
          <div class="lesson__bar" style="background:${esc(color)}"></div>
          <div class="lesson__main">
            <div class="lesson__top">
              <div class="lesson__time">${esc(formatTime(l.startTime))}–${esc(formatTime(l.endTime))}</div>
              <div class="lesson__type">${icon}</div>
            </div>
            <div class="lesson__title">${esc(courseName)}</div>
            <div class="lesson__meta">${esc(l.location || "")}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  // next lesson card (today only)
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

  const pad2 = (n) => String(n).padStart(2, "0");
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
        <div class="nextLesson__big">${esc(next.courseName || "—")}</div>
        <div class="nextLesson__text">${esc(formatTime(next.startTime))}–${esc(formatTime(next.endTime))} • ${esc(next.location || "")}</div>
      </div>
    `;
  }
}

/* -----------------------------
  Wishes (без постоянного перескакивания)
----------------------------- */
function ensureWishPool() {
  if (!state.wishPool.length) {
    const arr = BASE_WISHES.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state.wishPool = arr;
  }
}

function pickWish() {
  ensureWishPool();
  return state.wishPool.pop() || "💗";
}

function renderWish(forceNew = false) {
  const box = $("#wishBox");
  if (!box) return;

  if (forceNew || !state.currentWish) {
    state.currentWish = pickWish();
  }
  box.textContent = state.currentWish;
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

  if (oddBtn) oddBtn.classList.toggle("segBtn--active", state.manualWeek === "odd");
  if (evenBtn) evenBtn.classList.toggle("segBtn--active", state.manualWeek === "even");

  renderSubjectColors();
}

function renderSubjectColors() {
  const root = $("#subjectColors");
  if (!root) return;

  const scheduleSafe = Array.isArray(state.schedule) ? state.schedule : [];
  const subjects = Array.from(new Set(scheduleSafe.map(x => x?.courseName).filter(Boolean)))
    .sort((a,b)=>a.localeCompare(b,"ru"));

  if (!subjects.length) {
    root.innerHTML = `<div class="empty__text">Появится после импорта расписания 💗</div>`;
    return;
  }

  root.innerHTML = subjects.map(name => {
    const val = state.subjectColors[name] || "";
    return `
      <div class="colorRow">
        <div class="colorRow__name">${esc(name)}</div>
        <input class="input colorRow__input" data-subject="${esc(name)}" value="${esc(val)}" placeholder="#F7A8C6" />
      </div>
    `;
  }).join("");

  $$(".colorRow__input", root).forEach(inp => {
    inp.addEventListener("change", () => {
      const subject = inp.getAttribute("data-subject");
      const v = inp.value.trim();
      if (!subject) return;
      if (!v) delete state.subjectColors[subject];
      else state.subjectColors[subject] = v;
      saveColors();
      renderSchedule();
    });
  });
}

/* -----------------------------
  CSV Import (минимально рабочий)
  expected columns:
  courseName,type,dayOfWeek,startTime,endTime,weekType,location,color
----------------------------- */
function parseCsv(text) {
  const rows = [];
  let cur = "", inQ = false;
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && next === "\n") i++;
      out.push(cur); cur = "";
      rows.push(out.slice());
      out.length = 0;
      continue;
    }
    cur += ch;
  }
  if (cur.length || out.length) { out.push(cur); rows.push(out.slice()); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

function importScheduleFromCsv(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok:false, msg:"CSV пустой" };

  const header = rows[0].map(x => String(x).trim());
  const idx = (name) => header.indexOf(name);

  const needed = ["courseName","type","dayOfWeek","startTime","endTime","weekType","location","color"];
  for (const k of needed) {
    if (idx(k) === -1) return { ok:false, msg:`Нет колонки: ${k}` };
  }

  const lessons = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (k) => (r[idx(k)] ?? "").toString().trim();
    const courseName = get("courseName");
    if (!courseName) continue;

    lessons.push({
      courseName,
      type: get("type"),
      dayOfWeek: get("dayOfWeek").toLowerCase(),
      startTime: get("startTime"),
      endTime: get("endTime"),
      weekType: get("weekType").toLowerCase(),
      location: get("location"),
      color: get("color"),
    });
  }

  state.schedule = lessons;
  saveSchedule();
  return { ok:true, msg:`Импортировано: ${lessons.length}` };
}

/* -----------------------------
  Navigation / events
----------------------------- */
function bindEvents() {
  // tabs
  $("#tabSchedule")?.addEventListener("click", () => { state.screen="schedule"; renderAll(); });
  $("#tabWishes")?.addEventListener("click", () => { state.screen="wishes"; renderAll(); });
  $("#tabNotes")?.addEventListener("click", () => { state.screen="notes"; renderAll(); });
  $("#tabSettings")?.addEventListener("click", () => { state.screen="settings"; renderAll(); });

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

  // wish
  $("#wishMoreBtn")?.addEventListener("click", () => renderWish(true));

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

  // manual week buttons
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

  // CSV import
  $("#csvInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const text = await f.text();
      const res = importScheduleFromCsv(text);
      alert(res.msg);
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
      notes: state.notes,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
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
}

/* -----------------------------
  Render all
----------------------------- */
function renderAll() {
  renderTopBar();
  renderTabs();
  renderSchedule();

  if (state.screen === "wishes") renderWish(false);
  if (state.screen === "settings") renderSettings();
}

/* -----------------------------
  Service worker (safe)
----------------------------- */
async function registerSW() {
  // ВАЖНО: sw.js должен лежать рядом с index.html
  if (!("serviceWorker" in navigator)) return;

  try {
    // на file:// сервис-воркер не работает
    if (location.protocol === "file:") return;

    await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  } catch (e) {
    console.warn("SW register failed:", e);
  }
}

/* -----------------------------
  Boot
----------------------------- */
function showFatal(err) {
  const card = $("#nextLessonCard");
  if (card) {
    card.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Ошибка запуска</div>
        <div class="nextLesson__text">${esc(err?.message || err)}</div>
        <div class="nextLesson__text">Открой DevTools → Console и пришли мне красные строки.</div>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    loadAll();
    bindEvents();
    renderAll();
    registerSW();
  } catch (err) {
    console.error(err);
    showFatal(err);
  }
});
