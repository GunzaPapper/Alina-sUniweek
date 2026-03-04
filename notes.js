// FILE: js/notes.js

import * as storage from "./storage.js";

const KEY = "notes.data";

let notes = [];
let current = null;

/* ===============================
   Helpers
================================= */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function load() {
  notes = storage.get(KEY, []);
}

function save() {
  storage.set(KEY, notes);
}

function now() {
  return new Date().toISOString();
}

/* ===============================
   DOM
================================= */

const listEl = document.getElementById("notesList");
const searchEl = document.getElementById("notesSearch");

const createBtn = document.getElementById("noteCreateBtn");

const editorCard = document.getElementById("noteEditorCard");
const backBtn = document.getElementById("noteBackBtn");

const titleInput = document.getElementById("noteTitleInput");
const bodyInput = document.getElementById("noteBodyInput");

const colorSelect = document.getElementById("noteColorSelect");

const deleteBtn = document.getElementById("noteDeleteBtn");
const pinBtn = document.getElementById("notePinBtn");

const checklistToggle = document.getElementById("noteChecklistToggle");
const checklistEl = document.getElementById("noteChecklist");
const checklistAddBtn = document.getElementById("checklistAddItemBtn");

/* ===============================
   Init
================================= */

export function init() {

  load();

  renderList();

  createBtn.onclick = createNote;

  backBtn.onclick = closeEditor;

  deleteBtn.onclick = deleteNote;

  pinBtn.onclick = togglePin;

  bodyInput.oninput = autosave;
  titleInput.oninput = autosave;
  colorSelect.onchange = autosave;

  checklistToggle.onclick = toggleChecklist;

  checklistAddBtn.onclick = addChecklistItem;

  searchEl.oninput = renderList;
}

/* ===============================
   List
================================= */

function renderList() {

  const q = searchEl.value.toLowerCase();

  listEl.innerHTML = "";

  const sorted = notes
    .slice()
    .sort((a,b)=>{

      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      return new Date(b.updated) - new Date(a.updated);
    });

  sorted
    .filter(n => 
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q)
    )
    .forEach(note => {

      const row = document.createElement("div");
      row.className = "noteRow noteColor--" + (note.color || "gray");

      row.innerHTML = `
        <div class="noteRow__top">
          <div class="noteRow__title">${note.title || "Без названия"} ${note.pinned ? "📌":""}</div>
          <div class="noteRow__date">${new Date(note.updated).toLocaleDateString()}</div>
        </div>
        <div class="noteRow__preview">${note.body.slice(0,80)}</div>
      `;

      row.onclick = ()=>openEditor(note.id);

      listEl.appendChild(row);
    });
}

/* ===============================
   Create
================================= */

function createNote() {

  const note = {
    id: uid(),
    title: "",
    body: "",
    color: "pink",
    pinned: false,
    checklist: [],
    updated: now()
  };

  notes.push(note);

  save();

  openEditor(note.id);
}

/* ===============================
   Editor
================================= */

function openEditor(id) {

  current = notes.find(n=>n.id===id);

  if (!current) return;

  titleInput.value = current.title;
  bodyInput.value = current.body;
  colorSelect.value = current.color || "pink";

  renderChecklist();

  editorCard.classList.remove("hidden");
}

function closeEditor() {

  current = null;

  editorCard.classList.add("hidden");

  renderList();
}

/* ===============================
   Autosave
================================= */

function autosave() {

  if (!current) return;

  current.title = titleInput.value;
  current.body = bodyInput.value;
  current.color = colorSelect.value;
  current.updated = now();

  save();

  renderList();
}

/* ===============================
   Delete
================================= */

function deleteNote() {

  if (!current) return;

  if (!confirm("Удалить заметку?")) return;

  notes = notes.filter(n=>n.id!==current.id);

  save();

  closeEditor();
}

/* ===============================
   Pin
================================= */

function togglePin() {

  if (!current) return;

  current.pinned = !current.pinned;

  save();

  renderList();
}

/* ===============================
   Checklist
================================= */

function toggleChecklist(){

  if (!current) return;

  checklistEl.classList.toggle("hidden");
  checklistAddBtn.classList.toggle("hidden");
}

function renderChecklist(){

  checklistEl.innerHTML="";

  if (!current.checklist) current.checklist=[];

  current.checklist.forEach((item,i)=>{

    const row = document.createElement("div");
    row.className="checkItem";

    const box = document.createElement("input");
    box.type="checkbox";
    box.checked=item.done;

    const text = document.createElement("input");
    text.type="text";
    text.value=item.text;

    box.onchange=()=>{
      item.done=box.checked;
      autosave();
    };

    text.oninput=()=>{
      item.text=text.value;
      autosave();
    };

    row.appendChild(box);
    row.appendChild(text);

    checklistEl.appendChild(row);

  });
}

function addChecklistItem(){

  if (!current) return;

  if (!current.checklist) current.checklist=[];

  current.checklist.push({
    text:"",
    done:false
  });

  autosave();

  renderChecklist();
}