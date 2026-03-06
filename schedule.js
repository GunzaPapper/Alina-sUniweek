// schedule.js
// Красивый рендер списка пар + карточка "следующая пара"

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
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const dow = dayNames[date.getDay()];
  const lt = (lesson.weekType || "").toLowerCase().trim();

  const okWeek = !lt || lt === "any" || lt === "both" || lt === weekType;
  const okDay = (lesson.dayOfWeek || "").toLowerCase().trim() === dow;

  return okDay && okWeek;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function splitCourseAndTeacher(courseName = "") {
  const text = String(courseName).trim();

  if (!text) return ["", ""];

  const separators = [" — ", " – ", " - ", "—", "–"];
  for (const sep of separators) {
    if (text.includes(sep)) {
      const parts = text.split(sep).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return [parts[0], parts.slice(1).join(" — ")];
      }
    }
  }

  return [text, ""];
}

function typeMeta(typeRaw = "") {
  const type = String(typeRaw).toLowerCase().trim();

  if (type === "lecture") {
    return { icon: "🎓", label: "Лекция" };
  }
  if (type === "seminar") {
    return { icon: "📝", label: "Семинар" };
  }
  if (type === "lab") {
    return { icon: "🧪", label: "Лабораторная" };
  }

  return { icon: "📌", label: "Занятие" };
}

function weekLabel(weekType = "") {
  const w = String(weekType).toLowerCase().trim();
  if (w === "odd") return "числитель";
  if (w === "even") return "знаменатель";
  if (w === "both" || w === "any") return "каждую неделю";
  return w;
}

export function renderSchedule({ root, date, weekType, schedule, subjectColors }) {
  const list = $("#lessonList", root);
  const hint = $("#scheduleHint", root);
  const nextCard = $("#nextLessonCard", root);

  if (!list || !hint || !nextCard) return;

  const items = (Array.isArray(schedule) ? schedule : [])
    .filter(l => lessonMatchesDate(l, date, weekType))
    .sort((a, b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));

  hint.textContent = items.length
    ? `${items.length} шт.`
    : "Пока пусто — импортируй CSV в Настройках";

  if (!items.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет пар на этот день 💗</div>
        <div class="empty__text">Зайди в «Настройки» → «Импорт CSV» и выбери файл расписания.</div>
      </div>
    `;
  } else {
    list.innerHTML = items.map(l => {
      const color = l.color || subjectColors?.[l.courseName] || "#F7A8C6";
      const [title, teacher] = splitCourseAndTeacher(l.courseName);
      const meta = typeMeta(l.type);
      const week = weekLabel(l.weekType);

      return `
        <article class="lessonCardPro" style="--accent:${esc(color)}">
          <div class="lessonCardPro__head">
            <div class="lessonCardPro__time">${esc(formatTime(l.startTime))}–${esc(formatTime(l.endTime))}</div>
            <div class="lessonCardPro__type">${meta.icon} ${meta.label}</div>
          </div>

          <div class="lessonCardPro__title">${esc(title || "—")}</div>
          ${teacher ? `<div class="lessonCardPro__teacher">${esc(teacher)}</div>` : ""}

          <div class="lessonCardPro__meta">
            ${l.location ? `<span class="lessonPill">📍 ${esc(l.location)}</span>` : ""}
            ${week ? `<span class="lessonPill">📅 ${esc(week)}</span>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  const now = new Date();
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (!sameDay || !items.length) {
    nextCard.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">
          ${sameDay ? "Сегодня пар нет 💗" : "Выбери сегодняшний день, чтобы увидеть следующую пару"}
        </div>
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
    return;
  }

  const [nextTitle, nextTeacher] = splitCourseAndTeacher(next.courseName);

  nextCard.innerHTML = `
    <div class="nextLesson">
      <div class="nextLesson__title">Следующая пара</div>
      <div class="nextLesson__big">${esc(nextTitle || "—")}</div>
      ${nextTeacher ? `<div class="nextLesson__text">${esc(nextTeacher)}</div>` : ""}
      <div class="nextLesson__text">
        ${esc(formatTime(next.startTime))}–${esc(formatTime(next.endTime))}
        ${next.location ? ` • ${esc(next.location)}` : ""}
      </div>
    </div>
  `;
}
