// FILE: js/progress.js

import * as storage from "./storage.js";

const KEY = "quiz.progress";

/* ===============================
   Helpers
================================= */

function getData() {
  return storage.get(KEY, {});
}

function saveData(data) {
  storage.set(KEY, data);
}

function ensure(block, level, data) {
  if (!data[block]) data[block] = {};

  if (!data[block][level]) {
    data[block][level] = {
      correct: 0,
      total: 0,
      bestStreak: 0
    };
  }

  return data[block][level];
}

/* ===============================
   Init
================================= */

export function init() {
  storage.get(KEY, {});
}

/* ===============================
   Record Answer
================================= */

export function recordQuizAnswer(block, level, correct, streak) {

  const data = getData();

  const entry = ensure(block, level, data);

  entry.total += 1;

  if (correct) entry.correct += 1;

  if (streak > entry.bestStreak) {
    entry.bestStreak = streak;
  }

  saveData(data);
}

/* ===============================
   Get Progress
================================= */

export function getQuizProgress(block, level) {

  const data = getData();

  if (!data[block]) return {correct:0,total:0,bestStreak:0};

  if (!data[block][level]) return {correct:0,total:0,bestStreak:0};

  return data[block][level];
}

/* ===============================
   Reset Progress
================================= */

export function resetQuizProgress() {
  storage.remove(KEY);
}