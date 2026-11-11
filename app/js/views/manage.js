// manage.js
// Editing the supplement list and the workout list. These sheets open when you
// press and hold a supplement or a workout chip/tile (no visible Edit button).
// You can rename, reorder, add, remove (archive) and restore items. Changes save as you type.

import { allActivities, allSupplements, newActivity, newSupplement, saveActivity,
         saveActivityList, saveSupplement, saveSupplementList } from '../data.js';
import { moveItem, nextSortOrder } from '../logic/ordering.js';
import { escapeHTML } from '../logic/text.js';
import { DETAIL_KIND_LABELS, DetailKind } from '../logic/workouts.js';
import { icons } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';

// Holding a supplement or a workout anywhere in the app opens the matching editor.
document.addEventListener('momentum:longpress', (event) => {
  const supplement = event.target.closest('[data-action="toggle-supplement"]');
  if (supplement) return openManageSupplements(supplement.dataset.id);
  const activity = event.target.closest('[data-quick-log], .activity-tile');
  if (activity) return openManageActivities(activity.dataset.quickLog ?? activity.dataset.id);
});

export function openManageSupplements(focusId = null) {
  openListEditor({
    title: 'Supplements',
    noun: 'supplement',
    focusId,
    load: allSupplements,
    saveOne: saveSupplement,
    saveList: saveSupplementList,
    create: (name, sortOrder) => newSupplement(name, sortOrder),
    rowFields: (item) => `
      <input class="text-input" data-field="name" value="${escapeHTML(item.name)}"
             aria-label="Supplement name" autocomplete="off">
      <input class="text-input small" data-field="doseNote" value="${escapeHTML(item.doseNote)}"
             placeholder="Dose note (optional)" aria-label="Dose note" autocomplete="off">`,
  });
}

export function openManageActivities(focusId = null) {
  openListEditor({
    title: 'Workouts',
    noun: 'workout',
    focusId,
    load: allActivities,
    saveOne: saveActivity,
    saveList: saveActivityList,
    create: (name, sortOrder) => newActivity(name, '🏅', DetailKind.general, sortOrder),
    rowFields: (item) => `
      <div class="field-pair">
        <input class="text-input emoji-input mono" data-field="emoji" value="${escapeHTML(item.emoji)}"
               aria-label="Icon (any emoji)" autocomplete="off">
        <input class="text-input" data-field="name" value="${escapeHTML(item.name)}"
               aria-label="Workout name" autocomplete="off">
      </div>
      <select class="text-input small" data-field="detailKind" aria-label="Details to track">
        ${Object.entries(DETAIL_KIND_LABELS).map(([kind, label]) => `
          <option value="${kind}" ${item.detailKind === kind ? 'selected' : ''}>Tracks: ${label}</option>`).join('')}
      </select>`,
  });
}

/** A shared editor for any ordered, archivable list. */
function openListEditor({ title, noun, focusId, load, saveOne, saveList, create, rowFields }) {
  let confirmRemoveId = null;

  const sheet = openSheet({
    title,
    async render(body) {
      const all = await load();
      const active = all.filter((item) => !item.archived);
      const removed = all.filter((item) => item.archived);

      body.innerHTML = `
        <p class="sheet-hint">Changes save automatically. Removing hides it from the list; your history is kept.</p>

        <div class="form-group">
          ${active.map((item, index) => `
            <div class="edit-row ${item.id === focusId ? 'focused' : ''}" data-id="${item.id}">
              ${confirmRemoveId === item.id ? `
                <div class="confirm-row">
                  <span>Remove ${escapeHTML(item.name)}?</span>
                  <span class="confirm-buttons">
                    <button class="chip" data-cancel-remove>Keep</button>
                    <button class="chip danger" data-confirm-remove>Remove</button>
                  </span>
                </div>` : `
                <div class="edit-fields">${rowFields(item)}</div>
                <div class="edit-actions">
                  <button class="icon-button small" data-move="-1" aria-label="Move up" ${index === 0 ? 'disabled' : ''}>${icons.chevronUp}</button>
                  <button class="icon-button small" data-move="1" aria-label="Move down" ${index === active.length - 1 ? 'disabled' : ''}>${icons.chevronDownSmall}</button>
                  <button class="icon-button small danger" data-remove aria-label="Remove">${icons.close}</button>
                </div>`}
            </div>`).join('')}
        </div>

        <form class="form-group add-row" data-add>
          <input class="text-input" name="name" placeholder="Add a ${noun}…" autocomplete="off" enterkeyhint="done">
          <button class="chip selected" type="submit">Add</button>
        </form>

        ${removed.length ? `
          <h4 class="form-section-title">Removed</h4>
          <div class="form-group">
            ${removed.map((item) => `
              <div class="form-row" data-id="${item.id}">
                <span class="muted">${escapeHTML(item.name)}</span>
                <button class="chip" data-restore>Restore</button>
              </div>`).join('')}
          </div>` : ''}`;

      const findItem = (el) => all.find((item) => item.id === el.closest('[data-id]')?.dataset.id);

      // Typing in a field (or picking from a menu) saves right away.
      body.oninput = (event) => {
        const field = event.target.closest('[data-field]');
        const item = field && findItem(field);
        if (!item) return;
        const value = field.value;
        if (field.dataset.field === 'name' || field.dataset.field === 'emoji') {
          if (!value.trim()) return; // never save an empty name or icon
          item[field.dataset.field] = value.trim();
        } else {
          item[field.dataset.field] = value;
        }
        saveOne(item);
      };

      body.onclick = async (event) => {
        const button = event.target.closest('button');
        if (!button || button.closest('[data-add]')) return; // the Add form is handled by onsubmit
        const item = findItem(button);
        if (!item) return;

        if (button.dataset.move) {
          await saveList(moveItem(active, active.indexOf(item), Number(button.dataset.move)));
        } else if (button.hasAttribute('data-remove')) {
          confirmRemoveId = item.id;
        } else if (button.hasAttribute('data-cancel-remove')) {
          confirmRemoveId = null;
        } else if (button.hasAttribute('data-confirm-remove')) {
          confirmRemoveId = null;
          await saveOne({ ...item, archived: true });
        } else if (button.hasAttribute('data-restore')) {
          await saveOne({ ...item, archived: false, sortOrder: nextSortOrder(active) });
        } else {
          return;
        }
        focusId = null;
        sheet.refresh();
      };

      body.onsubmit = async (event) => {
        event.preventDefault();
        const input = event.target.elements.name;
        const name = input.value.trim();
        if (!name) return;
        await saveOne(create(name, nextSortOrder(all)));
        focusId = null;
        await sheet.refresh();
        sheet.body.querySelector('[data-add] input')?.focus();
      };

      // Bring the item you held into view.
      if (focusId) requestAnimationFrame(() => body.querySelector('.focused')?.scrollIntoView({ block: 'center' }));
    },
  });
}
