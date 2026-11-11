// today.js
// The Today tab: greeting, the big "Log workout" button, today's workouts,
// and the supplement checklist.

import { todayKey } from '../logic/daykey.js';
import { formatLongDate, greeting } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { handleDayCardTap, loadDay, supplementsCardHTML, workoutsCardHTML } from './dayCards.js';
import { openLogWorkout } from './logWorkout.js';

export async function renderToday(root, { isCurrent }) {
  // Worked out on every draw, so it rolls over after midnight.
  const dayKey = todayKey();
  const { workouts, supplements, takenIds } = await loadDay(dayKey);
  if (!isCurrent()) return;

  root.innerHTML = `
    <header class="page-header">
      <div>
        <p class="eyebrow">${formatLongDate(new Date())}</p>
        <h1>Today</h1>
        <p class="greeting">${greeting()}</p>
      </div>
    </header>

    <button class="big-button" data-action="log-workout">
      ${icons.plus}
      <span>Log workout</span>
      ${icons.chevronRight}
    </button>

    ${workoutsCardHTML(workouts, "Nothing yet today — you've got this.")}
    ${supplementsCardHTML(supplements, takenIds)}`;

  root.onclick = async (event) => {
    if (event.target.closest('[data-action="log-workout"]')) {
      openLogWorkout(dayKey);
      return;
    }
    await handleDayCardTap(event.target, dayKey);
  };
  root.onchange = null;
}
