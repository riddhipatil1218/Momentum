// dashboard.js
// The Dashboard tab: today's calories and macros as progress bars against your targets
// (under / on target / over), and a 7-day view of which goals you hit each day.
// It redraws whenever a meal is logged, edited or deleted.

import { getTargets, mealsBetween } from '../data.js';
import { addDays, startOfDay, todayKey } from '../logic/daykey.js';
import { barPercent, daysOnTarget, goalStatus, METRICS, remainingText, statusLabel, TOLERANCE, weekGrid }
  from '../logic/goals.js';
import { dayTotals } from '../logic/meals.js';
import { formatLongDate } from '../ui/format.js';

const STATUS_MARK = { on: '✓', under: '↓', over: '↑' };

export async function renderDashboard(root, { isCurrent }) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)); // oldest first
  const [targets, meals] = await Promise.all([getTargets(), mealsBetween(days[0], today)]);
  if (!isCurrent()) return;

  // Totals per day (only days that have meals).
  const byDay = new Map();
  for (const day of days) {
    const dayMeals = meals.filter((m) => m.dayKey === day);
    if (dayMeals.length) byDay.set(day, dayTotals(dayMeals));
  }
  const todayTotals = byDay.get(today) ?? dayTotals([]);
  const grid = weekGrid(days, byDay, targets);
  const loggedDays = grid.filter((d) => d.logged).length;
  // Sum of the logged days' totals; divided by the number of days below for averages.
  const averages = loggedDays ? dayTotals([...byDay.values()]) : null;

  root.innerHTML = `
    <header class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="header-date">${formatLongDate(new Date())}</p>
      </div>
    </header>

    ${targets ? `
      <section class="card progress-card" aria-label="Today">
        <div class="card-header"><h3>Today</h3><span class="badge muted">${todayTotals.calories.toLocaleString()} kcal eaten</span></div>
        ${METRICS.map(({ key, label, unit }) => progressRowHTML(label, unit, todayTotals[key], targets[key])).join('')}
      </section>

      <section class="card week-goals" aria-label="Last 7 days">
        <div class="card-header">
          <h3>Last 7 days</h3>
          <span class="badge muted">${loggedDays ? `Calories on target ${daysOnTarget(grid)} of ${loggedDays} days` : 'No meals yet'}</span>
        </div>
        <div class="goal-table" role="table">
          <div class="goal-row-head" role="row">
            <span role="columnheader"></span>
            ${days.map((day) => `
              <span role="columnheader" class="${day === today ? 'is-today' : ''}">
                <b>${startOfDay(day).toLocaleDateString(undefined, { weekday: 'narrow' })}</b>${day % 100}
              </span>`).join('')}
          </div>
          ${METRICS.map(({ key, label }) => `
            <div class="goal-row-body" role="row">
              <span role="rowheader">${label}</span>
              ${grid.map((day) => {
                const status = day.statuses[key];
                return `<span role="cell" class="goal-cell ${status ?? 'empty'}"
                  aria-label="${label} ${status ? statusLabel(status) : 'no meals'}">${status ? STATUS_MARK[status] : '·'}</span>`;
              }).join('')}
            </div>`).join('')}
        </div>
        <div class="goal-legend">
          <span><i class="goal-cell on">✓</i> On target</span>
          <span><i class="goal-cell under">↓</i> Under</span>
          <span><i class="goal-cell over">↑</i> Over</span>
        </div>
        ${averages ? `
          <p class="footnote">Average on days with meals: ${Math.round(averages.calories / loggedDays).toLocaleString()} kcal ·
            ${Math.round(averages.proteinG / loggedDays)}g protein · ${Math.round(averages.carbsG / loggedDays)}g carbs ·
            ${Math.round(averages.fatG / loggedDays)}g fat.</p>` : ''}
      </section>

      <p class="footnote">“On target” means within ${Math.round(TOLERANCE * 100)}% of your goal. Change your targets in Settings.</p>` : `
      <section class="card coming-soon">
        <div class="coming-soon-emoji mono">🎯</div>
        <h2>Set your daily targets</h2>
        <p>Add your stats in Settings to get calorie and macro targets. Your progress shows up here.</p>
      </section>`}`;

  root.onclick = null;
}

function progressRowHTML(label, unit, value, target) {
  const status = goalStatus(value, target);
  return `
    <div class="progress-row ${status ?? ''}">
      <div class="progress-top">
        <span class="progress-label">${label}</span>
        <span class="progress-numbers"><strong>${Math.round(value).toLocaleString()}</strong> / ${Number(target).toLocaleString()} ${unit}</span>
        ${status ? `<span class="status-pill ${status}">${statusLabel(status)}</span>` : ''}
      </div>
      <div class="progress-bar" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.round(value)}">
        <span style="width:${barPercent(value, target)}%"></span>
      </div>
      <span class="progress-note">${remainingText(value, target, unit)}</span>
    </div>`;
}
