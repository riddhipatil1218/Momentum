// balanceDay.js
// The "why" sheet for one day's calorie balance: the result, a few plain reasons, then
// everything that went into it (everyday burn, each workout, each meal). Arrows step to
// earlier or later days. Opened from the Dashboard chart and the calendar's day sheet.

import { getTargets } from '../data.js';
import { addDays, startOfDay, todayKey } from '../logic/daykey.js';
import { explainBalance, minutesText } from '../logic/energy.js';
import { escapeHTML } from '../logic/text.js';
import { formatMediumDate, formatTime } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { LOOKBACK_DAYS, loadDayBreakdown } from './balanceData.js';

const fmt = (n) => Math.round(n).toLocaleString();

export function openBalanceDay(startDayKey) {
  let dayKey = startDayKey;
  const today = todayKey();
  const oldest = addDays(today, -LOOKBACK_DAYS);

  const sheet = openSheet({
    title: 'Calorie balance',
    async render(body) {
      const [day, targets] = await Promise.all([loadDayBreakdown(dayKey), getTargets()]);
      const isToday = dayKey === today;

      const nav = `
        <div class="day-nav">
          <button class="icon-button" data-step="-1" aria-label="Previous day" ${dayKey <= oldest ? 'disabled' : ''}>${icons.chevronLeft}</button>
          <strong>${isToday ? 'Today' : formatMediumDate(startOfDay(dayKey))}</strong>
          <button class="icon-button" data-step="1" aria-label="Next day" ${dayKey >= today ? 'disabled' : ''}>${icons.chevronRight}</button>
        </div>`;

      if (!day) {
        body.innerHTML = `${nav}<p class="empty">Add your stats in Settings to see your calorie balance.</p>`;
      } else if (day.noMeals) {
        body.innerHTML = `${nav}
          <section class="card"><p class="empty">No meals were logged ${isToday ? 'today' : 'this day'}, so there’s no balance to show.
            Log meals in the Macros tab, or from this day in the Calendar.</p></section>`;
      } else {
        const reasons = explainBalance(day, targets?.calories);
        body.innerHTML = `${nav}
          <section class="balance-result ${day.inDeficit ? 'deficit' : 'surplus'}">
            <strong>${fmt(Math.abs(day.balance))} kcal</strong>
            <span>${day.inDeficit ? 'deficit' : 'surplus'}${isToday ? ' so far' : ''}</span>
          </section>

          <section class="card">
            <div class="card-header"><h3>Why</h3></div>
            <ul class="reasons">${reasons.map((r) => `<li>${escapeHTML(r)}</li>`).join('')}</ul>
          </section>

          <section class="card ledger">
            <div class="card-header"><h3>Burned</h3><span class="badge muted">${fmt(day.burned)} kcal</span></div>
            ${day.source === 'oura' ? `
              <div class="ledger-row"><span>Total burn, measured by Oura</span><strong>${fmt(day.oura.totalBurn)}</strong></div>
              ${day.oura.activeCalories ? `<div class="ledger-row muted"><span>of which active calories</span><strong>${fmt(day.oura.activeCalories)}</strong></div>` : ''}
              ${day.oura.steps ? `<div class="ledger-row muted"><span>Steps</span><strong>${fmt(day.oura.steps)}</strong></div>` : ''}
              ${day.oura.activityMinutes ? `<div class="ledger-row muted"><span>Activity time</span><strong>${minutesText(day.oura.activityMinutes)}</strong></div>` : ''}
              ${day.workouts.map((w) => `
                <div class="ledger-row muted">
                  <span><span class="ledger-emoji">${escapeHTML(w.emoji ?? '')}</span>${escapeHTML(w.name)} · ${w.minutes} min</span>
                  <strong>included</strong>
                </div>`).join('')}` : `
              <div class="ledger-row"><span>Everyday (your stats at ${fmt(day.weightLb)} lb)</span><strong>${fmt(day.everyday)}</strong></div>
              ${day.workouts.map((w) => `
                <div class="ledger-row">
                  <span><span class="ledger-emoji">${escapeHTML(w.emoji ?? '')}</span>${escapeHTML(w.name)} · ${w.minutes} min${w.assumedDuration ? ' (assumed)' : ''}</span>
                  <strong>${fmt(w.kcal)}</strong>
                </div>`).join('') || '<div class="ledger-row muted"><span>No workouts</span><strong>0</strong></div>'}`}
          </section>

          <section class="card ledger">
            <div class="card-header"><h3>Eaten</h3><span class="badge muted">${fmt(day.eaten)} kcal</span></div>
            ${day.meals.map((m) => `
              <div class="ledger-row">
                <span>${escapeHTML(m.name)} <em>${m.date ? formatTime(new Date(m.date)) : ''}</em></span>
                <strong>${fmt(m.kcal)}</strong>
              </div>`).join('')}
          </section>

          <p class="footnote">${day.source === 'oura'
            ? 'This day uses the total burn from your Oura screenshot, which already includes your workouts.'
            : 'Everyday burn = resting calories × 1.2 for daily life, from your stats. Workout calories depend on the activity, duration and pace. These are estimates.'}</p>`;
      }

      body.onclick = (event) => {
        const step = event.target.closest('[data-step]');
        if (!step || step.disabled) return;
        dayKey = addDays(dayKey, Number(step.dataset.step));
        sheet.refresh();
      };
    },
  });
}
