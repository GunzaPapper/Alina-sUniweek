// FILE: csvParser.js
// UniWeek — robust CSV import for schedule
// Exports function expected by app.js:
//   importScheduleFromCsv(csvText) -> { ok, msg, lessons }

const DAY_ALIASES = new Map([
  // EN
  ["monday", "monday"],
  ["tuesday", "tuesday"],
  ["wednesday", "wednesday"],
  ["thursday", "thursday"],
  ["friday", "friday"],
  ["saturday", "saturday"],
  ["sunday", "sunday"],

  // RU short
  ["пн", "monday"],
  ["вт", "tuesday"],
  ["ср", "wednesday"],
  ["чт", "thursday"],
  ["пт", "friday"],
  ["сб", "saturday"],
  ["вс", "sunday"],

  // RU full
  ["понедельник", "monday"],
  ["вторник", "tuesday"],
  ["среда", "wednesday"],
  ["четверг", "thursday"],
  ["пятница", "friday"],
  ["суббота", "saturday"],
  ["воскресенье", "sunday"],
]);

function normStr(v) {
  return String(v ?? "").trim();
}
function normLower(v) {
  return normStr(v).toLowerCase();
}

function normalizeDay(v) {
  const key = normLower(v);
  return DAY_ALIASES.get(key) || key;
}

function normalizeWeekType(v) {
  const s = normLower(v);
  if (!s) return "both";

  // both/any
  if (["both", "any", "all", "every", "все", "оба"].includes(s)) return "both";

  // odd
  if (
    s === "odd" ||
    s === "1" ||
    s.includes("числ") ||
    s.includes("numerator")
  ) return "odd";

  // even
  if (
    s === "even" ||
    s === "2" ||
    s.includes("знам") ||
    s.includes("denominator")
  ) return "even";

  // fallback: keep, but app will likely treat unknown as both
  return s;
}

function normalizeTime(v) {
  return normStr(v);
}

function normalizeColor(v) {
  const s = normStr(v);
  if (!s) return "";
  const hex = s.startsWith("#") ? s.slice(1) : s;
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return "#" + hex.toUpperCase();
  if (/^[0-9a-fA-F]{3}$/.test(hex)) return "#" + hex.toUpperCase();
  return s;
}

/** CSV tokenizer supporting quotes and escaped quotes */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    const cleaned = row.map(c => String(c ?? "").trim());
    if (cleaned.some(c => c !== "")) rows.push(cleaned);
    row = [];
  };

  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];

    // escaped quote
    if (ch === '"' && inQ && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      pushCell();
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cur += ch;
  }

  if (cur.length || row.length) {
    pushCell();
    pushRow();
  }
  return rows;
}

function headerIndexMap(headerRow) {
  const map = new Map();
  headerRow.forEach((h, idx) => {
    const key = normLower(h).replace(/\s+/g, "");
    if (key) map.set(key, idx);
  });
  return map;
}

function getCell(row, idxMap, keys) {
  for (const k of keys) {
    const kk = normLower(k).replace(/\s+/g, "");
    if (idxMap.has(kk)) {
      const idx = idxMap.get(kk);
      return normStr(row[idx]);
    }
  }
  return "";
}

/**
 * Expected columns:
 * courseName,type,dayOfWeek,startTime,endTime,weekType,location,color
 * (also accepts lowercase variations)
 */
export function importScheduleFromCsv(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok: false, msg: "CSV пустой", lessons: [] };

  const header = rows[0];
  const idxMap = headerIndexMap(header);

  const required = [
    ["courseName", "coursename"],
    ["type"],
    ["dayOfWeek", "dayofweek"],
    ["startTime", "starttime"],
    ["endTime", "endtime"],
    ["weekType", "weektype"],
    ["location"],
    ["color"],
  ];

  for (const variants of required) {
    const has = variants.some(v => idxMap.has(normLower(v).replace(/\s+/g, "")));
    if (!has) return { ok: false, msg: `Нет колонки: ${variants[0]}`, lessons: [] };
  }

  const lessons = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const courseName = getCell(row, idxMap, ["courseName", "coursename"]);
    if (!courseName) continue;

    lessons.push({
      courseName,
      type: normLower(getCell(row, idxMap, ["type"])),
      dayOfWeek: normalizeDay(getCell(row, idxMap, ["dayOfWeek", "dayofweek"])),
      startTime: normalizeTime(getCell(row, idxMap, ["startTime", "starttime"])),
      endTime: normalizeTime(getCell(row, idxMap, ["endTime", "endtime"])),
      weekType: normalizeWeekType(getCell(row, idxMap, ["weekType", "weektype"])),
      location: getCell(row, idxMap, ["location"]),
      color: normalizeColor(getCell(row, idxMap, ["color"])),
    });
  }

  if (!lessons.length) {
    return { ok: false, msg: "Не найдено ни одной строки (проверь courseName)", lessons: [] };
  }

  return { ok: true, msg: `Импортировано: ${lessons.length}`, lessons };
}
