// logWorkout.js
// Step 1: a grid of big activity tiles. Tapping one logs it immediately (with a haptic).
// Step 2: a confirmation with optional "Add details", "Log another" and "Undo".

import { activeActivities, deleteWorkout, logWorkout } from '../data.js';
import { dateOnDayAtTime, startOfDay, todayKey } from '../logic/daykey.js';
import { escapeHTML } from '../logic/text.js';
import { formatShortDate } from '../ui/format.js';
import { haptic } from '../ui/haptics.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { bindWorkoutFields, workoutFieldsHTML } from './workoutFields.js';

/** @param {number} dayKey which day to log onto (today or a calendar day) */
export function openLogWorkout(dayKey) {
  const isToday = dayKey === todayKey();
  const dayLabel = formatShortDate(startOfDay(dayKey));

  let logged = null;        // the workout just logged; null = still choosing
  let showDetails = false;

  const sheet = openSheet({
    title: isToday ? 'Log workout' : `Log for ${dayLabel}`,
    left: { label: 'Cancel' },
    right: null,
    async render(body) {
      if (logged) renderConfirmation(body);
      else await renderPicker(body);
    },
  });

  async function renderPicker(body) {
    const activities = await activeActivities();
    body.innerHTML = `
      <div class="activity-grid">
        ${activities.map((a) => `
          <button class="activity-tile" data-id="${a.id}">
            <span class="activity-emoji" aria-hidden="true">${escapeHTML(a.emoji)}</span>
            <span class="activity-name">${escapeHTML(a.name)}</span>
          </button>`).join('')}
      </div>`;

    body.onclick = async (event) => {
      const tile = event.target.closest('.activity-tile');
      if (!tile) return;
      haptic();
      const activity = activities.find((a) => a.id === tile.dataset.id);
      // Today: right now. Past day: that day at the current clock time.
      const when = isToday ? new Date() : dateOnDayAtTime(dayKey, new Date());
      logged = await logWorkout(activity, when);
      sheet.setTitle('');
      sheet.setButtons(null, { label: 'Done', bold: true });
      sheet.refresh();
    };
  }

  function renderConfirmation(body) {
    body.innerHTML = `
      <div class="confirmation">
        <div class="confirmation-check">${icons.check}</div>
        <h2>${escapeHTML(logged.activityName)} logged</h2>
        <p>${isToday ? 'Nice work today! 🎉' : `Added to ${escapeHTML(dayLabel)}`}</p>
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
    showDetails = false;
    sheet.setTitle(isToday ? 'Log workout' : `Log for ${dayLabel}`);
    sheet.setButtons({ label: 'Cancel' }, null);
    sheet.refresh();
  }
}
