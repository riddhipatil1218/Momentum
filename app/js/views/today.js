// today.js
// The Today tab: greeting with an encouraging line, this week's progress,
// one-tap quick-log chips, today's workouts, and the supplement checklist.

import { activeActivities, workoutsBetween } from '../data.js';
import { addDays, todayKey } from '../logic/daykey.js';
import { preferredFirstWeekday, weekdayLetters } from '../logic/monthgrid.js';
import { encouragement, WEEKLY_WORKOUT_GOAL, weekDayKeys, workoutStreak } from '../logic/progress.js';
import { escapeHTML } from '../logic/text.js';
import { formatLongDate, greeting } from '../ui/format.js';
import { handleDayCardTap, loadDay, supplementsCardHTML, workoutsCardHTML } from './dayCards.js';
import { openLogWorkout } from './logWorkout.js';

export async function renderToday(root, { isCurrent }) {
  // Worked out on every draw, so it rolls over after midnight.
  const today = todayKey();
  const firstWeekday = preferredFirstWeekday();
  const week = weekDayKeys(today, firstWeekday);

  const [{ workouts, supplements, takenIds }, activities, recent] = await Promise.all([
    loadDay(today),
    activeActivities(),
    workoutsBetween(addDays(today, -60), today), // enough history for streaks
  ]);
  if (!isCurrent()) return;

  const workoutDays = new Set(recent.map((w) => w.dayKey));
  const weekCount = recent.filter((w) => week.includes(w.dayKey)).length;
  const streak = workoutStreak(workoutDays, today);
  const goal = WEEKLY_WORKOUT_GOAL;
  const message = encouragement({ workedOutToday: workouts.length > 0, weekCount, goal, streak });
  const letters = weekdayLetters(firstWeekday);

  root.innerHTML = `
    <header class="page-header">
      <div>
        <p class="eyebrow">${formatLongDate(new Date())}</p>
        <h1>${greeting()}</h1>
        <p class="encouragement">${escapeHTML(message)}</p>
      </div>
    </header>

    <section class="card week-card" aria-label="This week">
      <div class="card-header">
        <h3>This week</h3>
        ${streak >= 2 ? `<span class="streak-chip">🔥 ${streak}-day streak</span>` : ''}
      </div>
      <div class="week-strip">
        ${week.map((key, i) => `
          <div class="week-day ${workoutDays.has(key) ? 'done' : ''} ${key === today ? 'today' : ''} ${key > today ? 'future' : ''}">
            <span class="week-letter">${letters[i]}</span>
            <span class="week-dot">${workoutDays.has(key) ? '✓' : ''}</span>
          </div>`).join('')}
      </div>
      <div class="goal-row">
        <div class="goal-bar"><span style="width:${Math.min(100, (weekCount / goal) * 100)}%"></span></div>
        <span class="goal-text"><strong>${weekCount}</strong> / ${goal} workouts</span>
      </div>
    </section>

    <section class="quick-log" aria-label="Log a workout">
      <h3 class="section-title">Log a workout</h3>
      <div class="quick-chips">
        ${activities.map((a) => `
          <button class="quick-chip" data-quick-log="${a.id}">
            <span class="quick-emoji" aria-hidden="true">${escapeHTML(a.emoji)}</span>${escapeHTML(a.name)}
          </button>`).join('')}
      </div>
    </section>

    ${workoutsCardHTML(workouts, 'No workouts yet today. Tap one above to log it.')}
    ${supplementsCardHTML(supplements, takenIds)}`;

  root.onclick = async (event) => {
    const chip = event.target.closest('[data-quick-log]');
    if (chip) {
      openLogWorkout(today, activities.find((a) => a.id === chip.dataset.quickLog));
      return;
    }
    await handleDayCardTap(event.target, today);
  };
  root.onchange = null;
}
