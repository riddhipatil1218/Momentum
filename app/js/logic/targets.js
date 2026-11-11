// targets.js
// Daily calorie and macro targets from your stats (SPEC D17):
//   1. BMR with the Mifflin–St Jeor equation
//   2. × an activity factor  = calories to maintain your weight
//   3. − 15% if your goal weight is below your current weight (a moderate, steady deficit)
//   4. rounded to the nearest 10, never below a safe minimum (1,200 women / 1,500 men)
//   Protein = 0.85 g per lb of current weight; fat = 25% of calories; carbs = the rest.

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
export const DEFICIT = 0.15;
export const CALORIE_FLOOR = { female: 1200, male: 1500 };

export const ACTIVITY_LEVELS = [
  { id: 'none', label: 'Little or no exercise', factor: 1.2 },
  { id: 'three-four', label: '3–4 workouts a week', factor: 1.375 },
  { id: 'five-six', label: '5–6 workouts a week', factor: 1.55 },
  { id: 'daily', label: 'Hard training every day', factor: 1.725 },
];

/** Calories your body burns at complete rest (Mifflin–St Jeor). */
export function bmr({ sex, age, heightIn, weightLb }) {
  const kg = weightLb * KG_PER_LB;
  const cm = heightIn * CM_PER_IN;
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** Suggested daily targets for a profile. */
export function suggestTargets(profile) {
  const factor = ACTIVITY_LEVELS.find((a) => a.id === profile.activity)?.factor ?? 1.375;
  const base = bmr(profile);
  const maintenance = base * factor;
  const losing = profile.goalWeightLb > 0 && profile.goalWeightLb < profile.weightLb;

  const rounded = Math.round((losing ? maintenance * (1 - DEFICIT) : maintenance) / 10) * 10;
  const calories = Math.max(rounded, CALORIE_FLOOR[profile.sex] ?? 1200);

  const proteinG = Math.round(0.85 * profile.weightLb);
  const fatCalories = 0.25 * calories;
  return {
    calories,
    proteinG,
    carbsG: Math.round((calories - proteinG * 4 - fatCalories) / 4),
    fatG: Math.round(fatCalories / 9),
    bmr: Math.round(base),
    maintenance: Math.round(maintenance),
    losing,
  };
}

/** Calories that a set of macros adds up to (4 per g protein/carbs, 9 per g fat). */
export function macroCalories({ proteinG, carbsG, fatG }) {
  return Math.round((proteinG || 0) * 4 + (carbsG || 0) * 4 + (fatG || 0) * 9);
}

/** 5 ft 2 in → 62 */
export function totalInches(feet, inches) {
  return (Number(feet) || 0) * 12 + (Number(inches) || 0);
}

/** 62 → "5′2″" */
export function formatHeight(heightIn) {
  return `${Math.floor(heightIn / 12)}′${Math.round(heightIn % 12)}″`;
}

/** Checks a profile; returns a list of problems in plain words (empty = all good). */
export function profileProblems(p) {
  const problems = [];
  if (p.sex !== 'female' && p.sex !== 'male') problems.push('Choose female or male (used in the calorie formula).');
  if (!(p.age >= 13 && p.age <= 100)) problems.push('Enter an age between 13 and 100.');
  if (!(p.heightIn >= 48 && p.heightIn <= 90)) problems.push('Enter a height between 4′0″ and 7′6″.');
  if (!(p.weightLb >= 70 && p.weightLb <= 600)) problems.push('Enter your current weight in pounds.');
  if (p.goalWeightLb != null && p.goalWeightLb !== '' && !(p.goalWeightLb >= 70 && p.goalWeightLb <= 600)) {
    problems.push('Enter a goal weight in pounds, or leave it empty.');
  }
  if (!ACTIVITY_LEVELS.some((a) => a.id === p.activity)) problems.push('Choose how active you are.');
  return problems;
}
