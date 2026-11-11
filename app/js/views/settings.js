// settings.js
// The Settings tab: your stats, daily targets, weekly workout goal, the supplement and
// workout lists, and the AI key for meal estimates. Editing opens a sheet; the tab itself
// only shows the current values, so it can redraw freely.

import { getApiKey, getProfile, getTargets, getWeeklyGoal, removeApiKey, saveApiKey, saveProfile,
         saveTargets, saveWeeklyGoal } from '../data.js';
import { ACTIVITY_LEVELS, formatHeight, profileProblems, suggestTargets } from '../logic/targets.js';
import { escapeHTML } from '../logic/text.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { openManageActivities, openManageSupplements } from './manage.js';
import { explanation } from './onboarding.js';
import { fillTargets, readStatsForm, readTargets, statsFormHTML, targetsFieldsHTML,
         updateMacroSum } from './statsForm.js';

export async function renderSettings(root, { isCurrent }) {
  const [profile, targets, weeklyGoal, apiKey] = await Promise.all([
    getProfile(), getTargets(), getWeeklyGoal(), getApiKey(),
  ]);
  if (!isCurrent()) return;

  const activity = ACTIVITY_LEVELS.find((a) => a.id === profile?.activity)?.label;
  const statsSummary = profile
    ? [profile.sex === 'female' ? 'Female' : 'Male', `${profile.age} yrs`, formatHeight(profile.heightIn),
       `${profile.weightLb} lb`].join(' · ')
    : 'Not set up yet';

  root.innerHTML = `
    <header class="page-header"><div><h1>Settings</h1></div></header>

    <h3 class="section-title">You</h3>
    <div class="form-group">
      <button class="form-row settings-row" data-open="stats">
        <span class="row-text">
          <span class="row-title">Your stats</span>
          <span class="row-subtitle">${escapeHTML(statsSummary)}</span>
        </span>
        ${icons.chevronRight}
      </button>
      ${profile ? `
        <div class="form-row"><span>Goal weight</span><span class="row-value">${profile.goalWeightLb ? `${profile.goalWeightLb} lb` : '—'}</span></div>
        <div class="form-row"><span>Activity</span><span class="row-value">${escapeHTML(activity ?? '—')}</span></div>` : ''}
    </div>

    <h3 class="section-title">Daily targets</h3>
    <div class="form-group">
      <button class="form-row settings-row" data-open="targets">
        <span class="row-text">
          <span class="row-title">${targets ? `${targets.calories.toLocaleString()} kcal` : 'Not set yet'}</span>
          <span class="row-subtitle">${targets ? `${targets.proteinG}g protein · ${targets.carbsG}g carbs · ${targets.fatG}g fat` : 'Add your stats to get suggestions'}</span>
        </span>
        ${icons.chevronRight}
      </button>
      <div class="form-row">
        <span>Weekly workout goal</span>
        <span class="stepper">
          <button type="button" data-step="-1" aria-label="Fewer">−</button>
          <strong>${weeklyGoal}</strong>
          <button type="button" data-step="1" aria-label="More">+</button>
        </span>
      </div>
    </div>

    <h3 class="section-title">Lists</h3>
    <div class="form-group">
      <button class="form-row settings-row" data-open="supplements"><span>Supplements</span>${icons.chevronRight}</button>
      <button class="form-row settings-row" data-open="workouts"><span>Workout types</span>${icons.chevronRight}</button>
    </div>

    <h3 class="section-title">AI meal estimates</h3>
    <div class="form-group">
      <button class="form-row settings-row" data-open="apikey">
        <span class="row-text">
          <span class="row-title">Anthropic API key</span>
          <span class="row-subtitle">${apiKey ? `Saved · ends in ${escapeHTML(apiKey.slice(-4))}` : 'Not added · needed for the Macros tab'}</span>
        </span>
        ${icons.chevronRight}
      </button>
    </div>

    <p class="footnote">Appearance follows your phone’s light/dark setting.
      Your data is stored only on this phone.</p>`;

  root.onclick = async (event) => {
    const step = event.target.closest('[data-step]');
    if (step) {
      await saveWeeklyGoal(Math.min(14, Math.max(1, weeklyGoal + Number(step.dataset.step))));
      return;
    }
    switch (event.target.closest('[data-open]')?.dataset.open) {
      case 'stats': return openStatsSheet(profile);
      case 'targets': return openTargetsSheet(targets, profile);
      case 'supplements': return openManageSupplements();
      case 'workouts': return openManageActivities();
      case 'apikey': return openApiKeySheet(apiKey);
    }
  };
  root.onchange = null;
}

// ---- Sheets -------------------------------------------------------------------------

function openStatsSheet(profile) {
  openSheet({
    title: 'Your stats',
    left: { label: 'Cancel' },
    right: null,
    render(body, sheet) {
      body.innerHTML = `
        <form class="stack" novalidate>
          ${statsFormHTML(profile ?? {})}
          <p class="footnote" data-preview></p>
          <p class="form-problems" hidden></p>
          <button class="primary-button" type="submit" name="update">Save and update targets</button>
          <button class="text-button centered" type="submit" name="statsOnly">Save stats only</button>
        </form>`;
      const form = body.querySelector('form');

      // Live preview of the suggested targets as you type.
      const preview = () => {
        const p = readStatsForm(form);
        const el = form.querySelector('[data-preview]');
        if (profileProblems(p).length) { el.textContent = ''; return; }
        const t = suggestTargets(p);
        el.textContent = `Suggested: ${t.calories.toLocaleString()} kcal · ${t.proteinG}g protein · ` +
                         `${t.carbsG}g carbs · ${t.fatG}g fat. ${explanation(p, t)}`;
      };
      form.oninput = preview;
      form.onchange = preview;
      preview();

      form.onsubmit = async (event) => {
        event.preventDefault();
        const p = readStatsForm(form);
        const problems = profileProblems(p);
        if (problems.length) {
          const box = form.querySelector('.form-problems');
          box.innerHTML = problems.map(escapeHTML).join('<br>');
          box.hidden = false;
          return;
        }
        await saveProfile(p);
        if (event.submitter?.name === 'update') {
          const { calories, proteinG, carbsG, fatG } = suggestTargets(p);
          await saveTargets({ calories, proteinG, carbsG, fatG });
        }
        sheet.close();
      };
    },
  });
}

function openTargetsSheet(targets, profile) {
  const suggested = profile && !profileProblems(profile).length ? suggestTargets(profile) : null;
  openSheet({
    title: 'Daily targets',
    render(body) {
      body.innerHTML = `
        <p class="sheet-hint">Changes save automatically.</p>
        ${targetsFieldsHTML(targets ?? suggested ?? {})}
        ${suggested ? `
          <div class="form-group">
            <button class="form-row accent" data-use-suggested>Use suggested: ${suggested.calories.toLocaleString()} kcal ·
              ${suggested.proteinG}P · ${suggested.carbsG}C · ${suggested.fatG}F</button>
          </div>` : ''}`;
      body.oninput = () => {
        updateMacroSum(body);
        saveTargets(readTargets(body));
      };
      body.onclick = (event) => {
        if (!event.target.closest('[data-use-suggested]')) return;
        fillTargets(body, suggested);
        saveTargets(readTargets(body));
      };
    },
  });
}

function openApiKeySheet(savedKey) {
  let confirmRemove = false;
  const sheet = openSheet({
    title: 'Anthropic API key',
    render(body) {
      body.innerHTML = `
        <p class="sheet-hint">Used by the Macros tab to estimate meals (Milestone 3). The key is stored only
          on this phone. It is never shown in full, exported or uploaded anywhere except to Anthropic.</p>
        ${savedKey ? `
          <div class="form-group">
            <div class="form-row"><span>Saved key</span><span class="row-value">•••• ${escapeHTML(savedKey.slice(-4))}</span></div>
            ${confirmRemove ? `
              <div class="form-row confirm-row">
                <span>Remove the key?</span>
                <span class="confirm-buttons">
                  <button class="chip" data-keep>Keep</button>
                  <button class="chip danger" data-remove-confirm>Remove</button>
                </span>
              </div>` : `<button class="form-row destructive" data-remove>${icons.trash} Remove key</button>`}
          </div>` : ''}
        <form class="stack" novalidate>
          <div class="form-group padded">
            <input class="text-input" type="password" name="key" placeholder="${savedKey ? 'Paste a new key to replace it' : 'Paste your key (starts with sk-ant-)'}"
                   autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="API key">
          </div>
          <p class="form-problems" hidden></p>
          <button class="primary-button" type="submit">Save key</button>
        </form>`;

      body.onclick = async (event) => {
        if (event.target.closest('[data-remove]')) { confirmRemove = true; sheet.refresh(); }
        if (event.target.closest('[data-keep]')) { confirmRemove = false; sheet.refresh(); }
        if (event.target.closest('[data-remove-confirm]')) { await removeApiKey(); sheet.close(); }
      };
      body.querySelector('form').onsubmit = async (event) => {
        event.preventDefault();
        const key = event.target.elements.key.value.trim();
        const box = body.querySelector('.form-problems');
        if (!key.startsWith('sk-ant-') || key.length < 20) {
          box.textContent = 'That doesn’t look like an Anthropic API key. It should start with “sk-ant-”.';
          box.hidden = false;
          return;
        }
        await saveApiKey(key);
        sheet.close();
      };
    },
  });
}
