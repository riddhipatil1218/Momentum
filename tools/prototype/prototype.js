// prototype.js — only used in the claude.ai prototype, never in the real app.
// "Add sample data" fills the last two weeks with example workouts and supplements
// so every screen has something to show. "Clear" removes logged workouts/supplements.

import { activeActivities, activeSupplements, checkAllSupplements, logWorkout, saveWorkout } from './js/data.js';
import { notifyChanged, openDB } from './js/db.js';
import { addDays, dateOnDayAtTime, todayKey } from './js/logic/daykey.js';

// [days ago, activity name, details, hour]
const SAMPLE_WORKOUTS = [
  [1, 'Running', { durationMinutes: 32, distanceMiles: 3.2 }, 7],
  [2, 'Strength Training', { durationMinutes: 45, bodyFocus: 'Glutes', notes: 'Hip thrusts PR' }, 18],
  [4, 'Hot Yoga', { durationMinutes: 60, temperatureF: 105 }, 9],
  [5, 'Stair Master', { durationMinutes: 20, stairLevel: 8, floors: 60 }, 17],
  [7, 'Pilates', { durationMinutes: 50 }, 8],
  [8, 'Running', { durationMinutes: 28, distanceMiles: 3 }, 7],
  [10, 'Sculpt', { durationMinutes: 45 }, 18],
  [12, 'Yoga', { durationMinutes: 60, notes: 'Slow flow' }, 10],
];
const SUPPLEMENT_DAYS_AGO = [1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13];

document.getElementById('proto-sample').addEventListener('click', async () => {
  const activities = await activeActivities();
  for (const [daysAgo, name, details, hour] of SAMPLE_WORKOUTS) {
    const activity = activities.find((a) => a.name === name);
    if (!activity) continue;
    const when = dateOnDayAtTime(addDays(todayKey(), -daysAgo), new Date(2000, 0, 1, hour, 15));
    const workout = await logWorkout(activity, when);
    await saveWorkout({ ...workout, ...details });
  }
  const supplements = await activeSupplements();
  for (const daysAgo of SUPPLEMENT_DAYS_AGO) {
    // Most days everything; some days only the first few, so the checklist varies.
    const count = daysAgo % 4 === 0 ? 4 : supplements.length;
    await checkAllSupplements(supplements.slice(0, count), addDays(todayKey(), -daysAgo));
  }
});

// Two taps to clear, so it can't happen by accident.
const clearButton = document.getElementById('proto-clear');
let armed = false;
clearButton.addEventListener('click', async () => {
  if (!armed) {
    armed = true;
    clearButton.textContent = 'Tap again to clear';
    clearButton.classList.add('warn');
    setTimeout(() => {
      armed = false;
      clearButton.textContent = 'Clear';
      clearButton.classList.remove('warn');
    }, 3000);
    return;
  }
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['workouts', 'supplementLogs'], 'readwrite');
    tx.objectStore('workouts').clear();
    tx.objectStore('supplementLogs').clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  armed = false;
  clearButton.textContent = 'Clear';
  clearButton.classList.remove('warn');
  notifyChanged();
});
