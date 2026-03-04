// FILE: js/nextLesson.js

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHuman(min) {
  if (min <= 0) return "меньше минуты";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}ч ${m}м`;
  if (h > 0) return `${h}ч`;
  return `${m}м`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getLessonState(lessons, date) {
  // Показываем "следующая/идёт" только для выбранного дня.
  // Если выбран не сегодня — просто показываем первую пару как "первая".
  const isToday = sameDay(date, new Date());

  const list = lessons
    .slice()
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (!list.length) return { kind: "none" };

  if (!isToday) {
    return { kind: "notToday", first: list[0] };
  }

  const now = getNowMinutes();

  for (let i = 0; i < list.length; i++) {
    const l = list[i];
    const s = timeToMinutes(l.startTime);
    const e = timeToMinutes(l.endTime);

    if (now >= s && now < e) {
      return { kind: "ongoing", lesson: l, now, s, e };
    }

    if (now < s) {
      return { kind: "next", lesson: l, now, s };
    }
  }

  return { kind: "finished" };
}

function typeIcon(type) {
  const t = (type || "").toLowerCase();
  if (t === "lecture") return "🎓";
  if (t === "seminar") return "📝";
  if (t === "lab") return "🧪";
  return "📚";
}

export function render(container, lessons, date) {
  const st = getLessonState(lessons, date);

  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "nextLesson";

  if (st.kind === "none") {
    wrap.innerHTML = `
      <div class="nextLesson__title">На этот день пар нет 💗</div>
      <div class="cardHint">Можно выдохнуть и отдохнуть</div>
    `;
    container.appendChild(wrap);
    return;
  }

  if (st.kind === "finished") {
    wrap.innerHTML = `
      <div class="nextLesson__title">На сегодня всё 💗</div>
      <div class="cardHint">Пары закончились — ты молодец!</div>
    `;
    container.appendChild(wrap);
    return;
  }

  if (st.kind === "notToday") {
    const l = st.first;
    wrap.innerHTML = `
      <div class="nextLesson__title">Первая пара этого дня</div>
      <div class="nextLesson__row">
        <div><b>${l.startTime} – ${l.endTime}</b></div>
        <div class="cardHint">${typeIcon(l.type)} ${l.type || "lesson"}</div>
      </div>
      <div><b>${l.courseName}</b></div>
      <div class="cardHint">${l.location ? "📍 " + l.location : ""}</div>
    `;
    container.appendChild(wrap);
    return;
  }

  if (st.kind === "next") {
    const l = st.lesson;
    const mins = Math.max(0, st.s - st.now);
    wrap.innerHTML = `
      <div class="nextLesson__title">Следующая пара</div>
      <div class="nextLesson__row">
        <div><b>${l.startTime} – ${l.endTime}</b></div>
        <div class="cardHint">начнётся через <b>${minutesToHuman(mins)}</b></div>
      </div>
      <div><b>${l.courseName}</b></div>
      <div class="cardHint">${typeIcon(l.type)} ${l.type || "lesson"} ${l.location ? " • 📍 " + l.location : ""}</div>
    `;
    container.appendChild(wrap);
    return;
  }

  if (st.kind === "ongoing") {
    const l = st.lesson;
    const total = st.e - st.s;
    const passed = st.now - st.s;
    const left = Math.max(0, st.e - st.now);
    const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((passed / total) * 100))) : 0;

    const title = document.createElement("div");
    title.className = "nextLesson__title";
    title.textContent = "Сейчас идёт пара";

    const row = document.createElement("div");
    row.className = "nextLesson__row";
    row.innerHTML = `
      <div><b>${l.startTime} – ${l.endTime}</b></div>
      <div class="cardHint">закончится через <b>${minutesToHuman(left)}</b></div>
    `;

    const name = document.createElement("div");
    name.innerHTML = `<b>${l.courseName}</b>`;

    const meta = document.createElement("div");
    meta.className = "cardHint";
    meta.textContent = `${typeIcon(l.type)} ${l.type || "lesson"}${l.location ? " • 📍 " + l.location : ""}`;

    const bar = document.createElement("div");
    bar.className = "progressBar";

    const inner = document.createElement("div");
    inner.style.width = `${pct}%`;

    bar.appendChild(inner);

    wrap.appendChild(title);
    wrap.appendChild(row);
    wrap.appendChild(name);
    wrap.appendChild(meta);
    wrap.appendChild(bar);

    container.appendChild(wrap);
    return;
  }
}