// FILE: app.js

import * as storage from "./js/storage.js";
import * as schedule from "./js/schedule.js";
import * as csvParser from "./js/csvParser.js";
import * as calendar from "./js/calendar.js";
import * as nextLesson from "./js/nextLesson.js";
import * as swipe from "./js/swipe.js";

import * as quiz from "./js/quiz.js";
import * as memory from "./js/memory.js";
import * as achievements from "./js/achievements.js";
import * as progress from "./js/progress.js";
import * as praise from "./js/praise.js";

import * as notes from "./js/notes.js";

/* ===============================
   PWA Service Worker
================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

/* ===============================
   Global State
================================= */

const state = {
  currentTab: "schedule",
  selectedDate: new Date(),
  lessons: [],
};

/* ===============================
   DOM
================================= */

const screens = {
  schedule: document.getElementById("screenSchedule"),
  wishes: document.getElementById("screenWishes"),
  notes: document.getElementById("screenNotes"),
  settings: document.getElementById("screenSettings"),
};

const tabs = {
  schedule: document.getElementById("tabSchedule"),
  wishes: document.getElementById("tabWishes"),
  notes: document.getElementById("tabNotes"),
  settings: document.getElementById("tabSettings"),
};

const lessonList = document.getElementById("lessonList");
const nextLessonCard = document.getElementById("nextLessonCard");

const dayStrip = document.getElementById("dayStrip");
const monthTitle = document.getElementById("monthTitle");
const weekSubtitle = document.getElementById("weekSubtitle");

const dayPrevBtn = document.getElementById("dayPrevBtn");
const dayNextBtn = document.getElementById("dayNextBtn");

const calendarOpenBtn = document.getElementById("calendarOpenBtn");
const calendarModal = document.getElementById("calendarModal");
const calendarCloseBtn = document.getElementById("calendarCloseBtn");
const calendarRoot = document.getElementById("calendarRoot");

/* ===============================
   Tabs
================================= */

function switchTab(tab) {
  state.currentTab = tab;

  Object.keys(screens).forEach((key) => {
    screens[key].classList.remove("screen--active");
    tabs[key].classList.remove("tab--active");
  });

  screens[tab].classList.add("screen--active");
  tabs[tab].classList.add("tab--active");

  storage.set("ui.tab", tab);
}

function initTabs() {
  tabs.schedule.onclick = () => switchTab("schedule");
  tabs.wishes.onclick = () => switchTab("wishes");
  tabs.notes.onclick = () => switchTab("notes");
  tabs.settings.onclick = () => switchTab("settings");

  const saved = storage.get("ui.tab");
  if (saved && screens[saved]) switchTab(saved);
}

/* ===============================
   Date Helpers
================================= */

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ===============================
   Day Strip
================================= */

function buildDayStrip() {
  dayStrip.innerHTML = "";

  const base = new Date(state.selectedDate);

  for (let i = -3; i <= 3; i++) {
    const d = addDays(base, i);

    const pill = document.createElement("div");
    pill.className = "dayPill";

    if (sameDay(d, state.selectedDate)) {
      pill.classList.add("dayPill--active");
    }

    const dow = d.toLocaleDateString("ru-RU", { weekday: "short" });
    const date = d.getDate();

    pill.innerHTML = `
      <div class="dayPill__dow">${dow}</div>
      <div class="dayPill__date">${date}</div>
    `;

    if (sameDay(d, new Date())) {
      const dot = document.createElement("div");
      dot.className = "todayDot";
      dot.textContent = "Сегодня";
      pill.appendChild(dot);
    }

    pill.onclick = () => {
      state.selectedDate = d;
      renderSchedule();
    };

    dayStrip.appendChild(pill);
  }

  const month = state.selectedDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  monthTitle.textContent = month;
}

/* ===============================
   Schedule Rendering
================================= */

function renderSchedule() {
  buildDayStrip();

  const weekType = schedule.getWeekType(state.selectedDate);

  weekSubtitle.textContent =
    weekType === "odd" ? "Числитель" : weekType === "even" ? "Знаменатель" : "";

  const lessons = schedule.getLessonsForDate(state.selectedDate);

  lessonList.innerHTML = "";

  if (!lessons.length) {
    lessonList.innerHTML = `<div class="cardHint">Пар нет</div>`;
  }

  lessons.forEach((l) => {
    const card = schedule.renderLessonCard(l);
    lessonList.appendChild(card);
  });

  nextLesson.render(nextLessonCard, lessons, state.selectedDate);
}

/* ===============================
   Navigation
================================= */

function initDayButtons() {
  dayPrevBtn.onclick = () => {
    state.selectedDate = addDays(state.selectedDate, -1);
    renderSchedule();
  };

  dayNextBtn.onclick = () => {
    state.selectedDate = addDays(state.selectedDate, 1);
    renderSchedule();
  };
}

/* ===============================
   Swipe
================================= */

function initSwipe() {
  swipe.init(document.getElementById("screenSchedule"), {
    left() {
      state.selectedDate = addDays(state.selectedDate, 1);
      renderSchedule();
    },
    right() {
      state.selectedDate = addDays(state.selectedDate, -1);
      renderSchedule();
    },
  });
}

/* ===============================
   Calendar
================================= */

function initCalendar() {
  calendarOpenBtn.onclick = () => {
    calendar.render(calendarRoot, state.selectedDate, (d) => {
      state.selectedDate = d;
      renderSchedule();
      calendarModal.close();
    });

    calendarModal.showModal();
  };

  calendarCloseBtn.onclick = () => {
    calendarModal.close();
  };
}

/* ===============================
   CSV Import
================================= */

function initCSV() {
  const input = document.getElementById("csvInput");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    const text = await file.text();

    const hash = await csvParser.hash(text);

    const last = storage.get("csv.hash");

    if (last === hash) {
      alert("Этот CSV уже импортирован.");
      return;
    }

    const lessons = csvParser.parse(text);

    schedule.setLessons(lessons);

    storage.set("csv.hash", hash);

    renderSchedule();

    alert("Расписание импортировано.");
  });
}

/* ===============================
   Wishes
================================= */

const wishes = [
  "Пусть сегодня всё получится 💗",
  "Ты справишься со всем 🌸",
  "Я верю в тебя ✨",
  "Сегодня будет хороший день ☀️",
  "Ты большая молодец 💕",
];

const wishBox = document.getElementById("wishBox");
const wishMoreBtn = document.getElementById("wishMoreBtn");

function randomWish() {
  return wishes[Math.floor(Math.random() * wishes.length)];
}

function initWishes() {
  wishBox.textContent = randomWish();

  wishMoreBtn.onclick = () => {
    wishBox.textContent = randomWish();
  };
}

/* ===============================
   Games
================================= */

function initGames() {
  const quizBtn = document.getElementById("openQuizBtn");
  const memoryBtn = document.getElementById("openMemoryBtn");

  const quizCard = document.getElementById("quizCard");
  const memoryCard = document.getElementById("memoryCard");

  const quizBackBtn = document.getElementById("quizBackBtn");
  const memoryBackBtn = document.getElementById("memoryBackBtn");

  quizBtn.onclick = () => {
    quizCard.classList.remove("hidden");
    memoryCard.classList.add("hidden");
    quiz.start("quizRoot");
  };

  memoryBtn.onclick = () => {
    memoryCard.classList.remove("hidden");
    quizCard.classList.add("hidden");
    memory.start("memoryRoot");
  };

  quizBackBtn.onclick = () => {
    quizCard.classList.add("hidden");
  };

  memoryBackBtn.onclick = () => {
    memoryCard.classList.add("hidden");
  };
}

/* ===============================
   Settings
================================= */

function initSettings() {
  const autoToggle = document.getElementById("autoWeekToggle");
  const anchorInput = document.getElementById("anchorDateInput");

  autoToggle.checked = storage.get("week.auto", true);
  anchorInput.value = storage.get("week.anchor", "2024-09-02");

  autoToggle.onchange = () => {
    storage.set("week.auto", autoToggle.checked);
    renderSchedule();
  };

  anchorInput.onchange = () => {
    storage.set("week.anchor", anchorInput.value);
    renderSchedule();
  };

  const resetBtn = document.getElementById("resetAllBtn");

  resetBtn.onclick = () => {
    if (!confirm("Удалить все данные?")) return;

    storage.clear();
    location.reload();
  };
}

/* ===============================
   Init
================================= */

function init() {
  state.lessons = schedule.getLessons();

  initTabs();
  initDayButtons();
  initSwipe();
  initCalendar();
  initCSV();
  initWishes();
  initGames();
  initSettings();

  notes.init();

  achievements.init();
  progress.init();

  renderSchedule();
}

init();