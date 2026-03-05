// FILE: js/achievements.js

import * as storage from "./storage.js";

/* ===============================
   Achievements Catalog
================================= */

const ACHIEVEMENTS = [
  {
    id: "quiz_first_correct",
    title: "Первый правильный 💗",
    desc: "Ответить правильно хотя бы 1 раз в Quiz.",
  },
  {
    id: "quiz_10_streak",
    title: "Серия 10 ✨",
    desc: "10 правильных ответов подряд в Quiz.",
  },

  // темы Quiz (открываются динамически)
  {
    id: "quiz_theme_history",
    title: "История пройдена 🏛️",
    desc: "Пройти тему История (>=70%).",
  },
  {
    id: "quiz_theme_science",
    title: "Наука пройдена 🧪",
    desc: "Пройти тему Наука (>=70%).",
  },
  {
    id: "quiz_theme_literature",
    title: "Литература пройдена 📚",
    desc: "Пройти тему Литература (>=70%).",
  },
  {
    id: "quiz_theme_geo",
    title: "География пройдена 🌍",
    desc: "Пройти тему География (>=70%).",
  },
  {
    id: "quiz_theme_logic",
    title: "Логика пройдена 🧠",
    desc: "Пройти тему Логика (>=70%).",
  },

  {
    id: "memory_first_win",
    title: "Первая победа 🍬",
    desc: "Выиграть в Memory хотя бы 1 раз.",
  },
];

const KEY = "achievements.unlocked"; // {id: {ts}}
const UI_KEY = "achievements.toastQueue"; // array of ids (for future)

/* ===============================
   Public API
================================= */

export function init() {
  // Просто гарантируем структуру
  storage.get(KEY, {});
  storage.get(UI_KEY, []);
}

export function listAll() {
  return ACHIEVEMENTS.slice();
}

export function getUnlockedMap() {
  return storage.get(KEY, {});
}

export function isUnlocked(id) {
  const m = getUnlockedMap();
  return !!m[id];
}

export function unlock(id) {
  if (!id) return false;

  const all = new Set(ACHIEVEMENTS.map((a) => a.id));
  if (!all.has(id)) {
    // разрешаем и "динамические" id, но только если это похоже на quiz_theme_*
    if (!String(id).startsWith("quiz_theme_")) return false;
  }

  const map = getUnlockedMap();
  if (map[id]) return false;

  map[id] = { ts: Date.now() };
  storage.set(KEY, map);

  // можно использовать для future toast/notifications
  const q = storage.get(UI_KEY, []);
  if (Array.isArray(q)) {
    q.push(id);
    storage.set(UI_KEY, q.slice(-10));
  }

  return true;
}

/* ===============================
   Helpers for UI
================================= */

export function getAchievementMeta(id) {
  const found = ACHIEVEMENTS.find((a) => a.id === id);
  if (found) return found;

  // fallback для динамических
  if (String(id).startsWith("quiz_theme_")) {
    const theme = String(id).replace("quiz_theme_", "");
    return {
      id,
      title: `Тема пройдена ✨`,
      desc: `Пройдена тема: ${theme}`,
    };
  }

  return null;
}