// prototype.js — only used in the claude.ai prototype, never in the real app.
// "Add sample data" fills the last two weeks with example workouts and supplements
// so every screen has something to show. "Clear" removes everything you logged plus your
// stats and settings, and starts again at the welcome screen.

import { activeActivities, activeSupplements, checkAllSupplements, logMeal, logWorkout, saveWorkout } from './js/data.js';
import { openDB } from './js/db.js';
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
const SAMPLE_MEALS = [
  [1, 8, { name: 'Greek yogurt bowl', calories: 320, proteinG: 24, carbsG: 38, fatG: 8, confidence: 'medium', assumptions: ['1 cup nonfat Greek yogurt (~130 kcal)', '1/2 cup blueberries (~40 kcal)', '1/3 cup granola (~150 kcal)'] }],
  [1, 13, { name: 'Chicken burrito bowl', calories: 640, proteinG: 42, carbsG: 68, fatG: 20, confidence: 'medium', assumptions: ['4 oz grilled chicken (~180 kcal)', '1/2 cup rice (~105 kcal)', '1/2 cup black beans (~110 kcal)', 'Guacamole, 2 tbsp (~50 kcal)'] }],
  [0, 8, { name: 'Oatmeal with banana', calories: 310, proteinG: 9, carbsG: 58, fatG: 5, confidence: 'high', assumptions: ['1/2 cup dry oats (~150 kcal)', '1 medium banana (~105 kcal)', '1 tsp honey (~20 kcal)'] }],
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
  // A few example meals (yesterday and today) so Macros and the day sheet have something to show.
  for (const [daysAgo, hour, meal] of SAMPLE_MEALS) {
    await logMeal(meal, dateOnDayAtTime(addDays(todayKey(), -daysAgo), new Date(2000, 0, 1, hour, 30)));
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
    const tx = db.transaction(['workouts', 'supplementLogs', 'meta'], 'readwrite');
    tx.objectStore('workouts').clear();
    tx.objectStore('supplementLogs').clear();
    // Also forget stats, targets and settings so the welcome screen shows again.
    for (const key of ['profile', 'targets', 'weeklyGoal', 'setup.done', 'anthropicApiKey']) {
      tx.objectStore('meta').delete(key);
    }
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  armed = false;
  clearButton.textContent = 'Clear';
  clearButton.classList.remove('warn');
  location.reload(); // start over at the welcome screen
});


// ---- Demo estimator ---------------------------------------------------------------------
// The claude.ai preview can't reach the internet, so the prototype answers with a rough
// estimate from this small food list instead of asking Claude. (The real app asks Claude.)

const FOODS = [
  // [words to look for, name, kcal, protein, carbs, fat, portion]
  [['egg'], 'eggs', 72, 6, 0.4, 5, '1 large egg'],
  [['sourdough', 'toast', 'bread'], 'sourdough toast', 120, 4, 23, 1, '1 slice'],
  [['butter'], 'butter', 34, 0, 0, 4, '1 tsp'],
  [['oat milk latte', 'latte'], 'oat milk latte', 130, 3, 18, 5, '12 oz'],
  [['chicken'], 'chicken breast', 180, 35, 0, 4, '4 oz cooked'],
  [['rice'], 'rice', 205, 4, 45, 0.4, '1 cup cooked'],
  [['beans'], 'black beans', 110, 7, 20, 0.5, '1/2 cup'],
  [['guac', 'avocado'], 'guacamole', 100, 1, 5, 9, '1/4 cup'],
  [['salsa'], 'salsa', 20, 1, 4, 0, '1/4 cup'],
  [['yogurt'], 'Greek yogurt', 130, 23, 9, 0, '1 cup nonfat'],
  [['blueberr', 'berries'], 'blueberries', 40, 0.5, 10, 0.2, '1/2 cup'],
  [['honey'], 'honey', 20, 0, 6, 0, '1 tsp'],
  [['banana'], 'banana', 105, 1, 27, 0.4, '1 medium'],
  [['salmon'], 'salmon', 235, 25, 0, 14, '4 oz cooked'],
  [['salad'], 'side salad', 50, 2, 8, 1, '2 cups greens'],
  [['dressing'], 'dressing', 120, 0, 2, 13, '2 tbsp'],
  [['protein shake', 'protein'], 'protein shake', 160, 30, 6, 2, '1 scoop with water'],
  [['oat'], 'oatmeal', 150, 5, 27, 3, '1/2 cup dry'],
  [['pasta'], 'pasta', 220, 8, 43, 1, '1 cup cooked'],
  [['coffee'], 'black coffee', 5, 0, 0, 0, '12 oz'],
];
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, half: 0.5 };

function demoEstimate(text) {
  const lower = text.toLowerCase();
  const items = [];
  for (const [words, name, kcal, p, c, f, portion] of FOODS) {
    const word = words.find((w) => lower.includes(w));
    if (!word || items.some((i) => i.name === name)) continue;
    // Look for a quantity just before the food word, e.g. "3 eggs" or "two slices".
    const before = lower.slice(Math.max(0, lower.indexOf(word) - 20), lower.indexOf(word)).trim().split(/\s+/);
    let qty = 1;
    for (const token of before.reverse()) {
      if (!Number.isNaN(Number(token))) { qty = Number(token); break; }
      if (NUMBER_WORDS[token]) { qty = NUMBER_WORDS[token]; break; }
    }
    items.push({ name, qty, kcal: kcal * qty, p: p * qty, c: c * qty, f: f * qty, portion });
  }
  return items;
}

globalThis.momentumDemoEstimator = async (messages) => {
  await new Promise((resolve) => setTimeout(resolve, 900)); // feel like a real request
  // Use every message in this meal's conversation, later amounts winning.
  const userTexts = messages.filter((m) => m.role === 'user').map((m) => String(m.content));
  const byName = new Map();
  for (const text of userTexts) for (const item of demoEstimate(text)) byName.set(item.name, item);
  const items = [...byName.values()];
  const isFood = items.length > 0;
  const sum = (key) => items.reduce((total, i) => total + i[key], 0);
  const estimate = {
    name: isFood ? items.slice(0, 3).map((i) => i.name).join(', ').replace(/^./, (c) => c.toUpperCase()) : 'Not a meal',
    calories: Math.round(sum('kcal') / 5) * 5,
    proteinG: Math.round(sum('p')),
    carbsG: Math.round(sum('c')),
    fatG: Math.round(sum('f')),
    confidence: isFood ? 'medium' : 'low',
    assumptions: isFood
      ? items.map((i) => `${i.qty} × ${i.portion} ${i.name} (~${Math.round(i.kcal)} kcal)`)
      : ['The demo only knows a few foods (eggs, toast, chicken, rice, yogurt, banana, salmon…). The real app understands any meal.'],
    isFood,
  };
  return { estimate, assistantContent: [{ type: 'text', text: JSON.stringify(estimate) }] };
};
