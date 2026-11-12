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

/** Which part of the day a meal belongs to, from the time it was logged. */
export function mealSection(date) {
  const hour = new Date(date).getHours();
  if (hour >= 4 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 17 && hour < 22) return 'Dinner';
  return 'Snacks';
}

export const MEAL_SECTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

/** Groups meals into [{ section, meals, totals }] in day order, skipping empty sections. */
export function groupMealsBySection(meals) {
  return MEAL_SECTIONS
    .map((section) => {
      const inSection = meals.filter((m) => mealSection(m.date) === section);
      return { section, meals: inSection, totals: dayTotals(inSection) };
    })
    .filter((group) => group.meals.length);
}
