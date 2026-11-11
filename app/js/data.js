// data.js
// The app's actions on data: logging workouts, checking supplements, first-launch defaults.
// Screens call these instead of talking to the database directly.

import { db } from './db.js';
import { dayKeyFromDate } from './logic/daykey.js';
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

function makeLog(supplement, dayKey) {
  return {
    id: logId(dayKey, supplement.id),
    supplementId: supplement.id,
    supplementName: supplement.name,
    dayKey,
    loggedAt: new Date().toISOString(),
  };
}
