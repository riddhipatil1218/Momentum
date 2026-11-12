// data.js
// The app's actions on data: logging workouts, checking supplements, first-launch defaults.
// Screens call these instead of talking to the database directly.

import { db } from './db.js';
import { dayKeyFromDate } from './logic/daykey.js';
import { BACKUP_META_KEYS, BACKUP_STORES } from './logic/backup.js';
import { mealKey } from './logic/meals.js';
import { DEFAULT_ACTIVITIES, DEFAULT_SUPPLEMENTS } from './logic/workouts.js';

const newId = () => crypto.randomUUID();
const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;

// ---- First launch ---------------------------------------------------------------

/** Fills in the default workout menu and supplements, once. Never re-adds archived items. */
export async function seedIfNeeded() {
  if (await db.getMeta('seeded.v1')) return;

  if ((await db.count('activityTypes')) === 0) {
    await db.putMany('activityTypes', DEFAULT_ACTIVITIES.map((a, index) => ({
      id: newId(), ...a, sortOrder: index, archived: false,
    })));
  }
  if ((await db.count('supplements')) === 0) {
    await db.putMany('supplements', DEFAULT_SUPPLEMENTS.map((name, index) => ({
      id: newId(), name, doseNote: '', sortOrder: index, archived: false,
      createdAt: new Date().toISOString(),
    })));
  }
  await db.setMeta('seeded.v1', true);
}

// ---- Activity types & supplements -------------------------------------------------

export async function activeActivities() {
  return (await db.getAll('activityTypes')).filter((a) => !a.archived).sort(bySortOrder);
}

export async function activeSupplements() {
  return (await db.getAll('supplements')).filter((s) => !s.archived).sort(bySortOrder);
}

// ---- Workouts -------------------------------------------------------------------

/** Logs a workout right away. Name/emoji/kind are copied so renaming an activity later
 *  never changes your history. */
export async function logWorkout(activity, date) {
  const workout = {
    id: newId(),
    date: date.toISOString(),
    dayKey: dayKeyFromDate(date),
    activityName: activity.name,
    emoji: activity.emoji,
    detailKind: activity.detailKind,
    durationMinutes: null,
    distanceMiles: null,
    stairLevel: null,
    floors: null,
    bodyFocus: null,
    temperatureF: null,
    notes: '',
    createdAt: new Date().toISOString(),
  };
  await db.put('workouts', workout);
  return workout;
}

export async function workoutsOnDay(dayKey) {
  return (await db.getByDay('workouts', dayKey)).sort((a, b) => a.date.localeCompare(b.date));
}

/** All workouts between two day keys (inclusive), e.g. for streaks and weekly progress. */
export const workoutsBetween = (firstDayKey, lastDayKey) =>
  db.getByDayRange('workouts', firstDayKey, lastDayKey);

export const getWorkout = (id) => db.get('workouts', id);
export const saveWorkout = (workout) => db.put('workouts', workout);
export const deleteWorkout = (id) => db.delete('workouts', id);

/** Changes a workout's time and keeps its day in sync. */
export function moveWorkout(workout, newDate) {
  workout.date = newDate.toISOString();
  workout.dayKey = dayKeyFromDate(newDate);
}

// ---- Supplements ------------------------------------------------------------------

const logId = (dayKey, supplementId) => `${dayKey}:${supplementId}`;

export const supplementLogsOnDay = (dayKey) => db.getByDay('supplementLogs', dayKey);

/** Checks or unchecks one supplement for a day. */
export async function toggleSupplement(supplement, dayKey, isTaken) {
  if (isTaken) {
    await db.delete('supplementLogs', logId(dayKey, supplement.id));
  } else {
    await db.put('supplementLogs', makeLog(supplement, dayKey));
  }
}

/** Checks every supplement not yet taken that day. */
export async function checkAllSupplements(supplements, dayKey) {
  await db.putMany('supplementLogs', supplements.map((s) => makeLog(s, dayKey)));
}

/** Unchecks every supplement for a day. */
export async function uncheckAllSupplements(dayKey) {
  const logs = await supplementLogsOnDay(dayKey);
  if (logs.length) await db.deleteMany('supplementLogs', logs.map((l) => l.id));
}

function makeLog(supplement, dayKey) {
  return {
    id: logId(dayKey, supplement.id),
    supplementId: supplement.id,
    supplementName: supplement.name,
    dayKey,
    loggedAt: new Date().toISOString(),
  };
}

// ---- Managing the lists (hold a supplement or workout to edit) --------------------

/** Everything, including removed (archived) items, sorted. */
export async function allSupplements() {
  return (await db.getAll('supplements')).sort(bySortOrder);
}
export async function allActivities() {
  return (await db.getAll('activityTypes')).sort(bySortOrder);
}

export const saveSupplement = (supplement) => db.put('supplements', supplement);
export const saveActivity = (activity) => db.put('activityTypes', activity);
/** Saves a whole list at once (used after reordering). */
export const saveSupplementList = (items) => db.putMany('supplements', items);
export const saveActivityList = (items) => db.putMany('activityTypes', items);

export function newSupplement(name, sortOrder) {
  return { id: newId(), name, doseNote: '', sortOrder, archived: false, createdAt: new Date().toISOString() };
}
export function newActivity(name, emoji, detailKind, sortOrder) {
  return { id: newId(), name, emoji, detailKind, sortOrder, archived: false };
}

// ---- Your stats, targets and settings (stored in the "meta" store; no migration needed) ----
// These live only on the phone. They are never in the code (the repo is public, SPEC D30).

export const DEFAULT_WEEKLY_GOAL = 4;

/** { sex, age, heightIn, weightLb, goalWeightLb, activity } or undefined if not set up yet. */
export const getProfile = () => db.getMeta('profile');
export const saveProfile = (profile) => db.setMeta('profile', profile);

/** { calories, proteinG, carbsG, fatG } or undefined. */
export const getTargets = () => db.getMeta('targets');
export const saveTargets = (targets) => db.setMeta('targets', targets);

export async function getWeeklyGoal() {
  return (await db.getMeta('weeklyGoal')) ?? DEFAULT_WEEKLY_GOAL;
}
export const saveWeeklyGoal = (goal) => db.setMeta('weeklyGoal', goal);

/** True once the welcome screen has been finished or skipped. */
export const isSetupDone = async () => Boolean(await db.getMeta('setup.done'));
export const markSetupDone = () => db.setMeta('setup.done', true);

/** The Anthropic API key (Milestone 3). Stored only on this phone; never exported or logged. */
export const getApiKey = () => db.getMeta('anthropicApiKey');
export const saveApiKey = (key) => db.setMeta('anthropicApiKey', key);
export const removeApiKey = () => db.delete('meta', 'anthropicApiKey');

// ---- Meals (Milestone 3) ---------------------------------------------------------------

/** Logs a meal at `date` and remembers it in the saved-meals list for one-tap re-logging. */
export async function logMeal(estimate, date = new Date(), sourceText = '') {
  const meal = {
    id: newId(),
    date: date.toISOString(),
    dayKey: dayKeyFromDate(date),
    name: estimate.name,
    calories: estimate.calories,
    proteinG: estimate.proteinG,
    carbsG: estimate.carbsG,
    fatG: estimate.fatG,
    confidence: estimate.confidence ?? null,
    assumptions: estimate.assumptions ?? [],
    sourceText,
    createdAt: new Date().toISOString(),
  };
  await db.put('meals', meal);
  await rememberMeal(meal);
  return meal;
}

export async function mealsOnDay(dayKey) {
  return (await db.getByDay('meals', dayKey)).sort((a, b) => a.date.localeCompare(b.date));
}
export const getMeal = (id) => db.get('meals', id);
export const saveMeal = (meal) => db.put('meals', meal);
export const deleteMeal = (id) => db.delete('meals', id);

/** Saved meals: one entry per meal name, updated each time it's logged. */
export const allSavedMeals = () => db.getAll('savedMeals');
export const saveSavedMeal = (saved) => db.put('savedMeals', saved);
export const deleteSavedMeal = (id) => db.delete('savedMeals', id);

async function rememberMeal(meal) {
  const key = mealKey(meal.name);
  const existing = (await allSavedMeals()).find((s) => mealKey(s.name) === key);
  await saveSavedMeal({
    id: existing?.id ?? newId(),
    name: meal.name,
    calories: meal.calories,
    proteinG: meal.proteinG,
    carbsG: meal.carbsG,
    fatG: meal.fatG,
    assumptions: meal.assumptions,
    favorite: existing?.favorite ?? false,
    useCount: (existing?.useCount ?? 0) + 1,
    lastUsed: new Date().toISOString(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
}

/** All meals between two day keys (inclusive), e.g. for the Dashboard's 7-day view. */
export const mealsBetween = (firstDayKey, lastDayKey) => db.getByDayRange('meals', firstDayKey, lastDayKey);

// ---- Backup & restore -------------------------------------------------------------------

/** Everything a backup needs (never the API key; see logic/backup.js). */
export async function readEverythingForBackup() {
  const storeData = {};
  for (const store of BACKUP_STORES) storeData[store] = await db.getAll(store);
  const meta = {};
  for (const key of BACKUP_META_KEYS) meta[key] = await db.getMeta(key);
  return { storeData, meta };
}

/** Restores a checked backup by adding/updating every row. Nothing already on the phone is deleted. */
export async function restoreFromBackup(backup) {
  for (const store of BACKUP_STORES) {
    const rows = backup.data?.[store] ?? [];
    if (rows.length) await db.putMany(store, rows);
  }
  for (const key of BACKUP_META_KEYS) {
    if (backup.settings?.[key] !== undefined) await db.setMeta(key, backup.settings[key]);
  }
}

export const getLastBackupAt = () => db.getMeta('lastBackupAt');
export const markBackedUp = () => db.setMeta('lastBackupAt', new Date().toISOString());
