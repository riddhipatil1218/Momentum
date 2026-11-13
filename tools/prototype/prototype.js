// prototype.js — only used in the claude.ai prototype, never in the real app.
// "Add sample data" fills the last two weeks with example workouts and supplements
// so every screen has something to show. "Clear" removes everything you logged plus your
// stats and settings, and starts again at the welcome screen.

import { activeActivities, activeSupplements, checkAllSupplements, getProfile, logMeal, logWeight, logWorkout, saveWorkout } from './js/data.js';
import { openDB } from './js/db.js';
import { addDays, dateOnDayAtTime, todayKey } from './js/logic/daykey.js';

// [days ago, activity name, details, hour]
const SAMPLE_WORKOUTS = [
  [1, 'Running', { durationMinutes: 32, distanceMiles: 3.2 }, 7],
  [2, 'Strength Training', { durationMinutes: 45, bodyFocus: ['Glutes', 'Core'], notes: 'Hip thrusts PR' }, 18],
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
  [2, 9, { name: 'Eggs and toast', calories: 420, proteinG: 22, carbsG: 30, fatG: 22, confidence: 'medium', assumptions: [] }],
  [2, 13, { name: 'Turkey sandwich', calories: 520, proteinG: 34, carbsG: 52, fatG: 16, confidence: 'medium', assumptions: [] }],
  [2, 19, { name: 'Salmon, rice and greens', calories: 650, proteinG: 40, carbsG: 60, fatG: 24, confidence: 'medium', assumptions: [] }],
  [3, 8, { name: 'Protein smoothie', calories: 350, proteinG: 32, carbsG: 40, fatG: 6, confidence: 'high', assumptions: [] }],
  [3, 18, { name: 'Pasta with meat sauce', calories: 980, proteinG: 38, carbsG: 120, fatG: 34, confidence: 'low', assumptions: [] }],
  [3, 21, { name: 'Ice cream', calories: 380, proteinG: 6, carbsG: 44, fatG: 20, confidence: 'medium', assumptions: [] }],
  [4, 12, { name: 'Poke bowl', calories: 610, proteinG: 36, carbsG: 70, fatG: 18, confidence: 'medium', assumptions: [] }],
  [5, 8, { name: 'Greek yogurt bowl', calories: 320, proteinG: 24, carbsG: 38, fatG: 8, confidence: 'medium', assumptions: [] }],
  [5, 13, { name: 'Chicken salad', calories: 480, proteinG: 42, carbsG: 18, fatG: 26, confidence: 'medium', assumptions: [] }],
  [5, 19, { name: 'Steak and potatoes', calories: 720, proteinG: 48, carbsG: 50, fatG: 34, confidence: 'medium', assumptions: [] }],
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
  // Three weigh-ins two weeks apart, ending at the weight from your stats, so the Weight card has a trend.
  const profile = await getProfile();
  if (profile?.weightLb) {
    for (const [daysAgo, extra] of [[28, 2], [14, 1], [0, 0]]) {
      await logWeight(profile.weightLb + extra, dateOnDayAtTime(addDays(todayKey(), -daysAgo), new Date(2000, 0, 1, 7, 30)));
    }
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


// The preview can't save or share files, so backups explain that instead.
globalThis.momentumPreview = true;

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

/** True if a picture is much taller than wide, like a phone screenshot. */
function isTall(image) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight > img.naturalWidth * 1.6);
    img.onerror = () => resolve(false);
    img.src = `data:${image.source.media_type};base64,${image.source.data}`;
  });
}

globalThis.momentumDemoEstimator = async (messages, { ouraEnabled = false } = {}) => {
  await new Promise((resolve) => setTimeout(resolve, 900)); // feel like a real request
  // Use every message in this meal's conversation, later amounts winning.
  const userTurns = messages.filter((m) => m.role === 'user');
  const textOf = (content) => (Array.isArray(content)
    ? content.filter((b) => b.type === 'text').map((b) => b.text).join(' ')
    : String(content));
  const hasPhoto = userTurns.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'image'));
  // The demo can't read pictures, so it guesses: a tall picture (a phone screenshot) sent with
  // Oura on is treated as an Oura screenshot; anything else as food.
  const lastImage = (userTurns.at(-1)?.content ?? []).find?.((b) => b.type === 'image');
  if (ouraEnabled && lastImage && await isTall(lastImage)) {
    const id = `demo_${Date.now()}`;
    const input = {
      date: '', total_burn: 2180, active_calories: 560, steps: 10450, activity_minutes: 83, is_oura: true, notes: '',
      workouts: [{ name: 'Strength training', minutes: 45, calories: 240 }, { name: 'Walking', minutes: 30, calories: 110 }],
    };
    return { kind: 'oura', oura: input, toolUseId: id, sources: [], newMessages: [{ role: 'assistant', content: [{ type: 'tool_use', id, name: 'record_oura_activity', input }] }] };
  }
  const byName = new Map();
  for (const turn of userTurns) for (const item of demoEstimate(textOf(turn.content))) byName.set(item.name, item);
  const items = [...byName.values()];
  const sum = (key) => items.reduce((total, i) => total + i[key], 0);

  let estimate;
  if (items.length) {
    estimate = {
      name: items.slice(0, 3).map((i) => i.name).join(', ').replace(/^./, (c) => c.toUpperCase()),
      calories: Math.round(sum('kcal') / 5) * 5, proteinG: Math.round(sum('p')), carbsG: Math.round(sum('c')), fatG: Math.round(sum('f')),
      confidence: 'medium',
      assumptions: items.map((i) => `${i.qty} × ${i.portion} ${i.name} (~${Math.round(i.kcal)} kcal)`),
      basis: 'Demo food list', isFood: true,
    };
  } else if (hasPhoto) {
    estimate = {
      name: 'Meal from photo', calories: 450, proteinG: 25, carbsG: 45, fatG: 18, confidence: 'low',
      assumptions: ['The demo can’t read photos; the real app reads plates and nutrition labels.'],
      basis: 'Demo placeholder', isFood: true,
    };
  } else {
    estimate = {
      name: 'Not a meal', calories: 0, proteinG: 0, carbsG: 0, fatG: 0, confidence: 'low', basis: '', isFood: false,
      assumptions: ['The demo only knows a few foods (eggs, toast, chicken, rice, yogurt, banana, salmon…). The real app understands any meal, looks up restaurants and brands, and reads photos.'],
    };
  }
  const toolUseId = `demo_${Date.now()}`;
  return {
    kind: 'meal',
    estimate,
    toolUseId,
    sources: [],
    newMessages: [{ role: 'assistant', content: [{ type: 'tool_use', id: toolUseId, name: 'record_meal_estimate', input: estimate }] }],
  };
};
