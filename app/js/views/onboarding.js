// onboarding.js
// The welcome screen shown the first time Momentum opens:
//   Step 1: your stats.  Step 2: suggested daily targets (editable) and your weekly workout goal.
// Everything is saved only on this phone. "Skip for now" is always available.

import { DEFAULT_WEEKLY_GOAL, markSetupDone, saveProfile, saveTargets, saveWeeklyGoal } from '../data.js';
import { escapeHTML } from '../logic/text.js';
import { profileProblems, suggestTargets } from '../logic/targets.js';
import { readStatsForm, readTargets, statsFormHTML, targetsFieldsHTML, updateMacroSum } from './statsForm.js';

export function runOnboarding(root, onDone) {
  let profile = {};
  let weeklyGoal = DEFAULT_WEEKLY_GOAL;
  document.body.classList.add('onboarding');
  showStats();

  function finish() {
    document.body.classList.remove('onboarding');
    onDone();
  }

  function showStats() {
    root.innerHTML = `
      <header class="page-header">
        <div>
          <img class="welcome-icon" src="icons/icon.svg" alt="">
          <h1>Welcome to Momentum</h1>
          <p class="header-date">Answer a few questions to get suggested daily targets.
            Everything stays on this phone, and you can change it later in Settings.</p>
        </div>
      </header>
      <form class="stack" data-stats novalidate>
        ${statsFormHTML(profile)}
        <p class="form-problems" hidden></p>
        <button class="primary-button" type="submit">Calculate my targets</button>
        <button class="text-button centered" type="button" data-skip>Skip for now</button>
      </form>`;
    window.scrollTo(0, 0);

    const form = root.querySelector('[data-stats]');
    // Hide old error messages as soon as you change something.
    form.oninput = form.onchange = () => { form.querySelector('.form-problems').hidden = true; };
    form.onsubmit = (event) => {
      event.preventDefault();
      profile = readStatsForm(form);
      const problems = profileProblems(profile);
      const box = form.querySelector('.form-problems');
      if (problems.length) {
        box.innerHTML = problems.map(escapeHTML).join('<br>');
        box.hidden = false;
        return;
      }
      showTargets();
    };
    form.querySelector('[data-skip]').onclick = async () => {
      await markSetupDone();
      finish();
    };
  }

  function showTargets() {
    const suggested = suggestTargets(profile);
    root.innerHTML = `
      <header class="page-header">
        <div>
          <h1>Your daily targets</h1>
          <p class="header-date">${escapeHTML(explanation(profile, suggested))}</p>
        </div>
      </header>

      <section class="card targets-hero">
        <div class="hero-number"><strong>${suggested.calories.toLocaleString()}</strong><span>kcal a day</span></div>
        <div class="hero-macros">
          <span><strong>${suggested.proteinG}g</strong> protein</span>
          <span><strong>${suggested.carbsG}g</strong> carbs</span>
          <span><strong>${suggested.fatG}g</strong> fat</span>
        </div>
      </section>

      <div class="stack" data-targets>
        <h4 class="form-section-title">Adjust if you like</h4>
        ${targetsFieldsHTML(suggested)}

        <h4 class="form-section-title">Weekly workout goal</h4>
        <div class="form-group">
          <div class="form-row">
            <span>Workouts a week</span>
            <span class="stepper">
              <button type="button" data-step="-1" aria-label="Fewer">−</button>
              <strong data-goal>${weeklyGoal}</strong>
              <button type="button" data-step="1" aria-label="More">+</button>
            </span>
          </div>
        </div>

        <button class="primary-button" data-start>Start</button>
        <button class="text-button centered" data-back>Back</button>
      </div>`;
    window.scrollTo(0, 0);

    const box = root.querySelector('[data-targets]');
    box.oninput = () => updateMacroSum(box);
    box.onclick = async (event) => {
      const step = event.target.closest('[data-step]');
      if (step) {
        weeklyGoal = Math.min(14, Math.max(1, weeklyGoal + Number(step.dataset.step)));
        box.querySelector('[data-goal]').textContent = weeklyGoal;
      } else if (event.target.closest('[data-back]')) {
        showStats();
      } else if (event.target.closest('[data-start]')) {
        await saveProfile(profile);
        await saveTargets(readTargets(box));
        await saveWeeklyGoal(weeklyGoal);
        await markSetupDone();
        finish();
      }
    };
  }
}

/** One plain sentence on where the numbers come from. */
export function explanation(profile, t) {
  const base = `Maintaining your weight takes about ${t.maintenance.toLocaleString()} kcal a day.`;
  if (!t.losing) return `${base} These targets keep you there.`;
  if (Math.round((t.maintenance * 0.85) / 10) * 10 < t.calories) {
    return `${base} Calories are kept at a safe minimum of ${t.calories.toLocaleString()} kcal.`;
  }
  return `${base} A 15% deficit gives steady progress toward ${profile.goalWeightLb} lb.`;
}
