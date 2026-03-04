// FILE: js/csvParser.js

/* ===============================
   CSV Hash (для защиты от повторного импорта)
================================= */

export async function hash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const buffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(buffer));

  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ===============================
   CSV Line Parser
   поддерживает кавычки
================================= */

function parseLine(line) {
  const result = [];

  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

/* ===============================
   Normalize Row
================================= */

function normalizeRow(row) {
  return {
    courseName: (row[0] || "").trim(),
    type: (row[1] || "").trim().toLowerCase(),
    dayOfWeek: (row[2] || "").trim().toLowerCase(),
    startTime: (row[3] || "").trim(),
    endTime: (row[4] || "").trim(),
    weekType: (row[5] || "both").trim().toLowerCase(),
    location: (row[6] || "").trim(),
    color: (row[7] || "").trim(),
  };
}

/* ===============================
   Main CSV Parser
================================= */

export function parse(text) {
  const lines = text.split(/\r?\n/);

  const lessons = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();

    if (!raw) continue;

    const row = parseLine(raw);

    // пропустить заголовок
    if (i === 0 && row[0] === "courseName") continue;

    const lesson = normalizeRow(row);

    // пропуск полностью пустых строк
    if (!lesson.courseName) continue;

    lessons.push(lesson);
  }

  return lessons;
}