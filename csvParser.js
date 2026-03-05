// FILE: csvParser.js
// UniWeek — CSV parser + importer
// Поддерживаем формат:
// courseName,teacher,type,dayOfWeek,startTime,endTime,weekType,location,color

const DAY_SET = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
]);

function norm(s) {
  return String(s ?? "").trim();
}

function normLower(s) {
  return norm(s).toLowerCase();
}

function normWeekType(v) {
  const x = normLower(v);
  // допускаем пусто
  if (!x) return "both";
  if (x === "both" || x === "all" || x === "any") return "both";
  if (x === "odd" || x === "нечет" || x === "неч" || x === "числ") return "odd";
  if (x === "even" || x === "чет" || x === "чёт" || x === "знам") return "even";
  // если что-то странное — оставляем both, чтобы не потерять пары
  return "both";
}

function normDayOfWeek(v) {
  const x = normLower(v);
  if (DAY_SET.has(x)) return x;

  // подстраховка для русских (если вдруг)
  const map = {
    "понедельник": "monday",
    "вторник": "tuesday",
    "среда": "wednesday",
    "четверг": "thursday",
    "пятница": "friday",
    "суббота": "saturday",
    "воскресенье": "sunday",
  };
  if (map[x]) return map[x];

  return x; // пусть дальше валидатор решит
}

function normColor(v) {
  let x = norm(v);
  if (!x) return "";
  // если пользователь дал "FF8FB1" — добавим #
  if (/^[0-9a-fA-F]{6}$/.test(x)) return "#" + x.toUpperCase();
  if (/^#[0-9a-fA-F]{6}$/.test(x)) return x.toUpperCase();
  // можно и rgba / именованные — оставим как есть
  return x;
}

/**
 * CSV parser (простая реализация):
 * - разделитель: запятая
 * - строки: \n или \r\n
 * - кавычки: "..." с экранированием "" внутри
 */
export function parseCsv(text) {
  const src = String(text ?? "");
  const rows = [];

  let row = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const nx = src[i + 1];

    if (ch === '"' && nx === '"') {
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
      // handle \r\n
      if (ch === "\r" && nx === "\n") i++;

      row.push(cur);
      cur = "";

      // не добавляем полностью пустые строки
      if (row.some(c => norm(c) !== "")) rows.push(row);

      row = [];
      continue;
    }

    cur += ch;
  }

  // last cell
  if (cur.length || row.length) {
    row.push(cur);
    if (row.some(c => norm(c) !== "")) rows.push(row);
  }

  return rows;
}

/**
 * Импорт расписания из текста CSV
 * @returns { ok:boolean, msg:string, lessons?:Array }
 */
export function importScheduleFromCsvText(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok: false, msg: "CSV пустой" };

  // header
  const header = rows[0].map(h => norm(h));
  const findIdx = (name) => header.findIndex(h => h === name);

  // поддерживаем оба варианта courseName/coursename и т.п.
  const alias = {
    courseName: ["courseName", "coursename", "course", "subject"],
    teacher: ["teacher", "prof", "professor", "prepod", "lecturer"],
    type: ["type"],
    dayOfWeek: ["dayOfWeek", "dayofweek", "day"],
    startTime: ["startTime", "starttime", "start"],
    endTime: ["endTime", "endtime", "end"],
    weekType: ["weekType", "weektype", "week"],
    location: ["location", "room", "aud", "place"],
    color: ["color", "hex", "colour"],
  };

  const idx = {};
  for (const key of Object.keys(alias)) {
    const names = alias[key];
    let found = -1;
    for (const nm of names) {
      found = findIdx(nm);
      if (found !== -1) break;
    }
    idx[key] = found;
  }

  const required = ["courseName", "type", "dayOfWeek", "startTime", "endTime", "weekType", "location", "color"];
  // teacher НЕ обязателен, но желателен
  for (const k of required) {
    if (idx[k] === -1) return { ok:false, msg:`Нет колонки: ${k}` };
  }

  const lessons = [];
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const get = (k) => (idx[k] === -1 ? "" : norm(line[idx[k]]));

    const courseName = get("courseName");
    if (!courseName) continue;

    const teacher = get("teacher");
    const type = normLower(get("type")); // lecture/seminar/...
    const dayOfWeek = normDayOfWeek(get("dayOfWeek"));
    const startTime = get("startTime");
    const endTime = get("endTime");
    const weekType = normWeekType(get("weekType"));
    const location = get("location");
    const color = normColor(get("color"));

    // базовая валидация
    if (!DAY_SET.has(dayOfWeek)) {
      errors.push(`Строка ${r + 1}: неверный dayOfWeek = "${dayOfWeek}"`);
      continue;
    }
    if (!startTime || !endTime) {
      errors.push(`Строка ${r + 1}: нет времени`);
      continue;
    }

    lessons.push({
      courseName,
      teacher,      // <- новое поле
      type,
      dayOfWeek,
      startTime,
      endTime,
      weekType,     // odd/even/both
      location,
      color,
    });
  }

  if (!lessons.length) {
    return {
      ok: false,
      msg: errors.length
        ? `Не удалось импортировать. Ошибки:\n- ${errors.slice(0, 6).join("\n- ")}`
        : "Не удалось импортировать: нет валидных строк"
    };
  }

  const msg = errors.length
    ? `Импортировано: ${lessons.length}. Есть ошибки в некоторых строках (первые):\n- ${errors.slice(0, 6).join("\n- ")}`
    : `Импортировано: ${lessons.length}`;

  return { ok: true, msg, lessons };
}
