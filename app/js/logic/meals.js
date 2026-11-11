// meals.js
// Pure helpers for meals: daily macro totals and the saved-meals list order.

/** Adds up calories and macros for a list of meals (rounded to whole numbers). */
export function dayTotals(meals) {
  const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const meal of meals) {
    totals.calories += Number(meal.calories) || 0;
    totals.proteinG += Number(meal.proteinG) || 0;
    totals.carbsG += Number(meal.carbsG) || 0;
    totals.fatG += Number(meal.fatG) || 0;
  }
  for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key]);
  return totals;
}

/** "  Greek Yogurt  Bowl " → "greek yogurt bowl", so the same meal is saved only once. */
export function mealKey(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Favorites first, then most recently used. */
export function sortSavedMeals(saved) {
  return [...saved].sort((a, b) =>
    (Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))) ||
    String(b.lastUsed ?? '').localeCompare(String(a.lastUsed ?? '')));
}

/** "420 kcal · 30P · 41C · 14F" */
export function macroLine(m) {
  return `${Math.round(m.calories).toLocaleString()} kcal · ${Math.round(m.proteinG)}P · ` +
         `${Math.round(m.carbsG)}C · ${Math.round(m.fatG)}F`;
}
