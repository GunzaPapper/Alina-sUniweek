// csvParser.js (CORE)
// Экспорт: importScheduleFromCsv(csvText) -> { ok:boolean, msg:string, lessons?:Array }
// Формат lesson:
// { courseName, type, dayOfWeek, startTime, endTime, weekType, location, color }

function stripBom(s) {
  if (!s) return s;
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("_", "")
    .replaceAll("-", "");
}

function normalizeDay(v) {
  const s = String(v || "").trim().toLowerCase();
  // ожидаем английские: monday..sunday
  // + русские короткие/длинные на всякий
  const map = {
    "monday": "monday", "mon": "monday", "пн": "monday", "пон": "monday", "понедельник": "monday",
    "tuesday": "tuesday", "tue": "tuesday", "вт": "tuesday", "втор": "tuesday", "вторник": "tuesday",
    "wednesday": "wednesday", "wed": "wednesday", "ср": "wednesday", "среда": "wednesday",
    "thursday": "thursday", "thu": "thursday", "чт": "thursday", "чет": "thursday", "четверг": "thursday",
    "friday": "friday", "fri": "friday", "пт": "friday", "пят": "friday", "пятница": "friday",
    "saturday": "saturday", "sat": "saturday", "сб": "saturday", "суб": "saturday", "суббота": "saturday",
    "sunday": "sunday", "sun": "sunday", "вс": "sunday", "воскр": "sunday", "воскресенье": "sunday",
  };
  return map[s] || s; // если уже корректно — вернётся как есть
}

function normalizeWeekType(v) {
  const s = String(v || "").trim().toLowerCase();

  // поддержка разных вариантов
  if (!s || s === "any" || s === "all") return "any";
  if (s === "both" || s === "every") return "any";

  // русские
  if (s.includes("числ") || s === "odd" || s === "1") return "odd";
  if (s.includes("знам") || s === "even" || s === "2") return "even";

  // если прислали "odd/even"
  if (s === "odd") return "odd";
  if (s === "even") return "even";

  // fallback
  return s;
}

function normalizeType(v) {
  const s = String(v || "").trim().toLowerCase();
  // lecture/seminar/other
  if (s === "лекция") return "lecture";
  if (s === "семинар" || s === "практика") return "seminar";
  return s || "other";
}

function normalizeColor(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  // допускаем "FF8FB1" без #
  if (/^[0-9a-fA-F]{6}$/.test(s)) return "#" + s;
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return s; // пусть будет как есть (м.б. css color)
}

// Простой CSV-парсер с поддержкой кавычек
function parseCsv(text) {
  const t = stripBom(String(text || ""));
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const next = t[i + 1];

    if (ch === '"' && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQ = !inQ;
      continue;
    }

    if (ch === "," && !inQ) {
      row.push(cur);
      cur = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      // чистим пустые строки
      if (row.some(c => String(c).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    cur += ch;
  }

  if (cur.length || row.length) {
    row.push(cur);
    if (row.some(c => String(c).trim() !== "")) rows.push(row);
  }

  return rows;
}

function buildIndex(headerRow) {
  const map = new Map();
  headerRow.forEach((h, idx) => {
    const key = normalizeHeader(h);
    if (!key) return;
    if (!map.has(key)) map.set(key, idx);
  });
  return map;
}

function getCell(row, idxMap, ...names) {
  for (const n of names) {
    const key = normalizeHeader(n);
    const idx = idxMap.get(key);
    if (idx !== undefined) return (row[idx] ?? "").toString().trim();
  }
  return "";
}

export function importScheduleFromCsv(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok: false, msg: "CSV пустой или не распознан" };

  const header = rows[0].map(x => String(x ?? "").trim());
  const idx = buildIndex(header);

  // принимаем варианты заголовков
  const lessons = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    const courseName = getCell(r, idx, "courseName", "coursename", "course", "subject", "name");
    if (!courseName) continue;

    const type = normalizeType(getCell(r, idx, "type"));
    const dayOfWeek = normalizeDay(getCell(r, idx, "dayOfWeek", "day", "weekday", "dayofweek"));
    const startTime = getCell(r, idx, "startTime", "start", "starttime");
    const endTime = getCell(r, idx, "endTime", "end", "endtime");
    const weekTypeRaw = getCell(r, idx, "weekType", "week", "weektype");
    const weekType = normalizeWeekType(weekTypeRaw);
    const location = getCell(r, idx, "location", "room", "aud", "place");
    const color = normalizeColor(getCell(r, idx, "color", "colour"));

    // минимальная валидация
    if (!dayOfWeek) continue;

    lessons.push({
      courseName,
      type,
      dayOfWeek,
      startTime,
      endTime,
      weekType,   // "odd" | "even" | "any"
      location,
      color,
    });
  }

  if (!lessons.length) {
    return {
      ok: false,
      msg: "Импорт: 0 строк. Проверь: dayOfWeek (monday..sunday) и заголовки колонок.",
      lessons: []
    };
  }

  return {
    ok: true,
    msg: `Импортировано: ${lessons.length}`,
    lessons
  };
}
