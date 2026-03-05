// notes.js (FULL)
// Экран "Заметки": список + поиск + редактор + автосейв + закрепление + цвета + чеклист
// Ожидает элементы из index.html:
// notesList, notesSearch, noteCreateBtn, noteEditorCard, noteBackBtn,
// noteTitleInput, noteBodyInput, notePinBtn, noteDeleteBtn,
// noteColorSelect, noteChecklistToggle, noteChecklist, checklistAddItemBtn
//
// Использует localStorage key: "uniweek_notes_v1"

const LS_NOTES = "uniweek_notes_v1";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function uid() {
  return "n_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadNotes() {
  const raw = localStorage.getItem(LS_NOTES);
  const notes = raw ? safeJsonParse(raw, []) : [];
  return Array.isArray(notes) ? notes : [];
}

function saveNotes(notes) {
  localStorage.setItem(LS_NOTES, JSON.stringify(notes));
}

function normalizeNote(n) {
  return {
    id: n.id || uid(),
    title: String(n.title || "").slice(0, 120),
    body: String(n.body || ""),
    pinned: !!n.pinned,
    color: n.color || "pink", // pink|peach|lavender|mint|gray
    checklistEnabled: !!n.checklistEnabled,
    checklist: Array.isArray(n.checklist) ? n.checklist.map(x => ({
      id: x.id || uid(),
      text: String(x.text || "").slice(0, 160),
      done: !!x.done
    })) : [],
    createdAt: n.createdAt || nowISO(),
    updatedAt: n.updatedAt || nowISO(),
  };
}

function sortNotes(notes) {
  // pinned first, then updated desc
  return notes.slice().sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
}

let stateLocal = {
  notes: [],
  activeId: null,
  search: "",
  autosaveTimer: null,
  bound: false,
};

function getActiveNote() {
  return stateLocal.notes.find(n => n.id === stateLocal.activeId) || null;
}

function setActive(id) {
  stateLocal.activeId = id;
  renderEditor();
}

function setEditorVisible(visible) {
  const editor = $("#noteEditorCard");
  if (!editor) return;
  editor.classList.toggle("hidden", !visible);
}

function setListVisible(visible) {
  // список — это первая card на экране notes (в твоём html это просто card с notesList)
  // мы не ищем её по id, поэтому скрываем "editor" и оставляем список всегда видимым.
  // Но чтобы UX был как "внутри экрана", можно скрывать список через main-контейнер:
  // Здесь сделаем мягко: просто скролл к верху, и editor показываем/прячем.
  if (visible) {
    // ничего
  }
}

function createEmptyNote() {
  const n = normalizeNote({
    id: uid(),
    title: "",
    body: "",
    pinned: false,
    color: "pink",
    checklistEnabled: false,
    checklist: [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
  stateLocal.notes.unshift(n);
  saveNotes(stateLocal.notes);
  setActive(n.id);
  setEditorVisible(true);
  renderList();
}

function deleteActiveNote() {
  const n = getActiveNote();
  if (!n) return;
  if (!confirm("Удалить заметку?")) return;

  stateLocal.notes = stateLocal.notes.filter(x => x.id !== n.id);
  saveNotes(stateLocal.notes);
  stateLocal.activeId = null;
  setEditorVisible(false);
  renderList();
}

function updateActive(patch) {
  const n = getActiveNote();
  if (!n) return;
  Object.assign(n, patch);
  n.updatedAt = nowISO();
  saveNotes(stateLocal.notes);
  renderList(); // чтобы обновить превью/дату/закрепление
}

function scheduleAutosave(fn) {
  if (stateLocal.autosaveTimer) clearTimeout(stateLocal.autosaveTimer);
  stateLocal.autosaveTimer = setTimeout(() => {
    stateLocal.autosaveTimer = null;
    fn();
  }, 250);
}

function renderList() {
  const list = $("#notesList");
  const search = (stateLocal.search || "").trim().toLowerCase();

  if (!list) return;

  const notes = sortNotes(stateLocal.notes).filter(n => {
    if (!search) return true;
    const hay = (n.title + "\n" + n.body).toLowerCase();
    return hay.includes(search);
  });

  if (!notes.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__title">Пока нет заметок 💗</div>
        <div class="empty__text">Нажми «Новая», чтобы создать первую.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = notes.map(n => {
    const title = n.title?.trim() ? n.title.trim() : "Без названия";
    const preview = (n.body || "").trim().slice(0, 120);
    const pin = n.pinned ? "📌" : "";
    const cls = `noteRow noteColor--${esc(n.color || "pink")}`;

    return `
      <div class="${cls}" data-note="${esc(n.id)}" role="button" tabindex="0" aria-label="Открыть заметку">
        <div class="noteRow__top">
          <div class="noteRow__title">${pin} ${esc(title)}</div>
          <div class="noteRow__date">${esc(formatDate(n.updatedAt))}</div>
        </div>
        <div class="noteRow__preview">${esc(preview || "…")}</div>
      </div>
    `;
  }).join("");

  $$(".noteRow", list).forEach(row => {
    const open = () => {
      const id = row.getAttribute("data-note");
      if (!id) return;
      setActive(id);
      setEditorVisible(true);
      // мягкий скролл к редактору
      $("#noteEditorCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    row.addEventListener("click", open);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

function renderEditor() {
  const n = getActiveNote();

  const titleInput = $("#noteTitleInput");
  const bodyInput = $("#noteBodyInput");
  const pinBtn = $("#notePinBtn");
  const colorSelect = $("#noteColorSelect");
  const hint = $("#noteEditorHint");

  const checklistToggle = $("#noteChecklistToggle");
  const checklistRoot = $("#noteChecklist");
  const addItemBtn = $("#checklistAddItemBtn");

  if (!n) {
    // нечего редактировать
    if (hint) hint.textContent = "";
    return;
  }

  if (titleInput) titleInput.value = n.title || "";
  if (bodyInput) bodyInput.value = n.body || "";

  if (pinBtn) {
    pinBtn.textContent = n.pinned ? "📌" : "📌";
    pinBtn.title = n.pinned ? "Открепить" : "Закрепить";
  }

  if (colorSelect) colorSelect.value = n.color || "pink";
  if (hint) hint.textContent = `Обновлено: ${formatDate(n.updatedAt)}`;

  // checklist
  const enabled = !!n.checklistEnabled;
  checklistRoot?.classList.toggle("hidden", !enabled);
  addItemBtn?.classList.toggle("hidden", !enabled);
  if (checklistToggle) checklistToggle.textContent = enabled ? "✓ Чек-лист" : "✓ Чек-лист";

  if (enabled) {
    renderChecklist();
  }
}

function renderChecklist() {
  const n = getActiveNote();
  const root = $("#noteChecklist");
  if (!n || !root) return;

  const items = Array.isArray(n.checklist) ? n.checklist : [];
  if (!items.length) {
    root.innerHTML = `<div class="empty__text">Пунктов пока нет — нажми «Добавить пункт» 💗</div>`;
    return;
  }

  root.innerHTML = items.map(it => {
    return `
      <div class="checkItem" data-item="${esc(it.id)}">
        <input type="checkbox" ${it.done ? "checked" : ""} aria-label="Готово" />
        <input type="text" value="${esc(it.text)}" placeholder="Пункт…" />
        <button class="chipBtn" type="button" data-del="1" aria-label="Удалить">✕</button>
      </div>
    `;
  }).join("");

  $$(".checkItem", root).forEach(row => {
    const itemId = row.getAttribute("data-item");
    const chk = row.querySelector('input[type="checkbox"]');
    const txt = row.querySelector('input[type="text"]');
    const del = row.querySelector('button[data-del="1"]');

    chk?.addEventListener("change", () => {
      const it = n.checklist.find(x => x.id === itemId);
      if (!it) return;
      it.done = !!chk.checked;
      n.updatedAt = nowISO();
      saveNotes(stateLocal.notes);
      renderList();
    });

    txt?.addEventListener("input", () => {
      scheduleAutosave(() => {
        const it = n.checklist.find(x => x.id === itemId);
        if (!it) return;
        it.text = String(txt.value || "").slice(0, 160);
        n.updatedAt = nowISO();
        saveNotes(stateLocal.notes);
        renderList();
      });
    });

    del?.addEventListener("click", () => {
      n.checklist = n.checklist.filter(x => x.id !== itemId);
      n.updatedAt = nowISO();
      saveNotes(stateLocal.notes);
      renderChecklist();
      renderList();
    });
  });
}

function addChecklistItem() {
  const n = getActiveNote();
  if (!n) return;
  if (!Array.isArray(n.checklist)) n.checklist = [];
  n.checklist.unshift({ id: uid(), text: "", done: false });
  n.updatedAt = nowISO();
  saveNotes(stateLocal.notes);
  renderChecklist();
  renderList();

  // фокус в первый input
  setTimeout(() => {
    const root = $("#noteChecklist");
    const first = root?.querySelector('.checkItem input[type="text"]');
    first?.focus();
  }, 0);
}

function bindOnce() {
  if (stateLocal.bound) return;
  stateLocal.bound = true;

  $("#noteCreateBtn")?.addEventListener("click", () => createEmptyNote());

  $("#notesSearch")?.addEventListener("input", (e) => {
    stateLocal.search = String(e.target.value || "");
    renderList();
  });

  $("#noteBackBtn")?.addEventListener("click", () => {
    setEditorVisible(false);
    stateLocal.activeId = null;
  });

  $("#noteDeleteBtn")?.addEventListener("click", () => deleteActiveNote());

  $("#notePinBtn")?.addEventListener("click", () => {
    const n = getActiveNote();
    if (!n) return;
    updateActive({ pinned: !n.pinned });
    renderEditor();
  });

  $("#noteColorSelect")?.addEventListener("change", (e) => {
    updateActive({ color: String(e.target.value || "pink") });
    renderEditor();
  });

  $("#noteTitleInput")?.addEventListener("input", (e) => {
    scheduleAutosave(() => updateActive({ title: String(e.target.value || "").slice(0, 120) }));
  });

  $("#noteBodyInput")?.addEventListener("input", (e) => {
    scheduleAutosave(() => updateActive({ body: String(e.target.value || "") }));
  });

  $("#noteChecklistToggle")?.addEventListener("click", () => {
    const n = getActiveNote();
    if (!n) return;
    const enabled = !n.checklistEnabled;
    if (enabled && (!Array.isArray(n.checklist) || !n.checklist.length)) {
      n.checklist = [{ id: uid(), text: "", done: false }];
    }
    updateActive({ checklistEnabled: enabled, checklist: n.checklist });
    renderEditor();
  });

  $("#checklistAddItemBtn")?.addEventListener("click", () => addChecklistItem());
}

/**
 * Public API used by app.js
 * openNotes({ state }) — просто гарантирует init и рендер
 */
export function openNotes() {
  // init
  stateLocal.notes = loadNotes().map(normalizeNote);
  // если активная заметка была удалена — сбрасываем
  if (stateLocal.activeId && !stateLocal.notes.some(n => n.id === stateLocal.activeId)) {
    stateLocal.activeId = null;
  }

  bindOnce();
  renderList();

  // если editor открыт — обновим
  if (!$("#noteEditorCard")?.classList.contains("hidden") && stateLocal.activeId) {
    renderEditor();
  }
}

/**
 * Optional: allow app.js to set initial notes if needed
 */
export function _debugGetNotes() {
  return stateLocal.notes;
}
