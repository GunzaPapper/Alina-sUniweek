// achievements.js
import { STORAGE_KEYS, getJSON, setJSON } from "./storage.js";

const ACH = {
  FIRST_QUIZ: "first_quiz",
  PERFECT_QUIZ: "perfect_quiz",
  FIRST_MEMORY: "first_memory"
};

const TITLES = {
  [ACH.FIRST_QUIZ]: "Первый Quiz 🧠",
  [ACH.PERFECT_QUIZ]: "Идеальный Quiz ✨",
  [ACH.FIRST_MEMORY]: "Первая победа в Memory 💗"
};

export function unlockAchievement(id) {
  const list = getJSON(STORAGE_KEYS.ACHIEVEMENTS, []);
  if (list.includes(id)) return false;
  list.push(id);
  setJSON(STORAGE_KEYS.ACHIEVEMENTS, list);
  return true;
}

export function getAchievements() {
  const list = getJSON(STORAGE_KEYS.ACHIEVEMENTS, []);
  return list.map((id) => ({ id, title: TITLES[id] || id }));
}

export { ACH };
