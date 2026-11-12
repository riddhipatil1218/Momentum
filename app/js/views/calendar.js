// calendar.js
// The Calendar tab: a large month view (workout days tinted burgundy, dots for workouts
// and supplements), a "This month" summary, an activity breakdown, and a month picker.
// Tap any day to see, edit or add what was logged that day.

import { db } from '../db.js';
import { dayKeyFromDate, monthRange, todayKey } from '../logic/daykey.js';
import { monthGrid, preferredFirstWeekday, weekdayLetters } from '../logic/monthgrid.js';
import { activityBreakdown, longestRun } from '../logic/progress.js';
import { escapeHTML, plural } from '../logic/text.js';
import { formatLongDate, formatMonthYear } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
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
  const workoutsByDay = new Map();
  for (const w of workouts) workoutsByDay.set(w.dayKey, [...(workoutsByDay.get(w.dayKey) ?? []), w]);
  const supplementDays = new Set(supplementLogs.map((l) => l.dayKey));
  const firstWeekday = preferredFirstWeekday();
  const { cells } = monthGrid(displayedMonth, firstWeekday);
  const today = todayKey();
  const monthDays = cells.filter(Boolean).map(dayKeyFromDate);
  const pastDays = monthDays.filter((d) => d <= today);

  // Month summary numbers.
  const activeDays = workoutsByDay.size;
  const bestStreak = longestRun(new Set(workoutsByDay.keys()), monthDays);
  const breakdown = activityBreakdown(workouts);
  const topCount = breakdown[0]?.count ?? 1;

  const cellHTML = cells.map((date) => {
    if (!date) return '<span class="cal-cell empty"></span>';
    const key = dayKeyFromDate(date);
    const dayWorkouts = workoutsByDay.get(key) ?? [];
    const hasSupps = showSupplements && supplementDays.has(key);
    const label = formatLongDate(date) +
      (dayWorkouts.length ? `, ${plural(dayWorkouts.length, 'workout')}` : '') +
      (hasSupps ? ', supplements logged' : '');
    return `
      <button class="cal-cell ${dayWorkouts.length ? 'has-workout' : ''} ${key === today ? 'today' : ''} ${key > today ? 'future' : ''}"
              data-day="${key}" aria-label="${label}">
        <span class="cal-number">${date.getDate()}</span>
        <span class="cal-dots">
          ${dayWorkouts.length ? `<i class="dot workout"></i>${dayWorkouts.length > 1 ? '<i class="dot workout"></i>' : ''}` : ''}
          ${hasSupps ? '<i class="dot supplement"></i>' : ''}
        </span>
      </button>`;
  }).join('');

  root.innerHTML = `
    <header class="page-header">
      <div><h1>Calendar</h1></div>
      <button class="pill-button" data-action="today">Today</button>
    </header>

    <section class="card month-card">
      <div class="month-header">
        <button class="icon-button" data-action="prev" aria-label="Previous month">${icons.chevronLeft}</button>
        <button class="month-title" data-action="pick-month" aria-label="Choose a month">
          ${formatMonthYear(displayedMonth)} ${icons.chevronDownSmall}
        </button>
        <button class="icon-button" data-action="next" aria-label="Next month">${icons.chevronRight}</button>
      </div>
      <div class="cal-weekdays">${weekdayLetters(firstWeekday).map((l) => `<span>${l}</span>`).join('')}</div>
      <div class="cal-grid">${cellHTML}</div>
      <div class="legend">
        <span><i class="dot workout"></i> Workout</span>
        <span><i class="dot supplement"></i> Supplements</span>
        <span><i class="legend-tint"></i> Active day</span>
      </div>
    </section>

    <section class="card">
      <div class="card-header"><h3>${escapeHTML(displayedMonth.toLocaleDateString(undefined, { month: 'long' }))} at a glance</h3></div>
      <div class="stat-tiles">
        <div class="stat-tile workout"><strong>${workouts.length}</strong><span>${workouts.length === 1 ? 'workout' : 'workouts'}</span></div>
        <div class="stat-tile plum"><strong>${activeDays}</strong><span>active ${activeDays === 1 ? 'day' : 'days'}</span></div>
        <div class="stat-tile mauve"><strong>${bestStreak}</strong><span>best streak</span></div>
        <div class="stat-tile rose"><strong>${supplementDays.size}<small>/${pastDays.length || monthDays.length}</small></strong><span>supplement days</span></div>
      </div>
      ${breakdown.length ? `
        <h4 class="form-section-title inline-title">Workouts by type</h4>
        <div class="breakdown">
          ${breakdown.map((a) => `
            <div class="breakdown-row">
              <span class="breakdown-name"><span class="mono">${escapeHTML(a.emoji)}</span> ${escapeHTML(a.name)}</span>
              <span class="breakdown-bar"><span style="width:${Math.round((a.count / topCount) * 100)}%"></span></span>
              <span class="breakdown-count">${a.count}</span>
            </div>`).join('')}
        </div>` : '<p class="empty">No workouts logged this month yet.</p>'}
    </section>

    <section class="card">
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
    if (action === 'pick-month') openMonthPicker(refresh);
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

/** A sheet with a year switcher and 12 month buttons. */
function openMonthPicker(refresh) {
  let year = displayedMonth.getFullYear();
  const sheet = openSheet({
    title: 'Choose a month',
    render(body) {
      const now = new Date();
      body.innerHTML = `
        <div class="year-switch">
          <button class="icon-button" data-year="-1" aria-label="Previous year">${icons.chevronLeft}</button>
          <strong>${year}</strong>
          <button class="icon-button" data-year="1" aria-label="Next year">${icons.chevronRight}</button>
        </div>
        <div class="month-picker">
          ${Array.from({ length: 12 }, (_, m) => {
            const isShown = year === displayedMonth.getFullYear() && m === displayedMonth.getMonth();
            const isNow = year === now.getFullYear() && m === now.getMonth();
            return `<button class="month-option ${isShown ? 'selected' : ''} ${isNow ? 'current' : ''}" data-month="${m}">
              ${new Date(year, m, 1).toLocaleDateString(undefined, { month: 'short' })}</button>`;
          }).join('')}
        </div>`;
      body.onclick = (event) => {
        const yearButton = event.target.closest('[data-year]');
        if (yearButton) { year += Number(yearButton.dataset.year); sheet.refresh(); return; }
        const monthButton = event.target.closest('[data-month]');
        if (monthButton) {
          displayedMonth = new Date(year, Number(monthButton.dataset.month), 1);
          sheet.close();
          refresh();
        }
      };
    },
  });
}
