// dayCards.js
// The two cards shown for a day: the workouts list and the supplement checklist.
// Used on the Today tab and in the calendar's day sheet.

import { activeSupplements, checkAllSupplements, supplementLogsOnDay, toggleSupplement,
         uncheckAllSupplements, workoutsOnDay } from '../data.js';
import { db } from '../db.js';
import { workoutSummary } from '../logic/workouts.js';
import { escapeHTML } from '../logic/text.js';
import { formatTime } from '../ui/format.js';
import { haptic } from '../ui/haptics.js';
import { icons } from '../ui/icons.js';
import { openEditWorkout } from './editWorkout.js';

/** Loads everything the two cards need for one day. */
export async function loadDay(dayKey) {
  const [workouts, supplements, logs] = await Promise.all([
    workoutsOnDay(dayKey), activeSupplements(), supplementLogsOnDay(dayKey),
  ]);
  return { workouts, supplements, takenIds: new Set(logs.map((l) => l.supplementId)) };
}

// ---- Workouts card ----------------------------------------------------------------

export function workoutsCardHTML(workouts, emptyMessage) {
  const rows = workouts.map((w) => `
    <button class="workout-row" data-action="edit-workout" data-id="${w.id}">
      <span class="workout-emoji mono" aria-hidden="true">${escapeHTML(w.emoji)}</span>
      <span class="row-text">
        <span class="row-title">${escapeHTML(w.activityName)}</span>
        <span class="row-subtitle">${escapeHTML(workoutSummary(w))}</span>
      </span>
      <span class="row-trailing">${formatTime(new Date(w.date))}</span>
    </button>`).join('');

  return `
    <section class="card">
      <div class="card-header">
        <h3>Workouts</h3>
        ${workouts.length ? `<span class="badge workout">${workouts.length}</span>` : ''}
      </div>
      ${workouts.length ? rows : `<p class="empty">${escapeHTML(emptyMessage)}</p>`}
    </section>`;
}

// ---- Supplements card -------------------------------------------------------------

export function supplementsCardHTML(supplements, takenIds) {
  const takenCount = supplements.filter((s) => takenIds.has(s.id)).length;
  const allDone = takenCount === supplements.length && takenCount > 0;

  const rows = supplements.map((s) => {
    const taken = takenIds.has(s.id);
    return `
      <button class="supp-row ${taken ? 'taken' : ''}" data-action="toggle-supplement" data-hold
              data-id="${s.id}" data-taken="${taken}" aria-pressed="${taken}">
        <span class="check-circle">${taken ? icons.check : ''}</span>
        <span class="row-text">
          <span class="row-title">${escapeHTML(s.name)}</span>
          ${s.doseNote ? `<span class="row-subtitle">${escapeHTML(s.doseNote)}</span>` : ''}
        </span>
      </button>`;
  }).join('');

  return `
    <section class="card">
      <div class="card-header">
        <h3>Supplements <span class="hold-hint">Hold to edit</span></h3>
        <span class="badge ${allDone ? 'supplement' : 'muted'}">${allDone ? 'All done ✓' : `${takenCount} of ${supplements.length}`}</span>
      </div>
      <div class="supp-grid">${rows}</div>
      <div class="supp-actions">
        ${takenCount < supplements.length ? '<button class="link-button supplement" data-action="check-all">Check all</button>' : ''}
        ${takenCount > 0 ? '<button class="link-button muted-link" data-action="uncheck-all">Uncheck all</button>' : ''}
      </div>
    </section>`;
}

// ---- Taps on either card ----------------------------------------------------------

/** Handles a tap inside the cards. Returns true if it was one of ours. */
export async function handleDayCardTap(target, dayKey) {
  const button = target.closest('[data-action]');
  if (!button) return false;

  switch (button.dataset.action) {
    case 'edit-workout':
      openEditWorkout(button.dataset.id);
      return true;

    case 'toggle-supplement': {
      haptic();
      const wasTaken = button.dataset.taken === 'true';
      // Flip it on screen immediately so it feels instant; the save follows.
      button.classList.toggle('taken', !wasTaken);
      const supplement = await db.get('supplements', button.dataset.id);
      if (supplement) await toggleSupplement(supplement, dayKey, wasTaken);
      return true;
    }

    case 'check-all': {
      haptic();
      const { supplements, takenIds } = await loadDay(dayKey);
      await checkAllSupplements(supplements.filter((s) => !takenIds.has(s.id)), dayKey);
      return true;
    }

    case 'uncheck-all':
      haptic();
      await uncheckAllSupplements(dayKey);
      return true;
  }
  return false;
}
