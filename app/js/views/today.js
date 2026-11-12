// today.js
// The Today tab: greeting with an encouraging line, this week's progress,
// one-tap quick-log chips, today's workouts, and the supplement checklist.

import { activeActivities, getWeeklyGoal, workoutsBetween } from '../data.js';
import { addDays, todayKey } from '../logic/daykey.js';
import { preferredFirstWeekday, weekdayLetters } from '../logic/monthgrid.js';
import { encouragement, weekDayKeys, workoutStreak } from '../logic/progress.js';
import { escapeHTML, monoEmoji } from '../logic/text.js';
import { formatLongDate, greeting } from '../ui/format.js';
import { loadBalances } from './balanceData.js';
import { handleDayCardTap, loadDay, supplementsCardHTML, workoutsCardHTML } from './dayCards.js';
import { openLogWorkout } from './logWorkout.js';

export async function renderToday(root, { isCurrent }) {
  // Worked out on every draw, so it rolls over after midnight.
  const today = todayKey();
  const firstWeekday = preferredFirstWeekday();
  const week = weekDayKeys(today, firstWeekday);

  const [{ workouts, supplements, takenIds }, activities, recent, goal, balance] = await Promise.all([
    loadDay(today),
    activeActivities(),
    workoutsBetween(addDays(today, -60), today), // enough history for streaks
    getWeeklyGoal(),
    loadBalances(),
  ]);
  if (!isCurrent()) return;

  const workoutDays = new Set(recent.map((w) => w.dayKey));
  // Workout names for each day this week, in the order they were logged (shown under each day).
  const namesByDay = new Map();
  for (const w of [...recent].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!week.includes(w.dayKey)) continue;
    namesByDay.set(w.dayKey, [...(namesByDay.get(w.dayKey) ?? []), w.activityName]);
  }
  const weekCount = recent.filter((w) => week.includes(w.dayKey)).length;
  const streak = workoutStreak(workoutDays, today);
  const message = encouragement({ workedOutToday: workouts.length > 0, weekCount, goal, streak });
  const letters = weekdayLetters(firstWeekday);

  root.innerHTML = `
    <header class="page-header">
      <div>
        <h1>${greeting()}</h1>
        <p class="header-date">${formatLongDate(new Date())}</p>
        <p class="encouragement">${monoEmoji(escapeHTML(message))}</p>
        ${streak || balance?.streak ? `
          <div class="streak-row" aria-label="Streaks">
            ${streak ? `<span class="streak-pill">${streak}-day workout streak</span>` : ''}
            ${balance?.streak ? `<span class="streak-pill">${balance.streak}-day deficit streak</span>` : ''}
          </div>` : ''}
      </div>
    </header>

    <section class="card week-card" aria-label="This week">
      <div class="card-header">
        <h3>This week</h3>
      </div>
      <div class="week-strip">
        ${week.map((key, i) => {
          const names = namesByDay.get(key) ?? [];
          return `
          <div class="week-day ${names.length ? 'done' : ''} ${key === today ? 'today' : ''} ${key > today ? 'future' : ''}">
            <span class="week-letter">${letters[i]}</span>
            <span class="week-dot">${names.length ? '✓' : key % 100}</span>
            <span class="week-names">${names.map((n) => `<span>${escapeHTML(n)}</span>`).join('')}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="goal-row">
        <div class="goal-bar"><span style="width:${Math.min(100, (weekCount / goal) * 100)}%"></span></div>
        <span class="goal-text"><strong>${weekCount}</strong> / ${goal} workouts</span>
      </div>
    </section>

    <section class="quick-log" aria-label="Log a workout">
      <div class="section-title-row">
        <h3 class="section-title">Log a workout</h3>
        <span class="hold-hint">Hold to edit</span>
      </div>
      <div class="quick-chips">
        ${activities.map((a) => `
          <button class="quick-chip" data-quick-log="${a.id}" data-hold>
            <span class="quick-emoji mono" aria-hidden="true">${escapeHTML(a.emoji)}</span>${escapeHTML(a.name)}
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
