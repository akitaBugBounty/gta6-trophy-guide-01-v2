// Progress storage for the Leonida Trophy Ledger.
// Progress lives in localStorage under one key and never leaves the device.
// Export writes a JSON file; import reads one back and only accepts names
// that exist on the official 55-trophy list.

export const STORAGE_KEY = 'gta6-trophy-ledger-v1';
export const EXPORT_FILENAME = 'gta6-trophy-progress.json';

// A fresh, empty progress record. `earned` holds official trophy names.
export function emptyProgress() {
  return { earned: [], spoiler: false, updatedAt: new Date().toISOString() };
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function cleanProgress(raw) {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  if (isStringArray(raw.earned)) base.earned = [...new Set(raw.earned)];
  if (typeof raw.spoiler === 'boolean') base.spoiler = raw.spoiler;
  return base;
}

// Load progress from localStorage. A corrupt or missing record starts empty
// instead of crashing the app.
export function loadProgress() {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyProgress();
    return cleanProgress(JSON.parse(text));
  } catch (err) {
    return emptyProgress();
  }
}

// Save progress to localStorage. Returns true when the write succeeded.
export function saveProgress(progress) {
  try {
    const record = cleanProgress(progress);
    record.updatedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch (err) {
    return null;
  }
}

// Keep only names that exist on the official list. Returns the kept names
// and how many unknown names were dropped.
export function filterToOfficialNames(names, officialNames) {
  const known = new Set(officialNames);
  const kept = [];
  let dropped = 0;
  for (const name of names) {
    if (known.has(name)) kept.push(name);
    else dropped += 1;
  }
  return { kept, dropped };
}

// Download the current progress as a JSON file.
export function exportProgress(progress) {
  const record = cleanProgress(progress);
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = EXPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read a progress file the user picked. Resolves with the cleaned progress
// plus the count of names that were ignored for not being on the list.
export function importProgressFile(file, officialNames) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('error', () => reject(new Error('Could not read that file.')));
    reader.addEventListener('load', () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (err) {
        reject(new Error('That file is not valid JSON.'));
        return;
      }
      const cleaned = cleanProgress(parsed);
      const { kept, dropped } = filterToOfficialNames(cleaned.earned, officialNames);
      cleaned.earned = kept;
      resolve({ progress: cleaned, ignored: dropped });
    });
    reader.readAsText(file);
  });
}

// Tiny change bus so the UI re-renders whenever progress changes.
const listeners = new Set();

export function onProgressChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitProgressChange(progress) {
  for (const fn of [...listeners]) fn(progress);
}

// Toggle one trophy's earned state, persist it, and notify listeners.
export function toggleEarned(progress, name) {
  const next = cleanProgress(progress);
  const at = next.earned.indexOf(name);
  if (at >= 0) next.earned.splice(at, 1);
  else next.earned.push(name);
  const saved = saveProgress(next);
  if (saved) emitProgressChange(saved);
  return saved || next;
}

// Set the spoiler setting, persist it, and notify listeners.
export function setSpoiler(progress, spoilerOn) {
  const next = cleanProgress(progress);
  next.spoiler = Boolean(spoilerOn);
  const saved = saveProgress(next);
  if (saved) emitProgressChange(saved);
  return saved || next;
}
