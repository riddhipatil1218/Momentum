// weightView.js
// The small Weight card on the Dashboard (latest weigh-in, change, goal, a simple chart with
// the projected path to your goal, next weigh-in date), plus the sheets to log a weigh-in and
// see or delete past ones. Designed for weighing in about every 2 weeks.

import { allWeights, deleteWeight, logWeight } from '../data.js';
import { fromLocalInputValue, toLocalInputValue } from '../logic/daykey.js';
import { parseNumber } from '../logic/numbers.js';
import { escapeHTML } from '../logic/text.js';
import { nextWeighIn, projectGoal, sortWeights, weightTrend } from '../logic/weight.js';
import { formatShortDate } from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';

const lb = (n) => `${Math.round(n * 10) / 10} lb`;
const longDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function weightCardHTML(weights, profile) {
  const sorted = sortWeights(weights);
  const latest = sorted.at(-1);
  const goal = profile?.goalWeightLb;

  if (!latest) {
    return `
      <section class="card weight-card">
        <div class="card-header"><h3>Weight</h3></div>
        <p class="empty">No weigh-ins yet. Log one every couple of weeks to see your trend and when you’ll reach your goal.</p>
        <button class="soft-button" data-action="log-weight">${icons.plus} Log weight</button>
      </section>`;
  }

  const now = new Date();
  const first = sorted[0];
  const change = latest.pounds - first.pounds;
  const trend = weightTrend(sorted, now);
  const projection = goal ? projectGoal(sorted, goal, now, profile?.weightLb) : null;
  const next = nextWeighIn(sorted);
  const due = next && next <= now;

  let paceText = '';
  if (projection?.status === 'projected') {
    paceText = `At ${Math.abs(trend.lbPerWeek)} lb/week, you’d reach ${goal} lb around <strong>${escapeHTML(longDate(projection.date))}</strong>.`;
  } else if (projection?.status === 'reached') {
    paceText = '<strong>Goal reached.</strong> Set a new goal in Settings → Your stats.';
  } else if (projection?.status === 'not-heading-there') {
    paceText = 'Your recent trend isn’t heading toward your goal yet.';
  } else if (goal) {
    paceText = 'Not enough data yet. Two weigh-ins at least 10 days apart (within 4 weeks) show your pace.';
  }

  return `
    <section class="card weight-card">
      <div class="card-header">
        <h3>Weight</h3>
        <button class="pill-button small" data-action="weight-history">History</button>
      </div>
      <div class="weight-top">
        <div class="weight-latest"><strong>${lb(latest.pounds)}</strong><span>${escapeHTML(formatShortDate(new Date(latest.date)))}</span></div>
        <div class="weight-facts">
          ${sorted.length > 1 ? `<span><b>${change <= 0 ? '−' : '+'}${lb(Math.abs(change))}</b> since ${escapeHTML(formatShortDate(new Date(first.date)))}</span>` : ''}
          ${goal ? `<span><b>${lb(Math.abs(latest.pounds - goal))}</b> to your ${goal} lb goal</span>` : ''}
        </div>
      </div>
      ${chartSVG(sorted, goal, projection)}
      ${paceText ? `<p class="weight-pace">${paceText}</p>` : ''}
      <div class="weight-bottom">
        <span class="${due ? 'due' : ''}">${due ? 'Weigh-in due' : `Next weigh-in: ${escapeHTML(formatShortDate(next))}`}</span>
        <button class="soft-button compact" data-action="log-weight">${icons.plus} Log weight</button>
      </div>
    </section>`;
}

/** A small line chart: weigh-ins, a dashed goal line, and a dashed projection to the goal. */
function chartSVG(sorted, goal, projection) {
  const W = 300, H = 110, PAD = { l: 34, r: 8, t: 10, b: 18 };
  const t0 = new Date(sorted[0].date).getTime();
  const lastT = new Date(sorted.at(-1).date).getTime();
  const projT = projection?.status === 'projected'
    ? Math.min(projection.date.getTime(), lastT + 26 * 7 * 86_400_000) : null;
  const t1 = Math.max(projT ?? lastT, t0 + 14 * 86_400_000);
  const values = sorted.map((w) => w.pounds).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...values) - 1);
  const hi = Math.ceil(Math.max(...values) + 1);
  const x = (t) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + ((hi - v) / (hi - lo)) * (H - PAD.t - PAD.b);

  const points = sorted.map((w) => [x(new Date(w.date).getTime()), y(w.pounds)]);
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const [lx, ly] = points.at(-1);
  // Where the projection line ends (at the goal date, or partway if that's far away).
  let proj = '';
  if (projT) {
    const frac = (projT - lastT) / (projection.date.getTime() - lastT);
    const endV = sorted.at(-1).pounds + (goal - sorted.at(-1).pounds) * frac;
    proj = `<path d="M${lx.toFixed(1)},${ly.toFixed(1)} L${x(projT).toFixed(1)},${y(endV).toFixed(1)}" class="chart-projection"/>`;
  }
  return `
    <svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time">
      <text x="${PAD.l - 6}" y="${y(hi) + 4}" class="chart-label" text-anchor="end">${hi}</text>
      <text x="${PAD.l - 6}" y="${y(lo) + 4}" class="chart-label" text-anchor="end">${lo}</text>
      <line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(lo)}" y2="${y(lo)}" class="chart-axis"/>
      ${goal ? `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(goal)}" y2="${y(goal)}" class="chart-goal"/>
        <text x="${W - PAD.r}" y="${y(goal) - 4}" class="chart-label goal" text-anchor="end">Goal ${goal}</text>` : ''}
      ${proj}
      <path d="${line}" class="chart-line"/>
      ${points.map(([px, py]) => `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" class="chart-dot"/>`).join('')}
    </svg>`;
}

/** Handles taps on the weight card. Returns true if it was one of ours. */
export function handleWeightTap(target) {
  const action = target.closest('[data-action]')?.dataset.action;
  if (action === 'log-weight') { openLogWeight(); return true; }
  if (action === 'weight-history') { openWeightHistory(); return true; }
  return false;
}

export function openLogWeight() {
  const sheet = openSheet({
    title: 'Log weight',
    left: { label: 'Cancel' },
    right: null,
    render(body) {
      body.innerHTML = `
        <form class="stack" novalidate>
          <div class="form-group">
            <label class="form-row">
              <span>Weight</span>
              <span class="form-input-group">
                <input class="number-input" name="pounds" inputmode="decimal" placeholder="—" autocomplete="off" autofocus>
                <span class="unit">lb</span>
              </span>
            </label>
            <label class="form-row">
              <span>When</span>
              <input class="date-input" type="datetime-local" name="when" value="${toLocalInputValue(new Date())}">
            </label>
          </div>
          <p class="form-problems" hidden></p>
          <button class="primary-button" type="submit">Save</button>
          <p class="footnote">Your stats’ weight updates to your newest weigh-in. Your daily targets stay the same
            unless you update them in Settings → Your stats.</p>
        </form>`;
      const form = body.querySelector('form');
      form.onsubmit = async (event) => {
        event.preventDefault();
        const pounds = parseNumber(form.elements.pounds.value);
        const when = fromLocalInputValue(form.elements.when.value) ?? new Date();
        if (!(pounds >= 70 && pounds <= 600)) {
          const box = form.querySelector('.form-problems');
          box.textContent = 'Enter your weight in pounds.';
          box.hidden = false;
          return;
        }
        await logWeight(Math.round(pounds * 10) / 10, when);
        sheet.close();
        showToast(`Logged ${Math.round(pounds * 10) / 10} lb`);
      };
    },
  });
}

function openWeightHistory() {
  let confirmId = null;
  const sheet = openSheet({
    title: 'Weigh-ins',
    async render(body) {
      const weights = sortWeights(await allWeights()).reverse();
      body.innerHTML = weights.length ? `
        <div class="form-group">
          ${weights.map((w) => `
            <div class="form-row" data-id="${w.id}">
              ${confirmId === w.id ? `
                <span>Delete ${lb(w.pounds)}?</span>
                <span class="confirm-buttons">
                  <button class="chip" data-keep>Keep</button>
                  <button class="chip danger" data-confirm-delete>Delete</button>
                </span>` : `
                <span class="row-text"><span class="row-title">${lb(w.pounds)}</span>
                  <span class="row-subtitle">${escapeHTML(longDate(new Date(w.date)))}</span></span>
                <button class="icon-button small danger" data-delete aria-label="Delete weigh-in">${icons.close}</button>`}
            </div>`).join('')}
        </div>` : '<p class="empty">No weigh-ins yet.</p>';
      body.onclick = async (event) => {
        const id = event.target.closest('[data-id]')?.dataset.id;
        if (event.target.closest('[data-delete]')) { confirmId = id; sheet.refresh(); }
        else if (event.target.closest('[data-keep]')) { confirmId = null; sheet.refresh(); }
        else if (event.target.closest('[data-confirm-delete]')) { confirmId = null; await deleteWeight(id); sheet.refresh(); }
      };
    },
  });
}
