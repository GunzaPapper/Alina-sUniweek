// FILE: schedule.js
// Exports: renderSchedule({ state, getWeekType, rootEls })

function formatTime(t){ return String(t || "").trim(); }
function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function lessonMatchesDate(lesson, date, getWeekType){
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dow = dayNames[date.getDay()];
  const wt = getWeekType(date); // odd/even

  const lt = String(lesson.weekType || "both").toLowerCase().trim();

  const okDay = String(lesson.dayOfWeek || "").toLowerCase().trim() === dow;
  const okWeek = (lt === "both" || lt === "any" || lt === "" || lt === wt);

  return okDay && okWeek;
}

export function renderSchedule({ state, getWeekType, rootEls }){
  const { listEl, hintEl, nextCardEl } = rootEls;
  if (!listEl || !hintEl || !nextCardEl) return;

  const items = (Array.isArray(state.schedule) ? state.schedule : [])
    .filter(l => lessonMatchesDate(l, state.selectedDate, getWeekType))
    .sort((a,b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));

  hintEl.textContent = items.length ? `${items.length} шт.` : "Пока пусто — импортируй CSV в Настройках";

  if (!items.length) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет пар на этот день 💗</div>
        <div class="empty__text">Зайди в «Настройки» → «Импорт CSV» и выбери файл расписания.</div>
      </div>
    `;
  } else {
    listEl.innerHTML = items.map(l => {
      const color = l.color || state.subjectColors?.[l.courseName] || "#F7A8C6";
      const type = (l.type || "").toLowerCase();
      const typeLabel = type === "lecture" ? "🎓 Лекция" : type === "seminar" ? "📝 Семинар" : "📌 Занятие";

      const weekLabel = (l.weekType || "both") === "both"
        ? "обе недели"
        : (l.weekType === "odd" ? "числитель" : "знаменатель");

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
              <span class="pill">📅 ${esc(weekLabel)}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Next lesson (only for today)
  const now = new Date();
  const sameDay =
    now.getFullYear() === state.selectedDate.getFullYear() &&
    now.getMonth() === state.selectedDate.getMonth() &&
    now.getDate() === state.selectedDate.getDate();

  const pad2 = (n) => String(n).padStart(2,"0");
  const cur = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  if (!sameDay || !items.length) {
    nextCardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">${sameDay ? "Сегодня пар нет 💗" : "Выбери сегодняшний день, чтобы увидеть следующую пару"}</div>
      </div>
    `;
    return;
  }

  const next = items.find(x => formatTime(x.endTime) > cur) || null;

  if (!next) {
    nextCardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">На сегодня всё 💗</div>
      </div>
    `;
  } else {
    nextCardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__row">
          <div style="font-weight:900">${esc(next.courseName || "—")}</div>
          <div class="nextLesson__text">${esc(formatTime(next.startTime))}–${esc(formatTime(next.endTime))}</div>
        </div>
        <div class="nextLesson__text">${esc(next.location || "")}</div>
      </div>
    `;
  }
}
