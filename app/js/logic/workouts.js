// workouts.js
// Workout activity types, default lists, and the one-line summary under each workout.

import { formatNumber, formatPace, paceMinutesPerMile } from './numbers.js';

/** Which optional detail fields an activity shows. */
export const DetailKind = Object.freeze({
  running: 'running',         // duration, distance, pace
  stairMaster: 'stairMaster', // duration, level, floors
  strength: 'strength',       // duration, body focus, notes
  hotYoga: 'hotYoga',         // duration, temperature
  general: 'general',         // duration, notes (Yoga, Pilates, Sculpt, custom)
});

export const BODY_FOCUS_OPTIONS = ['Full body', 'Upper body', 'Lower body', 'Glutes', 'Arms', 'Back', 'Core'];
export const DURATION_PRESETS = [20, 30, 45, 60, 75];

/** The workout menu created on first launch. Editable in Settings (Milestone 2). */
export const DEFAULT_ACTIVITIES = [
  { name: 'Running', emoji: '🏃‍♀️', detailKind: DetailKind.running },
  { name: 'Stair Master', emoji: '🪜', detailKind: DetailKind.stairMaster },
  { name: 'Strength Training', emoji: '🏋️‍♀️', detailKind: DetailKind.strength },
  { name: 'Hot Yoga', emoji: '🔥', detailKind: DetailKind.hotYoga },
  { name: 'Yoga', emoji: '🧘‍♀️', detailKind: DetailKind.general },
  { name: 'Pilates', emoji: '🤸‍♀️', detailKind: DetailKind.general },
  { name: 'Sculpt', emoji: '💪', detailKind: DetailKind.general },
];

export const DEFAULT_SUPPLEMENTS = [
  'Multivitamin', 'Probiotic', 'Omega-3', 'Collagen', 'Protein', 'Biotin', 'Iron', 'Creatine',
];

/** One-line summary, e.g. "45 min · 3.1 mi · 9:41 /mi". */
export function workoutSummary(workout) {
  const parts = [];
  if (workout.durationMinutes != null) parts.push(`${formatNumber(workout.durationMinutes)} min`);

  switch (workout.detailKind) {
    case DetailKind.running: {
      if (workout.distanceMiles != null) parts.push(`${formatNumber(workout.distanceMiles)} mi`);
      const pace = paceMinutesPerMile(workout.durationMinutes, workout.distanceMiles);
      if (pace != null) parts.push(formatPace(pace));
      break;
    }
    case DetailKind.stairMaster:
      if (workout.stairLevel != null) parts.push(`Level ${workout.stairLevel}`);
      if (workout.floors != null) parts.push(`${workout.floors} floors`);
      break;
    case DetailKind.strength:
      if (workout.bodyFocus) parts.push(workout.bodyFocus);
      break;
    case DetailKind.hotYoga:
      if (workout.temperatureF != null) parts.push(`${workout.temperatureF}°F`);
      break;
  }

  if (parts.length === 0 && workout.notes) parts.push(workout.notes);
  return parts.length ? parts.join(' · ') : 'Tap to add details';
}
