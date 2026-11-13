// workoutFields.js
// The optional detail fields for a workout. Which ones appear depends on the activity:
//   Running: distance + calculated pace · Stair Master: level, floors
//   Strength: body focus, notes · Hot Yoga: temperature · others: notes
// Everyone gets duration. Each change saves immediately.

import { saveWorkout } from '../data.js';
import { formatNumber, formatPace, paceMinutesPerMile, parseNumber } from '../logic/numbers.js';
import { BODY_FOCUS_OPTIONS, bodyFocusList, DetailKind, DURATION_PRESETS, toggleBodyFocus } from '../logic/workouts.js';
import { escapeHTML } from '../logic/text.js';

// "decimal" fields allow 3.1; "whole" fields are rounded to whole numbers.
function numberRow(label, field, value, unit, kind = 'decimal') {
  return `
    <label class="form-row">
      <span>${label}</span>
      <span class="form-input-group">
        <input class="number-input" type="text" inputmode="${kind === 'whole' ? 'numeric' : 'decimal'}"
               data-field="${field}" data-kind="${kind}" value="${formatNumber(value)}"
               placeholder="—" autocomplete="off">
        ${unit ? `<span class="unit">${unit}</span>` : ''}
      </span>
    </label>`;
}

// `selected` can be one value or a list (body focus allows several).
function chips(options, selected, field, format = (v) => v) {
  const isSelected = (option) => (Array.isArray(selected) ? selected.includes(option) : option === selected);
  return `<div class="chip-row">${options.map((option) => `
    <button class="chip ${isSelected(option) ? 'selected' : ''}" type="button"
            data-chip-field="${field}" data-value="${escapeHTML(option)}">${escapeHTML(format(option))}</button>`).join('')}
  </div>`;
}

function notesGroup(workout) {
  return `
    <h4 class="form-section-title">Notes</h4>
    <div class="form-group">
      <textarea class="notes-input" data-field="notes" data-kind="text" rows="3"
                placeholder="How did it feel?">${escapeHTML(workout.notes)}</textarea>
    </div>`;
}

function paceText(workout) {
  const pace = paceMinutesPerMile(workout.durationMinutes, workout.distanceMiles);
  return pace == null ? '—' : formatPace(pace);
}

/** HTML for the detail fields. */
export function workoutFieldsHTML(workout) {
  let extra = '';
  switch (workout.detailKind) {
    case DetailKind.running:
      extra = `
        <h4 class="form-section-title">Run</h4>
        <div class="form-group">
          ${numberRow('Distance', 'distanceMiles', workout.distanceMiles, 'mi')}
          <div class="form-row"><span>Pace</span><span class="pace-value" data-pace>${paceText(workout)}</span></div>
        </div>`;
      break;
    case DetailKind.stairMaster:
      extra = `
        <h4 class="form-section-title">Effort</h4>
        <div class="form-group">
          ${numberRow('Level', 'stairLevel', workout.stairLevel, '', 'whole')}
          ${numberRow('Floors', 'floors', workout.floors, '', 'whole')}
        </div>`;
      break;
    case DetailKind.strength:
      extra = `
        <h4 class="form-section-title">Body focus <span class="muted">· pick all that apply</span></h4>
        <div class="form-group padded">${chips(BODY_FOCUS_OPTIONS, bodyFocusList(workout), 'bodyFocus')}</div>
        ${notesGroup(workout)}`;
      break;
    case DetailKind.hotYoga:
      extra = `
        <h4 class="form-section-title">Room</h4>
        <div class="form-group">${numberRow('Temperature', 'temperatureF', workout.temperatureF, '°F', 'whole')}</div>`;
      break;
    default:
      extra = notesGroup(workout);
  }

  return `
    <h4 class="form-section-title">Duration</h4>
    <div class="form-group">
      ${numberRow('Duration', 'durationMinutes', workout.durationMinutes, 'min')}
      <div class="form-row padded">${chips(DURATION_PRESETS, workout.durationMinutes, 'durationMinutes')}</div>
    </div>
    ${extra}`;
}

/** Wires up the fields inside `root` so typing/tapping saves to `workout`. */
export function bindWorkoutFields(root, workout) {
  const refreshPace = () => {
    const el = root.querySelector('[data-pace]');
    if (el) el.textContent = paceText(workout);
  };
  const refreshChips = (field) => {
    root.querySelectorAll(`[data-chip-field="${field}"]`).forEach((chip) => {
      const selected = field === 'bodyFocus'
        ? bodyFocusList(workout).includes(chip.dataset.value)
        : String(workout[field]) === chip.dataset.value;
      chip.classList.toggle('selected', selected);
    });
  };

  // Typing in a field.
  root.addEventListener('input', (event) => {
    const input = event.target.closest('[data-field]');
    if (!input) return;
    const { field, kind } = input.dataset;
    if (kind === 'text') {
      workout[field] = input.value;
    } else {
      const value = parseNumber(input.value);
      workout[field] = value == null ? null : kind === 'whole' ? Math.round(value) : value;
    }
    refreshPace();
    refreshChips(field);
    saveWorkout(workout);
  });

  // Tapping a chip (duration preset or body focus).
  root.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-chip-field]');
    if (!chip) return;
    const field = chip.dataset.chipField;
    if (field === 'durationMinutes') {
      workout.durationMinutes = Number(chip.dataset.value);
      const input = root.querySelector('[data-field="durationMinutes"]');
      if (input) input.value = formatNumber(workout.durationMinutes);
      refreshPace();
    } else if (field === 'bodyFocus') {
      // Several muscle groups can be picked; tapping one again removes it.
      workout.bodyFocus = toggleBodyFocus(workout, chip.dataset.value);
    } else {
      // Tapping the selected option again clears it.
      workout[field] = workout[field] === chip.dataset.value ? null : chip.dataset.value;
    }
    refreshChips(field);
    saveWorkout(workout);
  });
}
