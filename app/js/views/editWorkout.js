// editWorkout.js
// Sheet for changing a logged workout's time and details, or deleting it.
// Changes save as you type.

import { deleteWorkout, getWorkout, moveWorkout, saveWorkout } from '../data.js';
import { fromLocalInputValue, toLocalInputValue } from '../logic/daykey.js';
import { escapeHTML } from '../logic/text.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { bindWorkoutFields, workoutFieldsHTML } from './workoutFields.js';

export async function openEditWorkout(workoutId) {
  const workout = await getWorkout(workoutId);
  if (!workout) return;

  openSheet({
    title: 'Edit workout',
    render(body, sheet) {
      body.innerHTML = `
        <div class="form-group">
          <div class="form-row">
            <span class="activity-label"><span class="emoji">${escapeHTML(workout.emoji)}</span>${escapeHTML(workout.activityName)}</span>
          </div>
          <label class="form-row">
            <span>When</span>
            <input class="date-input" type="datetime-local" data-when
                   value="${toLocalInputValue(new Date(workout.date))}">
          </label>
        </div>
        ${workoutFieldsHTML(workout)}
        <div class="form-group">
          <button class="form-row destructive" data-delete>${icons.trash} Delete workout</button>
        </div>`;

      bindWorkoutFields(body, workout);

      // Changing the date/time also moves the workout to that calendar day.
      body.querySelector('[data-when]').addEventListener('change', (event) => {
        const newDate = fromLocalInputValue(event.target.value);
        if (!newDate) return;
        moveWorkout(workout, newDate);
        saveWorkout(workout);
      });

      body.querySelector('[data-delete]').addEventListener('click', async () => {
        if (!confirm(`Delete this ${workout.activityName} workout?`)) return;
        sheet.close();
        await deleteWorkout(workout.id);
      });
    },
  });
}
