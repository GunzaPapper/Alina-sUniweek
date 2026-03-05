// notes.js (SECONDARY, safe)
// Работает с существующим index.html из "основы":
// - #screenNotes
// - #noteCreateBtn, #notesSearch, #notesList, #noteEditorCard
// Ничего не ломает, даже если не вызывается.

const $ = (sel, root = document) => root.querySelector(sel);

const LS_NOTES = "uniweek_notes_v1";

let mounted = false;
let currentId = null;

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function loadNotes() {
  const raw = localStorage.getItem(LS_NOTES);
  const arr = raw ? safeJsonParse(raw, []) : [];
  return Array.isArray(arr) ? arr : [];
}
function saveNotes(notes) {
  localStorage.setItem(LS_NOTES, JSON.stringify(notes));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function nowIso() { return new Date().toISOString(); }

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function ensureEditorMarkup() {
  const card = $("#noteEditorCard");
  if (!card) return;

  // Если уже создан — не трогаем
  if (card.dataset.ready === "1") return;

  card.innerHTML = `
    <div class="cardHeader">
      <button class="chipBtn" id="noteBackBtn" type="button">← Назад</button>
      <div class="cardTitle" id="noteEditorTitle">Заметка</div>
      <div class="cardHint" id="noteEditorHint">—</div>
    </div>

    <div class="noteEditor">
      <div class="row">
        <input class="input" id="noteTitleInput" placeholder="Заголовок" />
        <button class="btn btn--secondary" id="notePinBtn" type="button" title="Закрепить">📌</button>
      </div>

      <div class="row">
        <select class="input" id="noteColorSelect" aria-label="Цвет заметки">
          <option value="pink">Розовый</option>
          <option value="peach">Персик</option>
          <option value="lavender">Лаванда</option>
          <option value="mint">Мята</option>
          <option value="gray">Нейтральный</option>
        </select>

        <button class="btn btn--danger" id="noteDeleteBtn" type="button">Удалить</button>
      </div>

      <textarea class="textarea" id="noteBodyInput" placeholder="Текст… (автосейв)"></textarea>
      <div class="empty__text" style="margin-top:6px; opacity:.85;">Автосейв включён ✨</div>
    </div>
  `;

  card.dataset.ready = "1";
}

function getEditorEls() {
  return {
    editorCard: $("#noteEditorCard"),
    backBtn: $("#noteBackBtn"),
    titleInput: $("#noteTitleInput"),
    bodyInput: $("#noteBodyInput"),
    pinBtn: $("#notePinBtn"),
    colorSelect: $("#noteColorSelect"),
    deleteBtn: $("#noteDeleteBtn"),
    hint: $("#noteEditorHint"),
    title: $("#noteEditorTitle"),
  };
}

function setEditorVisible(visible) {
  const editorCard = $("#noteEditorCard");
  if (!editorCard) return;
  editorCard.classList.toggle("hidden", !visible);
}

function getListCard() {
  // В твоём HTML карточка списка — это первая .card внутри #screenNotes
  const screen = $("#screenNotes");
  if (!screen) return null;
  const cards = screen.querySelectorAll(".card");
  return cards?.[0] || null;
}

function setListVisible(visible) {
  const listCard = getListCard();
  if (!listCard) return;
  listCard.classList.toggle("hidden", !visible);
}

function applyNoteColorClass(noteRowEl, color) {
  noteRowEl.classList.remove(
    "noteColor--pink",
    "noteColor--peach",
    "noteColor--lavender",
    "noteColor--mint",
    "noteColor--gray"
  );
  if (color) noteRowEl.classList.add(`noteColor--${color}`);
}

function renderList() {
  const list = $("#notesList");
  if (!list) return;

  const q = ($("#notesSearch")?.value || "").trim().toLowerCase();
  const notes = loadNotes();

  let filtered = notes;
  if (q) {
    filtered = notes.filter(n => {
      const t = (n.title || "").toLowerCase();
      const b = (n.body || "").toLowerCase();
      return t.includes(q) || b.includes(q);
    });
  }

  // pinned first, then updated desc
  filtered.sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет заметок 💗</div>
        <div class="empty__text">Нажми «Новая», чтобы создать первую.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(n => {
    const title = n.title?.trim() || "Без названия";
    const preview = (n.body || "").trim().slice(0, 140);
    const date = fmtDate(n.updatedAt || n.createdAt);
    const pin = n.pinned ? "📌 " : "";
    return `
      <div class="noteRow ${n.color ? `noteColor--${esc(n.color)}` : ""}" data-id="${esc(n.id)}">
        <div class="noteRow__top">
          <div class="noteRow__title">${pin}${esc(title)}</div>
          <div class="noteRow__date">${esc(date)}</div>
        </div>
        <div class="noteRow__preview">${esc(preview || "…")}</div>
      </div>
    `;
  }).join("");

  // bind open
  list.querySelectorAll(".noteRow").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.getAttribute("data-id");
      if (!id) return;
      openEditor(id);
    });
  });
}

function openEditor(id) {
  ensureEditorMarkup();
  const els = getEditorEls();
  if (!els.editorCard) return;

  const notes = loadNotes();
  const note = notes.find(n => n.id === id);
  if (!note) return;

  currentId = id;

  setListVisible(false);
  setEditorVisible(true);

  els.title.textContent = "Заметка";
  els.hint.textContent = note.pinned ? "Закреплена 📌" : "—";
  els.titleInput.value = note.title || "";
  els.bodyInput.value = note.body || "";
  els.colorSelect.value = note.color || "pink";

  // красивое “ощущение” цвета (класс на карточку редактора)
  applyNoteColorClass(els.editorCard, note.color || "pink");
}

function closeEditor() {
  currentId = null;
  setEditorVisible(false);
  setListVisible(true);
  renderList();
}

function upsertCurrentFromEditor() {
  const els = getEditorEls();
  if (!currentId || !els.titleInput || !els.bodyInput || !els.colorSelect) return;

  const notes = loadNotes();
  const idx = notes.findIndex(n => n.id === currentId);
  if (idx === -1) return;

  const prev = notes[idx];
  const updated = {
    ...prev,
    title: String(els.titleInput.value || "").trim(),
    body: String(els.bodyInput.value || ""),
    color: String(els.colorSelect.value || "pink"),
    updatedAt: nowIso(),
  };

  notes[idx] = updated;
  saveNotes(notes);

  // обновим hint + цвет
  const hint = $("#noteEditorHint");
  if (hint) hint.textContent = updated.pinned ? "Закреплена 📌" : "—";
  applyNoteColorClass(els.editorCard, updated.color);
}

function togglePin() {
  if (!currentId) return;
  const notes = loadNotes();
  const idx = notes.findIndex(n => n.id === currentId);
  if (idx === -1) return;

  notes[idx].pinned = !notes[idx].pinned;
  notes[idx].updatedAt = nowIso();
  saveNotes(notes);

  const hint = $("#noteEditorHint");
  if (hint) hint.textContent = notes[idx].pinned ? "Закреплена 📌" : "—";
  renderList();
}

function deleteCurrent() {
  if (!currentId) return;
  const notes = loadNotes();
  const idx = notes.findIndex(n => n.id === currentId);
  if (idx === -1) return;

  const ok = confirm("Удалить заметку?");
  if (!ok) return;

  notes.splice(idx, 1);
  saveNotes(notes);
  closeEditor();
}

function createNew() {
  const notes = loadNotes();
  const id = uid();
  const n = {
    id,
    title: "",
    body: "",
    color: "pink",
    pinned: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  notes.unshift(n);
  saveNotes(notes);
  renderList();
  openEditor(id);
}

function bindOnce() {
  if (mounted) return;
  mounted = true;

  ensureEditorMarkup();

  $("#noteCreateBtn")?.addEventListener("click", () => createNew());
  $("#notesSearch")?.addEventListener("input", () => renderList());

  const els = getEditorEls();

  els.backBtn?.addEventListener("click", () => closeEditor());
  els.deleteBtn?.addEventListener("click", () => deleteCurrent());
  els.pinBtn?.addEventListener("click", () => togglePin());

  // автосейв
  let t = null;
  const debounceSave = () => {
    clearTimeout(t);
    t = setTimeout(() => upsertCurrentFromEditor(), 200);
  };

  els.titleInput?.addEventListener("input", debounceSave);
  els.bodyInput?.addEventListener("input", debounceSave);
  els.colorSelect?.addEventListener("change", () => {
    upsertCurrentFromEditor();
  });

  // первый рендер
  setEditorVisible(false);
  setListVisible(true);
  renderList();
}

/**
 * Вызови эту функцию из app.js когда хочешь активировать заметки.
 * Можно просто один раз при старте — ничего не сломает.
 */
export function initNotes() {
  bindOnce();
}

/**
 * Удобно вызывать при открытии вкладки "Заметки".
 */
export function openNotes() {
  bindOnce();
  setEditorVisible(false);
  setListVisible(true);
  renderList();
}
