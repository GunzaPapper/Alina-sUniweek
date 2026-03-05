// FILE: csvParser.js
// Robust CSV importer for UniWeek (case-insensitive headers + small variations)
// Exports: importScheduleFromCsv(csvText) -> { ok, msg, lessons }

function safe(v){ return String(v ?? "").trim(); }

function normalizeWeekType(v){
  const s = safe(v).toLowerCase();
  if (!s) return "both";
  if (["both","any","all","-","все"].includes(s)) return "both";
  if (["odd","числ","числитель","1","нечет","нечёт"].includes(s)) return "odd";
  if (["even","знам","знаменатель","2","чет","чёт"].includes(s)) return "even";
  return s;
}

function normalizeColor(v){
  const s = safe(v);
  if (!s) return "";
  const hex = s.startsWith("#") ? s.slice(1) : s;
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return "#" + hex.toUpperCase();
  if (/^[0-9a-fA-F]{3}$/.test(hex)) return "#" + hex.toUpperCase();
  return s;
}

function parseCsv(text){
  // supports quotes; accepts comma or semicolon delimiter; tolerates \r\n
  const rows = [];
  let cur = "", inQ = false;
  const out = [];
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"'){ cur += '"'; i++; continue; }
    if (ch === '"'){ inQ = !inQ; continue; }

    if ((ch === ',' || ch === ';') && !inQ){
      out.push(cur); cur = ''; continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQ){
      if (ch === '\r' && next === '\n') i++;
      out.push(cur); cur = '';
      rows.push(out.slice());
      out.length = 0;
      continue;
    }

    cur += ch;
  }
  if (cur.length || out.length){ out.push(cur); rows.push(out.slice()); }

  return rows
    .map(r => r.map(c => safe(c)))
    .filter(r => r.some(c => c !== ''));
}

function normHeaderKey(s){
  return safe(s).toLowerCase().replace(/\s+/g,'').replace(/[_-]/g,'');
}

function buildHeaderIndex(header){
  const norm = header.map(normHeaderKey);

  const pick = (...aliases) => {
    for (const a of aliases){
      const i = norm.indexOf(normHeaderKey(a));
      if (i !== -1) return i;
    }
    return -1;
  };

  return {
    courseName: pick('courseName','coursename','course','subject','предмет','название'),
    type: pick('type','lessontype','kind','тип'),
    dayOfWeek: pick('dayOfWeek','dayofweek','dow','day','день'),
    startTime: pick('startTime','starttime','start','начало','from'),
    endTime: pick('endTime','endtime','end','конец','to'),
    weekType: pick('weekType','weektype','week','неделя'),
    location: pick('location','room','aud','аудитория','место'),
    color: pick('color','hex','цвет'),
  };
}

export function importScheduleFromCsv(csvText){
  const rows = parseCsv(csvText || '');
  if (!rows.length) return { ok:false, msg:'CSV пустой', lessons: [] };

  const header = rows[0];
  const idx = buildHeaderIndex(header);

  const hardMissing = ['courseName','type','dayOfWeek','startTime','endTime'].filter(k => idx[k] === -1);
  if (hardMissing.length){
    return { ok:false, msg:`Не найдены колонки: ${hardMissing.join(', ')}`, lessons: [] };
  }

  const lessons = [];
  for (let i = 1; i < rows.length; i++){
    const r = rows[i];
    const get = (k) => (idx[k] === -1 ? '' : safe(r[idx[k]]));

    const courseName = get('courseName');
    if (!courseName) continue;

    lessons.push({
      courseName,
      type: get('type').toLowerCase(),
      dayOfWeek: get('dayOfWeek').toLowerCase(),
      startTime: get('startTime'),
      endTime: get('endTime'),
      weekType: normalizeWeekType(get('weekType')),
      location: get('location'),
      color: normalizeColor(get('color')),
    });
  }

  const optionalMissing = ['weekType','location','color'].filter(k => idx[k] === -1);
  const note = optionalMissing.length ? ` (без колонок: ${optionalMissing.join(', ')})` : '';
  return { ok:true, msg:`Импортировано: ${lessons.length}${note}`, lessons };
}
