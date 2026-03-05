// FILE: js/storage.js

const PREFIX = "uniweek.";

function k(key) {
  return `${PREFIX}${key}`;
}

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(k(key));
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(k(key), JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(k(key));
  } catch {
    // ignore
  }
}

export function clear() {
  try {
    // remove only our keys
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/**
 * Read-modify-write helper.
 * updater: (currentValue) => newValue
 */
export function update(key, fallback, updater) {
  const cur = get(key, fallback);
  const next = updater(cur);
  set(key, next);
  return next;
}

/**
 * Safe push into array value stored under a key.
 */
export function push(key, item, maxLen = null) {
  return update(key, [], (arr) => {
    const next = Array.isArray(arr) ? arr.slice() : [];
    next.push(item);
    if (typeof maxLen === "number" && maxLen > 0 && next.length > maxLen) {
      return next.slice(next.length - maxLen);
    }
    return next;
  });
}

/**
 * Simple stable string hash (non-crypto) - for quick keys.
 */
export function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}