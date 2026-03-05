// FILE: schedule.js
// Rendering + helpers for schedule cards
// Exports:
//  - splitCourseName(courseName) -> { title, teacher }
//  - lessonMatchesDate(lesson, date, getWeekType)
//  - renderScheduleInto({ listEl, hintEl, selectedDate, schedule, subjectColors, getWeekType })

function esc(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function formatTime(t){ return String(t || '').trim(); }

export function splitCourseName(raw){
  const s = String(raw || '').trim();
  const parts = s.split(/\s*[—-]\s*/); // " — " or " - "
  if (parts.length >= 2){
    const title = parts[0].trim();
    const teacher = parts.slice(1).join(' — ').trim();
    return { title, teacher };
  }
  return { title: s, teacher: '' };
}

export function lessonMatchesDate(lesson, date, getWeekType){
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dow = dayNames[date.getDay()];
  const wt = getWeekType(date);
  const lt = String(lesson.weekType || '').toLowerCase().trim();

  const okWeek = !lt || lt === 'any' || lt === 'both' || lt === wt;
  const okDay = String(lesson.dayOfWeek || '').toLowerCase().trim() === dow;

  return okDay && okWeek;
}

function typeLabel(type){
  const t = String(type || '').toLowerCase();
  if (t === 'lecture') return '🎓 Лекция';
  if (t === 'seminar') return '📝 Семинар';
  return '📌 Занятие';
}

function pill(text){
  return `<span class="pill">${text}</span>`;
}

export function renderScheduleInto({ listEl, hintEl, selectedDate, schedule, subjectColors, getWeekType }){
  if (!listEl || !hintEl) return;

  const items = (Array.isArray(schedule) ? schedule : [])
    .filter(l => lessonMatchesDate(l, selectedDate, getWeekType))
    .sort((a,b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));

  hintEl.textContent = items.length ? `${items.length} шт.` : 'Пока пусто — импортируй CSV в Настройках';

  if (!items.length){
    listEl.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет пар на этот день 💗</div>
        <div class="empty__text">Зайди в «Настройки» → «Импорт CSV» и выбери файл расписания.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map(l => {
    const { title, teacher } = splitCourseName(l.courseName);
    const color = l.color || (subjectColors?.[l.courseName]) || (subjectColors?.[title]) || '#F7A8C6';

    const meta = [];
    if (teacher) meta.push(pill(`👩‍🏫 ${esc(teacher)}`));
    if (l.location) meta.push(pill(`📍 ${esc(l.location)}`));
    if (l.weekType && l.weekType !== 'both') meta.push(pill(`📅 ${esc(l.weekType)}`));

    return `
      <div class="lessonCard">
        <div class="lessonStripe" style="background:${esc(color)}"></div>
        <div class="lessonBody">
          <div class="lessonTop">
            <div class="lessonTime">${esc(formatTime(l.startTime))}–${esc(formatTime(l.endTime))}</div>
            <div class="lessonType">${esc(typeLabel(l.type))}</div>
          </div>
          <div class="lessonName">${esc(title || '—')}</div>
          <div class="lessonMeta">${meta.join('')}</div>
        </div>
      </div>
    `;
  }).join('');
}
