// statsForm.js
// The "your stats" form, shared by the welcome screen and Settings:
// sex, age, height, current weight, goal weight and activity level.

import { parseNumber } from '../logic/numbers.js';
import { ACTIVITY_LEVELS, macroCalories, totalInches } from '../logic/targets.js';

/** HTML for the form. `p` is the saved profile (or {} the first time). */
export function statsFormHTML(p = {}) {
  const feet = p.heightIn ? Math.floor(p.heightIn / 12) : '';
  const inches = p.heightIn ? Math.round(p.heightIn % 12) : '';
  const value = (v) => (v ?? '') === '' ? '' : String(v);

  return `
    <div class="form-group">
      <div class="form-row">
        <span>Sex</span>
        <span class="segmented" role="radiogroup" aria-label="Sex">
          <label><input type="radio" name="sex" value="female" ${p.sex === 'female' ? 'checked' : ''}><span>Female</span></label>
          <label><input type="radio" name="sex" value="male" ${p.sex === 'male' ? 'checked' : ''}><span>Male</span></label>
        </span>
      </div>
      <label class="form-row">
        <span>Age</span>
        <span class="form-input-group">
          <input class="number-input" id="stat-age" name="age" inputmode="numeric" value="${value(p.age)}" placeholder="—" autocomplete="off">
          <span class="unit">yrs</span>
        </span>
      </label>
      <div class="form-row">
        <span>Height</span>
        <span class="form-input-group">
          <input class="number-input narrow" id="stat-feet" name="feet" inputmode="numeric" value="${value(feet)}" placeholder="—" aria-label="Feet" autocomplete="off">
          <span class="unit">ft</span>
          <input class="number-input narrow" id="stat-inches" name="inches" inputmode="numeric" value="${value(inches)}" placeholder="—" aria-label="Inches" autocomplete="off">
          <span class="unit">in</span>
        </span>
      </div>
      <label class="form-row">
        <span>Current weight</span>
        <span class="form-input-group">
          <input class="number-input" id="stat-weight" name="weightLb" inputmode="decimal" value="${value(p.weightLb)}" placeholder="—" autocomplete="off">
          <span class="unit">lb</span>
        </span>
      </label>
      <label class="form-row">
        <span>Goal weight</span>
        <span class="form-input-group">
          <input class="number-input" id="stat-goal" name="goalWeightLb" inputmode="decimal" value="${value(p.goalWeightLb)}" placeholder="—" autocomplete="off">
          <span class="unit">lb</span>
        </span>
      </label>
    </div>

    <h4 class="form-section-title">How active are you?</h4>
    <div class="form-group">
      ${ACTIVITY_LEVELS.map((level) => `
        <label class="form-row radio-row">
          <span>${level.label}</span>
          <input type="radio" name="activity" value="${level.id}" ${p.activity === level.id ? 'checked' : ''}>
          <span class="radio-check" aria-hidden="true"></span>
        </label>`).join('')}
    </div>`;
}

/** Reads the form inside `root` into a profile object. */
export function readStatsForm(root) {
  const get = (name) => root.querySelector(`[name="${name}"]`)?.value ?? '';
  const checked = (name) => root.querySelector(`[name="${name}"]:checked`)?.value ?? '';
  const goal = parseNumber(get('goalWeightLb'));
  return {
    sex: checked('sex'),
    age: parseNumber(get('age')),
    heightIn: totalInches(parseNumber(get('feet')), parseNumber(get('inches'))) || null,
    weightLb: parseNumber(get('weightLb')),
    goalWeightLb: goal,
    activity: checked('activity'),
  };
}

// ---- Daily targets fields (calories + macros) ---------------------------------------


const TARGET_FIELDS = [
  ['calories', 'Calories', 'kcal'],
  ['proteinG', 'Protein', 'g'],
  ['carbsG', 'Carbs', 'g'],
  ['fatG', 'Fat', 'g'],
];

export function targetsFieldsHTML(t = {}) {
  return `
    <div class="form-group">
      ${TARGET_FIELDS.map(([name, label, unit]) => `
        <label class="form-row">
          <span>${label}</span>
          <span class="form-input-group">
            <input class="number-input" id="target-${name}" name="${name}" inputmode="numeric"
                   value="${t[name] ?? ''}" placeholder="—" autocomplete="off">
            <span class="unit">${unit}</span>
          </span>
        </label>`).join('')}
    </div>
    <p class="footnote" data-macro-sum>${macroSumText(t)}</p>`;
}

export function readTargets(root) {
  const read = (name) => Math.round(parseNumber(root.querySelector(`[name="${name}"]`)?.value) ?? 0);
  return { calories: read('calories'), proteinG: read('proteinG'), carbsG: read('carbsG'), fatG: read('fatG') };
}

/** Puts numbers into the fields (e.g. "Use suggested"). */
export function fillTargets(root, t) {
  for (const [name] of TARGET_FIELDS) {
    const input = root.querySelector(`[name="${name}"]`);
    if (input) input.value = t[name];
  }
  updateMacroSum(root);
}

export function updateMacroSum(root) {
  const el = root.querySelector('[data-macro-sum]');
  if (el) el.textContent = macroSumText(readTargets(root));
}

function macroSumText(t) {
  if (!t.calories) return '';
  return `Protein, carbs and fat add up to ${macroCalories(t).toLocaleString()} kcal.`;
}
