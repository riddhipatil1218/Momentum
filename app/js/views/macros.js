// macros.js
// The Macros tab: describe a meal in plain words, get an editable estimate from Claude,
// reply to adjust it, then log it with one tap. Saved meals can be re-logged in one tap
// (hold one to favorite or remove it). Today's meals and totals are shown above the chat.

import { allSavedMeals, deleteMeal, deleteSavedMeal, getApiKey, getTargets, logMeal, mealsOnDay,
         saveSavedMeal } from '../data.js';
import { todayKey } from '../logic/daykey.js';
import { EstimateError, editedNote } from '../logic/mealEstimate.js';
import { dayTotals, macroLine, sortSavedMeals } from '../logic/meals.js';
import { parseNumber } from '../logic/numbers.js';
import { escapeHTML } from '../logic/text.js';
import { estimateMeal } from '../services/anthropic.js';
import { haptic } from '../ui/haptics.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { showToast } from '../ui/toast.js';
import { handleMealCardTap, mealsCardHTML } from './mealCards.js';
import { openApiKeySheet } from './settings.js';

const EXAMPLES = [
  '2 eggs, a slice of sourdough with butter, and a latte with oat milk',
  'Chicken burrito bowl with rice, beans, salsa and guacamole',
  'Greek yogurt with blueberries and a drizzle of honey',
];

// The chat lives in memory while the app is open (logged meals are saved permanently).
const chat = {
  items: [],        // what's on screen: { type: 'user'|'estimate'|'note'|'divider', ... }
  apiMessages: [],  // the current meal's conversation with Claude (only ever appended to)
  draft: '',        // text in the message box
  pending: false,   // waiting for Claude
  scrollToEnd: false,
};

let rerender = () => {};

export async function renderMacros(root, { isCurrent, refresh }) {
  rerender = refresh;
  const today = todayKey();
  const [meals, targets, saved, apiKey] = await Promise.all([
    mealsOnDay(today), getTargets(), allSavedMeals(), getApiKey(),
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

    ${mealsCardHTML(meals, { title: 'Today’s meals', emptyMessage: 'Nothing logged yet today.' })}

    <section class="chat" aria-label="Meal estimates" aria-live="polite">
      ${chat.items.length ? chat.items.map(itemHTML).join('') : introHTML()}
      ${chat.pending ? '<div class="bubble assistant typing"><span></span><span></span><span></span></div>' : ''}
    </section>

    ${canEstimate ? `
      <form class="composer" data-composer>
        <textarea name="message" rows="1" placeholder="Describe a meal…" aria-label="Describe a meal"
                  enterkeyhint="send">${escapeHTML(chat.draft)}</textarea>
        <button type="submit" aria-label="Send" ${chat.pending ? 'disabled' : ''}>${icons.send}</button>
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
  root.onchange = null;
  root.onsubmit = (event) => { event.preventDefault(); send(); };
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
      <span class="today-value"><strong>${value.toLocaleString()}</strong>${target ? ` / ${target.toLocaleString()}` : ''}${unit}</span>
    </div>`;
  return `
    <section class="card today-strip" aria-label="Today so far">
      ${cell('Calories', totals.calories, targets?.calories, '')}
      ${cell('Protein', totals.proteinG, targets?.proteinG, 'g')}
      ${cell('Carbs', totals.carbsG, targets?.carbsG, 'g')}
      ${cell('Fat', totals.fatG, targets?.fatG, 'g')}
    </section>`;
}

function introHTML() {
  return `
    <div class="bubble assistant intro">
      <p>Tell me what you ate, as you’d say it to a friend. I’ll estimate the calories and macros,
        and you can correct anything before logging.</p>
      <div class="examples">
        ${EXAMPLES.map((text) => `<button class="chip" data-example="${escapeHTML(text)}">${escapeHTML(text)}</button>`).join('')}
      </div>
    </div>`;
}

function itemHTML(item, index) {
  switch (item.type) {
    case 'user':
      return `<div class="bubble user">${escapeHTML(item.text)}</div>`;
    case 'note':
      return `<div class="bubble assistant ${item.error ? 'error' : ''}">${escapeHTML(item.text)}</div>`;
    case 'divider':
      return '<div class="chat-divider"><span>Next meal</span></div>';
    case 'estimate':
      return estimateCardHTML(item, index);
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

  const logButton = target.closest('[data-log-estimate]');
  if (logButton) return logEstimate(Number(logButton.dataset.logEstimate));

  const relog = target.closest('[data-relog]');
  if (relog) return relogSaved(relog.dataset.relog);

  if (handleMealCardTap(target)) return;

  switch (target.closest('[data-action]')?.dataset.action) {
    case 'new-meal':
      chat.items = [];
      chat.apiMessages = [];
      rerender();
      break;
    case 'add-key':
      openApiKeySheet(null);
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

async function send() {
  const text = chat.draft.trim();
  if (!text || chat.pending) return;

  // If you changed the numbers on the card you're replying to, tell Claude.
  const last = chat.items.findLast((item) => item.type === 'estimate');
  const replyingToEdited = last && last.edited && !last.loggedMealId && chat.apiMessages.length > 0;
  const content = replyingToEdited ? `${editedNote(last.estimate)}\n\n${text}` : text;

  chat.items.push({ type: 'user', text });
  chat.apiMessages.push({ role: 'user', content });
  chat.draft = '';
  chat.pending = true;
  chat.scrollToEnd = true;
  rerender();

  try {
    const apiKey = await getApiKey();
    const { estimate, assistantContent } = await estimateMeal(apiKey, chat.apiMessages);
    // The full reply (including any thinking blocks) goes back unchanged next time.
    chat.apiMessages.push({ role: 'assistant', content: assistantContent });
    if (estimate.isFood) {
      chat.items.push({ type: 'estimate', estimate, sourceText: text, edited: false,
                        demo: typeof globalThis.momentumDemoEstimator === 'function' });
    } else {
      chat.items.push({ type: 'note', text: estimate.assumptions.join(' ') || 'Tell me what you ate or drank.' });
    }
  } catch (error) {
    chat.apiMessages.pop(); // this message never got an answer; leave the thread as it was
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

async function logEstimate(index) {
  const item = chat.items[index];
  if (!item || item.loggedMealId) return;
  haptic();
  const meal = await logMeal(item.estimate, new Date(), item.sourceText);
  item.loggedMealId = meal.id;
  // The next message starts a new meal instead of adjusting this one.
  chat.apiMessages = [];
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
