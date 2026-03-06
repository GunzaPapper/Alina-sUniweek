// storage.js
export const STORAGE_KEYS = {
  QUIZ_BEST: "uniweek_quiz_best_v1",
  QUIZ_PLAYED: "uniweek_quiz_played_v1",
  MEMORY_WINS: "uniweek_memory_wins_v1",
  ACHIEVEMENTS: "uniweek_achievements_v1"
};

export function getNumber(key, fallback = 0) {
  const raw = localStorage.getItem(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function setNumber(key, value) {
  localStorage.setItem(key, String(value));
}

export function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
