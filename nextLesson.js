// FILE: nextLesson.js
// Next lesson card renderer
// Exports: renderNextLessonInto({ cardEl, selectedDate, schedule, subjectColors, getWeekType })

import { splitCourseName } from './schedule.js';

function esc(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}
function pad2(n){ return String(n).padStart(2,'0'); }
function formatTime(t){ return String(t || '').trim(); }

function lessonMatchesDate(lesson, date, getWeekType){
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dow = dayNames[date.getDay()];
  const wt = getWeekType(date);
  const lt = String(lesson.weekType || '').toLowerCase().trim();
  const okWeek = !lt || lt === 'any' || lt === 'both' || lt === wt;
  const okDay = String(lesson.dayOfWeek || '').toLowerCase().trim() === dow;
  return okDay && okWeek;
}

export function renderNextLessonInto({ cardEl, selectedDate, schedule, subjectColors, getWeekType }){
  if (!cardEl) return;

  const items = (Array.isArray(schedule) ? schedule : [])
    .filter(l => lessonMatchesDate(l, selectedDate, getWeekType))
    .sort((a,b) => formatTime(a.startTime).localeCompare(formatTime(b.startTime)));

  const now = new Date();
  const sameDay =
    now.getFullYear() === selectedDate.getFullYear() &&
    now.getMonth() === selectedDate.getMonth() &&
    now.getDate() === selectedDate.getDate();

  if (!sameDay || !items.length){
    cardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">${sameDay ? 'Сегодня пар нет 💗' : 'Выбери сегодняшний день, чтобы увидеть следующую пару'}</div>
      </div>
    `;
    return;
  }

  const cur = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const next = items.find(x => formatTime(x.endTime) > cur) || null;

  if (!next){
    cardEl.innerHTML = `
      <div class="nextLesson">
        <div class="nextLesson__title">Следующая пара</div>
        <div class="nextLesson__text">На сегодня всё 💗</div>
      </div>
    `;
    return;
  }

  const { title, teacher } = splitCourseName(next.courseName);
  const color = next.color || (subjectColors?.[next.courseName]) || (subjectColors?.[title]) || '#F7A8C6';

  cardEl.innerHTML = `
    <div class="nextLesson">
      <div class="nextLesson__title">Следующая пара</div>
      <div class="nextLesson__row">
        <div style="font-weight:900">${esc(title || '—')}</div>
        <div style="color:rgba(42,31,37,.7); font-weight:800">${esc(formatTime(next.startTime))}–${esc(formatTime(next.endTime))}</div>
      </div>
      <div class="nextLesson__text">${teacher ? `👩‍🏫 ${esc(teacher)} • ` : ''}${esc(next.location || '')}</div>
      <div class="progressBar" aria-hidden="true"><div style="width:100%; background:${esc(color)}"></div></div>
    </div>
  `;
}
