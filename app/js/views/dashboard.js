// dashboard.js
// The Dashboard tab: calorie balance (burned vs eaten, deficit streak, last 7 days),
// today's calories and macros as progress bars against your targets (under / on target / over),
// and a 7-day view of which goals you hit each day.
// It redraws whenever a meal is logged, edited or deleted.

import { getTargets, mealsBetween } from '../data.js';
import { addDays, startOfDay, todayKey } from '../logic/daykey.js';
import { barPercent, daysOnTarget, goalStatus, METRICS, remainingText, statusLabel, TOLERANCE, weekGrid }
  from '../logic/goals.js';
import { dayTotals } from '../logic/meals.js';
import { poundsFromCalories } from '../logic/energy.js';
import { loadBalances } from './balanceData.js';
import { formatLongDate } from '../ui/format.js';

const STATUS_MARK = { on: '✓', under: '↓', over: '↑' };

export async function renderDashboard(root, { isCurrent }) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)); // oldest first
  const [targets, meals, balance] = await Promise.all([getTargets(), mealsBetween(days[0], today), loadBalances()]);
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

    ${balanceCardHTML(balance, days)}

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

// ---- Calorie balance --------------------------------------------------------------------

function balanceCardHTML(data, days) {
  if (!data) {
    return `
      <section class="card balance-card">
        <div class="card-header"><h3>Calorie balance</h3></div>
        <p class="empty">Add your stats in Settings to see whether you’re in a calorie deficit.</p>
      </section>`;
  }
  const { balances, streak, todayBurn, todayEaten, today } = data;
  const left = todayBurn.total - todayEaten;
  const pastWeek = days.filter((d) => d !== today).map((d) => balances.get(d)).filter(Boolean);
  const weekBalance = pastWeek.reduce((sum, b) => sum + b.balance, 0);
  const shown = days.map((d) => ({ day: d, balance: balances.get(d) }));
  const biggest = Math.max(1, ...shown.map((x) => Math.abs(x.balance?.balance ?? 0)));

  return `
    <section class="card balance-card" aria-label="Calorie balance">
      <div class="card-header">
        <h3>Calorie balance</h3>
        <span class="streak-pill ${streak ? '' : 'muted'}">${streak
          ? `${streak}-day deficit streak` : 'No deficit streak yet'}</span>
      </div>

      <div class="balance-today">
        <div class="balance-main ${left >= 0 ? 'deficit' : 'surplus'}">
          <strong>${Math.abs(left).toLocaleString()}</strong>
          <span>${left >= 0 ? 'kcal left today and still in a deficit' : 'kcal over today’s burn'}</span>
        </div>
        <div class="balance-parts">
          <div><span>Burned (est.)</span><strong>${todayBurn.total.toLocaleString()}</strong></div>
          <div><span>Eaten</span><strong>${todayEaten.toLocaleString()}</strong></div>
        </div>
      </div>
      <p class="footnote">Burn = ${todayBurn.everyday.toLocaleString()} kcal from your stats (resting + daily life)
        + ${todayBurn.workouts.toLocaleString()} kcal from today’s workouts${todayBurn.assumedDurations
          ? ` (${todayBurn.assumedDurations} without a duration counted as 45 min)` : ''}.</p>

      <h4 class="form-section-title inline-title">Last 7 days</h4>
      <div class="balance-bars" role="list">
        ${shown.map(({ day, balance }) => {
          const value = balance?.balance ?? 0;
          const height = balance ? Math.max(4, Math.round((Math.abs(value) / biggest) * 100)) : 0;
          return `
            <div class="balance-col ${balance ? (balance.inDeficit ? 'deficit' : 'surplus') : 'empty'} ${day === today ? 'is-today' : ''}" role="listitem"
                 aria-label="${startOfDay(day).toLocaleDateString(undefined, { weekday: 'long' })}: ${balance
                   ? `${Math.abs(value)} kcal ${balance.inDeficit ? 'deficit' : 'surplus'}` : 'no meals logged'}">
              <span class="balance-value">${balance ? `${value > 0 ? '−' : '+'}${Math.abs(value).toLocaleString()}` : '—'}</span>
              <span class="balance-track"><span style="height:${height}%"></span></span>
              <span class="balance-day">${startOfDay(day).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
            </div>`;
        }).join('')}
      </div>
      <p class="balance-summary">${pastWeek.length
        ? (weekBalance >= 0
          ? `Past ${pastWeek.length} logged day${pastWeek.length === 1 ? '' : 's'}: <strong>${weekBalance.toLocaleString()} kcal deficit</strong> ≈ ${poundsFromCalories(weekBalance)} lb`
          : `Past ${pastWeek.length} logged day${pastWeek.length === 1 ? '' : 's'}: <strong class="surplus">${(-weekBalance).toLocaleString()} kcal surplus</strong>`)
        : 'Log meals to see your daily balance.'}</p>
      <p class="footnote">−  = deficit (burned more than eaten), + = surplus. Days without meals are blank and end a streak.
        Burn is an estimate.</p>
    </section>`;
}
