// backup.js
// Building, checking and reading Momentum backup files, plus CSV spreadsheets.
// Pure functions (no screen, no database) so they can be tested.
//
// A backup is one JSON file containing every table, plus your stats/targets/settings.
// Your Anthropic API key is NEVER included.

export const BACKUP_APP = 'momentum';
export const BACKUP_FORMAT = 1;

/** Tables included in a backup, in the order they're restored. */
export const BACKUP_STORES = ['activityTypes', 'supplements', 'workouts', 'supplementLogs', 'meals', 'savedMeals', 'weights', 'ouraDays'];

/** Settings (meta keys) included in a backup. The API key is deliberately not in this list. */
export const BACKUP_META_KEYS = ['profile', 'targets', 'weeklyGoal', 'setup.done', 'seeded.v1', 'webLookup', 'ouraEnabled'];

export function buildBackup(storeData, meta, exportedAt = new Date()) {
  const data = {};
  for (const store of BACKUP_STORES) data[store] = storeData[store] ?? [];
  const settings = {};
  for (const key of BACKUP_META_KEYS) if (meta[key] !== undefined) settings[key] = meta[key];
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: exportedAt.toISOString(), data, settings };
}

/** "momentum-backup-2026-11-12.json" */
export function backupFileName(date = new Date(), extension = 'json', prefix = 'momentum-backup') {
  const pad = (n) => String(n).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${extension}`;
}

/**
 * Checks a parsed backup file before restoring it.
 * @returns {{ ok: boolean, problem?: string, counts?: object, exportedAt?: string }}
 */
export function checkBackup(backup) {
  if (!backup || typeof backup !== 'object' || backup.app !== BACKUP_APP) {
    return { ok: false, problem: 'This isn’t a Momentum backup file.' };
  }
  if (backup.format > BACKUP_FORMAT) {
    return { ok: false, problem: 'This backup was made by a newer version of Momentum. Update the app and try again.' };
  }
  const counts = {};
  for (const store of BACKUP_STORES) {
    const rows = backup.data?.[store] ?? [];
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || !row.id)) {
      return { ok: false, problem: 'This backup file is damaged and can’t be restored.' };
    }
    counts[store] = rows.length;
  }
  return { ok: true, counts, exportedAt: backup.exportedAt };
}

/** "37 workouts, 120 supplement check-ins, 52 meals" */
export function backupSummary(counts) {
  const parts = [
    [counts.workouts, 'workout'],
    [counts.supplementLogs, 'supplement check-in'],
    [counts.meals, 'meal'],
    [counts.weights, 'weigh-in'],
  ].filter(([n]) => n > 0).map(([n, word]) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : 'no logged entries (settings and lists only)';
}

// ---- CSV spreadsheets -------------------------------------------------------------------

/** Turns rows into CSV text. Columns: [header, (row) => value]. */
export function toCSV(rows, columns) {
  const cell = (value) => {
    if (value === null || value === undefined) return '';
    const text = Array.isArray(value) ? value.join('; ') : String(value);
    // Quote cells containing commas, quotes or line breaks; double any quotes inside.
    // Cells starting with = + - @ are prefixed with ' so spreadsheet apps don't run them as formulas.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  };
  const lines = [columns.map(([header]) => cell(header)).join(',')];
  for (const row of rows) lines.push(columns.map(([, get]) => cell(get(row))).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

const dateOf = (iso) => (iso ? iso.slice(0, 10) : '');
const localDate = (dayKey) => `${String(dayKey).slice(0, 4)}-${String(dayKey).slice(4, 6)}-${String(dayKey).slice(6, 8)}`;
const localTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const CSV_TABLES = {
  workouts: [
    ['Date', (w) => localDate(w.dayKey)], ['Time', (w) => localTime(w.date)], ['Activity', (w) => w.activityName],
    ['Duration (min)', (w) => w.durationMinutes], ['Distance (mi)', (w) => w.distanceMiles],
    ['Level', (w) => w.stairLevel], ['Floors', (w) => w.floors], ['Body focus', (w) => (Array.isArray(w.bodyFocus) ? w.bodyFocus : w.bodyFocus ? [w.bodyFocus] : [])],
    ['Temperature (°F)', (w) => w.temperatureF], ['Notes', (w) => w.notes],
  ],
  meals: [
    ['Date', (m) => localDate(m.dayKey)], ['Time', (m) => localTime(m.date)], ['Meal', (m) => m.name],
    ['Calories', (m) => m.calories], ['Protein (g)', (m) => m.proteinG], ['Carbs (g)', (m) => m.carbsG],
    ['Fat (g)', (m) => m.fatG], ['Confidence', (m) => m.confidence], ['Assumptions', (m) => m.assumptions],
    ['Description', (m) => m.sourceText],
  ],
  weights: [
    ['Date', (w) => localDate(w.dayKey)], ['Weight (lb)', (w) => w.pounds],
  ],
  oura: [
    ['Date', (o) => localDate(o.dayKey)], ['Total burn (kcal)', (o) => o.totalBurn], ['Active calories', (o) => o.activeCalories],
    ['Steps', (o) => o.steps], ['Workouts', (o) => (o.workouts ?? []).map((w) => `${w.name} ${w.minutes} min`)],
  ],
  supplements: [
    ['Date', (l) => localDate(l.dayKey)], ['Supplement', (l) => l.supplementName], ['Logged at', (l) => dateOf(l.loggedAt)],
  ],
};

/** Sorts rows oldest first by day, then time. */
export function sortByDay(rows) {
  return [...rows].sort((a, b) => (a.dayKey - b.dayKey) || String(a.date ?? a.loggedAt ?? '').localeCompare(String(b.date ?? b.loggedAt ?? '')));
}
