// dayDetail.js
// Sheet shown when you tap a calendar day: that day's workouts (edit, delete, add)
// and its supplement checklist (check/uncheck past days).

import { startOfDay } from '../logic/daykey.js';
import { formatMediumDate } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { mealsOnDay } from '../data.js';
import { handleDayCardTap, loadDay, supplementsCardHTML, workoutsCardHTML } from './dayCards.js';
import { handleMealCardTap, mealsCardHTML } from './mealCards.js';
import { loadDayBreakdown } from './balanceData.js';
import { openBalanceDay } from './balanceDay.js';
import { openLogWorkout } from './logWorkout.js';

export function openDayDetail(dayKey) {
  openSheet({
    title: formatMediumDate(startOfDay(dayKey)),
    live: true, // redraw when anything is logged/edited
    async render(body) {
      const [{ workouts, supplements, takenIds }, meals, balance] = await Promise.all([loadDay(dayKey), mealsOnDay(dayKey), loadDayBreakdown(dayKey)]);
      body.innerHTML = `
        ${workoutsCardHTML(workouts, 'No workouts this day.')}
        <button class="soft-button" data-action="log-for-day">${icons.plus} Log a workout for this day</button>
        ${supplementsCardHTML(supplements, takenIds)}
        ${mealsCardHTML(meals, { emptyMessage: 'No meals logged this day.' })}
        ${balance && !balance.noMeals ? `
          <button class="form-group balance-link ${balance.inDeficit ? 'deficit' : 'surplus'}" data-balance-day="${dayKey}">
            <span class="form-row"><span>Calorie balance</span>
              <span class="row-value"><strong>${Math.abs(balance.balance).toLocaleString()} kcal ${balance.inDeficit ? 'deficit' : 'surplus'}</strong> ›</span></span>
          </button>` : ''}`;

      body.onclick = async (event) => {
        if (event.target.closest('[data-action="log-for-day"]')) {
          openLogWorkout(dayKey);
          return;
        }
        const balanceButton = event.target.closest('[data-balance-day]');
        if (balanceButton) return openBalanceDay(dayKey);
        if (handleMealCardTap(event.target)) return;
        await handleDayCardTap(event.target, dayKey);
      };
    },
  });
}
