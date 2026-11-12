// mealCards.js
// The list of meals logged on a day, grouped into Breakfast / Lunch / Dinner / Snacks with
// subtotals, and the sheet for editing (name, time, numbers) or deleting one.
// Used on the Macros tab and in the calendar's day sheet.

import { deleteMeal, getMeal, moveMeal, saveMeal } from '../data.js';
import { fromLocalInputValue, toLocalInputValue } from '../logic/daykey.js';
import { dayTotals, groupMealsBySection, macroLine } from '../logic/meals.js';
import { parseNumber } from '../logic/numbers.js';
import { escapeHTML } from '../logic/text.js';
import { formatTime } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';

export function mealsCardHTML(meals, { title = 'Meals', emptyMessage = 'No meals logged.' } = {}) {
  const totals = dayTotals(meals);
  return `
    <section class="card meals-card">
      <div class="card-header">
        <h3>${escapeHTML(title)}</h3>
        ${meals.length ? `<span class="badge muted">${totals.calories.toLocaleString()} kcal</span>` : ''}
      </div>
      ${meals.length ? groupMealsBySection(meals).map((group) => `
        <div class="meal-section">
          <div class="meal-section-head">
            <span>${group.section}</span>
            <span>${group.totals.calories.toLocaleString()} kcal</span>
          </div>
          ${group.meals.map((meal) => `
            <button class="meal-row" data-edit-meal="${meal.id}">
              <span class="row-text">
                <span class="row-title">${escapeHTML(meal.name)}</span>
                <span class="row-subtitle">${macroLine(meal)}</span>
              </span>
              <span class="row-trailing">${formatTime(new Date(meal.date))}</span>
            </button>`).join('')}
        </div>`).join('') : `<p class="empty">${escapeHTML(emptyMessage)}</p>`}
    </section>`;
}

/** Handles a tap inside a meals card. Returns true if it was one of ours. */
export function handleMealCardTap(target) {
  const row = target.closest('[data-edit-meal]');
  if (!row) return false;
  openEditMeal(row.dataset.editMeal);
  return true;
}

const FIELDS = [
  ['calories', 'Calories', 'kcal'],
  ['proteinG', 'Protein', 'g'],
  ['carbsG', 'Carbs', 'g'],
  ['fatG', 'Fat', 'g'],
];

export async function openEditMeal(mealId) {
  const meal = await getMeal(mealId);
  if (!meal) return;
  let confirmDelete = false;

  const sheet = openSheet({
    title: 'Edit meal',
    render(body) {
      body.innerHTML = `
        <div class="form-group">
          <label class="form-row">
            <span>Name</span>
            <input class="text-input inline" name="name" value="${escapeHTML(meal.name)}" autocomplete="off">
          </label>
          <label class="form-row">
            <span>When</span>
            <input class="date-input" type="datetime-local" name="when" value="${toLocalInputValue(new Date(meal.date))}">
          </label>
          ${FIELDS.map(([field, label, unit]) => `
            <label class="form-row">
              <span>${label}</span>
              <span class="form-input-group">
                <input class="number-input" name="${field}" inputmode="numeric" value="${meal[field]}" autocomplete="off">
                <span class="unit">${unit}</span>
              </span>
            </label>`).join('')}
        </div>
        ${meal.assumptions?.length ? `
          <h4 class="form-section-title">Assumed portions</h4>
          <div class="form-group padded"><ul class="assumptions">${meal.assumptions.map((a) => `<li>${escapeHTML(a)}</li>`).join('')}</ul></div>` : ''}
        <div class="form-group">
          ${confirmDelete ? `
            <div class="form-row confirm-row">
              <span>Delete this meal?</span>
              <span class="confirm-buttons">
                <button class="chip" data-keep>Keep</button>
                <button class="chip danger" data-confirm-delete>Delete</button>
              </span>
            </div>` : `<button class="form-row destructive" data-delete>${icons.trash} Delete meal</button>`}
        </div>`;

      // Changes save as you type.
      body.oninput = (event) => {
        const { name, value } = event.target;
        if (name === 'name') {
          if (value.trim()) meal.name = value.trim();
        } else if (name === 'when') {
          const date = fromLocalInputValue(value);
          if (!date) return;
          moveMeal(meal, date); // also moves it to the right day and section
        } else if (FIELDS.some(([field]) => field === name)) {
          meal[name] = Math.max(0, Math.round(parseNumber(value) ?? 0));
        } else {
          return;
        }
        saveMeal(meal);
      };
      body.onclick = async (event) => {
        if (event.target.closest('[data-delete]')) { confirmDelete = true; sheet.refresh(); }
        if (event.target.closest('[data-keep]')) { confirmDelete = false; sheet.refresh(); }
        if (event.target.closest('[data-confirm-delete]')) { sheet.close(); await deleteMeal(meal.id); }
      };
    },
  });
}
