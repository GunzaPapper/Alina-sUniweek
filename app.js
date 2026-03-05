// schedule.js (CORE)
// Один ответственный модуль: рендер списка пар + "следующая пара" + подсказки

const $ = (sel, root = document) => root.querySelector(sel);

function formatTime(t) {
  return String(t || "").trim();
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lessonMatchesDate(lesson, date, weekType) {
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dow = dayNames[date.getDay()];

  const lt = (lesson.weekType || "").toLowerCase().trim(); // odd/even/both/any/empty
  const okWeek = !lt || lt === "any" || lt === "both" || lt === weekType;

  const okDay = (lesson.dayOfWeek || "").toLowerCase().trim() === dow;
  return okDay && okWeek;
}

function pad2(n) { return String(n).padStart(2, "0"); }

export function renderSchedule({ root, date, weekType, schedule, subjectColors }) {
  const list = $("#lessonList", root);
  const hint = $("#scheduleHint", root);
  const nextCard = $("#nextLessonCard", root);

  if (!list || !hint || !nextCard) return;

  const items = (Array.isArray(schedule) ? schedule : [])
    .filter(l => lessonMatchesDate(l, date, weekType))
    .sort((a, b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));

  hint.textContent = items.length ? `${items.length} шт.` : "Пока пусто — импортируй CSV в Настройках";

  // list
  function splitCourseAndTeacher(courseName = "") {
  // "Трудовое право — Бабаева О.Н." -> ["Трудовое право", "Бабаева О.Н."]
  const parts = String(courseName).split("—").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" — ")];
  return [String(courseName).trim(), ""];
}

// внутри renderSchedule:
list.innerHTML = items.map(l => {
  const color = l.color || state.subjectColors?.[l.courseName] || "#F7A8C6";
  const [title, teacher] = splitCourseAndTeacher(l.courseName);

  const type = (l.type || "").toLowerCase();
  const typeLabel = type === "lecture" ? "Лекция" : type === "seminar" ? "Семинар" : "Занятие";
  const typeIcon  = type === "lecture" ? "🎓" : type === "seminar" ? "📝" : "📌";

  return `
    <article class="lessonCardPro" style="--accent:${color}">
      <div class="lessonCardPro__head">
        <div class="lessonCardPro__time">${l.startTime}–${l.endTime}</div>
        <div class="lessonCardPro__type">${typeIcon} ${typeLabel}</div>
      </div>

      <div class="lessonCardPro__title">${title || "—"}</div>
      ${teacher ? `<div class="lessonCardPro__teacher">${teacher}</div>` : ""}

      <div class="lessonCardPro__meta">
        ${l.location ? `<span class="lessonPill">📍 ${l.location}</span>` : ""}
        ${l.weekType ? `<span class="lessonPill">📅 ${l.weekType}</span>` : ""}
      </div>
    </article>
  `;
}).join("");

  // next lesson card (today only)
  const now = new Date();
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

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
