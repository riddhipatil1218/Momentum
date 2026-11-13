// oura.js
// Oura ring data read from a screenshot (SPEC D85–D88): cleaning up what Claude read,
// matching Oura's workout names to your workout types, and deciding which Oura workouts
// are new (not already in your log for that day).
//
// Oura is optional and per phone: it's only used when "Oura ring" is turned on in Settings.
// For a day with Oura data, Oura's measured Total Burn replaces Momentum's estimate.

/** Cleans up what Claude read from an Oura screenshot. `fallbackDayKey` = today. */
export function normalizeOuraActivity(data, fallbackDayKey) {
  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };
  const dayKey = dayKeyFromIsoDate(data?.date) ?? fallbackDayKey;
  const workouts = (Array.isArray(data?.workouts) ? data.workouts : [])
    .map((w) => ({ name: String(w?.name ?? '').trim(), minutes: number(w?.minutes), calories: number(w?.calories) }))
    .filter((w) => w.name);
  return {
    isOura: data?.is_oura !== false,
    dayKey,
    dateWasRead: dayKeyFromIsoDate(data?.date) !== null,
    totalBurn: number(data?.total_burn),
    activeCalories: number(data?.active_calories),
    steps: number(data?.steps),
    workouts,
    notes: String(data?.notes ?? '').trim(),
  };
}

/** "2026-11-13" → 20261113, or null if it isn't a real date. */
export function dayKeyFromIsoDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? '').trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return y * 10000 + m * 100 + d;
}

// Common Oura workout names → words to look for in your workout types.
const SYNONYMS = [
  [/strength|weight|lift|functional/i, /strength|sculpt|weight/i],
  [/run|jog/i, /run/i],
  [/stair|step/i, /stair/i],
  [/hot yoga/i, /hot yoga/i],
  [/yoga/i, /^yoga$|yoga/i],
  [/pilates|reformer/i, /pilates/i],
  [/cycl|bike|spin/i, /cycl|bike|spin/i],
  [/walk/i, /walk/i],
  [/hiit|interval/i, /hiit|sculpt/i],
];

/**
 * Finds your workout type that best matches an Oura workout name, or null.
 * Exact names win, then common synonyms (e.g. Oura's "Strength training" → "Strength Training").
 */
export function matchActivity(ouraName, activities) {
  const name = String(ouraName ?? '').trim().toLowerCase();
  if (!name) return null;
  const exact = activities.find((a) => a.name.toLowerCase() === name);
  if (exact) return exact;
  // "Hot yoga" must not match plain "Yoga", so try the most specific names first.
  const byLength = [...activities].sort((a, b) => b.name.length - a.name.length);
  const contains = byLength.find((a) => name.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(name));
  if (contains) return contains;
  for (const [ouraPattern, typePattern] of SYNONYMS) {
    if (!ouraPattern.test(name)) continue;
    const match = byLength.find((a) => typePattern.test(a.name));
    if (match) return match;
  }
  return null;
}

/**
 * For each Oura workout, whether it should start ticked to add to your log:
 * not ticked if that day already has a workout of the same type (so nothing is duplicated).
 */
export function preselectOuraWorkouts(ouraWorkouts, loggedWorkouts, activities) {
  const loggedNames = loggedWorkouts.map((w) => w.activityName.toLowerCase());
  return ouraWorkouts.map((w) => {
    const type = matchActivity(w.name, activities);
    const typeName = (type?.name ?? w.name).toLowerCase();
    return { ...w, type, alreadyLogged: loggedNames.includes(typeName) };
  });
}
