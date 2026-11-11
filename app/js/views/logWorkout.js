// logWorkout.js
// Logs a workout and shows a cheerful confirmation with optional details.
//  - From Today's quick chips: the workout is logged on the tap, and this sheet opens on the confirmation.
//  - From a calendar day: this sheet first shows a grid of activities to pick from.

import { activeActivities, deleteWorkout, logWorkout, workoutsBetween } from '../data.js';
import { dateOnDayAtTime, startOfDay, todayKey } from '../logic/daykey.js';
import { preferredFirstWeekday } from '../logic/monthgrid.js';
import { loggedCheer, weekDayKeys } from '../logic/progress.js';
import { escapeHTML, monoEmoji } from '../logic/text.js';
import { formatShortDate } from '../ui/format.js';
import { haptic } from '../ui/haptics.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { bindWorkoutFields, workoutFieldsHTML } from './workoutFields.js';

/**
 * @param {number} dayKey which day to log onto
 * @param {object} [activity] if given, log it right away (one-tap logging)
 */
export function openLogWorkout(dayKey, activity = null) {
  const isToday = dayKey === todayKey();
  const dayLabel = formatShortDate(startOfDay(dayKey));
  const pickerTitle = isToday ? 'Log workout' : `Log for ${dayLabel}`;

  let logged = null;        // the workout just logged; null = still choosing
  let cheer = '';
  let showDetails = false;

  // If the workout list is edited (hold a tile) while picking, redraw the grid.
  const onDataChanged = () => { if (!logged && !activity) sheet.refresh(); };
  window.addEventListener('momentum:changed', onDataChanged);

  const sheet = openSheet({
    title: activity ? '' : pickerTitle,
    left: activity ? null : { label: 'Cancel' },
    right: activity ? { label: 'Done', bold: true } : null,
    onClose: () => window.removeEventListener('momentum:changed', onDataChanged),
    async render(body) {
      if (logged) renderConfirmation(body);
      else if (activity) body.innerHTML = '';   // logging in progress (a split second)
      else await renderPicker(body);
    },
  });

  if (activity) {
    haptic();
    log(activity);
  }

  async function log(chosen) {
    // Today: right now. Past day: that day at the current clock time.
    const when = isToday ? new Date() : dateOnDayAtTime(dayKey, new Date());
    logged = await logWorkout(chosen, when);
    const week = weekDayKeys(dayKey, preferredFirstWeekday());
    const weekWorkouts = await workoutsBetween(week[0], week[6]);
    cheer = loggedCheer(weekWorkouts.length);
    sheet.setTitle('');
    sheet.setButtons(null, { label: 'Done', bold: true });
    sheet.refresh();
  }

  async function renderPicker(body) {
    const activities = await activeActivities();
    body.innerHTML = `
      <div class="activity-grid">
        ${activities.map((a) => `
          <button class="activity-tile" data-id="${a.id}" data-hold>
            <span class="activity-emoji mono" aria-hidden="true">${escapeHTML(a.emoji)}</span>
            <span class="activity-name">${escapeHTML(a.name)}</span>
          </button>`).join('')}
      </div>`;

    body.onclick = (event) => {
      const tile = event.target.closest('.activity-tile');
      if (!tile) return;
      haptic();
      log(activities.find((a) => a.id === tile.dataset.id));
    };
  }

  function renderConfirmation(body) {
    body.innerHTML = `
      <div class="confirmation">
        <div class="confirmation-check">${icons.check}</div>
        <h2><span class="mono">${escapeHTML(logged.emoji)}</span> ${escapeHTML(logged.activityName)} logged</h2>
        <p>${monoEmoji(escapeHTML(isToday ? cheer : `Added to ${dayLabel}`))}</p>
      </div>

      <div class="form-group">
        <button class="form-row" data-toggle-details aria-expanded="${showDetails}">
          <span class="row-with-icon">${icons.sliders} Add details <span class="muted">optional</span></span>
          <span class="chevron ${showDetails ? 'open' : ''}">${icons.chevronDown}</span>
        </button>
      </div>

      <div class="details" ${showDetails ? '' : 'hidden'}>${workoutFieldsHTML(logged)}</div>

      <div class="form-group">
        <button class="form-row accent" data-another>${icons.plus} Log another workout</button>
        <button class="form-row destructive" data-undo>${icons.undo} Undo</button>
      </div>`;

    bindWorkoutFields(body.querySelector('.details'), logged);

    body.onclick = async (event) => {
      if (event.target.closest('[data-toggle-details]')) {
        showDetails = !showDetails;
        body.querySelector('.details').hidden = !showDetails;
        body.querySelector('.chevron').classList.toggle('open', showDetails);
        body.querySelector('[data-toggle-details]').ariaExpanded = String(showDetails);
      } else if (event.target.closest('[data-another]')) {
        backToPicker();
      } else if (event.target.closest('[data-undo]')) {
        const id = logged.id;
        backToPicker();
        await deleteWorkout(id);
      }
    };
  }

  function backToPicker() {
    logged = null;
    activity = null;
    showDetails = false;
    sheet.setTitle(pickerTitle);
    sheet.setButtons({ label: 'Cancel' }, null);
    sheet.refresh();
  }
}
