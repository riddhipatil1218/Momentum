// toast.js
// A small message that slides up for a few seconds, with an optional action ("Undo").

import { escapeHTML } from '../logic/text.js';

let current = null;

export function showToast(message, { actionLabel = null, onAction = null, duration = 4000 } = {}) {
  current?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>${escapeHTML(message)}</span>` +
    (actionLabel ? `<button type="button">${escapeHTML(actionLabel)}</button>` : '');
  document.body.appendChild(toast);
  current = toast;
  requestAnimationFrame(() => toast.classList.add('visible'));

  const hide = () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
    if (current === toast) current = null;
  };
  toast.querySelector('button')?.addEventListener('click', () => { onAction?.(); hide(); });
  setTimeout(hide, duration);
}
