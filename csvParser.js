// csvParser.js (CORE)
// Принимает CSV с колонками:
// courseName,type,dayOfWeek,startTime,endTime,weekType,location,color
// Возвращает { ok, msg, lessons }

function parseCsv(text) {
  // простой CSV с кавычками
  const rows = [];
  let cur = "", inQ = false;
  const out = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQ = !inQ; continue; }

    if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }

    if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && next === "\n") i++;
      out.push(cur); cur = "";
      rows.push(out.slice());
      out.length = 0;
      continue;
    }

    cur += ch;
  }

  if (cur.length || out.length) { out.push(cur); rows.push(out.slice()); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .replaceAll(" ", "")
    .toLowerCase();
}

export function importScheduleFromCsv(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok: false, msg: "CSV пустой", lessons: [] };

  const headerRaw = rows[0];
  const header = headerRaw.map(normalizeHeader);

  // поддержим и твой вариант, и “слитный” (coursename -> courseName)
  const idx = (name) => header.indexOf(normalizeHeader(name));

  const needed = ["courseName","type","dayOfWeek","startTime","endTime","weekType","location","color"];
  for (const k of needed) {
    if (idx(k) === -1) {
      return { ok: false, msg: `Нет колонки: ${k}`, lessons: [] };
    }
  }

  const lessons = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (k) => (r[idx(k)] ?? "").toString().trim();

    const courseName = get("courseName");
    if (!courseName) continue;

    lessons.push({
      courseName,
      type: get("type"),
      dayOfWeek: get("dayOfWeek").toLowerCase(),
      startTime: get("startTime"),
      endTime: get("endTime"),
      weekType: get("weekType").toLowerCase(), // odd/even/both
      location: get("location"),
      color: get("color"),
    });
  }

  return { ok: true, msg: `Импортировано: ${lessons.length}`, lessons };
}
