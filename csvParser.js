// FILE: csvParser.js
// Экспорт: importScheduleFromCsv(csvText) -> { ok, msg, lessons }
// Нормализует уроки к формату:
// { courseName, type, dayOfWeek, startTime, endTime, weekType, location, color }

function safeStr(v) {
  return (v ?? "").toString().trim();
}

function normalizeHeaderKey(k) {
  return safeStr(k).toLowerCase().replace(/\s+/g, "");
}

function normalizeDayOfWeek(v) {
  const s = safeStr(v).toLowerCase();
  const map = {
    // english
    monday: "monday", mon: "monday",
    tuesday: "tuesday", tue: "tuesday", tues: "tuesday",
    wednesday: "wednesday", wed: "wednesday",
    thursday: "thursday", thu: "thursday", thur: "thursday", thurs: "thursday",
    friday: "friday", fri: "friday",
    saturday: "saturday", sat: "saturday",
    sunday: "sunday", sun: "sunday",

    // russian (если вдруг)
    "пн": "monday", "пон": "monday", "понедельник": "monday",
    "вт": "tuesday", "вторник": "tuesday",
    "ср": "wednesday", "среда": "wednesday",
    "чт": "thursday", "четверг": "thursday",
    "пт": "friday", "пятница": "friday",
    "сб": "saturday", "суббота": "saturday",
    "вс": "sunday", "воскресенье": "sunday",
  };
  return map[s] || s; // если уже норм
}

function normalizeWeekType(v) {
  const s = safeStr(v).toLowerCase();
  if (!s || s === "any") return "any";
  if (s === "both" || s === "all" || s === "every") return "any";
  if (s === "odd" || s === "числ" || s === "числитель") return "odd";
  if (s === "even" || s === "знам" || s === "знаменатель") return "even";
  return s; // на всякий
}

function normalizeType(v) {
  const s = safeStr(v).toLowerCase();
  if (!s) return "";
  if (s === "lecture" || s === "лекция") return "lecture";
  if (s === "seminar" || s === "семинар" || s === "практика") return "seminar";
  return s;
}

function normalizeTime(v) {
  const s = safeStr(v);
  // ждём HH:MM
  // если вдруг "8:00" -> "08:00"
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return s;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  const mm = m[2];
  return `${hh}:${mm}`;
}

function normalizeColor(v) {
  let s = safeStr(v);
  if (!s) return "";
  if (s.startsWith("#")) s = s.slice(1);
  // иногда в csv бывает "FF8FB1 " — ок
  s = s.trim();

  // поддержим короткий #RGB
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[0], g = s[1], b = s[2];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return `#${s}`.toUpperCase();
  }
  // если пришло что-то вроде "pink" — оставим как есть (вдруг это CSS-цвет)
  return v.startsWith("#") ? v : safeStr(v);
}

/**
 * Простой CSV парсер с кавычками.
 * Поддерживает:
 * - запятые в кавычках: "а.304, корпус"
 * - двойные кавычки внутри: "" -> "
 */
export function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    // пропускаем полностью пустые строки
    const isEmpty = row.every(c => safeStr(c) === "");
    if (!isEmpty) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"') {
      // экранированная кавычка
      cell += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      pushCell();
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }

    cell += ch;
  }

  // хвост
  if (cell.length || row.length) {
    pushCell();
    pushRow();
  }

  return rows;
}

/**
 * Главный импорт:
 * вернёт {ok,msg,lessons}
 */
export function importScheduleFromCsv(csvText) {
  const rows = parseCsv(csvText || "");
  if (!rows.length) return { ok: false, msg: "CSV пустой", lessons: [] };

  // header
  const headerRaw = rows[0].map(safeStr);
  const header = headerRaw.map(normalizeHeaderKey);

  // поддержка разных вариантов названий колонок
  const aliases = {
    coursename: ["coursename", "course", "subject", "name"],
    type: ["type", "lessontype", "kind"],
    dayofweek: ["dayofweek", "day", "dow"],
    starttime: ["starttime", "start", "timefrom"],
    endtime: ["endtime", "end", "timeto"],
    weektype: ["weektype", "week", "parity"],
    location: ["location", "room", "aud", "place", "classroom"],
    color: ["color", "colour", "hex"],
  };

  function findIndex(key) {
    const opts = aliases[key] || [key];
    for (const opt of opts) {
      const i = header.indexOf(opt);
      if (i !== -1) return i;
    }
    return -1;
  }

  const idx = {
    courseName: findIndex("coursename"),
    type: findIndex("type"),
    dayOfWeek: findIndex("dayofweek"),
    startTime: findIndex("starttime"),
    endTime: findIndex("endtime"),
    weekType: findIndex("weektype"),
    location: findIndex("location"),
    color: findIndex("color"),
  };

  // courseName обязателен, остальное можно пустым
  if (idx.courseName === -1) {
    return { ok: false, msg: "Нет колонки courseName / coursename", lessons: [] };
  }

  const lessons = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];

    const get = (i) => (i >= 0 ? safeStr(row[i]) : "");

    const courseName = get(idx.courseName);
    if (!courseName) continue;

    const lesson = {
      courseName,
      type: normalizeType(get(idx.type)),
      dayOfWeek: normalizeDayOfWeek(get(idx.dayOfWeek)),
      startTime: normalizeTime(get(idx.startTime)),
      endTime: normalizeTime(get(idx.endTime)),
      weekType: normalizeWeekType(get(idx.weekType)),
      location: get(idx.location),
      color: normalizeColor(get(idx.color)),
    };

    // лёгкая валидация: если день пустой — пропускаем строку, чтобы не ломать расписание
    if (!lesson.dayOfWeek) continue;

    lessons.push(lesson);
  }

  if (!lessons.length) {
    return { ok: false, msg: "Импорт: 0 строк. Проверь dayOfWeek и courseName", lessons: [] };
  }

  return { ok: true, msg: `Импортировано: ${lessons.length}`, lessons };
}
