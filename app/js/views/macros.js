// macros.js
// The Macros tab, top to bottom: today's totals, today's meals (grouped by breakfast,
// lunch, dinner, snacks), "Log again" chips for saved meals, then the chat: describe a meal
// (or attach a photo of it or its nutrition label), get an editable estimate from Claude,
// reply to adjust it, and log it with one tap. Photos can be chosen with the camera button or
// pasted into the message box. With Oura turned on in Settings, Claude recognizes an Oura
// screenshot by itself and reads the day's total burn, steps, activity time and workouts; saving
// the card updates that day's calorie balance (and adds the workouts you tick).

import { activeActivities, allSavedMeals, deleteMeal, deleteSavedMeal, getApiKey, getOuraEnabled, getTargets, getWebLookup,
         logMeal, logWorkout, mealsOnDay, saveOuraDay, saveSavedMeal, saveWorkout, workoutsOnDay } from '../data.js';
import { dateOnDayAtTime, startOfDay, todayKey } from '../logic/daykey.js';
import { normalizeOuraActivity, preselectOuraWorkouts } from '../logic/oura.js';
import { EstimateError, editedNote, userTurnContent } from '../logic/mealEstimate.js';
import { dayTotals, macroLine, sortSavedMeals } from '../logic/meals.js';
import { parseNumber } from '../logic/numbers.js';
import { escapeHTML } from '../logic/text.js';
import { estimateMeal } from '../services/anthropic.js';
import { haptic } from '../ui/haptics.js';
import { icons } from '../ui/icons.js';
import { preparePhoto } from '../ui/photo.js';
import { openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { handleMealCardTap, mealsCardHTML } from './mealCards.js';
import { openApiKeySheet } from './settings.js';

const EXAMPLES = [
  '2 eggs, a slice of sourdough with butter, and a latte with oat milk',
  'Chipotle chicken burrito bowl with white rice, black beans, salsa and guacamole',
  'Grande oat milk latte from Starbucks and a KIND dark chocolate nut bar',
];

// The chat lives in memory while the app is open (logged meals are saved permanently).
const chat = {
  items: [],        // what's on screen: { type: 'user'|'estimate'|'note'|'divider', ... }
  apiMessages: [],  // the current meal's conversation with Claude (only ever appended to)
  draft: '',        // text in the message box
  photo: null,      // a photo waiting to be sent: { mediaType, data, previewUrl }
  pendingToolUseId: null, // Claude's last estimate call, answered at the start of the next message
  pending: false,   // waiting for Claude
  scrollToEnd: false,
};

let rerender = () => {};

export async function renderMacros(root, { isCurrent, refresh }) {
  rerender = refresh;
  const today = todayKey();
  const [meals, targets, saved, apiKey, ouraEnabled] = await Promise.all([
    mealsOnDay(today), getTargets(), allSavedMeals(), getApiKey(), getOuraEnabled(),
  ]);
  if (!isCurrent()) return;

  const canEstimate = Boolean(apiKey) || typeof globalThis.momentumDemoEstimator === 'function';
  const totals = dayTotals(meals);
  const quick = sortSavedMeals(saved).slice(0, 10);

  root.innerHTML = `
    <header class="page-header">
      <div><h1>Macros</h1></div>
      ${chat.items.length ? '<button class="pill-button" data-action="new-meal">New meal</button>' : ''}
    </header>

    ${todayStripHTML(totals, targets)}

    ${mealsCardHTML(meals, { title: 'Today’s meals', emptyMessage: 'Nothing logged yet today.' })}

    ${quick.length ? `
      <section class="quick-log" aria-label="Log a saved meal again">
        <div class="section-title-row">
          <h3 class="section-title">Log again</h3>
          <span class="hold-hint">Hold to edit</span>
        </div>
        <div class="quick-chips">
          ${quick.map((s) => `
            <button class="quick-chip meal-chip" data-relog="${s.id}" data-hold>
              ${s.favorite ? '<span class="star" aria-label="Favorite">★</span>' : ''}${escapeHTML(s.name)}
              <span class="chip-kcal">${s.calories}</span>
            </button>`).join('')}
        </div>
      </section>` : ''}

    <section class="chat" aria-label="Meal estimates" aria-live="polite">
      <h3 class="section-title">Estimate a meal</h3>
      ${chat.items.length ? chat.items.map(itemHTML).join('') : introHTML(ouraEnabled)}
      ${chat.pending ? '<div class="bubble assistant typing"><span></span><span></span><span></span></div>' : ''}
    </section>

    ${canEstimate ? `
      <form class="composer" data-composer>
        ${chat.photo ? `
          <div class="photo-row">
            <div class="photo-preview">
              <img src="${chat.photo.previewUrl}" alt="Photo to send">
              <button type="button" data-action="remove-photo" aria-label="Remove photo">${icons.close}</button>
            </div>
          </div>` : ''}
        <div class="composer-row">
          <label class="photo-button" aria-label="Add a photo of the meal or its nutrition label">
            ${icons.camera}
            <input type="file" accept="image/*" data-photo hidden>
          </label>
          <textarea name="message" rows="1" placeholder="${chat.photo ? 'Add a note (optional)…' : 'Describe a meal…'}"
                    aria-label="Describe a meal" enterkeyhint="send">${escapeHTML(chat.draft)}</textarea>
          <button type="submit" class="send-button" aria-label="Send" ${chat.pending ? 'disabled' : ''}>${icons.send}</button>
        </div>
      </form>` : `
      <section class="card key-needed">
        <p>Add your Anthropic API key to get meal estimates. It’s stored only on this phone.</p>
        <button class="primary-button" data-action="add-key">Add API key</button>
      </section>`}`;

  const textarea = root.querySelector('[data-composer] textarea');
  if (textarea) autoGrow(textarea);
  if (chat.scrollToEnd) {
    chat.scrollToEnd = false;
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  }

  root.onclick = (event) => onTap(event, root);
  root.oninput = onInput;
  root.onchange = onChange;
  root.onsubmit = (event) => { event.preventDefault(); send(); };
  root.onpaste = onPaste;
  root.onkeydown = (event) => {
    // On a computer keyboard, Enter sends and Shift+Enter adds a new line.
    if (event.target.name === 'message' && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send();
    }
  };
}

// ---- Pieces of the screen ---------------------------------------------------------------

function todayStripHTML(totals, targets) {
  const cell = (label, value, target, unit) => `
    <div class="today-cell">
      <span class="today-label">${label}</span>
      <span class="today-value"><strong>${value.toLocaleString()}${unit}</strong></span>
      ${target ? `<span class="today-target">of ${target.toLocaleString()}${unit}</span>` : ''}
    </div>`;
  return `
    <section class="card today-strip" aria-label="Today so far">
      ${cell('Calories', totals.calories, targets?.calories, '')}
      ${cell('Protein', totals.proteinG, targets?.proteinG, 'g')}
      ${cell('Carbs', totals.carbsG, targets?.carbsG, 'g')}
      ${cell('Fat', totals.fatG, targets?.fatG, 'g')}
    </section>`;
}

function introHTML(ouraEnabled) {
  return `
    <div class="bubble assistant intro">
      <p>Tell me what you ate, as you’d say it to a friend, or tap the camera to send a photo of your
        plate or a nutrition label. Name the restaurant or brand and I’ll look up its official numbers.
        You can correct anything before logging.</p>
      ${ouraEnabled ? `<p>Using your Oura ring? Paste or send a screenshot of your Oura activity and I’ll read
        your total burn, steps, activity time and workouts for your calorie balance.</p>` : ''}
      <div class="examples">
        ${EXAMPLES.map((text) => `<button class="chip" data-example="${escapeHTML(text)}">${escapeHTML(text)}</button>`).join('')}
      </div>
    </div>`;
}

function itemHTML(item, index) {
  switch (item.type) {
    case 'user':
      return `<div class="bubble user">${item.photoUrl ? `<img class="bubble-photo" src="${item.photoUrl}" alt="Photo sent">` : ''}${item.text ? escapeHTML(item.text) : ''}</div>`;
    case 'note':
      return `<div class="bubble assistant ${item.error ? 'error' : ''}">${escapeHTML(item.text)}</div>`;
    case 'divider':
      return '<div class="chat-divider"><span>Next meal</span></div>';
    case 'estimate':
      return estimateCardHTML(item, index);
    case 'oura':
      return ouraCardHTML(item, index);
    default:
      return '';
  }
}

function estimateCardHTML(item, index) {
  const e = item.estimate;
  const logged = Boolean(item.loggedMealId);
  const number = (field, label, unit) => `
    <label class="estimate-field">
      <span>${label}</span>
      <span class="estimate-input"><input name="${field}" inputmode="numeric" value="${e[field]}"
        ${logged ? 'disabled' : ''} aria-label="${label}" autocomplete="off"><em>${unit}</em></span>
    </label>`;
  return `
    <article class="estimate-card ${logged ? 'logged' : ''}" data-estimate="${index}">
      <div class="estimate-top">
        <input class="estimate-name" name="name" value="${escapeHTML(e.name)}" ${logged ? 'disabled' : ''}
               aria-label="Meal name" autocomplete="off">
        <span class="confidence ${e.confidence}">${e.confidence[0].toUpperCase()}${e.confidence.slice(1)} confidence</span>
      </div>
      <div class="estimate-grid">
        ${number('calories', 'Calories', 'kcal')}
        ${number('proteinG', 'Protein', 'g')}
        ${number('carbsG', 'Carbs', 'g')}
        ${number('fatG', 'Fat', 'g')}
      </div>
      ${e.assumptions.length ? `
        <details class="assumptions-box">
          <summary>Assumed portions (${e.assumptions.length})</summary>
          <ul class="assumptions">${e.assumptions.map((a) => `<li>${escapeHTML(a)}</li>`).join('')}</ul>
        </details>` : ''}
      ${e.basis ? `<p class="estimate-basis">Based on: ${escapeHTML(e.basis)}</p>` : ''}
      ${item.sources?.length ? `
        <div class="estimate-sources">
          <span>Sources</span>
          ${item.sources.map((src) => `<a href="${escapeHTML(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(src.title)}</a>`).join('')}
        </div>` : ''}
      ${item.demo ? '<p class="demo-note">Demo estimate (prototype only)</p>' : ''}
      ${logged
        ? `<p class="logged-note">${icons.check} Logged to today</p>`
        : `<button class="primary-button" data-log-estimate="${index}">Log to today</button>
           <p class="estimate-hint">Not quite right? Edit the numbers, or reply below.</p>`}
    </article>`;
}

// ---- Actions ----------------------------------------------------------------------------

async function onTap(event, root) {
  const target = event.target;

  const example = target.closest('[data-example]');
  if (example) {
    chat.draft = example.dataset.example;
    const box = root.querySelector('[data-composer] textarea');
    if (box) { box.value = chat.draft; autoGrow(box); box.focus(); }
    return;
  }

  const ouraSave = target.closest('[data-save-oura]');
  if (ouraSave) return saveOura(Number(ouraSave.dataset.saveOura));

  const logButton = target.closest('[data-log-estimate]');
  if (logButton) return logEstimate(Number(logButton.dataset.logEstimate));

  const relog = target.closest('[data-relog]');
  if (relog) return relogSaved(relog.dataset.relog);

  if (handleMealCardTap(target)) return;

  switch (target.closest('[data-action]')?.dataset.action) {
    case 'new-meal':
      chat.items = [];
      chat.apiMessages = [];
      chat.pendingToolUseId = null;
      rerender();
      break;
    case 'add-key':
      openApiKeySheet(null);
      break;
    case 'remove-photo':
      chat.photo = null;
      rerender();
      break;
  }
}

function onInput(event) {
  const field = event.target;
  if (field.name === 'message') {
    chat.draft = field.value;
    autoGrow(field);
    return;
  }
  // Editing an Oura card (kept in memory until saved).
  const ouraCard = field.closest('[data-oura]');
  if (ouraCard) {
    const item = chat.items[Number(ouraCard.dataset.oura)];
    if (field.name === 'ouraDate') {
      const [y, m, d] = field.value.split('-').map(Number);
      if (y && m && d) item.activity.dayKey = y * 10000 + m * 100 + d;
    } else if (field.name === 'pickWorkout') {
      item.workouts[Number(field.value)].picked = field.checked;
    } else if (['totalBurn', 'activeCalories', 'steps', 'activityMinutes'].includes(field.name)) {
      item.activity[field.name] = Math.max(0, Math.round(parseNumber(field.value) ?? 0));
    }
    return;
  }
  // Editing a number or the name on an estimate card (kept in memory until logged).
  const card = field.closest('[data-estimate]');
  if (!card) return;
  const item = chat.items[Number(card.dataset.estimate)];
  if (field.name === 'name') {
    item.estimate.name = field.value.trim() || item.estimate.name;
  } else {
    item.estimate[field.name] = Math.max(0, Math.round(parseNumber(field.value) ?? 0));
  }
  item.edited = true;
}

async function onChange(event) {
  if (event.target.closest('[data-oura]')) { onInput(event); return; }
  // A photo was chosen: shrink it and show it above the message box until sent.
  if (!event.target.matches('[data-photo]')) return;
  const file = event.target.files?.[0];
  if (file) await attachPhoto(file);
}

// ---- Attaching a picture: chosen with the camera button, or pasted --------------------------

/** Shrinks a picture and shows it above the message box until it's sent. */
async function attachPhoto(fileOrBlob) {
  try {
    chat.photo = await preparePhoto(fileOrBlob);
  } catch (error) {
    showToast(error.message);
  }
  rerender();
}

/** Pasting straight into the message box (where the phone allows it): pictures attach, text pastes normally. */
function onPaste(event) {
  const image = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (!image) return; // plain text: let it paste into the box as usual
  event.preventDefault();
  attachPhoto(image);
}

async function send() {
  const text = chat.draft.trim();
  const photo = chat.photo;
  if ((!text && !photo) || chat.pending) return;

  // If you changed the numbers on the card you're replying to, tell Claude.
  const last = chat.items.findLast((item) => item.type === 'estimate');
  const replyingToEdited = last && last.edited && !last.loggedMealId && chat.apiMessages.length > 0;
  const messageText = replyingToEdited ? `${editedNote(last.estimate)}\n\n${text}` : text;
  const pendingToolUseId = chat.pendingToolUseId;
  const ouraEnabled = await getOuraEnabled();
  // With Oura on, Claude decides itself whether a photo is food or an Oura screenshot; it gets
  // today's date so "Today" on a screenshot is saved to the right day.
  const ouraFor = photo && ouraEnabled
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null;

  chat.items.push({ type: 'user', text, photoUrl: photo?.previewUrl ?? null });
  chat.apiMessages.push({ role: 'user', content: userTurnContent(messageText, { pendingToolUseId, image: photo, ouraFor }) });
  chat.draft = '';
  chat.photo = null;
  chat.pending = true;
  chat.scrollToEnd = true;
  rerender();

  try {
    const [apiKey, webLookup] = await Promise.all([getApiKey(), getWebLookup()]);
    const { kind, estimate, oura, newMessages, toolUseId, sources } =
      await estimateMeal(apiKey, chat.apiMessages, { webLookup, ouraEnabled });
    // The full reply (thinking, searches, the tool call) goes back unchanged next time.
    chat.apiMessages.push(...newMessages);
    chat.pendingToolUseId = toolUseId;
    if (kind === 'oura') {
      chat.items.push(await ouraItem(oura));
    } else if (estimate.isFood) {
      chat.items.push({ type: 'estimate', estimate, sources: sources ?? [], sourceText: text, edited: false,
                        demo: typeof globalThis.momentumDemoEstimator === 'function' });
    } else {
      chat.items.push({ type: 'note', text: estimate.assumptions.join(' ') || 'Tell me what you ate or drank.' });
    }
  } catch (error) {
    chat.apiMessages.pop(); // this message never got an answer; leave the thread as it was
    chat.pendingToolUseId = pendingToolUseId;
    chat.items.push({
      type: 'note',
      error: true,
      text: error instanceof EstimateError ? error.message : 'Something went wrong. Please try again.',
    });
  } finally {
    chat.pending = false;
    chat.scrollToEnd = true;
    rerender();
  }
}

// ---- Oura screenshots ---------------------------------------------------------------------

/** Turns what Claude read into a card: numbers plus Oura's workouts, ticked unless already logged. */
async function ouraItem(raw) {
  const activity = normalizeOuraActivity(raw, todayKey());
  if (!activity.isOura) {
    return { type: 'note', text: activity.notes || 'That doesn’t look like an Oura screenshot. Try your Oura activity screen.' };
  }
  const [activities, logged] = await Promise.all([activeActivities(), workoutsOnDay(activity.dayKey)]);
  const workouts = preselectOuraWorkouts(activity.workouts, logged, activities)
    .map((w) => ({ ...w, picked: !w.alreadyLogged }));
  return { type: 'oura', activity, workouts, savedAt: null, demo: typeof globalThis.momentumDemoEstimator === 'function' };
}

function ouraCardHTML(item, index) {
  const a = item.activity;
  const saved = Boolean(item.savedAt);
  const iso = String(a.dayKey).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  const dayLabel = a.dayKey === todayKey() ? 'today' : startOfDay(a.dayKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const number = (field, label, unit) => `
    <label class="estimate-field">
      <span>${label}</span>
      <span class="estimate-input"><input name="${field}" inputmode="numeric" value="${a[field]}" ${saved ? 'disabled' : ''}
        aria-label="${label}" autocomplete="off"><em>${unit}</em></span>
    </label>`;
  return `
    <article class="estimate-card oura-card ${saved ? 'logged' : ''}" data-oura="${index}">
      <div class="estimate-top">
        <span class="oura-title">Oura activity</span>
        <input class="date-input small" type="date" name="ouraDate" value="${iso}" ${saved ? 'disabled' : ''} aria-label="Day">
      </div>
      ${a.dateWasRead ? '' : '<p class="estimate-hint">No date was visible, so this is set to today. Change it if needed.</p>'}
      <div class="estimate-grid two">
        ${number('totalBurn', 'Total burn', 'kcal')}
        ${number('activeCalories', 'Active', 'kcal')}
        ${number('steps', 'Steps', '')}
        ${number('activityMinutes', 'Activity', 'min')}
      </div>
      ${item.workouts.length ? `
        <div class="oura-workouts">
          <span class="oura-workouts-title">Add to your workout log</span>
          ${item.workouts.map((w, i) => `
            <label class="oura-workout">
              <input type="checkbox" name="pickWorkout" value="${i}" ${w.picked ? 'checked' : ''} ${saved ? 'disabled' : ''}>
              <span class="row-text">
                <span class="row-title">${escapeHTML(w.type ? w.type.name : w.name)}</span>
                <span class="row-subtitle">${w.minutes ? `${w.minutes} min` : 'no duration shown'}${w.calories ? ` · ${w.calories} kcal` : ''}${w.alreadyLogged ? ' · already in your log' : ''}</span>
              </span>
            </label>`).join('')}
        </div>` : ''}
      ${item.demo ? '<p class="demo-note">Demo numbers (prototype only)</p>' : ''}
      ${saved
        ? `<p class="logged-note">${icons.check} Saved to ${escapeHTML(dayLabel)} · Dashboard updated</p>`
        : `<button class="primary-button" data-save-oura="${index}">Save to ${escapeHTML(dayLabel)}</button>
           <p class="estimate-hint">Oura’s total burn replaces Momentum’s estimate for this day.</p>`}
    </article>`;
}

async function saveOura(index) {
  const item = chat.items[index];
  if (!item || item.savedAt) return;
  if (!(item.activity.totalBurn > 0)) {
    showToast('Add the total burn first (the card’s first number).');
    return;
  }
  haptic();
  await saveOuraDay(item.activity);
  // Add the ticked workouts to the log on that day.
  const day = item.activity.dayKey;
  const when = day === todayKey() ? new Date() : dateOnDayAtTime(day, new Date(2000, 0, 1, 12, 0));
  for (const w of item.workouts.filter((x) => x.picked)) {
    const type = w.type ?? { name: w.name.replace(/^./, (c) => c.toUpperCase()), emoji: '🏅', detailKind: 'general' };
    const workout = await logWorkout(type, when);
    await saveWorkout({ ...workout, durationMinutes: w.minutes || null, source: 'oura' });
  }
  item.savedAt = new Date().toISOString();
  // The next message starts fresh.
  chat.apiMessages = [];
  chat.pendingToolUseId = null;
  chat.items.push({ type: 'divider' });
  showToast(`Oura numbers saved${item.workouts.some((w) => w.picked) ? ' and workouts added' : ''}`);
  rerender();
}

async function logEstimate(index) {
  const item = chat.items[index];
  if (!item || item.loggedMealId) return;
  haptic();
  const meal = await logMeal(item.estimate, new Date(), item.sourceText);
  item.loggedMealId = meal.id;
  // The next message starts a new meal instead of adjusting this one.
  chat.apiMessages = [];
  chat.pendingToolUseId = null;
  const divider = { type: 'divider' };
  chat.items.push(divider);
  showToast(`Logged ${meal.name}`, {
    actionLabel: 'Undo',
    onAction: async () => {
      item.loggedMealId = null;
      chat.items = chat.items.filter((i) => i !== divider);
      await deleteMeal(meal.id);
    },
  });
  rerender();
}

async function relogSaved(savedId) {
  const saved = (await allSavedMeals()).find((s) => s.id === savedId);
  if (!saved) return;
  haptic();
  const meal = await logMeal(saved, new Date(), '');
  showToast(`Logged ${meal.name}`, { actionLabel: 'Undo', onAction: () => deleteMeal(meal.id) });
}

// ---- Holding a saved meal: favorite, log again, or remove from the list --------------------

document.addEventListener('momentum:longpress', (event) => {
  const chip = event.target.closest('[data-relog]');
  if (chip) openSavedMealSheet(chip.dataset.relog);
});

async function openSavedMealSheet(savedId) {
  const saved = (await allSavedMeals()).find((s) => s.id === savedId);
  if (!saved) return;
  let confirmRemove = false;

  const sheet = openSheet({
    title: 'Saved meal',
    render(body) {
      body.innerHTML = `
        <div class="form-group">
          <div class="form-row"><span class="row-text"><span class="row-title">${escapeHTML(saved.name)}</span>
            <span class="row-subtitle">${macroLine(saved)}</span></span></div>
          <button class="form-row accent" data-favorite>${saved.favorite ? '★ Remove from favorites' : '☆ Add to favorites'}</button>
          <button class="form-row accent" data-log-now>${icons.plus} Log it now</button>
        </div>
        ${saved.assumptions?.length ? `
          <h4 class="form-section-title">Assumed portions</h4>
          <div class="form-group padded"><ul class="assumptions">${saved.assumptions.map((a) => `<li>${escapeHTML(a)}</li>`).join('')}</ul></div>` : ''}
        <div class="form-group">
          ${confirmRemove ? `
            <div class="form-row confirm-row">
              <span>Remove from this list?</span>
              <span class="confirm-buttons">
                <button class="chip" data-keep>Keep</button>
                <button class="chip danger" data-confirm-remove>Remove</button>
              </span>
            </div>` : `<button class="form-row destructive" data-remove>${icons.trash} Remove from list</button>`}
        </div>
        <p class="footnote">Removing it only hides it here. Meals you already logged stay in your history.</p>`;

      body.onclick = async (event) => {
        if (event.target.closest('[data-favorite]')) {
          saved.favorite = !saved.favorite;
          await saveSavedMeal(saved);
          sheet.refresh();
        } else if (event.target.closest('[data-log-now]')) {
          sheet.close();
          await relogSaved(saved.id);
        } else if (event.target.closest('[data-remove]')) {
          confirmRemove = true; sheet.refresh();
        } else if (event.target.closest('[data-keep]')) {
          confirmRemove = false; sheet.refresh();
        } else if (event.target.closest('[data-confirm-remove]')) {
          sheet.close();
          await deleteSavedMeal(saved.id);
        }
      };
    },
  });
}

// ---- Message box helpers ------------------------------------------------------------------

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
}

// Keep the message box above the iPhone keyboard.
if (globalThis.visualViewport) {
  const update = () => {
    const vv = globalThis.visualViewport;
    const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--keyboard', `${keyboard}px`);
  };
  visualViewport.addEventListener('resize', update);
  visualViewport.addEventListener('scroll', update);
}
