// FILE: csvParser.js
// Exports: importScheduleFromCsv(csvText) -> { ok, msg, lessons }

function safe(s){ return String(s ?? "").trim(); }

function parseCsv(text){
  // CSV with quotes support
  const rows = [];
  let cur = "";
  let inQ = false;
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
  return rows.filter(r => r.some(c => safe(c) !== ""));
}

function normalizeHeader(h){
  const x = safe(h).toLowerCase();
  // accept variants
  if (x === "coursename") return "courseName";
  if (x === "course_name") return "courseName";
  if (x === "dayofweek") return "dayOfWeek";
  if (x === "starttime") return "startTime";
  if (x === "endtime") return "endTime";
  if (x === "weektype") return "weekType";
  return h; // keep original if already proper
}

function normalizeWeekType(v){
  const x = safe(v).toLowerCase();
  if (!x) return "both";
  if (x === "both" || x === "any") return "both";
  if (x === "odd") return "odd";
  if (x === "even") return "even";
  return "both";
}

function normalizeColor(v){
  let x = safe(v);
  if (!x) return "";
  // allow "FF8FB1" or "#FF8FB1"
  if (/^[0-9a-fA-F]{6}$/.test(x)) x = "#" + x;
  if (/^#[0-9a-fA-F]{6}$/.test(x)) return x;
  return x; // if user uses named colors, keep
}

export function importScheduleFromCsv(csvText){
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok:false, msg:"CSV пустой", lessons: [] };

  const rawHeader = rows[0].map(x => safe(x));
  const header = rawHeader.map(normalizeHeader);

  const idx = (name) => header.findIndex(h => h === name);

  const required = ["courseName","type","dayOfWeek","startTime","endTime","weekType","location","color"];
  for (const k of required) {
    if (idx(k) === -1) {
      return { ok:false, msg:`Нет колонки: ${k}. В заголовке должно быть courseName,type,dayOfWeek,startTime,endTime,weekType,location,color`, lessons: [] };
    }
  }

  const lessons = [];
  for (let i = 1; i < rows.length; i++){
    const r = rows[i];
    const get = (k) => safe(r[idx(k)]);

    const courseName = get("courseName");
    if (!courseName) continue;

    lessons.push({
      courseName,
      type: get("type").toLowerCase(),
      dayOfWeek: get("dayOfWeek").toLowerCase(),
      startTime: get("startTime"),
      endTime: get("endTime"),
      weekType: normalizeWeekType(get("weekType")),
      location: get("location"),
      color: normalizeColor(get("color")),
    });
  }

  return { ok:true, msg:`Импортировано: ${lessons.length}`, lessons };
}
