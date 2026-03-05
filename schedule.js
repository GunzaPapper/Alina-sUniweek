// FILE: schedule.js
// UniWeek — schedule helpers + renderer (под твой styles.css)

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function esc(s) {
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function fmtTime(t) {
  return String(t || "").trim();
}

function timeKey(t) {
  // "08:00" -> "08:00"
  // страховка если "8:0"
  const x = fmtTime(t);
  const m = x.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return x;
  const hh = String(m[1]).padStart(2,"0");
  const mm = String(m[2]).padStart(2,"0");
  return `${hh}:${mm}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function pickTypeIcon(type) {
  const t = String(type || "").toLowerCase();
  if (t === "lecture" || t === "лекция") return "🎓";
  if (t === "seminar" || t === "семинар") return "📝";
  return "📌";
}

function normalizeWeekType(w) {
  const t = String(w || "").toLowerCase().trim();
  if (!t) return "both";
  if (t === "both" || t === "any" || t === "all") return "both";
  if (t === "odd") return "odd";
  if (t === "even") return "even";
  return "both";
}

/**
 * weekResolver(date) -> "odd" | "even"
 * ты отдашь сюда свою функцию из app.js
 */
export function lessonMatchesDate(lesson, date, weekResolver) {
  const dow = DAY_NAMES[date.getDay()];
  const lDow = String(lesson?.dayOfWeek || "").toLowerCase().trim();
  if (lDow !== dow) return false;

  const wt = normalizeWeekType(lesson?.weekType);
  if (wt === "both") return true;

  const cur = weekResolver?.(date) || "odd";
  return wt === cur;
}

export function getLessonsForDate(schedule, date, weekResolver) {
  const arr = Array.isArray(schedule) ? schedule : [];
  return arr
    .filter(l => lessonMatchesDate(l, date, weekResolver))
    .slice()
    .sort((a,b) => timeKey(a.startTime).localeCompare(timeKey(b.startTime)));
}

/**
 * Рендерит список занятий + подсказку в шапке
 * @param {HTMLElement} listEl  #lessonList
 * @param {HTMLElement} hintEl  #scheduleHint
 * @param {Array} lessons
 * @param {Object} subjectColors { [courseName]: color }
 */
export function renderScheduleInto(listEl, hintEl, lessons, subjectColors = {}) {
  if (!listEl || !hintEl) return;

  const items = Array.isArray(lessons) ? lessons : [];
  hintEl.textContent = items.length ? `${items.length} шт.` : "Пока пусто — импортируй CSV в Настройках";

  if (!items.length) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет пар на этот день 💗</div>
        <div class="empty__text">Зайди в «Настройки» → «Импорт CSV» и выбери файл расписания.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map(l => {
    const course = l.courseName || "—";
    const color = (l.color || subjectColors[course] || "#F7A8C6").trim();
    const icon = pickTypeIcon(l.type);

    // ВАЖНО: преподаватель в одной строке с аудиторией
    const teacher = (l.teacher || "").trim();
    const location = (l.location || "").trim();
    const metaParts = [teacher, location].filter(Boolean);
    const metaLine = metaParts.join(" • ");

    // неделя (если не both — показываем)
    const wt = normalizeWeekType(l.weekType);
    const wtLabel = wt === "both" ? "" : (wt === "odd" ? "Odd" : "Even");

    return `
      <div class="lessonCard">
        <div class="lessonStripe" style="background:${esc(color)}"></div>
        <div class="lessonBody">
          <div class="lessonTop">
            <div class="lessonTime">${esc(timeKey(l.startTime))}–${esc(timeKey(l.endTime))}</div>
            <div class="lessonType">${icon}${wtLabel ? ` <span class="pill">${esc(wtLabel)}</span>` : ""}</div>
          </div>

          <div class="lessonName">${esc(course)}</div>

          ${metaLine ? `<div class="lessonMeta"><span class="pill">${esc(metaLine)}</span></div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Утилита для вычисления "следующей пары" из списка занятий на выбранный день.
 * Возвращает lesson или null.
 */
export function getNextLessonForToday(lessons, now = new Date()) {
  const items = Array.isArray(lessons) ? lessons : [];
  if (!items.length) return null;

  const pad2 = (n) => String(n).padStart(2,"0");
  const cur = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  // берём первую, у которой endTime > сейчас
  return items.find(x => timeKey(x.endTime) > cur) || null;
}

export function renderNextLessonCard(cardEl, selectedDate, lessonsForSelectedDate) {
  if (!cardEl) return;

  const now = new Date();
  const same = isSameDay(now, selectedDate);
  const items = Array.isArray(lessonsForSelectedDate) ? lessonsForSelectedDate : [];

  if (!same || !items.length) {
    cardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">${same ? "Сегодня пар нет 💗" : "Выбери сегодняшний день, чтобы увидеть следующую пару"}</div>
      </div>
    `;
    return;
  }

  const next = getNextLessonForToday(items, now);

  if (!next) {
    cardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">На сегодня всё 💗</div>
      </div>
    `;
    return;
  }

  const teacher = (next.teacher || "").trim();
  const location = (next.location || "").trim();
  const meta = [teacher, location].filter(Boolean).join(" • ");

  cardEl.innerHTML = `
    <div class="nextLesson">
      <div class="nextLesson__title">Следующая пара</div>
      <div class="lessonName">${esc(next.courseName || "—")}</div>
      <div class="lessonMeta">
        <span class="pill">${esc(timeKey(next.startTime))}–${esc(timeKey(next.endTime))}</span>
        ${meta ? `<span class="pill">${esc(meta)}</span>` : ""}
      </div>
    </div>
  `;
}
