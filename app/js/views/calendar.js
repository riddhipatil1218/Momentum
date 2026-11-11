// calendar.js
// The Calendar tab: a month view with dots (blue = workout, green = supplements),
// a legend with the supplement-dot toggle, and a sheet for any day you tap.

import { db } from '../db.js';
import { dayKeyFromDate, monthRange, todayKey } from '../logic/daykey.js';
import { monthGrid, preferredFirstWeekday, weekdayLetters } from '../logic/monthgrid.js';
import { plural } from '../logic/text.js';
import { formatLongDate, formatMonthYear } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { openDayDetail } from './dayDetail.js';

// Which month is showing. Kept while you switch tabs.
let displayedMonth = new Date();

// Remember the supplement-dot toggle on this phone. (Wrapped in try/catch because
// private browsing can block storage; the app still works, it just won't remember.)
const SHOW_SUPP_KEY = 'momentum.calendar.showSupplementDots';
function getShowSupplements() {
  try { return localStorage.getItem(SHOW_SUPP_KEY) !== 'false'; } catch { return true; }
}
function setShowSupplements(value) {
  try { localStorage.setItem(SHOW_SUPP_KEY, String(value)); } catch { /* ignore */ }
}

export async function renderCalendar(root, { isCurrent, refresh }) {
  const { first, last } = monthRange(displayedMonth);
  const [workouts, supplementLogs] = await Promise.all([
    db.getByDayRange('workouts', first, last),
    db.getByDayRange('supplementLogs', first, last),
  ]);
  if (!isCurrent()) return;

  const showSupplements = getShowSupplements();
  const workoutDays = new Set(workouts.map((w) => w.dayKey));
  const supplementDays = new Set(supplementLogs.map((l) => l.dayKey));
  const firstWeekday = preferredFirstWeekday();
  const { cells } = monthGrid(displayedMonth, firstWeekday);
  const today = todayKey();

  const cellHTML = cells.map((date) => {
    if (!date) return '<span class="day-cell empty"></span>';
    const key = dayKeyFromDate(date);
    const hasWorkout = workoutDays.has(key);
    const hasSupps = showSupplements && supplementDays.has(key);
    const label = formatLongDate(date) + (hasWorkout ? ', workout logged' : '') +
                  (hasSupps ? ', supplements logged' : '');
    return `
      <button class="day-cell ${key === today ? 'today' : ''} ${key > today ? 'future' : ''}"
              data-day="${key}" aria-label="${label}">
        <span class="day-number">${date.getDate()}</span>
        <span class="dots">
          ${hasWorkout ? '<i class="dot workout"></i>' : ''}
          ${hasSupps ? '<i class="dot supplement"></i>' : ''}
        </span>
      </button>`;
  }).join('');

  const summary = workouts.length === 0
    ? 'No workouts this month yet'
    : `${plural(workouts.length, 'workout')} on ${plural(workoutDays.size, 'day')} this month`;

  root.innerHTML = `
    <header class="page-header">
      <div><h1>Calendar</h1></div>
      <button class="pill-button" data-action="today">Today</button>
    </header>

    <section class="card month-card">
      <div class="month-header">
        <button class="icon-button" data-action="prev" aria-label="Previous month">${icons.chevronLeft}</button>
        <h2>${formatMonthYear(displayedMonth)}</h2>
        <button class="icon-button" data-action="next" aria-label="Next month">${icons.chevronRight}</button>
      </div>
      <div class="weekday-row">${weekdayLetters(firstWeekday).map((l) => `<span>${l}</span>`).join('')}</div>
      <div class="month-grid">${cellHTML}</div>
      <p class="month-summary">${summary}</p>
    </section>

    <section class="card">
      <div class="legend">
        <span><i class="dot workout"></i> Workout</span>
        <span><i class="dot supplement"></i> Supplements</span>
      </div>
      <label class="toggle-row">
        <span>Show supplement days</span>
        <input type="checkbox" class="switch" data-action="toggle-supplements" ${showSupplements ? 'checked' : ''}>
      </label>
    </section>`;

  const changeMonth = (by) => {
    displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + by, 1);
    refresh();
  };

  root.onclick = (event) => {
    const day = event.target.closest('[data-day]');
    if (day) return openDayDetail(Number(day.dataset.day));
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'prev') changeMonth(-1);
    if (action === 'next') changeMonth(1);
    if (action === 'today') { displayedMonth = new Date(); refresh(); }
  };

  root.onchange = (event) => {
    if (event.target.matches('[data-action="toggle-supplements"]')) {
      setShowSupplements(event.target.checked);
      refresh();
    }
  };

  // Swipe left/right on the month to change it.
  const monthCard = root.querySelector('.month-card');
  let touchStart = null;
  monthCard.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  monthCard.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) changeMonth(dx < 0 ? 1 : -1);
  }, { passive: true });
}
