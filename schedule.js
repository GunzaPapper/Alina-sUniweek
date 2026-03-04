// FILE: js/schedule.js

import * as storage from "./storage.js";

/* ===============================
   Constants
================================= */

const LESSONS_KEY = "schedule.lessons";
const SUBJECT_COLORS_KEY = "schedule.subjectColors";

/* ===============================
   Lesson Type Icons
================================= */

const TYPE_ICONS = {
  lecture: "🎓",
  seminar: "📝",
  lab: "🧪",
};

function getTypeIcon(type) {
  if (!type) return "📚";
  const t = type.toLowerCase();
  return TYPE_ICONS[t] || "📚";
}

/* ===============================
   Helpers
================================= */

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function normalizeLesson(l) {
  return {
    courseName: (l.courseName || "").trim(),
    type: (l.type || "").trim().toLowerCase(),
    dayOfWeek: (l.dayOfWeek || "").trim().toLowerCase(),
    startTime: (l.startTime || "").trim(),
    endTime: (l.endTime || "").trim(),
    weekType: (l.weekType || "both").trim().toLowerCase(),
    location: (l.location || "").trim(),
    color: (l.color || "").trim(),
  };
}

/* ===============================
   Storage
================================= */

export function getLessons() {
  return storage.get(LESSONS_KEY, []);
}

export function setLessons(list) {
  const normalized = list.map(normalizeLesson);

  const unique = removeDuplicates(normalized);

  unique.sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  storage.set(LESSONS_KEY, unique);
}

function removeDuplicates(list) {
  const seen = new Set();
  const result = [];

  list.forEach((l) => {
    const key =
      l.courseName +
      "|" +
      l.dayOfWeek +
      "|" +
      l.startTime +
      "|" +
      l.endTime +
      "|" +
      l.weekType +
      "|" +
      l.location;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(l);
    }
  });

  return result;
}

/* ===============================
   Week Type
================================= */

export function getWeekType(date) {
  const auto = storage.get("week.auto", true);

  if (!auto) {
    return storage.get("week.manual", "odd");
  }

  const anchorStr = storage.get("week.anchor", "2024-09-02");
  const anchor = new Date(anchorStr);

  const diff = date - anchor;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const week = Math.floor(days / 7);

  return week % 2 === 0 ? "odd" : "even";
}

/* ===============================
   Day Of Week
================================= */

function getDayName(date) {
  const map = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[date.getDay()];
}

/* ===============================
   Get Lessons For Date
================================= */

export function getLessonsForDate(date) {
  const lessons = getLessons();

  const day = getDayName(date);
  const weekType = getWeekType(date);

  return lessons.filter((l) => {
    if (l.dayOfWeek !== day) return false;

    if (l.weekType === "both") return true;

    if (l.weekType === weekType) return true;

    return false;
  });
}

/* ===============================
   Subject Colors
================================= */

export function getSubjectColors() {
  return storage.get(SUBJECT_COLORS_KEY, {});
}

export function setSubjectColor(subject, color) {
  const colors = getSubjectColors();
  colors[subject] = color;
  storage.set(SUBJECT_COLORS_KEY, colors);
}

export function getSubjectColor(subject) {
  const colors = getSubjectColors();
  return colors[subject] || null;
}

/* ===============================
   Lesson Card Rendering
================================= */

export function renderLessonCard(lesson) {
  const card = document.createElement("div");
  card.className = "lessonCard";

  const stripe = document.createElement("div");
  stripe.className = "lessonStripe";

  const subjectColor = lesson.color || getSubjectColor(lesson.courseName);

  if (subjectColor) {
    stripe.style.background = subjectColor;
  }

  const body = document.createElement("div");
  body.className = "lessonBody";

  const top = document.createElement("div");
  top.className = "lessonTop";

  const time = document.createElement("div");
  time.className = "lessonTime";
  time.textContent = `${lesson.startTime} – ${lesson.endTime}`;

  const type = document.createElement("div");
  type.className = "lessonType";
  type.textContent = `${getTypeIcon(lesson.type)} ${lesson.type}`;

  top.appendChild(time);
  top.appendChild(type);

  const name = document.createElement("div");
  name.className = "lessonName";
  name.textContent = lesson.courseName;

  const meta = document.createElement("div");
  meta.className = "lessonMeta";

  if (lesson.location) {
    const loc = document.createElement("span");
    loc.className = "pill";
    loc.textContent = `📍 ${lesson.location}`;
    meta.appendChild(loc);
  }

  const week = document.createElement("span");
  week.className = "pill";

  if (lesson.weekType === "odd") week.textContent = "Числитель";
  else if (lesson.weekType === "even") week.textContent = "Знаменатель";
  else week.textContent = "Обе недели";

  meta.appendChild(week);

  body.appendChild(top);
  body.appendChild(name);
  body.appendChild(meta);

  card.appendChild(stripe);
  card.appendChild(body);

  return card;
}