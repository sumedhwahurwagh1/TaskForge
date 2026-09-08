const STORAGE_PREFIX = 'taskforge_';

export function loadState(key) {
  try {
    const serialized = localStorage.getItem(STORAGE_PREFIX + key);
    if (serialized === null) return undefined;
    return JSON.parse(serialized);
  } catch (err) {
    console.warn(`Failed to load state for key "${key}":`, err);
    return undefined;
  }
}

export function saveState(key, data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch (err) {
    console.warn(`Failed to save state for key "${key}":`, err);
  }
}

export function clearState(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (err) {
    console.warn(`Failed to clear state for key "${key}":`, err);
  }
}
