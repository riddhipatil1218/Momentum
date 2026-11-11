// sheet.js
// iPhone-style bottom sheets (panels that slide up over the screen).
// Sheets can stack: day details → log workout → edit workout.

import { escapeHTML } from '../logic/text.js';

/**
 * Opens a sheet.
 * @param {object} options
 * @param {string} options.title
 * @param {(body: HTMLElement, sheet: object) => Promise<void>|void} options.render draws the content
 * @param {{label: string, bold?: boolean, onTap?: Function}} [options.left]  header button (default none)
 * @param {{label: string, bold?: boolean, onTap?: Function}} [options.right] header button (default "Done")
 * @param {boolean} [options.live] redraw automatically when data changes (for lists, not forms)
 * @param {Function} [options.onClose]
 */
export function openSheet({ title, render, left = null, right = { label: 'Done', bold: true },
                            live = false, onClose = null }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grabber"></div>
      <header class="sheet-header">
        <div class="sheet-left"></div>
        <h2 class="sheet-title"></h2>
        <div class="sheet-right"></div>
      </header>
      <div class="sheet-body"></div>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.classList.add('sheet-open');

  const body = backdrop.querySelector('.sheet-body');
  let renderCount = 0;
  let closed = false;

  const sheet = {
    body,
    setTitle(text) {
      backdrop.querySelector('.sheet-title').textContent = text;
    },
    /** Replace the header buttons. Pass null to hide one. */
    setButtons(newLeft, newRight) {
      setButton(backdrop.querySelector('.sheet-left'), newLeft);
      setButton(backdrop.querySelector('.sheet-right'), newRight);
    },
    /** Redraw the content (ignored if a newer redraw already started). */
    async refresh() {
      const myCount = ++renderCount;
      // Draw into a fresh container first, then swap it in all at once (no flicker).
      const content = document.createElement('div');
      await render(content, sheet);
      if (myCount !== renderCount || closed) return;
      body.replaceChildren(content);
    },
    close() {
      if (closed) return;
      closed = true;
      window.removeEventListener('momentum:changed', onDataChanged);
      backdrop.classList.remove('visible');
      setTimeout(() => {
        backdrop.remove();
        if (!document.querySelector('.sheet-backdrop')) document.body.classList.remove('sheet-open');
      }, 280);
      onClose?.();
    },
  };

  function setButton(slot, config) {
    slot.innerHTML = config
      ? `<button class="text-button ${config.bold ? 'bold' : ''}">${escapeHTML(config.label)}</button>`
      : '';
    if (config) slot.firstElementChild.onclick = () => (config.onTap ? config.onTap() : sheet.close());
  }

  const onDataChanged = () => sheet.refresh();
  if (live) window.addEventListener('momentum:changed', onDataChanged);

  // Tapping the dimmed area above the sheet closes it.
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) sheet.close();
  });

  sheet.setTitle(title);
  sheet.setButtons(left, right);
  sheet.refresh();
  requestAnimationFrame(() => backdrop.classList.add('visible'));
  return sheet;
}
